-- =============================================
-- REVIEWFLOW AI - Multi-Source Review Integration
-- Migration: Add support for multiple review sources
-- Date: December 10, 2025
-- =============================================

-- Add connection_type to distinguish between API and scraping methods
ALTER TABLE review_platform_connections
ADD COLUMN IF NOT EXISTS connection_type TEXT DEFAULT 'api'
CHECK (connection_type IN ('api', 'scraper', 'manual'));

-- Add Google Maps URL for scraping method (alternative to Place ID)
ALTER TABLE review_platform_connections
ADD COLUMN IF NOT EXISTS google_maps_url TEXT;

-- Add Yelp business URL for scraping
ALTER TABLE review_platform_connections
ADD COLUMN IF NOT EXISTS yelp_business_url TEXT;

-- Add Yelp business ID (extracted from URL or API)
ALTER TABLE review_platform_connections
ADD COLUMN IF NOT EXISTS yelp_business_id TEXT;

-- Add configuration for scraping preferences
ALTER TABLE review_platform_connections
ADD COLUMN IF NOT EXISTS scraping_config JSONB DEFAULT '{}';

-- Add sync statistics
ALTER TABLE review_platform_connections
ADD COLUMN IF NOT EXISTS total_reviews_synced INTEGER DEFAULT 0;

ALTER TABLE review_platform_connections
ADD COLUMN IF NOT EXISTS last_review_date TIMESTAMPTZ;

-- Add note about API limitations
ALTER TABLE review_platform_connections
ADD COLUMN IF NOT EXISTS limitation_note TEXT;

-- Create index for connection type queries
CREATE INDEX IF NOT EXISTS idx_review_connections_type 
ON review_platform_connections(connection_type);

-- Create index for property + platform + type lookups
CREATE INDEX IF NOT EXISTS idx_review_connections_lookup 
ON review_platform_connections(property_id, platform, connection_type);

-- =============================================
-- UPDATE REVIEWFLOW_CONFIG with new fields
-- =============================================

-- Add preferred sync method per property
ALTER TABLE reviewflow_config
ADD COLUMN IF NOT EXISTS preferred_sync_method TEXT DEFAULT 'api'
CHECK (preferred_sync_method IN ('api', 'scraper', 'both'));

-- Add sync schedule configuration
ALTER TABLE reviewflow_config
ADD COLUMN IF NOT EXISTS sync_schedule TEXT DEFAULT 'daily'
CHECK (sync_schedule IN ('realtime', 'hourly', 'daily', 'weekly', 'manual'));

-- Add auto-analyze toggle
ALTER TABLE reviewflow_config
ADD COLUMN IF NOT EXISTS auto_analyze_reviews BOOLEAN DEFAULT true;

-- Add auto-generate response toggle
ALTER TABLE reviewflow_config
ADD COLUMN IF NOT EXISTS auto_generate_responses BOOLEAN DEFAULT false;

-- Add minimum rating threshold for auto-response
ALTER TABLE reviewflow_config
ADD COLUMN IF NOT EXISTS auto_respond_min_rating INTEGER DEFAULT 4;

-- =============================================
-- COMMENTS for documentation
-- =============================================

COMMENT ON COLUMN review_platform_connections.connection_type IS 
'Method used to fetch reviews: api (official API), scraper (web scraping), manual (user input)';

COMMENT ON COLUMN review_platform_connections.google_maps_url IS 
'Google Maps URL for the business (used for scraping when Place ID not available)';

COMMENT ON COLUMN review_platform_connections.yelp_business_url IS 
'Yelp business page URL';

COMMENT ON COLUMN review_platform_connections.yelp_business_id IS 
'Yelp business ID (e.g., the-domain-at-wills-crossing-austin)';

COMMENT ON COLUMN review_platform_connections.limitation_note IS 
'Note about platform limitations (e.g., Yelp returns only 3 reviews)';

COMMENT ON COLUMN reviewflow_config.preferred_sync_method IS 
'Preferred method for syncing reviews: api, scraper, or both (tries API first, falls back to scraping)';

