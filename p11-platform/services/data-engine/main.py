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

# CORS configuration for development and production
CORS_ORIGINS = [
    "http://localhost:3000",  # Local development
    "http://127.0.0.1:3000",
]

# Add production domains from environment
if os.environ.get('WEB_APP_URL'):
    CORS_ORIGINS.append(os.environ.get('WEB_APP_URL'))
if os.environ.get('NEXT_PUBLIC_SITE_URL'):
    CORS_ORIGINS.append(os.environ.get('NEXT_PUBLIC_SITE_URL'))

# Add common Heroku patterns
heroku_app_name = os.environ.get('HEROKU_APP_NAME')
if heroku_app_name:
    CORS_ORIGINS.append(f"https://{heroku_app_name}.herokuapp.com")

app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
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
        logger.info("=" * 60)
        logger.info("Running ALL Pipelines")
        logger.info("=" * 60)
        
        # Import and run each pipeline
        try:
            from pipelines.meta_ads import run_pipeline as run_meta
            run_meta()
        except Exception as e:
            logger.error(f"Meta pipeline error: {e}")
        
        try:
            from pipelines.google_ads import run_pipeline as run_google
            run_google()
        except Exception as e:
            logger.error(f"Google Ads pipeline error: {e}")
        
        try:
            from pipelines.ga4 import run_pipeline as run_ga4
            run_ga4()
        except Exception as e:
            logger.error(f"GA4 pipeline error: {e}")
        
        logger.info("=" * 60)
        logger.info("All Pipelines Complete")
        logger.info("=" * 60)
    
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
    from scrapers.apify_apartments import is_apify_configured
    
    apify_configured = is_apify_configured()
    
    return {
        "proxy_configured": bool(os.environ.get('SCRAPER_PROXY_URL')),
        "apify_configured": apify_configured,
        "apify_status": "ready" if apify_configured else "APIFY_API_TOKEN required",
        "supported_sources": ["apify_apartments_com", "google_places"],
        "supabase_configured": bool(SUPABASE_URL and os.environ.get("SUPABASE_SERVICE_ROLE_KEY")),
        "openai_configured": bool(os.environ.get('OPENAI_API_KEY')),
        "features": {
            "auto_discovery": True,
            "price_tracking": apify_configured,
            "apartments_com_scraping": apify_configured,
            "alert_generation": True,
            "brand_intelligence": True,
            "semantic_search": True
        }
    }


# =============================================================================
# BRAND INTELLIGENCE ENDPOINTS
# =============================================================================

class BrandIntelligenceRequest(BaseModel):
    property_id: str
    competitor_ids: Optional[List[str]] = None  # None = all competitors with websites
    force_refresh: bool = False  # Re-analyze even if recent data exists


class SemanticSearchRequest(BaseModel):
    query: str
    property_id: Optional[str] = None
    competitor_ids: Optional[List[str]] = None
    limit: int = 10


class DiscoverAndAnalyzeRequest(BaseModel):
    property_id: str
    radius_miles: float = 3.0
    max_competitors: int = 20
    auto_add: bool = True
    extract_brand_intelligence: bool = True


@app.post('/scraper/discover-and-analyze', response_model=ScrapeResponse)
async def discover_and_analyze_competitors(
    request: DiscoverAndAnalyzeRequest,
    background_tasks: BackgroundTasks
):
    """
    Enhanced discovery that also extracts brand intelligence.
    
    1. Discovers competitors via Google Places
    2. Adds them to the database
    3. Triggers background brand intelligence extraction
    
    Returns immediately with discovery results and job_id for polling.
    """
    try:
        from scrapers.coordinator import ScrapingCoordinator
        
        proxy_url = os.environ.get('SCRAPER_PROXY_URL')
        coordinator = ScrapingCoordinator(proxy_url=proxy_url)
        
        result = coordinator.discover_and_analyze_competitors(
            property_id=request.property_id,
            radius_miles=request.radius_miles,
            max_competitors=request.max_competitors,
            auto_add=request.auto_add,
            extract_brand_intelligence=request.extract_brand_intelligence
        )
        
        return ScrapeResponse(
            success=result.get('success', False),
            message=f"Discovered {result.get('discovered_count', 0)} competitors, added {result.get('added_count', 0)}",
            data=result
        )
        
    except Exception as e:
        logger.error(f"Discover and analyze error: {e}")
        return ScrapeResponse(
            success=False,
            message=str(e),
            data={'error': str(e)}
        )


@app.post('/scraper/brand-intelligence', response_model=ScrapeResponse)
async def extract_brand_intelligence(
    request: BrandIntelligenceRequest,
    background_tasks: BackgroundTasks
):
    """
    Trigger brand intelligence extraction for competitors.
    
    Scrapes competitor websites and uses AI to extract:
    - Brand positioning and voice
    - Target audience
    - Unique selling points
    - Active specials and promotions
    - Key messaging themes
    
    Returns job_id for status polling.
    """
    try:
        from scrapers.coordinator import ScrapingCoordinator
        
        proxy_url = os.environ.get('SCRAPER_PROXY_URL')
        coordinator = ScrapingCoordinator(proxy_url=proxy_url)
        
        job_id = coordinator.trigger_brand_intelligence_extraction(
            property_id=request.property_id,
            competitor_ids=request.competitor_ids,
            force_refresh=request.force_refresh
        )
        
        return ScrapeResponse(
            success=True,
            message="Brand intelligence extraction started",
            data={
                'job_id': job_id,
                'status': 'processing'
            }
        )
        
    except Exception as e:
        logger.error(f"Brand intelligence error: {e}")
        return ScrapeResponse(
            success=False,
            message=str(e),
            data={'error': str(e)}
        )


