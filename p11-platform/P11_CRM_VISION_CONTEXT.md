# P11 Platform: CRM Vision & Codebase Analysis Context
## Reference Document for Linear Updates

**Generated:** December 10, 2025  
**Purpose:** Context preservation for Linear MCP updates and continuation of CRM vision work

---

## 1. Executive Summary: The Vision

**Goal:** Build a **one-click real estate marketing and web agency** across all functions and channels.

**Core Insight:** The big issue with Yardi/RealPage is not lack of features—it's setup complexity. P11's wedge is: **"Let an LLM chatbot configure your CRM pipelines via speech/image, not 40 hours of manual setup."**

**Proposed Architecture:** **P11 Core CRM** becomes the spine that powers all apps:
- LumaLeasing, LeadPulse, ReviewFlow, ForgeStudio, MarketVision, SiteForge AI
- All apps are clients of the CRM, not siloed tools
- LLM is the configuration interface

---

## 2. Current Linear Roadmap Summary

### Team
- **P11** (Team ID: `c220662f-8b4a-479d-82f0-be73aacab8f4`)

### Active Projects by Priority

| Project | RICE | Status | Timeline | Linear ID |
|---------|------|--------|----------|-----------|
| **Data Lake P11** | 75 | In Progress | Nov 2025 - Jan 2026 | `9bccca02-c9bd-438c-aefd-8190bf534419` |
| **Offshore Team Hiring** | 35 | In Progress | Dec 2025 - Jan 2026 | `49cb5d67-6b25-46ad-a21f-950945bf5bcd` |
| **Property Audit System** | 38 | In Progress | Through Jun 2026 | `37dda04b-8f4b-43f6-b1b5-9e85152b320f` |
| **Ad Channel Platform** | 42 | In Progress | Through Q1 2026 | `fed79bae-ae9c-4c7e-933f-d3185d1b3a6c` |
| **MultiChannel BI Tool** | 48 | Planned | Jan-Mar 2026 | `a153ad87-46f0-41b6-9bc1-00f6497638a5` |
| **LumaLeasing™** | 45 | Planned | Jan-Mar 2026 | `c2508121-3758-48f6-82c7-adfe448bb7e2` |
| **P11 Milo** | 22 | Planned | Dec 2025 - Jan 2026 | `3d606723-0948-42c6-a380-30a96d1a8de1` |
| **TourSpark™** | 38 | Backlog | Q2 2026 | `90cc71b1-985d-4e37-be36-0560ecd6611b` |
| **LeadPulse™** | 40 | Backlog | Q2-Q3 2026 | `1a1636aa-62e7-4ff1-998b-3fcafebf36ff` |
| **MarketVision 360™** | 36 | Backlog | Q2 2026 | `59f146f7-e419-4c48-8055-1f92e44a1aa4` |
| **ForgeStudio AI™** | 28 | Backlog | Q3 2026 | `0243fc5b-ae69-4d8d-acef-58fd268683f4` |

### Critical Issues (Urgent)

| Issue | Description | Due | Linear ID |
|-------|-------------|-----|-----------|
| P11-61 | Draft Job Descriptions for Offshore | Dec 12, 2025 | `f0f6eab7-4b06-4af4-8d87-d09292fb99c5` |
| P11-59 | Recruit 5-Person Offshore Team | Jan 15, 2026 | `31544140-d34b-40d6-acc8-378b46b89fa7` |
| P11-56 | Meta Ads Data Pipeline | Jan 20, 2026 | `402b68b9-1793-4050-ac10-4cce209f061e` |
| P11-57 | Google Ads Data Pipeline | Jan 20, 2026 | `e8568644-0d07-4d48-83bd-0c58e178f627` |
| P11-58 | GA4 Data Pipeline | Jan 27, 2026 | `56545012-98e7-46e9-bc7d-f5a1810a092d` |

---

## 3. Codebase Architecture Analysis

### 3.1 Current Tech Stack
- **Frontend:** Next.js 14+ (App Router), TypeScript, Tailwind CSS
- **Backend:** Supabase (PostgreSQL, Auth, Realtime, Edge Functions)
- **Data Engine:** Python 3.11 (FastAPI, scrapers)
- **Vector DB:** pgvector (inside Supabase)
- **AI:** OpenAI (GPT-4o-mini, text-embedding-3-small)

### 3.2 Existing Database Schema (Migrated)

**Core Identity:**
- `organizations` - Multi-tenant root
- `properties` - Property records (property_id is central FK)
- `profiles` - User accounts

**Marketing Data:**
- `fact_marketing_performance` - Unified ad/campaign metrics

**LumaLeasing (RAG):**
- `documents` - Vector-embedded knowledge chunks
- `conversations` - Chat threads
- `messages` - Individual messages
- `leads` - Lead records (basic CRM primitive)

