-- Community Onboarding Enhancement: Phase 1
-- Creates tables for community profiles, contacts, integrations, onboarding tasks, and knowledge sources

-- ============================================================================
-- 1. COMMUNITY PROFILES - Extended property data
-- ============================================================================
CREATE TABLE IF NOT EXISTS community_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id uuid REFERENCES properties(id) ON DELETE CASCADE UNIQUE,
  legal_name text,
  community_type text CHECK (community_type IN ('multifamily', 'senior', 'student', 'mixed_use', 'affordable', 'luxury')),
  website_url text,
  unit_count int,
  year_built int,
  amenities text[] DEFAULT '{}',
  pet_policy jsonb DEFAULT '{}',
  parking_info jsonb DEFAULT '{}',
  special_features text[] DEFAULT '{}',
  brand_voice text,
  target_audience text,
  office_hours jsonb DEFAULT '{}',
  social_media jsonb DEFAULT '{}',
  intake_completed_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_community_profiles_property ON community_profiles(property_id);

-- ============================================================================
-- 2. COMMUNITY CONTACTS - Multiple contacts per property
-- ============================================================================
CREATE TABLE IF NOT EXISTS community_contacts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id uuid REFERENCES properties(id) ON DELETE CASCADE,
  contact_type text NOT NULL CHECK (contact_type IN ('primary', 'secondary', 'billing', 'emergency')),
  name text NOT NULL,
  email text NOT NULL,
  phone text,
  role text, -- 'Property Manager', 'Regional', 'Owner', 'Maintenance', etc.
  billing_address jsonb, -- for billing contact: {street, city, state, zip}
  billing_method text CHECK (billing_method IN ('ops_merchant', 'nexus', 'ach', 'check', 'credit_card', 'other')),
  special_instructions text,
  needs_w9 boolean DEFAULT false,
  is_primary boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Indexes for contacts
CREATE INDEX IF NOT EXISTS idx_community_contacts_property ON community_contacts(property_id);
CREATE INDEX IF NOT EXISTS idx_community_contacts_type ON community_contacts(contact_type);

-- ============================================================================
-- 3. INTEGRATION CREDENTIALS - Platform access tracking
-- ============================================================================
CREATE TABLE IF NOT EXISTS integration_credentials (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id uuid REFERENCES properties(id) ON DELETE CASCADE,
  platform text NOT NULL CHECK (platform IN (
    'google_analytics', 
    'google_search_console', 
    'google_tag_manager', 
    'google_ads', 
    'google_business_profile',
    'meta_ads', 
    'linkedin_ads', 
    'tiktok_ads',
    'email_marketing',
    'crm',
    'pms'
  )),
  account_id text, -- External account identifier
  account_name text, -- Human-readable account name
  access_type text CHECK (access_type IN ('admin', 'partner', 'api_key', 'oauth', 'readonly')),
  credentials jsonb DEFAULT '{}', -- Encrypted storage for tokens/keys
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'requested', 'connected', 'verified', 'expired', 'error')),
  verification_method text,
  verified_at timestamptz,
  last_sync_at timestamptz,
  last_error text,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(property_id, platform)
);

-- Index for integrations
CREATE INDEX IF NOT EXISTS idx_integration_credentials_property ON integration_credentials(property_id);
CREATE INDEX IF NOT EXISTS idx_integration_credentials_status ON integration_credentials(status);

-- ============================================================================
-- 4. ONBOARDING TASKS - Checklist tracking
-- ============================================================================
CREATE TABLE IF NOT EXISTS onboarding_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id uuid REFERENCES properties(id) ON DELETE CASCADE,
  task_type text NOT NULL, -- 'intake_form', 'doc_upload', 'ga4_access', 'payment_setup', etc.
  task_name text NOT NULL,
  description text,
  category text DEFAULT 'general' CHECK (category IN ('setup', 'documents', 'integrations', 'billing', 'training', 'general')),
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'blocked', 'skipped')),
  priority int DEFAULT 0, -- Higher = more important
  assigned_to uuid REFERENCES profiles(id),
  due_date timestamptz,
  completed_at timestamptz,
  completed_by uuid REFERENCES profiles(id),
  blocked_reason text,
  notes text,
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Indexes for tasks
CREATE INDEX IF NOT EXISTS idx_onboarding_tasks_property ON onboarding_tasks(property_id);
CREATE INDEX IF NOT EXISTS idx_onboarding_tasks_status ON onboarding_tasks(status);
CREATE INDEX IF NOT EXISTS idx_onboarding_tasks_type ON onboarding_tasks(task_type);

