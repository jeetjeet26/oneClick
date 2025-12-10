# P11 CRM Implementation Plan
## December 11, 2025 - Execution Roadmap

**Status:** PLANNING DOCUMENT - NO CODE CHANGES YET  
**Generated:** December 10, 2025  
**Owner:** Engineering Team

---

## Executive Summary

This document outlines a comprehensive implementation plan based on the codebase analysis in `P11_CRM_VISION_CONTEXT.md`. The analysis revealed **critical schema gaps** where code references database tables that don't exist in migrations, blocking LumaLeasing, LeadPulse, TourSpark, and the workflow engine from functioning in production.

### Key Findings

| Category | Count | Status |
|----------|-------|--------|
| Missing Tables (Code references but no migration) | **10** | 🔴 CRITICAL BLOCKER |
| Existing Tables in Migrations | 28 | ✅ Ready |
| Proposed Future CRM Tables | 5 | 📋 Planned |

---

## Phase 0: Critical Schema Gap Fixes [PRIORITY: URGENT]

### 0.1 Missing Tables Analysis

The following tables are **actively referenced in TypeScript code** but have **no corresponding SQL migrations**:

| Table | Files Referencing It | Purpose | Urgency |
|-------|---------------------|---------|---------|
| `lumaleasing_config` | `lumaleasing/chat/route.ts`, `lumaleasing/config/route.ts`, `lumaleasing/admin/*.ts`, `lumaleasing/tours/route.ts`, `lumaleasing/lead/route.ts` | Widget configuration per property | 🔴 CRITICAL |
| `widget_sessions` | `lumaleasing/chat/route.ts`, `lumaleasing/admin/stats/route.ts`, `lumaleasing/tours/route.ts`, `lumaleasing/lead/route.ts` | Visitor session tracking for chat widget | 🔴 CRITICAL |
| `tours` | `leads/[id]/tours/route.ts`, `tour-noshow.ts`, `tour-reminders.ts` | Tour scheduling and tracking | 🔴 CRITICAL |
| `lead_workflows` | `workflow-processor.ts`, `leads/route.ts`, `leads/[id]/tours/route.ts`, `leads/[id]/workflow/route.ts` | Workflow instance per lead | 🔴 CRITICAL |
| `workflow_definitions` | `workflow-processor.ts`, `leads/[id]/workflow/route.ts` | Workflow templates/definitions | 🔴 CRITICAL |
| `workflow_actions` | `workflow-processor.ts`, `leads/[id]/workflow/route.ts` | Action execution log | 🔴 CRITICAL |
| `follow_up_templates` | `workflow-processor.ts`, `leads/[id]/send-message/route.ts` | Message templates for automations | 🔴 CRITICAL |
| `lead_engagement_events` | `leadpulse/events/route.ts` | Event tracking for lead scoring | 🟡 HIGH |
| `lead_scores` | `leadpulse/score/route.ts`, `leadpulse/insights/route.ts` | Lead scoring results | 🟡 HIGH |
| `lead_activities` | `lumaleasing/lead/route.ts`, `lumaleasing/tours/route.ts`, `leads/[id]/tours/route.ts` | Activity log for leads | 🟡 HIGH |

### 0.2 Proposed Migration: `20251211000000_lumaleasing_workflow_schema.sql`

Based on the code analysis, here's the complete schema needed:

```sql
-- =============================================
-- LUMALEASING CONFIGURATION & SESSIONS
-- =============================================

-- LumaLeasing Widget Configuration per Property
CREATE TABLE IF NOT EXISTS lumaleasing_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id uuid REFERENCES properties(id) ON DELETE CASCADE UNIQUE,
  api_key text NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(32), 'hex'),
  widget_name text DEFAULT 'Luma',
  is_active boolean DEFAULT true,
  collect_email boolean DEFAULT true,
  collect_phone boolean DEFAULT false,
  lead_capture_prompt text,
  tours_enabled boolean DEFAULT true,
  tour_duration_minutes int DEFAULT 30,
  auto_reply_enabled boolean DEFAULT true,
  brand_color text DEFAULT '#3B82F6',
  greeting_message text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Widget Visitor Sessions
CREATE TABLE IF NOT EXISTS widget_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id uuid REFERENCES properties(id) ON DELETE CASCADE,
  lead_id uuid REFERENCES leads(id) ON DELETE SET NULL,
  visitor_id text, -- Client-generated fingerprint
  user_agent text,
  referrer_url text,
  message_count int DEFAULT 0,
  converted_at timestamptz, -- When visitor became lead
  last_activity_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

-- =============================================
-- TOUR SCHEDULING SYSTEM
-- =============================================

CREATE TABLE IF NOT EXISTS tours (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id uuid REFERENCES leads(id) ON DELETE CASCADE,
  property_id uuid REFERENCES properties(id) ON DELETE CASCADE,
  tour_date date NOT NULL,
  tour_time time NOT NULL,
  tour_type text DEFAULT 'in_person', -- 'in_person', 'virtual', 'self_guided'
  status text DEFAULT 'scheduled', -- 'scheduled', 'confirmed', 'completed', 'cancelled', 'no_show'
  notes text,
  assigned_agent_id uuid REFERENCES profiles(id),
  created_by uuid REFERENCES profiles(id),
  confirmation_sent_at timestamptz,
  reminder_24h_sent_at timestamptz,
  reminder_1h_sent_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- =============================================
-- WORKFLOW ENGINE
-- =============================================

-- Workflow Definitions (Templates)
CREATE TABLE IF NOT EXISTS workflow_definitions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id uuid REFERENCES properties(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  trigger_on text NOT NULL, -- 'lead_created', 'tour_booked', 'tour_no_show', etc.
  steps jsonb NOT NULL DEFAULT '[]', -- Array of {id, delay_hours, action, template_slug}
  exit_conditions text[] DEFAULT ARRAY['leased', 'lost'], -- Lead statuses that stop workflow
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Lead Workflows (Instances)
CREATE TABLE IF NOT EXISTS lead_workflows (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id uuid REFERENCES leads(id) ON DELETE CASCADE,
  workflow_id uuid REFERENCES workflow_definitions(id) ON DELETE CASCADE,
  current_step int DEFAULT 0,
  status text DEFAULT 'active', -- 'active', 'paused', 'completed', 'converted', 'stopped'
  last_action_at timestamptz,
  next_action_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Workflow Action Log
CREATE TABLE IF NOT EXISTS workflow_actions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_workflow_id uuid REFERENCES lead_workflows(id) ON DELETE CASCADE,
  step_number int NOT NULL,
  action_type text NOT NULL, -- 'sms', 'email', 'wait'
  template_id uuid,
  status text DEFAULT 'pending', -- 'pending', 'sent', 'failed', 'skipped'
  external_id text, -- Message ID from provider
  error_message text,
  executed_at timestamptz DEFAULT now()
);

-- Follow-up Message Templates
CREATE TABLE IF NOT EXISTS follow_up_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id uuid REFERENCES properties(id) ON DELETE CASCADE,
  slug text NOT NULL, -- e.g. 'welcome_sms', 'tour_reminder', 'no_show_followup'
  name text NOT NULL,
  channel text NOT NULL, -- 'sms', 'email'
  subject text, -- For email
  body text NOT NULL, -- Template with {{variables}}
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(property_id, slug)
);

-- =============================================
-- LEADPULSE SCORING
-- =============================================

-- Lead Engagement Events
CREATE TABLE IF NOT EXISTS lead_engagement_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id uuid REFERENCES leads(id) ON DELETE CASCADE,
  property_id uuid REFERENCES properties(id) ON DELETE CASCADE,
  event_type text NOT NULL, -- 'chat_started', 'email_opened', 'tour_scheduled', etc.
  metadata jsonb DEFAULT '{}',
  score_weight int DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- Lead Scores
CREATE TABLE IF NOT EXISTS lead_scores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id uuid REFERENCES leads(id) ON DELETE CASCADE,
  total_score int DEFAULT 0,
  engagement_score int DEFAULT 0,
  timing_score int DEFAULT 0,
  source_score int DEFAULT 0,
  completeness_score int DEFAULT 0,
  behavior_score int DEFAULT 0,
  score_bucket text DEFAULT 'cold', -- 'hot', 'warm', 'cold', 'unqualified'
  factors jsonb DEFAULT '[]', -- Array of {factor, impact, type}
  model_version text DEFAULT 'v1.0',
  scored_at timestamptz DEFAULT now()
);

-- Lead Activities (General activity log)
CREATE TABLE IF NOT EXISTS lead_activities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id uuid REFERENCES leads(id) ON DELETE CASCADE,
  type text NOT NULL, -- 'email_sent', 'sms_sent', 'call_made', 'note_added', etc.
  description text,
  metadata jsonb DEFAULT '{}',
  created_by uuid REFERENCES profiles(id),
  created_at timestamptz DEFAULT now()
);

-- =============================================
-- MODIFICATIONS TO EXISTING TABLES
-- =============================================

-- Add columns to leads table
ALTER TABLE leads ADD COLUMN IF NOT EXISTS last_contacted_at timestamptz;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

-- Add columns to conversations table (widget_session_id added after widget_sessions exists)
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS is_human_mode boolean DEFAULT false;
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS widget_session_id uuid REFERENCES widget_sessions(id);

-- =============================================
-- INDEXES
-- =============================================

CREATE INDEX IF NOT EXISTS idx_lumaleasing_config_property ON lumaleasing_config(property_id);
CREATE INDEX IF NOT EXISTS idx_lumaleasing_config_api_key ON lumaleasing_config(api_key);
CREATE INDEX IF NOT EXISTS idx_widget_sessions_property ON widget_sessions(property_id);
CREATE INDEX IF NOT EXISTS idx_widget_sessions_lead ON widget_sessions(lead_id);
CREATE INDEX IF NOT EXISTS idx_widget_sessions_visitor ON widget_sessions(visitor_id);
CREATE INDEX IF NOT EXISTS idx_tours_lead ON tours(lead_id);
CREATE INDEX IF NOT EXISTS idx_tours_property ON tours(property_id);
CREATE INDEX IF NOT EXISTS idx_tours_date ON tours(tour_date);
CREATE INDEX IF NOT EXISTS idx_tours_status ON tours(status);
CREATE INDEX IF NOT EXISTS idx_workflow_definitions_property ON workflow_definitions(property_id);
CREATE INDEX IF NOT EXISTS idx_workflow_definitions_trigger ON workflow_definitions(trigger_on);
CREATE INDEX IF NOT EXISTS idx_lead_workflows_lead ON lead_workflows(lead_id);
CREATE INDEX IF NOT EXISTS idx_lead_workflows_status ON lead_workflows(status);
CREATE INDEX IF NOT EXISTS idx_lead_workflows_next_action ON lead_workflows(next_action_at) WHERE status = 'active';
CREATE INDEX IF NOT EXISTS idx_workflow_actions_workflow ON workflow_actions(lead_workflow_id);
CREATE INDEX IF NOT EXISTS idx_follow_up_templates_property ON follow_up_templates(property_id);
CREATE INDEX IF NOT EXISTS idx_lead_engagement_events_lead ON lead_engagement_events(lead_id);
CREATE INDEX IF NOT EXISTS idx_lead_engagement_events_type ON lead_engagement_events(event_type);
CREATE INDEX IF NOT EXISTS idx_lead_scores_lead ON lead_scores(lead_id);
CREATE INDEX IF NOT EXISTS idx_lead_scores_bucket ON lead_scores(score_bucket);
CREATE INDEX IF NOT EXISTS idx_lead_activities_lead ON lead_activities(lead_id);

-- =============================================
-- ROW LEVEL SECURITY
-- =============================================

ALTER TABLE lumaleasing_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE widget_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE tours ENABLE ROW LEVEL SECURITY;
ALTER TABLE workflow_definitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE lead_workflows ENABLE ROW LEVEL SECURITY;
ALTER TABLE workflow_actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE follow_up_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE lead_engagement_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE lead_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE lead_activities ENABLE ROW LEVEL SECURITY;

-- Service role full access (for API operations)
CREATE POLICY "Service role full access to lumaleasing_config" ON lumaleasing_config FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service role full access to widget_sessions" ON widget_sessions FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service role full access to tours" ON tours FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service role full access to workflow_definitions" ON workflow_definitions FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service role full access to lead_workflows" ON lead_workflows FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service role full access to workflow_actions" ON workflow_actions FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service role full access to follow_up_templates" ON follow_up_templates FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service role full access to lead_engagement_events" ON lead_engagement_events FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service role full access to lead_scores" ON lead_scores FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service role full access to lead_activities" ON lead_activities FOR ALL USING (auth.role() = 'service_role');

-- User policies for org-scoped access
CREATE POLICY "Users view their org lumaleasing config" ON lumaleasing_config FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM profiles
    JOIN properties ON properties.id = lumaleasing_config.property_id
    WHERE profiles.id = auth.uid() AND profiles.org_id = properties.org_id
  )
);

CREATE POLICY "Users view their org tours" ON tours FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM profiles
    JOIN properties ON properties.id = tours.property_id
    WHERE profiles.id = auth.uid() AND profiles.org_id = properties.org_id
  )
);

CREATE POLICY "Users manage their org tours" ON tours FOR ALL USING (
  EXISTS (
    SELECT 1 FROM profiles
    JOIN properties ON properties.id = tours.property_id
    WHERE profiles.id = auth.uid() AND profiles.org_id = properties.org_id
  )
);

CREATE POLICY "Users view their org workflows" ON workflow_definitions FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM profiles
    JOIN properties ON properties.id = workflow_definitions.property_id
    WHERE profiles.id = auth.uid() AND profiles.org_id = properties.org_id
  )
);

CREATE POLICY "Users view their org lead scores" ON lead_scores FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM profiles
    JOIN leads ON leads.id = lead_scores.lead_id
    JOIN properties ON properties.id = leads.property_id
    WHERE profiles.id = auth.uid() AND profiles.org_id = properties.org_id
  )
);
```

