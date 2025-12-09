# P11 Console (Next.js App)

The unified dashboard for P11 Autonomous Agency products. Built with Next.js 14 (App Router), Tailwind CSS, Supabase, and OpenAI.

## 🚀 Quickstart

```bash
cd p11-platform
cp .env.example .env        # Fill in your credentials (shared across all apps)
cd apps/web
npm install
npm run dev
```

Visit http://localhost:3000 — authenticated users land in `/dashboard`.

## ✨ Features

### Platform
- **Authentication** - Supabase Auth with email/password and Google OAuth
- **Multi-tenant** - Property switcher with organization-scoped data
- **Dashboard Shell** - Sidebar navigation, user menu, responsive design

### Products
- **MultiChannel BI** (`/dashboard/bi`) - Marketing analytics with charts and metrics
- **LumaLeasing** (`/dashboard/luma`) - AI-powered leasing chatbot with RAG
- **Properties** (`/dashboard/properties`) - Property CRUD management
- **Team** (`/dashboard/team`) - Team member management and invitations
- **Settings** (`/dashboard/settings`) - Organization and integration settings

### AI Capabilities
- **RAG Pipeline** - Document chunking, embeddings (text-embedding-3-small), vector search
- **PDF Upload** - Parse and ingest PDF, TXT, and MD files
- **Conversation Persistence** - Chat history saved to database
- **Context-Aware Responses** - GPT-4o-mini with property-specific knowledge

## 🔧 Environment Variables

Environment variables are loaded from the **root** `p11-platform/.env` file (shared across all apps).

```bash
cp ../../../.env.example ../.env  # From apps/web, copy root example
```

Key variables:

| Variable | Description | Required |
|----------|-------------|----------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL | ✅ |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase public anon key | ✅ |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role (server-side) | ✅ |
| `OPENAI_API_KEY` | OpenAI API key | ✅ |
| `NEXT_PUBLIC_SITE_URL` | App URL for auth redirects | Optional |

See `p11-platform/.env.example` for the complete list with detailed comments.

## 📁 Project Structure

```
apps/web/
├── app/
│   ├── api/              # API routes
│   │   ├── analytics/    # BI data endpoints
│   │   ├── chat/         # LumaLeasing RAG chat
│   │   ├── conversations/# Chat history
│   │   ├── documents/    # Document upload & ingestion
│   │   ├── properties/   # Property CRUD
│   │   └── team/         # Team management
│   ├── auth/             # Auth pages (login, signup, etc.)
│   └── dashboard/        # Dashboard pages
├── components/
│   ├── charts/           # Recharts visualizations
│   ├── layout/           # Sidebar, PropertyContext
│   ├── luma/             # Chat, DocumentUploader
│   └── ui/               # Shared UI components
├── utils/
│   └── supabase/         # Supabase client utilities
└── middleware.ts         # Auth route protection
```

## 🗄️ Database

Migrations are in `p11-platform/supabase/migrations/`. Apply them to your Supabase project:

```bash
supabase db push
```

Key tables:
- `organizations` - Multi-tenant companies
- `properties` - Apartment communities
- `documents` - RAG knowledge base with pgvector
- `fact_marketing_performance` - Unified marketing metrics
- `leads`, `conversations`, `messages` - Lead/chat tracking

## 🔌 API Reference

### Chat
```typescript
POST /api/chat
Body: { messages, propertyId, conversationId? }
Returns: { role, content, conversationId }
```

### Documents
```typescript
POST /api/documents/upload
Body: FormData { file, propertyId, title? }
Accepts: PDF, TXT, MD (max 10MB)
```

### Analytics
```typescript
GET /api/analytics/performance?propertyId=...&startDate=...&endDate=...
Returns: { timeSeries, channels, totals }
```

## 🧪 Development

```bash
# Start dev server
npm run dev

# Type check
npm run type-check

# Lint
npm run lint
```

## 📚 Related

- **Data Engine** - Python ETL pipelines in `services/data-engine/`
- **Progress Report** - See `/Progress_Analysis_Report.md`
- **Roadmap** - See `/Linear_Implementation_Summary.md`
