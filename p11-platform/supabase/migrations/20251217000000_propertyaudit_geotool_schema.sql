-- PropertyAudit GEO Schema Migration
-- Tracks LLM SERP visibility (how properties appear in AI-generated responses)
-- Adapted from GeoTool - linked to properties table

-- ============================================================================
-- ENUMS
-- ============================================================================

-- Surface type (which LLM platform)
do $$ begin
  create type geo_surface_enum as enum ('openai', 'claude');
exception when duplicate_object then null; end $$;

-- Query type for categorization
do $$ begin
  create type geo_query_type_enum as enum ('branded', 'category', 'comparison', 'local', 'faq');
exception when duplicate_object then null; end $$;

-- Run status
do $$ begin
  create type geo_run_status_enum as enum ('queued', 'running', 'completed', 'failed');
exception when duplicate_object then null; end $$;

-- ============================================================================
-- GEO QUERIES TABLE
-- Query panel per property - auto-generated from property data
-- ============================================================================

create table if not exists geo_queries (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references properties(id) on delete cascade,
  text text not null,
  type geo_query_type_enum not null,
  geo text, -- Geographic context (city, state)
  weight numeric default 1, -- Importance weight for scoring
  is_active boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index idx_geo_queries_property on geo_queries(property_id);
create index idx_geo_queries_type on geo_queries(type);
create index idx_geo_queries_active on geo_queries(property_id) where is_active = true;

-- ============================================================================
-- GEO RUNS TABLE
-- Execution records for audit runs per surface (openai/claude)
-- ============================================================================

create table if not exists geo_runs (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references properties(id) on delete cascade,
  surface geo_surface_enum not null,
  model_name text not null, -- e.g., 'gpt-4o-mini', 'claude-3-haiku-20240307'
  status geo_run_status_enum default 'queued',
  query_count int default 0,
  started_at timestamptz default now(),
  finished_at timestamptz,
  error_message text,
  created_at timestamptz default now()
);

create index idx_geo_runs_property on geo_runs(property_id);
create index idx_geo_runs_property_started on geo_runs(property_id, started_at desc);
create index idx_geo_runs_status on geo_runs(status);

-- ============================================================================
-- GEO ANSWERS TABLE
-- LLM responses with presence, rank, SOV metrics
-- ============================================================================

create table if not exists geo_answers (
  id uuid primary key default gen_random_uuid(),
  run_id uuid not null references geo_runs(id) on delete cascade,
  query_id uuid not null references geo_queries(id) on delete cascade,
  presence boolean not null, -- Was property mentioned?
  llm_rank int, -- Position in ordered entities (1 = first mention)
  link_rank int, -- Position of first brand domain citation
  sov numeric, -- Share of Voice (brand citations / total citations)
  flags jsonb default '[]', -- ['no_sources', 'possible_hallucination', etc.]
  answer_summary text, -- LLM's summary text
  ordered_entities jsonb default '[]', -- [{name, domain, rationale, position}]
  raw_json jsonb, -- Full raw response for debugging
  created_at timestamptz default now()
);

create index idx_geo_answers_run on geo_answers(run_id);
create index idx_geo_answers_query on geo_answers(query_id);
create index idx_geo_answers_run_query on geo_answers(run_id, query_id);
create index idx_geo_answers_presence on geo_answers(run_id) where presence = true;

-- ============================================================================
-- GEO CITATIONS TABLE
-- Source citations from LLM responses
-- ============================================================================

create table if not exists geo_citations (
  id uuid primary key default gen_random_uuid(),
  answer_id uuid not null references geo_answers(id) on delete cascade,
  url text not null,
  domain text not null,
  is_brand_domain boolean default false, -- Does this match property's domain?
  entity_ref text, -- Which entity this citation is for
  created_at timestamptz default now()
);

create index idx_geo_citations_answer on geo_citations(answer_id);
create index idx_geo_citations_domain on geo_citations(domain);
create index idx_geo_citations_brand on geo_citations(answer_id) where is_brand_domain = true;

-- ============================================================================
-- GEO SCORES TABLE
-- Aggregated scores per run
-- ============================================================================

create table if not exists geo_scores (
  id uuid primary key default gen_random_uuid(),
  run_id uuid not null references geo_runs(id) on delete cascade,
  overall_score numeric not null, -- 0-100 composite score
  visibility_pct numeric not null, -- % of queries with presence
  avg_llm_rank numeric, -- Average LLM rank across queries with presence
  avg_link_rank numeric, -- Average link rank
  avg_sov numeric, -- Average share of voice
  breakdown jsonb default '{}', -- {position: x, link: y, sov: z, accuracy: w}
  query_scores jsonb default '[]', -- Per-query score array
  created_at timestamptz default now()
);

create index idx_geo_scores_run on geo_scores(run_id);

-- ============================================================================
-- GEO PROPERTY CONFIG TABLE
-- Property-specific settings for GEO tracking
-- ============================================================================

create table if not exists geo_property_config (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references properties(id) on delete cascade unique,
  domains text[] default '{}', -- Property domains to track
  competitor_domains text[] default '{}', -- Competitor domains to compare
  primary_geo text, -- Primary geographic area
  visibility_target numeric default 70, -- Target visibility % (0-100)
  run_frequency text default 'weekly', -- 'daily', 'weekly', 'monthly'
  last_run_at timestamptz,
  is_active boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index idx_geo_property_config_property on geo_property_config(property_id);
create index idx_geo_property_config_active on geo_property_config(is_active) where is_active = true;

-- ============================================================================
-- ROW LEVEL SECURITY POLICIES
-- ============================================================================

-- Enable RLS on all tables
alter table geo_queries enable row level security;
alter table geo_runs enable row level security;
alter table geo_answers enable row level security;
alter table geo_citations enable row level security;
alter table geo_scores enable row level security;
alter table geo_property_config enable row level security;

-- Policy helper: Get user's accessible property IDs
-- (Reuses existing pattern from other P11 tables)

-- geo_queries policies
create policy "Users can view geo_queries for their properties"
  on geo_queries for select
  using (
    property_id in (
      select p.id from properties p
      join profiles pr on pr.org_id = p.org_id
      where pr.id = auth.uid()
    )
  );

create policy "Users can manage geo_queries for their properties"
  on geo_queries for all
  using (
    property_id in (
      select p.id from properties p
      join profiles pr on pr.org_id = p.org_id
      where pr.id = auth.uid()
    )
  );

-- geo_runs policies
create policy "Users can view geo_runs for their properties"
  on geo_runs for select
  using (
    property_id in (
      select p.id from properties p
      join profiles pr on pr.org_id = p.org_id
      where pr.id = auth.uid()
    )
  );

create policy "Users can manage geo_runs for their properties"
  on geo_runs for all
  using (
    property_id in (
      select p.id from properties p
      join profiles pr on pr.org_id = p.org_id
      where pr.id = auth.uid()
    )
  );

-- geo_answers policies
create policy "Users can view geo_answers for their properties"
  on geo_answers for select
  using (
    run_id in (
      select r.id from geo_runs r
      join properties p on p.id = r.property_id
      join profiles pr on pr.org_id = p.org_id
      where pr.id = auth.uid()
    )
  );

-- geo_citations policies
create policy "Users can view geo_citations for their properties"
  on geo_citations for select
  using (
    answer_id in (
      select a.id from geo_answers a
      join geo_runs r on r.id = a.run_id
      join properties p on p.id = r.property_id
      join profiles pr on pr.org_id = p.org_id
      where pr.id = auth.uid()
    )
  );

-- geo_scores policies
create policy "Users can view geo_scores for their properties"
  on geo_scores for select
  using (
    run_id in (
      select r.id from geo_runs r
      join properties p on p.id = r.property_id
      join profiles pr on pr.org_id = p.org_id
      where pr.id = auth.uid()
    )
  );

-- geo_property_config policies
create policy "Users can view geo_property_config for their properties"
  on geo_property_config for select
  using (
    property_id in (
      select p.id from properties p
      join profiles pr on pr.org_id = p.org_id
      where pr.id = auth.uid()
    )
  );

create policy "Users can manage geo_property_config for their properties"
  on geo_property_config for all
  using (
    property_id in (
      select p.id from properties p
      join profiles pr on pr.org_id = p.org_id
      where pr.id = auth.uid()
    )
  );

-- ============================================================================
-- SERVICE ROLE BYPASS (for API routes)
-- ============================================================================

-- Allow service role full access (for backend operations)
create policy "Service role has full access to geo_queries"
  on geo_queries for all
  using (auth.role() = 'service_role');

create policy "Service role has full access to geo_runs"
  on geo_runs for all
  using (auth.role() = 'service_role');

create policy "Service role has full access to geo_answers"
  on geo_answers for all
  using (auth.role() = 'service_role');

create policy "Service role has full access to geo_citations"
  on geo_citations for all
  using (auth.role() = 'service_role');

create policy "Service role has full access to geo_scores"
  on geo_scores for all
  using (auth.role() = 'service_role');

create policy "Service role has full access to geo_property_config"
  on geo_property_config for all
  using (auth.role() = 'service_role');





