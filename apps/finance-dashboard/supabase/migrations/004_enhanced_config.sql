-- Enhanced configuration management for AUSA Finance Dashboard
-- Extends the existing config_mappings table with additional business rules

-- Create additional configuration types
CREATE TYPE config_type AS ENUM (
  'system',
  'revenue_stream',
  'account_code', 
  'item_code',
  'contact_id',
  'gst_method',
  'sync_schedule',
  'company_details',
  'deferred_revenue',
  'cogs_mapping',
  'facility_mapping',
  'alert_thresholds',
  'dashboard_settings',
  'export_settings'
);

-- Create table for business rule configurations
CREATE TABLE business_rules (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  rule_name TEXT NOT NULL UNIQUE,
  rule_type TEXT NOT NULL, -- 'revenue_recognition', 'aging_calculation', 'currency_conversion'
  rule_definition JSONB NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  applies_to_revenue_stream revenue_stream,
  effective_date DATE,
  expiry_date DATE,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create table for dashboard preferences per user
CREATE TABLE user_dashboard_preferences (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  preference_key TEXT NOT NULL,
  preference_value JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, preference_key)
);

-- Create table for system alerts and notifications
CREATE TABLE system_alerts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  alert_type TEXT NOT NULL, -- 'overdue_customer', 'cash_low', 'sync_failure', 'variance_high'
  severity TEXT NOT NULL DEFAULT 'info', -- 'info', 'warning', 'error', 'critical'
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  alert_data JSONB DEFAULT '{}',
  is_active BOOLEAN NOT NULL DEFAULT true,
  auto_resolve BOOLEAN NOT NULL DEFAULT false,
  resolved_at TIMESTAMPTZ,
  resolved_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add indexes for new tables
CREATE INDEX idx_business_rules_name ON business_rules(rule_name);
CREATE INDEX idx_business_rules_type ON business_rules(rule_type);
CREATE INDEX idx_business_rules_revenue_stream ON business_rules(applies_to_revenue_stream);
CREATE INDEX idx_business_rules_active ON business_rules(is_active);
CREATE INDEX idx_business_rules_effective ON business_rules(effective_date);

CREATE INDEX idx_user_preferences_user ON user_dashboard_preferences(user_id);
CREATE INDEX idx_user_preferences_key ON user_dashboard_preferences(preference_key);

CREATE INDEX idx_system_alerts_type ON system_alerts(alert_type);
CREATE INDEX idx_system_alerts_severity ON system_alerts(severity);
CREATE INDEX idx_system_alerts_active ON system_alerts(is_active);
CREATE INDEX idx_system_alerts_created ON system_alerts(created_at);

-- Add triggers for timestamp updates
CREATE TRIGGER update_business_rules_updated_at 
  BEFORE UPDATE ON business_rules 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_dashboard_preferences_updated_at 
  BEFORE UPDATE ON user_dashboard_preferences 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_system_alerts_updated_at 
  BEFORE UPDATE ON system_alerts 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Row Level Security
ALTER TABLE business_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_dashboard_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_alerts ENABLE ROW LEVEL SECURITY;

-- RLS policies for business rules
CREATE POLICY "Admins can manage business rules" 
  ON business_rules FOR ALL 
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() 
      AND role IN ('owner', 'finance')
      AND is_active = true
    )
  );

CREATE POLICY "Users can view active business rules" 
  ON business_rules FOR SELECT 
  USING (
    is_active = true 
    AND (
      effective_date IS NULL OR effective_date <= CURRENT_DATE
    )
    AND (
      expiry_date IS NULL OR expiry_date > CURRENT_DATE
    )
    AND EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() 
      AND is_active = true
    )
  );

-- RLS policies for user preferences
CREATE POLICY "Users can manage their own preferences" 
  ON user_dashboard_preferences FOR ALL 
  USING (user_id = auth.uid());

CREATE POLICY "Admins can view all preferences" 
  ON user_dashboard_preferences FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() 
      AND role IN ('owner', 'finance')
      AND is_active = true
    )
  );

-- RLS policies for system alerts
CREATE POLICY "Users can view relevant alerts" 
  ON system_alerts FOR SELECT 
  USING (
    is_active = true 
    AND EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() 
      AND is_active = true
    )
  );

CREATE POLICY "Admins can manage system alerts" 
  ON system_alerts FOR ALL 
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() 
      AND role IN ('owner', 'finance')
      AND is_active = true
    )
  );

