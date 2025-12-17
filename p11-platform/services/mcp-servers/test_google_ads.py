"""Quick test for Google Ads MCP tools."""
import asyncio
import sys
sys.path.insert(0, 'google-ads')

from google_ads.config import is_configured
from google_ads.tools.accounts import list_accounts
from google_ads.tools.performance import get_campaign_performance

async def main():
    print("Testing Google Ads MCP Server\n")
    print("="*50)
    
    if not is_configured():
        print("❌ Not configured. Check environment variables.")
        print("\nRequired:")
        print("  - GOOGLE_ADS_CUSTOMER_ID")
        print("  - GOOGLE_ADS_DEVELOPER_TOKEN")
        print("  - GOOGLE_ADS_REFRESH_TOKEN")
        print("  - GOOGLE_ADS_CLIENT_ID")
        print("  - GOOGLE_ADS_CLIENT_SECRET")
        return
    
    print("✅ Configuration OK\n")
    
    try:
        print("Testing list_accounts...")
        accounts = await list_accounts()
        print(f"✅ Found {len(accounts)} accounts")
        for acc in accounts[:3]:
            print(f"  - {acc['name']} ({acc['id']})")
        
        if accounts:
            print("\nTesting get_campaign_performance...")
            customer_id = accounts[0]['id']
            campaigns = await get_campaign_performance(customer_id, "LAST_7_DAYS", 5)
            print(f"✅ Found {len(campaigns)} campaigns")
            for camp in campaigns[:3]:
                print(f"  - {camp['name']}: {camp['spend_formatted']}")
        
        print("\n" + "="*50)
        print("✅ All tests passed!")
        
    except Exception as e:
        print(f"\n❌ Error: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(main())














