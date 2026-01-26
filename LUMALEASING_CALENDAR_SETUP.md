# LumaLeasing Google Calendar Integration - Setup Guide

**Last Updated:** January 27, 2026

This guide covers setting up Google Calendar integration for dynamic tour availability in the LumaLeasing widget.

---

## Overview

The Google Calendar integration enables:
- ✅ **Dynamic Availability**: Widget shows real-time available slots from PM's calendar
- ✅ **Automatic Event Creation**: Tour bookings create events in PM's Google Calendar
- ✅ **Two-Way Sync**: PM reschedules in Google → Tour booking updates automatically
- ✅ **Token Health Monitoring**: Proactive refresh prevents OAuth token expiration

---

## Prerequisites

1. Google Cloud Project with Calendar API enabled
2. OAuth 2.0 credentials configured
3. Render account for Data Engine (or Vercel Cron)
4. Environment variables configured

---

## Step 1: Google Cloud Console Setup

### 1.1 Create/Select Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create new project: "P11 LumaLeasing" (or use existing)
3. Select the project

### 1.2 Enable APIs

1. Go to **APIs & Services → Library**
2. Search and enable:
   - **Google Calendar API**
   - **Google Workspace Events API** (for webhooks)
3. Wait for APIs to activate (~1 minute)

### 1.3 Create OAuth 2.0 Credentials

1. Go to **APIs & Services → Credentials**
2. Click **Create Credentials → OAuth client ID**
3. Select application type: **Web application**
4. Name: "LumaLeasing Calendar Integration"
5. Add **Authorized redirect URIs**:
   - Production: `https://p11platform.vercel.app/api/lumaleasing/calendar/callback`
   - Development: `http://localhost:3000/api/lumaleasing/calendar/callback`