-- Insert enhanced default configurations
INSERT INTO config_mappings (key, type, value, description) VALUES
  -- Revenue stream mappings (examples)
  ('4000', 'revenue_stream', '"tours"', 'Tours - AAU Tours revenue account'),
  ('4100', 'revenue_stream', '"dr-dish"', 'Dr Dish machine sales revenue'),
  ('4200', 'revenue_stream', '"marketing"', 'Brand partnership and marketing revenue'),
  
  -- COGS account mappings for Dr Dish
  ('5000', 'cogs_mapping', '"dr-dish"', 'Dr Dish - Cost of machines sold'),
  ('5100', 'cogs_mapping', '"dr-dish"', 'Dr Dish - Freight and delivery costs'),
  
  -- Contact ID mappings for key clients
  ('rebel-sport-contact-id', 'contact_id', '"marketing"', 'Rebel Sport - Primary marketing client'),
  
  -- Alert thresholds
  ('overdue_customer_days', 'alert_thresholds', '45', 'Days past due to flag customer as overdue'),
  ('overdue_supplier_days', 'alert_thresholds', '60', 'Days past due to flag supplier as overdue'),
  ('revenue_variance_percent', 'alert_thresholds', '20', 'Revenue variance % to trigger alert'),
  ('low_cash_threshold', 'alert_thresholds', '50000', 'Cash balance threshold for low cash alert (AUD)'),
  
  -- Dashboard settings
  ('default_date_range', 'dashboard_settings', '"fy_to_date"', 'Default date range for dashboard views'),
  ('refresh_interval_minutes', 'dashboard_settings', '60', 'Dashboard data refresh interval'),
  ('enable_real_time_updates', 'dashboard_settings', 'false', 'Enable real-time dashboard updates'),
  
  -- Export settings
  ('max_export_records', 'export_settings', '50000', 'Maximum records per export operation'),
  ('export_formats', 'export_settings', '["csv", "xlsx"]', 'Allowed export formats'),
  ('include_raw_data', 'export_settings', 'false', 'Include raw Xero data in exports');

-- Insert default business rules
INSERT INTO business_rules (rule_name, rule_type, rule_definition, applies_to_revenue_stream, effective_date) VALUES
  (
    'tours_deferred_revenue', 
    'revenue_recognition',
    '{
      "method": "straight_line",
      "recognition_period_months": 12,
      "start_recognition": "booking_month",
      "description": "Tours revenue recognized over 12 months from booking"
    }',
    'tours',
    '2024-07-01'
  ),
  (
    'dr_dish_inventory_valuation',
    'inventory_valuation', 
    '{
      "method": "fifo",
      "use_xero_tracked": true,
      "fallback_to_average_cost": true,
      "description": "Dr Dish inventory valued using FIFO, falling back to average cost"
    }',
    'dr-dish',
    '2024-07-01'
  ),
  (
    'marketing_revenue_timing',
    'revenue_recognition',
    '{
      "method": "invoice_date",
      "payment_terms_days": 30,
      "description": "Marketing revenue recognized on invoice date with 30-day payment terms"
    }',
    'marketing',
    '2024-07-01'
  ),
  (
    'ar_aging_calculation',
    'aging_calculation',
    '{
      "buckets": [
        {"label": "Current", "min_days": 0, "max_days": 30},
        {"label": "31-60 days", "min_days": 31, "max_days": 60},
        {"label": "61-90 days", "min_days": 61, "max_days": 90},
        {"label": "90+ days", "min_days": 91}
      ],
      "calculation_date": "due_date",
      "description": "Standard AR aging buckets based on due date"
    }',
    null,
    '2024-07-01'
  );

-- Create function to get effective business rule
CREATE OR REPLACE FUNCTION get_effective_business_rule(
  rule_name_param TEXT,
  as_of_date DATE DEFAULT CURRENT_DATE
)
RETURNS JSONB AS $$
DECLARE
  rule_definition JSONB;
BEGIN
  SELECT rule_definition INTO rule_definition
  FROM business_rules
  WHERE rule_name = rule_name_param
    AND is_active = true
    AND (effective_date IS NULL OR effective_date <= as_of_date)
    AND (expiry_date IS NULL OR expiry_date > as_of_date)
  ORDER BY effective_date DESC NULLS LAST
  LIMIT 1;
  
  RETURN COALESCE(rule_definition, '{}'::JSONB);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to apply revenue stream mapping
CREATE OR REPLACE FUNCTION get_revenue_stream_for_account(account_code_param TEXT)
RETURNS TEXT AS $$
DECLARE
  stream TEXT;
BEGIN
  SELECT value::TEXT INTO stream
  FROM config_mappings
  WHERE key = account_code_param
    AND type = 'revenue_stream'
    AND is_active = true;
  
  RETURN COALESCE(stream, 'other');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to get alert threshold
CREATE OR REPLACE FUNCTION get_alert_threshold(threshold_name TEXT)
RETURNS NUMERIC AS $$
DECLARE
  threshold_value NUMERIC;
