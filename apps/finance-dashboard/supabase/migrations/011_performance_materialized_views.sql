-- Additional materialized views for performance optimization
-- Extends the existing analytics views with more specific dashboard optimizations

-- Materialized view for inventory summary (Dr Dish focus)
CREATE MATERIALIZED VIEW fact_inventory_summary AS
SELECT 
  i.product_category,
  i.product_line,
  COUNT(DISTINCT i.item_key) as item_count,
  SUM(CASE WHEN im.quantity_after > 0 THEN im.quantity_after ELSE 0 END) as total_units_on_hand,
  SUM(CASE WHEN im.quantity_after > 0 THEN im.total_value ELSE 0 END) as total_inventory_value,
  AVG(CASE WHEN im.quantity_after > 0 THEN im.unit_cost ELSE NULL END) as avg_unit_cost,
  -- Reorder alerts count
  COUNT(CASE WHEN im.quantity_after <= i.reorder_level AND i.reorder_level > 0 THEN 1 END) as reorder_alerts,
  -- Last updated
  MAX(im.created_at) as last_updated
FROM dim_item i
LEFT JOIN LATERAL (
  SELECT DISTINCT ON (item_key) 
    item_key, quantity_after, total_value, unit_cost, created_at
  FROM fact_inventory_movements 
  WHERE item_key = i.item_key 
  ORDER BY item_key, created_at DESC
) im ON i.item_key = im.item_key
WHERE i.is_dr_dish_product = true
  AND i.is_active = true
GROUP BY i.product_category, i.product_line
ORDER BY total_inventory_value DESC;

-- Materialized view for customer performance metrics
CREATE MATERIALIZED VIEW fact_customer_performance AS
SELECT 
  c.contact_key,
  c.name as customer_name,
  c.customer_segment,
  -- Current FY metrics
  COUNT(CASE WHEN d.fy_year = EXTRACT(YEAR FROM CURRENT_DATE) - CASE WHEN EXTRACT(MONTH FROM CURRENT_DATE) < 7 THEN 1 ELSE 0 END THEN ar.ar_key END) as current_fy_invoices,
  SUM(CASE WHEN d.fy_year = EXTRACT(YEAR FROM CURRENT_DATE) - CASE WHEN EXTRACT(MONTH FROM CURRENT_DATE) < 7 THEN 1 ELSE 0 END THEN ar.total_amount ELSE 0 END) as current_fy_revenue,
  -- Prior FY metrics  
  COUNT(CASE WHEN d.fy_year = EXTRACT(YEAR FROM CURRENT_DATE) - CASE WHEN EXTRACT(MONTH FROM CURRENT_DATE) < 7 THEN 1 ELSE 0 END - 1 THEN ar.ar_key END) as prior_fy_invoices,
  SUM(CASE WHEN d.fy_year = EXTRACT(YEAR FROM CURRENT_DATE) - CASE WHEN EXTRACT(MONTH FROM CURRENT_DATE) < 7 THEN 1 ELSE 0 END - 1 THEN ar.total_amount ELSE 0 END) as prior_fy_revenue,
  -- Outstanding metrics
  SUM(CASE WHEN ar.outstanding_amount > 0 THEN ar.outstanding_amount ELSE 0 END) as total_outstanding,
  MAX(CASE WHEN ar.outstanding_amount > 0 THEN ar.days_past_due ELSE 0 END) as max_days_past_due,
  COUNT(CASE WHEN ar.outstanding_amount > 0 THEN ar.ar_key END) as outstanding_invoices,
  -- Customer health indicators
  CASE 
    WHEN MAX(CASE WHEN ar.outstanding_amount > 0 THEN ar.days_past_due ELSE 0 END) > 90 THEN 'high_risk'
    WHEN MAX(CASE WHEN ar.outstanding_amount > 0 THEN ar.days_past_due ELSE 0 END) > 60 THEN 'medium_risk'
    WHEN SUM(CASE WHEN ar.outstanding_amount > 0 THEN ar.outstanding_amount ELSE 0 END) > 0 THEN 'low_risk'
    ELSE 'good'
  END as risk_category,
  -- Last transaction date
  MAX(ar.date_key) as last_transaction_date
