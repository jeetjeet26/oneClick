# Render Setup Instructions for LumaLeasing Calendar Integration

**Service:** Data Engine (Python FastAPI)  
**Required For:** Google Calendar token health monitoring

---

## Quick Setup (Via Dashboard)

### 1. Add Environment Variables

Go to your Data Engine service on Render → **Environment** tab:

**Add these NEW variables:**
```
GOOGLE_CLIENT_ID=[copy from Vercel]
GOOGLE_CLIENT_SECRET=[copy from Vercel]
```

**Verify these EXISTING variables are set:**
```
SUPABASE_URL=https://[your-project].supabase.co
SUPABASE_SERVICE_ROLE_KEY=[your service role key]
```

### 2. Add Cron Job

Go to your Data Engine service → **Cron Jobs** tab:

**Click "Add Cron Job":**
- **Name:** `calendar-health-monitor`
- **Command:** `python jobs/google_calendar_health_monitor.py`
- **Schedule:** `0 */6 * * *` (every 6 hours at :00)
  - Or use dropdown: "Every 6 hours"

**Click "Save"**

### 3. Test the Cron Job

**In Cron Jobs tab:**
1. Find `calendar-health-monitor`
2. Click **"Run Now"**
3. Wait ~30 seconds
4. Click **"View Logs"**

**Expected Output:**
```
[CalendarHealth] Starting health check at 2026-01-27T...
[CalendarHealth] Checking 0 calendar configurations
[CalendarHealth] Results: {'healthy': 0, 'refreshed': 0, ...}
[CalendarHealth] Completed at 2026-01-27T...
```

**(0 calendars is normal until PMs connect their calendars)**

---

## Advanced Setup (Infrastructure-as-Code)

### Using render.yaml (Optional)

I've created `render.yaml` in the Data Engine folder. To use it:

**Option A - New Service:**
1. In Render dashboard, click **"New +"** → **"Blueprint"**
2. Connect to your GitHub repo
3. Select `p11-platform/services/data-engine/render.yaml`
4. Render will create service with cron job automatically

**Option B - Update Existing Service:**
1. Your existing service continues running
2. Add cron job manually via dashboard (steps above)
3. Keep render.yaml for documentation

---

## Verification Checklist

After setup, verify:

- [ ] **Environment Variables Set**
  ```bash
  # In Render dashboard, check Environment tab shows:
  GOOGLE_CLIENT_ID=xxx
  GOOGLE_CLIENT_SECRET=xxx
  SUPABASE_URL=xxx
  SUPABASE_SERVICE_ROLE_KEY=xxx
  ```

- [ ] **Cron Job Created**
  ```
  # In Cron Jobs tab, should see:
  Name: calendar-health-monitor
  Schedule: 0 */6 * * *
  Command: python jobs/google_calendar_health_monitor.py
  Status: Active
  ```

- [ ] **Cron Job Tested**
  ```
  # After clicking "Run Now":
  Last Run: [recent timestamp]
  Status: Success
  Duration: ~2-5 seconds
  ```

- [ ] **Code Deployed**
  ```bash
  # In Deploy tab, verify:
  - Latest commit includes google_calendar_health_monitor.py
  - requirements.txt includes google-auth libraries
  - Build succeeded
  - Service is live
  ```

---

## What the Cron Job Does

**Every 6 Hours:**
1. Queries all `agent_calendars` where `sync_enabled = true`
2. For each calendar:
   - Checks if access token expires in <24 hours
   - If yes → Refreshes token proactively
   - If no → Tests token with lightweight Calendar API call
3. Updates `token_status` in database:
   - `'healthy'` - Token works
   - `'expired'` - Token expired (alert sent)
   - `'revoked'` - User revoked access (alert sent)
4. Sends email alerts to PMs if tokens need reconnection
5. Logs all activity to `calendar_token_refreshes` audit table

