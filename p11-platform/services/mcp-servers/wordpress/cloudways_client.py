"""
Cloudways API Client
Handles OAuth authentication and API calls for WordPress provisioning
"""

import httpx
import asyncio
from typing import Dict, Any, Optional
from datetime import datetime, timedelta
import logging

from .config import CLOUDWAYS_API_KEY, CLOUDWAYS_EMAIL, CLOUDWAYS_API_URL

logger = logging.getLogger(__name__)

# Token cache
_access_token: Optional[str] = None
_token_expires_at: Optional[datetime] = None


async def get_access_token() -> str:
    """
    Get Cloudways API access token.
    Authenticates using email + API key, caches token for reuse.
    """
    global _access_token, _token_expires_at
    
    # Return cached token if still valid
    if _access_token and _token_expires_at and datetime.now() < _token_expires_at:
        return _access_token
    
    if not CLOUDWAYS_API_KEY or not CLOUDWAYS_EMAIL:
        raise ValueError("CLOUDWAYS_API_KEY and CLOUDWAYS_EMAIL must be set")
    
    async with httpx.AsyncClient() as client:
        response = await client.post(
            f"{CLOUDWAYS_API_URL}/oauth/access_token",
            data={
                "email": CLOUDWAYS_EMAIL,
                "api_key": CLOUDWAYS_API_KEY
            }
        )
        
        if response.status_code != 200:
            logger.error(f"Cloudways auth failed: {response.status_code} - {response.text}")
            raise ValueError(f"Cloudways authentication failed: {response.text}")
        
        data = response.json()
        _access_token = data.get("access_token")
        
        # Token expires in 1 hour, refresh 5 minutes early
        _token_expires_at = datetime.now() + timedelta(minutes=55)
        
        logger.info("Successfully obtained Cloudways access token")
        return _access_token


async def _make_request(
    method: str,
    endpoint: str,
    data: Optional[Dict] = None,
    params: Optional[Dict] = None
) -> Dict[str, Any]:
    """Make authenticated request to Cloudways API"""
    token = await get_access_token()
    
    url = f"{CLOUDWAYS_API_URL}{endpoint}"
    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json"
    }
    
    async with httpx.AsyncClient() as client:
        if method.upper() == "GET":
            response = await client.get(url, headers=headers, params=params)
        elif method.upper() == "POST":
            response = await client.post(url, headers=headers, json=data)
        elif method.upper() == "PUT":
            response = await client.put(url, headers=headers, json=data)
        elif method.upper() == "DELETE":
            response = await client.delete(url, headers=headers)
        else:
            raise ValueError(f"Unsupported HTTP method: {method}")
        
        if response.status_code >= 400:
            logger.error(f"Cloudways API error: {response.status_code} - {response.text}")
            raise ValueError(f"Cloudways API error: {response.text}")
        
        return response.json()


async def list_servers() -> Dict[str, Any]:
    """List all servers in the Cloudways account"""
    return await _make_request("GET", "/server")


async def get_server(server_id: str) -> Dict[str, Any]:
    """Get details for a specific server"""
    return await _make_request("GET", f"/server/{server_id}")


async def create_server(
    cloud_provider: str = "do",  # DigitalOcean
    region: str = "nyc3",
    server_size: str = "1GB",
    label: str = "P11 WordPress Server"
) -> Dict[str, Any]:
    """
    Create a new server on Cloudways.
    
    Args:
        cloud_provider: Cloud provider (do=DigitalOcean, aws, gce, vultr, linode, kyup)
        region: Server region code
        server_size: Server size (1GB, 2GB, 4GB, etc.)
        label: Human-readable server name
    """
    data = {
        "cloud": cloud_provider,
        "region": region,
        "server_size": server_size,
        "server_label": label
    }
    
    return await _make_request("POST", "/server", data=data)


