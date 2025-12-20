# Data Engine Migration Guide

## Overview

This guide explains how to migrate long-running Next.js operations to the Python data-engine execution environment using feature flags for zero-downtime rollout.

### Why This Migration?

**Problem:** Next.js routes running on Vercel have strict timeout limits:
- Hobby: 10 seconds
- Pro: 60 seconds  
- Enterprise: 300 seconds (5 minutes max)

**Solution:** Move long-running operations (PropertyAudit, ReviewFlow, Knowledge Refresh) to Python data-engine with no timeout limits.

**Safety:** Feature flags allow instant rollback to TypeScript execution if issues arise.

---

## Architecture

```
┌─────────────┐
│  Next.js    │  ← Trigger routes (short-lived)
│  (Vercel)   │
└──────┬──────┘
       │
       │  [Feature Flag Controls This]
       │
       ├──────────────┬──────────────┐
       │              │              │
       ▼              ▼              ▼
┌──────────┐   ┌──────────┐  ┌──────────┐
│TypeScript│   │  Python  │  │ Supabase │
│Processor │   │Data Engine│  │ (Polling)│
│(Legacy)  │   │  (New)   │  │          │
└────┬─────┘   └────┬─────┘  └────┬─────┘
     │              │              │
     └──────────────┴──────────────┘
               │
         ┌─────▼──────┐
         │  Supabase  │
         │  (Results) │
         └────────────┘
```

### Key Points

✅ **Same Database Tables**: Both execution paths write to the same tables
✅ **Client Agnostic**: Frontend polls Supabase, doesn't care about executor
✅ **Instant Rollback**: Change one environment variable to switch back
✅ **No Data Loss**: All job tracking uses existing schema

---

## Phase 1: PropertyAudit Migration

### Status: ✅ Ready to Deploy

### Environment Variables

Add to `p11-platform/apps/web/.env.local`:

```bash
# Data Engine Configuration
DATA_ENGINE_URL=http://localhost:8000
DATA_ENGINE_API_KEY=your_random_api_key_here  # Generate with: openssl rand -hex 32

# Feature Flag: PropertyAudit Execution Mode
# false = Use TypeScript processor (legacy, safe fallback)
# true  = Use Python data-engine (new, no timeout limits)
PROPERTYAUDIT_USE_DATA_ENGINE=false
```

### Step-by-Step Deployment

#### 1. Apply Database Migration

```bash
cd p11-platform
supabase migration up
```

This adds progress tracking columns to `geo_runs`:
- `progress_pct` (0-100)
- `current_query_index` (for resumability)
- `last_updated_at` (for stalled job detection)

#### 2. Start Data-Engine Locally

```bash
cd p11-platform/services/data-engine

# Install dependencies (if not done)
pip install -r requirements.txt

# Set environment variables
export DATA_ENGINE_API_KEY="your_random_api_key_here"
export SUPABASE_URL="https://your-project.supabase.co"
export SUPABASE_SERVICE_KEY="your_service_role_key"
export OPENAI_API_KEY="sk-proj-..."
export ANTHROPIC_API_KEY="sk-ant-..."  # If using Claude

# Start server
python main.py
```

#### 3. Test Health Endpoint

```bash
curl http://localhost:8000/health
```

Expected response:
```json
{
  "status": "healthy",
  "version": "0.3.0",
  "dependencies": {
    "supabase": { "configured": true },
    "openai": { "configured": true },
    "anthropic": { "configured": true },
    "auth": { "api_key_configured": true }
  }
}
```

#### 4. Test PropertyAudit (Still Using TypeScript)

```bash
# With PROPERTYAUDIT_USE_DATA_ENGINE=false
# PropertyAudit runs should use TypeScript processor
# Check logs for: "⚠️  [PropertyAudit] Using TypeScript processor (legacy)"
```

#### 5. Enable Data-Engine Execution

Update `.env.local`:
```bash
PROPERTYAUDIT_USE_DATA_ENGINE=true
```

Restart Next.js dev server:
```bash
npm run dev
```

#### 6. Test PropertyAudit (Now Using Data-Engine)

```bash
# Trigger a PropertyAudit run via UI or API
# Check logs for: "✅ [PropertyAudit] Using data-engine for run {id}"
```

Monitor in data-engine logs:
```bash
# Data-engine terminal should show:
# [PropertyAudit] Job request received for run_id={id}
# [PropertyAudit] Starting execution for run_id={id}
# [PropertyAudit] Processing query 1/10: ...
# [PropertyAudit] Completed run_id={id}: 10 queries processed
```

#### 7. Rollback If Needed

If issues arise, immediately switch back:

```bash
# In .env.local
PROPERTYAUDIT_USE_DATA_ENGINE=false
```

Restart Next.js. **No database changes needed.** TypeScript processor resumes instantly.

---

## Production Deployment

### Vercel Configuration

Add environment variables in Vercel dashboard:

```bash
DATA_ENGINE_URL=https://your-data-engine.herokuapp.com  # Or your deployment URL
DATA_ENGINE_API_KEY=your_production_api_key_here
PROPERTYAUDIT_USE_DATA_ENGINE=false  # Start with false in production!
```

### Data-Engine Deployment (Heroku Example)

```bash
# In p11-platform/services/data-engine
heroku create your-data-engine
heroku config:set DATA_ENGINE_API_KEY="your_api_key"
heroku config:set SUPABASE_URL="https://your-project.supabase.co"
heroku config:set SUPABASE_SERVICE_KEY="your_service_key"
heroku config:set OPENAI_API_KEY="sk-proj-..."
heroku config:set ANTHROPIC_API_KEY="sk-ant-..."

git push heroku main
```

### Enable in Production

1. **Test data-engine health**: `curl https://your-data-engine.herokuapp.com/health`
2. **Monitor logs**: `heroku logs --tail -a your-data-engine`
3. **Flip flag in Vercel**: Set `PROPERTYAUDIT_USE_DATA_ENGINE=true`
4. **Monitor first runs**: Watch both Vercel and Heroku logs
5. **Rollback if needed**: Set `PROPERTYAUDIT_USE_DATA_ENGINE=false` in Vercel

---

## Monitoring & Debugging

### Client-Side Polling

Frontend polls `geo_runs` table for status:

```typescript
// No changes needed - works with both executors
const { data: run } = await supabase
  .from('geo_runs')
  .select('status, progress_pct, error_message')
  .eq('id', runId)
  .single()

// status: 'queued' → 'running' → 'completed'|'failed'
// progress_pct: 0 → 50 → 100
```

### Data-Engine Logs

```bash
# Check job execution logs
heroku logs --tail -a your-data-engine | grep PropertyAudit

# Check for errors
heroku logs --tail -a your-data-engine | grep ERROR
```

### Next.js Logs

```bash
# Check which executor is being used
vercel logs | grep "PropertyAudit"

# Should see either:
# "✅ [PropertyAudit] Using data-engine for run {id}"
# "⚠️  [PropertyAudit] Using TypeScript processor (legacy)"
```

### Supabase Queries

```sql
-- Check recent runs
SELECT id, status, progress_pct, started_at, finished_at, error_message
FROM geo_runs
ORDER BY started_at DESC
LIMIT 10;

-- Check for stalled jobs (running > 1 hour)
SELECT id, status, progress_pct, started_at, 
       EXTRACT(EPOCH FROM (NOW() - started_at))/60 as minutes_running
FROM geo_runs
WHERE status = 'running'
  AND started_at < NOW() - INTERVAL '1 hour';
```

---

## Phase 2: ReviewFlow Migration

### Status: 🚧 Planned (Not Yet Implemented)

**Steps:**
1. Create `reviewflow_analysis_runs` table (domain-specific job tracking)
2. Implement Python batch analysis endpoint
3. Add feature flag: `REVIEWFLOW_USE_DATA_ENGINE`
4. Update `/api/reviewflow/analyze-batch/route.ts` with feature flag logic

### Environment Variable

```bash
REVIEWFLOW_USE_DATA_ENGINE=false  # To be added in Phase 2
```

---

## Phase 3: Knowledge Refresh Migration

### Status: 🚧 Planned (Not Yet Implemented)

**Steps:**
1. Implement Python knowledge refresh endpoint
2. Add feature flag: `KNOWLEDGE_REFRESH_USE_DATA_ENGINE`
3. Update `/api/cron/knowledge-refresh/route.ts` with feature flag logic
4. Stop chaining Next.js → Next.js requests

### Environment Variable

```bash
KNOWLEDGE_REFRESH_USE_DATA_ENGINE=false  # To be added in Phase 3
```

---

## Troubleshooting

### Issue: Data-Engine Returns 401 Unauthorized

**Cause:** Missing or incorrect API key

**Solution:**
```bash
# Check API key is set in data-engine
heroku config:get DATA_ENGINE_API_KEY -a your-data-engine

# Check API key matches in Next.js
vercel env pull
cat .env.local | grep DATA_ENGINE_API_KEY
```

### Issue: Data-Engine Returns 404 Run Not Found

**Cause:** Run record not created in Supabase before calling data-engine

