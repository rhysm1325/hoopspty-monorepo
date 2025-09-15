-- Staging tables for raw Xero data
-- These tables store the raw Xero API responses for processing into analytics tables

-- Create staging table for Xero accounts
CREATE TABLE stg_accounts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  xero_id UUID NOT NULL UNIQUE,
  code TEXT NOT NULL,
  name TEXT NOT NULL,
  type TEXT,
  tax_type TEXT,
  description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  updated_date_utc TIMESTAMPTZ NOT NULL,
  raw_data JSONB NOT NULL, -- Full Xero API response
  sync_batch_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create staging table for Xero contacts
CREATE TABLE stg_contacts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  xero_id UUID NOT NULL UNIQUE,
  name TEXT NOT NULL,
  contact_number TEXT,
  account_number TEXT,
  contact_status TEXT NOT NULL DEFAULT 'ACTIVE',
  is_supplier BOOLEAN NOT NULL DEFAULT false,
  is_customer BOOLEAN NOT NULL DEFAULT false,
  email_address TEXT,
  phone_numbers JSONB DEFAULT '[]',
  addresses JSONB DEFAULT '[]',
  updated_date_utc TIMESTAMPTZ NOT NULL,
  raw_data JSONB NOT NULL,
  sync_batch_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create staging table for Xero invoices (both AR and AP)
