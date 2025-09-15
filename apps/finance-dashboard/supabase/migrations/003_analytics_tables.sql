-- Analytics tables for AUSA Finance Dashboard
-- Dimensional model with fact and dimension tables for fast dashboard queries

-- Create enum for revenue streams
CREATE TYPE revenue_stream AS ENUM (
  'tours',
  'dr-dish', 
  'marketing',
  'other'
);

-- Create dimension table for dates (Australian Financial Year focused)
CREATE TABLE dim_date (
  date_key DATE PRIMARY KEY,
  year INTEGER NOT NULL,
  month INTEGER NOT NULL,
  day INTEGER NOT NULL,
  quarter INTEGER NOT NULL,
  day_of_week INTEGER NOT NULL,
  day_of_year INTEGER NOT NULL,
  week_of_year INTEGER NOT NULL,
  -- Australian Financial Year fields
  fy_year INTEGER NOT NULL, -- e.g., 2024 for FY 2024-25
  fy_quarter INTEGER NOT NULL, -- 1-4 within financial year
  fy_month INTEGER NOT NULL, -- 1-12 within financial year (July = 1)
  fy_week INTEGER NOT NULL, -- 1-53 within financial year
  fy_day INTEGER NOT NULL, -- 1-365/366 within financial year
  is_fy_start BOOLEAN NOT NULL DEFAULT false,
  is_fy_end BOOLEAN NOT NULL DEFAULT false,
  is_weekend BOOLEAN NOT NULL DEFAULT false,
  is_public_holiday BOOLEAN NOT NULL DEFAULT false,
  -- Display labels
  date_label TEXT NOT NULL,
  month_label TEXT NOT NULL,
  fy_label TEXT NOT NULL, -- "FY 2024-25"
  quarter_label TEXT NOT NULL,
  week_label TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create dimension table for accounts
CREATE TABLE dim_account (
  account_key UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  xero_id UUID NOT NULL UNIQUE,
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  type TEXT NOT NULL,
  tax_type TEXT,
  description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  -- Business categorization
  revenue_stream revenue_stream,
  is_revenue_account BOOLEAN NOT NULL DEFAULT false,
  is_cogs_account BOOLEAN NOT NULL DEFAULT false,
  is_expense_account BOOLEAN NOT NULL DEFAULT false,
  is_asset_account BOOLEAN NOT NULL DEFAULT false,
  is_liability_account BOOLEAN NOT NULL DEFAULT false,
  is_equity_account BOOLEAN NOT NULL DEFAULT false,
  -- Hierarchy for reporting
  parent_account_code TEXT,
  account_level INTEGER NOT NULL DEFAULT 1,
  sort_order INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create dimension table for contacts
CREATE TABLE dim_contact (
  contact_key UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  xero_id UUID NOT NULL UNIQUE,
  name TEXT NOT NULL,
  contact_number TEXT,
  account_number TEXT,
  contact_status TEXT NOT NULL DEFAULT 'ACTIVE',
  is_supplier BOOLEAN NOT NULL DEFAULT false,
  is_customer BOOLEAN NOT NULL DEFAULT false,
  email_address TEXT,
  phone_number TEXT,
  address_line_1 TEXT,
  city TEXT,
  state TEXT,
  postal_code TEXT,
  country TEXT DEFAULT 'Australia',
  -- Business categorization
  customer_segment TEXT, -- 'tours', 'dr-dish', 'marketing'
  supplier_category TEXT, -- 'flights', 'accommodation', 'equipment'
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create dimension table for items
CREATE TABLE dim_item (
  item_key UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  xero_id UUID NOT NULL UNIQUE,
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT,
  is_tracked_as_inventory BOOLEAN NOT NULL DEFAULT false,
  inventory_asset_account_code TEXT,
  sales_account_code TEXT,
  purchase_account_code TEXT,
  -- Dr Dish specific categorization
  product_category TEXT, -- 'dr-dish-pro', 'dr-dish-home', 'accessories'
  product_line TEXT, -- 'machines', 'parts', 'services'
  is_dr_dish_product BOOLEAN NOT NULL DEFAULT false,
  unit_of_measure TEXT DEFAULT 'Each',
  standard_cost DECIMAL(15,4),
  standard_price DECIMAL(15,4),
  reorder_level INTEGER,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create dimension table for tracking options
CREATE TABLE dim_tracking_option (
  tracking_key UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  xero_category_id UUID NOT NULL,
  xero_option_id UUID NOT NULL UNIQUE,
  category_name TEXT NOT NULL,
  option_name TEXT NOT NULL,
  -- Business mapping
  maps_to_revenue_stream revenue_stream,
  maps_to_facility TEXT,
  maps_to_department TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create fact table for AR (Accounts Receivable) lines
CREATE TABLE fact_ar_lines (
  ar_key UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  date_key DATE NOT NULL REFERENCES dim_date(date_key),
  due_date_key DATE NOT NULL REFERENCES dim_date(date_key),
  account_key UUID NOT NULL REFERENCES dim_account(account_key),
  contact_key UUID NOT NULL REFERENCES dim_contact(contact_key),
  item_key UUID REFERENCES dim_item(item_key),
  
  -- Invoice identifiers
  xero_invoice_id UUID NOT NULL,
  invoice_number TEXT,
  xero_line_id UUID,
  
  -- Financial amounts (AUD)
  line_amount DECIMAL(15,2) NOT NULL DEFAULT 0,
  tax_amount DECIMAL(15,2) NOT NULL DEFAULT 0,
  total_amount DECIMAL(15,2) NOT NULL DEFAULT 0,
  outstanding_amount DECIMAL(15,2) NOT NULL DEFAULT 0,
  
  -- Quantities and rates
  quantity DECIMAL(15,4) NOT NULL DEFAULT 1,
  unit_price DECIMAL(15,4) NOT NULL DEFAULT 0,
  
  -- Business dimensions
  revenue_stream revenue_stream NOT NULL,
  customer_segment TEXT,
  
  -- Status and aging
  invoice_status TEXT NOT NULL,
  days_past_due INTEGER NOT NULL DEFAULT 0,
  aging_bucket TEXT NOT NULL DEFAULT 'Current',
  
  -- Tracking
  tracking_data JSONB DEFAULT '[]',
  
  -- Metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create fact table for AP (Accounts Payable) lines
CREATE TABLE fact_ap_lines (
  ap_key UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  date_key DATE NOT NULL REFERENCES dim_date(date_key),
  due_date_key DATE NOT NULL REFERENCES dim_date(date_key),
  account_key UUID NOT NULL REFERENCES dim_account(account_key),
  contact_key UUID NOT NULL REFERENCES dim_contact(contact_key),
  item_key UUID REFERENCES dim_item(item_key),
  
  -- Bill identifiers
  xero_invoice_id UUID NOT NULL,
  invoice_number TEXT,
  xero_line_id UUID,
  
  -- Financial amounts (AUD)
  line_amount DECIMAL(15,2) NOT NULL DEFAULT 0,
  tax_amount DECIMAL(15,2) NOT NULL DEFAULT 0,
  total_amount DECIMAL(15,2) NOT NULL DEFAULT 0,
  outstanding_amount DECIMAL(15,2) NOT NULL DEFAULT 0,
  
  -- Quantities and rates
  quantity DECIMAL(15,4) NOT NULL DEFAULT 1,
  unit_price DECIMAL(15,4) NOT NULL DEFAULT 0,
  
  -- Business dimensions
  expense_category TEXT,
  supplier_category TEXT,
  
  -- Status and aging
  bill_status TEXT NOT NULL,
  days_past_due INTEGER NOT NULL DEFAULT 0,
  aging_bucket TEXT NOT NULL DEFAULT 'Current',
  
  -- Tracking
  tracking_data JSONB DEFAULT '[]',
  
  -- Metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create fact table for payments
CREATE TABLE fact_payments (
  payment_key UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  date_key DATE NOT NULL REFERENCES dim_date(date_key),
  account_key UUID NOT NULL REFERENCES dim_account(account_key),
  contact_key UUID NOT NULL REFERENCES dim_contact(contact_key),
  
  -- Payment identifiers
  xero_payment_id UUID NOT NULL UNIQUE,
  reference TEXT,
  
  -- Financial amounts (AUD)
  payment_amount DECIMAL(15,2) NOT NULL,
  
  -- Payment details
  payment_type TEXT NOT NULL, -- 'ACCRECPAYMENT' or 'ACCPAYPAYMENT'
  payment_method TEXT, -- 'Bank Transfer', 'Credit Card', etc.
  
  -- Related invoice
  xero_invoice_id UUID,
  invoice_number TEXT,
  
  -- Business dimensions
  revenue_stream revenue_stream,
  
  -- Metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create fact table for inventory movements (Dr Dish focus)
CREATE TABLE fact_inventory_movements (
  movement_key UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  date_key DATE NOT NULL REFERENCES dim_date(date_key),
  item_key UUID NOT NULL REFERENCES dim_item(item_key),
  
  -- Movement details
  movement_type TEXT NOT NULL, -- 'sale', 'purchase', 'adjustment', 'transfer'
  reference_number TEXT,
  xero_reference_id UUID,
  
  -- Quantities
  quantity_change DECIMAL(15,4) NOT NULL, -- Positive for increases, negative for decreases
  quantity_before DECIMAL(15,4) NOT NULL DEFAULT 0,
  quantity_after DECIMAL(15,4) NOT NULL DEFAULT 0,
  
  -- Financial impact (AUD)
  unit_cost DECIMAL(15,4),
  total_cost DECIMAL(15,2),
  unit_price DECIMAL(15,4),
  total_value DECIMAL(15,2),
  
  -- Business context
  contact_key UUID REFERENCES dim_contact(contact_key),
  account_key UUID REFERENCES dim_account(account_key),
  
  -- Metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create materialized view for revenue by week (performance optimization)
CREATE MATERIALIZED VIEW fact_revenue_by_week AS
SELECT 
  d.fy_year,
  d.fy_week,
  d.fy_label,
  ar.revenue_stream,
  COUNT(*) as invoice_count,
  SUM(ar.line_amount) as gross_revenue,
  SUM(ar.tax_amount) as tax_amount,
  SUM(ar.total_amount) as total_revenue,
  MIN(d.date_key) as week_start_date,
  MAX(d.date_key) as week_end_date
FROM fact_ar_lines ar
JOIN dim_date d ON ar.date_key = d.date_key
WHERE ar.invoice_status IN ('AUTHORISED', 'PAID')
GROUP BY d.fy_year, d.fy_week, d.fy_label, ar.revenue_stream
ORDER BY d.fy_year, d.fy_week, ar.revenue_stream;

-- Create materialized view for cash position
CREATE MATERIALIZED VIEW fact_cash_position AS
SELECT 
  ba.code as bank_account_code,
  ba.name as bank_account_name,
  SUM(CASE 
    WHEN bt.type = 'RECEIVE' THEN bt.total 
    WHEN bt.type = 'SPEND' THEN -bt.total 
    ELSE 0 
  END) as running_balance,
  MAX(bt.date) as last_transaction_date,
  COUNT(*) as transaction_count
FROM stg_bank_accounts ba
LEFT JOIN stg_bank_transactions bt ON ba.xero_id = bt.bank_account_id
WHERE ba.status = 'ACTIVE'
GROUP BY ba.code, ba.name
ORDER BY ba.code;

-- Create materialized view for aging analysis
CREATE MATERIALIZED VIEW fact_aging_summary AS
SELECT 
  'AR' as aging_type,
  ar.aging_bucket,
  ar.revenue_stream,
  COUNT(*) as invoice_count,
  SUM(ar.outstanding_amount) as total_outstanding,
  AVG(ar.days_past_due) as avg_days_past_due,
  MIN(ar.days_past_due) as min_days_past_due,
  MAX(ar.days_past_due) as max_days_past_due
FROM fact_ar_lines ar
WHERE ar.outstanding_amount > 0
GROUP BY ar.aging_bucket, ar.revenue_stream

UNION ALL

SELECT 
  'AP' as aging_type,
  ap.aging_bucket,
  ap.supplier_category as revenue_stream,
  COUNT(*) as invoice_count,
  SUM(ap.outstanding_amount) as total_outstanding,
  AVG(ap.days_past_due) as avg_days_past_due,
  MIN(ap.days_past_due) as min_days_past_due,
  MAX(ap.days_past_due) as max_days_past_due
FROM fact_ap_lines ap
WHERE ap.outstanding_amount > 0
GROUP BY ap.aging_bucket, ap.supplier_category
ORDER BY aging_type, aging_bucket;

-- Create indexes for analytics tables

-- Date dimension indexes
CREATE INDEX idx_dim_date_fy_year ON dim_date(fy_year);
CREATE INDEX idx_dim_date_fy_week ON dim_date(fy_year, fy_week);
CREATE INDEX idx_dim_date_fy_month ON dim_date(fy_year, fy_month);
CREATE INDEX idx_dim_date_quarter ON dim_date(fy_year, fy_quarter);

-- Account dimension indexes
CREATE INDEX idx_dim_account_xero_id ON dim_account(xero_id);
CREATE INDEX idx_dim_account_code ON dim_account(code);
CREATE INDEX idx_dim_account_type ON dim_account(type);
CREATE INDEX idx_dim_account_revenue_stream ON dim_account(revenue_stream);
CREATE INDEX idx_dim_account_active ON dim_account(is_active);

-- Contact dimension indexes
CREATE INDEX idx_dim_contact_xero_id ON dim_contact(xero_id);
CREATE INDEX idx_dim_contact_name ON dim_contact(name);
CREATE INDEX idx_dim_contact_customer ON dim_contact(is_customer);
CREATE INDEX idx_dim_contact_supplier ON dim_contact(is_supplier);
CREATE INDEX idx_dim_contact_segment ON dim_contact(customer_segment);
CREATE INDEX idx_dim_contact_active ON dim_contact(is_active);

-- Item dimension indexes
CREATE INDEX idx_dim_item_xero_id ON dim_item(xero_id);
CREATE INDEX idx_dim_item_code ON dim_item(code);
CREATE INDEX idx_dim_item_dr_dish ON dim_item(is_dr_dish_product);
CREATE INDEX idx_dim_item_tracked ON dim_item(is_tracked_as_inventory);
CREATE INDEX idx_dim_item_category ON dim_item(product_category);
CREATE INDEX idx_dim_item_active ON dim_item(is_active);

-- Tracking dimension indexes
CREATE INDEX idx_dim_tracking_category ON dim_tracking_option(category_name);
CREATE INDEX idx_dim_tracking_option ON dim_tracking_option(option_name);
CREATE INDEX idx_dim_tracking_revenue_stream ON dim_tracking_option(maps_to_revenue_stream);

-- AR fact table indexes
CREATE INDEX idx_fact_ar_date ON fact_ar_lines(date_key);
CREATE INDEX idx_fact_ar_due_date ON fact_ar_lines(due_date_key);
CREATE INDEX idx_fact_ar_account ON fact_ar_lines(account_key);
CREATE INDEX idx_fact_ar_contact ON fact_ar_lines(contact_key);
CREATE INDEX idx_fact_ar_revenue_stream ON fact_ar_lines(revenue_stream);
CREATE INDEX idx_fact_ar_status ON fact_ar_lines(invoice_status);
CREATE INDEX idx_fact_ar_aging ON fact_ar_lines(aging_bucket);
CREATE INDEX idx_fact_ar_outstanding ON fact_ar_lines(outstanding_amount) WHERE outstanding_amount > 0;
CREATE INDEX idx_fact_ar_overdue ON fact_ar_lines(days_past_due) WHERE days_past_due > 0;

-- AP fact table indexes
CREATE INDEX idx_fact_ap_date ON fact_ap_lines(date_key);
CREATE INDEX idx_fact_ap_due_date ON fact_ap_lines(due_date_key);
CREATE INDEX idx_fact_ap_account ON fact_ap_lines(account_key);
CREATE INDEX idx_fact_ap_contact ON fact_ap_lines(contact_key);
CREATE INDEX idx_fact_ap_status ON fact_ap_lines(bill_status);
CREATE INDEX idx_fact_ap_aging ON fact_ap_lines(aging_bucket);
CREATE INDEX idx_fact_ap_outstanding ON fact_ap_lines(outstanding_amount) WHERE outstanding_amount > 0;
CREATE INDEX idx_fact_ap_overdue ON fact_ap_lines(days_past_due) WHERE days_past_due > 0;

-- Payment fact table indexes
CREATE INDEX idx_fact_payments_date ON fact_payments(date_key);
CREATE INDEX idx_fact_payments_account ON fact_payments(account_key);
CREATE INDEX idx_fact_payments_contact ON fact_payments(contact_key);
CREATE INDEX idx_fact_payments_type ON fact_payments(payment_type);
CREATE INDEX idx_fact_payments_revenue_stream ON fact_payments(revenue_stream);
CREATE INDEX idx_fact_payments_invoice ON fact_payments(xero_invoice_id);

-- Inventory fact table indexes
CREATE INDEX idx_fact_inventory_date ON fact_inventory_movements(date_key);
CREATE INDEX idx_fact_inventory_item ON fact_inventory_movements(item_key);
CREATE INDEX idx_fact_inventory_type ON fact_inventory_movements(movement_type);
CREATE INDEX idx_fact_inventory_contact ON fact_inventory_movements(contact_key);

-- Create composite indexes for common dashboard queries
CREATE INDEX idx_fact_ar_fy_stream_status ON fact_ar_lines(date_key, revenue_stream, invoice_status);
CREATE INDEX idx_fact_ar_contact_outstanding ON fact_ar_lines(contact_key, outstanding_amount) WHERE outstanding_amount > 0;
CREATE INDEX idx_fact_payments_fy_stream ON fact_payments(date_key, revenue_stream);

-- Add triggers for automatic timestamp updates
CREATE TRIGGER update_dim_account_updated_at 
  BEFORE UPDATE ON dim_account 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_dim_contact_updated_at 
  BEFORE UPDATE ON dim_contact 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_dim_item_updated_at 
  BEFORE UPDATE ON dim_item 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_dim_tracking_option_updated_at 
  BEFORE UPDATE ON dim_tracking_option 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_fact_ar_lines_updated_at 
  BEFORE UPDATE ON fact_ar_lines 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_fact_ap_lines_updated_at 
  BEFORE UPDATE ON fact_ap_lines 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_fact_payments_updated_at 
  BEFORE UPDATE ON fact_payments 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_fact_inventory_movements_updated_at 
  BEFORE UPDATE ON fact_inventory_movements 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Row Level Security for analytics tables
ALTER TABLE dim_date ENABLE ROW LEVEL SECURITY;
ALTER TABLE dim_account ENABLE ROW LEVEL SECURITY;
ALTER TABLE dim_contact ENABLE ROW LEVEL SECURITY;
ALTER TABLE dim_item ENABLE ROW LEVEL SECURITY;
ALTER TABLE dim_tracking_option ENABLE ROW LEVEL SECURITY;
ALTER TABLE fact_ar_lines ENABLE ROW LEVEL SECURITY;
ALTER TABLE fact_ap_lines ENABLE ROW LEVEL SECURITY;
ALTER TABLE fact_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE fact_inventory_movements ENABLE ROW LEVEL SECURITY;

-- RLS policies for dimension tables (all authenticated users can read)
CREATE POLICY "Users can view date dimension" 
  ON dim_date FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() 
      AND is_active = true
    )
  );

CREATE POLICY "Users can view account dimension" 
  ON dim_account FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() 
      AND is_active = true
    )
  );

CREATE POLICY "Users can view contact dimension" 
  ON dim_contact FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() 
      AND is_active = true
    )
  );

CREATE POLICY "Users can view item dimension" 
  ON dim_item FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() 
      AND is_active = true
    )
  );

CREATE POLICY "Users can view tracking dimension" 
  ON dim_tracking_option FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() 
      AND is_active = true
    )
  );

