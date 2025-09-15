-- Xero OAuth token management for AUSA Finance Dashboard
-- Stores OAuth tokens securely for Xero API integration

-- Create table for storing Xero OAuth tokens
CREATE TABLE xero_oauth_tokens (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id TEXT NOT NULL UNIQUE,
  tenant_name TEXT,
  tenant_type TEXT, -- 'ORGANISATION', 'PRACTICE', etc.
  
  -- OAuth token data
  access_token TEXT NOT NULL,
  refresh_token TEXT NOT NULL,
  id_token TEXT,
  token_type TEXT NOT NULL DEFAULT 'Bearer',
  
  -- Token expiry information
  expires_at TIMESTAMPTZ NOT NULL,
  refresh_expires_at TIMESTAMPTZ,
  
  -- OAuth scopes granted
  scopes TEXT[] DEFAULT '{}',
  
  -- Connection metadata
  connection_id TEXT, -- Xero connection ID if available
  short_code TEXT, -- Xero organisation short code
  
  -- Audit fields
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_used_at TIMESTAMPTZ,
  
  -- Status tracking
  is_active BOOLEAN NOT NULL DEFAULT true,
  error_count INTEGER NOT NULL DEFAULT 0,
  last_error_at TIMESTAMPTZ,
  last_error_message TEXT
);

-- Create indexes for performance
CREATE INDEX idx_xero_oauth_tokens_tenant_id ON xero_oauth_tokens(tenant_id);
CREATE INDEX idx_xero_oauth_tokens_active ON xero_oauth_tokens(is_active);
CREATE INDEX idx_xero_oauth_tokens_expires_at ON xero_oauth_tokens(expires_at);
CREATE INDEX idx_xero_oauth_tokens_created_by ON xero_oauth_tokens(created_by);
CREATE INDEX idx_xero_oauth_tokens_last_used ON xero_oauth_tokens(last_used_at);

-- Add trigger for automatic timestamp updates
CREATE TRIGGER update_xero_oauth_tokens_updated_at 
  BEFORE UPDATE ON xero_oauth_tokens 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Row Level Security
ALTER TABLE xero_oauth_tokens ENABLE ROW LEVEL SECURITY;

-- RLS policies - only admins (owner/finance) can manage OAuth tokens
CREATE POLICY "Admins can manage OAuth tokens" 
  ON xero_oauth_tokens FOR ALL 
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() 
      AND role IN ('owner', 'finance')
      AND is_active = true
    )
  );

-- Create function to safely update token usage
CREATE OR REPLACE FUNCTION update_token_last_used(
  tenant_id_param TEXT
)
RETURNS void AS $$
BEGIN
  UPDATE xero_oauth_tokens 
  SET 
    last_used_at = NOW(),
    error_count = 0,
    last_error_at = NULL,
    last_error_message = NULL
  WHERE tenant_id = tenant_id_param 
    AND is_active = true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to record token errors
CREATE OR REPLACE FUNCTION record_token_error(
  tenant_id_param TEXT,
  error_message_param TEXT
)
RETURNS void AS $$
BEGIN
  UPDATE xero_oauth_tokens 
  SET 
    error_count = error_count + 1,
    last_error_at = NOW(),
    last_error_message = error_message_param,
    -- Deactivate token after 5 consecutive errors
    is_active = CASE 
      WHEN error_count >= 4 THEN false 
      ELSE is_active 
    END
  WHERE tenant_id = tenant_id_param;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to check if token needs refresh
