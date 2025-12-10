-- CRM MVP Schema Migration
-- Adds missing tables referenced in API routes and fixes schema gaps

-- ============================================================================
-- PHASE 0: Critical Tables for CRM Functionality
-- ============================================================================

-- 1. TOURS TABLE
-- Referenced in: /api/leads/[id]/tours, /api/lumaleasing/tours
create table if not exists tours (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid references leads(id) on delete cascade,
  property_id uuid references properties(id) on delete cascade,
  tour_date date not null,
  tour_time time not null,
  tour_type text default 'in_person', -- 'in_person', 'virtual', 'self_guided'
  status text default 'scheduled', -- 'scheduled', 'confirmed', 'completed', 'cancelled', 'no_show'
  notes text,
  assigned_agent_id uuid references profiles(id),
  confirmation_sent_at timestamptz,
  created_by uuid references profiles(id),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index idx_tours_lead on tours(lead_id);
create index idx_tours_property on tours(property_id);
create index idx_tours_date on tours(tour_date);
create index idx_tours_status on tours(status);

-- 2. WORKFLOW DEFINITIONS TABLE
-- Referenced in: /api/workflows/process, workflow-processor.ts
create table if not exists workflow_definitions (
  id uuid primary key default gen_random_uuid(),
  property_id uuid references properties(id) on delete cascade,
  name text not null,
  description text,
  trigger_on text not null, -- 'lead_created', 'tour_no_show', 'tour_completed'
  steps jsonb not null default '[]', -- Array of {id, delay_hours, action, template_slug}
  exit_conditions jsonb default '["tour_booked", "leased", "lost"]', -- Array of lead statuses that stop workflow
  is_active boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index idx_workflow_definitions_property on workflow_definitions(property_id);
create index idx_workflow_definitions_trigger on workflow_definitions(trigger_on);
create index idx_workflow_definitions_active on workflow_definitions(is_active);

-- 3. LEAD WORKFLOWS TABLE (Instances)
-- Referenced in: /api/leads/[id]/tours, /api/leads/[id]/workflow, workflow-processor.ts
create table if not exists lead_workflows (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid references leads(id) on delete cascade,
  workflow_id uuid references workflow_definitions(id) on delete cascade,
  current_step int default 0,
  status text default 'active', -- 'active', 'paused', 'completed', 'converted', 'stopped'
  last_action_at timestamptz,
  next_action_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index idx_lead_workflows_lead on lead_workflows(lead_id);
create index idx_lead_workflows_status on lead_workflows(status);
create index idx_lead_workflows_next_action on lead_workflows(next_action_at) where status = 'active';

-- 4. WORKFLOW ACTIONS TABLE (Execution Log)
-- Referenced in: workflow-processor.ts
create table if not exists workflow_actions (
  id uuid primary key default gen_random_uuid(),
  lead_workflow_id uuid references lead_workflows(id) on delete cascade,
  step_number int not null,
  action_type text not null, -- 'sms', 'email', 'wait'
  template_id uuid,
  status text default 'pending', -- 'pending', 'sent', 'failed', 'skipped'
  external_id text, -- Message ID from provider (Twilio, SendGrid)
  error_message text,
  created_at timestamptz default now()
);

create index idx_workflow_actions_workflow on workflow_actions(lead_workflow_id);
create index idx_workflow_actions_status on workflow_actions(status);

-- 5. FOLLOW-UP TEMPLATES TABLE
-- Referenced in: workflow-processor.ts
create table if not exists follow_up_templates (
  id uuid primary key default gen_random_uuid(),
  property_id uuid references properties(id) on delete cascade,
  slug text not null, -- 'new-lead-welcome', 'tour-reminder-24h', etc.
  name text not null,
  channel text not null, -- 'sms', 'email'
  subject text, -- For emails only
  body text not null,
  variables jsonb default '[]', -- Array of variable names like ['first_name', 'property_name']
  is_active boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique(property_id, slug)
);

create index idx_follow_up_templates_property on follow_up_templates(property_id);
create index idx_follow_up_templates_slug on follow_up_templates(slug);

-- 6. LEAD ACTIVITIES TABLE (Activity Timeline)
-- Referenced in: /api/leads/[id]/tours (tour confirmation logging)
create table if not exists lead_activities (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid references leads(id) on delete cascade,
  type text not null, -- 'note', 'status_change', 'tour_scheduled', 'tour_completed', 'email_sent', 'sms_sent', 'call_made', 'tour_booked'
  description text not null,
  metadata jsonb, -- Additional context (tour_id, message_id, etc.)
  created_by uuid references profiles(id),
  created_at timestamptz default now()
);

create index idx_lead_activities_lead on lead_activities(lead_id);
create index idx_lead_activities_type on lead_activities(type);
create index idx_lead_activities_created on lead_activities(created_at desc);

-- 7. LEAD SCORES TABLE (LeadPulse)
-- Referenced in: /api/leadpulse/score
create table if not exists lead_scores (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid references leads(id) on delete cascade,
  total_score int not null,
  engagement_score int default 0,
  timing_score int default 0,
  source_score int default 0,
  completeness_score int default 0,
  behavior_score int default 0,
  score_bucket text not null, -- 'hot', 'warm', 'cold', 'unqualified'
  factors jsonb default '[]', -- Array of {factor, impact, type}
  model_version text default 'v1',
  scored_at timestamptz default now()
);

create index idx_lead_scores_lead on lead_scores(lead_id);
create index idx_lead_scores_bucket on lead_scores(score_bucket);
create index idx_lead_scores_scored_at on lead_scores(scored_at desc);

-- 8. LEAD ENGAGEMENT EVENTS TABLE (LeadPulse tracking)
-- Referenced in: /api/leadpulse/events
create table if not exists lead_engagement_events (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid references leads(id) on delete cascade,
  event_type text not null, -- 'page_view', 'email_open', 'email_click', 'sms_reply', 'chat_message', 'form_submit'
  event_source text, -- 'website', 'email', 'sms', 'chat'
  metadata jsonb, -- Event-specific data
  created_at timestamptz default now()
);

create index idx_lead_engagement_events_lead on lead_engagement_events(lead_id);
create index idx_lead_engagement_events_type on lead_engagement_events(event_type);
create index idx_lead_engagement_events_created on lead_engagement_events(created_at desc);

-- 9. LUMALEASING CONFIG TABLE
-- Referenced in: /api/lumaleasing/tours
create table if not exists lumaleasing_config (
  id uuid primary key default gen_random_uuid(),
  property_id uuid references properties(id) on delete cascade unique,
  api_key text unique not null,
  is_active boolean default true,
  tours_enabled boolean default false,
  tour_duration_minutes int default 30,
  widget_color text default '#6366f1',
  welcome_message text,
  rag_enabled boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index idx_lumaleasing_config_property on lumaleasing_config(property_id);
create index idx_lumaleasing_config_api_key on lumaleasing_config(api_key);

-- 10. WIDGET SESSIONS TABLE (Chat session tracking)
-- Referenced in: /api/lumaleasing/tours
create table if not exists widget_sessions (
  id uuid primary key default gen_random_uuid(),
  property_id uuid references properties(id) on delete cascade,
  visitor_id text, -- Anonymous ID before lead creation
  lead_id uuid references leads(id),
  session_start timestamptz default now(),
  session_end timestamptz,
  converted_at timestamptz,
  metadata jsonb, -- Browser info, referrer, etc.
  created_at timestamptz default now()
);

create index idx_widget_sessions_property on widget_sessions(property_id);
create index idx_widget_sessions_lead on widget_sessions(lead_id);
create index idx_widget_sessions_visitor on widget_sessions(visitor_id);

-- 11. TOUR SLOTS TABLE (Available tour times)
-- Referenced in: /api/lumaleasing/tours GET endpoint
create table if not exists tour_slots (
  id uuid primary key default gen_random_uuid(),
  property_id uuid references properties(id) on delete cascade,
  slot_date date not null,
  start_time time not null,
  end_time time not null,
  max_bookings int default 4,
  current_bookings int default 0,
  is_available boolean default true,
  created_at timestamptz default now(),
  unique(property_id, slot_date, start_time)
);

create index idx_tour_slots_property on tour_slots(property_id);
create index idx_tour_slots_date on tour_slots(slot_date);
create index idx_tour_slots_available on tour_slots(is_available);

-- 12. TOUR BOOKINGS TABLE (LumaLeasing widget bookings)
-- Referenced in: /api/lumaleasing/tours POST endpoint
create table if not exists tour_bookings (
  id uuid primary key default gen_random_uuid(),
  property_id uuid references properties(id) on delete cascade,
  lead_id uuid references leads(id) on delete cascade,
  slot_id uuid references tour_slots(id),
  scheduled_date date not null,
  scheduled_time time not null,
  duration_minutes int default 30,
  special_requests text,
  source text default 'direct', -- 'lumaleasing', 'direct', 'phone'
  booked_via_conversation_id uuid references conversations(id),
  status text default 'confirmed', -- 'confirmed', 'completed', 'cancelled', 'no_show'
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index idx_tour_bookings_property on tour_bookings(property_id);
create index idx_tour_bookings_lead on tour_bookings(lead_id);
create index idx_tour_bookings_slot on tour_bookings(slot_id);
create index idx_tour_bookings_date on tour_bookings(scheduled_date);

-- ============================================================================
-- ENHANCEMENTS TO EXISTING TABLES
-- ============================================================================

-- Add missing columns to leads table
alter table leads add column if not exists last_contacted_at timestamptz;
alter table leads add column if not exists updated_at timestamptz default now();
alter table leads add column if not exists move_in_date date;
alter table leads add column if not exists bedrooms int;
alter table leads add column if not exists notes text;

-- ============================================================================
-- DATABASE FUNCTIONS
-- ============================================================================

-- Function to score a lead (LeadPulse)
create or replace function score_lead(p_lead_id uuid)
returns uuid
language plpgsql
as $$
declare
  v_score_id uuid;
  v_total_score int := 0;
  v_engagement_score int := 0;
  v_timing_score int := 0;
  v_source_score int := 0;
  v_completeness_score int := 0;
  v_behavior_score int := 0;
  v_score_bucket text;
  v_factors jsonb := '[]'::jsonb;
  v_lead record;
  v_event_count int;
  v_message_count int;
  v_days_since_creation int;
begin
  -- Get lead info
  select * into v_lead from leads where id = p_lead_id;
  
  if not found then
    raise exception 'Lead not found: %', p_lead_id;
  end if;

  -- Calculate days since creation
  v_days_since_creation := extract(day from now() - v_lead.created_at);

  -- 1. ENGAGEMENT SCORE (0-30 points)
  -- Count engagement events
  select count(*) into v_event_count
  from lead_engagement_events
  where lead_id = p_lead_id;
  
  -- Count conversation messages
  select count(*) into v_message_count
  from messages m
  join conversations c on c.id = m.conversation_id
  where c.lead_id = p_lead_id and m.role = 'user';
  
  v_engagement_score := least(30, (v_event_count * 3) + (v_message_count * 5));
  
  if v_engagement_score >= 20 then
    v_factors := v_factors || jsonb_build_object(
      'factor', 'High engagement',
      'impact', format('%s events + %s messages', v_event_count, v_message_count),
      'type', 'positive'
    );
  end if;

  -- 2. TIMING SCORE (0-25 points)
  -- Fresh leads score higher
  if v_days_since_creation <= 1 then
    v_timing_score := 25;
    v_factors := v_factors || jsonb_build_object(
      'factor', 'Brand new lead',
      'impact', 'Created within 24 hours',
      'type', 'positive'
    );
  elsif v_days_since_creation <= 7 then
    v_timing_score := 20;
  elsif v_days_since_creation <= 30 then
    v_timing_score := 10;
  else
    v_timing_score := 5;
    v_factors := v_factors || jsonb_build_object(
      'factor', 'Stale lead',
      'impact', format('Created %s days ago', v_days_since_creation),
      'type', 'negative'
    );
  end if;

  -- 3. SOURCE SCORE (0-20 points)
  -- Premium sources score higher
  case v_lead.source
    when 'Direct Website' then v_source_score := 20;
    when 'Google Ads' then v_source_score := 18;
    when 'Facebook Ads' then v_source_score := 15;
    when 'LumaLeasing' then v_source_score := 20;
    when 'Referral' then v_source_score := 20;
    when 'Apartments.com' then v_source_score := 12;
    when 'Zillow' then v_source_score := 12;
    else v_source_score := 10;
  end case;

  -- 4. COMPLETENESS SCORE (0-15 points)
  v_completeness_score := 0;
  if v_lead.email is not null and v_lead.email != '' then
    v_completeness_score := v_completeness_score + 5;
  end if;
  if v_lead.phone is not null and v_lead.phone != '' then
    v_completeness_score := v_completeness_score + 5;
  end if;
  if v_lead.first_name is not null and v_lead.first_name != '' then
    v_completeness_score := v_completeness_score + 2;
  end if;
  if v_lead.move_in_date is not null then
    v_completeness_score := v_completeness_score + 3;
    v_factors := v_factors || jsonb_build_object(
      'factor', 'Has move-in date',
      'impact', 'Specific timeline provided',
      'type', 'positive'
    );
  end if;

  -- 5. BEHAVIOR SCORE (0-10 points)
  -- Tour scheduled/completed
  if v_lead.status = 'tour_booked' then
    v_behavior_score := v_behavior_score + 10;
    v_factors := v_factors || jsonb_build_object(
      'factor', 'Tour scheduled',
      'impact', 'High intent to visit',
      'type', 'positive'
    );
  elsif exists (
    select 1 from tours
    where lead_id = p_lead_id and status = 'completed'
  ) then
    v_behavior_score := v_behavior_score + 10;
    v_factors := v_factors || jsonb_build_object(
      'factor', 'Tour completed',
      'impact', 'Already visited property',
      'type', 'positive'
    );
  end if;

  -- Calculate total score
  v_total_score := v_engagement_score + v_timing_score + v_source_score + v_completeness_score + v_behavior_score;

  -- Determine bucket
  if v_total_score >= 70 then
    v_score_bucket := 'hot';
  elsif v_total_score >= 45 then
    v_score_bucket := 'warm';
  elsif v_total_score >= 25 then
    v_score_bucket := 'cold';
  else
    v_score_bucket := 'unqualified';
  end if;

  -- Insert score
  insert into lead_scores (
    lead_id,
    total_score,
    engagement_score,
    timing_score,
    source_score,
    completeness_score,
    behavior_score,
    score_bucket,
    factors,
    model_version
  ) values (
    p_lead_id,
    v_total_score,
    v_engagement_score,
    v_timing_score,
    v_source_score,
    v_completeness_score,
    v_behavior_score,
    v_score_bucket,
    v_factors,
    'v1'
  )
  returning id into v_score_id;

  return v_score_id;
end;
$$;

-- ============================================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================================

alter table tours enable row level security;
alter table workflow_definitions enable row level security;
alter table lead_workflows enable row level security;
alter table workflow_actions enable row level security;
alter table follow_up_templates enable row level security;
alter table lead_activities enable row level security;
alter table lead_scores enable row level security;
alter table lead_engagement_events enable row level security;
alter table lumaleasing_config enable row level security;
alter table widget_sessions enable row level security;
alter table tour_slots enable row level security;
alter table tour_bookings enable row level security;

-- Policy: Users can see data for their organization's properties
create policy "Users view org tours" on tours
for select using (
  exists (
    select 1 from profiles p
    join properties prop on prop.org_id = p.org_id
    where p.id = auth.uid() and prop.id = tours.property_id
  )
);

create policy "Users view org workflow definitions" on workflow_definitions
for select using (
  exists (
    select 1 from profiles p
    join properties prop on prop.org_id = p.org_id
    where p.id = auth.uid() and prop.id = workflow_definitions.property_id
  )
);

create policy "Users view org lead workflows" on lead_workflows
for select using (
  exists (
    select 1 from profiles p
    join properties prop on prop.org_id = p.org_id
    join leads l on l.property_id = prop.id
    where p.id = auth.uid() and l.id = lead_workflows.lead_id
  )
);

create policy "Users view org workflow actions" on workflow_actions
for select using (
  exists (
    select 1 from profiles p
    join properties prop on prop.org_id = p.org_id
    join leads l on l.property_id = prop.id
    join lead_workflows lw on lw.lead_id = l.id
    where p.id = auth.uid() and lw.id = workflow_actions.lead_workflow_id
  )
);

create policy "Users view org templates" on follow_up_templates
for select using (
  exists (
    select 1 from profiles p
    join properties prop on prop.org_id = p.org_id
    where p.id = auth.uid() and prop.id = follow_up_templates.property_id
  )
);

create policy "Users view org lead activities" on lead_activities
for select using (
  exists (
    select 1 from profiles p
    join properties prop on prop.org_id = p.org_id
    join leads l on l.property_id = prop.id
    where p.id = auth.uid() and l.id = lead_activities.lead_id
  )
);

create policy "Users view org lead scores" on lead_scores
for select using (
  exists (
    select 1 from profiles p
    join properties prop on prop.org_id = p.org_id
    join leads l on l.property_id = prop.id
    where p.id = auth.uid() and l.id = lead_scores.lead_id
  )
);

create policy "Users view org engagement events" on lead_engagement_events
for select using (
  exists (
    select 1 from profiles p
    join properties prop on prop.org_id = p.org_id
    join leads l on l.property_id = prop.id
    where p.id = auth.uid() and l.id = lead_engagement_events.lead_id
  )
);

create policy "Users view org lumaleasing config" on lumaleasing_config
for select using (
  exists (
    select 1 from profiles p
    join properties prop on prop.org_id = p.org_id
    where p.id = auth.uid() and prop.id = lumaleasing_config.property_id
  )
);

create policy "Users view org widget sessions" on widget_sessions
for select using (
  exists (
    select 1 from profiles p
    join properties prop on prop.org_id = p.org_id
    where p.id = auth.uid() and prop.id = widget_sessions.property_id
  )
);

create policy "Users view org tour slots" on tour_slots
for select using (
  exists (
    select 1 from profiles p
    join properties prop on prop.org_id = p.org_id
    where p.id = auth.uid() and prop.id = tour_slots.property_id
  )
);

create policy "Users view org tour bookings" on tour_bookings
for select using (
  exists (
    select 1 from profiles p
    join properties prop on prop.org_id = p.org_id
    where p.id = auth.uid() and prop.id = tour_bookings.property_id
  )
);

-- ============================================================================
-- SEED DATA: Default Workflow Templates
-- ============================================================================

-- Note: These will be inserted via API after properties are created
-- This is just the schema for reference

comment on table workflow_definitions is 'Workflow templates that define automated follow-up sequences';
comment on table lead_workflows is 'Active workflow instances running for specific leads';
comment on table workflow_actions is 'Log of executed workflow actions (sent messages, etc)';
comment on table follow_up_templates is 'Message templates used in workflows with variable substitution';
comment on table lead_activities is 'Activity timeline/feed for each lead (notes, events, status changes)';
comment on table lead_scores is 'LeadPulse scoring history for leads';
comment on table lead_engagement_events is 'Tracking events for lead scoring (page views, clicks, etc)';

-- ============================================================================
-- COMPLETION
-- ============================================================================

-- This migration adds all tables referenced by existing API routes
-- Next steps:
-- 1. Run this migration
-- 2. Seed default workflow templates via admin API
-- 3. Build lead detail UI with activity timeline
-- 4. Test tour scheduling and workflow automation