-- RLS policies for fact tables (role-based access)
CREATE POLICY "Users can view AR data based on role" 
  ON fact_ar_lines FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid() 
      AND p.is_active = true
      AND (
        p.role IN ('owner', 'finance') -- Full access
        OR (p.role = 'operations' AND revenue_stream = 'tours') -- Tours only
        OR (p.role = 'sales' AND revenue_stream = 'dr-dish') -- Dr Dish only
      )
    )
  );

CREATE POLICY "Admins can view all AP data" 
  ON fact_ap_lines FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() 
      AND role IN ('owner', 'finance')
      AND is_active = true
    )
  );

CREATE POLICY "Users can view payments based on role" 
  ON fact_payments FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid() 
      AND p.is_active = true
      AND (
        p.role IN ('owner', 'finance') -- Full access
        OR (p.role = 'operations' AND revenue_stream = 'tours') -- Tours payments only
        OR (p.role = 'sales' AND revenue_stream = 'dr-dish') -- Dr Dish payments only
        OR (p.role = 'marketing' AND revenue_stream = 'marketing') -- Marketing payments only
      )
    )
  );

CREATE POLICY "Sales can view Dr Dish inventory" 
  ON fact_inventory_movements FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      JOIN dim_item i ON i.item_key = fact_inventory_movements.item_key
      WHERE p.id = auth.uid() 
      AND p.is_active = true
      AND (
        p.role IN ('owner', 'finance') -- Full access
        OR (p.role = 'sales' AND i.is_dr_dish_product = true) -- Dr Dish inventory only
      )
    )
  );