BEGIN
  SELECT (value::TEXT)::NUMERIC INTO threshold_value
  FROM config_mappings
  WHERE key = threshold_name
    AND type = 'alert_thresholds'
    AND is_active = true;
  
  RETURN COALESCE(threshold_value, 0);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create view for active configuration summary
CREATE VIEW active_configuration_summary AS
SELECT 
  type,
  COUNT(*) as config_count,
  ARRAY_AGG(key ORDER BY key) as config_keys,
  MAX(updated_at) as last_updated
FROM config_mappings
WHERE is_active = true
GROUP BY type
ORDER BY type;

-- Create view for revenue stream configuration
CREATE VIEW revenue_stream_config AS
SELECT 
  cm.key as account_code,
  cm.value::TEXT as revenue_stream,
  cm.description,
  a.name as account_name,
  a.type as account_type,
  cm.updated_at
FROM config_mappings cm
LEFT JOIN stg_accounts a ON cm.key = a.code
WHERE cm.type = 'revenue_stream'
  AND cm.is_active = true
ORDER BY cm.value, cm.key;

-- Create view for COGS mapping configuration
CREATE VIEW cogs_mapping_config AS
SELECT 
  cm.key as account_code,
  cm.value::TEXT as maps_to_revenue_stream,
  cm.description,
  a.name as account_name,
  a.type as account_type,
  cm.updated_at
FROM config_mappings cm
LEFT JOIN stg_accounts a ON cm.key = a.code
WHERE cm.type = 'cogs_mapping'
  AND cm.is_active = true
ORDER BY cm.value, cm.key;

