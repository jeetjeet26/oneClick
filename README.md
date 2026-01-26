# P11 Platform — The Autonomous Agency

<div align="center">

**AI-Powered Marketing Suite for Multifamily Real Estate**

[![TypeScript](https://img.shields.io/badge/TypeScript-81.0%25-3178C6?style=flat-square&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Python](https://img.shields.io/badge/Python-16.1%25-3776AB?style=flat-square&logo=python&logoColor=white)](https://www.python.org/)
[![Next.js](https://img.shields.io/badge/Next.js-16-000000?style=flat-square&logo=next.js&logoColor=white)](https://nextjs.org/)
[![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL-3ECF8E?style=flat-square&logo=supabase&logoColor=white)](https://supabase.com/)

</div>

---

## 🎯 Overview

P11 Platform is an **all-in-one AI marketing operating system** for apartment communities. It replaces 10+ disconnected tools with a unified platform that automates lead nurturing, content generation, review management, competitive intelligence, and multi-channel analytics.

**The result:** Property managers scale from 10-12 properties to **30-40 properties** per person.

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        P11 Platform                              │
├─────────────────────────────────────────────────────────────────┤
│  ┌──────────────────────┐    ┌─────────────────────────────┐   │
│  │      Web Console     │    │       Data Engine           │   │
│  │  (Next.js 16 + React)│    │   (Python + FastAPI)        │   │
│  │                      │    │                             │   │
│  │  • Dashboard Shell   │    │  • ETL Pipelines            │   │
│  │  • AI Products UI    │    │  • Web Scrapers             │   │
│  │  • Analytics Views   │    │  • CRM Integrations         │   │
│  │  • Settings & Auth   │    │  • AI Schema Discovery      │   │
│  └──────────┬───────────┘    └─────────────┬───────────────┘   │
│             │                              │                    │
│             └──────────────┬───────────────┘                    │
│                            │                                    │
│  ┌─────────────────────────▼─────────────────────────────────┐  │
│  │                     Supabase                               │  │
│  │  • PostgreSQL (Data Lake + pgvector)                      │  │
│  │  • Auth (Multi-tenant RLS)                                │  │
│  │  • Storage (Brand assets, documents)                      │  │
│  │  • Real-time subscriptions                                │  │
│  └───────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🚀 Products

### Intelligent Conversion
| Product | Description | Status |
|---------|-------------|--------|
| **TourSpark™** | Complete CRM with lead management, activity timeline, automated workflows, and tour scheduling | ✅ Production |
| **LumaLeasing™** | 24/7 AI chatbot with RAG-powered responses, embeddable widget, and human takeover | ✅ Production |
| **LeadPulse™** | Predictive lead scoring with 5-dimensional algorithm (engagement, timing, source, completeness, behavior) | ✅ Production |
| **CRM Sync** | One-way lead push to Yardi, RealPage, Salesforce, and HubSpot with AI field mapping | ✅ Production |

### Content Factory
| Product | Description | Status |
|---------|-------------|--------|
| **BrandForge™** | AI-powered brand book generator with Gemini 2.0 - complete brand strategy in 30 minutes | ✅ Production |
| **SiteForge™** | AI WordPress website generation with Gemini 3 Pro - complete sites in 3 minutes | ✅ Production |
| **ForgeStudio AI™** | Content generation with Google Veo 3 video + Imagen 3 images | ✅ Production |
| **ReviewFlow AI™** | Multi-source review sync (Google, Yelp, SerpAPI) with AI-generated responses | ✅ Production |

### Strategic Intelligence
| Product | Description | Status |
|---------|-------------|--------|
| **MultiChannel BI** | Unified analytics dashboard with CSV import and MCP auto-sync | ✅ Production |
| **MarketVision 360™** | Competitor scraping + Brand Intelligence AI analysis with semantic search | ✅ Production |
| **PropertyAudit™** | Parallel AI audits (OpenAI + Claude) with web search and quality flags | ✅ Production |

---

## ✨ Key Features

### CRM Integration (New!)
- **AI-Powered Field Mapping** - Claude analyzes CRM schema and suggests intelligent mappings
- **Duplicate Prevention** - Searches CRM by email/phone before creating leads
- **Multi-CRM Support** - Yardi RENTCafé, RealPage OneSite, Salesforce, HubSpot
- **Test Sync Validation** - Creates/reads/deletes test record to verify mappings
- **Bulk Sync** - Push existing leads to CRM with checkbox selection
- **Learning System** - Tracks user corrections to improve future suggestions
- **Real-time Monitoring** - Dashboard with success rates and sync history

### Lead Management
- **Activity Timeline** - Complete lead history with notes and interactions
- **Automated Workflows** - 3 default templates (new lead nurture, no-show recovery, post-tour)
- **Lead Scoring** - 5-dimensional algorithm with Hot/Warm/Cold buckets
- **Tour Scheduling** - Calendar integration with AI-generated confirmation emails
- **Multi-channel Follow-ups** - SMS + Email automation

### Content Generation
- **Brand Books** - 12-section brand guidelines with logo, colors, typography
- **WordPress Sites** - Complete websites with 14 ACF block types
- **Video Content** - Veo 3 text-to-video with synchronized audio
- **Image Assets** - Imagen 3 generation with style presets
- **Social Media** - Per-property Instagram OAuth configuration

### Competitive Intelligence
- **Competitor Scraping** - Automated website analysis with Apify
- **Brand Intelligence** - AI analysis of positioning, voice, and messaging
- **Semantic Search** - pgvector-powered search across competitor content
- **Market Gap Analysis** - Identifies opportunities in competitive landscape

### Analytics & Reporting
- **Unified Dashboard** - Multi-channel performance in one view
- **CSV Import** - Support for 8+ report types (keywords, demographics, devices, locations)
- **MCP Auto-Sync** - One-click data import from Google Ads and Meta Ads
- **Historical Trends** - Unlimited historical data storage
- **Scheduled Reports** - Automated email reports

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|------------|
| **Frontend** | Next.js 16, React 19, TypeScript, Tailwind CSS |
| **Backend** | Next.js API Routes, FastAPI (Python) |
| **Database** | PostgreSQL + pgvector (Supabase) |
| **AI Models** | OpenAI GPT-4o, Claude Sonnet 4, Google Gemini 2.0 & 3.0 |
| **Video** | Google Veo 3 Preview |
| **Images** | Google Imagen 3.0 via Vertex AI |
| **CRM APIs** | simple-salesforce, hubspot-api-client, Yardi/RealPage REST |
| **Data Pipelines** | Python, dlt, Apify |
| **Auth** | Supabase Auth with Row Level Security |
| **Deployment** | Vercel (web), Heroku (data-engine) |

---

## 📁 Project Structure

```
oneClick/
├── p11-platform/
│   ├── apps/
│   │   └── web/                          # Next.js 16 Dashboard
│   │       ├── app/
│   │       │   ├── api/                  # 100+ API endpoints
│   │       │   │   ├── analytics/        # BI & performance data
│   │       │   │   ├── brandforge/       # Brand book generation
│   │       │   │   ├── siteforge/        # WordPress site generation
│   │       │   │   ├── integrations/     # CRM, ad platforms
│   │       │   │   ├── leads/            # TourSpark CRM
│   │       │   │   ├── lumaleasing/      # AI chatbot
│   │       │   │   ├── marketvision/     # Competitor intelligence
│   │       │   │   └── reviewflow/       # Review management
│   │       │   ├── dashboard/            # Product pages
│   │       │   │   ├── leads/            # TourSpark page
│   │       │   │   ├── settings/         # Settings & CRM config
│   │       │   │   ├── brandforge/       # Brand book viewer
│   │       │   │   └── siteforge/        # Website generator
│   │       │   └── auth/                 # Authentication
│   │       ├── components/               # React components
│   │       │   ├── crm/                  # CRM sync monitor
│   │       │   ├── leads/                # Tour scheduling
│   │       │   └── layout/               # Dashboard shell
│   │       └── utils/
│   │           └── services/
│   │               ├── crm-sync.ts       # CRM integration
│   │               └── messaging.ts      # SMS/Email
│   ├── services/
│   │   └── data-engine/                  # Python FastAPI
│   │       ├── connectors/
│   │       │   ├── crm_adapters/         # Yardi, RealPage, Salesforce, HubSpot
│   │       │   ├── openai_connector.py
│   │       │   └── claude_connector.py
│   │       ├── jobs/
│   │       │   ├── propertyaudit.py      # Parallel AI audits
│   │       │   └── crm_schema_agent.py   # AI field mapping
│   │       ├── routers/
│   │       │   ├── brand_intelligence.py
│   │       │   └── crm_integration.py    # CRM API endpoints
│   │       ├── pipelines/                # ETL pipelines
│   │       └── scrapers/                 # Web scrapers
│   └── supabase/
│       └── migrations/                   # 55+ database migrations
└── docs/                                 # Technical documentation
```

---

## 🚀 Quick Start

### Prerequisites
- Node.js 20+
- Python 3.13+
- Supabase project (with pgvector enabled)
- OpenAI API key
- Google Cloud project (for Vertex AI)
- Anthropic API key (for Claude)

### 1. Clone & Install

```bash
git clone https://github.com/jeetjeet26/oneClick.git
cd oneClick/p11-platform
```

### 2. Install Dependencies

**Web App:**
```bash
cd apps/web
npm install
```

**Data Engine:**
```bash
cd ../../services/data-engine
pip install -r requirements.txt
```

### 3. Configure Environment

Create `.env` in `p11-platform/` root:

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-key

# OpenAI
OPENAI_API_KEY=sk-...

# Anthropic (for Claude)
ANTHROPIC_API_KEY=sk-ant-...

# Google Cloud (Vertex AI)
GOOGLE_CLOUD_PROJECT_ID=your-project-id
GOOGLE_APPLICATION_CREDENTIALS=path/to/service-account.json

# Google Gemini
GOOGLE_GEMINI_API_KEY=your-gemini-api-key

# Data Engine
DATA_ENGINE_URL=http://localhost:8000
DATA_ENGINE_API_KEY=your-secure-key

# Messaging (Optional)
TWILIO_ACCOUNT_SID=your-sid
TWILIO_AUTH_TOKEN=your-token
TWILIO_PHONE_NUMBER=+1234567890
RESEND_API_KEY=re_...

# Review Platforms (Optional)
GOOGLE_PLACES_API_KEY=your-key
YELP_FUSION_API_KEY=your-key
SERPAPI_API_KEY=your-key
```

### 4. Run Database Migrations

```bash
cd supabase
# Apply all migrations via Supabase CLI or dashboard
```

### 5. Start Services

**Terminal 1 - Data Engine:**
```bash
cd services/data-engine
python main.py
# Runs on http://localhost:8000
```

**Terminal 2 - Web App:**
```bash
cd apps/web
npm run dev
# Runs on http://localhost:3000
```

Visit **http://localhost:3000** and sign up to get started!

---

## 📊 Database Schema

Core tables in the unified data model:

| Category | Tables |
|----------|--------|
| **Identity** | `organizations`, `properties`, `profiles`, `team_members` |
| **CRM** | `leads`, `lead_activities`, `lead_scores`, `tours`, `tour_bookings`, `workflow_definitions`, `lead_workflows` |
| **Conversations** | `conversations`, `messages`, `widget_sessions`, `lumaleasing_config` |
| **Content** | `content_drafts`, `forgestudio_assets`, `property_brand_assets`, `property_websites`, `website_assets` |
| **Intelligence** | `competitors`, `competitor_brand_intelligence`, `competitor_content_chunks`, `reviews`, `review_responses` |
| **Analytics** | `fact_marketing_performance`, `fact_extended_metrics`, `scheduled_reports`, `metric_goals` |
| **Integrations** | `integration_credentials`, `field_mapping_suggestions`, `ad_account_connections`, `social_auth_configs` |
| **Knowledge** | `documents`, `knowledge_sources` (pgvector embeddings) |

---

## 🔌 API Endpoints

### CRM Integration
```typescript
POST /api/integrations/crm
Actions:
  - test-connection      // Test CRM API credentials
  - discover-schema      // AI-powered field mapping
  - search-lead          // Check for duplicates
  - push-lead            // Sync single lead
  - bulk-sync            // Sync multiple leads
  - validate-mapping     // Test with create/read/delete
  - save-mapping         // Save configuration
  - sync-stats           // Get sync statistics
  - sync-history         // Recent sync activity
```

### Lead Management
```typescript
GET  /api/leads?propertyId=...&status=...&page=...
POST /api/leads                           // Create lead
PATCH /api/leads                          // Update lead
GET  /api/leads/[id]/activities           // Activity timeline
POST /api/leads/[id]/activities           // Add note/activity
POST /api/leads/[id]/tours                // Schedule tour
POST /api/leads/[id]/send-message         // Send SMS/Email
```

### AI Chatbot
```typescript
POST /api/lumaleasing/chat
Headers: { X-API-Key: string, X-Visitor-ID: string }
Body: { messages: Message[], sessionId?: string, leadInfo?: object }
Response: { content: string, sessionId: string, shouldPromptLeadCapture: boolean }
```

### Brand & Site Generation
```typescript
POST /api/brandforge/conversation         // Chat with Gemini 2.0
POST /api/brandforge/generate-next-section // Generate brand book sections
POST /api/brandforge/generate-pdf         // Export PDF

POST /api/siteforge/generate              // Generate WordPress site
GET  /api/siteforge/status/[websiteId]    // Poll generation progress
POST /api/siteforge/deploy/[websiteId]    // Deploy to WordPress
```

### Analytics
```typescript
GET /api/analytics/performance?propertyId=...&startDate=...&endDate=...
POST /api/analytics/upload                // CSV import (8+ report types)
GET /api/analytics/campaigns              // Campaign performance
```

---

## 🧪 Development

### Web App
```bash
cd p11-platform/apps/web
npm run dev          # Start dev server
npm run build        # Build for production
npm run lint         # Run linter
```

### Data Engine
```bash
cd p11-platform/services/data-engine
python main.py       # Start FastAPI server
# API docs available at http://localhost:8000/docs
```

### Database
```bash
cd p11-platform/supabase
supabase db push     # Apply migrations
supabase db reset    # Reset database
```

---

## 📊 Performance Metrics

| Metric | Traditional | With P11 |
|--------|-------------|----------|
| Lead Response Time | Hours | **< 1 minute** |
| Content Output | 50-75/month | **300+/month** |
| Brand Book Creation | 2-3 weeks | **30 minutes** |
| Website Generation | 2-3 weeks | **3 minutes** |
| Properties per Manager | 10-12 | **30-40** |
| Campaign Optimization | Business hours | **24/7/365** |
| Review Response | Days | **< 1 hour** |
| CRM Data Entry | Manual | **Automatic** |

---

## 🔐 Security

- **Row Level Security (RLS)** - Multi-tenant data isolation at database level
- **API Key Authentication** - Secure widget and data-engine endpoints
- **Encrypted Storage** - Social OAuth credentials encrypted at rest
- **Service Role Protection** - Admin operations use service role key
- **CORS Configuration** - Restricted origins for API access

---

## 🌟 Recent Updates

### January 2026 - CRM Integration
- ✅ AI-powered schema discovery with Claude Sonnet 4
- ✅ One-way lead push to Yardi, RealPage, Salesforce, HubSpot
- ✅ Duplicate checking before creating leads
- ✅ Bulk sync existing leads from TourSpark
- ✅ Self-service configuration UI with field mapping review
- ✅ Test sync validation (create/read/delete test record)
- ✅ Learning system tracks corrections for better AI suggestions
- ✅ Real-time sync monitoring dashboard

### December 2025 - Data Engine Migration
- ✅ PropertyAudit migrated to Python with 50% faster parallel execution
- ✅ MCP marketing data auto-sync (Google Ads + Meta Ads)
- ✅ Real-time progress tracking for long-running jobs
- ✅ Feature flag architecture for zero-downtime migrations

### December 2025 - Site Generation
- ✅ SiteForge WordPress generator with Gemini 3 Pro
- ✅ BrandForge brand book generator with Gemini 2.0
- ✅ 3-tier brand intelligence extraction
- ✅ Cloudways deployment integration

---

## 📚 Documentation

### Product Guides
- [CRM Integration Quick Start](./docs/CRM_QUICK_START.md)
- [BrandForge Quick Start](./docs/BRANDFORGE.md)
- [SiteForge Quick Start](./docs/SITEFORGE.md)
- [Data Engine Migration](./docs/DATA_ENGINE_MIGRATION.md)
- [Production Readiness Audit](./docs/PRODUCTION_READINESS_AUDIT_2025-12-15.md)

### Technical Docs
- [MCP Servers](./p11-platform/services/mcp-servers/README.md)
- [Data Engine](./p11-platform/services/data-engine/README.md)
- [Agents Documentation](./docs/AGENTS.md)

---

## 🤝 Contributing

This is a private project for P11 Creative. For internal team members:

1. Create a feature branch from `main`
2. Make your changes with descriptive commits
3. Submit a pull request for review
4. Ensure all tests pass and linter is clean

---

## 📄 License

Proprietary — P11 Creative © 2025-2026

---

<div align="center">

**Built with ❤️ by P11 Creative**

*The Autonomous Agency*

</div>
