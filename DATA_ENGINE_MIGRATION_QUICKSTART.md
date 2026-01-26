# Data Engine Migration - Quick Start

## 🚀 TL;DR

Feature flags let you switch between TypeScript and Python execution with **zero downtime** and **instant rollback**.

---

## 📋 Quick Reference

### Environment Variables (.env.local)

```bash
# Data Engine Connection
DATA_ENGINE_URL=http://localhost:8000
DATA_ENGINE_API_KEY=your_random_api_key_here

# Feature Flags (false = TypeScript, true = Python)
PROPERTYAUDIT_USE_DATA_ENGINE=false      # ✅ Phase 1 (Ready)
REVIEWFLOW_USE_DATA_ENGINE=false         # 🚧 Phase 2 (Not Yet)
KNOWLEDGE_REFRESH_USE_DATA_ENGINE=false  # 🚧 Phase 3 (Not Yet)
```

---

## 🎯 How to Use

### Option 1: Use TypeScript (Safe Fallback)

```bash
# .env.local
PROPERTYAUDIT_USE_DATA_ENGINE=false
```

✅ Existing code path  
✅ Works immediately  
⚠️ Subject to Vercel timeouts  

### Option 2: Use Data-Engine (No Timeouts)

```bash
# .env.local
PROPERTYAUDIT_USE_DATA_ENGINE=true
DATA_ENGINE_URL=http://localhost:8000
DATA_ENGINE_API_KEY=abc123...
```

✅ No timeout limits  
✅ Handles unlimited queries  
⚠️ Requires data-engine running  

---

## 🔄 Switching Modes

### To Enable Data-Engine

1. Start data-engine: `cd services/data-engine && python main.py`
2. Update `.env.local`: `PROPERTYAUDIT_USE_DATA_ENGINE=true`
3. Restart Next.js: `npm run dev`

### To Rollback to TypeScript

1. Update `.env.local`: `PROPERTYAUDIT_USE_DATA_ENGINE=false`
2. Restart Next.js: `npm run dev`
3. Data-engine can stay running or be stopped

---

## 📊 What Happens When You Change the Flag?

| Component | Impact |
|-----------|--------|
| **Database** | None (same tables used by both) |
| **In-flight jobs** | Continue with current executor |
| **New jobs** | Use new executor immediately |
| **Frontend** | None (polls Supabase regardless) |
| **Existing code** | None (both paths remain intact) |

---

## 🧪 Testing Locally

### 1. Start Services

```bash
# Terminal 1: Data-Engine
cd p11-platform/services/data-engine
export DATA_ENGINE_API_KEY="test-key-123"
export SUPABASE_URL="https://your-project.supabase.co"
export SUPABASE_SERVICE_KEY="your_service_key"
export OPENAI_API_KEY="sk-proj-..."
python main.py

# Terminal 2: Next.js
cd p11-platform/apps/web
npm run dev
```

### 2. Test Health

```bash
curl http://localhost:8000/health
```

Expected:
```json
{"status": "healthy", "dependencies": {...}}
```

### 3. Test PropertyAudit

```bash
# With flag=false: Uses TypeScript
# Check logs for: "⚠️ Using TypeScript processor (legacy)"

# With flag=true: Uses data-engine
# Check logs for: "✅ Using data-engine for run {id}"
```

---

## 🚨 Troubleshooting

### Data-Engine Not Responding

```bash
# Check if running
curl http://localhost:8000/health

# If not, start it
cd services/data-engine
python main.py
```

### 401 Unauthorized

```bash
# Check API key matches
echo $DATA_ENGINE_API_KEY  # In data-engine terminal
cat .env.local | grep DATA_ENGINE_API_KEY  # In Next.js
```

### Run Stuck in "Running"

```sql
-- Check run status
SELECT id, status, progress_pct, started_at, error_message
FROM geo_runs
WHERE status = 'running'
ORDER BY started_at DESC;

-- Force reset if needed
UPDATE geo_runs
SET status = 'failed', 
    error_message = 'Manual reset',
    finished_at = NOW()
WHERE id = 'your-run-id';
```

### Rollback Immediately

```bash
# In .env.local
PROPERTYAUDIT_USE_DATA_ENGINE=false

# Restart Next.js
# Ctrl+C, then: npm run dev
```

---

## 📦 Files Changed