@app.get('/scraper/brand-intelligence/job/{job_id}')
async def get_brand_intelligence_job_status(job_id: str):
    """
    Get status of a brand intelligence extraction job.
    
    Poll this endpoint to track progress:
    - status: pending/processing/completed/failed
    - progress: processed_count/total_competitors
    - errors: any failed extractions
    """
    try:
        from scrapers.coordinator import ScrapingCoordinator
        
        coordinator = ScrapingCoordinator()
        status = coordinator.get_brand_intelligence_job_status(job_id)
        
        return {
            'success': True,
            **status
        }
        
    except Exception as e:
        logger.error(f"Job status error: {e}")
        return {
            'success': False,
            'error': str(e)
        }


@app.get('/scraper/brand-intelligence/property/{property_id}')
async def get_property_brand_intelligence(
    property_id: str,
    include_raw: bool = False
):
    """
    Get brand intelligence for all competitors of a property.
    
    Returns AI-analyzed insights for each competitor:
    - Brand voice and personality
    - Positioning statement
    - Target audience
    - Unique selling points
    - Active specials
    - Key messaging themes
    """
    try:
        from scrapers.coordinator import ScrapingCoordinator
        
        coordinator = ScrapingCoordinator()
        intelligence = coordinator.get_all_brand_intelligence(
            property_id=property_id,
            include_raw=include_raw
        )
        
        return {
            'success': True,
            'count': len(intelligence),
            'competitors': intelligence
        }
        
    except Exception as e:
        logger.error(f"Get brand intelligence error: {e}")
        return {
            'success': False,
            'error': str(e)
        }


@app.get('/scraper/brand-intelligence/competitor/{competitor_id}')
async def get_competitor_brand_intelligence(competitor_id: str):
    """
    Get brand intelligence for a specific competitor.
    """
    try:
        from scrapers.coordinator import ScrapingCoordinator
        
        coordinator = ScrapingCoordinator()
        intelligence = coordinator.get_competitor_brand_intelligence(competitor_id)
        
        if not intelligence:
            return {
                'success': False,
                'error': 'No brand intelligence found for this competitor'
            }
        
        return {
            'success': True,
            'data': intelligence
        }
        
    except Exception as e:
        logger.error(f"Get competitor intelligence error: {e}")
        return {
            'success': False,
            'error': str(e)
        }


@app.post('/scraper/brand-intelligence/search')
async def semantic_search_competitors(request: SemanticSearchRequest):
    """
    Semantic search across competitor website content.
    
    Use natural language queries like:
    - "How do competitors talk about pet policies?"
    - "What move-in specials are being offered?"
    - "How do they market their pools?"
    
    Returns relevant content chunks with similarity scores.
    """
    try:
        from scrapers.coordinator import ScrapingCoordinator
        
        coordinator = ScrapingCoordinator()
        results = coordinator.semantic_search_competitors(
            query=request.query,
            property_id=request.property_id,
            competitor_ids=request.competitor_ids,
            limit=request.limit
        )
        
        return {
            'success': True,
            'query': request.query,
            'count': len(results),
            'results': results
        }
        
    except Exception as e:
        logger.error(f"Semantic search error: {e}")
        return {
            'success': False,
            'error': str(e)
        }


@app.post('/scraper/brand-intelligence/embeddings/{competitor_id}')
async def generate_competitor_embeddings(competitor_id: str):
    """
    Generate vector embeddings for a competitor's content chunks.
    Required for semantic search functionality.
    """
    try:
        from scrapers.coordinator import ScrapingCoordinator
        
        coordinator = ScrapingCoordinator()
        count = coordinator.generate_competitor_embeddings(competitor_id)
        
        return {
            'success': True,
            'embeddings_generated': count
        }
        
    except Exception as e:
        logger.error(f"Generate embeddings error: {e}")
        return {
            'success': False,
            'error': str(e)
        }


# =============================================================================
# APARTMENTS.COM SCRAPING ENDPOINTS
# =============================================================================

class ApartmentsComRefreshRequest(BaseModel):
    competitor_id: str
    url: Optional[str] = None  # Override URL if not using saved one


class ApartmentsComBatchRequest(BaseModel):
    property_id: str
    competitor_ids: Optional[List[str]] = None  # None = all with apartments.com URLs


class ApartmentsComDiscoverRequest(BaseModel):
    property_id: str
    city: str
    state: str
    max_results: int = 20
    auto_add: bool = True


class ApartmentsComAddListingRequest(BaseModel):
    competitor_id: str
    url: str


