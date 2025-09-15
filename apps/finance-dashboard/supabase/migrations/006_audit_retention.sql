-- Audit log retention and management enhancements
-- Implements data retention policies and audit log management features

-- Create audit log retention configuration
CREATE TABLE audit_retention_policies (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  policy_name TEXT NOT NULL UNIQUE,
  retention_days INTEGER NOT NULL,
  applies_to_actions audit_action[] DEFAULT '{}',
  applies_to_user_roles user_role[] DEFAULT '{}',
  auto_archive BOOLEAN NOT NULL DEFAULT true,
  archive_to_cold_storage BOOLEAN NOT NULL DEFAULT false,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create archived audit logs table for long-term storage
CREATE TABLE audit_logs_archive (
  id UUID PRIMARY KEY,
  user_id UUID,
  action audit_action NOT NULL,
  details JSONB DEFAULT '{}',
  ip_address INET,
  user_agent TEXT,
  timestamp TIMESTAMPTZ NOT NULL,
  archived_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  retention_policy_id UUID REFERENCES audit_retention_policies(id)
);

-- Create audit log summary table for reporting
CREATE TABLE audit_log_summaries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  summary_date DATE NOT NULL,
  action audit_action NOT NULL,
  user_role user_role,
  event_count INTEGER NOT NULL DEFAULT 0,
  unique_users INTEGER NOT NULL DEFAULT 0,
  unique_ips INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(summary_date, action, user_role)
);

-- Add indexes for audit retention tables
CREATE INDEX idx_audit_retention_policies_active ON audit_retention_policies(is_active);
CREATE INDEX idx_audit_retention_policies_days ON audit_retention_policies(retention_days);

CREATE INDEX idx_audit_logs_archive_timestamp ON audit_logs_archive(timestamp);
CREATE INDEX idx_audit_logs_archive_action ON audit_logs_archive(action);
CREATE INDEX idx_audit_logs_archive_archived_at ON audit_logs_archive(archived_at);
CREATE INDEX idx_audit_logs_archive_policy ON audit_logs_archive(retention_policy_id);

CREATE INDEX idx_audit_summaries_date ON audit_log_summaries(summary_date);
CREATE INDEX idx_audit_summaries_action ON audit_log_summaries(action);
CREATE INDEX idx_audit_summaries_role ON audit_log_summaries(user_role);

-- Add partitioning to audit_logs for better performance (by month)
-- Note: This would typically be done at table creation, but we're enhancing existing table
-- In production, consider partitioning strategy for large audit volumes

-- Row Level Security for audit retention tables
ALTER TABLE audit_retention_policies ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs_archive ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_log_summaries ENABLE ROW LEVEL SECURITY;

-- RLS policies for audit retention (admin only)
CREATE POLICY "Admins can manage retention policies" 
  ON audit_retention_policies FOR ALL 
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() 
      AND role IN ('owner', 'finance')
      AND is_active = true
    )
  );

CREATE POLICY "Admins can view archived audit logs" 
  ON audit_logs_archive FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() 
      AND role IN ('owner', 'finance')
      AND is_active = true
    )
  );

CREATE POLICY "Admins can view audit summaries" 
  ON audit_log_summaries FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() 
      AND role IN ('owner', 'finance')
      AND is_active = true
    )
  );

-- Create function to apply retention policies
CREATE OR REPLACE FUNCTION apply_audit_retention_policies()
RETURNS TABLE(
  policy_name TEXT,
  records_archived INTEGER,
  records_deleted INTEGER,
  execution_time_ms INTEGER
) AS $$
DECLARE
  policy_record RECORD;
  start_time TIMESTAMPTZ;
  end_time TIMESTAMPTZ;
  archived_count INTEGER;
  deleted_count INTEGER;
