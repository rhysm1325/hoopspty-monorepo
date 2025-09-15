-- Initial database schema for AUSA Finance Dashboard
-- Creates user profiles, roles, and audit logging tables

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Create enum for user roles
CREATE TYPE user_role AS ENUM (
  'owner',
  'finance', 
  'operations',
  'sales',
  'marketing'
);

-- Create enum for audit actions
CREATE TYPE audit_action AS ENUM (
  'user_login',
  'user_logout',
  'user_invited',
  'user_activated',
  'user_deactivated',
  'role_changed',
  'settings_updated',
  'sync_initiated',
  'data_exported',
  'config_changed'
);

-- Create profiles table (extends auth.users)
CREATE TABLE profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  first_name TEXT,
  last_name TEXT,
  role user_role NOT NULL DEFAULT 'operations',
  is_active BOOLEAN NOT NULL DEFAULT true,
  last_login_at TIMESTAMPTZ,
  invited_by UUID REFERENCES auth.users(id),
  invited_at TIMESTAMPTZ,
  email_verified BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create audit logs table
CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  action audit_action NOT NULL,
  details JSONB DEFAULT '{}',
  ip_address INET,
  user_agent TEXT,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create configuration mappings table
CREATE TABLE config_mappings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  key TEXT NOT NULL,
  type TEXT NOT NULL, -- 'revenue_stream', 'account_code', 'item_code', 'contact_id', 'gst_method'
  value JSONB NOT NULL,
  description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(key, type)
);

-- Create sync checkpoints table for incremental Xero sync
CREATE TABLE sync_checkpoints (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  entity_type TEXT NOT NULL UNIQUE, -- 'accounts', 'contacts', 'invoices', etc.
  last_updated_utc TIMESTAMPTZ NOT NULL,
  records_processed INTEGER NOT NULL DEFAULT 0,
  has_more_records BOOLEAN NOT NULL DEFAULT false,
  sync_status TEXT NOT NULL DEFAULT 'idle', -- 'idle', 'running', 'completed', 'error'
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX idx_profiles_email ON profiles(email);
CREATE INDEX idx_profiles_role ON profiles(role);
CREATE INDEX idx_profiles_active ON profiles(is_active);
CREATE INDEX idx_profiles_last_login ON profiles(last_login_at);

CREATE INDEX idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_action ON audit_logs(action);
CREATE INDEX idx_audit_logs_timestamp ON audit_logs(timestamp);
CREATE INDEX idx_audit_logs_ip_address ON audit_logs(ip_address);

CREATE INDEX idx_config_mappings_key_type ON config_mappings(key, type);
CREATE INDEX idx_config_mappings_type ON config_mappings(type);
CREATE INDEX idx_config_mappings_active ON config_mappings(is_active);

CREATE INDEX idx_sync_checkpoints_entity_type ON sync_checkpoints(entity_type);
CREATE INDEX idx_sync_checkpoints_status ON sync_checkpoints(sync_status);
CREATE INDEX idx_sync_checkpoints_updated ON sync_checkpoints(updated_at);

-- Create function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for automatic timestamp updates
CREATE TRIGGER update_profiles_updated_at 
  BEFORE UPDATE ON profiles 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_config_mappings_updated_at 
  BEFORE UPDATE ON config_mappings 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_sync_checkpoints_updated_at 
  BEFORE UPDATE ON sync_checkpoints 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Create function to handle new user registration
CREATE OR REPLACE FUNCTION handle_new_user() 
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, email, email_verified)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.email_confirmed_at IS NOT NULL
  );
  RETURN NEW;
END;
$$ language 'plpgsql' SECURITY DEFINER;

-- Create trigger to automatically create profile for new users
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Row Level Security (RLS) Policies

-- Enable RLS on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE config_mappings ENABLE ROW LEVEL SECURITY;
ALTER TABLE sync_checkpoints ENABLE ROW LEVEL SECURITY;

-- Profiles table policies
CREATE POLICY "Users can view their own profile" 
  ON profiles FOR SELECT 
  USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile" 
  ON profiles FOR UPDATE 
  USING (auth.uid() = id);

CREATE POLICY "Admins can view all profiles" 
  ON profiles FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() 
      AND role IN ('owner', 'finance')
      AND is_active = true
    )
  );

CREATE POLICY "Admins can update user profiles" 
  ON profiles FOR UPDATE 
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() 
      AND role IN ('owner', 'finance')
      AND is_active = true
    )
  );

CREATE POLICY "Admins can insert profiles" 
  ON profiles FOR INSERT 
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() 
      AND role IN ('owner', 'finance')
      AND is_active = true
    )
  );

-- Audit logs policies
CREATE POLICY "Admins can view audit logs" 
  ON audit_logs FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() 
      AND role IN ('owner', 'finance')
      AND is_active = true
    )
  );