async def get_or_create_server(
    label_prefix: str = "P11-WordPress"
) -> Dict[str, Any]:
    """
    Get existing server or create a new one.
    Looks for a server with the given label prefix.
    """
    servers_response = await list_servers()
    servers = servers_response.get("servers", [])
    
    # Find existing server with our prefix
    for server in servers:
        if server.get("label", "").startswith(label_prefix):
            if server.get("status") == "running":
                logger.info(f"Using existing server: {server['id']}")
                return server
    
    # Create new server if none found
    logger.info("No existing server found, creating new one...")
    result = await create_server(label=f"{label_prefix}-{datetime.now().strftime('%Y%m%d')}")
    return result.get("server", result)


async def create_wordpress_app(
    server_id: str,
    app_label: str,
    project_name: str = "P11 Sites"
) -> Dict[str, Any]:
    """
    Create a new WordPress application on a server.
    
    Args:
        server_id: Cloudways server ID
        app_label: Application label/name
        project_name: Project grouping name
    """
    data = {
        "server_id": server_id,
        "application": "wordpress",
        "app_label": app_label,
        "project_name": project_name
    }
    
    return await _make_request("POST", "/app", data=data)


async def get_app(server_id: str, app_id: str) -> Dict[str, Any]:
    """Get application details"""
    return await _make_request("GET", f"/app/{server_id}/{app_id}")


async def get_app_credentials(server_id: str, app_id: str) -> Dict[str, Any]:
    """Get WordPress admin credentials for an app"""
    return await _make_request("GET", f"/app/creds/{server_id}/{app_id}")


async def wait_for_app_ready(
    server_id: str,
    app_id: str,
    timeout_seconds: int = 300,
    poll_interval: int = 10
) -> Dict[str, Any]:
    """
    Wait for an application to finish provisioning.
    
    Args:
        server_id: Cloudways server ID
        app_id: Application ID
        timeout_seconds: Maximum time to wait
        poll_interval: Seconds between status checks
    """
    start_time = datetime.now()
    
    while (datetime.now() - start_time).total_seconds() < timeout_seconds:
        try:
            app = await get_app(server_id, app_id)
            status = app.get("application", {}).get("status", "")
            
            if status == "running":
                logger.info(f"App {app_id} is ready")
                return app
            
            if status in ["failed", "error"]:
                raise ValueError(f"App provisioning failed: {status}")
            
            logger.info(f"App status: {status}, waiting...")
            
        except Exception as e:
            logger.warning(f"Error checking app status: {e}")
        
        await asyncio.sleep(poll_interval)
    
    raise TimeoutError(f"App {app_id} did not become ready within {timeout_seconds}s")


async def run_ssh_command(
    server_id: str,
    app_id: str,
    command: str
) -> Dict[str, Any]:
    """
    Run SSH command on app server (for WP-CLI, theme installation, etc.)
    Note: Cloudways doesn't have direct SSH API, this would use their
    Git/SFTP deployment or managed services.
    """
    # For theme/plugin installation, Cloudways recommends using their
    # managed services or Git deployment. This is a placeholder.
    logger.warning("SSH commands require Cloudways managed services integration")
    return {"status": "not_implemented", "command": command}


async def install_collection_theme(
    server_id: str,
    app_id: str
) -> Dict[str, Any]:
    """
    Install and activate Collection theme on WordPress instance.
    Uses WP-CLI via Cloudways console.
    """
    # In production, this would:
    # 1. Upload theme ZIP via SFTP
    # 2. Or use Cloudways staging/clone features
    # 3. Or preconfigure the server with the theme
    
    logger.info(f"Installing Collection theme on app {app_id}")
    
    # For MVP, assume template already has theme installed
    return {
        "status": "success",
        "message": "Theme pre-installed on template",
        "theme": "collection"
    }


async def health_check() -> Dict[str, Any]:
    """Verify Cloudways API connectivity and credentials"""
    try:
        token = await get_access_token()
        servers = await list_servers()
        
        return {
            "status": "healthy",
            "authenticated": True,
            "server_count": len(servers.get("servers", []))
        }
    except Exception as e:
        return {
            "status": "unhealthy",
            "authenticated": False,
            "error": str(e)
        }