@app.post('/scrape/apartments-com/refresh')
async def refresh_from_apartments_com(request: ApartmentsComRefreshRequest):
    """
    Refresh pricing data for a single competitor from apartments.com.
    
    Uses Playwright for full JavaScript rendering to extract:
    - Current rent prices (min/max)
    - Unit availability
    - Square footage
    - Move-in specials
    - Amenities
    
    Args:
        competitor_id: Competitor UUID
        url: Optional apartments.com URL (uses saved URL if not provided)
    """
    try:
        from scrapers.coordinator import ScrapingCoordinator
        
        proxy_url = os.environ.get('SCRAPER_PROXY_URL')
        coordinator = ScrapingCoordinator(proxy_url=proxy_url)
        
        result = coordinator.refresh_competitor_from_apartments_com(
            competitor_id=request.competitor_id,
            apartments_com_url=request.url
        )
        
        return result
        
    except Exception as e:
        logger.error(f"Apartments.com refresh error: {e}")
        return {
            'success': False,
            'error': str(e)
        }


@app.post('/scrape/apartments-com/batch')
async def batch_refresh_from_apartments_com(
    request: ApartmentsComBatchRequest,
    background_tasks: BackgroundTasks
):
    """
    Batch refresh pricing data for multiple competitors from apartments.com.
    
    Processes all competitors with apartments.com URLs for a property.
    Runs in background for large batches.
    
    Args:
        property_id: Property UUID
        competitor_ids: Optional list of specific competitor IDs
    """
    def run_batch():
        try:
            from scrapers.coordinator import ScrapingCoordinator
            
            proxy_url = os.environ.get('SCRAPER_PROXY_URL')
            coordinator = ScrapingCoordinator(proxy_url=proxy_url)
            
            result = coordinator.batch_refresh_from_apartments_com(
                property_id=request.property_id,
                competitor_ids=request.competitor_ids
            )
            
            logger.info(f"Batch refresh complete: {result}")
            return result
            
        except Exception as e:
            logger.error(f"Batch refresh error: {e}")
            return {'success': False, 'error': str(e)}
    
    # Run in background
    background_tasks.add_task(run_batch)
    
    return {
        'success': True,
        'message': 'Batch refresh started in background',
        'property_id': request.property_id
    }


@app.post('/scrape/apartments-com/discover')
async def discover_from_apartments_com(
    request: ApartmentsComDiscoverRequest,
    background_tasks: BackgroundTasks
):
    """
    Discover competitors by searching apartments.com for a city/state.
    
    Uses Playwright to:
    1. Search apartments.com for the city/state
    2. Extract property listings from search results
    3. Scrape each property for detailed pricing data
    4. Add new competitors to the database
    
    Args:
        property_id: Property UUID to add competitors to
        city: City name
        state: State name or abbreviation
        max_results: Maximum properties to scrape
        auto_add: Auto-add discovered competitors to database
    """
    def run_discovery():
        try:
            from scrapers.coordinator import ScrapingCoordinator
            
            proxy_url = os.environ.get('SCRAPER_PROXY_URL')
            coordinator = ScrapingCoordinator(proxy_url=proxy_url)
            
            result = coordinator.discover_and_scrape_apartments_com(
                property_id=request.property_id,
                city=request.city,
                state=request.state,
                max_results=request.max_results,
                auto_add=request.auto_add
            )
            
            logger.info(f"Apartments.com discovery complete: {result}")
            return result
            
        except Exception as e:
            logger.error(f"Discovery error: {e}")
            return {'success': False, 'error': str(e)}
    
    # For small requests, run synchronously
    if request.max_results <= 5:
        result = run_discovery()
        return result
    
    # Run in background for larger requests
    background_tasks.add_task(run_discovery)
    
    return {
        'success': True,
        'message': f'Discovery started for {request.city}, {request.state}',
        'property_id': request.property_id,
        'status': 'processing'
    }


class ApartmentsComBulkAddRequest(BaseModel):
    """Bulk add apartments.com URLs to multiple competitors"""
    listings: List[dict]  # List of {competitor_id: str, url: str}
    auto_scrape: bool = True


@app.post('/scrape/apartments-com/add-listings-bulk')
async def bulk_add_apartments_com_listings(request: ApartmentsComBulkAddRequest):
    """
    Bulk add apartments.com listing URLs to multiple competitors.
    
    **RECOMMENDED WORKFLOW for finding competitor listings:**
    
    1. User manually searches apartments.com for each competitor
    2. User copies the direct URLs
    3. Use this endpoint to save URLs and scrape pricing in one call
    
    This is more reliable than auto-search because:
    - Direct URLs always work (no name matching needed)
    - No timeouts from large city searches
    - User verifies correct match
    
    Args:
        listings: Array of {competitor_id: string, url: string}
        auto_scrape: Scrape pricing after saving URLs (default: true)
    
    Example request body:
    ```json
    {
        "listings": [
            {"competitor_id": "uuid-1", "url": "https://www.apartments.com/property-1/"},
            {"competitor_id": "uuid-2", "url": "https://www.apartments.com/property-2/"}
        ],
        "auto_scrape": true
    }
    ```
    """
    from scrapers.coordinator import ScrapingCoordinator
    
    results = {
        'success': True,
        'total': len(request.listings),
        'saved': 0,
        'scraped': 0,
        'failed': 0,
        'details': []
    }
    
    proxy_url = os.environ.get('SCRAPER_PROXY_URL')
    coordinator = ScrapingCoordinator(proxy_url=proxy_url)
    
    for listing in request.listings:
        competitor_id = listing.get('competitor_id')
        url = listing.get('url')
        
        if not competitor_id or not url:
            results['failed'] += 1
            results['details'].append({
                'competitor_id': competitor_id,
                'success': False,
                'error': 'Missing competitor_id or url'
            })
            continue
        
        if 'apartments.com' not in url:
            results['failed'] += 1
            results['details'].append({
                'competitor_id': competitor_id,
                'success': False,
                'error': 'URL must be from apartments.com'
            })
            continue
        
        try:
            result = coordinator.add_apartments_com_listing(
                competitor_id=competitor_id,
                apartments_com_url=url,
                skip_scrape=not request.auto_scrape
            )
            
            if result.get('success'):
                results['saved'] += 1
                if result.get('scraped'):
                    results['scraped'] += 1
                results['details'].append({
                    'competitor_id': competitor_id,
                    'competitor_name': result.get('competitor_name'),
                    'success': True,
                    'url_saved': True,
                    'scraped': result.get('scraped', False),
                    'units_scraped': result.get('units_scraped', 0)
                })
            else:
                results['failed'] += 1
                results['details'].append({
                    'competitor_id': competitor_id,
                    'success': False,
                    'error': result.get('error', 'Unknown error')
                })
                
        except Exception as e:
            results['failed'] += 1
            results['details'].append({
                'competitor_id': competitor_id,
                'success': False,
                'error': str(e)
            })
    
    results['message'] = f"Saved {results['saved']}/{results['total']} URLs, scraped {results['scraped']}"
    return results


