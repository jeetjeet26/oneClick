# 🚀 Scalable Marketing Data Import System

## ✅ What's Built

A fully automated, one-click import system that:
- ✅ **No manual commands** - Click "Import" button in UI
- ✅ **No venv activation** - Startup scripts handle everything
- ✅ **Incremental syncs** - Only pulls new data since last import
- ✅ **Real-time progress** - Live status updates with progress bar
- ✅ **Import history** - Track all past imports
- ✅ **Auto-scheduling** - Set it and forget it
- ✅ **Multi-property** - Each property manages its own imports

---

## 🎯 User Flow (Property Manager)

```
1. Open MarketVision Dashboard
   ↓
2. Click "Import Latest Data" button
   ↓
3. Watch progress bar (10-30 seconds)
   ↓
4. ✅ "Import complete! 8 records imported"
   ↓
5. Dashboard refreshes with new data
```

**That's it!** No terminal, no Python, no manual commands.

---

## 🏗️ Architecture

```
┌──────────────────────────────────────────────────────┐
│ MarketVision Dashboard (Next.js)                      │
│  [Import Latest Data] button                          │
│  Progress: ━━━━━━━━━━━━━ 65% "Syncing Meta Ads..."  │
└────────────────┬─────────────────────────────────────┘
                 │ POST /api/marketvision/import
                 ▼
┌──────────────────────────────────────────────────────┐
│ Next.js API Route                                     │
│  - Creates import_job record (status: pending)        │
│  - Triggers Data Engine                               │
└────────────────┬─────────────────────────────────────┘
                 │ POST http://localhost:8000/sync-marketing-data
                 ▼
┌──────────────────────────────────────────────────────┐
│ Data Engine (FastAPI) - ALWAYS RUNNING               │
│  - Background job processing                          │
│  - Updates job status: running → complete             │
│  - No venv activation needed (pre-configured)        │
└────────────────┬─────────────────────────────────────┘
                 │ Uses MCP tools (pre-installed)
                 ▼
┌──────────────────────────────────────────────────────┐
│ MCP Servers (Python in venv)                         │
│  - Google Ads MCP                                     │
│  - Meta Ads MCP                                       │
│  - Queries APIs, returns data                         │
└────────────────┬─────────────────────────────────────┘
                 │ Stores in database
                 ▼
┌──────────────────────────────────────────────────────┐
│ fact_marketing_performance (Supabase)                │
│  - Upserts new/updated campaigns                     │
│  - Updates last_imported_at timestamp                │
└──────────────────────────────────────────────────────┘
```

---

## 📋 One-Time Setup (10 Minutes)

### **Step 1: Install MCP Dependencies** (5 min)

```powershell
# Meta Ads MCP
cd p11-platform/services/mcp-servers/meta-ads
python -m venv venv
.\venv\Scripts\activate
pip install -r requirements.txt
deactivate

# Google Ads MCP (when approved)
cd ../google-ads
python -m venv venv
.\venv\Scripts\activate
pip install -r requirements.txt
deactivate
```

**You only do this ONCE**. The venvs stay installed.

### **Step 2: Start Data Engine** (1 min)

**Windows:**
```powershell
cd p11-platform/services/data-engine
.\start.bat
```

**Mac/Linux:**
```bash
cd p11-platform/services/data-engine
chmod +x start.sh
./start.sh
```

**Or manually:**
```powershell
cd p11-platform/services/data-engine
.\venv\Scripts\activate
$env:PYTHONPATH = "C:\Users\jasji\projects\oneClick\p11-platform\services"
python main.py
```

Leave this running in a terminal window.

### **Step 3: Done!**

That's it. Data Engine stays running, users click "Import" in UI.

---

## 🎨 Enhanced User Experience

### **MarketVision Dashboard View:**

```
┌────────────────────────────────────────────────────────┐
│ Epoca • San Diego - Marketing Performance              │
├────────────────────────────────────────────────────────┤
│  Last imported: 2 hours ago                            │
│  [History] [Import Latest Data]                        │
│                                                         │
│  ┌──────────────────────────────────────────────────┐ │
│  │ 🔄 Syncing Meta Ads... 65%                       │ │
│  │ ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━              │ │
│  └──────────────────────────────────────────────────┘ │
│                                                         │
│  📊 Total Spend: $1,234 (↑ 15% vs last period)        │
│  👆 Clicks: 890                                         │
│  👁️  Impressions: 12,000                               │
│  🎯 Conversions: 45                                     │
└────────────────────────────────────────────────────────┘
```

**After import completes:**