-- ============================================================================
-- 5. KNOWLEDGE SOURCES - Track where knowledge came from
-- ============================================================================
CREATE TABLE IF NOT EXISTS knowledge_sources (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id uuid REFERENCES properties(id) ON DELETE CASCADE,
  source_type text NOT NULL CHECK (source_type IN ('intake_form', 'document', 'website', 'integration', 'manual')),
  source_name text NOT NULL,
  source_url text,
  file_name text,
  file_type text,
  file_size int,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  documents_created int DEFAULT 0, -- Number of chunks added to vector DB
  extracted_data jsonb DEFAULT '{}', -- Structured data extracted
  processing_notes text,
  last_synced_at timestamptz,
  error_message text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Indexes for knowledge sources
CREATE INDEX IF NOT EXISTS idx_knowledge_sources_property ON knowledge_sources(property_id);
CREATE INDEX IF NOT EXISTS idx_knowledge_sources_type ON knowledge_sources(source_type);
CREATE INDEX IF NOT EXISTS idx_knowledge_sources_status ON knowledge_sources(status);

-- ============================================================================
-- 6. ROW LEVEL SECURITY POLICIES
-- ============================================================================

-- Enable RLS on all new tables
ALTER TABLE community_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE community_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE integration_credentials ENABLE ROW LEVEL SECURITY;
ALTER TABLE onboarding_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE knowledge_sources ENABLE ROW LEVEL SECURITY;

-- Community Profiles: Users can view/edit their org's profiles
CREATE POLICY "Users can view their org community profiles" ON community_profiles
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM profiles p
    JOIN properties prop ON prop.org_id = p.org_id
    WHERE p.id = auth.uid()
    AND prop.id = community_profiles.property_id
  )
);

CREATE POLICY "Admins can manage community profiles" ON community_profiles
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM profiles p
    JOIN properties prop ON prop.org_id = p.org_id
    WHERE p.id = auth.uid()
    AND p.role IN ('admin', 'manager')
    AND prop.id = community_profiles.property_id
  )
);

-- Community Contacts: Users can view/edit their org's contacts
CREATE POLICY "Users can view their org community contacts" ON community_contacts
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM profiles p
    JOIN properties prop ON prop.org_id = p.org_id
    WHERE p.id = auth.uid()
    AND prop.id = community_contacts.property_id
  )
);

CREATE POLICY "Admins can manage community contacts" ON community_contacts
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM profiles p
    JOIN properties prop ON prop.org_id = p.org_id
    WHERE p.id = auth.uid()
    AND p.role IN ('admin', 'manager')
    AND prop.id = community_contacts.property_id
  )
);

-- Integration Credentials: Only admins can view/manage
CREATE POLICY "Admins can view integration credentials" ON integration_credentials
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM profiles p
    JOIN properties prop ON prop.org_id = p.org_id
    WHERE p.id = auth.uid()
    AND p.role IN ('admin', 'manager')
    AND prop.id = integration_credentials.property_id
  )
);

CREATE POLICY "Admins can manage integration credentials" ON integration_credentials
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM profiles p
    JOIN properties prop ON prop.org_id = p.org_id
    WHERE p.id = auth.uid()
    AND p.role = 'admin'
    AND prop.id = integration_credentials.property_id
  )
);

-- Onboarding Tasks: Users can view, admins can manage
CREATE POLICY "Users can view onboarding tasks" ON onboarding_tasks
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM profiles p
    JOIN properties prop ON prop.org_id = p.org_id
    WHERE p.id = auth.uid()
    AND prop.id = onboarding_tasks.property_id
  )
);