BEGIN
  FOR policy_record IN 
    SELECT * FROM audit_retention_policies WHERE is_active = true
  LOOP
    start_time := clock_timestamp();
    archived_count := 0;
    deleted_count := 0;
    
    -- Calculate cutoff date
    DECLARE
      cutoff_date TIMESTAMPTZ := NOW() - (policy_record.retention_days || ' days')::INTERVAL;
    BEGIN
      -- Archive eligible records if auto_archive is enabled
      IF policy_record.auto_archive THEN
        WITH archived_records AS (
          INSERT INTO audit_logs_archive (
            id, user_id, action, details, ip_address, user_agent, timestamp, retention_policy_id
          )
          SELECT 
            al.id, al.user_id, al.action, al.details, al.ip_address, al.user_agent, al.timestamp, policy_record.id
          FROM audit_logs al
          WHERE al.timestamp < cutoff_date
            AND (
              array_length(policy_record.applies_to_actions, 1) IS NULL 
              OR al.action = ANY(policy_record.applies_to_actions)
            )
            AND (
              array_length(policy_record.applies_to_user_roles, 1) IS NULL 
              OR EXISTS (
                SELECT 1 FROM profiles p 
                WHERE p.id = al.user_id 
                AND p.role = ANY(policy_record.applies_to_user_roles)
              )
            )
          ON CONFLICT (id) DO NOTHING
          RETURNING id
        )
        SELECT COUNT(*) INTO archived_count FROM archived_records;
        
        -- Delete archived records from main table
        DELETE FROM audit_logs al
        WHERE al.timestamp < cutoff_date
          AND EXISTS (
            SELECT 1 FROM audit_logs_archive ala 
            WHERE ala.id = al.id 
            AND ala.retention_policy_id = policy_record.id
          );
        
        GET DIAGNOSTICS deleted_count = ROW_COUNT;
      END IF;
    END;
    
    end_time := clock_timestamp();
    
    -- Return results
    policy_name := policy_record.policy_name;
    records_archived := archived_count;
    records_deleted := deleted_count;
    execution_time_ms := EXTRACT(MILLISECONDS FROM (end_time - start_time))::INTEGER;
    
    RETURN NEXT;
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to generate audit log summaries
CREATE OR REPLACE FUNCTION generate_audit_summaries(
  target_date DATE DEFAULT CURRENT_DATE - INTERVAL '1 day'
)
RETURNS void AS $$
BEGIN
  INSERT INTO audit_log_summaries (
    summary_date,
    action,
    user_role,
    event_count,
    unique_users,
    unique_ips
  )
  SELECT 
    target_date,
    al.action,
    p.role,
    COUNT(*) as event_count,
    COUNT(DISTINCT al.user_id) as unique_users,
    COUNT(DISTINCT al.ip_address) as unique_ips
  FROM audit_logs al
  LEFT JOIN profiles p ON al.user_id = p.id
  WHERE DATE(al.timestamp) = target_date
  GROUP BY al.action, p.role
  ON CONFLICT (summary_date, action, user_role) DO UPDATE SET
    event_count = EXCLUDED.event_count,
    unique_users = EXCLUDED.unique_users,
    unique_ips = EXCLUDED.unique_ips;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to get audit log statistics
CREATE OR REPLACE FUNCTION get_audit_statistics(
  days_back INTEGER DEFAULT 30
)
RETURNS TABLE(
  total_events BIGINT,
  unique_users BIGINT,
  unique_ips BIGINT,
  most_common_action TEXT,
  most_active_user_email TEXT,
  most_active_ip TEXT,
  events_by_day JSONB,
  events_by_action JSONB,
  events_by_role JSONB
) AS $$
DECLARE
  start_date TIMESTAMPTZ := NOW() - (days_back || ' days')::INTERVAL;