```
┌────────────────────────────────────────────────────────┐
│  ✅ Import complete! 8 records imported                │
│  12 campaigns synced from meta_ads                     │
└────────────────────────────────────────────────────────┘
```

### **Import History View:**

```
┌────────────────────────────────────────────────────────┐
│ Import History                                          │
├────────────────────────────────────────────────────────┤
│  ✅ 8 records imported          2 min ago  [12 campaigns]│
│  ✅ 8 records imported          6 hours ago [12 campaigns]│
│  ✅ 8 records imported          1 day ago  [12 campaigns]│
│  ❌ Import failed               2 days ago              │
└────────────────────────────────────────────────────────┘
```

### **Auto-Schedule Settings:**

```
┌────────────────────────────────────────────────────────┐
│ Auto-Import Schedule                                    │
├────────────────────────────────────────────────────────┤
│  Enable Auto-Import                          [ON]      │
│                                                         │
│  Frequency:  [Daily ▼]                                 │
│  Time (UTC): [02:00]                                   │
│                                                         │
│  [Save Schedule]                                       │
│                                                         │
│  💡 Next import: Today at 02:00 UTC                   │
└────────────────────────────────────────────────────────┘
```

---

## 🔄 How It Works

### **Incremental Sync Logic:**

```python
# First import (no history)
last_import = None
→ Pulls LAST_30_DAYS

# Imported yesterday
last_import = "2024-12-18"
→ Pulls YESTERDAY only

# Imported 5 days ago
last_import = "2024-12-14"
→ Pulls LAST_7_DAYS

# Imported 45 days ago
last_import = "2024-11-04"
→ Pulls LAST_30_DAYS (capped)
```

**Result**: Always pulls minimal data, saves API calls, faster imports.

### **Status Tracking:**

```typescript
// Import starts
status: 'pending' → progress: 0%

// Google Ads syncing
status: 'running' → progress: 25% → "Syncing Google Ads"

// Meta Ads syncing
status: 'running' → progress: 50% → "Syncing Meta Ads"

// Storing in database
status: 'running' → progress: 75% → "Storing data in database"

// Complete
status: 'complete' → progress: 100% → "12 campaigns synced"
```

UI polls every 2 seconds, live updates.

---

## 📅 Auto-Scheduling

### **Option 1: Property-Level Settings** (Built)

Each property can set their own schedule:
- Property A: Hourly
- Property B: Daily at 2 AM
- Property C: Manual only

Stored in property settings table.

### **Option 2: Supabase pg_cron** (Recommended)

```sql
-- Schedule auto-import for all properties daily at 2 AM
SELECT cron.schedule(
  'auto-import-marketing-data',
  '0 2 * * *',  -- Daily at 2 AM UTC
  $$
  SELECT net.http_post(
    'http://localhost:8000/sync-all-properties',
    '{"date_range": "YESTERDAY"}'::jsonb,
    headers := '{"Authorization": "Bearer YOUR_API_KEY", "Content-Type": "application/json"}'::jsonb
  );
  $$
);
```

### **Option 3: Heroku Scheduler** (If deployed)

```bash
# Add to Heroku Scheduler
# Command: cd services/data-engine && python -m pipelines.mcp_marketing_sync --all
# Frequency: Daily at 2 AM
```

---

## 🚀 Quick Start for Epoca

### **Your Situation:**
- ✅ Epoca property linked to Meta account `100422547226422`
- ✅ Data Engine installed
- ✅ UI ready to use

### **What to Do Next:**

**1. Start Data Engine** (one-time, leave running):
```powershell
cd p11-platform/services/data-engine
.\start.bat
```

**2. Open Dashboard**:
```
http://localhost:3000/dashboard/marketvision
```

**3. Select Epoca Property**

**4. Click "Import Latest Data"**

**5. Watch Progress**:
```
🔄 Syncing Meta Ads... 50%
━━━━━━━━━━━━━━━━━━━━━━━━━━
```

**6. Data Appears!**

---

## 📊 What Gets Imported

### **For Epoca (Linked to Meta Ads):**

**First Import:**
- Pulls: Last 30 days of campaign data
- Campaigns: ALL campaigns from account `100422547226422`
- Metrics: Spend, clicks, impressions, conversions
- Stores: ~240-900 records (30 days × 8-30 campaigns)

**Subsequent Imports:**
- Pulls: Only since last import (Yesterday, Last 7 days, etc.)
- Updates: Existing campaigns + new campaigns
- Stores: Only new/changed data

