-- Configuration Management Tables and Functions
-- This migration creates tables and functions to support revenue stream mapping,
-- account categorization, and business rule configuration.

-- Revenue Stream Mappings Table
CREATE TABLE IF NOT EXISTS revenue_stream_mappings (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  revenue_stream text NOT NULL CHECK (revenue_stream IN ('tours', 'dr_dish', 'marketing', 'other')),
  account_codes text[] DEFAULT '{}',
  item_codes text[] DEFAULT '{}',
  description text NOT NULL,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES auth.users(id)
);

-- Account Mappings Table
CREATE TABLE IF NOT EXISTS account_mappings (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  account_code text NOT NULL,
  account_name text NOT NULL,
  account_type text NOT NULL,
  revenue_stream text NOT NULL CHECK (revenue_stream IN ('tours', 'dr_dish', 'marketing', 'other')),
  is_cogs_account boolean DEFAULT false,
  is_revenue_account boolean DEFAULT false,
  is_expense_account boolean DEFAULT false,
  mapping_priority integer DEFAULT 1,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES auth.users(id),
  UNIQUE(account_code)
);

-- Item Mappings Table
CREATE TABLE IF NOT EXISTS item_mappings (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  item_code text NOT NULL,
  item_name text NOT NULL,
  product_category text NOT NULL,
  revenue_stream text NOT NULL CHECK (revenue_stream IN ('tours', 'dr_dish', 'marketing', 'other')),
  is_tracked_inventory boolean DEFAULT false,
  cost_method text DEFAULT 'FIFO' CHECK (cost_method IN ('FIFO', 'LIFO', 'AVERAGE', 'SPECIFIC')),
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES auth.users(id),
  UNIQUE(item_code)
);

-- GST Configuration Table
CREATE TABLE IF NOT EXISTS gst_configuration (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  gst_method text NOT NULL CHECK (gst_method IN ('ACCRUAL', 'CASH')),
  gst_rate numeric(5,4) DEFAULT 0.1000,
  gst_account_code text NOT NULL,
  bas_reporting_frequency text DEFAULT 'QUARTERLY' CHECK (bas_reporting_frequency IN ('MONTHLY', 'QUARTERLY')),
  effective_from timestamptz NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES auth.users(id)
);

-- Deferred Revenue Rules Table
CREATE TABLE IF NOT EXISTS deferred_revenue_rules (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  revenue_stream text NOT NULL CHECK (revenue_stream IN ('tours', 'dr_dish', 'marketing', 'other')),
  recognition_method text NOT NULL CHECK (recognition_method IN ('IMMEDIATE', 'MONTHLY_STRAIGHT_LINE', 'PERFORMANCE_BASED', 'MILESTONE_BASED')),
  recognition_period_months integer,
  milestone_criteria text[],
  deferred_revenue_account_code text NOT NULL,
  revenue_account_code text NOT NULL,
  is_active boolean DEFAULT true,
  effective_from timestamptz NOT NULL,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES auth.users(id)
);

-- Add revenue stream columns to staging tables
ALTER TABLE stg_invoices 
ADD COLUMN IF NOT EXISTS revenue_stream text,
ADD COLUMN IF NOT EXISTS revenue_stream_confidence text CHECK (revenue_stream_confidence IN ('HIGH', 'MEDIUM', 'LOW'));

ALTER TABLE stg_items
ADD COLUMN IF NOT EXISTS revenue_stream text,
ADD COLUMN IF NOT EXISTS product_category text;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_revenue_stream_mappings_stream ON revenue_stream_mappings (revenue_stream);
CREATE INDEX IF NOT EXISTS idx_account_mappings_code ON account_mappings (account_code);
CREATE INDEX IF NOT EXISTS idx_account_mappings_stream ON account_mappings (revenue_stream);
CREATE INDEX IF NOT EXISTS idx_item_mappings_code ON item_mappings (item_code);
CREATE INDEX IF NOT EXISTS idx_item_mappings_stream ON item_mappings (revenue_stream);
CREATE INDEX IF NOT EXISTS idx_gst_configuration_effective ON gst_configuration (effective_from DESC);
CREATE INDEX IF NOT EXISTS idx_deferred_revenue_rules_stream ON deferred_revenue_rules (revenue_stream);
CREATE INDEX IF NOT EXISTS idx_stg_invoices_revenue_stream ON stg_invoices (revenue_stream);

-- Function to get unmapped accounts count
CREATE OR REPLACE FUNCTION get_unmapped_accounts_count()
RETURNS integer AS $$
BEGIN
  RETURN (
    SELECT COUNT(*)::integer
    FROM stg_accounts sa
    WHERE NOT EXISTS (
      SELECT 1 FROM account_mappings am 
      WHERE am.account_code = sa.account_code
    )
    AND sa.account_type IN ('REVENUE', 'SALES', 'OTHERINCOME', 'DIRECTCOSTS', 'EXPENSE')
  );
END;
$$ LANGUAGE plpgsql;

