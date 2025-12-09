# Load environment from root .env before anything else
from utils.config import SUPABASE_URL

from fastapi import FastAPI, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional, List
import asyncio
import os
import logging
from concurrent.futures import ThreadPoolExecutor

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(
    title="P11 Data Engine",
    version="0.2.0",
    description="ETL pipelines for marketing data ingestion and competitive intelligence scraping"
)

# CORS for local development
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Thread pool for running pipelines
executor = ThreadPoolExecutor(max_workers=3)


class PipelineResponse(BaseModel):
    status: str
    message: str
    pipeline: str


class RunAllResponse(BaseModel):
    status: str
    message: str
    pipelines: list[str]


@app.get('/')
def read_root():
    return {
        'status': 'P11 Data Engine Ready',
        'supabase_configured': bool(SUPABASE_URL),
        'pipelines': ['meta_ads', 'google_ads', 'ga4'],
        'docs': '/docs'
    }


@app.get('/health')
def health_check():
    return {'status': 'healthy'}


@app.post('/pipelines/meta', response_model=PipelineResponse)
async def run_meta_pipeline(background_tasks: BackgroundTasks):
    """
    Trigger the Meta Ads pipeline to fetch and ingest data.
    Runs in background and returns immediately.
    """
    def run():
        from pipelines.meta_ads import run_pipeline
        run_pipeline()
    
    background_tasks.add_task(run)
    return PipelineResponse(
        status="started",
        message="Meta Ads pipeline started in background",
        pipeline="meta_ads"
    )


@app.post('/pipelines/google', response_model=PipelineResponse)
async def run_google_pipeline(background_tasks: BackgroundTasks):
    """
    Trigger the Google Ads pipeline to fetch and ingest data.
    Runs in background and returns immediately.
    """
    def run():
        from pipelines.google_ads import run_pipeline
        run_pipeline()
    
    background_tasks.add_task(run)
    return PipelineResponse(
        status="started",
        message="Google Ads pipeline started in background",
        pipeline="google_ads"
    )


@app.post('/pipelines/ga4', response_model=PipelineResponse)
async def run_ga4_pipeline(background_tasks: BackgroundTasks):
    """
    Trigger the GA4 (Google Analytics 4) pipeline to fetch and ingest data.
    Runs in background and returns immediately.
    """
    def run():
        from pipelines.ga4 import run_pipeline
        run_pipeline()
    
    background_tasks.add_task(run)
    return PipelineResponse(
        status="started",
        message="GA4 pipeline started in background",
        pipeline="ga4"
    )


@app.post('/pipelines/all', response_model=RunAllResponse)
async def run_all_pipelines(background_tasks: BackgroundTasks):
    """
    Trigger all configured pipelines to run.
    Each pipeline runs in sequence in the background.
    """
    def run_all():
        print("=" * 60)
        print("Running ALL Pipelines")
        print("=" * 60)
        
        # Import and run each pipeline
        try:
            from pipelines.meta_ads import run_pipeline as run_meta
            run_meta()
        except Exception as e:
            print(f"Meta pipeline error: {e}")
        
        try:
            from pipelines.google_ads import run_pipeline as run_google
            run_google()
        except Exception as e:
            print(f"Google Ads pipeline error: {e}")
        
        try:
            from pipelines.ga4 import run_pipeline as run_ga4
            run_ga4()
        except Exception as e:
            print(f"GA4 pipeline error: {e}")
        
        print("=" * 60)
        print("All Pipelines Complete")
        print("=" * 60)
    
    background_tasks.add_task(run_all)
    return RunAllResponse(
        status="started",
        message="All pipelines started in background",
        pipelines=["meta_ads", "google_ads", "ga4"]
    )


@app.get('/pipelines/status')
def get_pipeline_status():
    """
    Get configuration status for each pipeline.
    Checks if required environment variables are set.
    """
    return {
        "meta_ads": {
            "configured": bool(os.environ.get("META_ACCESS_TOKEN") and os.environ.get("META_AD_ACCOUNT_ID")),
            "required_vars": ["META_ACCESS_TOKEN", "META_AD_ACCOUNT_ID"]
        },
        "google_ads": {
            "configured": bool(
                os.environ.get("GOOGLE_ADS_CUSTOMER_ID") and 
                os.environ.get("GOOGLE_ADS_DEVELOPER_TOKEN")
            ),
            "required_vars": [
                "GOOGLE_ADS_CUSTOMER_ID",
                "GOOGLE_ADS_DEVELOPER_TOKEN", 
                "GOOGLE_ADS_REFRESH_TOKEN",
                "GOOGLE_ADS_CLIENT_ID",
                "GOOGLE_ADS_CLIENT_SECRET"
            ]
        },
        "ga4": {
            "configured": bool(
                os.environ.get("GA4_PROPERTY_ID") and
                (os.environ.get("GOOGLE_APPLICATION_CREDENTIALS") or os.environ.get("GA4_CREDENTIALS_JSON"))
            ),
            "required_vars": [
                "GA4_PROPERTY_ID",
                "GOOGLE_APPLICATION_CREDENTIALS (or GA4_CREDENTIALS_JSON)"
            ]
        },
        "supabase": {
            "configured": bool(SUPABASE_URL and os.environ.get("SUPABASE_SERVICE_ROLE_KEY")),
            "required_vars": ["SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY"]
        }
    }


