# P11 Platform — The Autonomous Agency

<div align="center">

**AI-Powered Marketing Suite for Multifamily Real Estate**

[![TypeScript](https://img.shields.io/badge/TypeScript-81.9%25-3178C6?style=flat-square&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Python](https://img.shields.io/badge/Python-15.9%25-3776AB?style=flat-square&logo=python&logoColor=white)](https://www.python.org/)
[![Next.js](https://img.shields.io/badge/Next.js-16-000000?style=flat-square&logo=next.js&logoColor=white)](https://nextjs.org/)
[![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL-3ECF8E?style=flat-square&logo=supabase&logoColor=white)](https://supabase.com/)

</div>

---

## 🎯 Vision

P11 Platform is building the **first autonomous marketing agency** for multifamily real estate. Where AI agents respond to prospects in seconds (not hours), content flows on-demand, campaigns optimize 24/7, and humans focus on strategy—not repetitive tasks.

> *"Imagine a marketing agency that never sleeps."*

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
│  │  • Dashboard Shell   │    │  • ETL Pipelines (Meta,     │   │
│  │  • AI Products UI    │    │    Google Ads, GA4)         │   │
│  │  • Analytics Views   │    │  • Web Scrapers (Apify)     │   │
│  │  • Settings & Auth   │    │  • ML Models (LeadPulse)    │   │
│  └──────────┬───────────┘    └─────────────┬───────────────┘   │
│             │                              │                    │
│             └──────────────┬───────────────┘                    │
│                            │                                    │
│  ┌─────────────────────────▼─────────────────────────────────┐  │
│  │                     Supabase                               │  │
│  │  • PostgreSQL (Data Lake + pgvector)                      │  │
│  │  • Auth (Email/Password, Google OAuth)                    │  │
│  │  • Row Level Security (Multi-tenant)                      │  │
│  │  • Edge Functions (API Gateway)                           │  │
│  └───────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🚀 AI Product Suite

### Intelligent Conversion
| Product | Description | Status |
|---------|-------------|--------|
| **TourSpark™ CRM** | Complete lead management with activity timeline, automated workflows, and tour scheduling | ✅ Live |
| **LumaLeasing™** | 24/7 AI chatbot with RAG for instant prospect responses | ✅ Live |
| **└─ WordPress Plugin** | Easy-install plugin package for WordPress developers - [See Plugin →](./lumaleasing-wordpress/) | 🆕 Ready |
| **LeadPulse™** | Predictive lead scoring with engagement & behavior analysis | ✅ Live |

### Content Factory
| Product | Description | Status |
|---------|-------------|--------|
| **BrandForge™** | AI-powered brand book generator with Gemini 2.0 - complete brand strategy in 30 minutes | ✅ Live |
| **ForgeStudio AI™** | Generate content with Google Veo 3 video + Imagen 3 images | ✅ Live |
| **ReviewFlow AI™** | Multi-source review sync (Google, Yelp, SerpAPI) + AI responses | ✅ Live |
| **SocialPilot X™** | Instagram integration with per-property OAuth credentials | ✅ Live |

### Site Generation
| Product | Description | Status |
|---------|-------------|--------|
| **SiteForge™** | AI-powered WordPress website generation with Gemini 3 Pro - complete sites in 3 minutes | ✅ Live |

### Strategic Intelligence
| Product | Description | Status |
|---------|-------------|--------|
| **MultiChannel BI** | Unified analytics with natural language queries | ✅ Live |
| **MarketVision 360™** | Competitor scraping + Brand Intelligence AI analysis | ✅ Live |
| **Community Intelligence** | Website scraping + Knowledge base auto-population | ✅ Live |

---

## ✨ Latest Updates (Dec 2025)

### 💬 LumaLeasing WordPress Plugin! (Dec 15, 2025)
**WordPress developers can now install LumaLeasing in one click!**

#### What is the WordPress Plugin?

A production-ready WordPress plugin that makes installing LumaLeasing AI chatbot as easy as uploading a .zip file. No manual code editing required!

#### Features ✅

* **One-Click Installation** - Upload, activate, enter API key, done!
* **Admin Settings Page** - Configure everything from WordPress admin (Settings → LumaLeasing)
* **API Key Validator** - Test connection button verifies setup instantly
* **Shortcode Support** - `[lumaleasing]` works anywhere in posts/pages
* **WordPress Widget** - Add to sidebars/footer via Appearance → Widgets
* **Position Control** - Choose bottom-right or bottom-left
* **Enable/Disable Toggle** - Turn widget on/off without losing configuration
* **Embed Code Generator** - Copy/paste code for non-WordPress pages
* **Translation Ready** - Full i18n support with POT file
* **Developer Hooks** - Filters and actions for customization

#### Technical Implementation

* **Plugin Structure:** 10 PHP classes following WordPress coding standards
* **Admin UI:** Professional settings page matching WordPress design patterns
* **AJAX Validation:** Real-time API key testing
* **Documentation:** 4 comprehensive guides (README, Installation, Developer, Troubleshooting)
* **Security:** Nonce verification, capability checks, sanitized inputs
* **Performance:** <50KB, async loading, no frontend database queries

#### What This Means

* 🚀 WordPress developers get LumaLeasing running in 5 minutes
* 📦 Distributable .zip package for clients
* 🎨 All chatbot customization stays in P11 Dashboard
* 🔄 Plugin updates independent from chatbot features
* 🌐 Works with any WordPress theme or hosting

**Location:** [`./lumaleasing-wordpress/`](./lumaleasing-wordpress/)

---

## ✨ Latest Updates (Dec 2025)

### 📊 MultiChannel BI - CSV Import Feature! (Dec 11, 2025)
**Import marketing data from Google Ads and Meta in seconds!**

#### What is CSV Import?

A comprehensive data import system that lets users upload CSV exports from Google Ads and Meta Ads directly into the MultiChannel BI dashboard - no API connections required!

#### Features ✅

* **Multi-Platform Support:** Google Ads and Meta Ads CSV exports
* **8+ Report Types:** 
  - Time Series (daily performance)
  - Search Keywords
  - Demographics (gender, age)
  - Devices (mobile, desktop, tablet)
  - Locations (geographic breakdown)
  - Day & Hour (dayparting analysis)
  - Auction Insights
  - Networks
* **Smart Parser:** Auto-detects platform and report type from CSV structure
* **Batch Processing:** Upload multiple files or entire folders at once
* **Preview Mode:** See parsed data and totals before importing
* **4-Step Wizard:** Platform selection → Upload → Preview → Import

#### Technical Implementation

* **CSV Parser:** 615 lines of robust parsing logic handling multiple date formats, currency formats, and data structures
* **API Route:** `/api/analytics/upload` with preview and import modes
* **Data Storage:** 
  - Time series → `fact_marketing_performance` table
  - Extended reports → `fact_extended_metrics` table
* **UI Component:** Drag-and-drop modal with real-time validation and progress tracking

#### Use Cases

* 🚀 Quick setup without API configuration
* 📊 Import historical campaign data
* 🧪 Test the dashboard with real data
* 🏢 Agencies managing multiple client exports

#### Cost Efficiency

| Method | Setup Time | Historical Data |
| -- | -- | -- |
| API Integration | 30-60 min | Limited |
| CSV Import | **< 2 minutes** | **Unlimited** |

**What This Means:**

* 📥 Instant access to marketing data without complex API setup
* 📈 Import years of historical campaign data in minutes
* 🎯 Support for detailed dimensional analysis (keywords, demographics, locations)
* 🔄 Works alongside API pipelines for hybrid data ingestion

---

### 🌐 SiteForge™ - AI WordPress Site Generator! (Dec 11, 2025)
**Generate complete WordPress websites in 3 minutes!**

#### What is SiteForge?
An AI-powered WordPress website generator that creates professional apartment community websites using brand intelligence from BrandForge, knowledge base content, and property data. Deploys directly to Cloudways-hosted WordPress with the Collection theme.

#### Features ✅
- **3-Tier Brand Intelligence:**
  1. Priority 1: BrandForge data (95% confidence)
  2. Priority 2: Knowledge Base extraction (80% confidence)
  3. Priority 3: Generated from property data (60% confidence)
- **Gemini 3 Pro Integration:** High-thinking mode for architecture planning, low-thinking for content generation
- **14 ACF Block Types:** Full support for Collection theme blocks (menu, top-slides, text-section, feature-section, gallery, accordion-section, plans-availability, POI, form, map, and more)
- **Generation Wizard:** Multi-step modal with live progress tracking (polls every 2 seconds)
- **Website Preview:** Page-by-page content viewer with section breakdown and design strategy display
- **WordPress Deployment:** Cloudways API integration for one-click WordPress provisioning

#### Technical Implementation
- **API Routes:** 6 new endpoints (`/api/siteforge/generate`, `/api/siteforge/list`, `/api/siteforge/status/[websiteId]`, `/api/siteforge/preview/[websiteId]`, `/api/siteforge/deploy/[websiteId]`, `/api/siteforge/delete/[websiteId]`)
- **Components:** 4 new React components (`GenerationWizard`, `WebsitePreview`, `ACFBlockRenderer`, etc.)
- **Utils:** 3 service modules (`brand-intelligence.ts`, `llm-orchestration.ts`, `wordpress-client.ts`)
- **AI Model:** Gemini 3 Pro with structured JSON output
- **Database:** 4 new tables (`property_websites`, `website_assets`, `website_generations`, `siteforge_jobs`)

#### Cost Efficiency
| Method | Cost | Time |
|--------|------|------|
| Manual Website | $800-1,000 | 2-3 weeks |
| SiteForge | ~$0.60 | 3 minutes |
| **Savings** | **99.9%** | **99.9%** |

**What This Means:**
- 🚀 Websites that took weeks now take minutes
- 🎨 Brand-consistent sites leveraging BrandForge assets
- 💡 Intelligent architecture planning by Gemini 3 Pro
- 📦 Direct WordPress deployment with Collection theme

---

### 🎨 BrandForge™ - AI Brand Book Generator! (Dec 10, 2025)
**Generate professional brand guidelines in 30 minutes!**

#### What is BrandForge?
An AI-powered brand book generator that creates comprehensive brand guidelines through a conversational process with Gemini 2.0. It produces the same quality deliverables as P11's manual brand books (matching the ALBUM brand book structure).

#### Features ✅
- **Competitive Analysis Integration:** Leverages MarketVision intelligence to inform brand positioning
- **Conversational Wizard:** 8-10 exchange conversation with Gemini 2.0 to understand brand vision
- **12 Section Brand Book:**
  1. Introduction & Brand Overview
  2. Positioning Statement
  3. Target Audience Analysis
  4. Resident Personas (3 profiles)
  5. Brand Name & Story
  6. Logo Design (AI-generated)
  7. Typography System
  8. Color Palette (5-color scheme)
  9. Design Elements & Patterns
  10. Photo Guidelines - Do's
  11. Photo Guidelines - Don'ts
  12. Implementation Examples

- **Stepwise Generation:** Each section generates sequentially with approval gates
- **Edit & Regenerate:** Inline editing for all text + AI regeneration with optional hints
- **PDF Export:** Professional 15-page brand book with all assets
- **Knowledge Base Integration:** Automatically embedded for LumaLeasing to reference
- **Property Overview Display:** Brand identity card with colors, logo, and download link

#### Technical Implementation
- **API Routes:** 8 new endpoints (`/api/brandforge/*`)
- **Components:** 5 new React components (`BrandForgeWizard`, `ConversationInterface`, `SectionReview`, etc.)
- **AI Model:** Gemini 2.0 Flash Exp for conversation & generation
- **Image Generation:** Imagen 3.0 via Vertex AI for logo design
- **Storage:** `property_brand_assets` table + Supabase Storage bucket

#### Integration Points
- **Property Onboarding:** "Generate Brand Book" option in Knowledge Base step
- **Community Overview:** Brand identity display card with download
- **Future Ready:** Structured storage for SiteForge WordPress site generation

**What This Means:**
- 🚀 Brand books that took 2-3 weeks now take 30 minutes
- 🎨 Professional-quality brand strategy accessible to every property
- 💡 Competitive intelligence directly informs brand positioning
- 📦 Reusable brand assets across all P11 products

---

### 🎉 TourSpark™ CRM MVP Launched! (Dec 10, 2025)
**The #1 most requested feature is now live!**

#### Phase 0: Database Foundation ✅
- **12 new tables:** tours, workflow_definitions, lead_workflows, workflow_actions, follow_up_templates, lead_activities, lead_scores, lead_engagement_events, lumaleasing_config, widget_sessions, tour_slots, tour_bookings
- **Database function:** `score_lead()` for LeadPulse
- **Enhanced leads table:** Added last_contacted_at, updated_at, move_in_date, bedrooms, notes
- **RLS policies:** Security for all new tables

#### Phase 1: Lead Management UI ✅
- **Activity Timeline:** Complete lead history with add notes feature
- **Lead Detail Drawer:** Enhanced with 4 tabs (Details, Tours, Activity, Automation)
- **Edit Lead:** Full contact info editing (name, email, phone, source)
- **Activities API:** `/api/leads/[id]/activities` for timeline data

#### Phase 2: Workflow Automation ✅
- **3 Default Workflows:**
  1. New Lead Nurture (5 min, 24hr, 48hr follow-ups)
  2. Tour No-Show Recovery (2hr, 24hr re-engagement)
  3. Post-Tour Follow-Up (4hr, 48hr nurture)
- **7 Message Templates:** With variable substitution (`{first_name}`, `{property_name}`)
- **Workflow Settings Page:** `/dashboard/settings/workflows` with on/off toggles
- **CRON Processor:** Runs every 10 minutes via `/api/workflows/process`

**What This Means:**
- 🚀 Lead follow-ups are now 100% automated
- 📊 Complete visibility into every lead interaction
- ⏱️ Sub-5-minute response time for new leads
- 📅 1-click tour scheduling with calendar invites
- 🎯 Zero manual setup (default workflows included)

### 🔐 Per-Property Social Authentication
- **Custom OAuth Credentials**: Each property can now configure their own Instagram/Facebook app credentials
- **Secure Storage**: Encrypted app secrets stored in `social_auth_configs` table
- **Setup Modal**: New `InstagramSetupModal` component guides users through OAuth app creation

### 📧 AI-Powered Tour Confirmations
- **Smart Email Generation**: `tour-email-generator.ts` creates personalized confirmation emails
- **Property Context**: Includes amenities, contact info, and tour details
- **Calendar Invites**: Auto-generated .ics files attached

### 📊 Batch Review Analysis
- **Bulk Processing**: `/api/reviewflow/analyze-batch` endpoint for multiple reviews
- **SerpAPI Integration**: Enhanced Google Places scraping
- **Multi-Source Sync**: Improved error handling

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|------------|
| **Frontend** | Next.js 16, React 19.2, Tailwind CSS 4, Recharts |
| **Backend** | Next.js API Routes, FastAPI (Python) |
| **Database** | PostgreSQL + pgvector (Supabase) |
| **AI/ML** | OpenAI GPT-4o, text-embedding-3-small, Google Gemini 2.0 Flash, Gemini 3 Pro, LangChain |
| **Video Generation** | Google Veo 3 Preview (video + synchronized audio) |
| **Image Generation** | Google Imagen 3.0 via Vertex AI |
| **Data Pipelines** | Python, dlt, Apify (Apartments.com scraping) |
| **Review APIs** | Google Places API, Yelp Fusion API, SerpAPI |
| **Auth** | Supabase Auth (GoTrue) |
| **Deployment** | Vercel (web), Heroku (data-engine) |

---

## 📁 Project Structure

```
oneClick/
├── lumaleasing-wordpress/          # 🆕 WordPress Plugin Package
│   ├── lumaleasing.php            # Main plugin file
│   ├── includes/                  # Core classes
│   ├── admin/                     # Admin UI & settings
│   ├── docs/                      # Installation & developer guides
│   └── languages/                 # Translation files
├── p11-platform/
│   ├── apps/
│   │   └── web/                    # Next.js 16 Dashboard
│   │       ├── app/
│   │       │   ├── api/            # API Routes (95+ endpoints)
│   │       │   │   ├── analytics/  # BI endpoints (performance, goals, campaigns)
│   │       │   │   ├── brandforge/ # AI brand book generation (8 endpoints)
│   │       │   │   ├── siteforge/  # AI WordPress site generation (6 endpoints) 🆕
│   │       │   │   ├── chat/       # LumaLeasing RAG chat
│   │       │   │   ├── community/  # Community profile & contacts
│   │       │   │   ├── forgestudio/# Content + Veo 3 video + social config
│   │       │   │   ├── leadpulse/  # ML-powered lead scoring
│   │       │   │   ├── leads/      # Tour scheduling & management
│   │       │   │   ├── lumaleasing/# Admin config & conversations
│   │       │   │   ├── marketvision/# Competitor + brand intelligence
│   │       │   │   ├── reviewflow/ # Multi-source review management + batch analysis
│   │       │   │   └── onboarding/ # Website scraping & setup
│   │       │   ├── auth/           # Authentication pages
│   │       │   ├── dashboard/      # Product pages (16 sections)
│   │       │   │   ├── brandforge/ # Brand book viewer & editor
│   │       │   │   └── siteforge/  # Website generation & preview 🆕
│   │       │   └── onboarding/     # Multi-step wizard (6 steps)
│   │       ├── components/         # React components (95+)
│   │       │   ├── brandforge/     # Brand book generation UI
│   │       │   ├── siteforge/      # Website generation wizard & preview 🆕
│   │       │   ├── charts/         # BI visualizations
│   │       │   ├── community/      # Community management + brand display
│   │       │   ├── forgestudio/    # Content generation + Instagram setup
│   │       │   ├── leadpulse/      # Lead scoring components
│   │       │   ├── leads/          # Tour scheduling modals
│   │       │   ├── lumaleasing/    # Chatbot widget + config
│   │       │   │   ├── LumaLeasingWidget.tsx  # React widget
│   │       │   │   └── LumaLeasingConfig.tsx  # Admin config UI
│   │       │   ├── marketvision/   # Competitor analysis
│   │       │   └── reviewflow/     # Review management + import
│   │       ├── types/
│   │       │   └── siteforge.ts    # SiteForge type definitions 🆕
│   │       └── utils/
│   │           ├── services/       # Business logic
│   │           │   ├── messaging.ts           # SMS/Email services
│   │           │   └── tour-email-generator.ts # AI tour confirmations
│   │           └── siteforge/      # SiteForge services 🆕
│   │               ├── brand-intelligence.ts  # 3-tier brand extraction
│   │               ├── llm-orchestration.ts   # Gemini 3 Pro integration
│   │               └── wordpress-client.ts    # Cloudways & WP REST API
│   ├── services/
│   │   └── data-engine/            # Python ETL & ML
│   │       ├── pipelines/          # GA4, Google Ads, Meta Ads
│   │       └── scrapers/           # 10 scraper modules
│   │           ├── apartments_com.py
│   │           ├── apify_apartments.py
│   │           ├── brand_intelligence.py
│   │           ├── coordinator.py
│   │           ├── discovery.py
│   │           ├── google_places.py
│   │           ├── serpapi_reviews.py  # NEW: SerpAPI integration
│   │           ├── website_intelligence.py
│   │           └── yelp.py
│   └── supabase/
│       └── migrations/             # 12 migration files
│           ├── 20251208000000_init_schema.sql
│           ├── 20251209030000_forgestudio_reviewflow_schema.sql
│           ├── 20251209040000_community_onboarding_schema.sql
│           ├── 20251209050000_competitor_brand_intelligence.sql
│           ├── 20251210000000_reviewflow_multi_source.sql
│           ├── 20251210010000_social_auth_configs.sql
│           └── 20251212000000_crm_mvp_schema.sql  # NEW: CRM tables
└── docs/                           # Planning documents
```

---

## 🚀 Quick Start

### Prerequisites
- Node.js 20+
- Python 3.11+
- Supabase project (with pgvector enabled)
- OpenAI API key
- Google Cloud project (for Veo 3 / Vertex AI)

### 1. Clone & Install

```bash
git clone https://github.com/jeetjeet26/oneClick.git
cd oneClick/p11-platform/apps/web
npm install
```

### 2. Configure Environment

```bash
cp .env.example .env.local
```

Edit `.env.local` with your credentials:

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-key

# OpenAI
OPENAI_API_KEY=sk-...

# Google Cloud (Vertex AI for Veo 3 & Imagen 3)
GOOGLE_CLOUD_PROJECT_ID=your-project-id
GOOGLE_APPLICATION_CREDENTIALS=path/to/service-account.json

# Google Gemini 2.0 (for BrandForge)
GOOGLE_GEMINI_API_KEY=your-gemini-api-key

# Review Platforms
GOOGLE_PLACES_API_KEY=your-key
YELP_FUSION_API_KEY=your-key
SERPAPI_API_KEY=your-key  # Optional: for enhanced scraping

# Social Media (Optional: per-property config available via UI)
META_APP_ID=your-app-id
META_APP_SECRET=your-app-secret

# Data Engine
DATA_ENGINE_URL=http://localhost:8000

# Site URL
NEXT_PUBLIC_SITE_URL=http://localhost:3000

# Encryption (for social auth secrets)
ENCRYPTION_KEY=your-secure-key-here
```

### 3. Run Database Migrations

```bash
cd ../../supabase
supabase db push
```

### 4. Start Development Server

```bash
cd ../apps/web
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000) — authenticated users land at `/dashboard`.

---

## 🗄️ Database Schema

Key tables in the unified data model:

| Table | Purpose |
|-------|---------|
| `organizations` | Multi-tenant companies |
| `properties` | Apartment communities |
| `community_profiles` | Extended property data (amenities, pet policy, etc.) |
| `community_contacts` | Multiple contacts per property |
| `documents` | RAG knowledge base (pgvector embeddings) |
| `knowledge_sources` | Track where knowledge came from |
| `fact_marketing_performance` | Unified marketing metrics |
| `leads` | Lead tracking and scoring |
| `conversations` / `messages` | Chat history |
| `content_drafts` / `forgestudio_assets` | Generated content & media |
| `property_brand_assets` | BrandForge generated brand books (12 sections) |
| `property_websites` | 🆕 SiteForge generated websites |
| `website_assets` | 🆕 Website images, logos, and assets |
| `website_generations` | 🆕 Website regeneration history |
| `siteforge_jobs` | 🆕 Async job queue for site generation |
| `reviews` / `review_responses` | ReviewFlow data |
| `review_platform_connections` | Google, Yelp, manual connections |
| `competitors` / `competitor_snapshots` | MarketVision scraped data |
| `competitor_brand_intelligence` | AI-analyzed brand positioning |
| `competitor_content_chunks` | Vector embeddings for semantic search |
| `social_auth_configs` | Per-property OAuth credentials |

---

## 🔌 API Reference

### MultiChannel BI & Analytics

```http
GET /api/analytics/performance?propertyId=...&startDate=...&endDate=...&compare=true
Response: { timeSeries: [], channels: [], totals: {}, comparison: {} }

GET /api/analytics/campaigns?propertyId=...&startDate=...&endDate=...
Response: { campaigns: [], channels: [], totals: {} }

POST /api/analytics/upload
Body: {
  csvContent: string,
  filename: string,
  campaignName: string,
  propertyId: string,
  platform: "google_ads" | "meta",
  preview?: boolean  // Set true to validate before import
}
Response: {
  success: boolean,
  preview?: {
    totalRows: number,
    dateRange: { start: string, end: string },
    reportType: string,
    isExtended: boolean,
    totals: { impressions, clicks, spend, conversions }
  },
  imported?: {
    rowCount: number,
    dateRange: { start: string, end: string },
    reportType: string
  },
  errors?: string[],
  warnings?: string[]
}
```

**Supported Report Types:**
- Time Series (daily performance data)
- Search Keywords
- Demographics (gender, age)
- Devices (mobile, desktop, tablet)
- Locations (geographic breakdown)
- Day & Hour (dayparting analysis)
- Auction Insights
- Networks

### LumaLeasing Chat
```typescript
POST /api/chat
Body: { messages: Message[], propertyId: string, conversationId?: string }
Response: { role: "assistant", content: string, conversationId: string }

POST /api/lumaleasing/chat   // External widget endpoint (used by WordPress plugin)
Body: { messages: Message[], sessionId?: string, leadInfo?: object }
Headers: { X-API-Key: string, X-Visitor-ID: string }
Response: { content: string, sessionId: string, conversationId: string }

GET /api/lumaleasing/config   // Widget configuration (used by WordPress plugin)
Headers: { X-API-Key: string }
Response: { config: object, isOnline: boolean }
```

### ForgeStudio Content & Video Generation
```typescript
POST /api/forgestudio/generate
Body: { propertyId: string, contentType: "social" | "blog", topic: string }

POST /api/forgestudio/assets/generate
Body: {
  propertyId: string,
  generationType: "text-to-video" | "image-to-video" | "image",
  prompt: string,
  style: "luxury" | "modern" | "natural" | "vibrant" | "cozy" | "professional",
  aspectRatio: "16:9" | "9:16",
  videoDuration: 4 | 6 | 8,
  includeAudio: boolean  // Veo 3 synchronized audio
}

// NEW: Social Media Configuration
POST /api/forgestudio/social/config
Body: {
  propertyId: string,
  platform: "meta",
  appId: string,
  appSecret: string
}

GET /api/forgestudio/social/config?propertyId=...
Response: { configs: SocialAuthConfig[] }
```

### LeadPulse Scoring
```typescript
POST /api/leadpulse/score
Body: { leadId: string }
Response: {
  totalScore: number,
  engagementScore: number,
  timingScore: number,
  sourceScore: number,
  factors: { factor: string, impact: string, type: "positive" | "negative" }[]
}

GET /api/leadpulse/insights?propertyId=...
Response: { insights: LeadInsight[], recommendations: string[] }
```

### TourSpark Scheduling
```typescript
POST /api/leads/[id]/tours
Body: {
  tourDate: string,
  tourTime: string,
  notes?: string,
  sendConfirmation: boolean
}
Response: {
  success: boolean,
  tour: Tour,
  emailSent: boolean  // NEW: AI-generated confirmation
}
```

### MarketVision Competitors
```typescript
GET /api/marketvision/competitors?propertyId=...
Response: { competitors: Competitor[], lastUpdated: string }

POST /api/marketvision/brand-intelligence
Body: { competitorId: string }
Response: { jobId: string }  // Async job

GET /api/marketvision/brand-intelligence/{competitorId}
Response: {
  brand_voice: string,
  unique_selling_points: string[],
  highlighted_amenities: string[],
  active_specials: string[]
}
```

### ReviewFlow Multi-Source
```typescript
POST /api/reviewflow/sync
Body: { propertyId: string, platform: "google" | "yelp", method?: "api" | "scraper" }

POST /api/reviewflow/connections
Body: {
  propertyId: string,
  platform: "google" | "yelp" | "manual",
  placeId?: string,        // Google
  yelpBusinessId?: string  // Yelp
}

GET /api/reviewflow/reviews?propertyId=...&status=pending
Response: { reviews: Review[], stats: ReviewStats }

POST /api/reviewflow/respond
Body: { reviewId: string, response: string, tone?: string }

// NEW: Batch Analysis
POST /api/reviewflow/analyze-batch
Body: { reviewIds: string[] }
Response: { analyzed: number, insights: ReviewInsight[] }
```

### BrandForge AI Brand Books
```typescript
// Step 1: Analyze competitors
POST /api/brandforge/analyze
Body: { propertyId: string }
Response: {
  competitors: Competitor[],
  marketGaps: string[],
  recommendations: string[]
}

// Step 2: Conversation with Gemini 2.0
POST /api/brandforge/conversation
Body: { propertyId: string, userMessage: string, conversationHistory: Message[] }
Response: {
  aiResponse: string,
  isComplete: boolean,
  nextPrompt?: string
}

// Step 3: Generate sections sequentially
POST /api/brandforge/generate-next-section
Body: { propertyId: string }
Response: {
  section: string,  // "introduction" | "positioning" | "target_audience" | ...
  content: object,  // Structured section data
  progress: number  // 1-12
}

// Edit, regenerate, or approve sections
POST /api/brandforge/edit-section
POST /api/brandforge/regenerate-section
POST /api/brandforge/approve-section

// Generate final PDF
POST /api/brandforge/generate-pdf
Body: { propertyId: string }
Response: {
  pdfUrl: string,
  assetId: string,
  documentId: string  // Knowledge base reference
}

GET /api/brandforge/status?propertyId=...
Response: {
  stage: "pending" | "analyzing" | "conversing" | "generating" | "complete",
  currentSection: string,
  approvedSections: string[],
  conversationHistory: Message[]
}
```

### SiteForge WordPress Generation
```typescript
// Generate a new website
POST /api/siteforge/generate
Body: {
  propertyId: string,
  preferences?: {
    style: "modern" | "luxury" | "cozy" | "vibrant" | "professional",
    emphasis: "amenities" | "location" | "lifestyle" | "value" | "community",
    ctaPriority: "tours" | "applications" | "contact" | "calls"
  }
}
Response: {
  jobId: string,
  websiteId: string,
  status: "queued",
  estimatedTimeSeconds: number
}

// List websites for a property
GET /api/siteforge/list?propertyId=...
Response: { websites: PropertyWebsite[] }

// Get generation status (poll every 2 seconds)
GET /api/siteforge/status/[websiteId]
Response: {
  websiteId: string,
  status: GenerationStatus,
  progress: number,  // 0-100
  currentStep?: string,
  siteArchitecture?: SiteArchitecture,
  wpUrl?: string
}

// Get full website preview
GET /api/siteforge/preview/[websiteId]
Response: {
  website: PropertyWebsite,
  pages: GeneratedPage[],
  assets: WebsiteAsset[],
  designDecisions: object
}

// Deploy to WordPress
POST /api/siteforge/deploy/[websiteId]
Response: { wpUrl: string, wpAdminUrl: string }

// Delete website
DELETE /api/siteforge/delete/[websiteId]
```

### Community Intelligence
```typescript
POST /api/onboarding/scrape-website
Body: { propertyId: string, websiteUrl: string }
Response: {
  extracted: { amenities: string[], pet_policy: object, contact_phone: string },
  documentsCreated: number  // RAG chunks added
}

GET /api/community/profile?propertyId=...
GET /api/community/contacts?propertyId=...
GET /api/community/knowledge-sources?propertyId=...
```

---

## 🧪 Development

```bash
# Start dev server
npm run dev

# Type check
npm run type-check

# Lint
npm run lint

# Build for production
npm run build
```

### Data Engine (Python)

```bash
cd services/data-engine
python -m venv venv
.\venv\Scripts\activate  # Windows
# source venv/bin/activate  # Mac/Linux
pip install -r requirements.txt

# Run API server
uvicorn main:app --reload --port 8000

# Run ETL pipelines
python run_pipelines.py
```

---

## 📊 Key Metrics & Impact

| Metric | Traditional | With P11 |
|--------|-------------|----------|
| Response Time | Hours | **Seconds** |
| Content Output | 50-75/month | **300+/month** |
| Brand Book Creation | 2-3 weeks | **30 minutes** |
| Website Generation | 2-3 weeks | **3 minutes** 🆕 |
| Properties per AM | 10-12 | **30-40** |
| Campaign Optimization | Business hours | **24/7/365** |
| Review Response Time | Days | **< 1 hour** |
| Tour Confirmation | Manual | **Instant AI** |

---

## 🗺️ Roadmap

### ✅ Q4 2025 — Foundation (Complete)
- [x] Data Lake infrastructure
- [x] LumaLeasing RAG chatbot
- [x] MultiChannel BI dashboard
- [x] ForgeStudio content generation
- [x] Community onboarding wizard

### ✅ Q1 2026 — Intelligence (Complete - Dec 2025!)
- [x] **TourSpark™ CRM MVP** - Lead management, workflows, activity timeline
- [x] **LeadPulse™ Scoring** - 5-dimensional algorithm with DB function
- [x] **Workflow Automation** - 3 default templates, CRON processor
- [x] MarketVision competitor scraping
- [x] Brand Intelligence AI analysis
- [x] ReviewFlow multi-source (Google, Yelp, SerpAPI)
- [x] ForgeStudio Veo 3 video generation
- [x] Website Intelligence scraping
- [x] Per-property social OAuth
- [x] AI tour confirmations
- [x] Batch review analysis

### 🔨 Q2 2026 — Scale (In Progress)
- [x] TourSpark automation sequences ✅
- [x] **BrandForge™** - AI brand book generator ✅ (Early delivery!)
- [x] **SiteForge™** - WordPress site generation from brand assets ✅ (Early delivery!)
- [x] **LumaLeasing WordPress Plugin** - One-click installation for WP sites ✅ (Early delivery!)
- [ ] Advanced pipeline configuration UI
- [ ] LLM-powered CRM configurator
- [ ] SocialPilot auto-posting
- [ ] AdForge ad generation
- [ ] SearchBoost SEO automation

### 📋 Q3-Q4 2026 — Optimization
- [ ] ChurnSignal retention prediction
- [ ] TrueSource attribution
- [ ] Full autonomous operations

---

## 📚 Documentation

### Core Documentation
- [Master Implementation Plan 2026](./Master_Implementation_Plan_2026.md)
- [Product Tech Specs](./Product_Tech_Specs.md)
- [Progress Report](./Progress_Analysis_Report.md)
- [Roadmap & RICE Analysis](./P11_Product_Roadmap_RICE_Analysis.md)
- [Executive Summary](./P11_Executive_Summary.md)
- [Implementation Checklist](./P11_Implementation_Checklist.md)

### Product Guides
- **[LumaLeasing WordPress Plugin](./lumaleasing-wordpress/)** 🆕
  - [Quick Start Guide](./lumaleasing-wordpress/QUICKSTART.md)
  - [Installation Guide](./lumaleasing-wordpress/docs/INSTALLATION.md)
  - [Developer Guide](./lumaleasing-wordpress/docs/DEVELOPER.md)
  - [Architecture Documentation](./lumaleasing-wordpress/ARCHITECTURE.md)
- **[SiteForge Quick Start](./p11-platform/SITEFORGE_QUICKSTART.md)** 🆕
- **[SiteForge MVP Status](./p11-platform/SITEFORGE_MVP_STATUS.md)** 🆕
- **[SiteForge Complete Summary](./p11-platform/SITEFORGE_COMPLETE.md)** 🆕
- [BrandForge Quick Start](./p11-platform/BRANDFORGE_QUICKSTART.md)
- [BrandForge Complete Summary](./p11-platform/BRANDFORGE_COMPLETE_SUMMARY.md)
- [BrandForge Implementation](./p11-platform/apps/web/BRANDFORGE_IMPLEMENTATION.md)
- [CRM Implementation Guide](./p11-platform/CRM_MVP_IMPLEMENTATION_COMPLETE.md)
- [CRM Quick Start](./p11-platform/CRM_QUICK_START.md)
- [CRM Vision & Context](./p11-platform/P11_CRM_VISION_CONTEXT.md)
- [Email Diagnostic Guide](./p11-platform/EMAIL_DIAGNOSTIC_GUIDE.md)

### Technical Documentation
- [MCP Servers README](./p11-platform/services/mcp-servers/README.md)
- [Data Engine README](./p11-platform/services/data-engine/README.md)

### Archived Documentation
- [Outdated Documentation](./outdated/) - Historical implementation notes

---

## 🤝 Contributing

This is a private project for P11 Creative. For internal team members:

1. Create a feature branch from `main`
2. Make your changes
3. Submit a pull request for review

---

## 📄 License

Proprietary — P11 Creative © 2025

---

<div align="center">

**Built with ❤️ by P11 Creative**

*The Autonomous Agency starts now.*

</div>
