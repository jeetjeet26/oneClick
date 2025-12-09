-- ============================================
-- Migration: Add settings columns
-- Purpose: Store persistent settings for organizations and users
-- ============================================

-- Add settings column to organizations for org-wide settings
ALTER TABLE public.organizations 
ADD COLUMN IF NOT EXISTS settings JSONB DEFAULT '{
  "timezone": "America/Los_Angeles",
  "notifications": {
    "new_leads": true,
    "ai_handoff": true,
    "daily_summary": true,
    "weekly_report": true
  }
}'::jsonb;

-- Add preferences column to profiles for user-specific preferences
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS preferences JSONB DEFAULT '{
  "theme": "light",
  "accent_color": "indigo"
}'::jsonb;

-- Update existing organization with default settings
UPDATE public.organizations 
SET settings = '{
  "timezone": "America/Los_Angeles",
  "notifications": {
    "new_leads": true,
    "ai_handoff": true,
    "daily_summary": true,
    "weekly_report": true
  }
}'::jsonb
WHERE settings IS NULL;

-- Update existing profiles with default preferences
UPDATE public.profiles 
SET preferences = '{
  "theme": "light",
  "accent_color": "indigo"
}'::jsonb
WHERE preferences IS NULL;

-- Add comment
COMMENT ON COLUMN public.organizations.settings IS 'Organization-wide settings stored as JSONB';
COMMENT ON COLUMN public.profiles.preferences IS 'User preferences stored as JSONB';