**Why Every 6 Hours?**
- Google access tokens expire after 1 hour
- Refresh tokens don't expire if used regularly (< 6 months)
- Running every 6 hours ensures refresh tokens stay active
- Catches token issues before they affect users

---

## Cost Impact

**Render Cron Job Pricing:**
- Included FREE with any paid plan ($7/month Starter and up)
- 4 runs/day × 30 days = 120 runs/month
- Each run takes ~2-5 seconds
- Minimal compute usage

**No additional cost beyond your current Render plan.**

---

## Monitoring the Cron Job

### Check Execution History

**Render Dashboard:**
1. Go to service → **Cron Jobs** tab
2. Click on `calendar-health-monitor`
3. See **"Recent Runs"**:
   - Timestamp of each run
   - Success/failure status
   - Duration
   - Logs link

### View Logs

**Click "View Logs" for any run:**
```
[CalendarHealth] Starting health check at 2026-01-27T12:00:00Z
[CalendarHealth] Checking 3 calendar configurations
[CalendarHealth] ✅ Refreshed token for property abc-123-def
[CalendarHealth] Results: {
  'healthy': 2,
  'refreshed': 1,
  'expired': 0,
  'revoked': 0,
  'errors': 0
}
[CalendarHealth] Completed at 2026-01-27T12:00:03Z
```

### Check Database Impact

**After cron runs, verify in Supabase:**
```sql
-- View all calendar health statuses
SELECT 
  property_id,
  google_email,
  token_status,
  last_health_check_at,
  token_expires_at
FROM agent_calendars
WHERE sync_enabled = true
ORDER BY last_health_check_at DESC;

-- View recent token refreshes
SELECT 
  refresh_status,
  error_message,
  created_at
FROM calendar_token_refreshes
ORDER BY created_at DESC
LIMIT 10;
```

---

## Troubleshooting

### Cron Job Shows "Failed"

**Check logs for error messages:**

**Error: "ModuleNotFoundError: No module named 'google'"**
- **Fix:** Requirements not installed
- **Solution:** Rebuild service or verify `requirements.txt` includes google libraries

**Error: "relation 'agent_calendars' does not exist"**
- **Fix:** Migration not applied to production Supabase
- **Solution:** Already done ✅ (we applied it via MCP)

**Error: "GOOGLE_CLIENT_ID not found"**
- **Fix:** Environment variables not set
- **Solution:** Add them in Render dashboard → Environment tab → Redeploy

### Cron Job Doesn't Run on Schedule

**Check:**
1. Cron job is **Active** (not paused)
2. Schedule format is correct: `0 */6 * * *`
3. Service is **running** (not suspended)

**Solution:** Toggle cron job off then on again

---

## Summary - What You Need to Do on Render

### ✅ Immediate (Do Now):

1. **Add Environment Variables** (2 minutes)
   ```
   GOOGLE_CLIENT_ID=[from Google Cloud]
   GOOGLE_CLIENT_SECRET=[from Google Cloud]
   ```

2. **Add Cron Job** (2 minutes)
   - Name: `calendar-health-monitor`
   - Schedule: `0 */6 * * *`
   - Command: `python jobs/google_calendar_health_monitor.py`

3. **Test Cron Job** (1 minute)
   - Click "Run Now"
   - Check logs for success

### ✅ Optional (Nice to Have):

4. **Create render.yaml** - Already created at `services/data-engine/render.yaml`
   - Good for documentation
   - Useful if you rebuild service from scratch

---

## That's It!

**Total Time:** ~5 minutes  
**Cost:** $0 (included in Render plan)  
**Benefit:** Prevents calendar tokens from expiring, ensures tour booking always works

**Once configured:** Set it and forget it. Cron runs every 6 hours automatically, keeping all calendar connections healthy.

---

**Ready to test?** After you add the cron job, you can test the full flow:
1. Connect a Google Calendar in Dashboard
2. Wait for cron to run (or trigger manually)
3. Check database to see token health updated
4. Book a tour via widget
5. Verify event appears in Google Calendar!