# P11 Creative: Master Technical Implementation Plan (2026)

**Version:** 2.0 (Comprehensive)  
**Date:** December 8, 2025  
**Author:** Jesse Gill (Director of Product)

---

## 1. Executive Summary

This document serves as the technical blueprint for building the **P11 Autonomous Agency Platform**. Unlike a traditional agency that uses disparate tools, P11 is building a **unified operating system** where 50+ AI products live as modular applications sharing a common data core.

**The Goal:** By Q4 2026, a single "P11 Console" will allow clients to view performance, property managers to manage leads, and internal teams to oversee autonomous agents—all powered by a shared Data Lake and Intelligence Layer.

---

## 2. Platform Architecture: The "P11 Console"

We are building a **Monorepo** structure. This allows us to share UI components, database types, and utility logic across all 50 products while keeping them modular.

### 2.1 Tech Stack
*   **Frontend Framework:** Next.js 14+ (App Router)
*   **Language:** TypeScript (Strict Mode)
*   **Styling:** Tailwind CSS + Shadcn/UI (Standardized Design System)
*   **Backend:** Supabase (PostgreSQL, Auth, Realtime, Edge Functions)
*   **Data Science:** Python 3.11 (FastAPI for ML inference, scripts for ETL)
*   **Vector DB:** pgvector (inside Supabase)
*   **Orchestration:** GitHub Actions (CI/CD) + Cron Jobs (Data Sync)

### 2.2 Core Database Schema (Supabase)
All products read from these shared tables. **Row-Level Security (RLS)** is strictly enforced based on `organization_id`.

```sql
-- CORE IDENTITY
create table organizations (
  id uuid primary key,
  name text,
  subscription_tier text -- 'starter', 'growth', 'enterprise'
);

create table properties (
  id uuid primary key,
  org_id uuid references organizations,
  name text,
  address jsonb,
  settings jsonb -- timezone, office hours, etc.
);

create table profiles (
  id uuid references auth.users,
  org_id uuid references organizations,
  role text -- 'admin', 'manager', 'viewer'
);

-- UNIVERSAL DATA LAKE (The "Source of Truth")
create table fact_marketing_daily (
  date date,
  property_id uuid references properties,
  channel text, -- 'meta', 'google', 'zillow'
  spend numeric,
  impressions int,
  clicks int,
  leads int,
  primary key (date, property_id, channel)
);

create table fact_leads (
  id uuid primary key,
  property_id uuid references properties,
  source text,
  contact_info jsonb, -- encrypted
  status text, -- 'new', 'tour_booked', 'leased'
  ai_score int -- 0-100 (LeadPulse)
);
```

---

## 3. Q1 2026: Foundation & Intelligence (Jan - Mar)

**Focus:** Build the Data Lake and the first "killer app" (LumaLeasing).

### 3.1 Data Lake Pipelines (Python/ETL)
We cannot build AI without clean data. The Offshore Data Engineer will build these pipelines immediately.

*   **Architecture:** `dlt` (Data Load Tool) pipelines running on GitHub Actions.
*   **Sources:**
    1.  **Meta Ads API:** Pull daily insights broken down by Campaign/AdSet.
    2.  **Google Ads API:** Pull Keyword/Ad performance.
    3.  **GA4 Data API:** Pull website traffic, session source, and conversion events.
    4.  **CRM (Entrata/Yardi/RealPage):** *Critical Challenge.* We will start with CSV exports or official APIs if accessible. Fallback: Selenium scrapers.

### 3.2 Product: MultiChannel BI Tool
*   **Tech:** Next.js + Tremor/Recharts.
*   **Key Feature:** "Natural Language SQL".
    *   User asks: *"Show me CPA for The Reserve vs. competitors last month."*
    *   Backend: OpenAI GPT-4 converts text -> SQL query against `fact_marketing_daily`.
    *   Frontend: Renders the result as a Line Chart.

### 3.3 Product: LumaLeasing (The Chatbot)
*   **Architecture:** RAG (Retrieval-Augmented Generation) Pipeline.
*   **Data Ingestion:**
    *   Upload PDF Brochures / Policy Docs -> Supabase Storage.
    *   `Edge Function` triggers on upload -> Chunks text -> Generates Embeddings (OpenAI `text-embedding-3-small`) -> Stores in `document_embeddings` table.
*   **Chat Logic (Edge Function):**
    ```typescript
    async function handleMessage(userQuery: string, propertyId: string) {
      // 1. Search Knowledge Base
      const context = await supabase.rpc('match_documents', { 
        query_embedding: await embed(userQuery), 
        filter_property: propertyId 
      });
      
      // 2. Generate Response
      const response = await openai.chat.completions.create({
        messages: [
          { role: 'system', content: `You are a leasing agent. Use this context: ${context}` },
          { role: 'user', content: userQuery }
        ]
      });
      
      return response;
    }
    ```

---

## 4. Q2 2026: Conversion Engines (Apr - Jun)

**Focus:** Turn leads into leases automatically.

### 4.1 Product: TourSpark (Automated Follow-up)
*   **Logic:** A State Machine (using `XState` or simple DB status tracking).
*   **Workflow:**
    1.  Lead enters `fact_leads` (Status: 'New').
    2.  **Trigger:** 5 minutes passed? -> Send SMS: *"Hi [Name], saw you were interested in a 1BD. When are you free to tour?"*
    3.  **Wait:** 24 hours. No reply? -> Send Email: *"Here's a virtual tour link..."*
    4.  **Reply Received:** NLP Classifier detects intent ("Book Tour", "Unsubscribe", "Question").
        *   If "Book Tour" -> Send Calendly/Scheduler link.
        *   If "Question" -> Route to LumaLeasing logic.

