-- =============================================
-- FIX SOCIAL CONNECTIONS SCHEMA
-- =============================================
-- Add missing columns that the code expects

-- Add missing columns to social_connections
ALTER TABLE social_connections 
ADD COLUMN IF NOT EXISTS access_token text,
ADD COLUMN IF NOT EXISTS scopes text[],
ADD COLUMN IF NOT EXISTS account_avatar_url text,
ADD COLUMN IF NOT EXISTS raw_profile jsonb DEFAULT '{}';

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_social_connections_property_platform 
  ON social_connections(property_id, platform);

-- Add unique constraint to prevent duplicate connections
CREATE UNIQUE INDEX IF NOT EXISTS idx_social_connections_unique_account 
  ON social_connections(property_id, platform, account_id)
  WHERE account_id IS NOT NULL;

-- Add check constraint for valid platforms
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'check_valid_platform'
  ) THEN
    ALTER TABLE social_connections 
      ADD CONSTRAINT check_valid_platform 
      CHECK (platform IN ('instagram', 'facebook', 'linkedin', 'twitter'));
  END IF;
END $$;

-- Add comments
COMMENT ON COLUMN social_connections.access_token IS 'User-level access token (for platforms that need both user + page tokens)';
COMMENT ON COLUMN social_connections.scopes IS 'Array of granted OAuth scopes';
COMMENT ON COLUMN social_connections.account_avatar_url IS 'Profile picture URL from platform';
COMMENT ON COLUMN social_connections.raw_profile IS 'Full profile data from platform API (JSONB)';