@app.post('/scrape/apartments-com/add-listing')
async def add_apartments_com_listing(request: ApartmentsComAddListingRequest):
    """
    Add an apartments.com listing URL to an existing competitor and scrape it.
    
    Use this to manually associate a competitor with their apartments.com listing
    for ongoing price tracking.
    
    Args:
        competitor_id: Competitor UUID
        url: Apartments.com listing URL
    """
    # Validate URL
    if 'apartments.com' not in request.url:
        return {
            'success': False,
            'error': 'URL must be from apartments.com'
        }
    
    try:
        from scrapers.coordinator import ScrapingCoordinator
        
        proxy_url = os.environ.get('SCRAPER_PROXY_URL')
        coordinator = ScrapingCoordinator(proxy_url=proxy_url)
        
        result = coordinator.add_apartments_com_listing(
            competitor_id=request.competitor_id,
            apartments_com_url=request.url
        )
        
        return result
        
    except Exception as e:
        logger.error(f"Add listing error: {e}")
        return {
            'success': False,
            'error': str(e)
        }


@app.get('/scrape/apartments-com/property/{url:path}')
async def scrape_apartments_com_property(url: str):
    """
    Scrape a single apartments.com property URL directly.
    
    Useful for testing or one-off scrapes without saving to database.
    Returns full property data including units, amenities, etc.
    
    Args:
        url: Full apartments.com property URL
    """
    # Decode URL if needed
    from urllib.parse import unquote
    url = unquote(url)
    
    if not url.startswith('http'):
        url = 'https://' + url
    
    if 'apartments.com' not in url:
        return {
            'success': False,
            'error': 'URL must be from apartments.com'
        }
    
    try:
        from scrapers.apartments_com import ApartmentsComScraper
        
        proxy_url = os.environ.get('SCRAPER_PROXY_URL')
        scraper = ApartmentsComScraper(proxy_url=proxy_url, use_playwright=True)
        
        property_data = scraper.scrape_property(url)
        
        if property_data:
            return {
                'success': True,
                'data': property_data.to_dict()
            }
        else:
            return {
                'success': False,
                'error': 'Failed to scrape property'
            }
        
    except Exception as e:
        logger.error(f"Direct scrape error: {e}")
        return {
            'success': False,
            'error': str(e)
        }


class FindListingsRequest(BaseModel):
    property_id: str
    competitor_ids: Optional[List[str]] = None
    auto_scrape: bool = True
    city: Optional[str] = None  # Override city for all competitors
    state: Optional[str] = None  # Override state for all competitors
    search_strategy: str = "name"  # "name" (recommended) or "area"


@app.post('/scrape/apartments-com/find-listings')
async def find_apartments_com_listings(
    request: FindListingsRequest,
    background_tasks: BackgroundTasks
):
    """
    Search apartments.com for existing competitors and link their listings.
    
    Two search strategies available:
    
    **"name" (default, recommended):**
    - Searches by each competitor's name + city
    - Faster, more accurate, avoids timeouts
    - Makes ~10 small searches instead of 1 large one
    
    **"area":**
    - Searches entire city for all properties
    - Slower, can timeout in large cities
    - Better for discovering NEW properties
    
    For each competitor without an apartments.com URL:
    1. Search apartments.com by name and city/state
    2. Match results using name similarity and address
    3. If confident match found, save the apartments.com URL
    4. Optionally auto-scrape pricing data
    
    **NOTE:** For best results with specific competitors, use the manual URL 
    upload flow via POST /scrape/apartments-com/add-listing with the direct 
    apartments.com URL.
    
    Args:
        property_id: Property UUID
        competitor_ids: Optional specific competitor IDs
        auto_scrape: Auto-scrape pricing after finding URLs (default: true)
        city: Override city for search
        state: Override state for search  
        search_strategy: "name" (recommended) or "area"
    """
    try:
        from scrapers.coordinator import ScrapingCoordinator
        
        proxy_url = os.environ.get('SCRAPER_PROXY_URL')
        coordinator = ScrapingCoordinator(proxy_url=proxy_url)
        
        # The coordinator method is now async, so await it directly
        result = await coordinator.find_apartments_com_listings(
            property_id=request.property_id,
            competitor_ids=request.competitor_ids,
            auto_scrape=request.auto_scrape,
            city_override=request.city,
            state_override=request.state,
            search_strategy=request.search_strategy
        )
        
        logger.info(f"Find listings complete: {result}")
        return result
        
    except Exception as e:
        logger.error(f"Find listings error: {e}")
        return {'success': False, 'error': str(e)}