CREATE TABLE stg_invoices (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  xero_id UUID NOT NULL UNIQUE,
  type TEXT NOT NULL, -- 'ACCREC' (sales) or 'ACCPAY' (bills)
  invoice_number TEXT,
  reference TEXT,
  contact_id UUID NOT NULL,
  contact_name TEXT NOT NULL,
  date DATE NOT NULL,
  due_date DATE NOT NULL,
  status TEXT NOT NULL,
  line_amount_types TEXT NOT NULL DEFAULT 'EXCLUSIVE',
  sub_total DECIMAL(15,2) NOT NULL DEFAULT 0,
  total_tax DECIMAL(15,2) NOT NULL DEFAULT 0,
  total DECIMAL(15,2) NOT NULL DEFAULT 0,
  amount_due DECIMAL(15,2) NOT NULL DEFAULT 0,
  amount_paid DECIMAL(15,2) NOT NULL DEFAULT 0,
  amount_credited DECIMAL(15,2) NOT NULL DEFAULT 0,
  currency_code TEXT NOT NULL DEFAULT 'AUD',
  updated_date_utc TIMESTAMPTZ NOT NULL,
  raw_data JSONB NOT NULL,
  sync_batch_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create staging table for Xero invoice line items
CREATE TABLE stg_invoice_lines (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  xero_line_id UUID,
  invoice_id UUID NOT NULL REFERENCES stg_invoices(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  quantity DECIMAL(15,4) NOT NULL DEFAULT 1,
  unit_amount DECIMAL(15,4) NOT NULL DEFAULT 0,
  line_amount DECIMAL(15,2) NOT NULL DEFAULT 0,
  item_code TEXT,
  account_code TEXT NOT NULL,
  tax_type TEXT,
  tax_amount DECIMAL(15,2) DEFAULT 0,
  tracking JSONB DEFAULT '[]', -- Tracking categories
  raw_data JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create staging table for Xero payments
CREATE TABLE stg_payments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  xero_id UUID NOT NULL UNIQUE,
  date DATE NOT NULL,
  amount DECIMAL(15,2) NOT NULL,
  reference TEXT,
  currency_code TEXT NOT NULL DEFAULT 'AUD',
  payment_type TEXT NOT NULL, -- 'ACCRECPAYMENT' or 'ACCPAYPAYMENT'
  status TEXT NOT NULL,
  account_id UUID,
  account_code TEXT,
  account_name TEXT,
  invoice_id UUID,
  invoice_number TEXT,
  updated_date_utc TIMESTAMPTZ NOT NULL,
  raw_data JSONB NOT NULL,
  sync_batch_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create staging table for Xero credit notes
CREATE TABLE stg_credit_notes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  xero_id UUID NOT NULL UNIQUE,
  credit_note_number TEXT,
  type TEXT NOT NULL, -- 'ACCRECCREDIT' or 'ACCPAYCREDIT'
  reference TEXT,
  contact_id UUID NOT NULL,
  contact_name TEXT NOT NULL,
  date DATE NOT NULL,
  status TEXT NOT NULL,
  sub_total DECIMAL(15,2) NOT NULL DEFAULT 0,
  total_tax DECIMAL(15,2) NOT NULL DEFAULT 0,
  total DECIMAL(15,2) NOT NULL DEFAULT 0,
  remaining_credit DECIMAL(15,2) NOT NULL DEFAULT 0,
  currency_code TEXT NOT NULL DEFAULT 'AUD',
  updated_date_utc TIMESTAMPTZ NOT NULL,
  raw_data JSONB NOT NULL,
  sync_batch_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create staging table for Xero items
CREATE TABLE stg_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  xero_id UUID NOT NULL UNIQUE,
  code TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  purchase_description TEXT,
  is_tracked_as_inventory BOOLEAN NOT NULL DEFAULT false,
  inventory_asset_account_code TEXT,
  quantity_on_hand DECIMAL(15,4) DEFAULT 0,
  sales_unit_price DECIMAL(15,4),
  sales_account_code TEXT,
  sales_tax_type TEXT,
  purchase_unit_price DECIMAL(15,4),
  purchase_account_code TEXT,
  purchase_tax_type TEXT,
  updated_date_utc TIMESTAMPTZ NOT NULL,
  raw_data JSONB NOT NULL,
  sync_batch_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create staging table for Xero bank accounts
CREATE TABLE stg_bank_accounts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  xero_id UUID NOT NULL UNIQUE,
  code TEXT NOT NULL,
  name TEXT NOT NULL,
  type TEXT,
  bank_account_number TEXT,
  status TEXT NOT NULL DEFAULT 'ACTIVE',
  currency_code TEXT NOT NULL DEFAULT 'AUD',
  updated_date_utc TIMESTAMPTZ NOT NULL,
  raw_data JSONB NOT NULL,
  sync_batch_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create staging table for Xero bank transactions
CREATE TABLE stg_bank_transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  xero_id UUID NOT NULL UNIQUE,
  type TEXT NOT NULL, -- 'RECEIVE' or 'SPEND'
  contact_id UUID,
  contact_name TEXT,
  bank_account_id UUID,
  bank_account_code TEXT,
  bank_account_name TEXT,
  date DATE NOT NULL,
  reference TEXT,
  status TEXT NOT NULL,
  sub_total DECIMAL(15,2) NOT NULL DEFAULT 0,
  total_tax DECIMAL(15,2) NOT NULL DEFAULT 0,
  total DECIMAL(15,2) NOT NULL DEFAULT 0,
  currency_code TEXT NOT NULL DEFAULT 'AUD',
  updated_date_utc TIMESTAMPTZ NOT NULL,
  raw_data JSONB NOT NULL,
  sync_batch_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create staging table for Xero manual journals
CREATE TABLE stg_manual_journals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  xero_id UUID NOT NULL UNIQUE,
  narration TEXT NOT NULL,
  date DATE NOT NULL,
  status TEXT NOT NULL,
  url TEXT,
  show_on_cash_basis_reports BOOLEAN DEFAULT true,
  updated_date_utc TIMESTAMPTZ NOT NULL,
  raw_data JSONB NOT NULL,
  sync_batch_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create staging table for Xero manual journal lines
CREATE TABLE stg_manual_journal_lines (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  xero_line_id UUID,
  manual_journal_id UUID NOT NULL REFERENCES stg_manual_journals(id) ON DELETE CASCADE,
  account_code TEXT NOT NULL,
  account_id UUID,
  description TEXT,
  tax_type TEXT,
  gross_amount DECIMAL(15,2) NOT NULL,
  tax_amount DECIMAL(15,2) DEFAULT 0,
  net_amount DECIMAL(15,2) NOT NULL,
  tracking JSONB DEFAULT '[]',
  raw_data JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create staging table for Xero tracking categories
CREATE TABLE stg_tracking_categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  xero_id UUID NOT NULL UNIQUE,
  name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'ACTIVE',
  updated_date_utc TIMESTAMPTZ NOT NULL,
  raw_data JSONB NOT NULL,
  sync_batch_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create staging table for Xero tracking options
CREATE TABLE stg_tracking_options (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  xero_id UUID NOT NULL UNIQUE,
  tracking_category_id UUID NOT NULL REFERENCES stg_tracking_categories(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'ACTIVE',
  updated_date_utc TIMESTAMPTZ NOT NULL,
  raw_data JSONB NOT NULL,
  sync_batch_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes for performance optimization

-- Accounts indexes
CREATE INDEX idx_stg_accounts_xero_id ON stg_accounts(xero_id);
CREATE INDEX idx_stg_accounts_code ON stg_accounts(code);
CREATE INDEX idx_stg_accounts_type ON stg_accounts(type);
CREATE INDEX idx_stg_accounts_updated ON stg_accounts(updated_date_utc);
CREATE INDEX idx_stg_accounts_sync_batch ON stg_accounts(sync_batch_id);

-- Contacts indexes
CREATE INDEX idx_stg_contacts_xero_id ON stg_contacts(xero_id);
CREATE INDEX idx_stg_contacts_name ON stg_contacts(name);
CREATE INDEX idx_stg_contacts_email ON stg_contacts(email_address);
CREATE INDEX idx_stg_contacts_customer ON stg_contacts(is_customer);
CREATE INDEX idx_stg_contacts_supplier ON stg_contacts(is_supplier);
CREATE INDEX idx_stg_contacts_updated ON stg_contacts(updated_date_utc);
CREATE INDEX idx_stg_contacts_sync_batch ON stg_contacts(sync_batch_id);

-- Invoices indexes
CREATE INDEX idx_stg_invoices_xero_id ON stg_invoices(xero_id);
CREATE INDEX idx_stg_invoices_type ON stg_invoices(type);
CREATE INDEX idx_stg_invoices_number ON stg_invoices(invoice_number);
CREATE INDEX idx_stg_invoices_contact ON stg_invoices(contact_id);
CREATE INDEX idx_stg_invoices_date ON stg_invoices(date);
CREATE INDEX idx_stg_invoices_due_date ON stg_invoices(due_date);
CREATE INDEX idx_stg_invoices_status ON stg_invoices(status);
CREATE INDEX idx_stg_invoices_amount_due ON stg_invoices(amount_due);
CREATE INDEX idx_stg_invoices_updated ON stg_invoices(updated_date_utc);
CREATE INDEX idx_stg_invoices_sync_batch ON stg_invoices(sync_batch_id);

-- Invoice lines indexes
CREATE INDEX idx_stg_invoice_lines_invoice ON stg_invoice_lines(invoice_id);
CREATE INDEX idx_stg_invoice_lines_account ON stg_invoice_lines(account_code);
CREATE INDEX idx_stg_invoice_lines_item ON stg_invoice_lines(item_code);
CREATE INDEX idx_stg_invoice_lines_amount ON stg_invoice_lines(line_amount);

-- Payments indexes
CREATE INDEX idx_stg_payments_xero_id ON stg_payments(xero_id);
CREATE INDEX idx_stg_payments_date ON stg_payments(date);
CREATE INDEX idx_stg_payments_type ON stg_payments(payment_type);
CREATE INDEX idx_stg_payments_invoice ON stg_payments(invoice_id);
CREATE INDEX idx_stg_payments_account ON stg_payments(account_id);
CREATE INDEX idx_stg_payments_updated ON stg_payments(updated_date_utc);
CREATE INDEX idx_stg_payments_sync_batch ON stg_payments(sync_batch_id);

-- Credit notes indexes
CREATE INDEX idx_stg_credit_notes_xero_id ON stg_credit_notes(xero_id);
CREATE INDEX idx_stg_credit_notes_type ON stg_credit_notes(type);
CREATE INDEX idx_stg_credit_notes_contact ON stg_credit_notes(contact_id);
CREATE INDEX idx_stg_credit_notes_date ON stg_credit_notes(date);
CREATE INDEX idx_stg_credit_notes_status ON stg_credit_notes(status);
CREATE INDEX idx_stg_credit_notes_updated ON stg_credit_notes(updated_date_utc);
CREATE INDEX idx_stg_credit_notes_sync_batch ON stg_credit_notes(sync_batch_id);

-- Items indexes
CREATE INDEX idx_stg_items_xero_id ON stg_items(xero_id);
CREATE INDEX idx_stg_items_code ON stg_items(code);
CREATE INDEX idx_stg_items_name ON stg_items(name);
CREATE INDEX idx_stg_items_tracked ON stg_items(is_tracked_as_inventory);
CREATE INDEX idx_stg_items_sales_account ON stg_items(sales_account_code);
CREATE INDEX idx_stg_items_purchase_account ON stg_items(purchase_account_code);
CREATE INDEX idx_stg_items_updated ON stg_items(updated_date_utc);
CREATE INDEX idx_stg_items_sync_batch ON stg_items(sync_batch_id);

-- Bank accounts indexes
CREATE INDEX idx_stg_bank_accounts_xero_id ON stg_bank_accounts(xero_id);
CREATE INDEX idx_stg_bank_accounts_code ON stg_bank_accounts(code);
CREATE INDEX idx_stg_bank_accounts_status ON stg_bank_accounts(status);
CREATE INDEX idx_stg_bank_accounts_updated ON stg_bank_accounts(updated_date_utc);
CREATE INDEX idx_stg_bank_accounts_sync_batch ON stg_bank_accounts(sync_batch_id);

-- Bank transactions indexes
CREATE INDEX idx_stg_bank_transactions_xero_id ON stg_bank_transactions(xero_id);
CREATE INDEX idx_stg_bank_transactions_type ON stg_bank_transactions(type);
CREATE INDEX idx_stg_bank_transactions_date ON stg_bank_transactions(date);
CREATE INDEX idx_stg_bank_transactions_contact ON stg_bank_transactions(contact_id);
CREATE INDEX idx_stg_bank_transactions_account ON stg_bank_transactions(bank_account_id);
CREATE INDEX idx_stg_bank_transactions_updated ON stg_bank_transactions(updated_date_utc);
CREATE INDEX idx_stg_bank_transactions_sync_batch ON stg_bank_transactions(sync_batch_id);

-- Manual journals indexes
CREATE INDEX idx_stg_manual_journals_xero_id ON stg_manual_journals(xero_id);
CREATE INDEX idx_stg_manual_journals_date ON stg_manual_journals(date);
CREATE INDEX idx_stg_manual_journals_status ON stg_manual_journals(status);
CREATE INDEX idx_stg_manual_journals_updated ON stg_manual_journals(updated_date_utc);
CREATE INDEX idx_stg_manual_journals_sync_batch ON stg_manual_journals(sync_batch_id);

-- Manual journal lines indexes
CREATE INDEX idx_stg_manual_journal_lines_journal ON stg_manual_journal_lines(manual_journal_id);
CREATE INDEX idx_stg_manual_journal_lines_account ON stg_manual_journal_lines(account_code);
CREATE INDEX idx_stg_manual_journal_lines_amount ON stg_manual_journal_lines(gross_amount);

-- Tracking categories indexes
CREATE INDEX idx_stg_tracking_categories_xero_id ON stg_tracking_categories(xero_id);
CREATE INDEX idx_stg_tracking_categories_name ON stg_tracking_categories(name);
CREATE INDEX idx_stg_tracking_categories_status ON stg_tracking_categories(status);
CREATE INDEX idx_stg_tracking_categories_updated ON stg_tracking_categories(updated_date_utc);
CREATE INDEX idx_stg_tracking_categories_sync_batch ON stg_tracking_categories(sync_batch_id);

-- Tracking options indexes
CREATE INDEX idx_stg_tracking_options_xero_id ON stg_tracking_options(xero_id);
CREATE INDEX idx_stg_tracking_options_category ON stg_tracking_options(tracking_category_id);
CREATE INDEX idx_stg_tracking_options_name ON stg_tracking_options(name);
CREATE INDEX idx_stg_tracking_options_status ON stg_tracking_options(status);
CREATE INDEX idx_stg_tracking_options_updated ON stg_tracking_options(updated_date_utc);
CREATE INDEX idx_stg_tracking_options_sync_batch ON stg_tracking_options(sync_batch_id);

-- Create composite indexes for common query patterns
CREATE INDEX idx_stg_invoices_type_status_date ON stg_invoices(type, status, date);
CREATE INDEX idx_stg_invoices_contact_date ON stg_invoices(contact_id, date);
CREATE INDEX idx_stg_invoices_due_amount ON stg_invoices(due_date, amount_due) WHERE amount_due > 0;

CREATE INDEX idx_stg_payments_invoice_date ON stg_payments(invoice_id, date);
CREATE INDEX idx_stg_payments_account_date ON stg_payments(account_id, date);

CREATE INDEX idx_stg_invoice_lines_account_date ON stg_invoice_lines(account_code, (raw_data->>'date'));
CREATE INDEX idx_stg_invoice_lines_item_date ON stg_invoice_lines(item_code, (raw_data->>'date')) WHERE item_code IS NOT NULL;

-- Add triggers for automatic timestamp updates
CREATE TRIGGER update_stg_accounts_updated_at 
  BEFORE UPDATE ON stg_accounts 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_stg_contacts_updated_at 
  BEFORE UPDATE ON stg_contacts 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_stg_invoices_updated_at 
  BEFORE UPDATE ON stg_invoices 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_stg_invoice_lines_updated_at 
  BEFORE UPDATE ON stg_invoice_lines 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_stg_payments_updated_at 
  BEFORE UPDATE ON stg_payments 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_stg_credit_notes_updated_at 
  BEFORE UPDATE ON stg_credit_notes 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_stg_items_updated_at 
  BEFORE UPDATE ON stg_items 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_stg_bank_accounts_updated_at 
  BEFORE UPDATE ON stg_bank_accounts 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_stg_bank_transactions_updated_at 
  BEFORE UPDATE ON stg_bank_transactions 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_stg_manual_journals_updated_at 
  BEFORE UPDATE ON stg_manual_journals 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_stg_manual_journal_lines_updated_at 
  BEFORE UPDATE ON stg_manual_journal_lines 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_stg_tracking_categories_updated_at 
  BEFORE UPDATE ON stg_tracking_categories 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_stg_tracking_options_updated_at 
  BEFORE UPDATE ON stg_tracking_options 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Row Level Security for staging tables
ALTER TABLE stg_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE stg_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE stg_invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE stg_invoice_lines ENABLE ROW LEVEL SECURITY;
ALTER TABLE stg_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE stg_credit_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE stg_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE stg_bank_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE stg_bank_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE stg_manual_journals ENABLE ROW LEVEL SECURITY;
ALTER TABLE stg_manual_journal_lines ENABLE ROW LEVEL SECURITY;
ALTER TABLE stg_tracking_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE stg_tracking_options ENABLE ROW LEVEL SECURITY;

-- RLS policies for staging tables (admin access only for sync operations)
CREATE POLICY "Admins can manage staging data" 
  ON stg_accounts FOR ALL 
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() 
      AND role IN ('owner', 'finance')
      AND is_active = true
    )
  );

CREATE POLICY "Admins can manage staging contacts" 
  ON stg_contacts FOR ALL 
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() 
      AND role IN ('owner', 'finance')
      AND is_active = true
    )
  );

CREATE POLICY "Admins can manage staging invoices" 
  ON stg_invoices FOR ALL 
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() 
      AND role IN ('owner', 'finance')
      AND is_active = true
    )
  );