**Dashboard Shows:**
- Total spend across all campaigns
- Performance by channel (Meta Ads)
- Top campaigns by spend
- Trend comparisons

---

## 🎛️ Controlling What Gets Imported

### **1. Property Level** (Settings Page)
```
Link specific ad accounts to specific properties
```

### **2. Channel Level** (Dashboard)
```tsx
<Select>
  <SelectItem value="google_ads,meta_ads">Both</SelectItem>
  <SelectItem value="google_ads">Google Only</SelectItem>
  <SelectItem value="meta_ads">Meta Only</SelectItem>
</Select>
```

### **3. Date Range** (Dashboard)
```tsx
<Select>
  <SelectItem value="7d">Last 7 days</SelectItem>
  <SelectItem value="30d">Last 30 days</SelectItem>
  <SelectItem value="90d">Last 90 days</SelectItem>
</Select>
```

### **4. Campaign Filters** (Code)
```python
# Edit mcp_marketing_sync.py to add filters
campaigns = await get_campaign_performance(
    customer_id,
    date_range,
    campaign_name_filter="Leasing"  # Only specific campaigns
)
```

---

## 🔧 No More Manual Steps

### **Before (Manual):**
```powershell
❌ cd services/mcp-servers/meta-ads
❌ .\venv\Scripts\activate
❌ pip install -r requirements.txt
❌ deactivate
❌ cd ../../data-engine
❌ .\venv\Scripts\activate
❌ python -m pipelines.mcp_marketing_sync --property-id abc-123
❌ deactivate
❌ Open Supabase, check data manually
```

### **After (Automated):**
```
✅ Click "Import Latest Data" button
✅ Wait 10-30 seconds
✅ Data appears in dashboard
```

---

## 🎉 Summary

### **What You Do Once:**
1. Run `.\start.bat` (leave Data Engine running)
2. (Optional) Set up auto-schedule

### **What Users Do Every Time:**
1. Click "Import Latest Data"
2. Wait for green checkmark
3. View updated dashboard

### **What Happens Automatically:**
- ✅ Venv activated (startup script)
- ✅ MCP tools loaded (Python path configured)
- ✅ APIs queried (Meta/Google)
- ✅ Data stored (Supabase)
- ✅ Dashboard refreshed (auto)
- ✅ Import history logged (tracking)
- ✅ Progress tracked (real-time)

---

## 🚀 For Epoca Right Now

### **Run This Once:**
```powershell
# Terminal 1: Start Data Engine (leave running)
cd p11-platform/services/data-engine
.\start.bat

# Terminal 2: Start Web App (leave running)
cd p11-platform/apps/web
npm run dev
```

### **Then in Browser:**
1. Go to: `http://localhost:3000/dashboard/marketvision`
2. Select: Epoca • San Diego
3. Click: "Import Latest Data"
4. Watch: Progress bar
5. See: All your Meta campaigns with spend/clicks/conversions

**All campaigns from Epoca's Meta account will be imported automatically!**

---

## 📦 Deployment (Production)

### **Heroku Example:**

```yaml
# Procfile
web: cd apps/web && npm start
worker: cd services/data-engine && ./start.sh

# Or separate apps:
# Web: Deploy to Vercel
# Data Engine: Deploy to Heroku/Railway
```

**Environment variables on Heroku:**
```
DATA_ENGINE_URL=https://your-data-engine.herokuapp.com
DATA_ENGINE_API_KEY=xxx
META_ACCESS_TOKEN=xxx
META_AD_ACCOUNT_ID=xxx
SUPABASE_URL=xxx
SUPABASE_SERVICE_KEY=xxx
```

Then everything works the same - users click "Import", data syncs!

---

## ✅ Files Created

1. ✅ `import_jobs` table (migration applied)
2. ✅ `start.bat` / `start.sh` (auto-startup)
3. ✅ `/api/marketvision/import` (trigger endpoint)
4. ✅ Enhanced `PropertyMarketingDashboard` (import button + progress)
5. ✅ `ImportScheduleSettings` component (auto-schedule UI)
6. ✅ Incremental sync logic (only pulls new data)
7. ✅ Job status tracking (real-time updates)

---

## 🎯 Next Steps for Epoca

**Right now, run these 2 commands:**

```powershell
# Terminal 1
cd p11-platform/services/data-engine
.\start.bat

# Terminal 2  
cd p11-platform/apps/web
npm run dev
```

**Then:**
- Open `http://localhost:3000/dashboard/marketvision`
- Click "Import Latest Data"
- Watch your Epoca campaigns populate!

**No more manual scraping. Ever.** 🎉





