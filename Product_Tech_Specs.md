# P11 Creative: Product Technical Specifications (2026 Suite)

**Version:** 1.0  
**Date:** December 8, 2025  
**Purpose:** Definitive technical reference for the Engineering Team.

---

## 🏗️ CORE FOUNDATION

### 1. Data Lake P11 (The "Brain")
**Tier:** 0 (Critical)  
**Type:** Infrastructure / Data Pipeline

#### 1.1 Architecture
*   **Ingestion:** Python `dlt` (Data Load Tool) pipelines running on GitHub Actions (daily/hourly).
*   **Storage:** Supabase PostgreSQL (Raw + Fact Tables).
*   **Normalization:** DBT (Data Build Tool) or SQL Stored Procedures.

#### 1.2 Schema Definitions
```sql
-- RAW LAYERS (One per source)
create table raw_meta_ads (
    id serial primary key,
    ingested_at timestamptz default now(),
    data jsonb -- Full JSON dump from API
);

create table raw_google_ads (
    id serial primary key,
    ingested_at timestamptz default now(),
    data jsonb
);

-- UNIFIED FACT LAYER (The "Gold" Standard)
create table fact_marketing_performance (
    date date not null,
    property_id uuid references properties(id),
    channel_id text, -- 'meta', 'google_ads', 'tiktok', 'bing'
    campaign_name text,
    campaign_id text,
    impressions bigint default 0,
    clicks bigint default 0,
    spend numeric(10,2) default 0.00,
    conversions bigint default 0,
    raw_source text, -- 'meta_api_v19.0'
    primary key (date, property_id, campaign_id)
);

create index idx_fact_marketing_date on fact_marketing_performance(date);
create index idx_fact_marketing_prop on fact_marketing_performance(property_id);
```

#### 1.3 ETL Logic (Python)
*   **Meta Pipeline:**
    *   Endpoint: `/{ad_account_id}/insights`
    *   Fields: `campaign_name`, `spend`, `impressions`, `clicks`, `actions` (filtered by `action_type=lead`).
    *   Breakdown: `campaign`, `adset`, `ad`.
*   **Google Pipeline:**
    *   Resource: `customer.campaign`
    *   Metrics: `metrics.cost_micros`, `metrics.impressions`, `metrics.clicks`.
    *   Transformation: Divide `cost_micros` by 1,000,000.

---

### 2. MultiChannel BI Tool
**Tier:** 1  
**Type:** Analytics Dashboard

#### 2.1 Frontend Components
*   **`ConsolidatedView`**: Aggregates `fact_marketing_performance` across all channels.
    *   Formula: `CPA = Total Spend / Total Conversions` (weighted average).
*   **`TrendChart`**: Recharts Line Chart. X=Date, Y=Leads/Spend. Series=Channels.

#### 2.2 API Interface (Supabase Edge Function)
```typescript
interface AnalyticsQuery {
  propertyIds: string[];
  dateRange: { start: string; end: string };
  interval: 'day' | 'week' | 'month';
  metrics: ('spend' | 'leads' | 'cpa')[];
}

// Response
interface AnalyticsResponse {
  data: {
    date: string;
    [metric: string]: number;
  }[];
  totals: Record<string, number>;
}
```

#### 2.3 Natural Language to SQL (AI Feature)
*   **Input:** "Show me the cost per lead for The Reserve last week compared to Google Ads."
*   **Prompt Engineering:**
    *   Context: Schema of `fact_marketing_performance`.
    *   Constraints: "Only select from these columns. Use ILIKE for campaign names."
    *   Safety: Read-only transaction.

---

## 🤖 CONVERSION ENGINES

### 3. LumaLeasing™ (AI Chatbot)
**Tier:** 1  
**Type:** RAG Chatbot

#### 3.1 Architecture
*   **Embeddings:** OpenAI `text-embedding-3-small`.
*   **Vector Store:** Supabase `pgvector`.
*   **Orchestrator:** LangChain.js (Edge Runtime).

#### 3.2 Database Schema
```sql
create extension if not exists vector;

create table documents (
    id uuid primary key default gen_random_uuid(),
    property_id uuid references properties(id),
    content text, -- Chunk text
    metadata jsonb, -- { "source": "Pet Policy PDF", "page": 4 }
    embedding vector(1536) -- 1536 dims for OpenAI
);

create function match_documents (
  query_embedding vector(1536),
  match_threshold float,
  match_count int,
  filter_property uuid
)
returns table (
  id uuid,
  content text,
  similarity float
)
language plpgsql
as $$
begin
  return query
  select
    documents.id,
    documents.content,
    1 - (documents.embedding <=> query_embedding) as similarity
  from documents
  where 1 - (documents.embedding <=> query_embedding) > match_threshold
  and documents.property_id = filter_property
  order by documents.embedding <=> query_embedding
  limit match_count;
end;
$$;
```

