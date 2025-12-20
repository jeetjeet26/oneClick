# 🚀 Epoca Property - Import Data Quick Start

## ✅ What You Just Did
- Linked Epoca property to Meta account `100422547226422` via UI

## 🎯 Get Data in Dashboard (2 Steps)

### **Step 1: Start Data Engine** (Do This Once)

Open a terminal and run:

```powershell
cd p11-platform/services/data-engine
.\start.bat
```

**Leave this running.** It will say:
```
Virtual environment activated
PYTHONPATH configured

Data Engine running on http://localhost:8000
Press Ctrl+C to stop
```

### **Step 2: Import Data via UI**

**Option A: Via Dashboard (Easiest)**

1. Open: `http://localhost:3000/dashboard/marketvision`
2. Select: "Epoca • San Diego" from property dropdown
3. Click: **"Import Latest Data"** button
4. Watch: Progress bar (10-30 seconds)
5. See: ✅ "Import complete! X records imported"
6. View: Dashboard updates with campaign data

**Option B: Via API (Testing)**

```powershell
# Get Epoca property ID first
# In Supabase SQL Editor:
# SELECT id FROM properties WHERE name ILIKE '%epoca%';

# Then trigger import:
curl -X POST http://localhost:3000/api/marketvision/import `
  -H "Content-Type: application/json" `
  -d "{\"property_id\":\"YOUR-EPOCA-UUID\",\"channels\":[\"meta_ads\"]}"
```

**Option C: Via Data Engine Directly**

```powershell
# Get Epoca UUID, then:
$env:PYTHONPATH = "C:\Users\jasji\projects\oneClick\p11-platform\services"
cd p11-platform/services/data-engine
python -m pipelines.mcp_marketing_sync --property-id YOUR-EPOCA-UUID --date-range LAST_30_DAYS
```

---

## 📊 What You'll See

### **During Import:**
```
Progress Bar:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ 65%
"Syncing Meta Ads..."
```

### **After Import:**
```
✅ Import complete! 24 records imported
12 campaigns synced from meta_ads
```

### **In Dashboard:**

**Channel Performance:**
```
Meta Ads
├─ Spend: $1,234
├─ Clicks: 890
├─ Impressions: 12,000
└─ 12 campaigns
```

**Top Campaigns:**
```
1. Brand Awareness Campaign    $567  245 clicks
2. Leasing Special Q4          $345  178 clicks
3. Retargeting - Website       $234  156 clicks
```

---

## 🔄 Incremental Imports

### **First Import:**
```
Pulls: LAST_30_DAYS
Records: ~240-900 (30 days × 8-30 campaigns)
Time: 20-30 seconds
```

### **Second Import (6 hours later):**
```
Pulls: YESTERDAY only (incremental!)
Records: ~8-30 (1 day × campaigns)
Time: 5-10 seconds
```

### **Third Import (tomorrow):**
```
Pulls: YESTERDAY again
Records: ~8-30
Time: 5-10 seconds
```

**System automatically calculates optimal date range based on last import!**

---

## 🎛️ What Gets Imported for Epoca

**From Your Meta Account (`100422547226422`):**

✅ **ALL campaigns** in that account
✅ **Last 30 days** on first import
✅ **Incremental updates** on subsequent imports

**Metrics Imported:**
- Campaign ID & Name
- Date
- Spend
- Clicks
- Impressions
- Conversions
- CTR, CPC (calculated)

**Stored In:**
- Table: `fact_marketing_performance`
- Row per campaign per day
- Upserts on conflict (no duplicates)

---

## ⚙️ Customizing Epoca Imports

### **Import Only Specific Campaigns:**

Edit `services/data-engine/pipelines/mcp_marketing_sync.py` line ~200:

```python
# Find this section in _sync_meta_ads method:
insights = await client.get_campaign_insights(
    account_id=account_id,
    date_preset=meta_preset,
    limit=100
)

# Add filter:
insights = [i for i in insights if 'Leasing' in i.get('campaign_name', '')]
```

### **Change Date Range:**

In dashboard, before clicking "Import", change dropdown:
- 7 days (recent performance)
- 30 days (monthly view)
- 90 days (quarterly trends)

### **Import Only Meta (Not Google):**

Dashboard automatically detects - Epoca only has Meta linked, so only Meta imports!

---

## 🐛 Troubleshooting

### **"Data Engine not running" error:**
```powershell
# Start it:
cd p11-platform/services/data-engine
.\start.bat
```

### **"Import stays at 0%":**

Check Data Engine terminal - you'll see errors there. Common issues:
- MCP venv not installed
- Meta token expired
- PYTHONPATH not set

### **"No data in dashboard":**

Check Supabase:
```sql
SELECT * FROM fact_marketing_performance 
WHERE property_id = (SELECT id FROM properties WHERE name ILIKE '%epoca%')
ORDER BY date DESC;
```

If empty, check import_jobs table:
```sql
SELECT * FROM import_jobs ORDER BY created_at DESC LIMIT 5;
```

---

## ✅ Success Checklist

After running import, verify:

- [ ] Data Engine terminal shows "✅ Sync complete"
- [ ] Supabase has rows in `fact_marketing_performance`
- [ ] `import_jobs` table shows status = 'complete'
- [ ] Dashboard displays campaign cards
- [ ] Totals show correct spend/clicks
- [ ] "Last imported" timestamp updates

---

## 🎉 You're Done!

**From now on:**
- Click "Import" whenever you want fresh data
- Set up auto-schedule for daily imports
- View historical trends in dashboard
- No more manual terminal commands

**Everything is automated and scalable!** 🚀

