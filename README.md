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
| **LumaLeasing™** | 24/7 AI chatbot with RAG for instant prospect responses | ✅ Live |
| **LeadPulse™** | Predictive lead scoring with engagement & behavior analysis | ✅ Live |
| **TourSpark™** | Automated tour scheduling with AI-generated confirmation emails | ✅ Live |

### Content Factory
| Product | Description | Status |
|---------|-------------|--------|
| **ForgeStudio AI™** | Generate content with Google Veo 3 video + Imagen 3 images | ✅ Live |
| **ReviewFlow AI™** | Multi-source review sync (Google, Yelp, SerpAPI) + AI responses | ✅ Live |
| **SocialPilot X™** | Instagram integration with per-property OAuth credentials | ✅ Live |

### Strategic Intelligence
| Product | Description | Status |
|---------|-------------|--------|
| **MultiChannel BI** | Unified analytics with natural language queries | ✅ Live |
| **MarketVision 360™** | Competitor scraping + Brand Intelligence AI analysis | ✅ Live |
| **Community Intelligence** | Website scraping + Knowledge base auto-population | ✅ Live |

---

## ✨ Latest Updates (Dec 2025)

### 🔐 Per-Property Social Authentication
- **Custom OAuth Credentials**: Each property can now configure their own Instagram/Facebook app credentials
- **Secure Storage**: Encrypted app secrets stored in `social_auth_configs` table
- **Setup Modal**: New `InstagramSetupModal` component guides users through OAuth app creation
- **Fallback Support**: Gracefully falls back to environment variables if not configured

### 📧 AI-Powered Tour Confirmations
- **Smart Email Generation**: `tour-email-generator.ts` creates personalized confirmation emails
- **Property Context**: Includes amenities, contact info, and tour details
- **Automated Scheduling**: Integrated with TourSpark lead management

### 📊 Batch Review Analysis
- **Bulk Processing**: New `/api/reviewflow/analyze-batch` endpoint for analyzing multiple reviews
- **SerpAPI Integration**: Enhanced Google Places scraping with `serpapi_reviews.py`
- **Multi-Source Sync**: Improved review sync with better error handling

### 🎨 UI/UX Enhancements
- **Improved Lead Management**: Enhanced tour scheduling modal with better validation
- **Review Import Flow**: Streamlined import process with progress indicators
- **Global Styles**: Updated `globals.css` with better typography and spacing

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|------------|
| **Frontend** | Next.js 16, React 19.2, Tailwind CSS 4, Recharts |
| **Backend** | Next.js API Routes, FastAPI (Python) |
| **Database** | PostgreSQL + pgvector (Supabase) |
| **AI/ML** | OpenAI GPT-4o, text-embedding-3-small, LangChain |
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
├── p11-platform/
│   ├── apps/
│   │   └── web/                    # Next.js 16 Dashboard
│   │       ├── app/
│   │       │   ├── api/            # API Routes (85+ endpoints)
│   │       │   │   ├── analytics/  # BI endpoints (performance, goals, campaigns)
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
│   │       │   ├── dashboard/      # Product pages (14 sections)
│   │       │   └── onboarding/     # Multi-step wizard (6 steps)
│   │       ├── components/         # React components (85+)
│   │       │   ├── charts/         # BI visualizations
│   │       │   ├── community/      # Community management
│   │       │   ├── forgestudio/    # Content generation + Instagram setup
│   │       │   ├── leadpulse/      # Lead scoring components
│   │       │   ├── leads/          # Tour scheduling modals
│   │       │   ├── lumaleasing/    # Chatbot widget + config
│   │       │   ├── marketvision/   # Competitor analysis
│   │       │   └── reviewflow/     # Review management + import
│   │       └── utils/
│   │           └── services/       # Business logic
│   │               ├── messaging.ts           # SMS/Email services
│   │               └── tour-email-generator.ts # AI tour confirmations
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
│       └── migrations/             # 11 migration files
│           ├── 20251208000000_init_schema.sql
│           ├── 20251209030000_forgestudio_reviewflow_schema.sql
│           ├── 20251209040000_community_onboarding_schema.sql
│           ├── 20251209050000_competitor_brand_intelligence.sql
│           ├── 20251210000000_reviewflow_multi_source.sql
│           └── 20251210010000_social_auth_configs.sql  # NEW
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

# Google Cloud (Vertex AI for Veo 3)
GOOGLE_CLOUD_PROJECT_ID=your-project-id
GOOGLE_APPLICATION_CREDENTIALS=path/to/service-account.json

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
| `reviews` / `review_responses` | ReviewFlow data |
| `review_platform_connections` | Google, Yelp, manual connections |
| `competitors` / `competitor_snapshots` | MarketVision scraped data |
| `competitor_brand_intelligence` | AI-analyzed brand positioning |
| `competitor_content_chunks` | Vector embeddings for semantic search |
| `social_auth_configs` | **NEW**: Per-property OAuth credentials |

---

## 🔌 API Reference

### LumaLeasing Chat
```typescript
POST /api/chat
Body: { messages: Message[], propertyId: string, conversationId?: string }
Response: { role: "assistant", content: string, conversationId: string }

POST /api/lumaleasing/chat   // External widget endpoint
Body: { message: string, propertyId: string, sessionId?: string }
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

### ✅ Q1 2026 — Intelligence (Complete)
- [x] MarketVision competitor scraping
- [x] Brand Intelligence AI analysis
- [x] ReviewFlow multi-source (Google, Yelp, SerpAPI)
- [x] LeadPulse ML scoring
- [x] ForgeStudio Veo 3 video generation
- [x] Website Intelligence scraping
- [x] Per-property social OAuth
- [x] AI tour confirmations
- [x] Batch review analysis

### 🔨 Q2 2026 — Scale (In Progress)
- [ ] TourSpark automation sequences
- [ ] SocialPilot auto-posting
- [ ] AdForge ad generation
- [ ] SearchBoost SEO automation

### 📋 Q3-Q4 2026 — Optimization
- [ ] ChurnSignal retention prediction
- [ ] TrueSource attribution
- [ ] Full autonomous operations

---

## 📚 Documentation

- [Implementation Plan](./Implementation_Plan_MVP.md)
- [Product Tech Specs](./Product_Tech_Specs.md)
- [Progress Report](./Progress_Analysis_Report.md)
- [Roadmap & RICE Analysis](./P11_Product_Roadmap_RICE_Analysis.md)
- [ForgeStudio Veo 3 Update](./p11-platform/apps/web/FORGESTUDIO_VEO3_UPDATE.md)
- [ReviewFlow Multi-Source](./p11-platform/apps/web/REVIEWFLOW_MULTI_SOURCE.md)
- [Community Onboarding Plan](./p11-platform/Community_Onboarding_Enhancement_Plan.md)

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
