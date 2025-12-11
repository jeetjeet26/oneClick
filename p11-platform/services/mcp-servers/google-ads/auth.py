"""Authentication utilities for Google Ads API."""
from google.ads.googleads.client import GoogleAdsClient
from typing import Optional
from .config import get_google_ads_config, GOOGLE_ADS_CUSTOMER_ID

_client: Optional[GoogleAdsClient] = None

def get_client() -> GoogleAdsClient:
    """Get or create Google Ads client singleton."""
    global _client
    if _client is None:
        config = get_google_ads_config()
        _client = GoogleAdsClient.load_from_dict(config)
    return _client

def get_mcc_id() -> str:
    """Get the MCC (Manager) account ID."""
    return GOOGLE_ADS_CUSTOMER_ID

def format_customer_id(customer_id: str) -> str:
    """Format customer ID with dashes (123-456-7890)."""
    clean = customer_id.replace("-", "")
    if len(clean) != 10:
        return customer_id
    return f"{clean[:3]}-{clean[3:6]}-{clean[6:]}"

def clean_customer_id(customer_id: str) -> str:
    """Remove dashes from customer ID."""
    return customer_id.replace("-", "")