-- Grant permissions for new objects
GRANT ALL ON business_rules TO authenticated;
GRANT ALL ON user_dashboard_preferences TO authenticated;
GRANT ALL ON system_alerts TO authenticated;
GRANT EXECUTE ON FUNCTION get_effective_business_rule(TEXT, DATE) TO authenticated;
GRANT EXECUTE ON FUNCTION get_revenue_stream_for_account(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION get_alert_threshold(TEXT) TO authenticated;

-- Comments for documentation
COMMENT ON TABLE business_rules IS 'Business logic rules for revenue recognition, inventory valuation, etc.';
COMMENT ON TABLE user_dashboard_preferences IS 'User-specific dashboard preferences and settings';
COMMENT ON TABLE system_alerts IS 'System-generated alerts for overdue accounts, variances, etc.';

COMMENT ON COLUMN business_rules.rule_definition IS 'JSON definition of the business rule logic';
COMMENT ON COLUMN business_rules.applies_to_revenue_stream IS 'Revenue stream this rule applies to (null = all streams)';
COMMENT ON COLUMN business_rules.effective_date IS 'Date when rule becomes effective';
COMMENT ON COLUMN business_rules.expiry_date IS 'Date when rule expires (null = no expiry)';

COMMENT ON COLUMN user_dashboard_preferences.preference_key IS 'Preference identifier (e.g., default_date_range, chart_type)';
COMMENT ON COLUMN user_dashboard_preferences.preference_value IS 'JSON preference value';

COMMENT ON COLUMN system_alerts.alert_type IS 'Type of alert (overdue_customer, cash_low, etc.)';
COMMENT ON COLUMN system_alerts.severity IS 'Alert severity level';
COMMENT ON COLUMN system_alerts.auto_resolve IS 'Whether alert auto-resolves when condition clears';

COMMENT ON VIEW revenue_stream_config IS 'Active revenue stream mappings with account details';
COMMENT ON VIEW cogs_mapping_config IS 'Active COGS account mappings for gross margin calculations';
COMMENT ON VIEW active_configuration_summary IS 'Summary of all active configurations by type';

-- Insert additional default configurations for AUSA business
INSERT INTO config_mappings (key, type, value, description) VALUES
  -- Deferred revenue settings for Tours
  ('enable_deferred_revenue', 'deferred_revenue', 'true', 'Enable deferred revenue tracking for Tours'),
  ('deferred_recognition_method', 'deferred_revenue', '"straight_line"', 'Method for recognizing deferred revenue'),
  ('deferred_recognition_months', 'deferred_revenue', '12', 'Months over which to recognize deferred Tours revenue'),
  
  -- Dr Dish specific item mappings (examples)
  ('DRDISH-PRO', 'item_code', '"dr-dish"', 'Dr Dish Pro Basketball Machine'),
  ('DRDISH-HOME', 'item_code', '"dr-dish"', 'Dr Dish Home Basketball Machine'),
  ('DRDISH-PARTS', 'item_code', '"dr-dish"', 'Dr Dish Replacement Parts'),
  
  -- Facility mappings using tracking categories
  ('facility_melbourne', 'facility_mapping', '"Melbourne"', 'Melbourne facility operations'),
  ('facility_sydney', 'facility_mapping', '"Sydney"', 'Sydney facility operations'),
  ('facility_brisbane', 'facility_mapping', '"Brisbane"', 'Brisbane facility operations'),
  
  -- Dashboard display settings
  ('show_gst_breakdown', 'dashboard_settings', 'true', 'Show GST breakdown in financial displays'),
  ('default_currency_format', 'dashboard_settings', '"AUD"', 'Default currency format for displays'),
  ('enable_variance_alerts', 'dashboard_settings', 'true', 'Enable automatic variance alerts'),
  ('dashboard_theme', 'dashboard_settings', '"professional"', 'Dashboard color theme'),
  
  -- Export and reporting settings
  ('export_include_gst', 'export_settings', 'true', 'Include GST amounts in exports'),
  ('export_date_format', 'export_settings', '"DD/MM/YYYY"', 'Date format for exports (Australian)'),
  ('export_number_format', 'export_settings', '"en-AU"', 'Number format locale for exports'),
  
  -- Sync performance settings
  ('sync_batch_size', 'sync_schedule', '100', 'Number of records to process per batch'),
  ('sync_rate_limit_ms', 'sync_schedule', '1000', 'Milliseconds between API calls to respect Xero limits'),
  ('sync_timeout_minutes', 'sync_schedule', '30', 'Maximum time for sync operation'),
  
  -- Australian business specific settings
  ('abn_number', 'company_details', '""', 'Australian Business Number'),
  ('gst_registration', 'company_details', 'true', 'GST registration status'),
  ('financial_year_end', 'company_details', '"30/06"', 'Financial year end date (DD/MM)'),
  
  -- Revenue recognition rules
  ('tours_advance_payment_account', 'deferred_revenue', '"2200"', 'Account code for Tours advance payments'),
  ('tours_revenue_account', 'deferred_revenue', '"4000"', 'Account code for recognized Tours revenue'),
  
  -- Data quality thresholds
  ('max_invoice_amount', 'alert_thresholds', '100000', 'Maximum single invoice amount before alert (AUD)'),
  ('min_payment_amount', 'alert_thresholds', '1', 'Minimum payment amount to process (AUD)'),
  ('variance_check_enabled', 'alert_thresholds', 'true', 'Enable variance checking against prior periods');

-- Insert default business rules for AUSA operations
INSERT INTO business_rules (rule_name, rule_type, rule_definition, applies_to_revenue_stream, effective_date) VALUES
  (
    'tours_seasonal_recognition',
    'revenue_recognition',
    '{
      "peak_months": [9, 10, 11],
      "recognition_pattern": "seasonal",
      "advance_payment_handling": "deferred",
      "tour_delivery_recognition": true,
      "description": "Tours revenue has seasonal pattern with Sep-Nov peak, expenses in Apr-Jul"
    }',
    'tours',
    '2024-07-01'
  ),
  (
    'dr_dish_inventory_rules',
    'inventory_management',
    '{
      "reorder_level_days": 30,
      "lead_time_days": 14,
      "safety_stock_percent": 20,
      "cost_method": "fifo",
      "track_serial_numbers": true,
      "description": "Dr Dish inventory management rules for distribution business"
    }',
    'dr-dish',
    '2024-07-01'
  ),
  (
    'marketing_payment_terms',
    'payment_terms',
    '{
      "standard_terms_days": 30,
      "early_payment_discount": 2,
      "early_payment_days": 10,
      "late_payment_fee": 1.5,
      "description": "Standard payment terms for marketing clients like Rebel Sport"
    }',
    'marketing',
    '2024-07-01'
  );

-- Create function to validate configuration changes
CREATE OR REPLACE FUNCTION validate_config_change()
RETURNS TRIGGER AS $$
BEGIN
  -- Validate revenue stream values
  IF NEW.type = 'revenue_stream' AND NEW.value::TEXT NOT IN ('tours', 'dr-dish', 'marketing', 'other') THEN
    RAISE EXCEPTION 'Invalid revenue stream value: %', NEW.value;
  END IF;
  
  -- Validate GST method
  IF NEW.key = 'gst_method' AND NEW.value::TEXT NOT IN ('accrual', 'cash') THEN
    RAISE EXCEPTION 'Invalid GST method: %', NEW.value;
  END IF;
  
  -- Validate numeric thresholds
  IF NEW.type = 'alert_thresholds' AND (NEW.value::TEXT)::NUMERIC < 0 THEN
    RAISE EXCEPTION 'Alert thresholds must be non-negative: %', NEW.value;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for configuration validation
CREATE TRIGGER validate_config_mappings_change
  BEFORE INSERT OR UPDATE ON config_mappings
  FOR EACH ROW EXECUTE FUNCTION validate_config_change();
