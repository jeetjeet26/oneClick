# Community Onboarding Enhancement Plan

**Created:** December 9, 2025  
**Status:** Planning  
**Goal:** Transform the simple 2-step onboarding flow into a comprehensive knowledge ingestion pipeline that creates "intelligent awareness" of each community.

---

## Executive Summary

This plan proposes a **Community Intelligence System** that aggregates knowledge from multiple sources: intake forms, document uploads, website scraping, and integrated platform data. The system will feed the existing RAG (LumaLeasing), content generation (ForgeStudio), and analytics modules with rich, structured community context.

---

## Current State Analysis

### What Exists Today

| Component | Current State | Location |
|-----------|---------------|----------|
| **Onboarding UI** | Basic 2-step (Org name → Property name/address) | `app/onboarding/page.tsx` |
| **Database Schema** | `organizations`, `properties`, `profiles` tables | `migrations/20251208000000_init_schema.sql` |
| **Vector DB** | `documents` table with pgvector for RAG | Same migration |
| **Document Upload** | PDF/TXT/MD upload → chunking → embeddings | `api/documents/upload/route.ts` |
| **AI Chat (RAG)** | Property-scoped knowledge retrieval | `api/chat/route.ts` |
| **Web Scraping** | Competitor scraping from Apartments.com | `services/data-engine/scrapers/` |
| **LumaLeasing Config** | Widget branding, behavior, lead capture | `components/lumaleasing/LumaLeasingConfig.tsx` |

### Gaps Identified

1. **No comprehensive intake form** - Missing critical data like contacts, billing, community type
2. **No website knowledge extraction** - Can't auto-populate from community website
3. **No onboarding status tracking** - No visibility into what's complete/pending
4. **No knowledge base portal** - Clients can't see consolidated info
5. **No multi-community handling** - Can't share data across communities under same org
6. **No integration credential collection** - Missing GA4, GTM, Social, Google Ads access flows

---

## Proposed Architecture

### New Database Schema: `community_knowledge`

```
┌─────────────────────────────────────────────────────────────────┐
│                    COMMUNITY INTELLIGENCE LAYER                  │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────────────┐   ┌──────────────────┐                    │
│  │ community_profile │   │ community_contacts│                    │
│  │ ───────────────── │   │ ─────────────────│                    │
│  │ property_id (FK)  │   │ property_id (FK)  │                    │
│  │ legal_name        │   │ contact_type      │ (primary/billing) │
│  │ community_type    │   │ name, email, phone│                    │
│  │ website_url       │   │ role              │                    │
│  │ unit_count        │   └──────────────────┘                    │
│  │ year_built        │                                           │
│  │ amenities[]       │   ┌──────────────────┐                    │
│  │ pet_policy        │   │ knowledge_sources │                    │
│  │ special_features  │   │ ─────────────────│                    │
│  │ brand_voice       │   │ property_id (FK)  │                    │
│  │ target_audience   │   │ source_type       │ (intake/doc/web)  │
│  │ intake_completed  │   │ source_url        │                    │
│  └──────────────────┘   │ last_synced_at    │                    │
│                          │ status            │                    │
│  ┌──────────────────┐   │ extracted_data{}  │                    │
│  │ integration_creds │   └──────────────────┘                    │
│  │ ─────────────────│                                            │
│  │ property_id (FK)  │   ┌──────────────────┐                    │
│  │ platform          │   │ onboarding_tasks │                    │
│  │ access_type       │   │ ─────────────────│                    │
│  │ credentials{}     │   │ property_id (FK)  │                    │
│  │ status            │   │ task_type         │                    │
│  │ verified_at       │   │ status            │                    │
│  └──────────────────┘   │ assigned_to       │                    │
│                          │ due_date          │                    │
│                          └──────────────────┘                    │
│                                                                  │
│  Existing: documents (vector embeddings) ← feeds AI context     │
└─────────────────────────────────────────────────────────────────┘
```

---

## Implementation Plan: 4 Phases

### Phase 1: Enhanced Intake Form (Week 1-2)

**Goal:** Replace the 2-step onboarding with a comprehensive multi-step wizard

#### New Onboarding Steps:

```
Step 1: Organization Info
├── Legal Name (per tax return)
├── Organization Type (PMC, Owner/Operator, Developer)
└── Primary Contact (Admin user)

Step 2: Community Details  
├── Community Name
├── Community Type (Multifamily, Senior, Student, Mixed-Use)
├── Address (Street, City, State, ZIP)
├── Website URL ← triggers auto-scrape
├── Unit Count
└── Year Built

Step 3: Contacts
├── Primary Contact (Name, Email, Phone, Role)
├── Secondary Contact (optional)
├── Billing Contact (Name, Email, Phone, Address)
└── Billing Method (Ops Merchant, Nexus, Other)

Step 4: Integrations Setup
├── Google Analytics (instructions + verification)
├── Google Search Console
├── Google Tag Manager
├── Google Ads (admin access request)
├── Meta Ads (partner access)
├── LinkedIn Ads (optional)
└── Email Marketing Platform

Step 5: Knowledge Upload
├── Property Brochure (PDF)
├── Pet Policy Document
├── Pricing Sheet / Rent Roll
├── Community Guidelines
├── FAQ Document
└── [Drag-and-drop zone]

Step 6: Review & Launch
├── Summary of all entered data
├── Onboarding checklist status
├── Missing items flagged
└── "Complete Setup" button
```

#### Database Migration:

```sql
-- community_profiles: Extended property data
CREATE TABLE community_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id uuid REFERENCES properties(id) ON DELETE CASCADE UNIQUE,
  legal_name text,
  community_type text, -- 'multifamily', 'senior', 'student', 'mixed_use'
  website_url text,
  unit_count int,
  year_built int,
  amenities text[],
  pet_policy jsonb,
  parking_info jsonb,
  special_features text[],
  brand_voice text, -- AI personality guidelines
  target_audience text,
  intake_completed_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- community_contacts: Multiple contacts per property
CREATE TABLE community_contacts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id uuid REFERENCES properties(id) ON DELETE CASCADE,
  contact_type text NOT NULL, -- 'primary', 'secondary', 'billing'
  name text NOT NULL,
  email text NOT NULL,
  phone text,
  role text, -- 'Property Manager', 'Regional', 'Owner'
  billing_address jsonb, -- for billing contact
  special_instructions text,
  needs_w9 boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- integration_credentials: Platform access tracking
CREATE TABLE integration_credentials (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id uuid REFERENCES properties(id) ON DELETE CASCADE,
  platform text NOT NULL, -- 'google_analytics', 'gtm', 'google_ads', 'meta', 'linkedin'
  access_type text, -- 'admin', 'partner', 'api_key'
  credentials jsonb, -- encrypted storage
  status text DEFAULT 'pending', -- 'pending', 'requested', 'verified', 'expired'
  verification_method text,
  verified_at timestamptz,
  last_error text,
  created_at timestamptz DEFAULT now(),
  UNIQUE(property_id, platform)
);

-- onboarding_tasks: Checklist tracking
CREATE TABLE onboarding_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id uuid REFERENCES properties(id) ON DELETE CASCADE,
  task_type text NOT NULL, -- 'intake_form', 'doc_upload', 'ga4_access', 'payment_setup', etc.
  task_name text NOT NULL,
  description text,
  status text DEFAULT 'pending', -- 'pending', 'in_progress', 'completed', 'blocked'
  assigned_to uuid REFERENCES profiles(id),
  due_date timestamptz,
  completed_at timestamptz,
  completed_by uuid REFERENCES profiles(id),
  notes text,
  created_at timestamptz DEFAULT now()
);

-- knowledge_sources: Track where knowledge came from
CREATE TABLE knowledge_sources (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id uuid REFERENCES properties(id) ON DELETE CASCADE,
  source_type text NOT NULL, -- 'intake_form', 'document', 'website', 'integration'
  source_name text NOT NULL,
  source_url text,
  status text DEFAULT 'pending', -- 'pending', 'processing', 'completed', 'failed'
  documents_created int DEFAULT 0, -- chunks added to vector DB
  extracted_data jsonb, -- structured data extracted
  last_synced_at timestamptz,
  error_message text,
  created_at timestamptz DEFAULT now()
);
```

---

### Phase 2: Website Intelligence Engine (Week 2-3)

**Goal:** Auto-extract community knowledge from their website

#### Architecture:

```
                         ┌──────────────────────┐
  Community Website ────►│  Website Scraper     │
                         │  (Python Service)    │
                         └──────────┬───────────┘
                                    │
                         ┌──────────▼───────────┐
                         │  Content Extractor   │
                         │  - Pages discovery   │
                         │  - Text extraction   │
                         │  - Image URLs        │
                         │  - Contact info      │
                         └──────────┬───────────┘
                                    │
                         ┌──────────▼───────────┐
                         │  AI Summarizer       │
                         │  (GPT-4o-mini)       │
                         │  - Extract amenities │
                         │  - Identify policies │
                         │  - Brand voice       │
                         └──────────┬───────────┘
                                    │
              ┌─────────────────────┼─────────────────────┐
              │                     │                     │
    ┌─────────▼─────────┐ ┌────────▼────────┐ ┌─────────▼─────────┐
    │ community_profiles │ │    documents    │ │ knowledge_sources │
    │ (structured data)  │ │ (RAG embeddings)│ │ (audit trail)     │
    └───────────────────┘ └─────────────────┘ └───────────────────┘
```

#### New Python Service: `website_intelligence.py`

```python
# services/data-engine/scrapers/website_intelligence.py

class CommunityWebsiteScraper:
    """
    Crawls community websites and extracts structured knowledge
    """
    
    PAGES_TO_SCRAPE = [
        '/', '/amenities', '/floor-plans', '/gallery', '/contact',
        '/pet-policy', '/neighborhood', '/about', '/specials'
    ]
    
    async def extract_community_knowledge(self, website_url: str) -> dict:
        """
        Main entry: scrapes website and returns structured data
        """
        pages = await self._discover_pages(website_url)
        raw_content = await self._scrape_pages(pages)
        
        # Use LLM to structure the extracted content
        structured_data = await self._ai_extract_structured_data(raw_content)
        
        return {
            'amenities': structured_data['amenities'],
            'pet_policy': structured_data['pet_policy'],
            'parking': structured_data['parking'],
            'contact_info': structured_data['contacts'],
            'specials': structured_data['specials'],
            'brand_voice': structured_data['brand_voice'],
            'raw_chunks': raw_content  # For RAG embedding
        }
```

#### API Endpoint: `/api/onboarding/scrape-website`

```typescript
// Triggered when user enters website URL in onboarding
POST /api/onboarding/scrape-website
{
  "propertyId": "uuid",
  "websiteUrl": "https://thereserveatsandpoint.com"
}

// Returns:
{
  "success": true,
  "extracted": {
    "amenities": ["Pool", "Fitness Center", "Dog Park"],
    "pet_policy": { "allowed": true, "deposit": 300, "restrictions": "2 pet max" },
    "unit_types": ["Studio", "1BR", "2BR"],
    "contact_phone": "208-555-1234"
  },
  "documentsCreated": 15  // chunks added to vector DB
}
```

---

### Phase 3: Knowledge Base Portal (Week 3-4)

**Goal:** Client-facing dashboard to view their community profile and onboarding status

#### New Dashboard Section: `/dashboard/community`

