-- =============================================
-- FORGESTUDIO AI - Content Generation Platform
-- =============================================

-- ForgeStudio Configuration per Property
CREATE TABLE IF NOT EXISTS forgestudio_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id uuid REFERENCES properties(id) ON DELETE CASCADE UNIQUE,
  brand_voice text, -- Brand voice guidelines
  target_audience text, -- Target demographic description
  key_amenities text[], -- Key amenities to highlight
  creativity_level numeric(2,1) DEFAULT 0.7, -- 0.0 = conservative, 1.0 = creative
  default_hashtags text[], -- Default hashtags to include
  nanobanana_default_style text DEFAULT 'natural', -- Default image style
  nanobanana_quality text DEFAULT 'high', -- Image quality setting
  auto_approve boolean DEFAULT false, -- Auto-approve generated content
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Content Templates
CREATE TABLE IF NOT EXISTS content_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id uuid REFERENCES properties(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  content_type text NOT NULL, -- 'social_post', 'ad_copy', 'email', 'video_script'
  platform text[], -- ['instagram', 'facebook', 'linkedin', 'twitter']
  prompt_template text NOT NULL, -- Template with {{variables}}
  variables jsonb, -- [{ "name": "amenity", "type": "select", "options": ["pool", "gym"] }]
  is_default boolean DEFAULT false, -- System default templates
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Content Drafts
CREATE TABLE IF NOT EXISTS content_drafts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id uuid REFERENCES properties(id) ON DELETE CASCADE,
  template_id uuid REFERENCES content_templates(id) ON DELETE SET NULL,
  title text,
  content_type text NOT NULL, -- 'social_post', 'ad_copy', 'email', 'video_script'
  platform text, -- Target platform
  caption text, -- Main content text
  hashtags text[], -- Generated hashtags
  call_to_action text, -- CTA text
  variations text[], -- Alternative versions
  media_type text DEFAULT 'none', -- 'none', 'image', 'video'
  media_urls text[], -- URLs to generated/uploaded media
  thumbnail_url text, -- Video thumbnail
  ai_model text, -- 'gpt-4o-mini', etc.
  generation_prompt text, -- The prompt used
  generation_params jsonb, -- Parameters used for generation
  status text DEFAULT 'draft', -- 'draft', 'pending_approval', 'approved', 'rejected', 'scheduled', 'published'
  approved_by uuid REFERENCES profiles(id),
  approved_at timestamptz,
  rejection_reason text,
  scheduled_for timestamptz, -- When to publish
  published_at timestamptz, -- When actually published
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Content Assets (Generated Images/Videos)
CREATE TABLE IF NOT EXISTS content_assets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id uuid REFERENCES properties(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  asset_type text NOT NULL, -- 'image', 'video'
  file_url text NOT NULL,
  thumbnail_url text,
  file_size bigint, -- bytes
  dimensions jsonb, -- { "width": 1080, "height": 1080 }
  is_ai_generated boolean DEFAULT false,
  generation_provider text, -- 'gemini', 'nano_banana', 'dall-e'
  generation_prompt text,
  generation_params jsonb,
  tags text[],
  created_at timestamptz DEFAULT now()
);

-- Social Media Connections
CREATE TABLE IF NOT EXISTS social_connections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id uuid REFERENCES properties(id) ON DELETE CASCADE,
  platform text NOT NULL, -- 'instagram', 'facebook', 'linkedin', 'twitter'
  account_id text, -- Platform account ID
  account_name text, -- Display name
  account_username text, -- @handle
  page_id text, -- Facebook Page ID
  page_access_token text, -- Encrypted access token
  user_access_token text, -- User token (for refresh)
  token_expires_at timestamptz,
  is_active boolean DEFAULT true,
  last_used_at timestamptz,
  error_count int DEFAULT 0,
  last_error text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Published Posts Tracking
CREATE TABLE IF NOT EXISTS published_posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  content_draft_id uuid REFERENCES content_drafts(id) ON DELETE CASCADE,
  social_connection_id uuid REFERENCES social_connections(id) ON DELETE SET NULL,
  platform_post_id text, -- ID on the platform
  platform_post_url text, -- URL to the post
  status text DEFAULT 'pending', -- 'pending', 'published', 'failed'
  error_message text,
  engagement_metrics jsonb, -- { "likes": 0, "comments": 0, "shares": 0 }
  published_at timestamptz,
  created_at timestamptz DEFAULT now()
);