#### 3.3 Conversation Logic
1.  **Ingest:** Client uploads PDF. PDF is parsed (pdf-parse), chunked (RecursiveCharacterTextSplitter, size=500), embedded, and saved.
2.  **Query:** User sends message.
3.  **Retrieval:** `match_documents` RPC called with user query embedding.
4.  **Generation:** System Prompt + Retrieved Context + User Query -> LLM.
    *   *System Prompt:* "You are a helpful leasing agent. Use the provided context to answer. If the answer is not in the context, ask the user to contact the office."

---

### 4. TourSpark™ (Automated Follow-up)
**Tier:** 1  
**Type:** Workflow Automation Engine

#### 4.1 State Machine (Database Driven)
*   **Table:** `lead_workflows`
    *   `lead_id`: UUID
    *   `current_step`: Integer (0-5)
    *   `last_action_at`: Timestamp
    *   `status`: 'active', 'paused', 'completed', 'converted'

#### 4.2 Workflow Definition (JSON Config)
```json
{
  "steps": [
    { "id": 1, "delay_hours": 0, "action": "sms", "template": "intro_sms" },
    { "id": 2, "delay_hours": 24, "action": "email", "template": "amenities_email" },
    { "id": 3, "delay_hours": 48, "action": "sms", "template": "tour_invite" }
  ],
  "exit_conditions": ["tour_booked", "reply_received", "opt_out"]
}
```

#### 4.3 Worker Logic (Cron Job)
*   Runs every 10 minutes.
*   Query: `SELECT * FROM lead_workflows WHERE status='active' AND last_action_at < NOW() - INTERVAL 'step_delay'`.
*   Action: Execute step -> Update `current_step` -> Update `last_action_at`.

---

### 5. LeadPulse™ (Predictive Scoring)
**Tier:** 1  
**Type:** Machine Learning Service

#### 5.1 Model Architecture
*   **Type:** Binary Classification (XGBoost).
*   **Target:** `is_leased` (1 = Yes, 0 = No).
*   **Features:**
    *   `source`: (One-Hot Encoded) Google, Meta, Walk-in.
    *   `interactions`: Count of SMS/Emails.
    *   `response_time_minutes`: Time to first reply.
    *   `time_of_day`: Hour of inquiry (Cyclical encoding).
    *   `email_domain_score`: Corporate vs. Gmail vs. Temp.

#### 5.2 Deployment (Inference API)
*   **Tech:** Python (FastAPI) on Docker.
*   **Endpoint:** `POST /predict`
    ```json
    {
      "features": {
        "source": "google_ads",
        "interactions": 3,
        "response_time": 15
      }
    }
    ```
*   **Response:**
    ```json
    { "score": 82, "bucket": "high_intent" }
    ```

---

### 6. MarketVision 360™ (Competitor Intel)
**Tier:** 1  
**Type:** Web Scraping System

#### 6.1 Scraper Architecture
*   **Engine:** Playwright (Python).
*   **Infrastructure:** AWS Lambda (Containerized) or dedicated ECS task.
*   **Proxy Rotation:** BrightData / Oxylabs (Essential to avoid IP blocks).

#### 6.2 Target Selectors (Configurable per Site)
*   `price_selector`: `.rent-price`, `[data-test-id="price"]`
*   `availability_selector`: `.units-available-count`
*   `special_selector`: `.move-in-special-banner`

#### 6.3 Data Storage
```sql
create table competitor_snapshots (
    id serial primary key,
    competitor_id uuid, -- Link to Competitor Profile
    date date,
    floorplan_type text, -- '1BD', '2BD'
    min_price numeric,
    max_price numeric,
    units_available int,
    concession_text text
);
```

---

## 🎨 CONTENT FACTORY

### 7. ForgeStudio AI™ (Content Generation)
**Tier:** 2  
**Type:** Generative AI Pipeline

#### 7.1 Pipeline Steps
1.  **Topic Selection:**
    *   Input: "Summer Pool Party"
    *   Context: Property amenities (Pool), Brand Tone (Fun, Youthful).
2.  **Copy Generation (GPT-4):**
    *   Generates 3 variations of caption + Hashtags.