@app.get('/scrape/apartments-com/status')
def get_apartments_com_scraper_status():
    """
    Get apartments.com scraper configuration and status.
    
    Now uses Apify's managed scraper (epctex/apartments-scraper) instead of
    the blocked Playwright/httpx scraper.
    """
    from scrapers.apify_apartments import is_apify_configured
    
    apify_configured = is_apify_configured()
    
    # Also check legacy scraper availability for reference
    try:
        from scrapers.apartments_com import PLAYWRIGHT_AVAILABLE
        playwright_available = PLAYWRIGHT_AVAILABLE
    except:
        playwright_available = False
    
    return {
        "scraper_type": "apify" if apify_configured else "legacy (blocked)",
        "apify_configured": apify_configured,
        "apify_actor": "epctex/apartments-scraper",
        "legacy_playwright_available": playwright_available,
        "proxy_configured": bool(os.environ.get('SCRAPER_PROXY_URL')),
        "features": {
            "search_by_location": apify_configured,
            "property_scraping": apify_configured,
            "pricing_extraction": apify_configured,
            "unit_details": apify_configured,
            "amenities_extraction": apify_configured,
            "specials_detection": apify_configured,
            "batch_refresh": apify_configured,
            "auto_find_listings": apify_configured
        },
        "status": "ready" if apify_configured else "APIFY_API_TOKEN required",
        "setup_instructions": None if apify_configured else (
            "Set APIFY_API_TOKEN environment variable. "
            "Get your token from https://console.apify.com/account#/integrations"
        )
    }


# =============================================================================
# WEBSITE-BASED PRICING REFRESH ENDPOINTS
# =============================================================================

class WebsiteRefreshRequest(BaseModel):
    competitor_id: str
    url: Optional[str] = None  # Override URL if not using saved one


class WebsiteBatchRequest(BaseModel):
    property_id: str
    competitor_ids: Optional[List[str]] = None  # None = all with website URLs
    prefer_website: bool = True  # Prefer website over apartments.com


class PropertyWebsiteRefreshRequest(BaseModel):
    property_id: str
    url: Optional[str] = None  # Override website URL


@app.post('/scrape/website/refresh')
async def refresh_from_website(request: WebsiteRefreshRequest):
    """
    Refresh pricing data for a single competitor from their website.
    
    Scrapes the competitor's own website for floor plans and pricing.
    This is the PREFERRED method as it gets data directly from the source,
    rather than relying on third-party listings like apartments.com.
    
    Extracts:
    - Floor plan types (Studio, 1BR, 2BR, etc.)
    - Rent ranges (min/max)
    - Square footage
    - Move-in specials
    - Amenities
    
    Args:
        competitor_id: Competitor UUID
        url: Optional website URL (uses saved URL if not provided)
    """
    try:
        from scrapers.coordinator import ScrapingCoordinator
        
        proxy_url = os.environ.get('SCRAPER_PROXY_URL')
        coordinator = ScrapingCoordinator(proxy_url=proxy_url)
        
        result = coordinator.refresh_competitor_from_website(
            competitor_id=request.competitor_id,
            website_url=request.url
        )
        
        return result
        
    except Exception as e:
        logger.error(f"Website refresh error: {e}")
        return {
            'success': False,
            'error': str(e)
        }


@app.post('/scrape/website/batch')
async def batch_refresh_from_website(
    request: WebsiteBatchRequest,
    background_tasks: BackgroundTasks
):
    """
    Batch refresh pricing data for multiple competitors from their websites.
    
    This is the PREFERRED method for refreshing pricing data as it gets
    information directly from competitor websites rather than third-party
    ILS listings like apartments.com.
    
    Args:
        property_id: Property UUID
        competitor_ids: Optional list of specific competitor IDs (None = all with website URLs)
        prefer_website: If True (default), prioritize website over apartments.com
    """
    def run_batch():
        try:
            from scrapers.coordinator import ScrapingCoordinator
            
            proxy_url = os.environ.get('SCRAPER_PROXY_URL')
            coordinator = ScrapingCoordinator(proxy_url=proxy_url)
            
            result = coordinator.batch_refresh_from_website(
                property_id=request.property_id,
                competitor_ids=request.competitor_ids
            )
            
            logger.info(f"Website batch refresh complete: {result}")
            return result
            
        except Exception as e:
            logger.error(f"Website batch refresh error: {e}")
            return {'success': False, 'error': str(e)}
    
    # Run in background
    background_tasks.add_task(run_batch)
    
    return {
        'success': True,
        'message': 'Website batch refresh started in background',
        'property_id': request.property_id,
        'source': 'website'
    }


