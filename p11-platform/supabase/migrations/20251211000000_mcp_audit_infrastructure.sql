-- MCP Audit Log Table
-- Tracks all MCP operations for debugging and compliance

CREATE TABLE IF NOT EXISTS mcp_audit_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    property_id UUID REFERENCES properties(id) ON DELETE SET NULL,
    platform TEXT NOT NULL, -- 'google_ads', 'meta_ads'
    tool_name TEXT NOT NULL, -- 'get_campaign_performance', etc.
    operation_type TEXT NOT NULL DEFAULT 'read', -- 'read' or 'write'
    parameters JSONB, -- Input parameters
    result JSONB, -- API response (may be truncated)
    success BOOLEAN DEFAULT TRUE,
    error_message TEXT,
    execution_time_ms INTEGER,
    user_id UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for common queries
CREATE INDEX idx_mcp_audit_platform ON mcp_audit_log(platform);
CREATE INDEX idx_mcp_audit_property ON mcp_audit_log(property_id);
CREATE INDEX idx_mcp_audit_created ON mcp_audit_log(created_at DESC);
CREATE INDEX idx_mcp_audit_tool ON mcp_audit_log(tool_name);

-- RLS Policies
ALTER TABLE mcp_audit_log ENABLE ROW LEVEL SECURITY;

-- Admins can view all audit logs for their org
CREATE POLICY "Admins view org audit logs" ON mcp_audit_log
FOR SELECT USING (
    EXISTS (
        SELECT 1 FROM profiles p
        JOIN properties prop ON prop.org_id = p.org_id
        WHERE p.id = auth.uid()
        AND p.role IN ('admin', 'manager')
        AND prop.id = mcp_audit_log.property_id
    )
);

-- Service role can insert
CREATE POLICY "Service role can insert audit logs" ON mcp_audit_log
FOR INSERT WITH CHECK (TRUE);

COMMENT ON TABLE mcp_audit_log IS 'Audit log for MCP server operations on ad platforms';

-- Ad Account Connections Table (if not exists)
CREATE TABLE IF NOT EXISTS ad_account_connections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    property_id UUID REFERENCES properties(id) ON DELETE CASCADE,
    google_ads_customer_id TEXT,
    meta_ad_account_id TEXT,
    google_ads_refresh_token TEXT,  -- Property-specific tokens
    meta_access_token TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(property_id, google_ads_customer_id),
    UNIQUE(property_id, meta_ad_account_id)
);

CREATE INDEX IF NOT EXISTS idx_ad_connections_property ON ad_account_connections(property_id);
CREATE INDEX IF NOT EXISTS idx_ad_connections_google ON ad_account_connections(google_ads_customer_id);
CREATE INDEX IF NOT EXISTS idx_ad_connections_meta ON ad_account_connections(meta_ad_account_id);

-- RLS Policy for ad_account_connections
ALTER TABLE ad_account_connections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view org ad connections" ON ad_account_connections
FOR SELECT USING (
    EXISTS (
        SELECT 1 FROM profiles p
        JOIN properties prop ON prop.org_id = p.org_id
        WHERE p.id = auth.uid()
        AND prop.id = ad_account_connections.property_id
    )
);

COMMENT ON TABLE ad_account_connections IS 'Links ad accounts to properties for multi-tenant management';












