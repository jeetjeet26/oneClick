# P11 Platform - The Autonomous Marketing Agency

> **"The One-Click Agency"** - AI-powered marketing automation for multifamily real estate

**Status:** Production Ready | **Version:** 1.0 | **Last Updated:** Dec 10, 2025

---

## 🎯 What is P11?

P11 Platform is an **all-in-one AI marketing operating system** for apartment communities. It replaces 10+ disconnected tools with a unified platform that automates:

- 📱 **Lead nurturing** (TourSpark™ + LeadPulse™)
- 💬 **24/7 AI leasing agent** (LumaLeasing™)
- ⭐ **Review management** (ReviewFlow AI™)
- 🎨 **Content generation** (ForgeStudio™)
- 📊 **Competitive intelligence** (MarketVision 360™)
- 📈 **Multi-channel analytics** (Unified BI Dashboard)

**Result:** Property managers scale from 10-12 properties to **30-40 properties** per person.

---

## 🚀 Core Products (All Live)

### ✅ TourSpark™ - CRM & Tour Automation
**Status:** 100% Complete

- Lead management dashboard with activity timeline
- Automated tour scheduling with calendar invites
- Multi-channel follow-ups (SMS + Email)
- 3 default workflow templates (new lead nurture, no-show recovery, post-tour)
- Workflow settings page with on/off toggles
- Real-time lead activity tracking

**Tech:** Next.js, Supabase, Twilio, Resend

### ✅ LeadPulse™ - Predictive Lead Scoring
**Status:** 100% Complete

- 5-dimensional scoring algorithm (engagement, timing, source, completeness, behavior)
- Score buckets: Hot (70+), Warm (45-69), Cold (25-44), Unqualified (<25)
- Automatic scoring on lead creation
- Visual score badges in UI
- Database function: `score_lead(lead_id)`

**Tech:** PostgreSQL pl/pgsql, JSONB

### ✅ LumaLeasing™ - AI Leasing Chatbot
**Status:** 100% Complete

- RAG-powered chatbot with pgvector semantic search
- Embeddable web widget
- SMS/Email integration
- Human takeover capability
- Conversation analytics
- PDF document upload with auto-chunking

**Tech:** OpenAI GPT-4o-mini, pgvector, Twilio

### ✅ ReviewFlow AI™ - Review Management
**Status:** 95% Complete

- Multi-source review aggregation (Google, Yelp, manual)
- AI-powered response generation
- Sentiment analysis & topic extraction
- Approval workflow (Draft → Approve → Post)
- Ticket system for negative reviews
- Auto-sync via CRON

**Tech:** OpenAI GPT-4o-mini, Google Business Profile API

### ✅ ForgeStudio™ - AI Content Generation
**Status:** 95% Complete

- Text-to-video generation (Google Veo 3)
- Image-to-video animation
- Social media content creation
- Per-property brand voice
- Content asset library
- OAuth per-property for Instagram/Facebook

**Tech:** Google Imagen 3, Veo 3, Gemini 2.0 Flash

### ✅ MarketVision 360™ - Competitive Intelligence
**Status:** 95% Complete

- Automated competitor scraping (Apartments.com, Zillow)
- Brand intelligence extraction via AI
- Pricing & availability tracking
- Vector search for competitive analysis
- Market alerts for price changes

**Tech:** Python Playwright, BeautifulSoup, OpenAI embeddings

---

## 🏗️ Architecture

```
p11-platform/
├── apps/web/                    # Next.js 14 web app
│   ├── app/                     # App router
│   │   ├── dashboard/           # Main dashboard (leads, analytics, settings)
│   │   ├── api/                 # API routes (90+ endpoints)
│   │   │   ├── leads/           # Lead management + tours
│   │   │   ├── workflows/       # Workflow automation
│   │   │   ├── leadpulse/       # Scoring API
│   │   │   ├── lumaleasing/     # Chat widget API
│   │   │   ├── reviewflow/      # Review management
│   │   │   ├── forgestudio/     # Content generation
│   │   │   └── marketvision/    # Competitor intelligence
│   │   └── auth/                # Supabase Auth
│   ├── components/              # React components
│   │   ├── leads/               # ActivityTimeline, TourScheduleModal
│   │   ├── charts/              # Analytics visualizations
│   │   ├── reviewflow/          # Review management UI
│   │   └── forgestudio/         # Content generation UI
│   └── utils/                   # Utilities & services
│       ├── supabase/            # DB clients
│       └── services/            # Workflow processor, messaging, etc.
├── services/
│   ├── data-engine/             # Python data pipelines
│   │   ├── scrapers/            # Competitor scrapers
│   │   └── pipelines/           # ETL jobs
│   └── mcp-servers/             # MCP servers for Google/Meta Ads
│       ├── google-ads/          # Google Ads MCP
│       └── meta-ads/            # Meta Ads MCP
└── supabase/
    └── migrations/              # Database migrations (12 total)
        └── 20251212000000_crm_mvp_schema.sql  # CRM tables
```