@app.post('/scrape/property/refresh')
async def refresh_property_from_website(request: PropertyWebsiteRefreshRequest):
    """
    Scrape pricing and floorplan data from the property's own website.
    
    This uses the SAME scraping logic as competitors, but stores results
    in property_units instead of competitor_units.
    
    Extracts:
    - Floor plan types (Studio, 1BR, 2BR, etc.)
    - Rent ranges (min/max)
    - Square footage
    - Move-in specials
    - Availability
    
    Args:
        property_id: Property UUID
        url: Optional website URL override
    """
    try:
        from scrapers.coordinator import ScrapingCoordinator
        
        proxy_url = os.environ.get('SCRAPER_PROXY_URL')
        coordinator = ScrapingCoordinator(proxy_url=proxy_url)
        
        result = coordinator.refresh_property_from_website(
            property_id=request.property_id,
            website_url=request.url
        )
        
        return result
        
    except Exception as e:
        logger.error(f"Property website refresh error: {e}")
        return {
            'success': False,
            'error': str(e)
        }


@app.post('/scrape/refresh-pricing')
async def refresh_pricing(request: WebsiteBatchRequest):
    """
    Refresh pricing data for all competitors of a property.
    
    PRIORITIZES competitor websites over apartments.com listings.
    Falls back to apartments.com only if website scraping doesn't yield pricing.
    
    This is the main endpoint for the "Refresh Pricing" button in the UI.
    Runs SYNCHRONOUSLY so the frontend can show accurate progress.
    
    Args:
        property_id: Property UUID
        competitor_ids: Optional list of specific competitor IDs
        prefer_website: If True (default), try website first before apartments.com
    """
    try:
        from scrapers.coordinator import ScrapingCoordinator
        
        proxy_url = os.environ.get('SCRAPER_PROXY_URL')
        coordinator = ScrapingCoordinator(proxy_url=proxy_url)
        
        # Run synchronously so frontend waits for completion
        result = coordinator.refresh_all_competitors(
            property_id=request.property_id,
            prefer_website=request.prefer_website
        )
        
        logger.info(f"Pricing refresh complete: {result}")
        
        return {
            'success': True,
            'message': 'Pricing refresh complete',
            'property_id': request.property_id,
            **result
        }
        
    except Exception as e:
        logger.error(f"Pricing refresh error: {e}")
        return {
            'success': False,
            'error': str(e),
            'property_id': request.property_id
        }


@app.get('/scrape/website/status')
def get_website_scraper_status():
    """
    Get website scraper configuration and status.
    
    The website scraper directly scrapes competitor websites for pricing data.
    This is preferred over apartments.com as it gets data from the source.
    """
    try:
        from scrapers.website_intelligence import PLAYWRIGHT_AVAILABLE
        playwright_available = PLAYWRIGHT_AVAILABLE
    except:
        playwright_available = False
    
    return {
        "scraper_type": "website_intelligence",
        "status": "ready",
        "playwright_fallback": playwright_available,
        "features": {
            "floor_plan_extraction": True,
            "pricing_extraction": True,
            "sqft_extraction": True,
            "amenities_extraction": True,
            "specials_extraction": True,
            "brand_intelligence": True,
            "batch_refresh": True
        },
        "supported_patterns": [
            "Structured floor plan sections",
            "Pricing tables",
            "Text-based pricing (e.g., 'Studio from $1,200')",
            "Price ranges (e.g., '$1,200 - $1,500')"
        ],
        "notes": [
            "Preferred over apartments.com for accurate pricing",
            "Works with most apartment community websites",
            "Uses Playwright fallback for bot-protected sites"
        ]
    }


# =============================================================================
# REVIEWFLOW AI - Review Scraping Endpoints
# =============================================================================

class GoogleReviewsRequest(BaseModel):
    place_id: str
    max_reviews: int = 100


class GoogleReviewsSearchRequest(BaseModel):
    property_name: str
    address: str
    lat: Optional[float] = None
    lng: Optional[float] = None


class YelpReviewsRequest(BaseModel):
    business_id: str


class YelpReviewsSearchRequest(BaseModel):
    property_name: str
    city: str
    state: Optional[str] = ""


class YelpUrlRequest(BaseModel):
    url: str


@app.post('/scraper/google-reviews')
async def scrape_google_reviews(request: GoogleReviewsRequest):
    """
    Fetch reviews from Google Places API for a specific Place ID.
    
    Uses existing GooglePlacesScraper with enhanced review extraction.
    Returns up to 5 reviews per request (Google API limitation).
    
    Args:
        place_id: Google Place ID (e.g., ChIJ...)
        max_reviews: Maximum reviews to return (capped by API)
    """
    try:
        from scrapers.google_places import GooglePlacesScraper
        
        api_key = os.environ.get('GOOGLE_MAPS_API_KEY')
        if not api_key:
            return {
                'success': False,
                'error': 'Google Maps API key not configured',
                'reviews': []
            }
        
        scraper = GooglePlacesScraper(api_key=api_key)
        reviews = scraper.get_place_reviews(
            place_id=request.place_id,
            max_reviews=request.max_reviews
        )
        
        return {
            'success': True,
            'place_id': request.place_id,
            'reviews': [r.to_dict() for r in reviews],
            'reviews_fetched': len(reviews),
            'note': 'Google Places API returns up to 5 reviews per request'
        }
        
    except ValueError as e:
        return {
            'success': False,
            'error': str(e),
            'reviews': []
        }
    except Exception as e:
        logger.error(f"Google reviews scraping error: {e}")
        return {
            'success': False,
            'error': str(e),
            'reviews': []
        }