CREATE POLICY "Admins can manage staging invoice lines" 
  ON stg_invoice_lines FOR ALL 
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() 
      AND role IN ('owner', 'finance')
      AND is_active = true
    )
  );

CREATE POLICY "Admins can manage staging payments" 
  ON stg_payments FOR ALL 
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() 
      AND role IN ('owner', 'finance')
      AND is_active = true
    )
  );

CREATE POLICY "Admins can manage staging credit notes" 
  ON stg_credit_notes FOR ALL 
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() 
      AND role IN ('owner', 'finance')
      AND is_active = true
    )
  );

CREATE POLICY "Admins can manage staging items" 
  ON stg_items FOR ALL 
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() 
      AND role IN ('owner', 'finance')
      AND is_active = true
    )
  );

CREATE POLICY "Admins can manage staging bank accounts" 
  ON stg_bank_accounts FOR ALL 
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() 
      AND role IN ('owner', 'finance')
      AND is_active = true
    )
  );

CREATE POLICY "Admins can manage staging bank transactions" 
  ON stg_bank_transactions FOR ALL 
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() 
      AND role IN ('owner', 'finance')
      AND is_active = true
    )
  );

CREATE POLICY "Admins can manage staging manual journals" 
  ON stg_manual_journals FOR ALL 
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() 
      AND role IN ('owner', 'finance')
      AND is_active = true
    )
  );