FROM dim_contact c
JOIN fact_ar_lines ar ON c.contact_key = ar.contact_key
JOIN dim_date d ON ar.date_key = d.date_key
WHERE c.is_customer = true 
  AND c.is_active = true
  AND ar.invoice_status IN ('AUTHORISED', 'PAID')
GROUP BY c.contact_key, c.name, c.customer_segment
HAVING SUM(ar.total_amount) > 0 -- Only customers with revenue
ORDER BY current_fy_revenue DESC;

-- Materialized view for supplier performance metrics
CREATE MATERIALIZED VIEW fact_supplier_performance AS
SELECT 
  c.contact_key,
  c.name as supplier_name,
  c.supplier_category,
  -- Current FY metrics
  COUNT(CASE WHEN d.fy_year = EXTRACT(YEAR FROM CURRENT_DATE) - CASE WHEN EXTRACT(MONTH FROM CURRENT_DATE) < 7 THEN 1 ELSE 0 END THEN ap.ap_key END) as current_fy_bills,
  SUM(CASE WHEN d.fy_year = EXTRACT(YEAR FROM CURRENT_DATE) - CASE WHEN EXTRACT(MONTH FROM CURRENT_DATE) < 7 THEN 1 ELSE 0 END THEN ap.total_amount ELSE 0 END) as current_fy_spend,
  -- Outstanding metrics
  SUM(CASE WHEN ap.outstanding_amount > 0 THEN ap.outstanding_amount ELSE 0 END) as total_outstanding,
  MAX(CASE WHEN ap.outstanding_amount > 0 THEN ap.days_past_due ELSE 0 END) as max_days_past_due,
  COUNT(CASE WHEN ap.outstanding_amount > 0 THEN ap.ap_key END) as outstanding_bills,
  -- Payment performance
  AVG(CASE WHEN ap.outstanding_amount = 0 THEN ap.days_past_due ELSE NULL END) as avg_payment_days,
  -- Last transaction date
  MAX(ap.date_key) as last_transaction_date
FROM dim_contact c
JOIN fact_ap_lines ap ON c.contact_key = ap.contact_key
JOIN dim_date d ON ap.date_key = d.date_key
WHERE c.is_supplier = true 
  AND c.is_active = true
GROUP BY c.contact_key, c.name, c.supplier_category
HAVING SUM(ap.total_amount) > 0 -- Only suppliers with spend
ORDER BY current_fy_spend DESC;

-- Materialized view for revenue stream performance by quarter
CREATE MATERIALIZED VIEW fact_revenue_by_quarter AS
SELECT 
  d.fy_year,
  d.fy_quarter,
  d.fy_label,
  d.quarter_label,
  ar.revenue_stream,
  COUNT(*) as invoice_count,
  SUM(ar.line_amount) as gross_revenue,
  SUM(ar.tax_amount) as tax_amount,
  SUM(ar.total_amount) as total_revenue,
  AVG(ar.total_amount) as avg_invoice_value,
  MIN(d.date_key) as quarter_start_date,
  MAX(d.date_key) as quarter_end_date
FROM fact_ar_lines ar
JOIN dim_date d ON ar.date_key = d.date_key
WHERE ar.invoice_status IN ('AUTHORISED', 'PAID')
GROUP BY d.fy_year, d.fy_quarter, d.fy_label, d.quarter_label, ar.revenue_stream
ORDER BY d.fy_year, d.fy_quarter, ar.revenue_stream;