@app.post('/scraper/google-reviews/search')
async def search_and_scrape_google_reviews(request: GoogleReviewsSearchRequest):
    """
    Search for a property on Google and fetch its reviews.
    
    Useful when you don't have the Place ID - searches by name and address.
    
    Args:
        property_name: Name of the property
        address: Street address
        lat: Optional latitude for better matching
        lng: Optional longitude for better matching
    """
    try:
        from scrapers.google_places import GooglePlacesScraper
        
        api_key = os.environ.get('GOOGLE_MAPS_API_KEY')
        if not api_key:
            return {
                'success': False,
                'error': 'Google Maps API key not configured',
                'reviews': []
            }
        
        scraper = GooglePlacesScraper(api_key=api_key)
        result = scraper.get_reviews_for_property(
            property_name=request.property_name,
            address=request.address,
            lat=request.lat,
            lng=request.lng
        )
        
        return result
        
    except ValueError as e:
        return {
            'success': False,
            'error': str(e),
            'reviews': []
        }
    except Exception as e:
        logger.error(f"Google reviews search error: {e}")
        return {
            'success': False,
            'error': str(e),
            'reviews': []
        }


class GoogleReviewsFullRequest(BaseModel):
    place_id: str
    max_reviews: int = 100


@app.post('/scraper/google-reviews/full')
async def scrape_all_google_reviews(request: GoogleReviewsFullRequest):
    """
    Fetch ALL reviews from Google Maps using SerpAPI.
    
    Unlike the standard /scraper/google-reviews endpoint (limited to 5 reviews
    by Google's API), this endpoint uses SerpAPI to get ALL reviews with
    proper pagination.
    
    Args:
        place_id: Google Place ID
        max_reviews: Maximum reviews to fetch (default 100)
    """
    try:
        from scrapers.serpapi_reviews import SerpApiReviewsScraper, is_serpapi_configured
        from scrapers.google_places import GooglePlacesScraper
        
        # Try SerpAPI first (preferred - gets ALL reviews)
        if is_serpapi_configured():
            try:
                logger.info(f"[Full Scraper] Using SerpAPI for {request.place_id}")
                scraper = SerpApiReviewsScraper()
                result = scraper.get_reviews(
                    place_id=request.place_id,
                    max_reviews=request.max_reviews
                )
                
                if result.get('success') and len(result.get('reviews', [])) > 0:
                    logger.info(f"[Full Scraper] SerpAPI succeeded with {len(result['reviews'])} reviews")
                    return result
                else:
                    logger.warning(f"[Full Scraper] SerpAPI returned no reviews: {result.get('error', 'unknown')}")
            except Exception as e:
                logger.warning(f"[Full Scraper] SerpAPI failed: {e}, falling back to Google API...")
        else:
            logger.warning("[Full Scraper] SerpAPI not configured, using Google API fallback")
        
        # Fallback to Google Places API (5 reviews max, but reliable)
        logger.info("[Full Scraper] Using Google Places API fallback...")
        api_key = os.environ.get('GOOGLE_MAPS_API_KEY')
        if not api_key:
            return {
                'success': False,
                'error': 'Neither SerpAPI nor Google Maps API key configured',
                'reviews': []
            }
        
        api_scraper = GooglePlacesScraper(api_key=api_key)
        api_reviews = api_scraper.get_place_reviews(request.place_id)
        
        return {
            'success': len(api_reviews) > 0,
            'place_id': request.place_id,
            'reviews': [r.to_dict() for r in api_reviews],
            'reviews_fetched': len(api_reviews),
            'method': 'google_api_fallback',
            'note': f'SerpAPI not available. Retrieved {len(api_reviews)} reviews via Google Places API (max 5).'
        }
        
    except ImportError as e:
        return {
            'success': False,
            'error': f'Import error: {e}',
            'reviews': []
        }
    except Exception as e:
        logger.error(f"Google full review scraping error: {e}")
        return {
            'success': False,
            'error': str(e),
            'reviews': []
        }


@app.post('/scraper/yelp-reviews')
async def scrape_yelp_reviews(request: YelpReviewsRequest):
    """
    Fetch reviews from Yelp Fusion API for a specific business.
    
    ⚠️ IMPORTANT: Yelp API returns only 3 most recent reviews.
    This is an API limitation, not a bug.
    
    Args:
        business_id: Yelp business ID (e.g., "the-domain-at-wills-crossing-austin")
    """
    try:
        from scrapers.yelp import YelpFusionClient, is_yelp_configured
        
        if not is_yelp_configured():
            return {
                'success': False,
                'error': 'Yelp API key not configured. Set YELP_FUSION_API_KEY env var.',
                'reviews': []
            }
        
        client = YelpFusionClient()
        
        # Get business details first
        business = client.get_business(request.business_id)
        if not business:
            return {
                'success': False,
                'error': f'Business not found: {request.business_id}',
                'reviews': []
            }
        
        # Get reviews
        reviews = client.get_business_reviews(request.business_id)
        
        return {
            'success': True,
            'business_id': request.business_id,
            'business_name': business.name,
            'business_rating': business.rating,
            'total_reviews': business.review_count,
            'reviews': [r.to_dict() for r in reviews],
            'reviews_fetched': len(reviews),
            'note': 'Yelp API returns only 3 most recent reviews per business'
        }
        
    except ValueError as e:
        return {
            'success': False,
            'error': str(e),
            'reviews': []
        }
    except Exception as e:
        logger.error(f"Yelp reviews scraping error: {e}")
        return {
            'success': False,
            'error': str(e),
            'reviews': []
        }