**ForgeStudio:**
- `forgestudio_config` - Per-property content settings
- `content_templates` - Generation templates
- `content_drafts` - Generated content awaiting approval
- `content_assets` - Images/videos
- `social_connections` - Platform OAuth tokens
- `published_posts` - Post tracking

**ReviewFlow:**
- `reviewflow_config` - Per-property review settings
- `reviews` - Aggregated reviews
- `review_responses` - AI/manual responses
- `review_tickets` - Follow-up tickets
- `review_platform_connections` - Platform APIs

**Community Onboarding:**
- `community_profiles` - Extended property data
- `community_contacts` - Multi-contact support
- `integration_credentials` - Platform access tracking
- `onboarding_tasks` - Checklist
- `knowledge_sources` - Document tracking

**Competitor Intelligence:**
- `competitor_brand_intelligence` - Competitor profiles
- `competitor_content_chunks` - Scraped content
- `competitor_scrape_jobs` - Job tracking

### 3.3 CRITICAL: Schema Gaps (Code References Tables That Don't Exist)

The following tables are **referenced in code but NOT in migrations**:

| Table | Referenced In | Purpose |
|-------|--------------|---------|
| `lead_workflows` | `workflow-processor.ts`, leads API | Workflow instance per lead |
| `workflow_definitions` | `workflow-processor.ts` | Workflow templates |
| `workflow_actions` | `workflow-processor.ts` | Action execution log |
| `follow_up_templates` | `workflow-processor.ts` | Message templates |
| `lead_engagement_events` | `leadpulse/events/route.ts` | Event tracking for scoring |
| `lead_scores` | `leadpulse/score/route.ts` | Scoring results |
| `lead_activities` | `lumaleasing/lead/route.ts` | Activity log |
| `widget_sessions` | `lumaleasing/lead/route.ts` | LumaLeasing widget sessions |
| `lumaleasing_config` | `lumaleasing/chat/route.ts` | Widget configuration |
| `tours` | `leads/[id]/tours/route.ts` | Tour scheduling |

**⚠️ BLOCKER:** The workflow engine, LeadPulse scoring, and LumaLeasing widget cannot function in production until these tables are migrated.

### 3.4 Existing API Structure

```
/api
├── leads/          # Lead CRUD + tours + workflows
├── leadpulse/      # Scoring + events + insights
├── lumaleasing/    # Chat widget + admin + tours
├── forgestudio/    # Content generation + social
├── reviewflow/     # Reviews + responses + tickets
├── marketvision/   # Competitor intel + pricing
├── analytics/      # Performance queries
├── onboarding/     # Property setup
├── properties/     # Property CRUD
├── workflows/      # Automation processor (CRON)
└── cron/           # Scheduled jobs
```

### 3.5 Git History (Recent)

```
c7feb9b - Add MCP Ads Integration Plan
511c04c - Update README, fix GoalTracker
0a0103c - Instagram OAuth, AI tour emails, batch review analysis
49f8f2e - ReviewFlow multi-source integration
d399416 - ForgeStudio Veo 3 integration
f3018f7 - MarketVision Apartments.com integration
fdc1323 - Community onboarding, Brand Intelligence
7170d4e - Comprehensive README updates
559cacf - Initial commit
```

---

## 4. Proposed: P11 Core CRM Architecture

### 4.1 The "CRM as Spine" Model

```
┌─────────────────────────────────────────────────────────────────┐
│                      P11 CORE CRM                               │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐               │
│  │  Entities   │ │  Pipelines  │ │ Automations │               │
│  │ Lead/Tour/  │ │ Stages/SLA  │ │ Triggers/   │               │
│  │ Resident/   │ │ Transitions │ │ Actions     │               │
│  │ Campaign    │ │             │ │             │               │
│  └─────────────┘ └─────────────┘ └─────────────┘               │
│                                                                 │
│  ┌─────────────────────────────────────────────┐               │
│  │           EVENT BUS (crm_events)            │               │
│  │  All apps publish events → triggers fire    │               │
│  └─────────────────────────────────────────────┘               │
│                                                                 │
│  ┌─────────────────────────────────────────────┐               │
│  │        LLM CONFIGURATION INTERFACE          │               │
│  │  "Create a pipeline for student housing"    │               │
│  │  → Generates config → Human approves →      │               │
│  │  → Engine applies                           │               │
│  └─────────────────────────────────────────────┘               │
└─────────────────────────────────────────────────────────────────┘
                              │
        ┌─────────────────────┼─────────────────────┐
        │                     │                     │
        ▼                     ▼                     ▼
┌──────────────┐    ┌──────────────┐    ┌──────────────┐
│ LumaLeasing  │    │  ForgeStudio │    │  SiteForge   │
│ (Chat/Leads) │    │ (Content)    │    │ (WordPress)  │
└──────────────┘    └──────────────┘    └──────────────┘
        │                     │                     │
        ▼                     ▼                     ▼
┌──────────────┐    ┌──────────────┐    ┌──────────────┐
│  LeadPulse   │    │  ReviewFlow  │    │ MarketVision │
│ (Scoring)    │    │ (Reviews)    │    │ (Intel)      │
└──────────────┘    └──────────────┘    └──────────────┘
```