-- =============================================
-- REVIEWFLOW AI - Review Management Platform
-- =============================================

-- ReviewFlow Configuration per Property
CREATE TABLE IF NOT EXISTS reviewflow_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id uuid REFERENCES properties(id) ON DELETE CASCADE UNIQUE,
  response_tone text DEFAULT 'professional', -- 'professional', 'friendly', 'formal'
  auto_respond_positive boolean DEFAULT false, -- Auto-respond to 5-star reviews
  auto_respond_threshold int DEFAULT 5, -- Rating threshold for auto-respond
  escalation_threshold int DEFAULT 2, -- Rating threshold for escalation
  default_signature text, -- Signature for responses
  response_templates jsonb, -- Custom response snippets
  notification_email text, -- Email for alerts
  notification_slack_webhook text, -- Slack webhook for alerts
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Reviews
CREATE TABLE IF NOT EXISTS reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id uuid REFERENCES properties(id) ON DELETE CASCADE,
  platform text NOT NULL, -- 'google', 'yelp', 'apartments_com', 'facebook'
  platform_review_id text, -- ID on the platform
  reviewer_name text,
  reviewer_avatar_url text,
  rating int, -- 1-5 stars
  review_text text NOT NULL,
  review_date timestamptz,
  sentiment text, -- 'positive', 'neutral', 'negative'
  sentiment_score numeric(3,2), -- -1.0 to 1.0
  topics text[], -- ['maintenance', 'staff', 'amenities', 'noise']
  is_urgent boolean DEFAULT false, -- Flagged for immediate attention
  response_status text DEFAULT 'pending', -- 'pending', 'draft_ready', 'approved', 'posted', 'ignored'
  raw_data jsonb, -- Original API response
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(property_id, platform, platform_review_id)
);

-- Review Responses
CREATE TABLE IF NOT EXISTS review_responses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  review_id uuid REFERENCES reviews(id) ON DELETE CASCADE,
  response_text text NOT NULL,
  response_type text DEFAULT 'ai_generated', -- 'ai_generated', 'manual', 'template'
  ai_model text, -- 'gpt-4o-mini'
  tone text, -- 'professional', 'empathetic', 'apologetic'
  status text DEFAULT 'draft', -- 'draft', 'pending_approval', 'approved', 'posted', 'rejected'
  approved_by uuid REFERENCES profiles(id),
  approved_at timestamptz,
  posted_at timestamptz,
  rejection_reason text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Review Tickets (for issues requiring follow-up)
CREATE TABLE IF NOT EXISTS review_tickets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  review_id uuid REFERENCES reviews(id) ON DELETE CASCADE,
  property_id uuid REFERENCES properties(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  priority text DEFAULT 'medium', -- 'low', 'medium', 'high', 'urgent'
  status text DEFAULT 'open', -- 'open', 'in_progress', 'resolved', 'closed'
  assigned_to uuid REFERENCES profiles(id),
  resolution_notes text,
  resolved_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Review Platform Connections (Google, Yelp API keys)
CREATE TABLE IF NOT EXISTS review_platform_connections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id uuid REFERENCES properties(id) ON DELETE CASCADE,
  platform text NOT NULL, -- 'google', 'yelp', 'apartments_com'
  account_id text, -- Platform business ID
  place_id text, -- Google Place ID
  api_key text, -- Encrypted API key
  access_token text, -- OAuth token
  token_expires_at timestamptz,
  last_sync_at timestamptz,
  sync_frequency text DEFAULT 'hourly', -- 'realtime', 'hourly', 'daily'
  is_active boolean DEFAULT true,
  error_count int DEFAULT 0,
  last_error text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(property_id, platform)
);

-- =============================================
-- INDEXES
-- =============================================