6. Click **Create**
7. **SAVE** the Client ID and Client Secret (you'll need these)

### 1.4 Configure OAuth Consent Screen

1. Go to **APIs & Services → OAuth consent screen**
2. User Type: **Internal** (if Google Workspace) or **External**
3. Fill in app information:
   - App name: "LumaLeasing"
   - User support email: your-email@p11creative.com
   - Developer contact: your-email@p11creative.com
4. Add scopes:
   - `https://www.googleapis.com/auth/calendar`
   - `https://www.googleapis.com/auth/calendar.events`
   - `https://www.googleapis.com/auth/userinfo.email`
5. Save and continue

**Note:** If using "External" type with unverified app, add test users manually.

---

## Step 2: Environment Variables

Add to your `.env` file (or Vercel environment variables):

```env
# Google Calendar OAuth
GOOGLE_CLIENT_ID=your-client-id-here.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-client-secret-here

# Cron security
CRON_SECRET=generate-random-secret-here

# App URL (for OAuth redirect)
NEXT_PUBLIC_APP_URL=https://p11platform.vercel.app
```

**Generate CRON_SECRET:**
```bash
openssl rand -base64 32
```

**Deploy to Vercel:**
1. Go to Vercel project settings
2. Environment Variables
3. Add all variables above
4. Redeploy

---

## Step 3: Database Migration

Run the migrations:

```bash
cd p11-platform/supabase

# Apply migrations (if using Supabase CLI)
supabase db push

# Or apply manually in Supabase SQL Editor:
# 1. 20260127000000_add_tour_booking_reminders.sql
# 2. 20260127000001_google_calendar_integration.sql
```

**Verify tables created:**
```sql
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('agent_calendars', 'calendar_events', 'calendar_token_refreshes');
```

---

## Step 4: Data Engine Cron (Render)

### Option A: Render Cron Jobs (Recommended)

**4.1 Create render.yaml** (if not exists):

```yaml
services:
  - type: web
    name: p11-data-engine
    env: python
    region: oregon
    plan: starter
    buildCommand: "pip install -r requirements.txt"
    startCommand: "python main.py"
    
    # Environment variables
    envVars:
      - key: SUPABASE_URL
        sync: false
      - key: SUPABASE_SERVICE_ROLE_KEY
        sync: false
      - key: GOOGLE_CLIENT_ID
        sync: false
      - key: GOOGLE_CLIENT_SECRET
        sync: false
    
    # Cron jobs
    crons:
      - name: calendar-health-monitor
        schedule: "0 */6 * * *"  # Every 6 hours
        command: "python jobs/google_calendar_health_monitor.py"
```

**4.2 Deploy to Render:**

1. Connect Render to your GitHub repository
2. Create new **Web Service**
3. Use `render.yaml` for configuration (Blueprint)
4. Or manually configure:
   - Build Command: `pip install -r requirements.txt`
   - Start Command: `python main.py`
   - Add cron job in Render dashboard

**4.3 Verify Cron Job:**

1. Go to Render dashboard → Your service → Cron Jobs
2. Should see: "calendar-health-monitor" scheduled every 6 hours
3. Manually trigger to test: Click "Run Now"
4. Check logs for success

### Option B: Vercel Cron (Alternative)

If you prefer to run on Vercel instead of Render:

**4.1 Create TypeScript version:**

File: `app/api/cron/calendar-health/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/utils/supabase/admin'
// Implement TypeScript version of calendar health monitoring
// (Logic same as Python version)

export async function GET(req: NextRequest) {
  // Verify cron secret
  const authHeader = req.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response('Unauthorized', { status: 401 });
  }
  
  // Run health checks...
  return Response.json({ success: true });
}
```

**4.2 Add to vercel.json:**

```json
{
  "crons": [
    {
      "path": "/api/cron/calendar-health",
      "schedule": "0 */6 * * *"
    }
  ]
}
```

---

## Step 5: Property Manager Connects Calendar

### 5.1 Admin Flow

1. Property Manager logs into P11 Platform Dashboard
2. Goes to **Settings → LumaLeasing**
3. Clicks **"Connect Google Calendar"** button
4. Redirected to Google OAuth consent screen
5. Selects Google account (work calendar)
6. Clicks **"Allow"** to grant calendar access
7. Redirected back to P11 Dashboard
8. Success message: "Calendar connected! ✅"

### 5.2 Verify Connection

Dashboard should show:
```
Google Calendar: ✅ Connected
├─ Email: pm@property.com
├─ Last synced: Just now
├─ Token expires: In 59 days
└─ Status: Healthy
```

### 5.3 Configure Working Hours

1. Set office hours for each day of week
2. Set tour duration (default: 30 minutes)
3. Set buffer between appointments (default: 15 minutes)
4. Save settings

---

## Step 6: Testing

### 6.1 Test Availability API

```bash
curl -H "X-API-Key: YOUR_API_KEY" \
  "https://p11platform.vercel.app/api/lumaleasing/tours/availability"
```

**Expected Response:**
```json
{
  "success": true,
  "availableDates": ["2026-01-28", "2026-01-29", ...],
  "slotsByDate": {
    "2026-01-28": [
      {"time": "09:00", "available": true},
      {"time": "09:30", "available": true},
      {"time": "10:00", "available": false},
      ...
    ]
  },
  "timezone": "America/Chicago",
  "tourDuration": 30
}
```

### 6.2 Test Widget

1. Go to property's WordPress site
2. Click LumaLeasing chat button
3. Type: "I'd like to schedule a tour"
4. Calendar picker should appear
5. Click on available date
6. Select available time
7. Fill in contact form
8. Confirm booking
9. Check PM's Google Calendar → Event should appear
10. Check email → Confirmation with calendar invite

### 6.3 Test Token Refresh

**Manually trigger cron job:**

Render:
```bash
# In Render dashboard, go to Cron Jobs → Run Now
# Or SSH into service:
render ssh p11-data-engine
python jobs/google_calendar_health_monitor.py
```

**Check logs for:**
```
[CalendarHealth] Checking N calendar configurations
[CalendarHealth] ✅ Refreshed token for property abc-123
[CalendarHealth] Results: {'healthy': N, 'refreshed': M, ...}
```

---

## Step 7: Monitoring

### 7.1 Calendar Health Dashboard

**Admin View (P11 Dashboard):**

Create a monitoring page at `/dashboard/admin/calendar-health`:

- Shows all properties with calendar status
- Filter by: Healthy | Expiring | Expired | Revoked
- Bulk re-auth email option
- Recent refresh activity log

### 7.2 Alerts

Property Managers receive email alerts when:
- Token expires or revoked
- Tour booking fails due to calendar issue
- Calendar hasn't synced in 24 hours

**Alert emails rate-limited to 1 per 24 hours per property.**

---

## Troubleshooting

### Issue: "Calendar authorization expired"

**Cause:** Refresh token revoked or expired

**Solution:**
1. PM goes to Settings → LumaLeasing
2. Clicks "Reconnect Google Calendar"
3. Re-authorizes with Google
4. New tokens stored

### Issue: Cron job not running

**Render:**
- Check Render dashboard → Cron Jobs → Last Run
- Check logs for errors
- Verify `render.yaml` has correct schedule

**Vercel:**
- Check Vercel dashboard → Project → Cron Jobs
- Verify `vercel.json` has correct schedule
- Check function logs

### Issue: Widget shows "Calendar not connected"

**Causes:**
1. PM hasn't connected calendar yet → Show "Connect" button in Dashboard
2. Token expired → Cron job should have alerted PM
3. `tours_enabled` is false in `lumaleasing_config` → Enable in settings

**Solution:** Check `agent_calendars` table for property:
```sql
SELECT token_status, last_health_check_at, health_check_error
FROM agent_calendars
WHERE property_id = 'xxx';
```

### Issue: Duplicate calendar events

**Cause:** Booking endpoint called twice (race condition)

**Solution:** Add idempotency check:
```sql
SELECT google_event_id FROM calendar_events
WHERE tour_booking_id = 'xxx';
```

If event exists, don't create again.

---

## Security Considerations

### Token Storage

**Current:** Tokens stored in plaintext in `agent_calendars` table

**Recommended (Future):** Encrypt refresh tokens at rest
```sql
-- Use Supabase Vault for encryption
ALTER TABLE agent_calendars 
  ADD COLUMN refresh_token_encrypted bytea;
```

### API Rate Limits

Google Calendar API limits:
- 1,000,000 queries per day
- 10 queries per second per user

Our usage (per property):
- 1 freebusy query per widget open (~10/day)
- 1 event creation per tour (~5/day)
- 1 health check every 6 hours (4/day)

**Total:** ~20 queries/day per property = 0.002% of limit. Safe for 100+ properties.

### Webhook Security

When implementing webhooks for two-way sync:
- Verify webhook signature from Google
- Use HTTPS only
- Rate limit webhook endpoint
- Log all webhook events for audit

---

## Maintenance

### Token Rotation

Refresh tokens should be rotated annually as best practice:
1. Export list of properties with connected calendars
2. Send email to PMs: "Please reconnect your calendar"
3. After 30 days, disable old tokens
4. Alert any properties still using old tokens

### Monitoring Metrics

Track in dashboard:
- % of properties with calendar connected
- Average token age
- Token refresh success rate
- Calendar API error rate
- Tour booking success rate

**Target SLA:** 99.5% uptime for calendar-based tour booking

---

## Cost Estimate

**Google Calendar API:** Free
- 1M queries/day included
- We use <1000 queries/day

**Render Cron Job:** 
- Included with Starter plan ($7/month)
- Runs every 6 hours = 4 runs/day = 120 runs/month
- Well within free tier limits

**Total Additional Cost:** $0

---

## Next Steps

After initial setup:
1. ✅ Test with 1-2 pilot properties
2. ✅ Monitor for 1 week
3. ✅ Roll out to all properties gradually
4. ✅ Build admin monitoring dashboard
5. ✅ Document customer success playbook

---

**Questions?** Contact: dev@p11creative.com

**Implementation Status:** ✅ Complete (January 27, 2026)