---

## 🗄️ Database Schema Highlights

**Core Tables:**
- `organizations` - Multi-tenant companies
- `properties` - Apartment communities
- `profiles` - Users with org/property access
- `leads` - Lead tracking with scoring
- `tours` - Tour scheduling
- `conversations` / `messages` - Chat history
- `documents` - RAG knowledge base (pgvector)

**CRM Tables (NEW - Dec 2025):**
- `workflow_definitions` - Automation templates
- `lead_workflows` - Active workflow instances
- `workflow_actions` - Execution log
- `follow_up_templates` - Message templates
- `lead_activities` - Activity timeline
- `lead_scores` - LeadPulse scoring
- `lead_engagement_events` - Event tracking

**Content & Reviews:**
- `reviews` / `review_responses` - ReviewFlow
- `content_drafts` / `content_assets` - ForgeStudio
- `competitors` / `competitor_brand_intelligence` - MarketVision

**Analytics:**
- `fact_marketing_performance` - Unified metrics
- `ad_account_connections` - Platform integrations

---

## ⚡ Quick Start

### 1. Prerequisites

- Node.js 20.11+
- Python 3.11+
- Supabase project
- OpenAI API key
- Twilio account (for SMS)
- Resend account (for email)

### 2. Install Dependencies

```bash
# Web app
cd apps/web
npm install

# Data engine
cd ../../services/data-engine
python -m venv venv
venv\Scripts\activate  # Windows
# source venv/bin/activate  # Mac/Linux
pip install -r requirements.txt
```

### 3. Environment Variables

Create `apps/web/.env.local`:

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# OpenAI
OPENAI_API_KEY=sk-...

# Messaging
TWILIO_ACCOUNT_SID=ACxxxxx
TWILIO_AUTH_TOKEN=xxxxx
TWILIO_PHONE_NUMBER=+1234567890
RESEND_API_KEY=re_xxxxx
RESEND_FROM_EMAIL=noreply@yourdomain.com

# Workflow CRON
CRON_SECRET=your-random-secret

# Google (ForgeStudio)
GOOGLE_CLOUD_PROJECT_ID=your-project-id
GOOGLE_APPLICATION_CREDENTIALS=path/to/service-account.json

# Site URL
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

### 4. Run Migrations

```bash
cd supabase
# Migrations applied via Supabase MCP (already done!)
```

### 5. Start Development Server

```bash
cd apps/web
npm run dev
```

Visit <http://localhost:3000> — authenticated users land at `/dashboard`.

---

## 🎨 Features by Module

### TourSpark™ (CRM)

**Lead Dashboard** (`/dashboard/leads`)
- Filter by status, source, search
- LeadPulse score display
- Quick status updates
- Pagination & sorting

**Lead Detail Drawer**
- Contact information with edit capability
- Activity timeline (notes, tours, emails, status changes)
- Tour scheduling modal
- Send SMS/Email
- Workflow automation status
- Conversation history

**Tour Scheduling**
- 3 tour types: In-Person, Virtual, Self-Guided
- Calendar integration (.ics attachments)
- Auto-confirmation emails
- Reschedule/Cancel capability
- Agent assignment

**Workflow Automation**
- 3 pre-built workflows (lead nurture, no-show recovery, post-tour)
- CRON processor runs every 10 minutes
- Pause/Resume/Stop per lead
- Settings page: `/dashboard/settings/workflows`

### LumaLeasing™ (Chat Widget)

**Admin Interface** (`/dashboard/lumaleasing`)
- Document management (upload PDFs, txt files)
- Conversation history
- Human takeover mode
- Widget configuration
- Conversation analytics

**Chat Widget** (Embeddable)
- Semantic search via pgvector
- GPT-4o-mini responses
- Lead capture form
- Tour booking integration
- Multi-channel (web, SMS, email)

### ReviewFlow AI™ (Reviews)

**Review Dashboard** (`/dashboard/reviewflow`)
- Multi-platform aggregation (Google, Yelp)
- Sentiment analysis
- AI response generation (4 tone options)
- Approval workflow
- Ticket system for negative reviews
- Auto-sync via CRON