BEGIN
  RETURN QUERY
  WITH audit_stats AS (
    SELECT 
      COUNT(*) as total_events,
      COUNT(DISTINCT al.user_id) as unique_users,
      COUNT(DISTINCT al.ip_address) as unique_ips
    FROM audit_logs al
    WHERE al.timestamp >= start_date
  ),
  most_common_action AS (
    SELECT al.action
    FROM audit_logs al
    WHERE al.timestamp >= start_date
    GROUP BY al.action
    ORDER BY COUNT(*) DESC
    LIMIT 1
  ),
  most_active_user AS (
    SELECT p.email
    FROM audit_logs al
    JOIN profiles p ON al.user_id = p.id
    WHERE al.timestamp >= start_date
    GROUP BY p.email
    ORDER BY COUNT(*) DESC
    LIMIT 1
  ),
  most_active_ip AS (
    SELECT al.ip_address::TEXT
    FROM audit_logs al
    WHERE al.timestamp >= start_date
      AND al.ip_address IS NOT NULL
    GROUP BY al.ip_address
    ORDER BY COUNT(*) DESC
    LIMIT 1
  ),
  events_by_day AS (
    SELECT jsonb_object_agg(
      DATE(al.timestamp)::TEXT, 
      COUNT(*)
    ) as daily_events
    FROM audit_logs al
    WHERE al.timestamp >= start_date
    GROUP BY DATE(al.timestamp)
  ),
  events_by_action AS (
    SELECT jsonb_object_agg(
      al.action::TEXT, 
      COUNT(*)
    ) as action_events
    FROM audit_logs al
    WHERE al.timestamp >= start_date
    GROUP BY al.action
  ),
  events_by_role AS (
    SELECT jsonb_object_agg(
      COALESCE(p.role::TEXT, 'unknown'), 
      COUNT(*)
    ) as role_events
    FROM audit_logs al
    LEFT JOIN profiles p ON al.user_id = p.id
    WHERE al.timestamp >= start_date
    GROUP BY p.role
  )
  SELECT 
    audit_stats.total_events,
    audit_stats.unique_users,
    audit_stats.unique_ips,
    most_common_action.action::TEXT,
    most_active_user.email,
    most_active_ip.ip_address,
    COALESCE(events_by_day.daily_events, '{}'::jsonb),
    COALESCE(events_by_action.action_events, '{}'::jsonb),
    COALESCE(events_by_role.role_events, '{}'::jsonb)
  FROM audit_stats
  CROSS JOIN most_common_action
  CROSS JOIN most_active_user
  CROSS JOIN most_active_ip
  CROSS JOIN events_by_day
  CROSS JOIN events_by_action
  CROSS JOIN events_by_role;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Insert default retention policies
INSERT INTO audit_retention_policies (policy_name, retention_days, applies_to_actions, applies_to_user_roles, auto_archive, archive_to_cold_storage) VALUES
  (
    'security_events_long_term',
    2555, -- 7 years for security compliance
    ARRAY['user_login', 'user_logout', 'role_changed', 'user_activated', 'user_deactivated']::audit_action[],
    NULL, -- All roles
    true,
    true
  ),
  (
    'system_config_medium_term',
    1095, -- 3 years for configuration changes
    ARRAY['settings_updated', 'config_changed']::audit_action[],
    ARRAY['owner', 'finance']::user_role[],
    true,
    false
  ),
  (
    'data_operations_short_term',
    365, -- 1 year for data operations
    ARRAY['sync_initiated', 'data_exported']::audit_action[],
    NULL, -- All roles
    true,
    false
  ),
  (
    'user_invitations_medium_term',
    730, -- 2 years for user management
    ARRAY['user_invited']::audit_action[],
    ARRAY['owner', 'finance']::user_role[],
    true,
    false
  );

-- Create scheduled job configuration for retention (using pg_cron if available)
INSERT INTO config_mappings (key, type, value, description) VALUES
  ('audit_retention_schedule', 'system', '"0 2 * * 0"', 'Weekly audit retention job (Sundays at 2 AM)'),
  ('audit_summary_schedule', 'system', '"0 1 * * *"', 'Daily audit summary generation (1 AM)'),
  ('enable_audit_retention', 'system', 'true', 'Enable automatic audit log retention'),
  ('enable_audit_summaries', 'system', 'true', 'Enable daily audit log summaries'),
  ('audit_archive_compression', 'system', 'true', 'Enable compression for archived audit logs'),
  ('audit_export_format', 'system', '"jsonl"', 'Format for audit log exports (json, jsonl, csv)');

-- Create view for audit retention status
CREATE VIEW audit_retention_status AS
SELECT 
  arp.policy_name,
  arp.retention_days,
  arp.applies_to_actions,
  arp.applies_to_user_roles,
  arp.auto_archive,
  arp.is_active,
  -- Calculate eligible records for each policy
  (
    SELECT COUNT(*)
    FROM audit_logs al
    LEFT JOIN profiles p ON al.user_id = p.id
    WHERE al.timestamp < (NOW() - (arp.retention_days || ' days')::INTERVAL)
      AND (
        array_length(arp.applies_to_actions, 1) IS NULL 
        OR al.action = ANY(arp.applies_to_actions)
      )
      AND (
        array_length(arp.applies_to_user_roles, 1) IS NULL 
        OR p.role = ANY(arp.applies_to_user_roles)
      )
  ) as eligible_records,
  -- Calculate archived records for each policy
  (
    SELECT COUNT(*)
    FROM audit_logs_archive ala
    WHERE ala.retention_policy_id = arp.id
  ) as archived_records
