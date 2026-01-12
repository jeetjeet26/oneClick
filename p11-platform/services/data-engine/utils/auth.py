"""
API Key Authentication for Data Engine Job Endpoints
Protects background job execution endpoints from unauthorized access
"""
import os
from fastapi import HTTPException, Header, Request
from typing import Optional
import logging

logger = logging.getLogger(__name__)

# Get API key from environment
DATA_ENGINE_API_KEY = os.environ.get('DATA_ENGINE_API_KEY')

def verify_api_key(x_api_key: Optional[str] = Header(None)) -> str:
    """
    Dependency for verifying API key on protected endpoints.
    
    Usage:
        @app.post('/jobs/propertyaudit/run', dependencies=[Depends(verify_api_key)])
        async def run_propertyaudit(...)
    
    Raises:
        HTTPException: If API key is missing or invalid
    
    Returns:
        str: The validated API key
    """
    if not DATA_ENGINE_API_KEY:
        # If no API key is configured, allow requests (development mode)
        logger.warning("⚠️  DATA_ENGINE_API_KEY not set - running in open mode (not secure for production)")
        return "dev-mode"
    
    if not x_api_key:
        logger.error("❌ API key missing from request")
        raise HTTPException(
            status_code=401,
            detail="Missing API key. Include X-API-Key header.",
            headers={"WWW-Authenticate": "ApiKey"},
        )
    
    if x_api_key != DATA_ENGINE_API_KEY:
        logger.error("❌ Invalid API key provided")
        raise HTTPException(
            status_code=403,
            detail="Invalid API key",
        )
    
    logger.debug("✅ API key validated")
    return x_api_key


async def log_request_middleware(request: Request, call_next):
    """
    Middleware to log all requests with correlation IDs.
    """
    correlation_id = request.headers.get('X-Correlation-ID', 'unknown')
    logger.info(f"[{correlation_id}] {request.method} {request.url.path}")
    
    response = await call_next(request)
    
    # Add correlation ID to response headers
    response.headers['X-Correlation-ID'] = correlation_id
    
    return response






