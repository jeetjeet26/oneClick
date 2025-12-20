"""WordPress MCP Server Configuration"""
import os
from typing import Optional

# Cloudways API Configuration
CLOUDWAYS_API_KEY = os.getenv('CLOUDWAYS_API_KEY', '')
CLOUDWAYS_EMAIL = os.getenv('CLOUDWAYS_EMAIL', '')
CLOUDWAYS_API_URL = 'https://api.cloudways.com/api/v1'

# Template WordPress Instance (for capability discovery)
TEMPLATE_INSTANCE_ID = os.getenv('WP_TEMPLATE_INSTANCE_ID', 'template-collection-theme')
TEMPLATE_WP_URL = os.getenv('WP_TEMPLATE_URL', 'https://template.p11sites.com')
TEMPLATE_WP_USERNAME = os.getenv('WP_TEMPLATE_USERNAME', 'admin')
TEMPLATE_WP_PASSWORD = os.getenv('WP_TEMPLATE_PASSWORD', '')

# Supabase (for property context and caching)
SUPABASE_URL = os.getenv('SUPABASE_URL', '')
SUPABASE_SERVICE_KEY = os.getenv('SUPABASE_SERVICE_KEY', '')

# Cache duration for capabilities (24 hours)
CACHE_DURATION_SECONDS = 24 * 60 * 60

def is_configured() -> bool:
    """Check if WordPress MCP is properly configured"""
    return bool(
        CLOUDWAYS_API_KEY and
        CLOUDWAYS_EMAIL and
        TEMPLATE_WP_URL and
        TEMPLATE_WP_PASSWORD
    )

def get_template_credentials() -> dict:
    """Get template instance credentials"""
    return {
        'url': TEMPLATE_WP_URL,
        'username': TEMPLATE_WP_USERNAME,
        'password': TEMPLATE_WP_PASSWORD
    }






