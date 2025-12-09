import os
import sys
from typing import List, Dict, Any

# Load environment from root .env before anything else
from utils.config import TARGET_PROPERTY_ID
from utils.google_normalization import normalize_google_data
from utils.supabase_client import get_supabase

# Try importing official library, usually installed via `pip install google-ads`
# If not present, we will fallback or fail.
try:
    from google.ads.googleads.client import GoogleAdsClient
except ImportError:
    print("Error: 'google-ads' library not found. Install it via `pip install google-ads`")
    sys.exit(1)

def fetch_google_data(customer_id: str, client_config: Dict) -> List[Dict[str, Any]]:
    """
    Fetches Campaign performance via GAQL.
    """
    client = GoogleAdsClient.load_from_dict(client_config)
    ga_service = client.get_service("GoogleAdsService")

    # GAQL Query
    query = """
        SELECT 
            segments.date,
            campaign.id, 
            campaign.name, 
            metrics.impressions, 
            metrics.clicks, 
            metrics.cost_micros, 
            metrics.conversions 
        FROM campaign 
        WHERE segments.date DURING YESTERDAY
    """
    
    stream = ga_service.search_stream(customer_id=customer_id, query=query)
    
    results = []
    for batch in stream:
        for row in batch.results:
            # Flatten protobuf object to dict
            item = {
                "date": row.segments.date,
                "campaign.id": str(row.campaign.id),
                "campaign.name": row.campaign.name,
                "metrics.impressions": row.metrics.impressions,
                "metrics.clicks": row.metrics.clicks,
                "metrics.cost_micros": row.metrics.cost_micros,
                "metrics.conversions": row.metrics.conversions
            }
            results.append(item)
            
    return results

def run_pipeline():
    print("Starting Real Google Ads Pipeline...")
    
    # 1. Config
    CUSTOMER_ID = os.environ.get("GOOGLE_ADS_CUSTOMER_ID") # e.g. "123-456-7890"
    DEVELOPER_TOKEN = os.environ.get("GOOGLE_ADS_DEVELOPER_TOKEN")
    REFRESH_TOKEN = os.environ.get("GOOGLE_ADS_REFRESH_TOKEN")
    CLIENT_ID = os.environ.get("GOOGLE_ADS_CLIENT_ID")
    CLIENT_SECRET = os.environ.get("GOOGLE_ADS_CLIENT_SECRET")
    PROPERTY_ID = os.environ.get("TARGET_PROPERTY_ID")

    if not all([CUSTOMER_ID, DEVELOPER_TOKEN, REFRESH_TOKEN, CLIENT_ID, CLIENT_SECRET]):
        print("Skipping: Missing Google Ads credentials in env.")
        return

    # Client Config Dict for the library
    config = {
        "developer_token": DEVELOPER_TOKEN,
        "refresh_token": REFRESH_TOKEN,
        "client_id": CLIENT_ID,
        "client_secret": CLIENT_SECRET,
        "use_proto_plus": True
    }

    # 2. Fetch
    try:
        raw_data = fetch_google_data(CUSTOMER_ID.replace("-", ""), config)
        print(f"Fetched {len(raw_data)} records from Google Ads API.")
    except Exception as e:
        print(f"Failed to fetch data: {e}")
        return

    # 3. Normalize
    if not raw_data:
        print("No data returned.")
        return

    df = normalize_google_data(raw_data)
    
    if PROPERTY_ID:
        df['property_id'] = PROPERTY_ID
        
    print("Data normalized.")
    
    # 4. Load
    supabase = get_supabase()
    records = df.to_dict(orient='records')
    
    try:
        response = supabase.table('fact_marketing_performance').upsert(
            records, on_conflict="date, property_id, campaign_id"
        ).execute()
        print(f"Successfully loaded {len(records)} rows to Supabase.")
    except Exception as e:
        print(f"Database Load Error: {e}")

if __name__ == "__main__":
    run_pipeline()
