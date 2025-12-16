"""Property-context aware wrappers for Google Ads tools."""
import sys
from pathlib import Path
from typing import Optional

# Add shared to path
sys.path.append(str(Path(__file__).parent.parent.parent))
from shared.property_service import resolve_property_to_ad_account
from .performance import get_campaign_performance, get_ad_performance

async def get_property_campaign_performance(
    property_identifier: str,
    date_range: str = "LAST_30_DAYS",
    limit: int = 20,
    campaign_id: Optional[str] = None,
    campaign_name_filter: Optional[str] = None
):
    """
    Get Google Ads campaign performance for a specific property.
    
    Args:
        property_identifier: Property name (e.g., "Sunset Apartments") or ID
        date_range: Date range preset
        limit: Max campaigns to return
        campaign_id: Optional - filter by specific campaign ID
        campaign_name_filter: Optional - filter by campaign name substring
    """
    # Resolve property to ad account
    property_id, customer_id = await resolve_property_to_ad_account(
        property_identifier,
        platform="google_ads"
    )
    
    if not customer_id:
        return {
            "error": f"No Google Ads account found for property: {property_identifier}"
        }
    
    # Fetch performance
    campaigns = await get_campaign_performance(
        customer_id, 
        date_range, 
        limit,
        campaign_id=campaign_id,
        campaign_name_filter=campaign_name_filter
    )
    
    # Add property context to response
    return {
        "property_id": property_id,
        "property_identifier": property_identifier,
        "google_ads_customer_id": customer_id,
        "date_range": date_range,
        "campaigns": campaigns
    }

async def get_property_ad_performance(
    property_identifier: str,
    campaign_id: Optional[str] = None,
    date_range: str = "LAST_30_DAYS",
    limit: int = 50
):
    """Get ad-level performance for a property's Google Ads account."""
    property_id, customer_id = await resolve_property_to_ad_account(
        property_identifier,
        platform="google_ads"
    )
    
    if not customer_id:
        return {"error": f"No Google Ads account found for property: {property_identifier}"}
    
    ads = await get_ad_performance(customer_id, campaign_id, date_range, limit)
    
    return {
        "property_id": property_id,
        "property_identifier": property_identifier,
        "google_ads_customer_id": customer_id,
        "ads": ads
    }