CREATE POLICY "Admins can manage staging manual journal lines" 
  ON stg_manual_journal_lines FOR ALL 
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() 
      AND role IN ('owner', 'finance')
      AND is_active = true
    )
  );

CREATE POLICY "Admins can manage staging tracking categories" 
  ON stg_tracking_categories FOR ALL 
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() 
      AND role IN ('owner', 'finance')
      AND is_active = true
    )
  );

CREATE POLICY "Admins can manage staging tracking options" 
  ON stg_tracking_options FOR ALL 
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() 
      AND role IN ('owner', 'finance')
      AND is_active = true
    )
  );

-- Create useful views for common staging data queries
CREATE VIEW stg_ar_invoices AS
SELECT 
  i.*,
  c.name as customer_name,
  c.email_address as customer_email
FROM stg_invoices i
JOIN stg_contacts c ON i.contact_id = c.xero_id
WHERE i.type = 'ACCREC' -- Accounts Receivable
  AND i.amount_due > 0;

CREATE VIEW stg_ap_bills AS
SELECT 
  i.*,
  c.name as supplier_name,
  c.email_address as supplier_email
FROM stg_invoices i
JOIN stg_contacts c ON i.contact_id = c.xero_id
WHERE i.type = 'ACCPAY' -- Accounts Payable
  AND i.amount_due > 0;