-- Function to get unmapped items count
CREATE OR REPLACE FUNCTION get_unmapped_items_count()
RETURNS integer AS $$
BEGIN
  RETURN (
    SELECT COUNT(*)::integer
    FROM stg_items si
    WHERE NOT EXISTS (
      SELECT 1 FROM item_mappings im 
      WHERE im.item_code = si.item_code
    )
    AND si.is_sold = true
  );
END;
$$ LANGUAGE plpgsql;

-- Function to apply revenue stream tagging based on mappings
CREATE OR REPLACE FUNCTION apply_revenue_stream_tagging()
RETURNS TABLE (
  processed_count integer,
  tagged_count integer,
  error_count integer
) AS $$
DECLARE
  processed integer := 0;
  tagged integer := 0;
  errors integer := 0;
  invoice_record record;
  line_item jsonb;
  revenue_streams text[] := '{}';
  primary_stream text := 'other';
BEGIN
  -- Process all invoices without revenue stream tags
  FOR invoice_record IN 
    SELECT xero_invoice_id, line_items 
    FROM stg_invoices 
    WHERE revenue_stream IS NULL
  LOOP
    processed := processed + 1;
    revenue_streams := '{}';
    
    -- Analyze line items
    FOR line_item IN SELECT * FROM jsonb_array_elements(invoice_record.line_items)
    LOOP
      -- Check account mapping
      IF line_item->>'accountCode' IS NOT NULL THEN
        SELECT revenue_stream INTO primary_stream
        FROM account_mappings 
        WHERE account_code = line_item->>'accountCode'
        LIMIT 1;
        
        IF primary_stream IS NOT NULL THEN
          revenue_streams := array_append(revenue_streams, primary_stream);
        END IF;
      END IF;
      
      -- Check item mapping
      IF line_item->>'itemCode' IS NOT NULL THEN
        SELECT revenue_stream INTO primary_stream
        FROM item_mappings 
        WHERE item_code = line_item->>'itemCode'
        LIMIT 1;
        
        IF primary_stream IS NOT NULL THEN
          revenue_streams := array_append(revenue_streams, primary_stream);
        END IF;
      END IF;
    END LOOP;
    
    -- Determine primary revenue stream
    primary_stream := 'other';
    IF array_length(revenue_streams, 1) > 0 THEN
      -- Priority: tours > dr_dish > marketing > other
      IF 'tours' = ANY(revenue_streams) THEN
        primary_stream := 'tours';
      ELSIF 'dr_dish' = ANY(revenue_streams) THEN
        primary_stream := 'dr_dish';
      ELSIF 'marketing' = ANY(revenue_streams) THEN
        primary_stream := 'marketing';
      ELSE
        primary_stream := revenue_streams[1];
      END IF;
    END IF;
    
    -- Update invoice
    BEGIN
      UPDATE stg_invoices 
      SET 
        revenue_stream = primary_stream,
        revenue_stream_confidence = CASE 
          WHEN array_length(revenue_streams, 1) = 1 THEN 'HIGH'
          WHEN array_length(revenue_streams, 1) > 1 THEN 'MEDIUM'
          ELSE 'LOW'
        END,
        updated_at = now()
      WHERE xero_invoice_id = invoice_record.xero_invoice_id;
      
      tagged := tagged + 1;
    EXCEPTION WHEN OTHERS THEN
      errors := errors + 1;
    END;
  END LOOP;
  
  RETURN QUERY SELECT processed, tagged, errors;
END;
$$ LANGUAGE plpgsql;

-- Function to validate configuration completeness
CREATE OR REPLACE FUNCTION validate_configuration()
RETURNS TABLE (
  check_name text,
  status text,
  message text,
  details jsonb
) AS $$
BEGIN
  -- Check unmapped accounts
  RETURN QUERY
  SELECT 
    'unmapped_accounts'::text,
    CASE WHEN get_unmapped_accounts_count() = 0 THEN 'PASS' ELSE 'WARN' END,
    'Accounts mapped to revenue streams: ' || (
      SELECT COUNT(*) FROM account_mappings
    )::text || ' / ' || (
      SELECT COUNT(*) FROM stg_accounts 
      WHERE account_type IN ('REVENUE', 'SALES', 'OTHERINCOME', 'DIRECTCOSTS', 'EXPENSE')
    )::text,
    jsonb_build_object('unmapped_count', get_unmapped_accounts_count());

  -- Check unmapped items
  RETURN QUERY
  SELECT 
    'unmapped_items'::text,
    CASE WHEN get_unmapped_items_count() = 0 THEN 'PASS' ELSE 'WARN' END,
    'Items mapped to revenue streams: ' || (
      SELECT COUNT(*) FROM item_mappings
    )::text || ' / ' || (
      SELECT COUNT(*) FROM stg_items WHERE is_sold = true
    )::text,
    jsonb_build_object('unmapped_count', get_unmapped_items_count());

  -- Check GST configuration
  RETURN QUERY
  SELECT 
    'gst_configuration'::text,
    CASE WHEN EXISTS(SELECT 1 FROM gst_configuration) THEN 'PASS' ELSE 'FAIL' END,
    CASE WHEN EXISTS(SELECT 1 FROM gst_configuration) 
         THEN 'GST configuration is present'
         ELSE 'GST configuration is missing'
    END,
    jsonb_build_object('configured', EXISTS(SELECT 1 FROM gst_configuration));

  -- Check deferred revenue rules
  RETURN QUERY
  SELECT 
    'deferred_revenue_rules'::text,
    CASE WHEN EXISTS(SELECT 1 FROM deferred_revenue_rules WHERE is_active = true) THEN 'PASS' ELSE 'WARN' END,
    'Active deferred revenue rules: ' || (
      SELECT COUNT(*) FROM deferred_revenue_rules WHERE is_active = true
    )::text,
    jsonb_build_object('active_rules', (SELECT COUNT(*) FROM deferred_revenue_rules WHERE is_active = true));