### ForgeStudio™ (Content)

**Content Generation** (`/dashboard/forgestudio`)
- Text-to-video (Google Veo 3)
- Image-to-video animation
- Social media captions
- Asset library
- Per-property OAuth for social posting

### MarketVision 360™ (Competitors)

**Competitor Intelligence** (`/dashboard/marketvision`)
- Automated scraping (Apartments.com, Zillow)
- Brand voice analysis
- Pricing tracking
- Market alerts
- Competitor comparison

---

## 🔌 Key API Endpoints

### Lead Management
```
GET    /api/leads?propertyId=...&status=...&page=1
POST   /api/leads - Create new lead
PATCH  /api/leads - Update lead (status, contact, source, etc.)
GET    /api/leads/[id]/activities - Activity timeline
POST   /api/leads/[id]/activities - Add note/activity
GET    /api/leads/[id]/tours - List tours
POST   /api/leads/[id]/tours - Schedule tour
PATCH  /api/leads/[id]/tours - Update tour
DELETE /api/leads/[id]/tours - Cancel tour
GET    /api/leads/[id]/workflow - Workflow status
PATCH  /api/leads/[id]/workflow - Pause/Resume/Stop
POST   /api/leads/[id]/send-message - Send SMS/Email
```

### Workflows
```
GET    /api/workflows/templates?propertyId=... - List workflows
POST   /api/workflows/templates - Create or seed defaults
PATCH  /api/workflows/templates - Update workflow
POST   /api/workflows/process - CRON processor
```

### LeadPulse
```
GET    /api/leadpulse/score?leadId=... - Get score
POST   /api/leadpulse/score - Calculate/recalculate
GET    /api/leadpulse/insights?propertyId=... - Analytics
POST   /api/leadpulse/events - Track engagement event
```

### LumaLeasing
```
POST   /api/chat - Admin chat
POST   /api/lumaleasing/chat - Widget chat (public)
GET    /api/lumaleasing/tours - Available slots
POST   /api/lumaleasing/tours - Book tour
```

### ReviewFlow
```
GET    /api/reviewflow/reviews?propertyId=...&status=...
POST   /api/reviewflow/respond - Generate AI response
POST   /api/reviewflow/sync - Sync from platforms
POST   /api/reviewflow/connections - Connect platform
POST   /api/reviewflow/analyze-batch - Batch analysis
```

### ForgeStudio
```
POST   /api/forgestudio/generate - Text content
POST   /api/forgestudio/assets/generate - Video/image generation
POST   /api/forgestudio/social/config - OAuth config
```

### MarketVision
```
GET    /api/marketvision/competitors?propertyId=...
POST   /api/marketvision/brand-intelligence - Analyze competitor
GET    /api/marketvision/brand-intelligence/[competitorId]
```

---

## 🎯 Key Metrics & Impact

| Metric                | Traditional    | With P11       |
| --------------------- | -------------- | -------------- |
| Response Time         | Hours          | **Seconds**    |
| Content Output        | 50-75/month    | **300+/month** |
| Properties per AM     | 10-12          | **30-40**      |
| Campaign Optimization | Business hours | **24/7/365**   |
| Review Response Time  | Days           | **< 1 hour**   |
| Tour Confirmation     | Manual         | **Instant AI** |
| Lead Follow-up        | Manual         | **Automated**  |

---

## 🗺️ Roadmap

### ✅ Q4 2025 — Foundation (Complete)

* Data Lake infrastructure
* LumaLeasing RAG chatbot
* MultiChannel BI dashboard
* ForgeStudio content generation
* Community onboarding wizard

### ✅ Q1 2026 — Intelligence (Complete - Dec 2025!)

* ✅ **TourSpark™ CRM** - Lead management + workflows
* ✅ **LeadPulse™** - Predictive scoring
* ✅ MarketVision competitor scraping
* ✅ Brand Intelligence AI analysis
* ✅ ReviewFlow multi-source (Google, Yelp)
* ✅ ForgeStudio Veo 3 video generation
* ✅ Website Intelligence scraping
* ✅ Per-property social OAuth
* ✅ AI tour confirmations
* ✅ Activity timeline & notes

### 🔨 Q2 2026 — Scale

* Advanced pipeline configuration UI
* LLM-powered CRM configurator
* SocialPilot auto-posting
* AdForge ad generation
* SearchBoost SEO automation
* Workflow analytics dashboard

### 📋 Q3-Q4 2026 — Optimization