### 4.2 New Tables Required for CRM Vision

```sql
-- CRM Pipeline Configuration
CREATE TABLE crm_pipelines (
  id uuid PRIMARY KEY,
  property_id uuid REFERENCES properties(id),
  name text NOT NULL,
  pipeline_type text, -- 'lead', 'resident', 'campaign'
  stages jsonb NOT NULL, -- [{name, order, sla_hours, auto_transition}]
  is_default boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- CRM Triggers (When X happens...)
CREATE TABLE crm_triggers (
  id uuid PRIMARY KEY,
  property_id uuid REFERENCES properties(id),
  name text NOT NULL,
  event_type text NOT NULL, -- 'lead_created', 'tour_no_show', etc.
  conditions jsonb, -- [{field, operator, value}]
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- CRM Actions (...do Y)
CREATE TABLE crm_actions (
  id uuid PRIMARY KEY,
  trigger_id uuid REFERENCES crm_triggers(id),
  action_type text NOT NULL, -- 'send_sms', 'create_task', 'update_stage', 'webhook'
  action_config jsonb NOT NULL, -- Parameters for the action
  delay_minutes int DEFAULT 0,
  execution_order int DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- CRM Events (Central event bus)
CREATE TABLE crm_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id uuid REFERENCES properties(id),
  event_type text NOT NULL,
  entity_type text, -- 'lead', 'tour', 'review', etc.
  entity_id uuid,
  payload jsonb,
  processed boolean DEFAULT false,
  processed_at timestamptz,
  created_at timestamptz DEFAULT now()
);

-- CRM Config Versions (For rollback)
CREATE TABLE crm_config_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id uuid REFERENCES properties(id),
  config_type text NOT NULL, -- 'pipeline', 'trigger', 'action'
  config_id uuid NOT NULL,
  version int NOT NULL,
  config_snapshot jsonb NOT NULL,
  changed_by uuid REFERENCES profiles(id),
  change_reason text,
  created_at timestamptz DEFAULT now()
);
```

### 4.3 Implementation Phases

| Phase | Focus | Timeline | Deliverables |
|-------|-------|----------|--------------|
| **0** | Schema Fixes | Week 1-2 | Migrate missing tables (workflows, leadpulse, tours, etc.) |
| **1** | Formalize CRM Config | Week 3-6 | `crm_pipelines`, `crm_triggers`, `crm_actions` tables + admin UI |
| **2** | Event Bus | Week 7-10 | `crm_events` table + central event router |
| **3** | LLM Configurator | Week 11-16 | Chat interface to generate/modify configs |
| **4** | Voice/Image | Week 17+ | Alternative input modalities |

---

## 5. Alignment with "One-Click Agency" Vision

| Vision Component | How CRM Delivers It |
|------------------|---------------------|
| **One Click** | LLM-configured pipelines = describe → auto-setup |
| **All Functions** | CRM is data layer; all apps are clients |
| **All Channels** | Web (SiteForge), Chat (Luma), Social (Forge), Email/SMS (workflows), Ads (pipelines) |
| **Marketing Agency** | Content, ads, SEO orchestrated from single property context |
| **Web Agency** | SiteForge generates sites using CRM data |

---

## 6. Recommended Linear Updates

### New Project to Create

**Project:** P11 Core CRM [TIER 0 - CRITICAL]
- **Summary:** Central CRM spine enabling LLM-configured pipelines across all apps
- **RICE:** 80+ (Reach: 100, Impact: 3, Confidence: 85%, Effort: 8)
- **Timeline:** Q1-Q2 2026
- **Dependencies:** Data Lake P11, Schema Gap Fixes
- **Description:** [Use content from Section 4]

### New Issues to Create

1. **🔴 CRITICAL: Migrate Missing Workflow/LeadPulse/LumaLeasing Tables**
   - Priority: Urgent
   - Project: Data Lake P11 or new CRM project
   - Due: Jan 15, 2026
   - Description: Create migration for `lead_workflows`, `workflow_definitions`, `workflow_actions`, `follow_up_templates`, `lead_engagement_events`, `lead_scores`, `lead_activities`, `widget_sessions`, `lumaleasing_config`, `tours`

2. **Design CRM Pipeline Configuration Schema**
   - Priority: High
   - Project: P11 Core CRM
   - Due: Feb 15, 2026
   - Description: Create `crm_pipelines`, `crm_triggers`, `crm_actions` tables with versioning