### 0.3 Required Database Function: `score_lead`

The LeadPulse API references an RPC function that doesn't exist:

```sql
-- Lead Scoring Function (RPC)
CREATE OR REPLACE FUNCTION score_lead(p_lead_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_score_id uuid;
  v_lead RECORD;
  v_total_score int := 0;
  v_engagement_score int := 0;
  v_timing_score int := 0;
  v_source_score int := 0;
  v_completeness_score int := 0;
  v_behavior_score int := 0;
  v_bucket text := 'cold';
  v_factors jsonb := '[]'::jsonb;
BEGIN
  -- Get lead info
  SELECT * INTO v_lead FROM leads WHERE id = p_lead_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Lead not found';
  END IF;
  
  -- Calculate completeness score (0-20)
  v_completeness_score := 0;
  IF v_lead.email IS NOT NULL AND v_lead.email != '' THEN
    v_completeness_score := v_completeness_score + 8;
    v_factors := v_factors || '{"factor": "Email provided", "impact": "+8", "type": "positive"}'::jsonb;
  END IF;
  IF v_lead.phone IS NOT NULL AND v_lead.phone != '' THEN
    v_completeness_score := v_completeness_score + 6;
    v_factors := v_factors || '{"factor": "Phone provided", "impact": "+6", "type": "positive"}'::jsonb;
  END IF;
  IF v_lead.first_name IS NOT NULL AND v_lead.first_name != '' THEN
    v_completeness_score := v_completeness_score + 3;
  END IF;
  IF v_lead.last_name IS NOT NULL AND v_lead.last_name != '' THEN
    v_completeness_score := v_completeness_score + 3;
  END IF;
  
  -- Calculate source score (0-15)
  v_source_score := CASE 
    WHEN v_lead.source ILIKE '%referral%' THEN 15
    WHEN v_lead.source ILIKE '%google%' THEN 12
    WHEN v_lead.source ILIKE '%luma%' THEN 10
    WHEN v_lead.source ILIKE '%facebook%' OR v_lead.source ILIKE '%meta%' THEN 8
    WHEN v_lead.source ILIKE '%website%' THEN 8
    ELSE 5
  END;
  v_factors := v_factors || format('{"factor": "Source: %s", "impact": "+%s", "type": "positive"}', v_lead.source, v_source_score)::jsonb;
  
  -- Calculate engagement score from events (0-40)
  SELECT COALESCE(SUM(score_weight), 0) INTO v_engagement_score
  FROM lead_engagement_events
  WHERE lead_id = p_lead_id
  AND created_at > now() - interval '30 days';
  v_engagement_score := LEAST(v_engagement_score, 40); -- Cap at 40
  
  IF v_engagement_score > 20 THEN
    v_factors := v_factors || format('{"factor": "High engagement (%s events)", "impact": "+%s", "type": "positive"}', 
      (SELECT COUNT(*) FROM lead_engagement_events WHERE lead_id = p_lead_id), v_engagement_score)::jsonb;
  END IF;
  
  -- Calculate timing score (0-15)
  v_timing_score := CASE
    WHEN v_lead.created_at > now() - interval '24 hours' THEN 15
    WHEN v_lead.created_at > now() - interval '3 days' THEN 12
    WHEN v_lead.created_at > now() - interval '7 days' THEN 8
    WHEN v_lead.created_at > now() - interval '14 days' THEN 5
    ELSE 2
  END;
  
  -- Calculate behavior score from tours (0-10)
  SELECT 
    CASE 
      WHEN EXISTS(SELECT 1 FROM tours WHERE lead_id = p_lead_id AND status = 'completed') THEN 10
      WHEN EXISTS(SELECT 1 FROM tours WHERE lead_id = p_lead_id AND status IN ('scheduled', 'confirmed')) THEN 8
      WHEN EXISTS(SELECT 1 FROM tours WHERE lead_id = p_lead_id AND status = 'no_show') THEN -5
      ELSE 0
    END INTO v_behavior_score;
  
  IF v_behavior_score > 0 THEN
    v_factors := v_factors || format('{"factor": "Tour activity", "impact": "+%s", "type": "positive"}', v_behavior_score)::jsonb;
  ELSIF v_behavior_score < 0 THEN
    v_factors := v_factors || format('{"factor": "Tour no-show", "impact": "%s", "type": "negative"}', v_behavior_score)::jsonb;
  END IF;
  
  -- Calculate total score
  v_total_score := v_completeness_score + v_source_score + v_engagement_score + v_timing_score + v_behavior_score;
  v_total_score := GREATEST(0, LEAST(100, v_total_score)); -- Clamp 0-100
  
  -- Determine bucket
  v_bucket := CASE
    WHEN v_total_score >= 70 THEN 'hot'
    WHEN v_total_score >= 45 THEN 'warm'
    WHEN v_total_score >= 20 THEN 'cold'
    ELSE 'unqualified'
  END;
  
  -- Insert or update score
  INSERT INTO lead_scores (
    lead_id, total_score, engagement_score, timing_score, 
    source_score, completeness_score, behavior_score,
    score_bucket, factors, model_version, scored_at
  ) VALUES (
    p_lead_id, v_total_score, v_engagement_score, v_timing_score,
    v_source_score, v_completeness_score, v_behavior_score,
    v_bucket, v_factors, 'v1.0', now()
  )
  RETURNING id INTO v_score_id;
  
  RETURN v_score_id;
END;
$$;
```

