# P11 Platform — The Autonomous Agency

<div align="center">

**AI-Powered Marketing Suite for Multifamily Real Estate**

[![TypeScript](https://img.shields.io/badge/TypeScript-91.2%25-3178C6?style=flat-square&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Python](https://img.shields.io/badge/Python-6.9%25-3776AB?style=flat-square&logo=python&logoColor=white)](https://www.python.org/)
[![Next.js](https://img.shields.io/badge/Next.js-15-000000?style=flat-square&logo=next.js&logoColor=white)](https://nextjs.org/)
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
│  │  (Next.js 15 + React)│    │   (Python + FastAPI)        │   │
│  │                      │    │                             │   │
│  │  • Dashboard Shell   │    │  • ETL Pipelines (Meta,     │   │
│  │  • AI Products UI    │    │    Google Ads, GA4)         │   │
│  │  • Analytics Views   │    │  • Web Scrapers             │   │
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
| **LeadPulse™** | Predictive lead scoring (XGBoost ML model) | 🔨 Building |
| **TourSpark™** | Automated follow-up sequences that convert | 📋 Planned |

### Content Factory
| Product | Description | Status |
|---------|-------------|--------|
| **ForgeStudio AI™** | Generate 100+ content pieces monthly per property | ✅ Live |
| **ReviewFlow AI™** | Sentiment analysis + auto-responses for reviews | ✅ Live |
| **SocialPilot X™** | Autonomous social media management | 📋 Planned |

### Strategic Intelligence
| Product | Description | Status |
|---------|-------------|--------|
| **MultiChannel BI** | Unified analytics with natural language queries | ✅ Live |
| **MarketVision 360™** | Real-time competitor intelligence & scraping | ✅ Live |
| **ChurnSignal™** | Resident churn prediction | 📋 Planned |

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|------------|
| **Frontend** | Next.js 15, React 19, Tailwind CSS, Recharts |
| **Backend** | Next.js API Routes, Supabase Edge Functions |
| **Database** | PostgreSQL + pgvector (Supabase) |
| **AI/ML** | OpenAI GPT-4o, text-embedding-3-small, LangChain.js |
| **Data Pipelines** | Python, dlt, Playwright (scraping) |
| **Auth** | Supabase Auth (GoTrue) |
| **Deployment** | Vercel (web), Heroku (data-engine) |

---

## 📁 Project Structure

```
oneClick/
├── p11-platform/
│   ├── apps/
│   │   └── web/                    # Next.js 15 Dashboard
│   │       ├── app/
│   │       │   ├── api/            # API Routes
│   │       │   │   ├── analytics/  # BI endpoints
│   │       │   │   ├── chat/       # LumaLeasing RAG
│   │       │   │   ├── forgestudio/# Content generation
│   │       │   │   ├── marketvision/# Competitor intel
│   │       │   │   └── reviewflow/ # Review management
│   │       │   ├── auth/           # Authentication pages
│   │       │   └── dashboard/      # Product pages
│   │       └── components/         # React components
│   ├── services/
│   │   └── data-engine/            # Python ETL & ML
│   │       ├── pipelines/          # GA4, Google Ads, Meta
│   │       └── scrapers/           # Competitor data
│   └── supabase/
│       └── migrations/             # Database schema
└── docs/                           # Planning documents
```

---

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- Python 3.11+
- Supabase project (with pgvector enabled)
- OpenAI API key

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

# Site URL
NEXT_PUBLIC_SITE_URL=http://localhost:3000
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
| `documents` | RAG knowledge base (pgvector embeddings) |
| `fact_marketing_performance` | Unified marketing metrics |
| `leads` | Lead tracking and scoring |
| `conversations` / `messages` | Chat history |
| `content_drafts` | ForgeStudio generated content |
| `reviews` / `review_responses` | ReviewFlow data |
| `competitor_snapshots` | MarketVision scraped data |

---

## 🔌 API Reference

### LumaLeasing Chat
```typescript
POST /api/chat
Body: { messages: Message[], propertyId: string, conversationId?: string }
Response: { role: "assistant", content: string, conversationId: string }
```

### ForgeStudio Content Generation
```typescript
POST /api/forgestudio/generate
Body: { propertyId: string, contentType: "social" | "blog", topic: string }
Response: { drafts: ContentDraft[] }
```

### MarketVision Competitors
```typescript
GET /api/marketvision/competitors?propertyId=...
Response: { competitors: Competitor[], lastUpdated: string }
```

### ReviewFlow
```typescript
GET /api/reviewflow/reviews?propertyId=...&status=pending
Response: { reviews: Review[], stats: ReviewStats }
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
source venv/bin/activate  # or `venv\Scripts\activate` on Windows
pip install -r requirements.txt

# Run API server
uvicorn main:app --reload

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

---

## 🗺️ Roadmap

### Q1 2026 — Foundation
- [x] Data Lake infrastructure
- [x] LumaLeasing RAG chatbot
- [x] MultiChannel BI dashboard
- [x] ForgeStudio content generation

### Q2 2026 — Conversion
- [x] MarketVision competitor scraping
- [x] ReviewFlow sentiment analysis
- [ ] LeadPulse ML scoring
- [ ] TourSpark automation

### Q3 2026 — Scale
- [ ] SocialPilot auto-posting
- [ ] AdForge ad generation
- [ ] SearchBoost SEO automation

### Q4 2026 — Optimization
- [ ] ChurnSignal retention prediction
- [ ] TrueSource attribution
- [ ] Full autonomous operations

---

## 📚 Documentation

- [Implementation Plan](./Implementation_Plan_MVP.md)
- [Product Tech Specs](./Product_Tech_Specs.md)
- [Progress Report](./Progress_Analysis_Report.md)
- [Roadmap & RICE Analysis](./P11_Product_Roadmap_RICE_Analysis.md)

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


