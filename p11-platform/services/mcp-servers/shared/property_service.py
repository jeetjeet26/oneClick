"""Property-context service for MCP tools."""
from typing import Optional, Tuple
from .supabase_client import get_supabase

async def get_property_by_name(property_name: str) -> Optional[dict]:
    """Look up property by name."""
    supabase = get_supabase()
    result = supabase.table('properties')\
        .select('id, name, org_id')\
        .ilike('name', f'%{property_name}%')\
        .limit(1)\
        .execute()
    
    return result.data[0] if result.data else None

async def get_ad_account_for_property(
    property_id: str,
    platform: str  # 'google_ads' or 'meta_ads'
) -> Optional[str]:
    """Get the ad account ID linked to a property."""
    supabase = get_supabase()
    
    field_map = {
        'google_ads': 'google_ads_customer_id',
        'meta_ads': 'meta_ad_account_id'
    }
    
    result = supabase.table('ad_account_connections')\
        .select(field_map[platform])\
        .eq('property_id', property_id)\
        .limit(1)\
        .execute()
    
    if result.data:
        return result.data[0].get(field_map[platform])
    return None

async def get_properties_for_org(org_id: str) -> list[dict]:
    """Get all properties in an organization."""
    supabase = get_supabase()
    result = supabase.table('properties')\
        .select('id, name')\
        .eq('org_id', org_id)\
        .execute()
    
    return result.data or []

async def resolve_property_to_ad_account(
    property_identifier: str,  # Can be name or ID
    platform: str
) -> Tuple[Optional[str], Optional[str]]:
    """
    Resolve a property name/ID to an ad account ID.
    
    Returns: (property_id, ad_account_id)
    """
    # Try as UUID first
    if len(property_identifier) == 36 and '-' in property_identifier:
        property_id = property_identifier
    else:
        # Look up by name
        prop = await get_property_by_name(property_identifier)
        if not prop:
            return None, None
        property_id = prop['id']
    
    # Get ad account
    ad_account_id = await get_ad_account_for_property(property_id, platform)
    
    return property_id, ad_account_id