---

## Phase 1: Linear Task Updates [PRIORITY: HIGH]

Based on analysis, the following Linear updates are recommended:

### 1.1 New Issue to Create

**Title:** 🔴 CRITICAL: Migrate Missing LumaLeasing/Workflow/LeadPulse Tables  
**Project:** Data Lake P11 [TIER 0 - CRITICAL]  
**Priority:** Urgent  
**Due Date:** December 20, 2025  
**Description:**
```markdown
## BLOCKER: Schema Gaps Blocking Production

10 tables are referenced in TypeScript code but have no SQL migrations:

### Critical (Blocks LumaLeasing/TourSpark):
- `lumaleasing_config` - Widget configuration
- `widget_sessions` - Chat session tracking
- `tours` - Tour scheduling

### Critical (Blocks Workflow Engine):
- `lead_workflows` - Workflow instances
- `workflow_definitions` - Workflow templates
- `workflow_actions` - Action log
- `follow_up_templates` - Message templates

### High (Blocks LeadPulse):
- `lead_engagement_events` - Event tracking
- `lead_scores` - Scoring results
- `lead_activities` - Activity log

## Tasks
- [ ] Create migration `20251211000000_lumaleasing_workflow_schema.sql`
- [ ] Add `score_lead` RPC function
- [ ] Test migration locally
- [ ] Apply to staging Supabase
- [ ] Verify all API routes work
- [ ] Apply to production

## Code Reference
See: `p11-platform/P11_CRM_IMPLEMENTATION_PLAN.md` for full SQL
```

