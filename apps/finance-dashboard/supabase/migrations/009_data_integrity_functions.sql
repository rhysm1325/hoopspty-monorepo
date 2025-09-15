-- Data Integrity Functions and Views
-- This migration adds database functions and views to support comprehensive
-- data integrity checking for Xero sync operations.

-- Function to check invoice line items account integrity
CREATE OR REPLACE FUNCTION check_invoice_line_items_account_integrity()
RETURNS TABLE (
  invoice_id uuid,
  line_item_index integer,
  account_code text,
  issue_description text
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    i.xero_invoice_id,
    (jsonb_array_elements_text(jsonb_path_query_array(i.line_items, '$[*].index')))::integer as line_item_index,
    jsonb_array_elements_text(jsonb_path_query_array(i.line_items, '$[*].accountCode')) as account_code,
    'Account code not found in chart of accounts' as issue_description
  FROM stg_invoices i
  WHERE EXISTS (
    SELECT 1 
    FROM jsonb_array_elements(i.line_items) as line_item
    WHERE NOT EXISTS (
      SELECT 1 
      FROM stg_accounts a 
      WHERE a.account_code = line_item->>'accountCode'
    )
  );
END;
$$ LANGUAGE plpgsql;

-- Function to check overpayments
CREATE OR REPLACE FUNCTION check_overpayments()
RETURNS TABLE (
  invoice_id uuid,
  invoice_number text,
  total_amount numeric,
  total_payments numeric,
  overpayment_amount numeric
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    i.xero_invoice_id,
    i.invoice_number,
    i.total_amount,
    COALESCE(p.total_payments, 0) as total_payments,
    COALESCE(p.total_payments, 0) - i.total_amount as overpayment_amount
  FROM stg_invoices i
  LEFT JOIN (
    SELECT 
      invoice_id,
      SUM(amount) as total_payments
    FROM stg_payments
    WHERE payment_status = 'AUTHORISED'
    GROUP BY invoice_id
  ) p ON p.invoice_id = i.xero_invoice_id
  WHERE COALESCE(p.total_payments, 0) > i.total_amount;
END;
$$ LANGUAGE plpgsql;

-- Function to check invoice amount consistency
CREATE OR REPLACE FUNCTION check_invoice_amount_consistency()
RETURNS TABLE (
  invoice_id uuid,
  invoice_number text,
  stored_subtotal numeric,
  calculated_subtotal numeric,
  stored_total numeric,
  calculated_total numeric,
  issue_type text
) AS $$
BEGIN
  RETURN QUERY
  WITH invoice_calculations AS (
    SELECT 
      i.xero_invoice_id,
      i.invoice_number,
      i.sub_total as stored_subtotal,
      i.total_amount as stored_total,
      i.total_tax as stored_tax,
      -- Calculate subtotal from line items
      (
        SELECT COALESCE(SUM((line_item->>'lineAmount')::numeric), 0)
        FROM jsonb_array_elements(i.line_items) as line_item
      ) as calculated_subtotal,
      -- Calculate total tax from line items
      (
        SELECT COALESCE(SUM((line_item->>'taxAmount')::numeric), 0)
        FROM jsonb_array_elements(i.line_items) as line_item
        WHERE line_item->>'taxAmount' IS NOT NULL
      ) as calculated_tax
    FROM stg_invoices i
    WHERE i.line_items IS NOT NULL
  )
  SELECT 
    ic.xero_invoice_id,
    ic.invoice_number,
    ic.stored_subtotal,
    ic.calculated_subtotal,
    ic.stored_total,
    ic.calculated_subtotal + COALESCE(ic.calculated_tax, ic.stored_tax, 0) as calculated_total,
    CASE 
      WHEN ABS(ic.stored_subtotal - ic.calculated_subtotal) > 0.01 THEN 'Subtotal mismatch'
      WHEN ABS(ic.stored_total - (ic.calculated_subtotal + COALESCE(ic.calculated_tax, ic.stored_tax, 0))) > 0.01 THEN 'Total amount mismatch'
      ELSE 'Unknown inconsistency'
    END as issue_type
  FROM invoice_calculations ic
  WHERE 
    ABS(ic.stored_subtotal - ic.calculated_subtotal) > 0.01 
    OR ABS(ic.stored_total - (ic.calculated_subtotal + COALESCE(ic.calculated_tax, ic.stored_tax, 0))) > 0.01;
END;
$$ LANGUAGE plpgsql;

-- Function to check currency consistency
CREATE OR REPLACE FUNCTION check_currency_consistency()
RETURNS TABLE (
  record_type text,
  record_id uuid,
  expected_currency text,
  actual_currency text,
  issue_description text
) AS $$
BEGIN
  -- Check invoices against organization currency
  RETURN QUERY
  SELECT 
    'invoice'::text as record_type,
    i.xero_invoice_id as record_id,
    'AUD'::text as expected_currency,
    i.currency_code as actual_currency,
    'Invoice currency differs from organization default' as issue_description
  FROM stg_invoices i
  WHERE i.currency_code != 'AUD';

  -- Check payments against invoice currency
  RETURN QUERY
  SELECT 
    'payment'::text as record_type,
    p.xero_payment_id as record_id,
    i.currency_code as expected_currency,
    p.currency_code as actual_currency,
    'Payment currency differs from invoice currency' as issue_description
  FROM stg_payments p
  JOIN stg_invoices i ON i.xero_invoice_id = p.invoice_id
  WHERE p.currency_code != i.currency_code;
END;
$$ LANGUAGE plpgsql;

-- Function to find duplicate contacts
CREATE OR REPLACE FUNCTION find_duplicate_contacts()
RETURNS TABLE (
  contact_group_id integer,
  contact_name text,
  email_address text,
  contact_count bigint,
  contact_ids uuid[]
) AS $$
BEGIN
  RETURN QUERY
  WITH duplicate_groups AS (
    SELECT 
      ROW_NUMBER() OVER () as group_id,
      LOWER(TRIM(name)) as normalized_name,
      LOWER(TRIM(COALESCE(email_address, ''))) as normalized_email,
      COUNT(*) as contact_count,
      ARRAY_AGG(xero_contact_id) as contact_ids
    FROM stg_contacts
    WHERE name IS NOT NULL
    GROUP BY LOWER(TRIM(name)), LOWER(TRIM(COALESCE(email_address, '')))
    HAVING COUNT(*) > 1
  )
  SELECT 
    dg.group_id::integer,
    dg.normalized_name,
    dg.normalized_email,
    dg.contact_count,
    dg.contact_ids
  FROM duplicate_groups dg;
END;
$$ LANGUAGE plpgsql;

-- Create data integrity reports table
CREATE TABLE IF NOT EXISTS data_integrity_reports (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  overall_score integer NOT NULL CHECK (overall_score >= 0 AND overall_score <= 100),
  total_checks integer NOT NULL,
  passed_checks integer NOT NULL,
  warning_checks integer NOT NULL,
  failed_checks integer NOT NULL,
  critical_issues text[] DEFAULT '{}',
  recommendations text[] DEFAULT '{}',
  check_results jsonb NOT NULL DEFAULT '[]',
  generated_at timestamptz NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Create index for faster querying
CREATE INDEX IF NOT EXISTS idx_data_integrity_reports_generated_at 
ON data_integrity_reports (generated_at DESC);

-- Create view for latest integrity report summary
CREATE OR REPLACE VIEW latest_integrity_summary AS
SELECT 
  overall_score,
  total_checks,
  passed_checks,
  warning_checks,
  failed_checks,
  array_length(critical_issues, 1) as critical_issue_count,
  array_length(recommendations, 1) as recommendation_count,
  generated_at,
  CASE 
    WHEN overall_score >= 90 THEN 'excellent'
    WHEN overall_score >= 80 THEN 'good'
    WHEN overall_score >= 70 THEN 'acceptable'
    WHEN overall_score >= 60 THEN 'poor'
    ELSE 'critical'
  END as quality_rating
FROM data_integrity_reports
WHERE generated_at = (SELECT MAX(generated_at) FROM data_integrity_reports);

-- Function to get integrity trend
CREATE OR REPLACE FUNCTION get_integrity_trend(days_back integer DEFAULT 30)
RETURNS TABLE (
  report_date date,
  overall_score integer,
  total_checks integer,
  failed_checks integer,
  critical_issue_count integer
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    generated_at::date as report_date,
    r.overall_score,
    r.total_checks,
    r.failed_checks,
    array_length(r.critical_issues, 1) as critical_issue_count
  FROM data_integrity_reports r
  WHERE generated_at >= CURRENT_DATE - INTERVAL '1 day' * days_back
  ORDER BY generated_at DESC;
END;
$$ LANGUAGE plpgsql;

-- Grant permissions
GRANT EXECUTE ON FUNCTION check_invoice_line_items_account_integrity() TO authenticated;
GRANT EXECUTE ON FUNCTION check_overpayments() TO authenticated;
GRANT EXECUTE ON FUNCTION check_invoice_amount_consistency() TO authenticated;
GRANT EXECUTE ON FUNCTION check_currency_consistency() TO authenticated;
GRANT EXECUTE ON FUNCTION find_duplicate_contacts() TO authenticated;
GRANT EXECUTE ON FUNCTION get_integrity_trend(integer) TO authenticated;

GRANT SELECT ON data_integrity_reports TO authenticated;
GRANT INSERT ON data_integrity_reports TO service_role;
GRANT SELECT ON latest_integrity_summary TO authenticated;

-- Add comment
COMMENT ON TABLE data_integrity_reports IS 'Stores comprehensive data integrity check results for monitoring data quality over time';