-- Admins can manage all analytics data
CREATE POLICY "Admins can manage dimension data" 
  ON dim_account FOR ALL 
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() 
      AND role IN ('owner', 'finance')
      AND is_active = true
    )
  );

CREATE POLICY "Admins can manage contact dimension" 
  ON dim_contact FOR ALL 
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() 
      AND role IN ('owner', 'finance')
      AND is_active = true
    )
  );

CREATE POLICY "Admins can manage item dimension" 
  ON dim_item FOR ALL 
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() 
      AND role IN ('owner', 'finance')
      AND is_active = true
    )
  );

CREATE POLICY "Admins can manage fact tables" 
  ON fact_ar_lines FOR ALL 
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() 
      AND role IN ('owner', 'finance')
      AND is_active = true
    )
  );

CREATE POLICY "Admins can manage AP fact table" 
  ON fact_ap_lines FOR ALL 
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() 
      AND role IN ('owner', 'finance')
      AND is_active = true
    )
  );

CREATE POLICY "Admins can manage payments fact table" 
  ON fact_payments FOR ALL 
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() 
      AND role IN ('owner', 'finance')
      AND is_active = true
    )
  );

CREATE POLICY "Admins can manage inventory fact table" 
  ON fact_inventory_movements FOR ALL 
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() 
      AND role IN ('owner', 'finance')
      AND is_active = true
    )
  );

