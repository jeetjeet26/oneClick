"""Quick test for Meta Ads MCP tools."""
import asyncio
import sys
sys.path.insert(0, 'meta-ads')

from meta_ads.config import is_configured
from meta_ads.client import MetaAdsClient

async def main():
    print("Testing Meta Ads MCP Server\n")
    print("="*50)
    
    if not is_configured():
        print("❌ Not configured. Check environment variables.")
        print("\nRequired:")
        print("  - META_ACCESS_TOKEN")
        print("  - META_AD_ACCOUNT_ID")
        return
    
    print("✅ Configuration OK\n")
    
    try:
        client = MetaAdsClient()
        
        print("Testing get_ad_accounts...")
        accounts = await client.get_ad_accounts()
        print(f"✅ Found {len(accounts)} accounts")
        for acc in accounts[:3]:
            print(f"  - {acc['name']} ({acc['id']})")
        
        if accounts:
            print("\nTesting get_campaigns...")
            account_id = accounts[0]['id'].replace('act_', '')
            campaigns = await client.get_campaigns(account_id=account_id, limit=5)
            print(f"✅ Found {len(campaigns)} campaigns")
            for camp in campaigns[:3]:
                print(f"  - {camp['name']} (Status: {camp['status']})")
        
        print("\n" + "="*50)
        print("✅ All tests passed!")
        
    except Exception as e:
        print(f"\n❌ Error: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(main())












