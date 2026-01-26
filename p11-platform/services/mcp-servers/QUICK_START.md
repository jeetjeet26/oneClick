# 🚀 MCP Ads Integration - QUICK START

## ❓ Your Question: "What is the DB migration for?"

### **Simple Answer:**

The migration creates **audit logging** and **helper functions**. It does NOT replace MCP queries.

**Data Flow:**
```
1. MCP tools → Query Google/Meta APIs (live)
2. Sync script → Stores results in database
3. Dashboard → Displays from database (fast!)
```

**Why store it?**
- ✅ Historical trends ("Show last 6 months")
- ✅ Fast dashboards (100ms vs 5 seconds)
- ✅ No rate limits (query DB unlimited times)
- ✅ Complex analytics ("Compare all properties")

---

## ✅ What's Done

✅ **MCP Servers Built** - 30+ files, 7 Google tools, 20+ Meta tools  
✅ **Database Migration Applied** - via Supabase MCP  
✅ **Sync Code Created** - Pulls from APIs, stores in DB  
✅ **API Routes Created** - Serves data to dashboard  
✅ **Dashboard Component Created** - Displays multichannel BI  

---

## 🎯 Next Steps (3 Steps to Working Dashboard)

### **Step 1: Link Properties** (2 min)

Open Supabase SQL Editor:

```sql
-- Get property names
SELECT id, name FROM properties;

-- Link properties (use YOUR property names)
SELECT link_property_to_google_ads('Property Name Here', '1630505086');
SELECT link_property_to_meta_ads('Property Name Here', '100422547226422');

-- Verify
SELECT * FROM vw_property_marketing_setup;
```

### **Step 2: Run First Sync** (5 min)

```powershell
cd p11-platform/services/data-engine
python -m pipelines.mcp_marketing_sync --all
```

**Check it worked**:
```sql
SELECT COUNT(*), channel_id FROM fact_marketing_performance GROUP BY channel_id;
```

### **Step 3: View Dashboard** (1 min)

Add to your app routing, then navigate to the MarketVision page.

---

## 🎨 Controlling What Data Gets Pulled

### **For Each Property:**

**1. Which ad accounts?**
```sql
-- Link in database (Step 1 above)
SELECT link_property_to_google_ads('Property A', 'account-123');
SELECT link_property_to_meta_ads('Property A', 'account-456');
```

**2. Which campaigns?**
- **Default**: ALL campaigns from linked accounts
- **Filter**: Edit `mcp_marketing_sync.py` line 82

```python
# Pull ALL campaigns (default)
campaigns = await get_campaign_performance(customer_id, date_range)

# Or filter by name
campaigns = await get_campaign_performance(
    customer_id, 
    date_range,
    campaign_name_filter="Leasing"  # Only "Leasing" campaigns
)
```

**3. Which date range?**
- **Sync script**: `--date-range LAST_7_DAYS` (or LAST_30_DAYS)
- **Dashboard**: User selects 7d, 30d, or 90d

**4. Which channels?**
- **Sync script**: `--channels google_ads,meta_ads`
- **Dashboard**: User selects via UI

---

## 📊 Example Scenarios

### **Scenario 1: Single Property, All Campaigns**

```sql
-- Setup
SELECT link_property_to_google_ads('Sunset Apartments', '1630505086');
SELECT link_property_to_meta_ads('Sunset Apartments', '100422547226422');
```

```bash
# Sync
python -m pipelines.mcp_marketing_sync --property-id abc-123
```

**Result**: All campaigns from both platforms stored in DB

### **Scenario 2: Multiple Properties, Separate Accounts**

```sql
-- Property 1 → Account A
SELECT link_property_to_google_ads('Property 1', 'account-A');

-- Property 2 → Account B
SELECT link_property_to_google_ads('Property 2', 'account-B');
```

**Result**: Each property only sees their own account's campaigns

### **Scenario 3: One Property, Only Specific Campaigns**

```python
# Edit mcp_marketing_sync.py line 82
campaigns = await get_campaign_performance(
    customer_id,
    date_range,
    campaign_name_filter="Leasing"  # Only pulls "Leasing" campaigns
)
```

**Result**: Only "Leasing" campaigns stored for that property

---

## 🔄 Two Ways to Get Fresh Data

### **Method 1: Scheduled Sync** (Automatic)

```bash
# Cron job runs daily at 2 AM
0 2 * * * cd /path/to/data-engine && python -m pipelines.mcp_marketing_sync --all
```

### **Method 2: On-Demand Sync** (Manual)

```typescript
// User clicks "Sync Now" button in dashboard
<Button onClick={() => fetch('/api/marketvision/123?realtime=true')}>
  Sync Now
</Button>
```

---

## 🎯 What You Asked About

> **"Can it pull all campaigns or specific ones for that property?"**

**YES to both!**

**Pull ALL campaigns** (default):
- Link property to account
- Run sync
- Gets ALL campaigns from that account

**Pull SPECIFIC campaigns**:
- Option 1: Filter by `campaign_id` parameter
- Option 2: Filter by `campaign_name_filter` parameter
- Option 3: Edit sync code to add custom logic

**Example**:
```python
# In mcp_marketing_sync.py

# Scenario A: Pull ALL (default)
campaigns = await get_campaign_performance(customer_id, "LAST_30_DAYS")
# Result: 15 campaigns

# Scenario B: Filter by name
campaigns = await get_campaign_performance(
    customer_id, 
    "LAST_30_DAYS",
    campaign_name_filter="Brand"
)
# Result: 3 campaigns with "Brand" in name

# Scenario C: Single campaign
campaigns = await get_campaign_performance(
    customer_id, 
    "LAST_30_DAYS",
    campaign_id="123456789"
)
# Result: 1 specific campaign
```

---

## 📝 Summary

**The migration creates infrastructure for:**
- Audit logging (track operations)
- Helper functions (easy setup)
- Monitoring views (check status)

**The sync process:**
1. MCP queries live APIs
2. Stores results in database
3. Dashboard displays from database

**You control what gets pulled by:**
1. **Linking** properties to accounts (SQL)
2. **Filtering** campaigns by name/ID (code)
3. **Selecting** date ranges (UI)
4. **Choosing** channels (UI)

**All campaigns** from linked accounts are pulled by default unless you add filters.

---

## 🚀 Ready to Test?

Run these 3 commands:

```sql
-- 1. Link property (Supabase SQL Editor)
SELECT link_property_to_google_ads('Your Property', '1630505086');
SELECT link_property_to_meta_ads('Your Property', '100422547226422');
```

```powershell
# 2. Sync data
cd p11-platform/services/data-engine
python -m pipelines.mcp_marketing_sync --all
```

```sql
-- 3. Check results (Supabase SQL Editor)
SELECT * FROM fact_marketing_performance ORDER BY date DESC LIMIT 10;
```

Done! 🎉





