-- Enable Vector Extension for AI
create extension if not exists vector;

-- 1. ORGANIZATION & IDENTITY
create table if not exists organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  subscription_tier text default 'starter', -- 'starter', 'growth', 'enterprise'
  created_at timestamptz default now()
);

create table if not exists properties (
  id uuid primary key default gen_random_uuid(),
  org_id uuid references organizations(id) on delete cascade,
  name text not null,
  address jsonb,
  settings jsonb, -- timezone, office hours, brand_colors
  created_at timestamptz default now()
);

create table if not exists profiles (
  id uuid references auth.users on delete cascade primary key,
  org_id uuid references organizations(id),
  role text default 'viewer', -- 'admin', 'manager', 'viewer'
  full_name text,
  created_at timestamptz default now()
);

-- 2. DATA LAKE (Unified Marketing Data)
create table if not exists fact_marketing_performance (
    date date not null,
    property_id uuid references properties(id),
    channel_id text, -- 'meta', 'google_ads'
    campaign_name text,
    campaign_id text,
    impressions bigint default 0,
    clicks bigint default 0,
    spend numeric(10,2) default 0.00,
    conversions bigint default 0,
    raw_source text,
    created_at timestamptz default now(),
    primary key (date, property_id, campaign_id)
);

create index if not exists idx_fact_marketing_date on fact_marketing_performance(date);
create index if not exists idx_fact_marketing_prop on fact_marketing_performance(property_id);

-- 3. LUMALEASING (RAG Knowledge Base)
create table if not exists documents (
    id uuid primary key default gen_random_uuid(),
    property_id uuid references properties(id) on delete cascade,
    content text not null,
    metadata jsonb, -- { "source": "Pet Policy.pdf", "page": 1 }
    embedding vector(1536), -- OpenAI text-embedding-3-small
    created_at timestamptz default now()
);

-- Function to match documents
create or replace function match_documents (
  query_embedding vector(1536),
  match_threshold float,
  match_count int,
  filter_property uuid
)
returns table (
  id uuid,
  content text,
  similarity float,
  metadata jsonb
)
language plpgsql
as $$
begin
  return query
  select
    documents.id,
    documents.content,
    1 - (documents.embedding <=> query_embedding) as similarity,
    documents.metadata
  from documents
  where 1 - (documents.embedding <=> query_embedding) > match_threshold
  and documents.property_id = filter_property
  order by documents.embedding <=> query_embedding
  limit match_count;
end;
$$;

-- 4. TOURSPARK (Leads & Workflow)
create table if not exists leads (
    id uuid primary key default gen_random_uuid(),
    property_id uuid references properties(id),
    source text,
    first_name text,
    last_name text,
    email text,
    phone text,
    status text default 'new', -- 'new', 'contacted', 'tour_booked', 'leased', 'lost'
    created_at timestamptz default now()
);

create table if not exists conversations (
    id uuid primary key default gen_random_uuid(),
    lead_id uuid references leads(id),
    property_id uuid references properties(id),
    channel text, -- 'sms', 'chat', 'email'
    created_at timestamptz default now()
);

create table if not exists messages (
    id uuid primary key default gen_random_uuid(),
    conversation_id uuid references conversations(id),
    role text, -- 'user', 'assistant', 'system'
    content text,
    created_at timestamptz default now()
);

-- RLS POLICIES (Security)
alter table organizations enable row level security;
alter table properties enable row level security;
alter table fact_marketing_performance enable row level security;
alter table documents enable row level security;
alter table leads enable row level security;
alter table conversations enable row level security;
alter table messages enable row level security;

-- Simple Policy: Users can see everything in their Organization
create policy "Users view their org data" on properties
for select using (
  exists (
    select 1 from profiles
    where profiles.id = auth.uid()
    and profiles.org_id = properties.org_id
  )
);

create policy "Users view their org marketing stats" on fact_marketing_performance
for select using (
  exists (
    select 1 from profiles
    join properties on properties.id = fact_marketing_performance.property_id
    where profiles.id = auth.uid()
    and profiles.org_id = properties.org_id
  )
);













