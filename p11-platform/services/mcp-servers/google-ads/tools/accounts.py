"""Account-related tools for Google Ads MCP."""
from typing import Any
from ..auth import get_client, get_mcc_id, format_customer_id

async def list_accounts() -> list[dict[str, Any]]:
    """
    List all Google Ads accounts accessible via the MCC.
    
    Returns:
        List of accounts with id, name, currency, and status.
    """
    client = get_client()
    mcc_id = get_mcc_id()
    
    # First, get accessible customer IDs
    customer_service = client.get_service("CustomerService")
    accessible = customer_service.list_accessible_customers()
    
    accounts = []
    ga_service = client.get_service("GoogleAdsService")
    
    for resource_name in accessible.resource_names:
        customer_id = resource_name.replace("customers/", "")
        
        try:
            query = """
                SELECT 
                    customer.id,
                    customer.descriptive_name,
                    customer.currency_code,
                    customer.time_zone,
                    customer.manager,
                    customer.test_account,
                    customer.status
                FROM customer
                LIMIT 1
            """
            
            response = ga_service.search(
                customer_id=customer_id,
                query=query,
                login_customer_id=mcc_id
            )
            
            for row in response:
                if not row.customer.manager:  # Skip manager accounts
                    accounts.append({
                        "id": format_customer_id(str(row.customer.id)),
                        "name": row.customer.descriptive_name,
                        "currency": row.customer.currency_code,
                        "timezone": row.customer.time_zone,
                        "is_test": row.customer.test_account,
                        "status": row.customer.status.name,
                    })
        except Exception:
            # Some accounts may not be accessible
            continue
    
    return accounts

async def get_account_info(customer_id: str) -> dict[str, Any]:
    """
    Get detailed information about a specific account.
    
    Args:
        customer_id: Google Ads customer ID (format: 123-456-7890)
    
    Returns:
        Account details including billing, settings, and access level.
    """
    client = get_client()
    mcc_id = get_mcc_id()
    clean_id = customer_id.replace("-", "")
    
    query = """
        SELECT 
            customer.id,
            customer.descriptive_name,
            customer.currency_code,
            customer.time_zone,
            customer.auto_tagging_enabled,
            customer.has_partners_badge,
            customer.optimization_score,
            customer.optimization_score_weight
        FROM customer
        LIMIT 1
    """
    
    ga_service = client.get_service("GoogleAdsService")
    response = ga_service.search(
        customer_id=clean_id,
        query=query,
        login_customer_id=mcc_id
    )
    
    for row in response:
        return {
            "id": format_customer_id(str(row.customer.id)),
            "name": row.customer.descriptive_name,
            "currency": row.customer.currency_code,
            "timezone": row.customer.time_zone,
            "auto_tagging": row.customer.auto_tagging_enabled,
            "partner_badge": row.customer.has_partners_badge,
            "optimization_score": row.customer.optimization_score,
        }
    
    return {"error": "Account not found"}

