```
┌─────────────────────────────────────────────────────────────────┐
│  Community Profile: The Reserve at Sandpoint                    │
│  ───────────────────────────────────────────────────────────────│
│                                                                  │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐              │
│  │ Overview    │  │ Knowledge   │  │ Onboarding  │              │
│  │ (active)    │  │ Base        │  │ Checklist   │              │
│  └─────────────┘  └─────────────┘  └─────────────┘              │
│                                                                  │
│  COMMUNITY DETAILS                                               │
│  ├── Type: Multifamily                                          │
│  ├── Units: 248                                                  │
│  ├── Year Built: 2019                                            │
│  ├── Website: thereserveatsandpoint.com                         │
│  └── Address: 123 Sandpoint Dr, Sandpoint, ID 83864             │
│                                                                  │
│  KEY CONTACTS                                                    │
│  ├── Primary: Jane Smith (jane@property.com)                    │
│  ├── Billing: Accounts Payable (ap@pmco.com)                    │
│  └── [+ Add Contact]                                             │
│                                                                  │
│  INTEGRATIONS STATUS                                             │
│  ├── ✅ Google Analytics - Connected                            │
│  ├── ✅ Google Ads - Admin Access Granted                       │
│  ├── ⏳ Meta Ads - Awaiting Partner Invite                      │
│  └── ❌ LinkedIn - Not Configured                                │
│                                                                  │
│  AI KNOWLEDGE SOURCES                                            │
│  ├── 📄 Pet_Policy.pdf (uploaded) - 3 chunks                    │
│  ├── 🌐 Website scrape - 15 chunks                               │
│  ├── 📄 Pricing_Sheet.xlsx (uploaded) - 8 chunks                │
│  └── [+ Upload Document]                                         │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

#### Knowledge Base Tab:

```
┌─────────────────────────────────────────────────────────────────┐
│  Knowledge Base                                   [+ Upload Doc] │
│  ───────────────────────────────────────────────────────────────│
│                                                                  │
│  Search: [________________________] [🔍]                         │
│                                                                  │
│  CATEGORIES                                                      │
│  ┌────────────────┬────────────────┬────────────────┐           │
│  │ 🏠 Property    │ 📋 Policies    │ 💰 Pricing     │           │
│  │    Details     │                │                │           │
│  │    12 items    │    5 items     │    3 items     │           │
│  └────────────────┴────────────────┴────────────────┘           │
│                                                                  │
│  RECENT DOCUMENTS                                                │
│  ├── [PDF] Pet Policy Guide         Dec 8, 2025   ✓ Processed  │
│  ├── [WEB] Website Content          Dec 8, 2025   ✓ Processed  │
│  ├── [PDF] Community Guidelines     Dec 7, 2025   ✓ Processed  │
│  └── [PDF] Floor Plans Brochure     Dec 5, 2025   ✓ Processed  │
│                                                                  │
│  AI INSIGHTS (auto-generated)                                   │
│  ├── "Pets allowed with $300 deposit, 2 pet max, breed restric."│
│  ├── "Amenities: Pool, Fitness Center, Dog Park, Business Ctr"  │
│  └── "Move-in specials: First month free on 12+ month lease"    │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

#### Onboarding Checklist Tab:

```
┌─────────────────────────────────────────────────────────────────┐
│  Onboarding Checklist                              75% Complete │
│  ───────────────────────────────────────────────────────────────│
│                                                                  │
│  ✅ COMPLETED                                                    │
│  ├── [✓] Organization setup                                     │
│  ├── [✓] Community details entered                              │
│  ├── [✓] Primary contact added                                  │
│  ├── [✓] Google Analytics access granted                        │
│  ├── [✓] Property brochure uploaded                             │
│  └── [✓] Website knowledge extracted                            │
│                                                                  │
│  ⏳ IN PROGRESS                                                  │
│  ├── [ ] Meta Ads partner access (waiting on client)            │
│  └── [ ] Payment method setup                                   │
│                                                                  │
│  ❌ NOT STARTED                                                  │
│  ├── [ ] LinkedIn Ads access                                    │
│  └── [ ] Billing address verification                           │
│                                                                  │
│  NEXT STEPS FOR CLIENT:                                          │
│  1. Grant Meta Ads Partner Access → [How-To Guide]              │
│  2. Set up Google Ads payment method → [Setup Guide]            │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

### Phase 4: Multi-Community & Automation (Week 4-5)

**Goal:** Handle organizations with multiple communities and automate data flows

#### Features:

1. **Multi-Community Onboarding**
   - "Add Another Community" flow after first completion
   - Auto-populate shared data (org name, billing contact)
   - Checkbox: "Use same primary contact"

2. **Template System**
   - Save community profile as template
   - Apply template to new communities
   - "Clone Community" for similar properties

3. **Accelo Integration Bridge** (from requirements)
   - Map collected data to Accelo fields
   - API endpoint: `POST /api/integrations/accelo/sync`
   - Auto-create Accelo records on onboarding completion

4. **Automated Knowledge Refresh**
   - CRON job to re-scrape community websites weekly
   - Detect changes (new specials, pricing updates)
   - Notify users of significant changes

---

## Component-Level Implementation Details

### New File Structure

```
apps/web/
├── app/
│   ├── onboarding/
│   │   ├── page.tsx                    # Enhanced multi-step wizard
│   │   ├── steps/
│   │   │   ├── OrganizationStep.tsx
│   │   │   ├── CommunityStep.tsx
│   │   │   ├── ContactsStep.tsx
│   │   │   ├── IntegrationsStep.tsx
│   │   │   ├── KnowledgeStep.tsx
│   │   │   └── ReviewStep.tsx
│   │   └── components/
│   │       ├── StepIndicator.tsx
│   │       └── OnboardingProvider.tsx
│   ├── dashboard/
│   │   └── community/
│   │       ├── page.tsx                # Community profile dashboard
│   │       ├── knowledge/
│   │       │   └── page.tsx            # Knowledge base management
│   │       └── checklist/
│   │           └── page.tsx            # Onboarding status
│   └── api/
│       ├── onboarding/
│       │   ├── route.ts                # Enhanced (existing)
│       │   ├── scrape-website/
│       │   │   └── route.ts            # NEW: Website intelligence
│       │   └── status/
│       │       └── route.ts            # NEW: Checklist status
│       └── community/
│           ├── profile/
│           │   └── route.ts            # Community profile CRUD
│           ├── contacts/
│           │   └── route.ts            # Contacts management
│           └── integrations/
│               └── route.ts            # Integration status
├── components/
│   ├── community/
│   │   ├── CommunityProfileCard.tsx
│   │   ├── ContactsManager.tsx
│   │   ├── IntegrationStatusList.tsx
│   │   ├── KnowledgeSourcesList.tsx
│   │   └── OnboardingChecklist.tsx
│   └── onboarding/
│       ├── WebsitePreview.tsx          # Shows scraped data preview
│       ├── DocumentUploader.tsx
│       └── IntegrationGuideModal.tsx

