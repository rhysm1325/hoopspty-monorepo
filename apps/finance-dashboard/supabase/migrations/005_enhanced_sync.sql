-- Enhanced sync management for AUSA Finance Dashboard
-- Extends sync checkpoints with detailed tracking and monitoring

-- Create enum for sync status
CREATE TYPE sync_status AS ENUM (
  'idle',
  'running', 
  'completed',
  'error',
  'cancelled',
  'partial'
);

-- Alter sync_checkpoints to use enum and add more fields
ALTER TABLE sync_checkpoints 
  ALTER COLUMN sync_status TYPE sync_status USING sync_status::sync_status,
  ADD COLUMN sync_duration_seconds INTEGER DEFAULT 0,
  ADD COLUMN last_sync_started_at TIMESTAMPTZ,
  ADD COLUMN last_sync_completed_at TIMESTAMPTZ,
  ADD COLUMN last_successful_sync_at TIMESTAMPTZ,
  ADD COLUMN total_sync_count INTEGER DEFAULT 0,
  ADD COLUMN error_count INTEGER DEFAULT 0,
  ADD COLUMN last_error_at TIMESTAMPTZ,
  ADD COLUMN rate_limit_hits INTEGER DEFAULT 0,
  ADD COLUMN average_sync_duration_seconds INTEGER DEFAULT 0;

-- Create detailed sync logs table
CREATE TABLE sync_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  sync_session_id UUID NOT NULL, -- Groups related sync operations
  entity_type TEXT NOT NULL,
  sync_status sync_status NOT NULL,
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  duration_seconds INTEGER,
  records_requested INTEGER DEFAULT 0,
  records_received INTEGER DEFAULT 0,
  records_processed INTEGER DEFAULT 0,
  records_inserted INTEGER DEFAULT 0,
  records_updated INTEGER DEFAULT 0,
  records_failed INTEGER DEFAULT 0,
  api_calls_made INTEGER DEFAULT 0,
  rate_limit_hits INTEGER DEFAULT 0,
  error_message TEXT,
  error_details JSONB,
  performance_metrics JSONB DEFAULT '{}',
  initiated_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create sync sessions table for grouping related operations
CREATE TABLE sync_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_type TEXT NOT NULL, -- 'manual', 'scheduled', 'initial'
  sync_scope TEXT NOT NULL, -- 'full', 'incremental', 'entity_specific'
  target_entities TEXT[] DEFAULT '{}',
  status sync_status NOT NULL DEFAULT 'running',
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  total_duration_seconds INTEGER,
  total_records_processed INTEGER DEFAULT 0,
  total_api_calls INTEGER DEFAULT 0,
  success_rate DECIMAL(5,2), -- Percentage of successful operations
  initiated_by UUID REFERENCES auth.users(id),
  xero_tenant_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create sync performance metrics table
CREATE TABLE sync_performance_metrics (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  metric_date DATE NOT NULL,
  entity_type TEXT NOT NULL,
  total_syncs INTEGER DEFAULT 0,
  successful_syncs INTEGER DEFAULT 0,
  failed_syncs INTEGER DEFAULT 0,
  avg_duration_seconds DECIMAL(10,2) DEFAULT 0,
  avg_records_per_sync DECIMAL(10,2) DEFAULT 0,
  total_api_calls INTEGER DEFAULT 0,
  total_rate_limit_hits INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(metric_date, entity_type)
);

-- Add indexes for sync tables
CREATE INDEX idx_sync_logs_session ON sync_logs(sync_session_id);
CREATE INDEX idx_sync_logs_entity ON sync_logs(entity_type);
CREATE INDEX idx_sync_logs_status ON sync_logs(sync_status);
CREATE INDEX idx_sync_logs_started ON sync_logs(started_at);
CREATE INDEX idx_sync_logs_user ON sync_logs(initiated_by);

CREATE INDEX idx_sync_sessions_type ON sync_sessions(session_type);
CREATE INDEX idx_sync_sessions_status ON sync_sessions(status);
CREATE INDEX idx_sync_sessions_started ON sync_sessions(started_at);
CREATE INDEX idx_sync_sessions_user ON sync_sessions(initiated_by);

