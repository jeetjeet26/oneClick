# P11 Platform - Heroku Deployment Guide

This guide covers deploying the P11 Platform to Heroku. The platform consists of two apps:

1. **Web App** (Next.js) - The main dashboard
2. **Data Engine** (Python/FastAPI) - ETL pipelines

---

## Prerequisites

- [Heroku CLI](https://devcenter.heroku.com/articles/heroku-cli) installed
- Heroku account with billing enabled (for add-ons)
- Git repository initialized

```bash
# Install Heroku CLI (if not installed)
# macOS
brew tap heroku/brew && brew install heroku

# Windows
# Download from https://devcenter.heroku.com/articles/heroku-cli

# Login to Heroku
heroku login
```

---

## Part 1: Deploy the Web App (Next.js)

### 1.1 Create the Heroku App

```bash
cd p11-platform/apps/web

# Create a new Heroku app
heroku create p11-web --remote heroku-web

# Or connect to existing app
# heroku git:remote -a p11-web -r heroku-web
```

### 1.2 Set Buildpack

```bash
# Use the Node.js buildpack
heroku buildpacks:set heroku/nodejs -a p11-web
```

### 1.3 Configure Environment Variables

```bash
# Supabase (Required)
heroku config:set NEXT_PUBLIC_SUPABASE_URL="https://your-project.supabase.co" -a p11-web
heroku config:set NEXT_PUBLIC_SUPABASE_ANON_KEY="eyJhbGciOiJIUzI1NiIs..." -a p11-web
heroku config:set SUPABASE_SERVICE_ROLE_KEY="eyJhbGciOiJIUzI1NiIs..." -a p11-web

# Site URL (use your Heroku app URL)
heroku config:set NEXT_PUBLIC_SITE_URL="https://p11-web.herokuapp.com" -a p11-web

# OpenAI (Required for LumaLeasing)
heroku config:set OPENAI_API_KEY="sk-proj-..." -a p11-web

# Default Property (for development)
heroku config:set NEXT_PUBLIC_DEFAULT_PROPERTY_ID="your-uuid-here" -a p11-web
```

### 1.4 Deploy

```bash
# From the apps/web directory
git subtree push --prefix p11-platform/apps/web heroku-web main

# Or deploy from the monorepo root with a subtree
# First time: Add the subtree
cd ../../..  # Go to repo root
git subtree split --prefix p11-platform/apps/web -b web-deploy
git push heroku-web web-deploy:main

# Alternative: Use Heroku's monorepo support
heroku config:set PROJECT_PATH=p11-platform/apps/web -a p11-web
heroku buildpacks:add -i 1 https://github.com/lstoll/heroku-buildpack-monorepo -a p11-web
git push heroku-web main
```

### 1.5 Verify Deployment

```bash
# Open the app
heroku open -a p11-web

# Check logs
heroku logs --tail -a p11-web
```

---

## Part 2: Deploy the Data Engine (Python)

### 2.1 Create the Heroku App

```bash
cd p11-platform/services/data-engine

# Create a new Heroku app
heroku create p11-data-engine --remote heroku-data

# Or connect to existing
# heroku git:remote -a p11-data-engine -r heroku-data
```

### 2.2 Set Buildpack

```bash
heroku buildpacks:set heroku/python -a p11-data-engine
```

### 2.3 Configure Environment Variables

```bash
# Supabase (Required)
heroku config:set NEXT_PUBLIC_SUPABASE_URL="https://your-project.supabase.co" -a p11-data-engine
heroku config:set SUPABASE_SERVICE_ROLE_KEY="eyJhbGciOiJIUzI1NiIs..." -a p11-data-engine

# Target Property
heroku config:set TARGET_PROPERTY_ID="your-uuid-here" -a p11-data-engine

# Meta Ads (Optional)
heroku config:set META_ACCESS_TOKEN="EAAxxxxxxx" -a p11-data-engine
heroku config:set META_AD_ACCOUNT_ID="123456789" -a p11-data-engine

# Google Ads (Optional)
heroku config:set GOOGLE_ADS_CUSTOMER_ID="1234567890" -a p11-data-engine
heroku config:set GOOGLE_ADS_DEVELOPER_TOKEN="xxxxx" -a p11-data-engine
heroku config:set GOOGLE_ADS_REFRESH_TOKEN="1//xxxxx" -a p11-data-engine
heroku config:set GOOGLE_ADS_CLIENT_ID="xxxxx.apps.googleusercontent.com" -a p11-data-engine
heroku config:set GOOGLE_ADS_CLIENT_SECRET="xxxxx" -a p11-data-engine

# GA4 (Optional)
heroku config:set GA4_PROPERTY_ID="123456789" -a p11-data-engine
# For GA4 credentials, use base64-encoded JSON:
# cat service-account.json | base64 | heroku config:set GA4_CREDENTIALS_JSON=- -a p11-data-engine
```

### 2.4 Deploy

```bash
# Similar subtree approach
cd ../../..  # Go to repo root
git subtree split --prefix p11-platform/services/data-engine -b data-deploy
git push heroku-data data-deploy:main
```

### 2.5 Set Up Scheduled Pipelines (Heroku Scheduler)

```bash
# Add Heroku Scheduler (free tier available)
heroku addons:create scheduler:standard -a p11-data-engine

# Open scheduler dashboard
heroku addons:open scheduler -a p11-data-engine
```

In the Scheduler dashboard, add a new job:
- **Command:** `python run_pipelines.py`
- **Frequency:** Daily at 12:00 AM UTC

### 2.6 Verify Deployment

```bash
# Open the API docs
heroku open -a p11-data-engine
# Navigate to /docs for Swagger UI

# Test health endpoint
curl https://p11-data-engine.herokuapp.com/health

# Check logs
heroku logs --tail -a p11-data-engine

# Run pipelines manually
heroku run python run_pipelines.py -a p11-data-engine
```

---

## Part 3: Custom Domain Setup (Optional)

### For Web App

```bash
# Add custom domain
heroku domains:add app.p11creative.com -a p11-web

# Get DNS target
heroku domains -a p11-web
# Add CNAME record pointing to the DNS target

# Enable SSL
heroku certs:auto:enable -a p11-web
```

### Update Environment

```bash
heroku config:set NEXT_PUBLIC_SITE_URL="https://app.p11creative.com" -a p11-web
```

---

## Part 4: Monitoring & Maintenance

### View Logs

```bash
# Real-time logs
heroku logs --tail -a p11-web

# Filter by process
heroku logs --tail --ps web -a p11-web
```

### Scale Dynos

```bash
# Scale web dynos
heroku ps:scale web=1 -a p11-web

# For more traffic
heroku ps:scale web=2 -a p11-web
```

### Database Backups

Supabase handles database backups. Check your Supabase dashboard for backup settings.

### Restart Apps

```bash
heroku restart -a p11-web
heroku restart -a p11-data-engine
```

---

## Part 5: CI/CD with Heroku

### Option A: Heroku GitHub Integration

1. Go to Heroku Dashboard > App > Deploy tab
2. Connect to GitHub repository
3. Enable automatic deploys from `main` branch
4. Optionally enable review apps for PRs

### Option B: GitHub Actions

Update `.github/workflows/daily-pipelines.yml` to deploy on push:

```yaml
deploy-web:
  runs-on: ubuntu-latest
  steps:
    - uses: actions/checkout@v4
    - uses: akhileshns/heroku-deploy@v3.13.15
      with:
        heroku_api_key: ${{ secrets.HEROKU_API_KEY }}
        heroku_app_name: "p11-web"
        heroku_email: ${{ secrets.HEROKU_EMAIL }}
        appdir: "p11-platform/apps/web"
```

---

## Environment Variables Summary

### Web App (p11-web)

| Variable | Required | Description |
|----------|----------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | ✅ | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | ✅ | Supabase anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | ✅ | Supabase service key |
| `NEXT_PUBLIC_SITE_URL` | ✅ | App URL (for auth redirects) |
| `OPENAI_API_KEY` | ✅ | OpenAI API key |
| `NEXT_PUBLIC_DEFAULT_PROPERTY_ID` | ⚠️ | Default property UUID |

### Data Engine (p11-data-engine)

| Variable | Required | Description |
|----------|----------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | ✅ | Supabase project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | ✅ | Supabase service key |
| `TARGET_PROPERTY_ID` | ✅ | Property to load data into |
| `META_ACCESS_TOKEN` | ⚠️ | Meta Graph API token |
| `META_AD_ACCOUNT_ID` | ⚠️ | Meta ad account ID |
| `GOOGLE_ADS_*` | ⚠️ | Google Ads credentials |
| `GA4_*` | ⚠️ | GA4 credentials |

---

## Troubleshooting

### Build Fails

```bash
# Check build logs
heroku builds:info -a p11-web

# Clear build cache
heroku builds:cache:purge -a p11-web
```

### App Crashes

```bash
# Check error logs
heroku logs --tail -a p11-web | grep -i error

# Run bash in dyno
heroku run bash -a p11-web
```

### Memory Issues

```bash
# Check memory usage
heroku ps -a p11-web

# Upgrade dyno type
heroku ps:type web=standard-1x -a p11-web
```

---

## Cost Estimate

| Resource | Plan | Monthly Cost |
|----------|------|--------------|
| Web App Dyno | Eco | $5 |
| Data Engine Dyno | Eco | $5 |
| Heroku Scheduler | Free | $0 |
| **Total** | | **~$10/month** |

For production with better performance:
| Resource | Plan | Monthly Cost |
|----------|------|--------------|
| Web App Dyno | Basic | $7 |
| Data Engine Dyno | Basic | $7 |
| Heroku Scheduler | Standard | $0 |
| **Total** | | **~$14/month** |

---

*Last updated: December 9, 2025*