-- ForgeStudio
CREATE INDEX IF NOT EXISTS idx_content_drafts_property ON content_drafts(property_id);
CREATE INDEX IF NOT EXISTS idx_content_drafts_status ON content_drafts(status);
CREATE INDEX IF NOT EXISTS idx_content_drafts_scheduled ON content_drafts(scheduled_for) WHERE scheduled_for IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_content_assets_property ON content_assets(property_id);
CREATE INDEX IF NOT EXISTS idx_social_connections_property ON social_connections(property_id);
CREATE INDEX IF NOT EXISTS idx_published_posts_draft ON published_posts(content_draft_id);

-- ReviewFlow
CREATE INDEX IF NOT EXISTS idx_reviews_property ON reviews(property_id);
CREATE INDEX IF NOT EXISTS idx_reviews_platform ON reviews(platform);
CREATE INDEX IF NOT EXISTS idx_reviews_sentiment ON reviews(sentiment);
CREATE INDEX IF NOT EXISTS idx_reviews_status ON reviews(response_status);
CREATE INDEX IF NOT EXISTS idx_reviews_date ON reviews(review_date DESC);
CREATE INDEX IF NOT EXISTS idx_review_responses_review ON review_responses(review_id);
CREATE INDEX IF NOT EXISTS idx_review_tickets_property ON review_tickets(property_id);
CREATE INDEX IF NOT EXISTS idx_review_tickets_status ON review_tickets(status);

-- =============================================
-- ROW LEVEL SECURITY
-- =============================================

-- Enable RLS
ALTER TABLE forgestudio_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE content_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE content_drafts ENABLE ROW LEVEL SECURITY;
ALTER TABLE content_assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE social_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE published_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE reviewflow_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE review_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE review_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE review_platform_connections ENABLE ROW LEVEL SECURITY;

-- ForgeStudio Policies
CREATE POLICY "Users view their org forgestudio config"
ON forgestudio_config FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM profiles
    JOIN properties ON properties.id = forgestudio_config.property_id
    WHERE profiles.id = auth.uid() AND profiles.org_id = properties.org_id
  )
);

CREATE POLICY "Managers can update forgestudio config"
ON forgestudio_config FOR ALL USING (
  EXISTS (
    SELECT 1 FROM profiles
    JOIN properties ON properties.id = forgestudio_config.property_id
    WHERE profiles.id = auth.uid() 
    AND profiles.org_id = properties.org_id
    AND profiles.role IN ('admin', 'manager')
  )
);

CREATE POLICY "Users view their org content templates"
ON content_templates FOR SELECT USING (
  property_id IS NULL OR EXISTS (
    SELECT 1 FROM profiles
    JOIN properties ON properties.id = content_templates.property_id
    WHERE profiles.id = auth.uid() AND profiles.org_id = properties.org_id
  )
);

CREATE POLICY "Users view their org content drafts"
ON content_drafts FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM profiles
    JOIN properties ON properties.id = content_drafts.property_id
    WHERE profiles.id = auth.uid() AND profiles.org_id = properties.org_id
  )
);

CREATE POLICY "Users manage their org content drafts"
ON content_drafts FOR ALL USING (
  EXISTS (
    SELECT 1 FROM profiles
    JOIN properties ON properties.id = content_drafts.property_id
    WHERE profiles.id = auth.uid() AND profiles.org_id = properties.org_id
  )
);

CREATE POLICY "Users view their org content assets"
ON content_assets FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM profiles
    JOIN properties ON properties.id = content_assets.property_id
    WHERE profiles.id = auth.uid() AND profiles.org_id = properties.org_id
  )
);

CREATE POLICY "Users manage their org content assets"
ON content_assets FOR ALL USING (
  EXISTS (
    SELECT 1 FROM profiles
    JOIN properties ON properties.id = content_assets.property_id
    WHERE profiles.id = auth.uid() AND profiles.org_id = properties.org_id
  )
);

CREATE POLICY "Users view their org social connections"
ON social_connections FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM profiles
    JOIN properties ON properties.id = social_connections.property_id
    WHERE profiles.id = auth.uid() AND profiles.org_id = properties.org_id
  )
);

