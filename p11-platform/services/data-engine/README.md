# P11 Data Engine

ETL pipelines for marketing data ingestion AND long-running job execution for P11 Platform. Handles PropertyAudit GEO intelligence, review analysis, and more.

## 🆕 New: PropertyAudit Job Execution (Dec 2025)

The data-engine now handles PropertyAudit runs that previously timed out on Vercel. Features:

- **No Timeout Limits** - Run unlimited queries without Vercel's 5-10 min limit
- **Parallel Execution** - OpenAI and Claude run simultaneously (50% faster)
- **Real-time Progress** - Track completion percentage in real-time
- **Feature Flag Control** - Instant switch between TypeScript/Python execution
- **Full TypeScript Parity** - Same quality results as the Next.js implementation

### Quick Start (PropertyAudit)

```powershell
# Windows PowerShell
cd p11-platform\services\data-engine
.\start.ps1
```

Or manually:

```bash
# Set environment variables
$env:DATA_ENGINE_API_KEY = "your-random-key"
$env:SUPABASE_URL = "https://your-project.supabase.co"
$env:SUPABASE_SERVICE_KEY = "your-service-key"
$env:OPENAI_API_KEY = "sk-proj-..."
$env:ANTHROPIC_API_KEY = "sk-ant-..."

# Start server
python main.py
```

### New Job Execution Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/health` | GET | Health check with dependency status |
| `/jobs/propertyaudit/run` | POST | Execute PropertyAudit job (async) |
| `/jobs/propertyaudit/status/{run_id}` | GET | Check job status |

### Feature Flag Configuration

In `apps/web/.env.local`:

```bash
# false = TypeScript (legacy), true = Python data-engine
PROPERTYAUDIT_USE_DATA_ENGINE=true
DATA_ENGINE_URL=http://localhost:8000
DATA_ENGINE_API_KEY=your-api-key-here
```

### Architecture

```
services/data-engine/
├── main.py                 # FastAPI server + job endpoints
├── connectors/             # LLM connectors (OpenAI, Claude)
│   ├── openai_connector.py           # Structured mode
│   ├── claude_connector.py           # Structured mode
│   ├── openai_natural_connector.py   # Natural two-phase mode
│   ├── claude_natural_connector.py   # Natural two-phase mode
│   ├── cross_model_analyzer.py       # Cross-model analysis
│   ├── evaluator.py                  # GEO scoring formula
│   └── schemas.py                    # JSON schemas
├── jobs/
│   └── propertyaudit.py    # PropertyAudit job executor
├── utils/
│   ├── auth.py             # API key authentication
│   └── config.py           # Environment loading
├── pipelines/              # ETL pipelines (existing)
└── scrapers/               # Web scrapers (existing)
```

See [DATA_ENGINE_MIGRATION.md](../../../docs/DATA_ENGINE_MIGRATION.md) for complete migration guide.

---

## ETL Pipelines (Original)

ETL pipelines for marketing data ingestion. Fetches data from Meta Ads, Google Ads, and GA4, normalizes it, and loads it into Supabase.

## Quick Start

### 1. Setup Environment

```bash
cd services/data-engine

# Create virtual environment
python -m venv venv

# Activate it
# Windows:
.\venv\Scripts\activate
# Mac/Linux:
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt
```

### 2. Configure Environment Variables

```bash
# Copy the example file
cp .env.example .env

# Edit with your credentials
notepad .env  # Windows
# or
nano .env     # Mac/Linux
```

### 3. Run Pipelines

**Option A: Run individual pipelines directly**
```bash
python -m pipelines.meta_ads
python -m pipelines.google_ads
python -m pipelines.ga4
```

**Option B: Run via FastAPI server**
```bash
# Start the server
uvicorn main:app --reload --port 8000

# Then trigger pipelines via API:
# POST http://localhost:8000/pipelines/meta
# POST http://localhost:8000/pipelines/google
# POST http://localhost:8000/pipelines/ga4
# POST http://localhost:8000/pipelines/all
```

## Pipeline Overview

### Meta Ads Pipeline (`pipelines/meta_ads.py`)

Fetches campaign performance data from the Meta (Facebook) Graph API.

**Required Environment Variables:**
- `META_ACCESS_TOKEN` - Long-lived access token from Business Settings
- `META_AD_ACCOUNT_ID` - Your ad account ID (numbers only)

**Data Fetched:**
- Campaign name, ID
- Impressions, clicks, spend
- Conversions (from actions)

### Google Ads Pipeline (`pipelines/google_ads.py`)

Fetches campaign data via Google Ads API using GAQL queries.

**Required Environment Variables:**
- `GOOGLE_ADS_CUSTOMER_ID` - Customer ID (format: 123-456-7890)
- `GOOGLE_ADS_DEVELOPER_TOKEN` - Developer token from API Center
- `GOOGLE_ADS_REFRESH_TOKEN` - OAuth refresh token
- `GOOGLE_ADS_CLIENT_ID` - OAuth client ID
- `GOOGLE_ADS_CLIENT_SECRET` - OAuth client secret

**Data Fetched:**
- Campaign name, ID
- Impressions, clicks
- Cost (converted from micros)
- Conversions

### GA4 Pipeline (`pipelines/ga4.py`)

Fetches analytics data from Google Analytics 4 Data API.

**Required Environment Variables:**
- `GA4_PROPERTY_ID` - Your GA4 property ID (numbers only)
- `GOOGLE_APPLICATION_CREDENTIALS` - Path to service account JSON file
  
  OR
  
- `GA4_CREDENTIALS_JSON` - Service account JSON as a string

**Data Fetched:**
- Sessions, users, pageviews
- Source/medium/campaign (UTM data)
- Conversions
- Engagement metrics

**Setup Steps for GA4:**
1. Create a Service Account in Google Cloud Console
2. Enable the Google Analytics Data API
3. Add the service account email to your GA4 property (Admin > Property Access Management > Add users)
4. Download the JSON key file

## Data Schema

All pipelines normalize data to the `fact_marketing_performance` table:

| Column | Type | Description |
|--------|------|-------------|
| date | DATE | Data date |
| property_id | UUID | Multi-tenant property reference |
| channel_id | TEXT | Source: 'meta', 'google_ads', 'ga4' |
| campaign_name | TEXT | Campaign name |
| campaign_id | TEXT | Platform campaign ID |
| impressions | INT | View count |
| clicks | INT | Click count |
| spend | DECIMAL | Ad spend (USD) |
| conversions | INT | Conversion count |

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/` | GET | Service info and available pipelines |
| `/health` | GET | Health check |
| `/pipelines/meta` | POST | Run Meta Ads pipeline |
| `/pipelines/google` | POST | Run Google Ads pipeline |
| `/pipelines/ga4` | POST | Run GA4 pipeline |
| `/pipelines/all` | POST | Run all pipelines |
| `/pipelines/status` | GET | Check pipeline configuration status |

## Troubleshooting

### "Module not found" errors
Make sure you're running from the `data-engine` directory and your virtual environment is activated.

### "Credentials not found" errors
Check that your `.env` file exists and contains the required variables. The loader looks for `.env` in the `p11-platform` root directory first, then falls back to `data-engine/.env`.

### GA4 "Permission denied"
Make sure the service account email has been added to your GA4 property with at least "Viewer" access.

### Data not appearing in dashboard
1. Check the `TARGET_PROPERTY_ID` matches a property in your Supabase database
2. Verify the date range in the dashboard matches the data dates
3. Check Supabase logs for any insertion errors

