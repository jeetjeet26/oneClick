# MCP Ads Integration - Complete Setup Guide

✅ **Migrations Applied Successfully via Supabase MCP!**

---

## 🎯 What You Just Got

### **Store + Sync Method** (Hybrid Approach)

```
Scheduled Sync (or "Sync Now" button)
  ↓
MCP tools query Google/Meta APIs
  ↓
Data stored in fact_marketing_performance table
  ↓
Dashboard queries database (instant, historical)
```

**Why this approach?**
- ✅ **Historical trends** - "Last month vs this month"
- ✅ **Fast dashboards** - Query DB, not APIs
- ✅ **No rate limits** - Sync once, query many times
- ✅ **Aggregations** - Complex queries across time periods

---

## 📋 Complete Setup Steps

### **Step 1: ✅ Database Setup** (DONE!)

Migrations applied:
- ✅ `mcp_audit_log` table created
- ✅ Helper functions created
- ✅ Indexes created
- ✅ RLS policies applied

### **Step 2: Link Properties to Ad Accounts** (5 minutes)

```sql
-- Get your property IDs
SELECT id, name FROM properties;

-- Link property to Google Ads
SELECT link_property_to_google_ads(
  'Sunset Apartments',  -- Property name
  '1630505086'          -- Google Ads customer ID
);

-- Link property to Meta Ads
SELECT link_property_to_meta_ads(
  'Sunset Apartments',  -- Property name
  '100422547226422'     -- Meta Ads account ID (from your .env.local)
);

-- Link both for same property
SELECT link_property_to_google_ads('Marina View', '1630505086');
SELECT link_property_to_meta_ads('Marina View', '100422547226422');
```

**Verify connections**:
```sql
-- View all connected properties
SELECT * FROM vw_property_marketing_setup;
```

### **Step 3: Set Up Python Virtual Environments** (10 minutes)

```powershell
# Google Ads MCP
cd p11-platform/services/mcp-servers/google-ads
python -m venv venv
.\venv\Scripts\activate
pip install -r requirements.txt

# Meta Ads MCP
cd ../meta-ads
python -m venv venv
.\venv\Scripts\activate
pip install -r requirements.txt

# Deactivate when done
deactivate
```

### **Step 4: Test MCP Sync** (5 minutes)

```powershell
cd p11-platform/services/data-engine

# Make sure MCP servers are in Python path
$env:PYTHONPATH = "C:\Users\jasji\projects\oneClick\p11-platform\services"

# Run sync for all properties
python -m pipelines.mcp_marketing_sync --all --date-range LAST_7_DAYS
```

**Expected output**:
```
Starting sync for all properties
Starting sync for property abc-123-...
Syncing Google Ads for account 1630505086
Syncing Meta Ads for account 100422547226422
Upserting 25 records to fact_marketing_performance
Sync complete for all properties
```

**Verify data was stored**:
```sql
SELECT 
  property_id,
  channel_id,
  campaign_name,
  date,
  spend,
  clicks,
  impressions,
  conversions
FROM fact_marketing_performance
ORDER BY date DESC, spend DESC
LIMIT 20;
```

### **Step 5: Test API Endpoint** (2 minutes)

```bash
# Get a property ID from your database
# Then test the API:
curl "http://localhost:3000/api/marketvision/YOUR-PROPERTY-ID?dateRange=30d&channels=google_ads,meta_ads"
```

**Expected response**:
```json
{
  "property": {
    "id": "abc-123",
    "name": "Sunset Apartments",
    "google_ads_account": "1630505086",
    "meta_ads_account": "100422547226422"
  },
  "date_range": {
    "start": "2024-11-10",
    "end": "2024-12-10",
    "days": 30
  },
  "channels": [
    {
      "channel": "google_ads",
      "spend": 1234.56,
      "clicks": 890,
      "impressions": 12000,
      "conversions": 45,
      "campaign_count": 5
    },
    {
      "channel": "meta_ads",
      "spend": 987.65,
      "clicks": 567,
      "impressions": 8900,
      "conversions": 23,
      "campaign_count": 3
    }
  ],
  "campaigns": [...],
  "totals": {...}
}
```