CREATE OR REPLACE FUNCTION check_token_expiry(
  tenant_id_param TEXT
)
RETURNS TABLE(
  needs_refresh BOOLEAN,
  is_expired BOOLEAN,
  expires_in_minutes INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    -- Needs refresh if expires within 10 minutes
    (expires_at - NOW()) < INTERVAL '10 minutes' as needs_refresh,
    -- Is expired if past expiry time
    expires_at < NOW() as is_expired,
    -- Minutes until expiry
    EXTRACT(EPOCH FROM (expires_at - NOW()))::INTEGER / 60 as expires_in_minutes
  FROM xero_oauth_tokens
  WHERE tenant_id = tenant_id_param
    AND is_active = true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create view for token status monitoring
CREATE VIEW xero_token_status AS
SELECT 
  t.tenant_id,
  t.tenant_name,
  t.is_active,
  t.expires_at,
  t.last_used_at,
  t.error_count,
  t.last_error_at,
  t.last_error_message,
  -- Status indicators
  CASE 
    WHEN NOT t.is_active THEN 'inactive'
    WHEN t.expires_at < NOW() THEN 'expired'
    WHEN t.expires_at < NOW() + INTERVAL '1 hour' THEN 'expiring_soon'
    WHEN t.error_count > 0 THEN 'warning'
    ELSE 'healthy'
  END as status,
  -- Time calculations
  EXTRACT(EPOCH FROM (t.expires_at - NOW()))::INTEGER / 60 as expires_in_minutes,
  EXTRACT(EPOCH FROM (NOW() - t.last_used_at))::INTEGER / 60 as minutes_since_last_use,
  -- User context
  p.email as created_by_email,
  p.first_name || ' ' || COALESCE(p.last_name, '') as created_by_name
FROM xero_oauth_tokens t
LEFT JOIN profiles p ON t.created_by = p.id
ORDER BY t.created_at DESC;

-- Grant permissions
GRANT ALL ON xero_oauth_tokens TO authenticated;
GRANT EXECUTE ON FUNCTION update_token_last_used(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION record_token_error(TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION check_token_expiry(TEXT) TO authenticated;

-- Insert initial configuration for OAuth settings
INSERT INTO config_mappings (key, type, value, description) VALUES
  -- OAuth configuration
  ('oauth_redirect_uri', 'oauth_config', '"https://your-domain.com/api/auth/xero/callback"', 'Xero OAuth redirect URI'),
  ('oauth_scopes', 'oauth_config', '["offline_access", "accounting.transactions", "accounting.reports.read", "accounting.settings", "openid", "profile", "email"]', 'Required OAuth scopes for Xero integration'),
  ('oauth_auto_refresh', 'oauth_config', 'true', 'Automatically refresh tokens before expiry'),
  ('oauth_refresh_buffer_minutes', 'oauth_config', '10', 'Minutes before expiry to refresh token'),
  
  -- Connection settings
  ('max_token_errors', 'oauth_config', '5', 'Maximum consecutive errors before deactivating token'),
  ('token_cleanup_days', 'oauth_config', '90', 'Days to keep inactive tokens before cleanup');

-- Comments for documentation
COMMENT ON TABLE xero_oauth_tokens IS 'Secure storage for Xero OAuth tokens with automatic refresh management';
COMMENT ON COLUMN xero_oauth_tokens.tenant_id IS 'Xero tenant (organisation) ID - unique identifier';
COMMENT ON COLUMN xero_oauth_tokens.access_token IS 'OAuth access token for API calls (encrypted at rest)';
COMMENT ON COLUMN xero_oauth_tokens.refresh_token IS 'OAuth refresh token for token renewal';
COMMENT ON COLUMN xero_oauth_tokens.expires_at IS 'When the access token expires (typically 30 minutes)';
COMMENT ON COLUMN xero_oauth_tokens.scopes IS 'Array of OAuth scopes granted by user';
COMMENT ON COLUMN xero_oauth_tokens.error_count IS 'Consecutive API errors - token deactivated after threshold';

COMMENT ON FUNCTION update_token_last_used(TEXT) IS 'Updates token usage timestamp and clears error state';
COMMENT ON FUNCTION record_token_error(TEXT, TEXT) IS 'Records token errors and deactivates after threshold';
COMMENT ON FUNCTION check_token_expiry(TEXT) IS 'Checks if token needs refresh or has expired';

COMMENT ON VIEW xero_token_status IS 'Real-time view of OAuth token health and status';