CREATE POLICY "System can insert audit logs" 
  ON audit_logs FOR INSERT 
  WITH CHECK (true); -- Allow system to insert audit logs

-- Config mappings policies
CREATE POLICY "Admins can manage config mappings" 
  ON config_mappings FOR ALL 
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() 
      AND role IN ('owner', 'finance')
      AND is_active = true
    )
  );

CREATE POLICY "Users can view active config mappings" 
  ON config_mappings FOR SELECT 
  USING (
    is_active = true 
    AND EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() 
      AND is_active = true
    )
  );

-- Sync checkpoints policies
CREATE POLICY "Admins can manage sync checkpoints" 
  ON sync_checkpoints FOR ALL 
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() 
      AND role IN ('owner', 'finance')
      AND is_active = true
    )
  );

CREATE POLICY "Users can view sync status" 
  ON sync_checkpoints FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() 
      AND is_active = true
    )
  );

-- Insert default configuration mappings
INSERT INTO config_mappings (key, type, value, description, created_by) VALUES
  ('financial_year_start', 'system', '{"month": 7, "day": 1}', 'Australian Financial Year start date (July 1)', NULL),
  ('default_currency', 'system', '"AUD"', 'Default currency for financial reporting', NULL),
  ('default_timezone', 'system', '"Australia/Sydney"', 'Default timezone for date calculations', NULL),
  ('gst_method', 'system', '"accrual"', 'GST reporting method (accrual or cash)', NULL),
  ('sync_schedule', 'system', '{"hour": 3, "minute": 30, "timezone": "Australia/Sydney"}', 'Daily sync schedule', NULL),
  ('company_details', 'system', '{"name": "AUSA Hoops Pty Ltd", "abn": "", "address": ""}', 'Company information', NULL);

-- Insert initial sync checkpoints for Xero entities
INSERT INTO sync_checkpoints (entity_type, last_updated_utc, records_processed) VALUES
  ('accounts', '1970-01-01T00:00:00Z', 0),
  ('contacts', '1970-01-01T00:00:00Z', 0),
  ('invoices', '1970-01-01T00:00:00Z', 0),
  ('bills', '1970-01-01T00:00:00Z', 0),
  ('payments', '1970-01-01T00:00:00Z', 0),
  ('credit_notes', '1970-01-01T00:00:00Z', 0),
  ('manual_journals', '1970-01-01T00:00:00Z', 0),
  ('items', '1970-01-01T00:00:00Z', 0),
  ('bank_accounts', '1970-01-01T00:00:00Z', 0),
  ('bank_transactions', '1970-01-01T00:00:00Z', 0),
  ('tracking_categories', '1970-01-01T00:00:00Z', 0);

-- Create views for common queries
CREATE VIEW user_profiles_with_stats AS
SELECT 
  p.*,
  COALESCE(login_stats.login_count, 0) as total_logins,
  login_stats.last_login_from_logs
FROM profiles p
LEFT JOIN (
  SELECT 
    user_id,
    COUNT(*) as login_count,
    MAX(timestamp) as last_login_from_logs
  FROM audit_logs 
  WHERE action = 'user_login'
  GROUP BY user_id
) login_stats ON p.id = login_stats.user_id;

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;

-- Comments for documentation
COMMENT ON TABLE profiles IS 'User profiles extending Supabase auth.users with role-based access control';
COMMENT ON TABLE audit_logs IS 'Security audit log for all user actions and system events';
COMMENT ON TABLE config_mappings IS 'System configuration and business rule mappings';
COMMENT ON TABLE sync_checkpoints IS 'Xero synchronization state tracking for incremental updates';

COMMENT ON COLUMN profiles.role IS 'User role determining dashboard access and permissions';
COMMENT ON COLUMN profiles.is_active IS 'Account status - inactive users cannot access the system';
COMMENT ON COLUMN profiles.invited_by IS 'User who sent the invitation (for audit trail)';

COMMENT ON COLUMN audit_logs.action IS 'Type of action performed (login, config change, etc.)';
COMMENT ON COLUMN audit_logs.details IS 'JSON details specific to the action type';
COMMENT ON COLUMN audit_logs.ip_address IS 'Source IP address for security monitoring';

COMMENT ON COLUMN config_mappings.type IS 'Configuration category (revenue_stream, account_code, etc.)';
COMMENT ON COLUMN config_mappings.value IS 'JSON configuration value';

COMMENT ON COLUMN sync_checkpoints.entity_type IS 'Xero entity type being synchronized';
COMMENT ON COLUMN sync_checkpoints.last_updated_utc IS 'Last UpdatedDateUTC from Xero for incremental sync';
COMMENT ON COLUMN sync_checkpoints.sync_status IS 'Current synchronization status';