services/data-engine/
├── scrapers/
│   ├── website_intelligence.py         # NEW: Community website scraper
│   └── ...
├── pipelines/
│   ├── knowledge_sync.py               # NEW: Periodic knowledge refresh
│   └── ...
```

### Key API Endpoints

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/onboarding` | POST | Create org + property + profile (enhanced) |
| `/api/onboarding/scrape-website` | POST | Trigger website intelligence extraction |
| `/api/onboarding/status` | GET | Get onboarding checklist status |
| `/api/community/profile` | GET/PUT | Community profile CRUD |
| `/api/community/contacts` | GET/POST/PUT/DELETE | Contact management |
| `/api/community/integrations` | GET/POST | Integration credentials |
| `/api/community/knowledge-sources` | GET | List all knowledge sources |
| `/api/documents/upload` | POST | Enhanced (existing) with categorization |

---

## Integration with Existing Systems

### LumaLeasing Enhancement

The enhanced community profile directly feeds LumaLeasing's AI:

```typescript
// In api/chat/route.ts - Enhanced system prompt

const systemPrompt = `You are Luma, an AI leasing agent for ${communityProfile.name}.

COMMUNITY PROFILE:
- Type: ${communityProfile.community_type}
- Units: ${communityProfile.unit_count}
- Year Built: ${communityProfile.year_built}
- Pet Policy: ${JSON.stringify(communityProfile.pet_policy)}

BRAND VOICE GUIDELINES:
${communityProfile.brand_voice}

TARGET AUDIENCE:
${communityProfile.target_audience}

KNOWLEDGE BASE CONTEXT:
${contextText}

INSTRUCTIONS:
- Match the brand voice described above
- Focus on amenities: ${communityProfile.amenities.join(', ')}
...
`;
```

### ForgeStudio Enhancement

Content generation gets richer context:

```typescript
// forgestudio_config auto-populated from community_profile
{
  brand_voice: communityProfile.brand_voice,
  target_audience: communityProfile.target_audience,
  key_amenities: communityProfile.amenities,
}
```

### MarketVision Enhancement

Competitor analysis benefits from structured community data for better benchmarking.

---

