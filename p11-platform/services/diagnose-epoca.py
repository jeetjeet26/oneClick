"""
Diagnostic script to check Epoca marketing data import setup.
Run this to see exactly what's working and what's not.
"""
import sys
import os
from pathlib import Path

# Add parent dirs to path
sys.path.insert(0, str(Path(__file__).parent / "data-engine"))
sys.path.insert(0, str(Path(__file__).parent / "mcp-servers"))

print("="*60)
print("🔍 EPOCA MARKETING DATA DIAGNOSTIC")
print("="*60)
print()

# Test 1: Environment variables
print("1️⃣  Checking environment variables...")
meta_token = os.environ.get("META_ACCESS_TOKEN")
meta_account = os.environ.get("META_AD_ACCOUNT_ID")
supabase_url = os.environ.get("SUPABASE_URL") or os.environ.get("NEXT_PUBLIC_SUPABASE_URL")
supabase_key = os.environ.get("SUPABASE_SERVICE_KEY") or os.environ.get("SUPABASE_SERVICE_ROLE_KEY")

if meta_token:
    print(f"   ✅ META_ACCESS_TOKEN: {meta_token[:20]}...")
else:
    print("   ❌ META_ACCESS_TOKEN: Not set")

if meta_account:
    print(f"   ✅ META_AD_ACCOUNT_ID: {meta_account}")
else:
    print("   ❌ META_AD_ACCOUNT_ID: Not set")

if supabase_url:
    print(f"   ✅ SUPABASE_URL: {supabase_url}")
else:
    print("   ❌ SUPABASE_URL: Not set")

print()

# Test 2: Database connection
print("2️⃣  Testing Supabase connection...")
try:
    from data_engine.utils.supabase_client import get_supabase_client
    supabase = get_supabase_client()
    result = supabase.table('properties').select('id, name').ilike('name', '%epoca%').execute()
    
    if result.data:
        epoca_property = result.data[0]
        print(f"   ✅ Found Epoca property: {epoca_property['name']}")
        print(f"   ✅ Property ID: {epoca_property['id']}")
        epoca_id = epoca_property['id']
    else:
        print("   ❌ Epoca property not found")
        epoca_id = None
except Exception as e:
    print(f"   ❌ Database connection failed: {e}")
    epoca_id = None

print()

# Test 3: Ad account connection
if epoca_id:
    print("3️⃣  Checking ad account connections...")
    try:
        result = supabase.table('ad_account_connections')\
            .select('*')\
            .eq('property_id', epoca_id)\
            .execute()
        
        if result.data:
            for conn in result.data:
                status = "✅" if conn['is_active'] else "⏸️"
                print(f"   {status} {conn['platform']}: {conn['account_id']}")
                if conn.get('last_imported_at'):
                    print(f"      Last imported: {conn['last_imported_at']}")
                else:
                    print(f"      ⚠️  Never imported")
        else:
            print("   ❌ No ad accounts linked to Epoca")
    except Exception as e:
        print(f"   ❌ Error checking connections: {e}")
    
    print()
    
    # Test 4: Check for data in database
    print("4️⃣  Checking fact_marketing_performance table...")
    try:
        result = supabase.table('fact_marketing_performance')\
            .select('*', count='exact')\
            .eq('property_id', epoca_id)\
            .execute()
        
        row_count = result.count or 0
        
        if row_count > 0:
            print(f"   ✅ Found {row_count} rows of marketing data")
            
            # Show sample
            if result.data and len(result.data) > 0:
                sample = result.data[0]
                print(f"   📊 Sample: {sample.get('campaign_name')} - ${sample.get('spend', 0)}")
        else:
            print("   ❌ No marketing data found for Epoca")
            print("   ⚠️  This is the problem! Run import sync first.")
    except Exception as e:
        print(f"   ❌ Error checking data: {e}")
    
    print()
    
    # Test 5: Check import history
    print("5️⃣  Checking import history...")
    try:
        result = supabase.table('import_jobs')\
            .select('*')\
            .eq('property_id', epoca_id)\
            .order('created_at', desc=True)\
            .limit(3)\
            .execute()
        
        if result.data:
            for job in result.data:
                status_icon = {
                    'complete': '✅',
                    'failed': '❌',
                    'running': '🔄',
                    'pending': '⏸️'
                }.get(job['status'], '❓')
                
                print(f"   {status_icon} {job['status'].upper()}: {job.get('records_imported', 0)} records")
                print(f"      {job['created_at']}")
                if job.get('error_message'):
                    print(f"      Error: {job['error_message']}")
        else:
            print("   ⚠️  No import history (import hasn't been triggered)")
    except Exception as e:
        print(f"   ❌ Error checking history: {e}")

print()
print("="*60)
print("🎯 DIAGNOSIS COMPLETE")
print("="*60)
print()

# Recommendations
if not meta_token:
    print("❌ ACTION REQUIRED: Set META_ACCESS_TOKEN in .env.local")
elif not epoca_id:
    print("❌ ACTION REQUIRED: Create Epoca property in database")
elif not result.data:  # No ad connection
    print("❌ ACTION REQUIRED: Link Meta account to Epoca in Settings")
else:
    # Check if data exists
    try:
        data_check = supabase.table('fact_marketing_performance')\
            .select('*', count='exact')\
            .eq('property_id', epoca_id)\
            .execute()
        
        if (data_check.count or 0) == 0:
            print("🚀 ACTION REQUIRED: Run import to get data")
            print()
            print("   Run this command:")
            print(f"   python -m pipelines.mcp_marketing_sync --property-id {epoca_id}")
            print()
            print("   Or click 'Import Latest Data' in dashboard")
        else:
            print("✅ Everything looks good!")
            print()
            print("   If data still flashes:")
            print("   1. Open browser DevTools (F12)")
            print("   2. Go to Console tab")
            print("   3. Refresh dashboard")
            print("   4. Look for error messages")
            print()
            print("   Or check Network tab for API response")
    except:
        pass

print()