-- Create refresh function for materialized views
CREATE OR REPLACE FUNCTION refresh_analytics_views()
RETURNS void AS $$
BEGIN
  REFRESH MATERIALIZED VIEW fact_revenue_by_week;
  REFRESH MATERIALIZED VIEW fact_cash_position;
  REFRESH MATERIALIZED VIEW fact_aging_summary;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permissions
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT EXECUTE ON FUNCTION refresh_analytics_views() TO authenticated;

-- Comments for documentation
COMMENT ON TABLE dim_date IS 'Date dimension with Australian Financial Year calculations';
COMMENT ON TABLE dim_account IS 'Account dimension with revenue stream mappings';
COMMENT ON TABLE dim_contact IS 'Contact dimension for customers and suppliers';
COMMENT ON TABLE dim_item IS 'Item dimension with Dr Dish product categorization';
COMMENT ON TABLE dim_tracking_option IS 'Tracking dimension for business segmentation';

COMMENT ON TABLE fact_ar_lines IS 'Accounts receivable fact table for customer invoice analytics';
COMMENT ON TABLE fact_ap_lines IS 'Accounts payable fact table for supplier bill analytics';
COMMENT ON TABLE fact_payments IS 'Payment fact table for cash flow analytics';
COMMENT ON TABLE fact_inventory_movements IS 'Inventory movement fact table for Dr Dish analytics';