**Solution:** Check Next.js logs to ensure `geo_runs` insert succeeded before calling data-engine

### Issue: Run Stuck in "Running" Status

**Cause:** Data-engine crashed or lost connection

**Solutions:**
1. Check data-engine logs: `heroku logs --tail -a your-data-engine`
2. Check for Python errors in logs
3. Manually update run status in Supabase:
   ```sql
   UPDATE geo_runs 
   SET status = 'failed', 
       error_message = 'Data-engine timeout',
       finished_at = NOW()
   WHERE id = 'your-run-id';
   ```
4. Consider rollback: `PROPERTYAUDIT_USE_DATA_ENGINE=false`

### Issue: TypeScript Processor Timing Out

**Symptom:** Runs fail with timeout errors when using TypeScript

**Solution:** This is exactly why the migration exists! Enable data-engine:
```bash
PROPERTYAUDIT_USE_DATA_ENGINE=true
```

---

## Performance Comparison

### TypeScript Processor (Legacy)

| Metric | Value |
|--------|-------|
| Max Runtime | 5-10 minutes (Vercel limit) |
| Suitable For | < 10 queries |
| Risk | High (timeout failures) |
| Cost | Vercel compute time |

### Data-Engine (New)

| Metric | Value |
|--------|-------|
| Max Runtime | Unlimited |
| Suitable For | Any number of queries |
| Risk | Low (no timeouts) |
| Cost | Heroku/server compute time |

---

## Migration Checklist

### Pre-Deployment

- [ ] Database migration applied (`20251218000000_add_geo_runs_progress.sql`)
- [ ] Data-engine deployed with health check passing
- [ ] API keys configured in both Next.js and data-engine
- [ ] Feature flag set to `false` initially

### Testing

- [ ] Health endpoint returns `healthy` status
- [ ] PropertyAudit runs work with TypeScript processor (flag=false)
- [ ] PropertyAudit runs work with data-engine (flag=true)
- [ ] Progress updates visible in Supabase
- [ ] Frontend polling works correctly
- [ ] Error handling works (test with invalid run_id)

### Rollout

- [ ] Deploy to staging with `PROPERTYAUDIT_USE_DATA_ENGINE=false`
- [ ] Test in staging with `PROPERTYAUDIT_USE_DATA_ENGINE=true`
- [ ] Monitor staging for 24 hours
- [ ] Deploy to production with `PROPERTYAUDIT_USE_DATA_ENGINE=false`
- [ ] Gradually enable in production (1% → 10% → 100%)
- [ ] Monitor error rates and performance

### Rollback Plan

- [ ] Document rollback command: `vercel env add PROPERTYAUDIT_USE_DATA_ENGINE false`
- [ ] Test rollback in staging
- [ ] Ensure TypeScript processor still works after rollback
- [ ] Have rollback communication plan ready

---

## FAQ

### Q: Will existing TypeScript code be deleted?

**A:** No! The TypeScript processor stays in the codebase as a permanent fallback. Only the routing logic changes via feature flag.

### Q: What happens to in-flight jobs if I toggle the flag?

**A:** In-flight jobs continue with their current executor. The flag only affects NEW jobs triggered after the change.

### Q: Can I use different flags per environment?

**A:** Yes! Set `PROPERTYAUDIT_USE_DATA_ENGINE=true` in production and `false` in staging, or vice versa.

### Q: How do I test data-engine locally without breaking production?

**A:** Run data-engine locally (`python main.py`) and set `DATA_ENGINE_URL=http://localhost:8000` in your local `.env.local`.

### Q: What if data-engine crashes?

**A:** Runs in progress will be marked as stalled (no progress updates). Set flag to `false` to route new jobs to TypeScript processor. Fix data-engine and redeploy.

### Q: Do I need to migrate ReviewFlow and Knowledge Refresh immediately?

**A:** No! Phases 2 and 3 are independent. PropertyAudit (Phase 1) can run on data-engine while others stay in TypeScript indefinitely.

---

## Support

For issues or questions:
1. Check this guide's Troubleshooting section
2. Review data-engine logs: `heroku logs --tail -a your-data-engine`
3. Check Next.js logs in Vercel dashboard
4. Query Supabase `geo_runs` table for run status
5. Create an issue in the repository with logs attached

---

## Summary

✅ **Zero-downtime migration** via feature flags  
✅ **Instant rollback** capability  
✅ **No data loss** risk  
✅ **Solves timeout issues** permanently  
✅ **TypeScript fallback** always available  

**Recommended Rollout:** Start with `PROPERTYAUDIT_USE_DATA_ENGINE=false`, test thoroughly, then flip to `true` when confident.