CREATE VIEW stg_revenue_by_account AS
SELECT 
  il.account_code,
  a.name as account_name,
  a.type as account_type,
  SUM(il.line_amount) as total_amount,
  COUNT(*) as line_count,
  MIN(i.date) as earliest_date,
  MAX(i.date) as latest_date
FROM stg_invoice_lines il
JOIN stg_invoices i ON il.invoice_id = i.id
JOIN stg_accounts a ON il.account_code = a.code
WHERE i.type = 'ACCREC' -- Revenue invoices only
  AND i.status IN ('AUTHORISED', 'PAID')
GROUP BY il.account_code, a.name, a.type;

-- Comments for documentation
COMMENT ON TABLE stg_accounts IS 'Raw Xero accounts data for chart of accounts';
COMMENT ON TABLE stg_contacts IS 'Raw Xero contacts data for customers and suppliers';
COMMENT ON TABLE stg_invoices IS 'Raw Xero invoices and bills data (both AR and AP)';
COMMENT ON TABLE stg_invoice_lines IS 'Raw Xero invoice line items with account and item details';
COMMENT ON TABLE stg_payments IS 'Raw Xero payment transactions against invoices';
COMMENT ON TABLE stg_credit_notes IS 'Raw Xero credit notes for refunds and adjustments';
COMMENT ON TABLE stg_items IS 'Raw Xero items and inventory data';
COMMENT ON TABLE stg_bank_accounts IS 'Raw Xero bank account definitions';
COMMENT ON TABLE stg_bank_transactions IS 'Raw Xero bank transaction data';
COMMENT ON TABLE stg_manual_journals IS 'Raw Xero manual journal entries';
COMMENT ON TABLE stg_manual_journal_lines IS 'Raw Xero manual journal line items';
COMMENT ON TABLE stg_tracking_categories IS 'Raw Xero tracking categories for segmentation';
COMMENT ON TABLE stg_tracking_options IS 'Raw Xero tracking options within categories';

COMMENT ON COLUMN stg_invoices.type IS 'ACCREC = Sales Invoice (AR), ACCPAY = Bill (AP)';
COMMENT ON COLUMN stg_invoices.amount_due IS 'Outstanding amount to be paid';
COMMENT ON COLUMN stg_payments.payment_type IS 'ACCRECPAYMENT = Customer Payment, ACCPAYPAYMENT = Supplier Payment';
COMMENT ON COLUMN stg_items.is_tracked_as_inventory IS 'Whether item has inventory tracking in Xero';
COMMENT ON COLUMN stg_bank_transactions.type IS 'RECEIVE = Money In, SPEND = Money Out';

-- Grant permissions for staging tables
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;