COMMENT ON MATERIALIZED VIEW fact_revenue_by_week IS 'Pre-aggregated revenue by financial year week for performance';
COMMENT ON MATERIALIZED VIEW fact_cash_position IS 'Current cash position by bank account';
COMMENT ON MATERIALIZED VIEW fact_aging_summary IS 'AR/AP aging buckets for dashboard tiles';

COMMENT ON COLUMN dim_date.fy_week IS 'Financial year week number (1-53), starting from July 1';
COMMENT ON COLUMN dim_account.revenue_stream IS 'Business revenue stream mapping (tours, dr-dish, marketing)';
COMMENT ON COLUMN fact_ar_lines.aging_bucket IS 'Aging category: Current, 31-60, 61-90, 90+ days';
COMMENT ON COLUMN fact_ar_lines.days_past_due IS 'Days past due date (0 = not overdue)';
COMMENT ON COLUMN fact_inventory_movements.quantity_change IS 'Positive = increase, negative = decrease';

-- Populate date dimension with 5 years of dates (2022-2027)
INSERT INTO dim_date (
  date_key, year, month, day, quarter, day_of_week, day_of_year, week_of_year,
  fy_year, fy_quarter, fy_month, fy_week, fy_day,
  is_fy_start, is_fy_end, is_weekend,
  date_label, month_label, fy_label, quarter_label, week_label
)
SELECT 
  d::date as date_key,
  EXTRACT(YEAR FROM d) as year,
  EXTRACT(MONTH FROM d) as month,
  EXTRACT(DAY FROM d) as day,
  EXTRACT(QUARTER FROM d) as quarter,
  EXTRACT(DOW FROM d) as day_of_week,
  EXTRACT(DOY FROM d) as day_of_year,
  EXTRACT(WEEK FROM d) as week_of_year,
  -- Australian FY calculations
  CASE 
    WHEN EXTRACT(MONTH FROM d) >= 7 THEN EXTRACT(YEAR FROM d)
    ELSE EXTRACT(YEAR FROM d) - 1
  END as fy_year,
  CASE 
    WHEN EXTRACT(MONTH FROM d) IN (7,8,9) THEN 1
    WHEN EXTRACT(MONTH FROM d) IN (10,11,12) THEN 2
    WHEN EXTRACT(MONTH FROM d) IN (1,2,3) THEN 3
    ELSE 4
  END as fy_quarter,
  CASE 
    WHEN EXTRACT(MONTH FROM d) >= 7 THEN EXTRACT(MONTH FROM d) - 6
    ELSE EXTRACT(MONTH FROM d) + 6
  END as fy_month,
  -- FY week calculation (simplified)
  CASE 
    WHEN EXTRACT(MONTH FROM d) >= 7 THEN 
      FLOOR((EXTRACT(DOY FROM d) - EXTRACT(DOY FROM (EXTRACT(YEAR FROM d)||'-07-01')::date)) / 7) + 1
    ELSE 
      FLOOR((EXTRACT(DOY FROM d) + (365 - EXTRACT(DOY FROM ((EXTRACT(YEAR FROM d)-1)||'-07-01')::date))) / 7) + 1
  END as fy_week,
  -- FY day calculation
  CASE 
    WHEN EXTRACT(MONTH FROM d) >= 7 THEN 
      EXTRACT(DOY FROM d) - EXTRACT(DOY FROM (EXTRACT(YEAR FROM d)||'-07-01')::date) + 1
    ELSE 
      EXTRACT(DOY FROM d) + (365 - EXTRACT(DOY FROM ((EXTRACT(YEAR FROM d)-1)||'-07-01')::date)) + 1
  END as fy_day,
  -- Special dates
  (EXTRACT(MONTH FROM d) = 7 AND EXTRACT(DAY FROM d) = 1) as is_fy_start,
  (EXTRACT(MONTH FROM d) = 6 AND EXTRACT(DAY FROM d) = 30) as is_fy_end,
  (EXTRACT(DOW FROM d) IN (0,6)) as is_weekend,
  -- Labels
  TO_CHAR(d, 'DD/MM/YYYY') as date_label,
  TO_CHAR(d, 'Month YYYY') as month_label,
  CASE 
    WHEN EXTRACT(MONTH FROM d) >= 7 THEN 'FY ' || EXTRACT(YEAR FROM d) || '-' || RIGHT((EXTRACT(YEAR FROM d) + 1)::text, 2)
    ELSE 'FY ' || (EXTRACT(YEAR FROM d) - 1) || '-' || RIGHT(EXTRACT(YEAR FROM d)::text, 2)
  END as fy_label,
  'Q' || (CASE 
    WHEN EXTRACT(MONTH FROM d) IN (7,8,9) THEN 1
    WHEN EXTRACT(MONTH FROM d) IN (10,11,12) THEN 2
    WHEN EXTRACT(MONTH FROM d) IN (1,2,3) THEN 3
    ELSE 4
  END)::text as quarter_label,
  'Week ' || (CASE 
    WHEN EXTRACT(MONTH FROM d) >= 7 THEN 
      FLOOR((EXTRACT(DOY FROM d) - EXTRACT(DOY FROM (EXTRACT(YEAR FROM d)||'-07-01')::date)) / 7) + 1
    ELSE 
      FLOOR((EXTRACT(DOY FROM d) + (365 - EXTRACT(DOY FROM ((EXTRACT(YEAR FROM d)-1)||'-07-01')::date))) / 7) + 1
  END)::text as week_label
FROM generate_series('2022-01-01'::date, '2027-12-31'::date, '1 day'::interval) d;