CREATE POLICY "Managers manage social connections"
ON social_connections FOR ALL USING (
  EXISTS (
    SELECT 1 FROM profiles
    JOIN properties ON properties.id = social_connections.property_id
    WHERE profiles.id = auth.uid() 
    AND profiles.org_id = properties.org_id
    AND profiles.role IN ('admin', 'manager')
  )
);

CREATE POLICY "Users view their org published posts"
ON published_posts FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM profiles
    JOIN content_drafts ON content_drafts.id = published_posts.content_draft_id
    JOIN properties ON properties.id = content_drafts.property_id
    WHERE profiles.id = auth.uid() AND profiles.org_id = properties.org_id
  )
);

-- ReviewFlow Policies
CREATE POLICY "Users view their org reviewflow config"
ON reviewflow_config FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM profiles
    JOIN properties ON properties.id = reviewflow_config.property_id
    WHERE profiles.id = auth.uid() AND profiles.org_id = properties.org_id
  )
);

CREATE POLICY "Managers can update reviewflow config"
ON reviewflow_config FOR ALL USING (
  EXISTS (
    SELECT 1 FROM profiles
    JOIN properties ON properties.id = reviewflow_config.property_id
    WHERE profiles.id = auth.uid() 
    AND profiles.org_id = properties.org_id
    AND profiles.role IN ('admin', 'manager')
  )
);

CREATE POLICY "Users view their org reviews"
ON reviews FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM profiles
    JOIN properties ON properties.id = reviews.property_id
    WHERE profiles.id = auth.uid() AND profiles.org_id = properties.org_id
  )
);

CREATE POLICY "Users manage their org reviews"
ON reviews FOR ALL USING (
  EXISTS (
    SELECT 1 FROM profiles
    JOIN properties ON properties.id = reviews.property_id
    WHERE profiles.id = auth.uid() AND profiles.org_id = properties.org_id
  )
);

CREATE POLICY "Users view their org review responses"
ON review_responses FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM profiles
    JOIN reviews ON reviews.id = review_responses.review_id
    JOIN properties ON properties.id = reviews.property_id
    WHERE profiles.id = auth.uid() AND profiles.org_id = properties.org_id
  )
);

CREATE POLICY "Users manage their org review responses"
ON review_responses FOR ALL USING (
  EXISTS (
    SELECT 1 FROM profiles
    JOIN reviews ON reviews.id = review_responses.review_id
    JOIN properties ON properties.id = reviews.property_id
    WHERE profiles.id = auth.uid() AND profiles.org_id = properties.org_id
  )
);

CREATE POLICY "Users view their org review tickets"
ON review_tickets FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM profiles
    JOIN properties ON properties.id = review_tickets.property_id
    WHERE profiles.id = auth.uid() AND profiles.org_id = properties.org_id
  )
);

CREATE POLICY "Users manage their org review tickets"
ON review_tickets FOR ALL USING (
  EXISTS (
    SELECT 1 FROM profiles
    JOIN properties ON properties.id = review_tickets.property_id
    WHERE profiles.id = auth.uid() AND profiles.org_id = properties.org_id
  )
);

CREATE POLICY "Managers view review platform connections"
ON review_platform_connections FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM profiles
    JOIN properties ON properties.id = review_platform_connections.property_id
    WHERE profiles.id = auth.uid() 
    AND profiles.org_id = properties.org_id
    AND profiles.role IN ('admin', 'manager')
  )
);

CREATE POLICY "Managers manage review platform connections"
ON review_platform_connections FOR ALL USING (
  EXISTS (
    SELECT 1 FROM profiles
    JOIN properties ON properties.id = review_platform_connections.property_id
    WHERE profiles.id = auth.uid() 
    AND profiles.org_id = properties.org_id
    AND profiles.role IN ('admin', 'manager')
  )
);

