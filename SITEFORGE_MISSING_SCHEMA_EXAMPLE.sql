-- =============================================
-- SITEFORGE DATABASE SCHEMA
-- Critical tables required for SiteForge to function
-- Migration: 20251215010000_siteforge_schema.sql
-- =============================================
-- 
-- STATUS: NOT YET CREATED IN DATABASE
-- ACTION REQUIRED: Create this migration file in supabase/migrations/
--
-- This schema is REQUIRED for SiteForge to work. Currently all API
-- calls will fail because these tables don't exist.
-- =============================================

-- ============================================================================
-- PROPERTY WEBSITES TABLE
-- Stores generated website metadata and content
-- ============================================================================
CREATE TABLE IF NOT EXISTS property_websites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id uuid REFERENCES properties(id) ON DELETE CASCADE NOT NULL,
  
  -- WordPress deployment info
  wp_url text,
  wp_admin_url text,
  wp_instance_id text,
  wp_credentials jsonb, -- { "username": "admin", "password": "..." }
  
  -- Generation tracking
  generation_status text DEFAULT 'queued', 
  -- Status values: 'queued', 'analyzing_brand', 'planning_architecture', 
  --                'generating_content', 'preparing_assets', 'deploying',
  --                'ready_for_preview', 'complete', 'failed', 'deploy_failed'
  generation_progress int DEFAULT 0, -- 0-100
  current_step text,
  error_message text,
  
  -- Brand intelligence used
  brand_source text, -- 'brandforge', 'knowledge_base', 'generated', 'hybrid'
  brand_confidence numeric(3,2), -- 0.0 to 1.0
  
  -- Generated site content (stored as JSONB)
  site_architecture jsonb, -- Full SiteArchitecture type
  pages_generated jsonb, -- Array of GeneratedPage types
  assets_manifest jsonb, -- { totalAssets, assetsByType, etc. }
  
  -- Performance metrics
  generation_started_at timestamptz,
  generation_completed_at timestamptz,
  generation_duration_seconds int,
  deployed_at timestamptz,
  
  -- Analytics (for future tracking)
  page_views int DEFAULT 0,
  tour_requests int DEFAULT 0,
  conversion_rate numeric(5,2),
  
  -- Versioning
  version int DEFAULT 1,
  previous_version_id uuid REFERENCES property_websites(id) ON DELETE SET NULL,
  
  -- User preferences used for generation
  user_preferences jsonb, -- { style, emphasis, ctaPriority }
  
  -- Timestamps
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Indexes for property_websites
CREATE INDEX IF NOT EXISTS idx_property_websites_property ON property_websites(property_id);
CREATE INDEX IF NOT EXISTS idx_property_websites_status ON property_websites(generation_status);
CREATE INDEX IF NOT EXISTS idx_property_websites_created ON property_websites(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_property_websites_version ON property_websites(property_id, version DESC);

-- ============================================================================
-- WEBSITE ASSETS TABLE  
-- Stores images, videos, and other media files used in websites
-- ============================================================================
CREATE TABLE IF NOT EXISTS website_assets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  website_id uuid REFERENCES property_websites(id) ON DELETE CASCADE NOT NULL,
  
  asset_type text NOT NULL, 
  -- Values: 'logo', 'hero_image', 'amenity_photo', 'lifestyle_photo', 
  --         'floorplan_image', 'icon', 'video', 'pdf'
  
  source text NOT NULL, 
  -- Values: 'uploaded', 'brandforge', 'generated', 'stock', 'property'
  
  file_url text NOT NULL,
  file_size bigint, -- in bytes
  mime_type text,
  
  -- WordPress integration
  wp_media_id int, -- WordPress media library ID after upload
  
  -- Metadata
  alt_text text,
  caption text,
  usage_context jsonb, -- { page, section, position, image_index }
  
  -- Optimization tracking
  optimized boolean DEFAULT false,
  original_url text, -- URL before optimization
  
  created_at timestamptz DEFAULT now()
);

-- Indexes for website_assets
CREATE INDEX IF NOT EXISTS idx_website_assets_website ON website_assets(website_id);
CREATE INDEX IF NOT EXISTS idx_website_assets_type ON website_assets(asset_type);
CREATE INDEX IF NOT EXISTS idx_website_assets_source ON website_assets(source);
CREATE INDEX IF NOT EXISTS idx_website_assets_wp_media ON website_assets(wp_media_id) 
  WHERE wp_media_id IS NOT NULL;

-- ============================================================================
-- SITEFORGE JOBS TABLE
-- Tracks async generation jobs for monitoring and debugging
-- ============================================================================
CREATE TABLE IF NOT EXISTS siteforge_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  website_id uuid REFERENCES property_websites(id) ON DELETE CASCADE NOT NULL,
  
  job_type text NOT NULL, 
  -- Values: 'full_generation', 'regenerate_page', 'update_content', 'deploy_changes'
  
  status text DEFAULT 'queued',
  -- Values: 'queued', 'processing', 'complete', 'failed'
  
  input_params jsonb, -- Original request parameters
  output_data jsonb, -- Results/artifacts
  error_details jsonb, -- Error info if failed
  
  -- Retry logic
  attempts int DEFAULT 0,
  max_attempts int DEFAULT 3,
  
  -- Timing
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz DEFAULT now()
);