### **Step 6: Add to Dashboard** (5 minutes)

Create a new page or add to existing:

```tsx
// app/dashboard/marketvision/page.tsx
import { createClient } from '@/utils/supabase/server';
import PropertyMarketingDashboard from '@/components/marketvision/PropertyMarketingDashboard';

export default async function MarketVisionPage() {
  const supabase = createClient();
  
  // Get first property for demo (or let user select)
  const { data: properties } = await supabase
    .from('properties')
    .select('id, name')
    .limit(1)
    .single();
  
  if (!properties) {
    return <div>No properties found</div>;
  }
  
  return (
    <div className="container mx-auto p-8">
      <PropertyMarketingDashboard
        propertyId={properties.id}
        propertyName={properties.name}
      />
    </div>
  );
}
```

### **Step 7: Schedule Automatic Syncs** (Optional)

#### **Option A: Windows Task Scheduler**
```powershell
# Create a batch file: sync-marketing.bat
@echo off
cd C:\Users\jasji\projects\oneClick\p11-platform\services\data-engine
call venv\Scripts\activate.bat
python -m pipelines.mcp_marketing_sync --all --date-range YESTERDAY
```

Then schedule in Task Scheduler to run daily at 2 AM.

#### **Option B: Supabase pg_cron** (Recommended)
```sql
-- Schedule daily sync at 2 AM UTC
SELECT cron.schedule(
  'sync-marketing-data-daily',
  '0 2 * * *',
  $$
  SELECT net.http_post(
    'http://localhost:8000/sync-all-properties',
    '{"date_range": "YESTERDAY"}'::jsonb,
    headers := '{"Authorization": "Bearer a7f3c8e9d4b2f1a8c6e5d9b7a4f2c1e8d5b9a6f3c2e1d8b5a7f4c9e6d3b1a8f5", "Content-Type": "application/json"}'::jsonb
  );
  $$
);
```

---

## 🎨 How to Specify What Data to Pull

### **1. Property Level (Which accounts)**
```sql
-- Each property can have multiple ad account connections
SELECT link_property_to_google_ads('Property 1', 'account-123');
SELECT link_property_to_meta_ads('Property 1', 'account-456');

-- Multiple accounts per property possible
SELECT link_property_to_google_ads('Property 1', 'account-789');
```

### **2. Dashboard Level (Date range & channels)**
```typescript
// User controls via UI
<PropertyMarketingDashboard
  propertyId="abc-123"
  propertyName="Sunset Apartments"
/>

// Dropdown selections:
// - Date Range: 7d, 30d, 90d
// - Channels: Google Ads, Meta Ads, or both
```

### **3. Campaign Level (Filters)**

**Pull all campaigns** (default):
```python
# In mcp_marketing_sync.py - no filters
campaigns = await get_campaign_performance(customer_id, date_range)
```

**Pull specific campaigns**:
```python
# Filter by name
campaigns = await get_campaign_performance(
    customer_id,
    date_range,
    campaign_name_filter="Leasing"  # Only campaigns with "Leasing" in name
)

# Filter by ID
campaigns = await get_campaign_performance(
    customer_id,
    date_range,
    campaign_id="123456789"  # Specific campaign only
)
```

### **4. Advanced: Property-Specific Config**

Create custom sync rules per property:

```sql
-- Add config column to properties
ALTER TABLE properties ADD COLUMN IF NOT EXISTS marketing_sync_config JSONB DEFAULT '{}';

-- Set custom config
UPDATE properties 
SET marketing_sync_config = '{
  "google_ads": {
    "enabled": true,
    "campaign_filters": ["Leasing", "Brand"],
    "sync_frequency": "daily"
  },
  "meta_ads": {
    "enabled": true,
    "min_spend": 100,
    "exclude_campaigns": ["Test"]
  }
}'
WHERE name = 'Sunset Apartments';
```