-- Service role policies for API operations
CREATE POLICY "Service role full access to forgestudio_config" ON forgestudio_config FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service role full access to content_templates" ON content_templates FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service role full access to content_drafts" ON content_drafts FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service role full access to content_assets" ON content_assets FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service role full access to social_connections" ON social_connections FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service role full access to published_posts" ON published_posts FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service role full access to reviewflow_config" ON reviewflow_config FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service role full access to reviews" ON reviews FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service role full access to review_responses" ON review_responses FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service role full access to review_tickets" ON review_tickets FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service role full access to review_platform_connections" ON review_platform_connections FOR ALL USING (auth.role() = 'service_role');

-- =============================================
-- SEED DEFAULT TEMPLATES
-- =============================================

INSERT INTO content_templates (id, property_id, name, description, content_type, platform, prompt_template, variables, is_default, is_active)
VALUES 
  -- Social Post Templates
  (gen_random_uuid(), NULL, 'New Amenity Spotlight', 'Highlight a specific amenity', 'social_post', ARRAY['instagram', 'facebook'], 
   'Create an engaging social media post spotlighting the {{amenity}} at our apartment community. Highlight the benefits for residents and create FOMO for prospects.',
   '[{"name": "amenity", "type": "text", "required": true}]', true, true),
  
  (gen_random_uuid(), NULL, 'Move-In Special', 'Promote a move-in special or discount', 'social_post', ARRAY['instagram', 'facebook', 'twitter'],
   'Create an exciting social post about our move-in special: {{special_details}}. Create urgency and encourage immediate action.',
   '[{"name": "special_details", "type": "text", "required": true}]', true, true),
  
  (gen_random_uuid(), NULL, 'Resident Testimonial', 'Share a resident success story', 'social_post', ARRAY['instagram', 'facebook'],
   'Create a heartwarming post about our resident experience. Theme: {{theme}}. Make it feel authentic and relatable.',
   '[{"name": "theme", "type": "select", "options": ["community", "convenience", "luxury", "pet-friendly"], "required": true}]', true, true),
  
  (gen_random_uuid(), NULL, 'Seasonal Content', 'Seasonal or holiday themed post', 'social_post', ARRAY['instagram', 'facebook'],
   'Create a {{season}} themed social post for our apartment community. Connect the season to apartment living benefits.',
   '[{"name": "season", "type": "select", "options": ["spring", "summer", "fall", "winter", "holiday"], "required": true}]', true, true),
  
  -- Ad Copy Templates
  (gen_random_uuid(), NULL, 'Facebook Lead Ad', 'Lead generation ad for Facebook', 'ad_copy', ARRAY['facebook'],
   'Create compelling Facebook ad copy targeting {{audience}} looking for apartments. Key selling point: {{selling_point}}. Include a strong call-to-action for tour booking.',
   '[{"name": "audience", "type": "text", "required": true}, {"name": "selling_point", "type": "text", "required": true}]', true, true),
  
  (gen_random_uuid(), NULL, 'Google Search Ad', 'PPC ad headlines and descriptions', 'ad_copy', ARRAY['google'],
   'Create Google Search ad copy for apartments in {{location}}. Include 3 headlines (30 chars max each) and 2 descriptions (90 chars max each). Target keywords: {{keywords}}',
   '[{"name": "location", "type": "text", "required": true}, {"name": "keywords", "type": "text", "required": true}]', true, true),
  
  -- Email Templates
  (gen_random_uuid(), NULL, 'Tour Follow-Up', 'Email after property tour', 'email', ARRAY['email'],
   'Create a warm follow-up email for {{prospect_name}} who toured our property. They were interested in {{unit_type}}. Include next steps and create gentle urgency.',
   '[{"name": "prospect_name", "type": "text", "required": true}, {"name": "unit_type", "type": "text", "required": true}]', true, true),
  
  (gen_random_uuid(), NULL, 'Lease Renewal', 'Lease renewal reminder email', 'email', ARRAY['email'],
   'Create a friendly lease renewal email for a resident. Their lease expires in {{days_until_expiry}} days. Highlight community improvements and offer {{incentive}}.',
   '[{"name": "days_until_expiry", "type": "text", "required": true}, {"name": "incentive", "type": "text", "required": false}]', true, true)

ON CONFLICT DO NOTHING;