### 1.2 Projects to Update with Dependencies

| Project | Update Needed |
|---------|--------------|
| LumaLeasing™ | Add blocking dependency on "Migrate Missing Tables" issue |
| TourSpark™ | Add blocking dependency on tours table migration |
| LeadPulse™ | Add blocking dependency on lead_scores, lead_engagement_events |

---

## Phase 2: Future CRM Architecture [Q1-Q2 2026]

### 2.1 Proposed New Project: P11 Core CRM

After schema gaps are fixed, the next phase is building the "CRM as Spine" architecture:

**Timeline:** Q1-Q2 2026  
**Dependencies:** Phase 0 complete, Data Lake P11 complete

### 2.2 Future Tables (Not for Tomorrow)

```sql
-- To be implemented in Phase 2:
-- crm_pipelines - Pipeline configuration
-- crm_triggers - Event-based triggers
-- crm_actions - Automated actions
-- crm_events - Central event bus
-- crm_config_versions - Configuration versioning for rollback
```

---

## Tomorrow's Execution Checklist

### Morning (9 AM - 12 PM)

- [ ] **Review this plan** with team
- [ ] **Create Linear issue** for "Migrate Missing Tables"
- [ ] **Write migration file:** `20251211000000_lumaleasing_workflow_schema.sql`
- [ ] **Test migration** on local Supabase instance