3.  **Visual Selection/Generation:**
    *   **Path A (Stock):** Unsplash API query "Pool party happy people".
    *   **Path B (Asset Library):** Search client's uploaded photos (`supa_storage`) using CLIP embeddings (Semantic Image Search).
    *   **Path C (GenAI):** Stability AI API (Image-to-Image) -> "Add pool floaties to this photo of the pool."

#### 7.2 Integration
*   Output object saved to `content_drafts` table.
*   Approval UI shows side-by-side variations.

---

### 8. SocialPilot X™ (Auto-Poster)
**Tier:** 1  
**Type:** API Integration Service

#### 8.1 API Capabilities
*   **Facebook/Instagram:** Graph API. Requires `pages_manage_posts`, `instagram_basic` permissions.
    *   *Note:* Tokens expire (60 days). Needs automated token refresh mechanism.
*   **LinkedIn:** Marketing API (`ugcPosts`).
*   **GMB (Google Business):** Business Profile APIs (`localPost`).

#### 8.2 Scheduling Engine
*   Standard Cron Job checks `content_drafts` where `status='approved'` and `scheduled_time` is within current window.
*   Publishes to API -> Updates status to `published` -> Stores `platform_post_id`.

---

## 🛡️ REPUTATION & OPTIMIZATION

### 9. ReviewFlow AI™
**Tier:** 1  
**Type:** Sentiment Analysis & Response

#### 9.1 Data Ingestion
*   **Webhooks:** Setup Google Business Profile webhooks for `NEW_REVIEW`.
*   **Polling:** Fallback scraping for Yelp/Apartments.com (every 6 hours).

#### 9.2 Sentiment Logic
*   **LLM Analysis:** Pass review text to GPT-4o-mini.
    *   Output JSON: `{ "sentiment": "negative", "topics": ["cleanliness", "noise"], "urgent": true }`
*   **Routing:**
    *   `sentiment == 'positive'` -> Generate "Thank you" reply -> (Optional) Auto-post.
    *   `sentiment == 'negative'` -> Draft empathetic reply -> Create "Ticket" in Dashboard -> Notify Property Manager via Email/Slack.

---

### 10. ChurnSignal™ (Retention Prediction)
**Tier:** 1  
**Type:** Predictive Analytics

#### 10.1 Data Points (Feature Engineering)
*   `tenure_months`: How long have they lived there?
*   `maintenance_requests_last_90d`: Count.
*   `payment_late_count`: Count.
*   `amenity_usage_score`: Calculated from booking logs.
*   `market_rent_gap`: (Current Rent - Market Rate). If Market is lower, churn risk increases.

#### 10.2 Algorithm
*   **Cox Proportional Hazards Model:** Used to predict "time to churn".
*   **Output:** "Risk Score" (High/Med/Low) + "Top Risk Factor" (e.g., "3 Unresolved Maintenance Tickets").

---

## 🏗️ SHARED INFRASTRUCTURE SPECS

### 11. Authentication & Security
*   **Provider:** Supabase Auth (GoTrue).
*   **Methods:** Email/Password, Magic Link, SAML (for Enterprise).
*   **Session Management:** JWT (JSON Web Tokens).
*   **RLS Policy Example:**
    ```sql
    create policy "Users can view their own org data"
    on fact_marketing_performance
    for select
    using (
      exists (
        select 1 from profiles
        where profiles.id = auth.uid()
        and profiles.org_id = fact_marketing_performance.org_id
      )
    );
    ```

### 12. API Gateway & Rate Limiting
*   **Edge Functions:** Act as the gateway for external integrations.
*   **Rate Limiting:** Use `upstash/ratelimit` (Redis) inside Edge Functions to prevent abuse of expensive LLM endpoints.
    *   *Limit:* 100 requests / minute per Organization.

### 13. Logging & Observability
*   **Logs:** Supabase Log Drains -> Datadog or Axiom.
*   **Error Tracking:** Sentry (Frontend + Edge Functions).
*   **LLM Tracing:** LangSmith (for debugging Chatbot chains).

---

## ✅ Implementation Priorities (Technical)

1.  **Phase 1:** `fact_marketing_performance` schema and Python ETL pipelines. (The Data Lake).
2.  **Phase 2:** `documents` vector store and RAG pipeline. (LumaLeasing).
3.  **Phase 3:** `lead_workflows` state machine. (TourSpark).
4.  **Phase 4:** `content_drafts` schema and GenAI integration. (ForgeStudio).