CREATE INDEX idx_sync_performance_date ON sync_performance_metrics(metric_date);
CREATE INDEX idx_sync_performance_entity ON sync_performance_metrics(entity_type);

-- Row Level Security for sync tables
ALTER TABLE sync_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE sync_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE sync_performance_metrics ENABLE ROW LEVEL SECURITY;

-- RLS policies for sync tables (admin access only)
CREATE POLICY "Admins can view sync logs" 
  ON sync_logs FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() 
      AND role IN ('owner', 'finance')
      AND is_active = true
    )
  );

CREATE POLICY "Admins can manage sync logs" 
  ON sync_logs FOR INSERT 
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() 
      AND role IN ('owner', 'finance')
      AND is_active = true
    )
  );

CREATE POLICY "Admins can view sync sessions" 
  ON sync_sessions FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() 
      AND role IN ('owner', 'finance')
      AND is_active = true
    )
  );

CREATE POLICY "Admins can manage sync sessions" 
  ON sync_sessions FOR ALL 
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() 
      AND role IN ('owner', 'finance')
      AND is_active = true
    )
  );

CREATE POLICY "Admins can view sync performance" 
  ON sync_performance_metrics FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() 
      AND role IN ('owner', 'finance')
      AND is_active = true
    )
  );

-- Create functions for sync checkpoint management

-- Function to update sync checkpoint
CREATE OR REPLACE FUNCTION update_sync_checkpoint(
  entity_type_param TEXT,
  last_updated_utc_param TIMESTAMPTZ,
  records_processed_param INTEGER,
  status_param sync_status,
  error_message_param TEXT DEFAULT NULL
)
RETURNS void AS $$
BEGIN
  INSERT INTO sync_checkpoints (
    entity_type,
    last_updated_utc,
    records_processed,
    sync_status,
    error_message,
    last_sync_started_at,
    last_sync_completed_at,
    total_sync_count
  )
  VALUES (
    entity_type_param,
    last_updated_utc_param,
    records_processed_param,
    status_param,
    error_message_param,
    CASE WHEN status_param = 'running' THEN NOW() ELSE NULL END,
    CASE WHEN status_param IN ('completed', 'error', 'cancelled') THEN NOW() ELSE NULL END,
    1
  )
  ON CONFLICT (entity_type) DO UPDATE SET
    last_updated_utc = EXCLUDED.last_updated_utc,
    records_processed = sync_checkpoints.records_processed + EXCLUDED.records_processed,
    sync_status = EXCLUDED.sync_status,
    error_message = EXCLUDED.error_message,
    last_sync_started_at = CASE 
      WHEN EXCLUDED.sync_status = 'running' THEN NOW() 
      ELSE sync_checkpoints.last_sync_started_at 
    END,
    last_sync_completed_at = CASE 
      WHEN EXCLUDED.sync_status IN ('completed', 'error', 'cancelled') THEN NOW() 
      ELSE sync_checkpoints.last_sync_completed_at 
    END,
    last_successful_sync_at = CASE 
      WHEN EXCLUDED.sync_status = 'completed' THEN NOW() 
      ELSE sync_checkpoints.last_successful_sync_at 
    END,
    total_sync_count = sync_checkpoints.total_sync_count + 1,
    error_count = CASE 
      WHEN EXCLUDED.sync_status = 'error' THEN sync_checkpoints.error_count + 1 
      ELSE sync_checkpoints.error_count 
    END,
    last_error_at = CASE 
      WHEN EXCLUDED.sync_status = 'error' THEN NOW() 
      ELSE sync_checkpoints.last_error_at 
    END,
    updated_at = NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get next sync entities (entities that need syncing)