@app.post('/scraper/yelp-reviews/search')
async def search_and_scrape_yelp_reviews(request: YelpReviewsSearchRequest):
    """
    Search for a property on Yelp and fetch its reviews.
    
    Useful when you don't have the Yelp business ID.
    
    Args:
        property_name: Name of the property
        city: City name
        state: State (optional)
    """
    try:
        from scrapers.yelp import YelpFusionClient, is_yelp_configured
        
        if not is_yelp_configured():
            return {
                'success': False,
                'error': 'Yelp API key not configured. Set YELP_FUSION_API_KEY env var.',
                'reviews': []
            }
        
        client = YelpFusionClient()
        result = client.get_reviews_for_property(
            property_name=request.property_name,
            city=request.city,
            state=request.state or ""
        )
        
        return result
        
    except ValueError as e:
        return {
            'success': False,
            'error': str(e),
            'reviews': []
        }
    except Exception as e:
        logger.error(f"Yelp reviews search error: {e}")
        return {
            'success': False,
            'error': str(e),
            'reviews': []
        }


@app.post('/scraper/yelp-reviews/from-url')
async def scrape_yelp_reviews_from_url(request: YelpUrlRequest):
    """
    Extract business ID from Yelp URL and fetch reviews.
    
    Accepts URLs like:
    - https://www.yelp.com/biz/the-domain-at-wills-crossing-austin
    
    Args:
        url: Yelp business URL
    """
    try:
        from scrapers.yelp import YelpFusionClient, is_yelp_configured
        
        if not is_yelp_configured():
            return {
                'success': False,
                'error': 'Yelp API key not configured. Set YELP_FUSION_API_KEY env var.',
                'reviews': []
            }
        
        client = YelpFusionClient()
        
        # Extract business ID from URL
        business_id = client.extract_business_id_from_url(request.url)
        if not business_id:
            return {
                'success': False,
                'error': 'Could not extract business ID from URL. Expected format: yelp.com/biz/business-name',
                'reviews': []
            }
        
        # Get business details
        business = client.get_business(business_id)
        if not business:
            return {
                'success': False,
                'error': f'Business not found: {business_id}',
                'reviews': []
            }
        
        # Get reviews
        reviews = client.get_business_reviews(business_id)
        
        return {
            'success': True,
            'business_id': business_id,
            'business_name': business.name,
            'business_url': business.url,
            'business_rating': business.rating,
            'total_reviews': business.review_count,
            'reviews': [r.to_dict() for r in reviews],
            'reviews_fetched': len(reviews),
            'note': 'Yelp API returns only 3 most recent reviews per business'
        }
        
    except ValueError as e:
        return {
            'success': False,
            'error': str(e),
            'reviews': []
        }
    except Exception as e:
        logger.error(f"Yelp URL reviews error: {e}")
        return {
            'success': False,
            'error': str(e),
            'reviews': []
        }


@app.get('/scraper/reviews/status')
def get_reviews_scraper_status():
    """
    Get review scraping configuration and status.
    
    Shows which review platforms are configured and available.
    """
    from scrapers.yelp import is_yelp_configured
    
    google_configured = bool(os.environ.get('GOOGLE_MAPS_API_KEY'))
    serpapi_configured = bool(os.environ.get('SERPAPI_API_KEY'))
    yelp_configured = is_yelp_configured()
    
    return {
        "google": {
            "configured": google_configured,
            "status": "ready" if google_configured else "GOOGLE_MAPS_API_KEY required",
            "reviews_per_request": 5,
            "features": {
                "fetch_by_place_id": google_configured,
                "search_by_name": google_configured,
                "review_analysis": True
            },
            "limitations": [
                "Returns up to 5 reviews per request",
                "No pagination available in standard API",
                "Advanced reviews require Places API (New) paid tier"
            ]
        },
        "serpapi": {
            "configured": serpapi_configured,
            "status": "ready" if serpapi_configured else "SERPAPI_API_KEY required",
            "reviews_per_request": "unlimited",
            "features": {
                "fetch_all_reviews": serpapi_configured,
                "pagination": serpapi_configured,
                "sort_options": serpapi_configured
            },
            "note": "Use /scraper/google-reviews/full endpoint to get ALL reviews"
        },
        "yelp": {
            "configured": yelp_configured,
            "status": "ready" if yelp_configured else "YELP_FUSION_API_KEY required",
            "reviews_per_request": 3,
            "features": {
                "fetch_by_business_id": yelp_configured,
                "search_by_name": yelp_configured,
                "extract_from_url": yelp_configured,
                "review_analysis": True
            },
            "limitations": [
                "Returns ONLY 3 most recent reviews (hard API limit)",
                "No historical review access",
                "Full review data requires Business Owner API access"
            ]
        },
        "supported_platforms": ["google", "yelp"],
        "coming_soon": ["facebook", "apartments_com"],
        "notes": [
            "All reviews are automatically analyzed by ReviewFlow AI",
            "Negative reviews trigger automatic ticket creation",
            "AI-generated responses are created for pending reviews"
        ]
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