-- Materialized view for top performing items (Dr Dish focus)
CREATE MATERIALIZED VIEW fact_top_items_performance AS
SELECT 
  i.item_key,
  i.code as item_code,
  i.name as item_name,
  i.product_category,
  i.product_line,
  -- Current FY performance
  COUNT(CASE WHEN d.fy_year = EXTRACT(YEAR FROM CURRENT_DATE) - CASE WHEN EXTRACT(MONTH FROM CURRENT_DATE) < 7 THEN 1 ELSE 0 END THEN ar.ar_key END) as current_fy_sales_count,
  SUM(CASE WHEN d.fy_year = EXTRACT(YEAR FROM CURRENT_DATE) - CASE WHEN EXTRACT(MONTH FROM CURRENT_DATE) < 7 THEN 1 ELSE 0 END THEN ar.quantity ELSE 0 END) as current_fy_units_sold,
  SUM(CASE WHEN d.fy_year = EXTRACT(YEAR FROM CURRENT_DATE) - CASE WHEN EXTRACT(MONTH FROM CURRENT_DATE) < 7 THEN 1 ELSE 0 END THEN ar.total_amount ELSE 0 END) as current_fy_revenue,
  AVG(CASE WHEN d.fy_year = EXTRACT(YEAR FROM CURRENT_DATE) - CASE WHEN EXTRACT(MONTH FROM CURRENT_DATE) < 7 THEN 1 ELSE 0 END THEN ar.unit_price END) as current_fy_avg_price,
  -- Prior FY performance
  SUM(CASE WHEN d.fy_year = EXTRACT(YEAR FROM CURRENT_DATE) - CASE WHEN EXTRACT(MONTH FROM CURRENT_DATE) < 7 THEN 1 ELSE 0 END - 1 THEN ar.quantity ELSE 0 END) as prior_fy_units_sold,
  SUM(CASE WHEN d.fy_year = EXTRACT(YEAR FROM CURRENT_DATE) - CASE WHEN EXTRACT(MONTH FROM CURRENT_DATE) < 7 THEN 1 ELSE 0 END - 1 THEN ar.total_amount ELSE 0 END) as prior_fy_revenue,
  -- Performance indicators
  CASE 
    WHEN SUM(CASE WHEN d.fy_year = EXTRACT(YEAR FROM CURRENT_DATE) - CASE WHEN EXTRACT(MONTH FROM CURRENT_DATE) < 7 THEN 1 ELSE 0 END - 1 THEN ar.quantity ELSE 0 END) > 0 
    THEN (SUM(CASE WHEN d.fy_year = EXTRACT(YEAR FROM CURRENT_DATE) - CASE WHEN EXTRACT(MONTH FROM CURRENT_DATE) < 7 THEN 1 ELSE 0 END THEN ar.quantity ELSE 0 END) - SUM(CASE WHEN d.fy_year = EXTRACT(YEAR FROM CURRENT_DATE) - CASE WHEN EXTRACT(MONTH FROM CURRENT_DATE) < 7 THEN 1 ELSE 0 END - 1 THEN ar.quantity ELSE 0 END)) * 100.0 / SUM(CASE WHEN d.fy_year = EXTRACT(YEAR FROM CURRENT_DATE) - CASE WHEN EXTRACT(MONTH FROM CURRENT_DATE) < 7 THEN 1 ELSE 0 END - 1 THEN ar.quantity ELSE 0 END)
    ELSE NULL
  END as units_growth_percent,
  -- Margin estimates (using standard cost)
  SUM(CASE WHEN d.fy_year = EXTRACT(YEAR FROM CURRENT_DATE) - CASE WHEN EXTRACT(MONTH FROM CURRENT_DATE) < 7 THEN 1 ELSE 0 END THEN ar.total_amount ELSE 0 END) - 
  SUM(CASE WHEN d.fy_year = EXTRACT(YEAR FROM CURRENT_DATE) - CASE WHEN EXTRACT(MONTH FROM CURRENT_DATE) < 7 THEN 1 ELSE 0 END THEN ar.quantity * COALESCE(i.standard_cost, 0) ELSE 0 END) as estimated_gross_margin,
  -- Last sale date
  MAX(ar.date_key) as last_sale_date
FROM dim_item i
LEFT JOIN fact_ar_lines ar ON i.item_key = ar.item_key AND ar.invoice_status IN ('AUTHORISED', 'PAID')
LEFT JOIN dim_date d ON ar.date_key = d.date_key
WHERE i.is_dr_dish_product = true 
  AND i.is_active = true