CREATE OR REPLACE FUNCTION get_entities_needing_sync(
  max_age_hours INTEGER DEFAULT 24
)
RETURNS TABLE(
  entity_type TEXT,
  last_updated_utc TIMESTAMPTZ,
  hours_since_sync NUMERIC,
  sync_status sync_status,
  priority_score INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    sc.entity_type,
    sc.last_updated_utc,
    EXTRACT(EPOCH FROM (NOW() - sc.last_successful_sync_at)) / 3600 as hours_since_sync,
    sc.sync_status,
    -- Priority scoring: higher score = higher priority
    CASE 
      WHEN sc.sync_status = 'error' THEN 100
      WHEN sc.last_successful_sync_at IS NULL THEN 90
      WHEN EXTRACT(EPOCH FROM (NOW() - sc.last_successful_sync_at)) / 3600 > max_age_hours THEN 80
      WHEN sc.entity_type IN ('invoices', 'payments') THEN 70 -- High priority entities
      WHEN sc.entity_type IN ('contacts', 'accounts') THEN 60 -- Medium priority
      ELSE 50 -- Low priority
    END as priority_score
  FROM sync_checkpoints sc
  WHERE sc.sync_status != 'running'
    AND (
      sc.last_successful_sync_at IS NULL 
      OR EXTRACT(EPOCH FROM (NOW() - sc.last_successful_sync_at)) / 3600 > max_age_hours
      OR sc.sync_status = 'error'
    )
  ORDER BY priority_score DESC, sc.last_successful_sync_at ASC NULLS FIRST;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to calculate sync performance metrics
CREATE OR REPLACE FUNCTION calculate_sync_performance_metrics(
  target_date DATE DEFAULT CURRENT_DATE
)
RETURNS void AS $$
DECLARE
  entity_record RECORD;
BEGIN
  FOR entity_record IN 
    SELECT DISTINCT entity_type FROM sync_logs 
    WHERE DATE(started_at) = target_date
  LOOP
    INSERT INTO sync_performance_metrics (
      metric_date,
      entity_type,
      total_syncs,
      successful_syncs,
      failed_syncs,
      avg_duration_seconds,
      avg_records_per_sync,
      total_api_calls,
      total_rate_limit_hits
    )
    SELECT 
      target_date,
      entity_record.entity_type,
      COUNT(*),
      COUNT(*) FILTER (WHERE sync_status = 'completed'),
      COUNT(*) FILTER (WHERE sync_status = 'error'),
      AVG(duration_seconds),
      AVG(records_processed),
      SUM(api_calls_made),
      SUM(rate_limit_hits)
    FROM sync_logs
    WHERE DATE(started_at) = target_date
      AND entity_type = entity_record.entity_type
    ON CONFLICT (metric_date, entity_type) DO UPDATE SET
      total_syncs = EXCLUDED.total_syncs,
      successful_syncs = EXCLUDED.successful_syncs,
      failed_syncs = EXCLUDED.failed_syncs,
      avg_duration_seconds = EXCLUDED.avg_duration_seconds,
      avg_records_per_sync = EXCLUDED.avg_records_per_sync,
      total_api_calls = EXCLUDED.total_api_calls,
      total_rate_limit_hits = EXCLUDED.total_rate_limit_hits;
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create view for sync status dashboard
CREATE VIEW sync_status_dashboard AS
SELECT 
  sc.entity_type,
  sc.sync_status,
  sc.last_updated_utc,
  sc.records_processed,
  sc.last_successful_sync_at,
  sc.total_sync_count,
  sc.error_count,
  sc.last_error_at,
  sc.error_message,
  EXTRACT(EPOCH FROM (NOW() - sc.last_successful_sync_at)) / 3600 as hours_since_last_sync,
  CASE 
    WHEN sc.sync_status = 'error' THEN 'error'
    WHEN sc.last_successful_sync_at IS NULL THEN 'never_synced'
    WHEN EXTRACT(EPOCH FROM (NOW() - sc.last_successful_sync_at)) / 3600 > 25 THEN 'overdue'
    WHEN EXTRACT(EPOCH FROM (NOW() - sc.last_successful_sync_at)) / 3600 > 20 THEN 'warning'
    ELSE 'healthy'
  END as health_status,
  -- Performance indicators
  CASE 
    WHEN sc.total_sync_count > 0 THEN 
      ROUND((sc.total_sync_count - sc.error_count)::DECIMAL / sc.total_sync_count * 100, 2)
    ELSE 0 
  END as success_rate_percent
FROM sync_checkpoints sc
ORDER BY 
  CASE sc.sync_status 
    WHEN 'error' THEN 1
    WHEN 'running' THEN 2
    ELSE 3
  END,
  sc.last_successful_sync_at ASC NULLS FIRST;

-- Create view for recent sync activity
CREATE VIEW recent_sync_activity AS
SELECT 
  sl.sync_session_id,
  ss.session_type,
  sl.entity_type,
  sl.sync_status,
  sl.started_at,
  sl.completed_at,
  sl.duration_seconds,
  sl.records_processed,
  sl.error_message,
  ss.initiated_by,
  p.email as initiated_by_email,
  p.first_name || ' ' || COALESCE(p.last_name, '') as initiated_by_name
FROM sync_logs sl
JOIN sync_sessions ss ON sl.sync_session_id = ss.id
LEFT JOIN profiles p ON ss.initiated_by = p.id
WHERE sl.started_at > NOW() - INTERVAL '7 days'
ORDER BY sl.started_at DESC;

-- Create view for sync performance trends
CREATE VIEW sync_performance_trends AS
SELECT 
  spm.metric_date,
  spm.entity_type,
  spm.total_syncs,
  spm.successful_syncs,
  spm.failed_syncs,
  ROUND(spm.successful_syncs::DECIMAL / NULLIF(spm.total_syncs, 0) * 100, 2) as success_rate,
  spm.avg_duration_seconds,
  spm.avg_records_per_sync,
  spm.total_api_calls,
  spm.total_rate_limit_hits,
  -- Trend indicators (compared to previous day)
  LAG(spm.successful_syncs) OVER (PARTITION BY spm.entity_type ORDER BY spm.metric_date) as prev_day_successful,
  LAG(spm.avg_duration_seconds) OVER (PARTITION BY spm.entity_type ORDER BY spm.metric_date) as prev_day_duration
FROM sync_performance_metrics spm
WHERE spm.metric_date > CURRENT_DATE - INTERVAL '30 days'
ORDER BY spm.metric_date DESC, spm.entity_type;

-- Add additional indexes for sync enhancement
CREATE INDEX idx_sync_logs_session ON sync_logs(sync_session_id);
CREATE INDEX idx_sync_logs_entity_status ON sync_logs(entity_type, sync_status);
CREATE INDEX idx_sync_logs_started ON sync_logs(started_at);
CREATE INDEX idx_sync_logs_duration ON sync_logs(duration_seconds);

CREATE INDEX idx_sync_sessions_type ON sync_sessions(session_type);
CREATE INDEX idx_sync_sessions_status ON sync_sessions(status);
CREATE INDEX idx_sync_sessions_started ON sync_sessions(started_at);
CREATE INDEX idx_sync_sessions_user ON sync_sessions(initiated_by);

-- Enhanced sync checkpoints indexes
CREATE INDEX idx_sync_checkpoints_status ON sync_checkpoints(sync_status);
CREATE INDEX idx_sync_checkpoints_last_sync ON sync_checkpoints(last_successful_sync_at);
CREATE INDEX idx_sync_checkpoints_error_count ON sync_checkpoints(error_count);

-- Grant permissions
GRANT ALL ON sync_logs TO authenticated;
GRANT ALL ON sync_sessions TO authenticated;
GRANT ALL ON sync_performance_metrics TO authenticated;
GRANT EXECUTE ON FUNCTION update_sync_checkpoint(TEXT, TIMESTAMPTZ, INTEGER, sync_status, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION get_entities_needing_sync(INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION calculate_sync_performance_metrics(DATE) TO authenticated;

-- Insert default sync configuration
INSERT INTO config_mappings (key, type, value, description) VALUES
  -- Sync priority settings
  ('high_priority_entities', 'sync_schedule', '["invoices", "payments", "bank_transactions"]', 'Entities to sync first'),
  ('medium_priority_entities', 'sync_schedule', '["contacts", "items", "credit_notes"]', 'Entities to sync second'),
  ('low_priority_entities', 'sync_schedule', '["accounts", "tracking_categories", "manual_journals"]', 'Entities to sync last'),
  
  -- Sync performance settings
  ('max_concurrent_syncs', 'sync_schedule', '3', 'Maximum concurrent entity syncs'),
  ('retry_attempts', 'sync_schedule', '3', 'Number of retry attempts for failed syncs'),
  ('retry_delay_seconds', 'sync_schedule', '60', 'Delay between retry attempts'),
  
  -- Sync monitoring settings
  ('alert_on_sync_failure', 'sync_schedule', 'true', 'Create alerts for sync failures'),
  ('alert_on_long_duration', 'sync_schedule', 'true', 'Create alerts for unusually long syncs'),
  ('max_expected_duration_minutes', 'sync_schedule', '15', 'Expected maximum sync duration'),
  
  -- Data validation settings
  ('validate_data_integrity', 'sync_schedule', 'true', 'Validate data integrity after sync'),
  ('auto_resolve_conflicts', 'sync_schedule', 'false', 'Automatically resolve data conflicts'),
  ('backup_before_sync', 'sync_schedule', 'false', 'Create backup before major sync operations');

-- Create function to start new sync session
CREATE OR REPLACE FUNCTION start_sync_session(
  session_type_param TEXT,
  sync_scope_param TEXT,
  target_entities_param TEXT[],
  initiated_by_param UUID,
  xero_tenant_id_param TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  session_id UUID;
BEGIN
  INSERT INTO sync_sessions (
    session_type,
    sync_scope,
    target_entities,
    initiated_by,
    xero_tenant_id
  )
  VALUES (
    session_type_param,
    sync_scope_param,
    target_entities_param,
    initiated_by_param,
    xero_tenant_id_param
  )
  RETURNING id INTO session_id;
  
  RETURN session_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to complete sync session
CREATE OR REPLACE FUNCTION complete_sync_session(
  session_id_param UUID,
  status_param sync_status
)
RETURNS void AS $$
DECLARE
  session_stats RECORD;
BEGIN
  -- Calculate session statistics
  SELECT 
    COUNT(*) as total_operations,
    SUM(records_processed) as total_records,
    SUM(api_calls_made) as total_api_calls,
    AVG(duration_seconds) as avg_duration,
    COUNT(*) FILTER (WHERE sync_status = 'completed') as successful_operations
  INTO session_stats
  FROM sync_logs
  WHERE sync_session_id = session_id_param;
  
  -- Update session with completion data
  UPDATE sync_sessions SET
    status = status_param,
    completed_at = NOW(),
    total_duration_seconds = EXTRACT(EPOCH FROM (NOW() - started_at)),
    total_records_processed = session_stats.total_records,
    total_api_calls = session_stats.total_api_calls,
    success_rate = CASE 
      WHEN session_stats.total_operations > 0 THEN 
        (session_stats.successful_operations::DECIMAL / session_stats.total_operations * 100)
      ELSE 0 
    END
  WHERE id = session_id_param;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Comments for documentation
COMMENT ON TABLE sync_logs IS 'Detailed logs of individual sync operations for monitoring and debugging';
COMMENT ON TABLE sync_sessions IS 'Sync session grouping for related operations (manual, scheduled, etc.)';
COMMENT ON TABLE sync_performance_metrics IS 'Daily aggregated sync performance metrics for trend analysis';

COMMENT ON COLUMN sync_checkpoints.sync_duration_seconds IS 'Duration of last sync operation in seconds';
COMMENT ON COLUMN sync_checkpoints.total_sync_count IS 'Total number of sync operations performed';
COMMENT ON COLUMN sync_checkpoints.error_count IS 'Number of failed sync operations';
COMMENT ON COLUMN sync_checkpoints.rate_limit_hits IS 'Number of times rate limited by Xero API';

COMMENT ON COLUMN sync_logs.sync_session_id IS 'Groups related sync operations together';
COMMENT ON COLUMN sync_logs.performance_metrics IS 'JSON metrics like response times, memory usage, etc.';
COMMENT ON COLUMN sync_logs.api_calls_made IS 'Number of Xero API calls made during this operation';

COMMENT ON VIEW sync_status_dashboard IS 'Real-time sync status overview for admin dashboard';
COMMENT ON VIEW recent_sync_activity IS 'Recent sync operations with user context';
COMMENT ON VIEW sync_performance_trends IS 'Sync performance trends over time with comparisons';