Then read in sync script:
```python
# Get property config
prop = self.supabase.table('properties')\
    .select('marketing_sync_config')\
    .eq('id', property_id)\
    .single()\
    .execute()

config = prop.data.get('marketing_sync_config', {})

# Apply filters
if config.get('google_ads', {}).get('campaign_filters'):
    for filter_name in config['google_ads']['campaign_filters']:
        # Sync each filtered campaign set
```

---

## 🔍 Monitoring & Debugging

### **Check What Data is Being Pulled**:
```sql
-- See latest synced data
SELECT 
  p.name AS property,
  fmp.channel_id AS channel,
  fmp.campaign_name,
  fmp.date,
  fmp.spend,
  fmp.clicks,
  fmp.impressions,
  fmp.conversions
FROM fact_marketing_performance fmp
JOIN properties p ON p.id = fmp.property_id
WHERE fmp.created_at > NOW() - INTERVAL '24 hours'
ORDER BY fmp.date DESC, fmp.spend DESC;
```

### **Check Audit Logs**:
```sql
-- See MCP operations
SELECT 
  platform,
  tool_name,
  success,
  error_message,
  created_at
FROM mcp_audit_log
ORDER BY created_at DESC
LIMIT 20;
```

### **Check Property Connections**:
```sql
-- Easy view of all property marketing setups
SELECT * FROM vw_property_marketing_setup;
```

---

## 🚀 Quick Test Flow

### **1. Link a Property** (Run in Supabase SQL Editor)
```sql
-- Get property ID
SELECT id, name FROM properties LIMIT 5;

-- Link to Google Ads
SELECT link_property_to_google_ads('YOUR_PROPERTY_NAME', '1630505086');

-- Link to Meta Ads
SELECT link_property_to_meta_ads('YOUR_PROPERTY_NAME', '100422547226422');

-- Verify
SELECT * FROM vw_property_marketing_setup;
```

### **2. Run Sync**
```powershell
cd p11-platform/services/data-engine
python -m pipelines.mcp_marketing_sync --all
```

### **3. Check Data**
```sql
SELECT COUNT(*), channel_id, SUM(spend) 
FROM fact_marketing_performance 
GROUP BY channel_id;
```

### **4. Test Dashboard**
Navigate to: `http://localhost:3000/dashboard/marketvision`

---

## 💡 FAQ

### **Q: Does it pull ALL campaigns for a property?**
**A:** YES! By default, it pulls all campaigns from all linked ad accounts. You can filter by:
- Campaign ID
- Campaign name substring
- Date range
- Channel (Google/Meta)

### **Q: Is the data live or historical?**
**A:** **Historical from database** (fast, reliable). 
- Click "Sync Now" button to refresh from APIs
- Scheduled sync runs automatically (daily)

### **Q: Can I have multiple properties share one ad account?**
**A:** YES! Multiple properties can link to the same account:
```sql
SELECT link_property_to_google_ads('Property A', '1630505086');
SELECT link_property_to_google_ads('Property B', '1630505086');
```

### **Q: Can one property have multiple ad accounts?**
**A:** YES! The existing schema supports it:
```sql
SELECT link_property_to_google_ads('Property A', 'account-1');
SELECT link_property_to_google_ads('Property A', 'account-2');
```

---

## ✅ Summary

**The migration creates**:
- ✅ `mcp_audit_log` table - Tracks MCP operations
- ✅ Helper functions - Easy property linking
- ✅ View - `vw_property_marketing_setup` for monitoring

**It uses your EXISTING**:
- ✅ `ad_account_connections` table (already has platform/account_id columns)
- ✅ `fact_marketing_performance` table (stores campaign data)
- ✅ `properties` table (your multi-tenant structure)

**Data flow**:
1. Link properties to ad accounts (SQL functions)
2. Run sync (pulls via MCP, stores in DB)
3. Dashboard queries DB (fast, historical)
4. Optional: "Sync Now" for real-time refresh

**All campaigns** for linked accounts are pulled by default. Filter via:
- Date range (UI)
- Channels (UI)
- Campaign name/ID (code customization)

---

**Next**: Run Steps 2-4 to link properties and test sync! 🚀