GROUP BY i.item_key, i.code, i.name, i.product_category, i.product_line
HAVING SUM(ar.total_amount) > 0 -- Only items with sales
ORDER BY current_fy_revenue DESC;

-- Materialized view for cash flow trends (13-week rolling)
CREATE MATERIALIZED VIEW fact_cash_flow_trends AS
WITH weekly_cash_flows AS (
  SELECT 
    d.fy_year,
    d.fy_week,
    d.date_key,
    -- AR collections (payments received)
    COALESCE(SUM(CASE WHEN p.payment_type = 'ACCRECPAYMENT' THEN p.payment_amount END), 0) as ar_collections,
    -- AP payments (payments made)
    COALESCE(SUM(CASE WHEN p.payment_type = 'ACCPAYPAYMENT' THEN p.payment_amount END), 0) as ap_payments,
    -- Net cash flow
    COALESCE(SUM(CASE WHEN p.payment_type = 'ACCRECPAYMENT' THEN p.payment_amount END), 0) - 
    COALESCE(SUM(CASE WHEN p.payment_type = 'ACCPAYPAYMENT' THEN p.payment_amount END), 0) as net_cash_flow
  FROM dim_date d
  LEFT JOIN fact_payments p ON d.date_key = p.date_key
  WHERE d.date_key >= CURRENT_DATE - INTERVAL '13 weeks'
  GROUP BY d.fy_year, d.fy_week, d.date_key
)
SELECT 
  fy_year,
  fy_week,
  date_key,
  ar_collections,
  ap_payments,
  net_cash_flow,
  -- Running totals (13-week window)
  SUM(ar_collections) OVER (ORDER BY date_key ROWS BETWEEN 12 PRECEDING AND CURRENT ROW) as rolling_13w_collections,
  SUM(ap_payments) OVER (ORDER BY date_key ROWS BETWEEN 12 PRECEDING AND CURRENT ROW) as rolling_13w_payments,
  SUM(net_cash_flow) OVER (ORDER BY date_key ROWS BETWEEN 12 PRECEDING AND CURRENT ROW) as rolling_13w_net_flow,
  -- Moving averages
  AVG(ar_collections) OVER (ORDER BY date_key ROWS BETWEEN 3 PRECEDING AND CURRENT ROW) as avg_4w_collections,
  AVG(ap_payments) OVER (ORDER BY date_key ROWS BETWEEN 3 PRECEDING AND CURRENT ROW) as avg_4w_payments,
  AVG(net_cash_flow) OVER (ORDER BY date_key ROWS BETWEEN 3 PRECEDING AND CURRENT ROW) as avg_4w_net_flow
FROM weekly_cash_flows
ORDER BY date_key;

