"""
Data Engine API - Main FastAPI application
Handles property audits, reviews, and marketing data sync
"""
# Load environment FIRST before any other imports that might need env vars
from utils.config import SUPABASE_URL  # This triggers .env loading

from fastapi import FastAPI, HTTPException, Header, BackgroundTasks, Depends
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional, List
import os

app = FastAPI(title="P11 Data Engine", version="1.0.0")

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "https://*.vercel.app"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Authentication
def verify_api_key(authorization: Optional[str] = Header(None)):
    """Verify API key from Authorization header."""
    expected_key = os.environ.get("DATA_ENGINE_API_KEY")
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing authorization")
    
    token = authorization.replace("Bearer ", "")
    if token != expected_key:
        raise HTTPException(status_code=401, detail="Invalid API key")
    return True


# ============================================
# Marketing Data Sync Endpoints
# ============================================

class SyncMarketingRequest(BaseModel):
    property_id: str
    channels: List[str] = ["google_ads", "meta_ads"]
    date_range: str = "LAST_7_DAYS"

class SyncAllRequest(BaseModel):
    date_range: str = "LAST_7_DAYS"

@app.post("/sync-marketing-data")
async def sync_marketing_data(
    request: SyncMarketingRequest,
    background_tasks: BackgroundTasks,
    authorized: bool = Depends(verify_api_key)
):
    """
    Trigger marketing data sync for a specific property.
    Runs in background to avoid timeout.
    Creates import_job for tracking.
    """
    from pipelines.mcp_marketing_sync import MCPMarketingSync
    from utils.supabase_client import get_supabase_client
    from datetime import datetime
    
    # Create import job
    supabase = get_supabase_client()
    job_result = supabase.table('import_jobs').insert({
        'property_id': request.property_id,
        'channels': request.channels,
        'date_range': request.date_range,
        'status': 'pending',
        'progress_pct': 0,
        'created_at': datetime.utcnow().isoformat()
    }).execute()
    
    job_id = job_result.data[0]['id'] if job_result.data else None
    
    async def run_sync():
        try:
            syncer = MCPMarketingSync(job_id=job_id)
            # Don't pass date_range to let incremental calculation work
            # This uses MAXIMUM for first-time imports, then calculates based on last_import
            await syncer.sync_property(
                property_id=request.property_id,
                channels=request.channels,
                date_range=None,  # Let sync_property calculate based on last import
                incremental=True
            )
        except Exception as e:
            print(f"Sync error: {e}")
            if job_id:
                supabase.table('import_jobs').update({
                    'status': 'failed',
                    'error_message': str(e),
                    'completed_at': datetime.utcnow().isoformat()
                }).eq('id', job_id).execute()
    
    background_tasks.add_task(run_sync)
    
    return {
        "status": "import_started",
        "job_id": job_id,
        "property_id": request.property_id,
        "channels": request.channels,
    }

@app.post("/sync-all-properties")
async def sync_all_properties(
    request: SyncAllRequest,
    background_tasks: BackgroundTasks,
    authorized: bool = Depends(verify_api_key)
):
    """
    Trigger marketing data sync for all properties.
    Runs in background.
    """
    from pipelines.mcp_marketing_sync import MCPMarketingSync
    
    async def run_sync():
        syncer = MCPMarketingSync()
        await syncer.sync_all_properties()
    
    background_tasks.add_task(run_sync)
    
    return {
        "status": "sync_started",
        "message": "Syncing all properties in background"
    }


# ============================================
# Health Check
# ============================================

@app.get("/health")
async def health_check():
    """Health check endpoint."""
    return {
        "status": "healthy",
        "service": "p11-data-engine",
        "version": "1.0.0"
    }

@app.get("/import-jobs/{job_id}")
async def get_import_job(job_id: str, authorized: bool = Depends(verify_api_key)):
    """Get import job status."""
    from utils.supabase_client import get_supabase_client
    
    supabase = get_supabase_client()
    result = supabase.table('import_jobs').select('*').eq('id', job_id).single().execute()
    
    if not result.data:
        raise HTTPException(status_code=404, detail="Job not found")
    
    return result.data

@app.get("/")
async def root():
    """Root endpoint."""
    return {
        "service": "P11 Data Engine",
        "version": "1.0.0",
        "endpoints": {
            "health": "GET /health",
            "sync_property": "POST /sync-marketing-data",
            "sync_all": "POST /sync-all-properties",
            "job_status": "GET /import-jobs/{job_id}",
        }
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
