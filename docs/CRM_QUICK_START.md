# CRM MVP - Quick Start Guide 🚀

## Step 1: Run the Database Migration (5 minutes)

```bash
cd p11-platform
cd supabase

# If using Supabase CLI locally:
supabase migration up

# Or manually via Supabase Dashboard:
# 1. Go to https://supabase.com/dashboard/project/YOUR_PROJECT/database/migrations
# 2. Click "New Migration"
# 3. Copy/paste contents of: supabase/migrations/20251212000000_crm_mvp_schema.sql
# 4. Run migration
```

**What this does:**
- Creates 12 new tables (tours, workflows, activities, etc.)
- Adds `score_lead()` function for LeadPulse
- Sets up Row Level Security (RLS) policies

---

## Step 2: Seed Default Workflows (2 minutes)

**Option A: Via UI (Easiest)**
1. Navigate to: `https://your-domain.com/dashboard/settings/workflows`
2. Click **"Create Default Workflows"** button
3. Confirm the prompt
4. ✅ Done! 3 workflows + 7 message templates created

**Option B: Via API**
```bash
curl -X POST https://your-domain.com/api/workflows/templates \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_AUTH_TOKEN" \
  -d '{
    "propertyId": "YOUR_PROPERTY_ID",
    "seedDefaults": true
  }'
```

---

## Step 3: Set Up CRON Job (5 minutes)

The workflow processor needs to run every 10 minutes to send automated messages.

### For Vercel (Recommended):

Create `vercel.json` in project root:

```json
{
  "crons": [
    {
      "path": "/api/workflows/process",
      "schedule": "*/10 * * * *"
    }
  ]
}
```

Then add to `.env`:
```env
CRON_SECRET=generate-a-random-secret-here
```

### For Heroku:

```bash
heroku addons:create scheduler:standard
```

Then in Heroku Scheduler dashboard, add job:
```bash
curl -X POST https://your-app.herokuapp.com/api/workflows/process \
  -H "Authorization: Bearer $CRON_SECRET"
```

Schedule: Every 10 minutes

---

## Step 4: Verify Messaging Setup (2 minutes)

**Check Twilio (SMS):**
```env
TWILIO_ACCOUNT_SID=ACxxxxx
TWILIO_AUTH_TOKEN=xxxxx
TWILIO_PHONE_NUMBER=+1234567890
```

**Check Resend (Email):**
```env
RESEND_API_KEY=re_xxxxx
RESEND_FROM_EMAIL=noreply@yourdomain.com
```

---

## Step 5: Test It! (5 minutes)

### Create a Test Lead:

1. Go to `/dashboard/leads`
2. Click **"Add Lead"**
3. Fill in:
   - First Name: Test
   - Last Name: User
   - Email: your-email@example.com
   - Phone: your-phone-number
   - Source: Manual Entry
4. Click **"Create Lead"**

### What Should Happen:

✅ **Immediately:**
- Lead appears in dashboard
- Activity timeline shows "Lead created" event

✅ **Within 5 minutes:**
- Lead receives SMS: "Hi Test! Thanks for your interest..."
- Activity timeline shows "SMS sent" event

✅ **Within 24 hours:**
- Lead receives email with tour booking link

✅ **Within 48 hours:**
- Lead receives SMS reminder

### Verify Workflow is Running:

1. Click on the test lead
2. Go to **"Automation"** tab
3. You should see:
   - Workflow: "New Lead Nurture"
   - Status: Active
   - Current step: 1 of 3
   - Next action: in X hours

---

## Common Issues & Fixes

### Issue: "No workflows configured"
**Fix:** Run Step 2 again (seed default workflows)

### Issue: "SMS not sending"
**Fix:** 
1. Check Twilio credentials in `.env`
2. Check Twilio logs: https://console.twilio.com/logs
3. Verify phone number is verified (for trial accounts)

### Issue: "Email not sending"
**Fix:**
1. Check Resend API key in `.env`
2. Check Resend logs: https://resend.com/logs
3. Verify sender email domain is verified

### Issue: "Workflow not running"
**Fix:**
1. Check CRON job is set up (Step 3)
2. Manually trigger: `curl -X POST https://your-domain.com/api/workflows/process -H "Authorization: Bearer YOUR_CRON_SECRET"`
3. Check browser console for errors

---

## What You Can Do Now

### Lead Management:
- ✅ View all leads with filtering
- ✅ See LeadPulse scores
- ✅ Add notes to leads
- ✅ Update lead status
- ✅ View complete activity timeline

### Tour Scheduling:
- ✅ Schedule in-person, virtual, or self-guided tours
- ✅ Send automatic confirmation emails with calendar invite
- ✅ Reschedule or cancel tours
- ✅ Mark tours as completed/no-show

### Automation:
- ✅ New leads automatically nurtured
- ✅ Tour no-shows re-engaged
- ✅ Post-tour follow-ups sent
- ✅ Pause/resume/stop workflows per lead
- ✅ Enable/disable workflows per property

---

## Next Steps

1. **Customize Message Templates:**
   - Edit templates in database: `follow_up_templates` table
   - Or wait for template editor UI (future enhancement)

2. **Monitor Performance:**
   - Check Twilio/Resend logs for delivery rates
   - Review activity timelines to see automation in action

3. **Train Your Team:**
   - Show them how to use `/dashboard/leads`
   - Explain the automation (they don't need to manually follow up!)

4. **Scale Up:**
   - Enable workflows for all properties
   - Import existing leads
   - Connect to your lead sources (Google Ads, Facebook, etc.)

---

## Support

**Documentation:** See `CRM_MVP_IMPLEMENTATION_COMPLETE.md` for full details

**Questions?** Check:
- Supabase logs for database errors
- Browser console for API errors
- Twilio/Resend logs for message delivery
- `/api/workflows/process` endpoint for CRON job status

---

**🎉 That's it! Your CRM is now live and automating lead follow-ups.**

Happy nurturing! 🌱