# =============================================================================
# MARKETVISION 360 - COMPETITOR SCRAPING ENDPOINTS
# =============================================================================

class DiscoverRequest(BaseModel):
    property_id: str
    radius_miles: float = 3.0
    max_competitors: int = 20
    auto_add: bool = True


class RefreshRequest(BaseModel):
    property_id: str


class ScrapeResponse(BaseModel):
    success: bool
    message: str
    data: Optional[dict] = None


@app.post('/scraper/discover', response_model=ScrapeResponse)
async def discover_competitors(request: DiscoverRequest, background_tasks: BackgroundTasks):
    """
    Discover competitor properties near a property address.
    Scrapes Apartments.com and other ILS sites.
    
    - property_id: UUID of the property in Supabase
    - radius_miles: Search radius (default: 3 miles)
    - max_competitors: Maximum competitors to find (default: 20)
    - auto_add: Automatically add discovered competitors to database
    """
    def run_discovery():
        try:
            from scrapers.coordinator import ScrapingCoordinator
            
            proxy_url = os.environ.get('SCRAPER_PROXY_URL')
            coordinator = ScrapingCoordinator(proxy_url=proxy_url)
            
            result = coordinator.discover_competitors_for_property(
                property_id=request.property_id,
                radius_miles=request.radius_miles,
                max_competitors=request.max_competitors,
                auto_add=request.auto_add
            )
            
            logger.info(f"Discovery complete: {result}")
            return result
            
        except Exception as e:
            logger.error(f"Discovery error: {e}")
            return {'success': False, 'error': str(e)}
    
    # For small requests, run synchronously
    if request.max_competitors <= 5:
        result = run_discovery()
        return ScrapeResponse(
            success=result.get('success', False),
            message=f"Found {result.get('discovered_count', 0)} competitors",
            data=result
        )
    
    # For larger requests, run in background
    background_tasks.add_task(run_discovery)
    return ScrapeResponse(
        success=True,
        message=f"Discovery started in background for {request.max_competitors} competitors",
        data={'status': 'processing'}
    )


@app.post('/scraper/refresh', response_model=ScrapeResponse)
async def refresh_competitors(request: RefreshRequest, background_tasks: BackgroundTasks):
    """
    Refresh pricing data for all competitors of a property.
    Re-scrapes each competitor's ILS listing for updated prices.
    
    - property_id: UUID of the property in Supabase
    """
    def run_refresh():
        try:
            from scrapers.coordinator import ScrapingCoordinator
            
            proxy_url = os.environ.get('SCRAPER_PROXY_URL')
            coordinator = ScrapingCoordinator(proxy_url=proxy_url)
            
            result = coordinator.refresh_all_competitors(request.property_id)
            
            logger.info(f"Refresh complete: {result}")
            return result
            
        except Exception as e:
            logger.error(f"Refresh error: {e}")
            return {'success': False, 'error': str(e)}
    
    background_tasks.add_task(run_refresh)
    return ScrapeResponse(
        success=True,
        message="Competitor refresh started in background",
        data={'status': 'processing'}
    )


@app.post('/scraper/refresh-all')
async def refresh_all_properties(background_tasks: BackgroundTasks):
    """
    Refresh competitors for all properties that have scraping enabled.
    Called by scheduled CRON job.
    """
    def run_all_refresh():
        try:
            from scrapers.coordinator import ScrapingCoordinator
            from utils.supabase_client import get_supabase_client
            
            supabase = get_supabase_client()
            proxy_url = os.environ.get('SCRAPER_PROXY_URL')
            coordinator = ScrapingCoordinator(proxy_url=proxy_url)
            
            # Get all properties with scraping enabled
            configs = supabase.table('scrape_config').select(
                'property_id'
            ).eq('is_enabled', True).execute()
            
            results = []
            for config in (configs.data or []):
                try:
                    result = coordinator.refresh_all_competitors(config['property_id'])
                    results.append({
                        'property_id': config['property_id'],
                        **result
                    })
                except Exception as e:
                    results.append({
                        'property_id': config['property_id'],
                        'success': False,
                        'error': str(e)
                    })
            
            logger.info(f"Refreshed {len(results)} properties")
            return {'properties_processed': len(results), 'results': results}
            
        except Exception as e:
            logger.error(f"Refresh all error: {e}")
            return {'success': False, 'error': str(e)}
    
    background_tasks.add_task(run_all_refresh)
    return {'status': 'started', 'message': 'Refresh all started in background'}


@app.get('/scraper/status')
def get_scraper_status():
    """
    Get scraper configuration and status.
    """
    return {
        "proxy_configured": bool(os.environ.get('SCRAPER_PROXY_URL')),
        "supported_sources": ["apartments_com"],
        "supabase_configured": bool(SUPABASE_URL and os.environ.get("SUPABASE_SERVICE_ROLE_KEY")),
        "features": {
            "auto_discovery": True,
            "price_tracking": True,
            "alert_generation": True
        }
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