END;
$$ LANGUAGE plpgsql;

-- Create updated_at triggers
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply triggers to all configuration tables
CREATE TRIGGER update_revenue_stream_mappings_updated_at 
  BEFORE UPDATE ON revenue_stream_mappings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_account_mappings_updated_at 
  BEFORE UPDATE ON account_mappings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_item_mappings_updated_at 
  BEFORE UPDATE ON item_mappings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_gst_configuration_updated_at 
  BEFORE UPDATE ON gst_configuration
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_deferred_revenue_rules_updated_at 
  BEFORE UPDATE ON deferred_revenue_rules
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Grant permissions
GRANT SELECT, INSERT, UPDATE ON revenue_stream_mappings TO authenticated;
GRANT SELECT, INSERT, UPDATE ON account_mappings TO authenticated;
GRANT SELECT, INSERT, UPDATE ON item_mappings TO authenticated;
GRANT SELECT, INSERT, UPDATE ON gst_configuration TO authenticated;
GRANT SELECT, INSERT, UPDATE ON deferred_revenue_rules TO authenticated;

GRANT EXECUTE ON FUNCTION get_unmapped_accounts_count() TO authenticated;
GRANT EXECUTE ON FUNCTION get_unmapped_items_count() TO authenticated;
GRANT EXECUTE ON FUNCTION apply_revenue_stream_tagging() TO authenticated;
GRANT EXECUTE ON FUNCTION validate_configuration() TO authenticated;

-- Row Level Security policies
ALTER TABLE revenue_stream_mappings ENABLE ROW LEVEL SECURITY;
ALTER TABLE account_mappings ENABLE ROW LEVEL SECURITY;
ALTER TABLE item_mappings ENABLE ROW LEVEL SECURITY;
ALTER TABLE gst_configuration ENABLE ROW LEVEL SECURITY;
ALTER TABLE deferred_revenue_rules ENABLE ROW LEVEL SECURITY;

-- Allow all authenticated users to read configuration
CREATE POLICY "Allow authenticated users to read revenue stream mappings" ON revenue_stream_mappings FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated users to read account mappings" ON account_mappings FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated users to read item mappings" ON item_mappings FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated users to read GST configuration" ON gst_configuration FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated users to read deferred revenue rules" ON deferred_revenue_rules FOR SELECT TO authenticated USING (true);

-- Allow owner and finance roles to modify configuration
CREATE POLICY "Allow owner and finance to modify revenue stream mappings" ON revenue_stream_mappings 
  FOR ALL TO authenticated 
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role IN ('owner', 'finance')
      AND profiles.is_active = true
    )
  );

CREATE POLICY "Allow owner and finance to modify account mappings" ON account_mappings 
  FOR ALL TO authenticated 
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role IN ('owner', 'finance')
      AND profiles.is_active = true
    )
  );

CREATE POLICY "Allow owner and finance to modify item mappings" ON item_mappings 
  FOR ALL TO authenticated 
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role IN ('owner', 'finance')
      AND profiles.is_active = true
    )
  );

CREATE POLICY "Allow owner and finance to modify GST configuration" ON gst_configuration 
  FOR ALL TO authenticated 
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role IN ('owner', 'finance')
      AND profiles.is_active = true
    )
  );

CREATE POLICY "Allow owner and finance to modify deferred revenue rules" ON deferred_revenue_rules 
  FOR ALL TO authenticated 
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role IN ('owner', 'finance')
      AND profiles.is_active = true
    )
  );

-- Add comments
COMMENT ON TABLE revenue_stream_mappings IS 'Maps account codes and item codes to business revenue streams';
COMMENT ON TABLE account_mappings IS 'Individual account code mappings to revenue streams and categories';
COMMENT ON TABLE item_mappings IS 'Item code mappings to revenue streams and product categories';
COMMENT ON TABLE gst_configuration IS 'GST method and BAS reporting configuration';
COMMENT ON TABLE deferred_revenue_rules IS 'Rules for deferred revenue recognition by revenue stream';

COMMENT ON FUNCTION apply_revenue_stream_tagging() IS 'Applies revenue stream tags to invoices based on configured mappings';
COMMENT ON FUNCTION validate_configuration() IS 'Validates completeness of configuration setup';