### Afternoon (1 PM - 5 PM)

- [ ] **Apply migration** to staging environment
- [ ] **Smoke test APIs:**
  - `POST /api/lumaleasing/chat` (test widget)
  - `POST /api/leads/[id]/tours` (test tour creation)
  - `POST /api/leadpulse/events` (test event tracking)
  - `GET /api/leadpulse/score?leadId=xxx` (test scoring)
- [ ] **Update Linear** with progress
- [ ] **Document** any issues found

### End of Day

- [ ] **Status report** on schema fixes
- [ ] **Plan Phase 1** Linear updates for Friday

---

## Files Referenced in Analysis

| File | Purpose |
|------|---------|
| `utils/services/workflow-processor.ts` | Workflow engine logic |
| `api/lumaleasing/chat/route.ts` | Chat widget API |
| `api/lumaleasing/admin/*.ts` | Widget admin APIs |
| `api/leads/[id]/tours/route.ts` | Tour scheduling |
| `api/leadpulse/events/route.ts` | Event tracking |
| `api/leadpulse/score/route.ts` | Lead scoring |
| `utils/services/tour-noshow.ts` | No-show detection |
| `utils/services/tour-reminders.ts` | Tour reminders |

---

## Success Metrics

| Metric | Target | Measurement |
|--------|--------|-------------|
| Migration applied | ✅ | Supabase shows all 10 tables |
| API routes functional | ✅ | No 500 errors on test calls |
| Workflow engine testable | ✅ | Can create workflow definition |
| LeadPulse scoring works | ✅ | score_lead RPC returns score |
| Linear updated | ✅ | Issue created and linked |

---

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Migration conflicts with existing data | Low | High | Test on staging first |
| RLS policies too restrictive | Medium | Medium | Use service_role for APIs |
| Scoring function edge cases | Medium | Low | Add comprehensive error handling |
| Type mismatches with TS code | Low | Medium | Compare code expectations vs schema |

---

## Additional Schema Modifications Required

### Columns to Add to Existing Tables

The following columns are **referenced in code** but missing from existing table definitions:

```sql
-- Add to leads table (from init_schema.sql)
ALTER TABLE leads ADD COLUMN IF NOT EXISTS last_contacted_at timestamptz;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

-- Add to conversations table (from init_schema.sql)
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS widget_session_id uuid REFERENCES widget_sessions(id);
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS is_human_mode boolean DEFAULT false;
```

### Code References

| Column | Table | Files Using It |
|--------|-------|----------------|
| `last_contacted_at` | leads | `workflow-processor.ts`, `leads/route.ts`, `send-message/route.ts` |
| `is_human_mode` | conversations | `lumaleasing/chat/route.ts`, `conversations/route.ts`, `takeover/route.ts` |
| `widget_session_id` | conversations | `lumaleasing/chat/route.ts`, `lumaleasing/lead/route.ts` |

---

## Questions to Resolve Tomorrow

1. Should `lumaleasing_config` have a default row auto-created per property?
2. What's the retention policy for `widget_sessions` and `lead_engagement_events`?
3. Should `workflow_definitions` have system defaults seeded?

---

**Document Version:** 1.0  
**Next Review:** December 11, 2025 (Morning standup)