### New Files
- `services/data-engine/utils/auth.py` - API key authentication
- `services/data-engine/jobs/__init__.py` - Job execution modules
- `services/data-engine/jobs/propertyaudit.py` - PropertyAudit executor
- `supabase/migrations/20251218000000_add_geo_runs_progress.sql` - Progress tracking
- `docs/DATA_ENGINE_MIGRATION.md` - Full migration guide

### Modified Files
- `apps/web/.env.example` - Added feature flags and data-engine config
- `apps/web/app/api/propertyaudit/run/route.ts` - Added feature flag logic
- `services/data-engine/main.py` - Added auth, health check, job endpoints

### Unchanged Files (Fallback Preserved!)
- `apps/web/app/api/propertyaudit/process/route.ts` - TypeScript processor intact
- All frontend components - No changes needed
- All database tables - No breaking changes

---

## 🎓 Key Concepts

### Feature Flag = Execution Router

```typescript
if (USE_DATA_ENGINE) {
  // Call Python data-engine
  fetch(`${DATA_ENGINE_URL}/jobs/propertyaudit/run`, {...})
} else {
  // Call TypeScript processor (existing code)
  fetch(`${baseUrl}/api/propertyaudit/process`, {...})
}
```

### Same Database = No Migration Risk

Both executors write to:
- `geo_runs` - Job tracking
- `geo_queries` - Query definitions  
- `geo_answers` - LLM responses
- `geo_scores` - Aggregate scores
- `geo_citations` - Source citations

Frontend doesn't know (or care) which executor ran the job.

### API Key = Security

Data-engine requires `X-API-Key` header to prevent unauthorized job execution. Generate with:

```bash
openssl rand -hex 32
```

---

## 🎯 Production Deployment

### Step 1: Deploy Data-Engine

```bash
# Heroku example
cd services/data-engine
heroku create your-data-engine
heroku config:set DATA_ENGINE_API_KEY="..."
heroku config:set SUPABASE_URL="..."
heroku config:set SUPABASE_SERVICE_KEY="..."
heroku config:set OPENAI_API_KEY="..."
git push heroku main
```

### Step 2: Configure Vercel

Add environment variables in Vercel dashboard:

```
DATA_ENGINE_URL=https://your-data-engine.herokuapp.com
DATA_ENGINE_API_KEY=your_production_key
PROPERTYAUDIT_USE_DATA_ENGINE=false  # Start safe!
```

### Step 3: Test in Production

1. Deploy with `flag=false` (uses TypeScript)
2. Verify PropertyAudit runs work
3. Check data-engine health: `curl https://your-data-engine.herokuapp.com/health`
4. Change to `flag=true` in Vercel dashboard
5. Trigger test PropertyAudit run
6. Monitor logs in both Vercel and Heroku

### Step 4: Rollback If Needed

In Vercel dashboard, change:
```
PROPERTYAUDIT_USE_DATA_ENGINE=false
```

Takes effect immediately. No code deployment needed.

---

## 📚 Full Documentation

See [DATA_ENGINE_MIGRATION.md](./docs/DATA_ENGINE_MIGRATION.md) for complete details including:
- Architecture diagrams
- Phase 2 & 3 planning
- Performance comparisons
- Advanced troubleshooting
- FAQ

---

## ✅ Migration Status

| Phase | Feature | Status | Flag |
|-------|---------|--------|------|
| 1 | PropertyAudit | ✅ Ready | `PROPERTYAUDIT_USE_DATA_ENGINE` |
| 2 | ReviewFlow | 🚧 Planned | `REVIEWFLOW_USE_DATA_ENGINE` |
| 3 | Knowledge Refresh | 🚧 Planned | `KNOWLEDGE_REFRESH_USE_DATA_ENGINE` |

---

## 🆘 Need Help?

1. Check logs: `heroku logs --tail -a your-data-engine`
2. Test health: `curl http://localhost:8000/health`
3. Query database: `SELECT * FROM geo_runs ORDER BY started_at DESC LIMIT 5`
4. Read full guide: [DATA_ENGINE_MIGRATION.md](./docs/DATA_ENGINE_MIGRATION.md)

---

**Remember:** TypeScript fallback is always available. If in doubt, set `PROPERTYAUDIT_USE_DATA_ENGINE=false` and you're back to the working state instantly.






