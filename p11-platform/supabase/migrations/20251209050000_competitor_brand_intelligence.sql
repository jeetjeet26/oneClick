-- =============================================
-- COMPETITOR BRAND INTELLIGENCE SCHEMA
-- Stores scraped website content and AI-analyzed brand insights
-- =============================================

-- Competitor Brand Intelligence (AI-analyzed insights)
CREATE TABLE IF NOT EXISTS competitor_brand_intelligence (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  competitor_id uuid REFERENCES competitors(id) ON DELETE CASCADE UNIQUE,
  
  -- Brand Positioning
  brand_voice text,                    -- 'luxury', 'value', 'community-focused', etc.
  brand_personality text,              -- AI-analyzed personality traits
  positioning_statement text,          -- How they position themselves
  target_audience text,                -- Who they're marketing to
  unique_selling_points text[],        -- Top 3-5 differentiators
  
  -- Offerings & Features
  highlighted_amenities text[],        -- Amenities they emphasize most
  service_offerings text[],            -- Concierge, package handling, etc.
  lifestyle_focus text[],              -- 'pet-friendly', 'work-from-home', 'fitness', etc.
  community_events text[],             -- Events they promote
  
  -- Promotions & Specials
  active_specials text[],              -- Current move-in specials (text only)
  promotional_messaging text,          -- How they frame their promotions
  urgency_tactics text[],              -- 'Limited time', 'Only 3 left', etc.
  
  -- Website Analysis
  website_tone text,                   -- 'professional', 'casual', 'luxury', etc.
  key_messaging_themes text[],         -- Recurring themes in their copy
  call_to_action_patterns text[],      -- CTAs they use
  
  -- Semantic Analysis
  sentiment_score numeric(3,2),        -- Overall brand sentiment (-1 to 1)
  confidence_score numeric(3,2),       -- AI confidence in analysis
  
  -- Metadata
  pages_analyzed int DEFAULT 0,
  last_analyzed_at timestamptz,
  analysis_version text,               -- Track AI model version
  raw_extraction jsonb,                -- Full extraction data for debugging
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Raw scraped content chunks for RAG/semantic search
CREATE TABLE IF NOT EXISTS competitor_content_chunks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  competitor_id uuid REFERENCES competitors(id) ON DELETE CASCADE,
  
  page_url text NOT NULL,
  page_type text,                      -- 'home', 'amenities', 'specials', etc.
  chunk_index int,                     -- Order within the page
  content text NOT NULL,
  content_hash text,                   -- For deduplication
  
  -- Vector embedding for semantic search
  embedding vector(1536),              -- OpenAI text-embedding-3-small
  
  -- Metadata
  scraped_at timestamptz DEFAULT now(),
  
  UNIQUE(competitor_id, content_hash)
);

-- Scrape job tracking for chunked processing
CREATE TABLE IF NOT EXISTS competitor_scrape_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id uuid REFERENCES properties(id) ON DELETE CASCADE,
  
  job_type text DEFAULT 'brand_intelligence', -- 'brand_intelligence', 'refresh'
  status text DEFAULT 'pending',       -- 'pending', 'processing', 'completed', 'failed', 'cancelled'
  total_competitors int DEFAULT 0,
  processed_count int DEFAULT 0,
  failed_count int DEFAULT 0,
  
  -- Batching info
  batch_size int DEFAULT 5,
  current_batch int DEFAULT 0,
  total_batches int DEFAULT 0,
  
  -- Competitor tracking
  competitor_ids uuid[],               -- All competitors to process
  processed_competitor_ids uuid[],     -- Successfully processed
  failed_competitor_ids uuid[],        -- Failed to process
  
  -- Timing
  started_at timestamptz,
  completed_at timestamptz,
  estimated_completion_at timestamptz,
  
  -- Error tracking
  error_message text,
  errors jsonb,                        -- Array of per-competitor errors
  
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- =============================================
-- INDEXES
-- =============================================

CREATE INDEX IF NOT EXISTS idx_brand_intel_competitor ON competitor_brand_intelligence(competitor_id);
CREATE INDEX IF NOT EXISTS idx_brand_intel_updated ON competitor_brand_intelligence(last_analyzed_at DESC);
CREATE INDEX IF NOT EXISTS idx_content_chunks_competitor ON competitor_content_chunks(competitor_id);
CREATE INDEX IF NOT EXISTS idx_content_chunks_page_type ON competitor_content_chunks(page_type);
CREATE INDEX IF NOT EXISTS idx_content_chunks_hash ON competitor_content_chunks(content_hash);

-- Vector similarity search index (IVFFlat for approximate nearest neighbor)
CREATE INDEX IF NOT EXISTS idx_content_chunks_embedding ON competitor_content_chunks 
  USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

CREATE INDEX IF NOT EXISTS idx_scrape_jobs_property ON competitor_scrape_jobs(property_id);
CREATE INDEX IF NOT EXISTS idx_scrape_jobs_status ON competitor_scrape_jobs(status);
CREATE INDEX IF NOT EXISTS idx_scrape_jobs_created ON competitor_scrape_jobs(created_at DESC);

-- =============================================
-- FUNCTIONS
-- =============================================