-- Indexes for siteforge_jobs
CREATE INDEX IF NOT EXISTS idx_siteforge_jobs_website ON siteforge_jobs(website_id);
CREATE INDEX IF NOT EXISTS idx_siteforge_jobs_status ON siteforge_jobs(status);
CREATE INDEX IF NOT EXISTS idx_siteforge_jobs_type ON siteforge_jobs(job_type);
CREATE INDEX IF NOT EXISTS idx_siteforge_jobs_created ON siteforge_jobs(created_at DESC);

-- ============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- Ensures users can only access their organization's websites
-- ============================================================================

ALTER TABLE property_websites ENABLE ROW LEVEL SECURITY;
ALTER TABLE website_assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE siteforge_jobs ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view websites for their organization's properties
CREATE POLICY "Users view their org property websites"
ON property_websites FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM profiles
    JOIN properties ON properties.id = property_websites.property_id
    WHERE profiles.id = auth.uid()
    AND profiles.org_id = properties.org_id
  )
);

-- Policy: Users can create/update websites for their organization's properties
CREATE POLICY "Users manage their org property websites"
ON property_websites FOR ALL USING (
  EXISTS (
    SELECT 1 FROM profiles
    JOIN properties ON properties.id = property_websites.property_id
    WHERE profiles.id = auth.uid()
    AND profiles.org_id = properties.org_id
  )
);

-- Policy: Users can view assets for their organization's websites
CREATE POLICY "Users view their org website assets"
ON website_assets FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM profiles
    JOIN property_websites ON property_websites.id = website_assets.website_id
    JOIN properties ON properties.id = property_websites.property_id
    WHERE profiles.id = auth.uid()
    AND profiles.org_id = properties.org_id
  )
);

-- Policy: Users can manage assets for their organization's websites
CREATE POLICY "Users manage their org website assets"
ON website_assets FOR ALL USING (
  EXISTS (
    SELECT 1 FROM profiles
    JOIN property_websites ON property_websites.id = website_assets.website_id
    JOIN properties ON properties.id = property_websites.property_id
    WHERE profiles.id = auth.uid()
    AND profiles.org_id = properties.org_id
  )
);

-- Policy: Users can view jobs for their organization's websites
CREATE POLICY "Users view their org siteforge jobs"
ON siteforge_jobs FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM profiles
    JOIN property_websites ON property_websites.id = siteforge_jobs.website_id
    JOIN properties ON properties.id = property_websites.property_id
    WHERE profiles.id = auth.uid()
    AND profiles.org_id = properties.org_id
  )
);

-- Service role policies for background job processing
CREATE POLICY "Service role full access to property_websites" 
ON property_websites FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role full access to website_assets" 
ON website_assets FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role full access to siteforge_jobs" 
ON siteforge_jobs FOR ALL USING (auth.role() = 'service_role');

-- ============================================================================
-- TRIGGERS
-- Automatically update timestamps and maintain data consistency
-- ============================================================================

-- Function to auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_property_websites_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger: Update property_websites.updated_at on every update
CREATE TRIGGER trigger_property_websites_updated_at
  BEFORE UPDATE ON property_websites
  FOR EACH ROW
  EXECUTE FUNCTION update_property_websites_updated_at();

-- ============================================================================
-- HELPER FUNCTIONS (Optional but useful)
-- ============================================================================

-- Function: Get website with full details including asset count
CREATE OR REPLACE FUNCTION get_website_details(website_uuid uuid)
RETURNS TABLE (
  id uuid,
  property_id uuid,
  property_name text,
  generation_status text,
  generation_progress int,
  brand_source text,
  brand_confidence numeric,
  pages_count int,
  assets_count int,
  version int,
  created_at timestamptz,
  updated_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    pw.id,
    pw.property_id,
    p.name as property_name,
    pw.generation_status,
    pw.generation_progress,
    pw.brand_source,
    pw.brand_confidence,
    COALESCE(jsonb_array_length(pw.pages_generated), 0) as pages_count,
    COALESCE((
      SELECT COUNT(*)::int 
      FROM website_assets 
      WHERE website_id = pw.id
    ), 0) as assets_count,
    pw.version,
    pw.created_at,
    pw.updated_at
  FROM property_websites pw
  JOIN properties p ON p.id = pw.property_id
  WHERE pw.id = website_uuid;
END;
$$;

-- ============================================================================
-- SAMPLE DATA (Development/Testing Only)
-- ============================================================================
-- Uncomment to insert test data:
/*
-- Example: Create a test website (requires existing property)
INSERT INTO property_websites (
  property_id,
  generation_status,
  generation_progress,
  brand_source,
  brand_confidence,
  site_architecture,
  pages_generated,
  version
) VALUES (
  '00000000-0000-0000-0000-000000000001', -- Replace with real property ID
  'complete',
  100,
  'brandforge',
  0.95,
  '{"navigation": {"structure": "primary", "items": []}, "pages": [], "designDecisions": {}}'::jsonb,
  '[]'::jsonb,
  1
);
*/

-- ============================================================================
-- NOTES FOR DEVELOPERS
-- ============================================================================
--
-- 1. This schema supports the full SiteForge generation pipeline
-- 2. All TypeScript types in siteforge.ts map to these tables
-- 3. The jsonb columns store complex nested objects efficiently
-- 4. RLS policies ensure multi-tenant security
-- 5. Service role policies allow background job processing
-- 6. Indexes optimize common query patterns
--
-- DEPLOYMENT STEPS:
-- 1. Save this as: supabase/migrations/20251215010000_siteforge_schema.sql
-- 2. Run: supabase db push
-- 3. Verify tables: SELECT * FROM property_websites LIMIT 1;
-- 4. Test generation flow
--
-- ============================================================================