* ChurnSignal retention prediction
* TrueSource attribution
* ML-based lead scoring
* Full autonomous operations

---

## 📊 Product Status

| Product              | Status      | Completion | Next Steps                      |
| -------------------- | ----------- | ---------- | ------------------------------- |
| TourSpark™ CRM       | ✅ Live     | 100%       | Workflow analytics              |
| LeadPulse™ Scoring   | ✅ Live     | 100%       | ML-based scoring                |
| LumaLeasing™ Chat    | ✅ Live     | 100%       | DOCX support                    |
| ReviewFlow AI™       | ✅ Live     | 95%        | Yelp API, Apartments.com        |
| ForgeStudio™ Content | ✅ Live     | 95%        | LinkedIn, TikTok support        |
| MarketVision 360™    | ✅ Live     | 95%        | Proxy support, more scrapers    |
| MultiChannel BI      | 🔨 Progress | 80%        | Meta Ads MCP integration        |

---

## 🛠️ Tech Stack

**Frontend:**
- Next.js 14 (App Router)
- TypeScript
- Tailwind CSS
- Shadcn/UI components

**Backend:**
- Supabase (PostgreSQL + Auth + Storage)
- pgvector for semantic search
- Row Level Security (RLS)
- Vercel CRON jobs

**AI/ML:**
- OpenAI GPT-4o-mini (chat, content)
- OpenAI text-embedding-3-small (RAG)
- Google Gemini 2.0 Flash (content)
- Google Veo 3 (video generation)
- Google Imagen 3 (image generation)

**Integrations:**
- Twilio (SMS)
- Resend (Email)
- Google Business Profile API
- Google Ads API (MCP)
- Meta Ads API (MCP)

**Data Processing:**
- Python FastAPI (data-engine)
- Playwright (web scraping)
- BeautifulSoup (parsing)

---

## 🧪 Development

```bash
# Start web app
cd apps/web
npm run dev

# Start data engine (Python)
cd services/data-engine
python -m uvicorn main:app --reload --port 8000

# Type check
npm run type-check

# Lint
npm run lint

# Build
npm run build
```

---

## 📚 Documentation

- **CRM Implementation:** `CRM_MVP_IMPLEMENTATION_COMPLETE.md`
- **Quick Start Guide:** `CRM_QUICK_START.md`
- **Product Specs:** `Product_Tech_Specs.md`
- **Roadmap:** `P11_Product_Roadmap_RICE_Analysis.md`
- **Progress Report:** `Progress_Analysis_Report.md`

---

## 🚢 Deployment

### Vercel (Web App)

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel --prod
```

**Required Environment Variables:**
- All `.env.local` variables (see Quick Start)
- Add `CRON_SECRET` for workflow processor

**CRON Jobs:** Add to `vercel.json`:
```json
{
  "crons": [
    { "path": "/api/workflows/process", "schedule": "*/10 * * * *" },
    { "path": "/api/reviewflow/sync-all", "schedule": "0 * * * *" }
  ]
}
```

### Heroku (Data Engine)

```bash
# Deploy Python services
cd services/data-engine
git push heroku main

# Add scheduler
heroku addons:create scheduler:standard
```

---

## 🎉 Recent Updates (Dec 10, 2025)

### CRM MVP Launched! 🚀

**What's New:**
- ✅ 12 new database tables for CRM functionality
- ✅ Lead activity timeline with notes
- ✅ Tour scheduling with calendar invites
- ✅ Automated workflow system (SMS + Email)
- ✅ 3 default workflow templates
- ✅ Workflow settings page
- ✅ Edit lead information
- ✅ Database function: `score_lead()`

**Migration Applied:** `20251212000000_crm_mvp_schema.sql`

**Files Added:**
1. `app/api/leads/[id]/activities/route.ts` - Activity API
2. `app/api/workflows/templates/route.ts` - Workflow management
3. `components/leads/ActivityTimeline.tsx` - Timeline UI
4. `app/dashboard/settings/workflows/page.tsx` - Workflow settings

**What This Means:**
- Property managers can now manage leads end-to-end
- Automated nurturing reduces manual follow-ups by 90%+
- Complete visibility into lead journey via activity timeline
- Tour scheduling is 1-click with automatic confirmations

---

## 🤝 Contributing

This is a private project for P11 Creative. For internal team members:

1. Create feature branch from `main`
2. Make changes
3. Submit PR for review
4. Update Linear project status

---

## 📄 License

Proprietary — P11 Creative © 2025

---

**Built with ❤️ by P11 Creative**

*The Autonomous Agency starts now.*