## Data Flow Diagram

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        COMMUNITY KNOWLEDGE FLOW                          │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│   INTAKE SOURCES                    PROCESSING              CONSUMERS    │
│   ──────────────                    ──────────              ─────────    │
│                                                                          │
│   ┌─────────────┐                                                        │
│   │Intake Form  │──┐                                       ┌───────────┐│
│   └─────────────┘  │                                       │LumaLeasing││
│                    │    ┌──────────────┐                   │   (RAG)   ││
│   ┌─────────────┐  ├───►│ Knowledge    │     ┌──────────┐  └───────────┘│
│   │PDF/Doc      │──┤    │ Processor    │────►│documents │       ▲       │
│   │Uploads      │  │    │              │     │(vectors) │       │       │
│   └─────────────┘  │    │ - Chunking   │     └──────────┘       │       │
│                    │    │ - Embedding  │                        │       │
│   ┌─────────────┐  │    │ - Extraction │     ┌──────────┐  ┌───────────┐│
│   │Website      │──┤    └──────────────┘     │community │  │ForgeStudio││
│   │Scraping     │  │            │            │_profiles │  │(Content)  ││
│   └─────────────┘  │            │            └──────────┘  └───────────┘│
│                    │            │                  ▲             ▲       │
│   ┌─────────────┐  │            ▼                  │             │       │
│   │Integration  │──┘    ┌──────────────┐          │             │       │
│   │Data (GA4)   │       │ AI Structurer│──────────┘             │       │
│   └─────────────┘       │ (GPT-4o-mini)│                        │       │
│                         └──────────────┘                        │       │
│                                                                 │       │
│                         ┌──────────────┐                  ┌───────────┐│
│                         │ Onboarding   │                  │ReviewFlow ││
│                         │ Checklist    │                  │(Responses)││
│                         └──────────────┘                  └───────────┘│
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Implementation Priority Matrix

| Feature | Impact | Effort | Priority |
|---------|--------|--------|----------|
| Enhanced intake form | High | Medium | P0 |
| Database schema updates | High | Low | P0 |
| Onboarding checklist tracking | High | Low | P0 |
| Document upload to vector DB | High | Low | P0 (exists) |
| Website intelligence scraper | High | High | P1 |
| Community profile dashboard | Medium | Medium | P1 |
| Knowledge base portal | Medium | Medium | P1 |
| Integration credential collection | Medium | Medium | P2 |
| Multi-community support | Medium | Medium | P2 |
| Accelo sync automation | Low | High | P3 |
| Knowledge refresh CRON | Low | Medium | P3 |

---

## Success Metrics

1. **Onboarding Time Reduction**
   - Target: 60% reduction in time-to-launch
   - Measure: Days from SOW to first campaign live

2. **Data Quality**
   - Target: 90% of community profiles have complete knowledge base
   - Measure: % of profiles with ≥5 knowledge sources

3. **Client Self-Service**
   - Target: 80% of onboarding tasks completable without P11 intervention
   - Measure: Tasks completed by client vs. internal team

4. **AI Response Quality**
   - Target: 95% of LumaLeasing responses cite actual community knowledge
   - Measure: % of responses using RAG context

---

## Timeline & Next Steps

### Week 1-2: Foundation
- [ ] Create Supabase migration for new tables
- [ ] Build multi-step onboarding wizard UI
- [ ] Implement basic onboarding checklist
- [ ] Add document upload to onboarding flow

### Week 2-3: Intelligence Layer
- [ ] Build website intelligence scraper (Python)
- [ ] Create website scraping API endpoint
- [ ] Implement AI extraction pipeline
- [ ] Connect scraped data to vector DB

### Week 3-4: Dashboard
- [ ] Build community profile dashboard
- [ ] Create knowledge base portal UI
- [ ] Implement onboarding checklist view
- [ ] Add integration status tracking

### Week 4-5: Polish & Automation
- [ ] Multi-community support
- [ ] Template system
- [ ] Knowledge refresh CRON
- [ ] Testing and refinement

---

## Technical Notes

### Existing Patterns to Follow

1. **API Routes**: Use `createClient()` for auth, `createServiceClient()` for admin operations
2. **Vector Embeddings**: Use `text-embedding-3-small` model, 1536 dimensions
3. **Chunking**: 800 chars max, 100 char overlap, sentence boundary breaks
4. **RLS Policies**: Property-scoped data isolation via `org_id` matching

### Dependencies

- OpenAI API (embeddings + GPT-4o-mini)
- Supabase (Postgres + pgvector + Auth)
- Python 3.11+ (data-engine scrapers)
- httpx, beautifulsoup4, fake_useragent (scraping)

---

## Reference Links

- Original Requirements: Basecamp "Client Onboarding Tool" job
- P11 Knowledge Base: https://www.p11.com/marketing/kb/
- Existing Onboarding: `app/onboarding/page.tsx`
- Document Upload: `api/documents/upload/route.ts`
- Chat RAG: `api/chat/route.ts`