3. **Build Central Event Bus**
   - Priority: High
   - Project: P11 Core CRM
   - Due: Mar 15, 2026
   - Description: Create `crm_events` table and event router that evaluates triggers

4. **LLM Pipeline Configurator MVP**
   - Priority: High
   - Project: P11 Core CRM
   - Due: Apr 30, 2026
   - Description: Chat interface to generate/modify CRM configs via natural language

5. **Integrate SiteForge with CRM**
   - Priority: Medium
   - Project: P11 Core CRM or ForgeStudio
   - Due: Q3 2026
   - Description: WordPress generation pulls from CRM data; web forms write back to CRM

### Issues to Update

- **LumaLeasing™** - Add dependency on "Migrate Missing Tables" issue
- **TourSpark™** - Add dependency on CRM pipelines
- **LeadPulse™** - Add dependency on "Migrate Missing Tables" issue

---

## 7. Technical Debt to Address

| Item | Severity | Effort | Recommendation |
|------|----------|--------|----------------|
| Schema/Code Drift | Critical | 2-3 days | Create migration for all missing tables immediately |
| No Config Versioning | High | 1 week | Add `crm_config_versions` table before LLM configurator |
| No Event Bus | High | 2 weeks | Build before adding more automations |
| Workflow Engine Tables | Critical | 1 day | Already designed in code, just need migration |

---

## 8. Success Metrics for CRM Vision

| Metric | Target | Timeline |
|--------|--------|----------|
| Schema gaps closed | 100% | Jan 2026 |
| CRM config tables live | Yes | Feb 2026 |
| Event bus processing | Yes | Mar 2026 |
| LLM configurator MVP | 1 property | Apr 2026 |
| Full LLM configurator | 10 properties | Jun 2026 |
| Time to configure new property | < 15 minutes | Q3 2026 |
| Manual CRM setup eliminated | 80% | Q4 2026 |

---

## 9. Files to Reference

**Schema:**
- `p11-platform/supabase/migrations/` - All existing migrations
- `p11-platform/apps/web/app/onboarding/types.ts` - Data model intent

**Workflow Engine:**
- `p11-platform/apps/web/utils/services/workflow-processor.ts` - Core logic
- `p11-platform/apps/web/app/api/workflows/process/route.ts` - CRON endpoint

**LeadPulse:**
- `p11-platform/apps/web/app/api/leadpulse/` - Scoring + events APIs

**LumaLeasing:**
- `p11-platform/apps/web/app/api/lumaleasing/` - Chat + widget APIs

**Leads:**
- `p11-platform/apps/web/app/api/leads/` - Lead CRUD + tours + workflows
- `p11-platform/apps/web/app/dashboard/leads/page.tsx` - UI reference

**Roadmap Docs:**
- `Master_Implementation_Plan_2026.md`
- `P11_Product_Roadmap_RICE_Analysis.md`
- `Implementation_Plan_MVP.md`

---

## 10. Next Steps for Linear MCP Update

1. **Create new project:** "P11 Core CRM [TIER 0 - CRITICAL]"
2. **Create issue:** "🔴 CRITICAL: Migrate Missing Tables" (blocks everything)
3. **Create issue:** "Design CRM Pipeline Configuration Schema"
4. **Create issue:** "Build Central Event Bus"
5. **Create issue:** "LLM Pipeline Configurator MVP"
6. **Update existing projects** with dependencies on CRM foundation
7. **Adjust timelines** to reflect that LumaLeasing/TourSpark/LeadPulse depend on schema fixes

---

## 11. Linear Update Log

### December 10, 2025 - Full Sync Complete ✅

**New Projects Created:**
- **ReviewFlow AI™ [TIER 1 - Q1]** - 95% complete, was missing from Linear
- **P11 Core CRM [TIER 0 - CRITICAL]** - Central CRM spine per this vision doc

**New Issues Created:**
- **P11-62:** 🔴 CRITICAL: Migrate Missing Schema Tables (Due: Jan 15)
- **P11-63:** Design CRM Pipeline Configuration Schema (Due: Feb 15)
- **P11-64:** Build Central Event Bus (Due: Mar 15)
- **P11-65:** LLM Pipeline Configurator MVP (Due: Apr 30)

**Issues Updated to Done:**
- P11-56: Meta Ads pipeline ✅
- P11-57: Google Ads pipeline ✅
- P11-58: GA4 pipeline ✅

**Projects Status Updated:**
- LumaLeasing™: Planned → In Progress (100% complete)
- TourSpark™: Backlog → In Progress (96% complete)
- LeadPulse™: Backlog → In Progress (85% complete)
- MarketVision 360™: Planned → In Progress (95% complete)
- ForgeStudio AI™: Backlog → In Progress (95% complete)

**Summary Issue:** P11-66 documents all changes

---

**Document Status:** ✅ Linear MCP updates COMPLETE - Dec 10, 2025