CREATE POLICY "Admins can manage onboarding tasks" ON onboarding_tasks
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM profiles p
    JOIN properties prop ON prop.org_id = p.org_id
    WHERE p.id = auth.uid()
    AND p.role IN ('admin', 'manager')
    AND prop.id = onboarding_tasks.property_id
  )
);

-- Knowledge Sources: Users can view/manage their org's knowledge
CREATE POLICY "Users can view knowledge sources" ON knowledge_sources
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM profiles p
    JOIN properties prop ON prop.org_id = p.org_id
    WHERE p.id = auth.uid()
    AND prop.id = knowledge_sources.property_id
  )
);

CREATE POLICY "Admins can manage knowledge sources" ON knowledge_sources
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM profiles p
    JOIN properties prop ON prop.org_id = p.org_id
    WHERE p.id = auth.uid()
    AND p.role IN ('admin', 'manager')
    AND prop.id = knowledge_sources.property_id
  )
);

-- ============================================================================
-- 7. HELPER FUNCTIONS
-- ============================================================================

-- Function to calculate onboarding progress
CREATE OR REPLACE FUNCTION get_onboarding_progress(p_property_id uuid)
RETURNS TABLE (
  total_tasks int,
  completed_tasks int,
  progress_percentage int
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(*)::int as total_tasks,
    COUNT(*) FILTER (WHERE status = 'completed')::int as completed_tasks,
    CASE 
      WHEN COUNT(*) = 0 THEN 0
      ELSE (COUNT(*) FILTER (WHERE status = 'completed') * 100 / COUNT(*))::int
    END as progress_percentage
  FROM onboarding_tasks
  WHERE property_id = p_property_id;
END;
$$;

-- Function to initialize default onboarding tasks for a new property
CREATE OR REPLACE FUNCTION create_default_onboarding_tasks(p_property_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO onboarding_tasks (property_id, task_type, task_name, description, category, priority) VALUES
    (p_property_id, 'intake_form', 'Complete community details', 'Fill in community type, unit count, and other basic information', 'setup', 100),
    (p_property_id, 'intake_form', 'Add contact information', 'Add primary and billing contacts', 'setup', 95),
    (p_property_id, 'doc_upload', 'Upload property brochure', 'PDF with floor plans, amenities, and pricing', 'documents', 90),
    (p_property_id, 'doc_upload', 'Upload pet policy', 'Document detailing pet rules and fees', 'documents', 80),
    (p_property_id, 'doc_upload', 'Upload community guidelines', 'Resident handbook or community rules', 'documents', 70),
    (p_property_id, 'ga4_access', 'Connect Google Analytics', 'Grant admin access to GA4 property', 'integrations', 85),
    (p_property_id, 'google_ads_access', 'Connect Google Ads', 'Grant admin access to Google Ads account', 'integrations', 84),
    (p_property_id, 'meta_access', 'Connect Meta Ads', 'Grant partner access to Meta Business Manager', 'integrations', 83),
    (p_property_id, 'payment_setup', 'Set up billing', 'Configure payment method and billing contact', 'billing', 75);
END;
$$;

-- Trigger to update updated_at timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply triggers to new tables
DROP TRIGGER IF EXISTS update_community_profiles_updated_at ON community_profiles;
CREATE TRIGGER update_community_profiles_updated_at
  BEFORE UPDATE ON community_profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_community_contacts_updated_at ON community_contacts;
CREATE TRIGGER update_community_contacts_updated_at
  BEFORE UPDATE ON community_contacts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_integration_credentials_updated_at ON integration_credentials;
CREATE TRIGGER update_integration_credentials_updated_at
  BEFORE UPDATE ON integration_credentials
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_onboarding_tasks_updated_at ON onboarding_tasks;
CREATE TRIGGER update_onboarding_tasks_updated_at
  BEFORE UPDATE ON onboarding_tasks
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_knowledge_sources_updated_at ON knowledge_sources;
CREATE TRIGGER update_knowledge_sources_updated_at
  BEFORE UPDATE ON knowledge_sources
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

