"""GAQL query execution tools."""
from typing import Any
from ..auth import get_client, get_mcc_id, clean_customer_id

# Disallowed keywords for safety (READ-only)
WRITE_KEYWORDS = ["INSERT", "UPDATE", "DELETE", "CREATE", "DROP", "MUTATE"]

def validate_query(query: str) -> tuple[bool, str]:
    """Validate that a query is read-only."""
    upper_query = query.upper()
    for keyword in WRITE_KEYWORDS:
        if keyword in upper_query:
            return False, f"Write operations not allowed. Found: {keyword}"
    
    if not upper_query.strip().startswith("SELECT"):
        return False, "Query must start with SELECT"
    
    return True, ""

async def execute_gaql_query(
    customer_id: str,
    query: str,
    limit: int = 100
) -> list[dict[str, Any]]:
    """
    Execute a GAQL (Google Ads Query Language) query.
    
    Args:
        customer_id: Google Ads customer ID (format: 123-456-7890)
        query: GAQL SELECT query
        limit: Maximum rows to return (default: 100)
    
    Returns:
        List of result rows as dictionaries.
    
    Example queries:
        - SELECT campaign.name, metrics.clicks FROM campaign
        - SELECT ad_group.name, metrics.impressions FROM ad_group WHERE campaign.id = 123
    """
    # Validate query is read-only
    is_valid, error = validate_query(query)
    if not is_valid:
        return [{"error": error}]
    
    # Add LIMIT if not present
    if "LIMIT" not in query.upper():
        query = f"{query.strip()} LIMIT {limit}"
    
    client = get_client()
    mcc_id = get_mcc_id()
    clean_id = clean_customer_id(customer_id)
    
    ga_service = client.get_service("GoogleAdsService")
    
    try:
        response = ga_service.search(
            customer_id=clean_id,
            query=query,
            login_customer_id=mcc_id
        )
        
        results = []
        for row in response:
            # Convert protobuf to dict
            row_dict = {}
            for field in row._pb.DESCRIPTOR.fields:
                value = getattr(row, field.name, None)
                if value is not None:
                    # Handle nested objects
                    if hasattr(value, '_pb'):
                        nested = {}
                        for nested_field in value._pb.DESCRIPTOR.fields:
                            nested_value = getattr(value, nested_field.name, None)
                            if nested_value is not None:
                                nested[nested_field.name] = str(nested_value) if hasattr(nested_value, '_pb') else nested_value
                        row_dict[field.name] = nested
                    else:
                        row_dict[field.name] = value
            results.append(row_dict)
        
        return results
        
    except Exception as e:
        return [{"error": str(e)}]