-- Materialized view for executive dashboard summary
CREATE MATERIALIZED VIEW fact_executive_summary AS
WITH current_fy AS (
  SELECT EXTRACT(YEAR FROM CURRENT_DATE) - CASE WHEN EXTRACT(MONTH FROM CURRENT_DATE) < 7 THEN 1 ELSE 0 END as fy_year
),
cash_position AS (
  SELECT SUM(running_balance) as total_cash
  FROM fact_cash_position
),
ar_summary AS (
  SELECT 
    SUM(outstanding_amount) as total_ar,
    COUNT(*) as ar_invoice_count,
    SUM(CASE WHEN days_past_due > 45 THEN outstanding_amount ELSE 0 END) as overdue_ar
  FROM fact_ar_lines 
  WHERE outstanding_amount > 0
),
ap_summary AS (
  SELECT 
    SUM(outstanding_amount) as total_ap,
    COUNT(*) as ap_bill_count,
    SUM(CASE WHEN days_past_due > 60 THEN outstanding_amount ELSE 0 END) as overdue_ap
  FROM fact_ap_lines 
  WHERE outstanding_amount > 0
),
revenue_summary AS (
  SELECT 
    SUM(CASE WHEN d.fy_year = (SELECT fy_year FROM current_fy) THEN ar.total_amount ELSE 0 END) as current_fy_revenue,
    SUM(CASE WHEN d.fy_year = (SELECT fy_year FROM current_fy) - 1 THEN ar.total_amount ELSE 0 END) as prior_fy_revenue,
    COUNT(CASE WHEN d.fy_year = (SELECT fy_year FROM current_fy) THEN ar.ar_key END) as current_fy_invoices
  FROM fact_ar_lines ar
  JOIN dim_date d ON ar.date_key = d.date_key
  WHERE ar.invoice_status IN ('AUTHORISED', 'PAID')
    AND d.fy_year >= (SELECT fy_year FROM current_fy) - 1
),
inventory_summary AS (
  SELECT 
    COALESCE(SUM(total_inventory_value), 0) as total_inventory_value,
    COALESCE(SUM(reorder_alerts), 0) as total_reorder_alerts
  FROM fact_inventory_summary
)
SELECT 
  (SELECT fy_year FROM current_fy) as fy_year,
  'FY ' || (SELECT fy_year FROM current_fy) || '-' || RIGHT(((SELECT fy_year FROM current_fy) + 1)::text, 2) as fy_label,
  -- Cash metrics
  cp.total_cash,
  -- AR metrics
  ar.total_ar,
  ar.ar_invoice_count,
  ar.overdue_ar,
  -- AP metrics
  ap.total_ap,
  ap.ap_bill_count,
  ap.overdue_ap,
  -- Net working capital
  ar.total_ar - ap.total_ap as net_working_capital,
  -- Revenue metrics
  rs.current_fy_revenue,
  rs.prior_fy_revenue,
  rs.current_fy_invoices,
  -- Revenue growth
  CASE 
    WHEN rs.prior_fy_revenue > 0 
    THEN (rs.current_fy_revenue - rs.prior_fy_revenue) * 100.0 / rs.prior_fy_revenue 
    ELSE NULL 
  END as revenue_growth_percent,
  -- Inventory metrics
  inv.total_inventory_value,
  inv.total_reorder_alerts,
  -- Last updated
  CURRENT_TIMESTAMP as last_updated
FROM cash_position cp
CROSS JOIN ar_summary ar
CROSS JOIN ap_summary ap
CROSS JOIN revenue_summary rs
CROSS JOIN inventory_summary inv;

-- Create indexes for materialized views
CREATE INDEX idx_fact_inventory_summary_category ON fact_inventory_summary(product_category);
CREATE INDEX idx_fact_customer_performance_segment ON fact_customer_performance(customer_segment);
CREATE INDEX idx_fact_customer_performance_risk ON fact_customer_performance(risk_category);
CREATE INDEX idx_fact_supplier_performance_category ON fact_supplier_performance(supplier_category);
CREATE INDEX idx_fact_revenue_by_quarter_fy ON fact_revenue_by_quarter(fy_year, fy_quarter);
CREATE INDEX idx_fact_revenue_by_quarter_stream ON fact_revenue_by_quarter(revenue_stream);
CREATE INDEX idx_fact_top_items_category ON fact_top_items_performance(product_category);
CREATE INDEX idx_fact_cash_flow_trends_date ON fact_cash_flow_trends(date_key);