### 4.2 Product: LeadPulse (Predictive Scoring)
*   **Model:** Binary Classification (XGBoost).
*   **Training Data:** Historical `fact_leads` data (last 12 months).
    *   *Features:* Time of inquiry, Source (Google vs Meta), Device type, Email domain (@gmail vs corporate), Interaction count.
    *   *Label:* `did_lease` (0 or 1).
*   **Deployment:**
    *   Train locally (Python).
    *   Save model (`.json` or `.pkl`) to Supabase Storage.
    *   **Inference API:** A small FastAPI service hosted on **Fly.io** or **Render** (since Supabase Edge Functions are JS-only). It accepts Lead JSON and returns `score` (0-100).

### 4.3 Product: MarketVision 360 (Competitor Intel)
*   **Infrastructure:** Scraping Cluster.
*   **Tech:** Python + Playwright + BrightData (Proxy Network).
*   **Job:** Weekly cron job visits competitor websites.
    *   Extracts: `Current Rent`, `Concessions` ("1 Month Free"), `Availability`.
*   **Storage:** `competitor_snapshots` table.
*   **UI:** Price trend graph (Us vs. They) over time.

---

## 5. Q3 2026: Content Factory (Jul - Sep)

**Focus:** Generate assets at scale. This is high-compute.

### 5.1 Product: ForgeStudio AI (Content Generation)
*   **Architecture:** "Template-Based Generative Pipeline".
*   **Inputs:** Property Brand Guidelines (Colors, Tone, Logo URL) stored in `brand_kits` table.
*   **Text Gen:** GPT-4 generates 10 captions/week based on "Content Pillars" (Lifestyle, Amenities, Local Area).
*   **Image Gen:**
    *   **Level 1:** Stock Photo Search (Unsplash API) matched to caption.
    *   **Level 2:** Generative Fill (Stability AI API). Take a photo of an empty unit -> Add furniture (Virtual Staging).
*   **Approval Workflow:**
    *   Generated assets go to `content_queue` (Status: 'Pending').
    *   Human (Creative Director) logs into Console -> Clicks "Approve" or "Regenerate".
    *   Approved assets auto-schedule to SocialPilot X.

### 5.2 Product: SocialPilot X (Auto-Poster)
*   **Integration:** Connect to Meta Graph API (Instagram/Facebook) and LinkedIn API.
*   **Scheduler:** A simple cron job that checks `content_queue` for `scheduled_time`.

---

## 6. Q4 2026: Reputation & Optimization (Oct - Dec)

**Focus:** Protecting the brand and keeping residents.

### 6.1 Product: ReviewFlow AI
*   **Ingestion:** Webhooks from Google Business Profile / Yelp API.
*   **Analysis:** GPT-4 Sentiment Analysis (Positive/Negative/Neutral).
*   **Auto-Response:**
    *   *Positive:* Auto-reply: "Thanks [Name]! We love having you."
    *   *Negative:* Draft a response (Empathetic, apologetic) but **require human approval** in the Console. Do NOT auto-post negative replies.

### 6.2 Product: ChurnSignal (Retention Prediction)
*   **Data Source:** `resident_activity` table (Maintenance requests, Late payments, Amenity bookings).
*   **Model:** Survival Analysis (Cox Proportional Hazards) or Classification.
*   **Signal:** "Resident X has had 3 maintenance tickets this month and hasn't booked the gym in 6 weeks. Churn Risk: High."
*   **Action:** Alert Property Manager to reach out personally.

---

## 7. Infrastructure & Security

### 7.1 Security (Day 1 Priority)
*   **Encryption:** All PII (Personally Identifiable Information) in `fact_leads` must be encrypted at rest.
*   **API Keys:** Never store API keys in code. Use Supabase Vault or Environment Variables.
*   **Compliance:** Add a "Data Deletion" button for GDPR/CCPA compliance (Delete user -> Cascade delete all their data).

### 7.2 Scalability
*   **Database:** Supabase scales vertically. If we hit limits, we implement **Partitioning** on `fact_marketing_daily` by `date` (Year/Month).
*   **Compute:** Heavy ML jobs (Training LeadPulse) happen on ephemeral cloud instances (AWS EC2 Spot Instances), not the main web server.

---

## 8. Master Checklist: The "To-Build" List

### Foundation (Q1)
- [ ] **Monorepo Setup:** TurboRepo with `apps/web`, `packages/db`, `packages/ui`.
- [ ] **Auth:** Supabase Auth + RLS Policies for Organizations.
- [ ] **ETL:** Python scripts for Meta/Google/GA4.
- [ ] **Chatbot:** LumaLeasing Edge Function + Vector Search.

### Engines (Q2)
- [ ] **State Machine:** TourSpark follow-up logic.
- [ ] **ML Service:** FastAPI app for LeadPulse inference.
- [ ] **Scraper:** Playwright script for MarketVision.

### Creative (Q3)
- [ ] **Brand Kit DB:** Schema to store brand voice/colors.
- [ ] **GenAI Pipeline:** Integration with OpenAI & Stability AI APIs.
- [ ] **Social Scheduler:** Cron job for posting.

### Optimization (Q4)
- [ ] **Review Webhooks:** Listeners for Google Reviews.
- [ ] **Churn Model:** Model training script on resident data.

---

**Final Note:** This plan is modular. If "TourSpark" is delayed, "LumaLeasing" still works. If "ForgeStudio" needs more time, the "Data Lake" is unaffected. We build layer by layer, starting with the Data Foundation.