FROM audit_retention_policies arp
ORDER BY arp.retention_days DESC;

-- Create view for audit log health metrics
CREATE VIEW audit_log_health AS
SELECT 
  -- Current audit log metrics
  (SELECT COUNT(*) FROM audit_logs) as total_audit_records,
  (SELECT COUNT(*) FROM audit_logs WHERE timestamp > NOW() - INTERVAL '24 hours') as records_last_24h,
  (SELECT COUNT(*) FROM audit_logs WHERE timestamp > NOW() - INTERVAL '7 days') as records_last_7d,
  (SELECT COUNT(*) FROM audit_logs WHERE timestamp > NOW() - INTERVAL '30 days') as records_last_30d,
  
  -- Archive metrics
  (SELECT COUNT(*) FROM audit_logs_archive) as total_archived_records,
  (SELECT COUNT(*) FROM audit_logs_archive WHERE archived_at > NOW() - INTERVAL '30 days') as recently_archived,
  
  -- Performance metrics
  (SELECT pg_size_pretty(pg_total_relation_size('audit_logs'))) as audit_table_size,
  (SELECT pg_size_pretty(pg_total_relation_size('audit_logs_archive'))) as archive_table_size,
  
  -- Health indicators
  CASE 
    WHEN (SELECT COUNT(*) FROM audit_logs WHERE timestamp < NOW() - INTERVAL '395 days') > 1000 
    THEN 'retention_needed'
    WHEN (SELECT COUNT(*) FROM audit_logs WHERE timestamp > NOW() - INTERVAL '1 hour') = 0 
    THEN 'no_recent_activity'
    ELSE 'healthy'
  END as health_status,
  
  -- Oldest record
  (SELECT MIN(timestamp) FROM audit_logs) as oldest_record_date,
  (SELECT MAX(timestamp) FROM audit_logs) as newest_record_date;

-- Create function for manual audit log cleanup
CREATE OR REPLACE FUNCTION cleanup_audit_logs(
  retention_days INTEGER DEFAULT 365,
  dry_run BOOLEAN DEFAULT true
)
RETURNS TABLE(
  action_taken TEXT,
  records_affected INTEGER,
  table_name TEXT,
  execution_time_ms INTEGER
) AS $$
DECLARE
  start_time TIMESTAMPTZ;
  end_time TIMESTAMPTZ;
  cutoff_date TIMESTAMPTZ;
  archived_count INTEGER := 0;
  deleted_count INTEGER := 0;
BEGIN
  start_time := clock_timestamp();
  cutoff_date := NOW() - (retention_days || ' days')::INTERVAL;
  
  IF dry_run THEN
    -- Dry run: just count what would be affected
    SELECT COUNT(*) INTO archived_count
    FROM audit_logs al
    WHERE al.timestamp < cutoff_date;
    
    action_taken := 'DRY_RUN_ARCHIVE';
    records_affected := archived_count;
    table_name := 'audit_logs';
    end_time := clock_timestamp();
    execution_time_ms := EXTRACT(MILLISECONDS FROM (end_time - start_time))::INTEGER;
    RETURN NEXT;
    
  ELSE
    -- Real execution: archive and delete
    
    -- Step 1: Archive old records
    WITH archived AS (
      INSERT INTO audit_logs_archive (id, user_id, action, details, ip_address, user_agent, timestamp)
      SELECT id, user_id, action, details, ip_address, user_agent, timestamp
      FROM audit_logs
      WHERE timestamp < cutoff_date
      ON CONFLICT (id) DO NOTHING
      RETURNING id
    )
    SELECT COUNT(*) INTO archived_count FROM archived;
    
    action_taken := 'ARCHIVE';
    records_affected := archived_count;
    table_name := 'audit_logs_archive';
    end_time := clock_timestamp();
    execution_time_ms := EXTRACT(MILLISECONDS FROM (end_time - start_time))::INTEGER;
    RETURN NEXT;
    
    -- Step 2: Delete archived records from main table
    start_time := clock_timestamp();
    
    DELETE FROM audit_logs al
    WHERE al.timestamp < cutoff_date
      AND EXISTS (
        SELECT 1 FROM audit_logs_archive ala 
        WHERE ala.id = al.id
      );
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    
    action_taken := 'DELETE';
    records_affected := deleted_count;
    table_name := 'audit_logs';
    end_time := clock_timestamp();
    execution_time_ms := EXTRACT(MILLISECONDS FROM (end_time - start_time))::INTEGER;
    RETURN NEXT;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to export audit logs for compliance