-- Update the refresh function to include new materialized views
CREATE OR REPLACE FUNCTION refresh_analytics_views()
RETURNS void AS $$
BEGIN
  -- Refresh existing views
  REFRESH MATERIALIZED VIEW fact_revenue_by_week;
  REFRESH MATERIALIZED VIEW fact_cash_position;
  REFRESH MATERIALIZED VIEW fact_aging_summary;
  
  -- Refresh new performance optimization views
  REFRESH MATERIALIZED VIEW fact_inventory_summary;
  REFRESH MATERIALIZED VIEW fact_customer_performance;
  REFRESH MATERIALIZED VIEW fact_supplier_performance;
  REFRESH MATERIALIZED VIEW fact_revenue_by_quarter;
  REFRESH MATERIALIZED VIEW fact_top_items_performance;
  REFRESH MATERIALIZED VIEW fact_cash_flow_trends;
  REFRESH MATERIALIZED VIEW fact_executive_summary;
  
  -- Log refresh completion
  INSERT INTO audit_logs (user_id, action, resource_type, resource_id, details)
  VALUES (
    'system',
    'refresh_materialized_views',
    'analytics',
    'all_views',
    jsonb_build_object(
      'refreshed_at', CURRENT_TIMESTAMP,
      'views_count', 10
    )
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create a function to refresh views concurrently for better performance
CREATE OR REPLACE FUNCTION refresh_analytics_views_concurrent()
RETURNS void AS $$
BEGIN
  -- Refresh views that can be done concurrently
  REFRESH MATERIALIZED VIEW CONCURRENTLY fact_revenue_by_week;
  REFRESH MATERIALIZED VIEW CONCURRENTLY fact_cash_position;
  REFRESH MATERIALIZED VIEW CONCURRENTLY fact_aging_summary;
  REFRESH MATERIALIZED VIEW CONCURRENTLY fact_inventory_summary;
  REFRESH MATERIALIZED VIEW CONCURRENTLY fact_customer_performance;
  REFRESH MATERIALIZED VIEW CONCURRENTLY fact_supplier_performance;
  REFRESH MATERIALIZED VIEW CONCURRENTLY fact_revenue_by_quarter;
  REFRESH MATERIALIZED VIEW CONCURRENTLY fact_top_items_performance;
  REFRESH MATERIALIZED VIEW CONCURRENTLY fact_cash_flow_trends;
  
  -- Executive summary depends on others, refresh last
  REFRESH MATERIALIZED VIEW fact_executive_summary;
  
  -- Log refresh completion
  INSERT INTO audit_logs (user_id, action, resource_type, resource_id, details)
  VALUES (
    'system',
    'refresh_materialized_views_concurrent',
    'analytics',
    'all_views',
    jsonb_build_object(
      'refreshed_at', CURRENT_TIMESTAMP,
      'views_count', 10,
      'method', 'concurrent'
    )
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create a function to get materialized view refresh status
CREATE OR REPLACE FUNCTION get_materialized_view_status()
RETURNS TABLE (
  view_name text,
  last_refresh timestamptz,
  size_bytes bigint,
  row_count bigint
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    schemaname || '.' || matviewname as view_name,
    NULL::timestamptz as last_refresh, -- Would need to track this separately
    pg_total_relation_size(schemaname || '.' || matviewname) as size_bytes,
    (SELECT reltuples::bigint FROM pg_class WHERE relname = matviewname) as row_count
  FROM pg_matviews 
  WHERE schemaname = 'public' 
    AND matviewname LIKE 'fact_%'
  ORDER BY view_name;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permissions
GRANT EXECUTE ON FUNCTION refresh_analytics_views() TO authenticated;
GRANT EXECUTE ON FUNCTION refresh_analytics_views_concurrent() TO authenticated;
GRANT EXECUTE ON FUNCTION get_materialized_view_status() TO authenticated;

-- Comments for documentation
COMMENT ON MATERIALIZED VIEW fact_inventory_summary IS 'Aggregated Dr Dish inventory metrics by product category and line';
COMMENT ON MATERIALIZED VIEW fact_customer_performance IS 'Customer performance metrics including YTD vs prior year and risk categorization';
COMMENT ON MATERIALIZED VIEW fact_supplier_performance IS 'Supplier performance metrics including spend analysis and payment behavior';
COMMENT ON MATERIALIZED VIEW fact_revenue_by_quarter IS 'Revenue aggregated by financial year quarter for trend analysis';
COMMENT ON MATERIALIZED VIEW fact_top_items_performance IS 'Top performing Dr Dish items with YTD vs prior year comparison';
COMMENT ON MATERIALIZED VIEW fact_cash_flow_trends IS '13-week rolling cash flow trends with moving averages';
COMMENT ON MATERIALIZED VIEW fact_executive_summary IS 'Executive dashboard summary with key financial metrics';

COMMENT ON FUNCTION refresh_analytics_views() IS 'Refresh all materialized views sequentially';
COMMENT ON FUNCTION refresh_analytics_views_concurrent() IS 'Refresh materialized views concurrently for better performance';
COMMENT ON FUNCTION get_materialized_view_status() IS 'Get status information for all materialized views';