-- Function to search competitor content by semantic similarity
CREATE OR REPLACE FUNCTION match_competitor_content (
  query_embedding vector(1536),
  match_threshold float DEFAULT 0.7,
  match_count int DEFAULT 10,
  filter_property_id uuid DEFAULT NULL,
  filter_competitor_ids uuid[] DEFAULT NULL
)
RETURNS TABLE (
  id uuid,
  competitor_id uuid,
  competitor_name text,
  page_url text,
  page_type text,
  content text,
  similarity float
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    cc.id,
    cc.competitor_id,
    c.name as competitor_name,
    cc.page_url,
    cc.page_type,
    cc.content,
    1 - (cc.embedding <=> query_embedding) as similarity
  FROM competitor_content_chunks cc
  JOIN competitors c ON c.id = cc.competitor_id
  WHERE 
    1 - (cc.embedding <=> query_embedding) > match_threshold
    AND (filter_property_id IS NULL OR c.property_id = filter_property_id)
    AND (filter_competitor_ids IS NULL OR cc.competitor_id = ANY(filter_competitor_ids))
  ORDER BY cc.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- Function to update job progress
CREATE OR REPLACE FUNCTION update_scrape_job_progress(
  job_uuid uuid,
  new_processed_count int,
  new_failed_count int,
  processed_id uuid DEFAULT NULL,
  failed_id uuid DEFAULT NULL,
  error_detail jsonb DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
  current_errors jsonb;
BEGIN
  -- Get current errors
  SELECT COALESCE(errors, '[]'::jsonb) INTO current_errors
  FROM competitor_scrape_jobs WHERE id = job_uuid;
  
  -- Update the job
  UPDATE competitor_scrape_jobs
  SET 
    processed_count = new_processed_count,
    failed_count = new_failed_count,
    processed_competitor_ids = CASE 
      WHEN processed_id IS NOT NULL THEN array_append(COALESCE(processed_competitor_ids, '{}'), processed_id)
      ELSE processed_competitor_ids
    END,
    failed_competitor_ids = CASE 
      WHEN failed_id IS NOT NULL THEN array_append(COALESCE(failed_competitor_ids, '{}'), failed_id)
      ELSE failed_competitor_ids
    END,
    errors = CASE 
      WHEN error_detail IS NOT NULL THEN current_errors || error_detail
      ELSE errors
    END,
    current_batch = CEIL(new_processed_count::float / batch_size),
    updated_at = now()
  WHERE id = job_uuid;
END;
$$;

-- =============================================
-- ROW LEVEL SECURITY
-- =============================================

ALTER TABLE competitor_brand_intelligence ENABLE ROW LEVEL SECURITY;
ALTER TABLE competitor_content_chunks ENABLE ROW LEVEL SECURITY;
ALTER TABLE competitor_scrape_jobs ENABLE ROW LEVEL SECURITY;

-- Brand Intelligence Policies
CREATE POLICY "Users view their org competitor brand intelligence"
ON competitor_brand_intelligence FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM profiles
    JOIN competitors ON competitors.id = competitor_brand_intelligence.competitor_id
    JOIN properties ON properties.id = competitors.property_id
    WHERE profiles.id = auth.uid() AND profiles.org_id = properties.org_id
  )
);

CREATE POLICY "Users manage their org competitor brand intelligence"
ON competitor_brand_intelligence FOR ALL USING (
  EXISTS (
    SELECT 1 FROM profiles
    JOIN competitors ON competitors.id = competitor_brand_intelligence.competitor_id
    JOIN properties ON properties.id = competitors.property_id
    WHERE profiles.id = auth.uid() AND profiles.org_id = properties.org_id
  )
);

-- Content Chunks Policies
CREATE POLICY "Users view their org competitor content chunks"
ON competitor_content_chunks FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM profiles
    JOIN competitors ON competitors.id = competitor_content_chunks.competitor_id
    JOIN properties ON properties.id = competitors.property_id
    WHERE profiles.id = auth.uid() AND profiles.org_id = properties.org_id
  )
);

CREATE POLICY "Users manage their org competitor content chunks"
ON competitor_content_chunks FOR ALL USING (
  EXISTS (
    SELECT 1 FROM profiles
    JOIN competitors ON competitors.id = competitor_content_chunks.competitor_id
    JOIN properties ON properties.id = competitors.property_id
    WHERE profiles.id = auth.uid() AND profiles.org_id = properties.org_id
  )
);

-- Scrape Jobs Policies
CREATE POLICY "Users view their org scrape jobs"
ON competitor_scrape_jobs FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM profiles
    JOIN properties ON properties.id = competitor_scrape_jobs.property_id
    WHERE profiles.id = auth.uid() AND profiles.org_id = properties.org_id
  )
);

CREATE POLICY "Users manage their org scrape jobs"
ON competitor_scrape_jobs FOR ALL USING (
  EXISTS (
    SELECT 1 FROM profiles
    JOIN properties ON properties.id = competitor_scrape_jobs.property_id
    WHERE profiles.id = auth.uid() AND profiles.org_id = properties.org_id
  )
);

-- Service role policies for background jobs
CREATE POLICY "Service role full access to competitor_brand_intelligence" 
ON competitor_brand_intelligence FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role full access to competitor_content_chunks" 
ON competitor_content_chunks FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role full access to competitor_scrape_jobs" 
ON competitor_scrape_jobs FOR ALL USING (auth.role() = 'service_role');

-- =============================================
-- TRIGGERS
-- =============================================

-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_brand_intelligence_updated_at
  BEFORE UPDATE ON competitor_brand_intelligence
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_scrape_jobs_updated_at
  BEFORE UPDATE ON competitor_scrape_jobs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