CREATE OR REPLACE FUNCTION export_audit_logs_for_period(
  start_date DATE,
  end_date DATE,
  format_type TEXT DEFAULT 'jsonl'
)
RETURNS TABLE(
  export_data TEXT
) AS $$
BEGIN
  IF format_type = 'jsonl' THEN
    RETURN QUERY
    SELECT jsonb_build_object(
      'id', al.id,
      'timestamp', al.timestamp,
      'user_id', al.user_id,
      'user_email', p.email,
      'user_role', p.role,
      'action', al.action,
      'details', al.details,
      'ip_address', al.ip_address,
      'user_agent', al.user_agent
    )::TEXT
    FROM audit_logs al
    LEFT JOIN profiles p ON al.user_id = p.id
    WHERE DATE(al.timestamp) BETWEEN start_date AND end_date
    ORDER BY al.timestamp;
    
  ELSIF format_type = 'csv' THEN
    -- Return CSV header first
    RETURN QUERY SELECT 'timestamp,user_email,user_role,action,ip_address,details'::TEXT;
    
    -- Return CSV data
    RETURN QUERY
    SELECT 
      al.timestamp::TEXT || ',' ||
      COALESCE('"' || p.email || '"', '') || ',' ||
      COALESCE('"' || p.role::TEXT || '"', '') || ',' ||
      '"' || al.action::TEXT || '"' || ',' ||
      COALESCE('"' || al.ip_address::TEXT || '"', '') || ',' ||
      '"' || REPLACE(al.details::TEXT, '"', '""') || '"'
    FROM audit_logs al
    LEFT JOIN profiles p ON al.user_id = p.id
    WHERE DATE(al.timestamp) BETWEEN start_date AND end_date
    ORDER BY al.timestamp;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permissions for new functions
GRANT EXECUTE ON FUNCTION apply_audit_retention_policies() TO authenticated;
GRANT EXECUTE ON FUNCTION generate_audit_summaries(DATE) TO authenticated;
GRANT EXECUTE ON FUNCTION get_audit_statistics(INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION cleanup_audit_logs(INTEGER, BOOLEAN) TO authenticated;
GRANT EXECUTE ON FUNCTION export_audit_logs_for_period(DATE, DATE, TEXT) TO authenticated;

-- Add triggers for retention table updates
CREATE TRIGGER update_audit_retention_policies_updated_at 
  BEFORE UPDATE ON audit_retention_policies 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Comments for documentation
COMMENT ON TABLE audit_retention_policies IS 'Configurable retention policies for different types of audit events';
COMMENT ON TABLE audit_logs_archive IS 'Long-term storage for archived audit logs';
COMMENT ON TABLE audit_log_summaries IS 'Daily aggregated audit statistics for reporting';

COMMENT ON COLUMN audit_retention_policies.retention_days IS 'Number of days to retain audit logs before archiving';
COMMENT ON COLUMN audit_retention_policies.applies_to_actions IS 'Specific audit actions this policy applies to (null = all actions)';
COMMENT ON COLUMN audit_retention_policies.applies_to_user_roles IS 'Specific user roles this policy applies to (null = all roles)';
COMMENT ON COLUMN audit_retention_policies.auto_archive IS 'Whether to automatically archive old records';
COMMENT ON COLUMN audit_retention_policies.archive_to_cold_storage IS 'Whether to move archived data to cold storage';

COMMENT ON VIEW audit_retention_status IS 'Current status of audit retention policies with eligible record counts';
COMMENT ON VIEW audit_log_health IS 'Overall health metrics for audit logging system';

COMMENT ON FUNCTION apply_audit_retention_policies() IS 'Applies all active retention policies and returns execution results';
COMMENT ON FUNCTION cleanup_audit_logs(INTEGER, BOOLEAN) IS 'Manual cleanup function with dry-run capability';
COMMENT ON FUNCTION export_audit_logs_for_period(DATE, DATE, TEXT) IS 'Export audit logs for compliance reporting';
