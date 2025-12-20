-- ============================================
-- MCP Ads Integration - Quick Setup Test
-- ============================================
-- Run this in Supabase SQL Editor to set up and verify

-- Step 1: View your properties
SELECT 
  id,
  name,
  org_id,
  created_at
FROM properties
ORDER BY created_at DESC;

-- Step 2: Link your properties to ad accounts
-- REPLACE 'Your Property Name' with actual property names from Step 1

-- Example: Link to Google Ads
SELECT link_property_to_google_ads(
  'Your Property Name',  -- Replace with actual property name
  '1630505086'           -- Your Google Ads customer ID (from .env.local)
);

-- Example: Link to Meta Ads
SELECT link_property_to_meta_ads(
  'Your Property Name',  -- Replace with actual property name
  '100422547226422'      -- Your Meta Ads account ID (from .env.local)
);

-- Step 3: Verify connections were created
SELECT 
  p.name AS property_name,
  ac.platform,
  ac.account_id,
  ac.is_active,
  ac.created_at
FROM ad_account_connections ac
JOIN properties p ON p.id = ac.property_id
WHERE ac.is_active = TRUE
ORDER BY p.name, ac.platform;

-- Step 4: Check the helpful view
SELECT * FROM vw_property_marketing_setup;

-- Step 5: After running sync, check the data
SELECT 
  p.name AS property,
  fmp.channel_id,
  fmp.campaign_name,
  fmp.date,
  fmp.spend,
  fmp.clicks,
  fmp.impressions,
  fmp.conversions,
  ROUND((fmp.clicks::numeric / NULLIF(fmp.impressions, 0) * 100), 2) AS ctr,
  ROUND((fmp.spend / NULLIF(fmp.clicks, 0)), 2) AS cpc
FROM fact_marketing_performance fmp
JOIN properties p ON p.id = fmp.property_id
ORDER BY fmp.date DESC, fmp.spend DESC
LIMIT 50;

-- Step 6: Check MCP audit logs (after sync runs)
SELECT 
  platform,
  tool_name,
  operation_type,
  success,
  error_message,
  created_at
FROM mcp_audit_log
ORDER BY created_at DESC
LIMIT 20;

-- ============================================
-- Cleanup / Reset (if needed)
-- ============================================

-- Remove all ad connections (careful!)
-- DELETE FROM ad_account_connections WHERE platform IN ('google_ads', 'meta_ads');

-- Remove all MCP-synced marketing data (careful!)
-- DELETE FROM fact_marketing_performance WHERE raw_source = 'mcp';

-- Remove audit logs (careful!)
-- DELETE FROM mcp_audit_log;

