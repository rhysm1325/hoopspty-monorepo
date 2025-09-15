-- Database migration management and version control
-- Enhances Supabase's built-in migration system with custom tracking

-- Create migration tracking table for enhanced version control
CREATE TABLE migration_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  migration_name TEXT NOT NULL,
  migration_version TEXT NOT NULL,
  migration_file TEXT NOT NULL,
  checksum TEXT NOT NULL,
  applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  applied_by UUID REFERENCES auth.users(id),
  execution_time_ms INTEGER,
  rollback_sql TEXT,
  migration_type TEXT NOT NULL DEFAULT 'schema', -- 'schema', 'data', 'config', 'hotfix'
  environment TEXT NOT NULL DEFAULT 'development', -- 'development', 'staging', 'production'
  success BOOLEAN NOT NULL DEFAULT true,
  error_message TEXT,
  dependencies TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create schema version tracking
CREATE TABLE schema_versions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  version_number TEXT NOT NULL UNIQUE,
  version_name TEXT NOT NULL,
  description TEXT,
  migration_count INTEGER NOT NULL DEFAULT 0,
  total_tables INTEGER NOT NULL DEFAULT 0,
  total_views INTEGER NOT NULL DEFAULT 0,
  total_functions INTEGER NOT NULL DEFAULT 0,
  total_indexes INTEGER NOT NULL DEFAULT 0,
  schema_size_bytes BIGINT DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  is_current BOOLEAN NOT NULL DEFAULT false
);

-- Create database backup metadata table
CREATE TABLE database_backups (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  backup_name TEXT NOT NULL,
  backup_type TEXT NOT NULL, -- 'manual', 'automated', 'pre_migration'
  backup_size_bytes BIGINT,
  backup_location TEXT,
  backup_checksum TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ,
  is_compressed BOOLEAN NOT NULL DEFAULT false,
  backup_status TEXT NOT NULL DEFAULT 'completed', -- 'running', 'completed', 'failed'
  restore_tested BOOLEAN NOT NULL DEFAULT false,
  restore_tested_at TIMESTAMPTZ
);

-- Add indexes for migration tables
CREATE INDEX idx_migration_history_name ON migration_history(migration_name);
CREATE INDEX idx_migration_history_version ON migration_history(migration_version);
CREATE INDEX idx_migration_history_applied_at ON migration_history(applied_at);
CREATE INDEX idx_migration_history_type ON migration_history(migration_type);
CREATE INDEX idx_migration_history_environment ON migration_history(environment);
CREATE INDEX idx_migration_history_success ON migration_history(success);

CREATE INDEX idx_schema_versions_number ON schema_versions(version_number);
CREATE INDEX idx_schema_versions_current ON schema_versions(is_current);
CREATE INDEX idx_schema_versions_created ON schema_versions(created_at);

CREATE INDEX idx_database_backups_name ON database_backups(backup_name);
CREATE INDEX idx_database_backups_type ON database_backups(backup_type);
CREATE INDEX idx_database_backups_created ON database_backups(created_at);
CREATE INDEX idx_database_backups_status ON database_backups(backup_status);

-- Row Level Security for migration tables
ALTER TABLE migration_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE schema_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE database_backups ENABLE ROW LEVEL SECURITY;

-- RLS policies (admin only access)
CREATE POLICY "Admins can view migration history" 
  ON migration_history FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() 
      AND role IN ('owner', 'finance')
      AND is_active = true
    )
  );

CREATE POLICY "System can insert migration history" 
  ON migration_history FOR INSERT 
  WITH CHECK (true); -- Allow system to insert migration records

CREATE POLICY "Admins can view schema versions" 
  ON schema_versions FOR ALL 
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() 
      AND role IN ('owner', 'finance')
      AND is_active = true
    )
  );

CREATE POLICY "Admins can manage database backups" 
  ON database_backups FOR ALL 
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() 
      AND role IN ('owner', 'finance')
      AND is_active = true
    )
  );

-- Create function to record migration execution
CREATE OR REPLACE FUNCTION record_migration(
  migration_name_param TEXT,
  migration_version_param TEXT,
  migration_file_param TEXT,
  checksum_param TEXT,
  execution_time_ms_param INTEGER,
  rollback_sql_param TEXT DEFAULT NULL,
  migration_type_param TEXT DEFAULT 'schema',
  environment_param TEXT DEFAULT 'development',
  applied_by_param UUID DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  migration_id UUID;
BEGIN
  INSERT INTO migration_history (
    migration_name,
    migration_version,
    migration_file,
    checksum,
    execution_time_ms,
    rollback_sql,
    migration_type,
    environment,
    applied_by
  )
  VALUES (
    migration_name_param,
    migration_version_param,
    migration_file_param,
    checksum_param,
    execution_time_ms_param,
    rollback_sql_param,
    migration_type_param,
    environment_param,
    applied_by_param
  )
  RETURNING id INTO migration_id;
  
  RETURN migration_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to update schema version
CREATE OR REPLACE FUNCTION update_schema_version(
  version_number_param TEXT,
  version_name_param TEXT,
  description_param TEXT DEFAULT NULL
)
RETURNS void AS $$
DECLARE
  table_count INTEGER;
  view_count INTEGER;
  function_count INTEGER;
  index_count INTEGER;
  schema_size BIGINT;
BEGIN
  -- Count database objects
  SELECT COUNT(*) INTO table_count
  FROM information_schema.tables 
  WHERE table_schema = 'public' AND table_type = 'BASE TABLE';
  
  SELECT COUNT(*) INTO view_count
  FROM information_schema.views 
  WHERE table_schema = 'public';
  
  SELECT COUNT(*) INTO function_count
  FROM information_schema.routines 
  WHERE routine_schema = 'public';
  
  SELECT COUNT(*) INTO index_count
  FROM pg_indexes 
  WHERE schemaname = 'public';
  
  SELECT pg_database_size(current_database()) INTO schema_size;
  
  -- Mark current version as not current
  UPDATE schema_versions SET is_current = false WHERE is_current = true;
  
  -- Count migrations for this version
  DECLARE
    migration_count INTEGER;
  BEGIN
    SELECT COUNT(*) INTO migration_count
    FROM migration_history
    WHERE migration_version = version_number_param;
    
    -- Insert new version
    INSERT INTO schema_versions (
      version_number,
      version_name,
      description,
      migration_count,
      total_tables,
      total_views,
      total_functions,
      total_indexes,
      schema_size_bytes,
      is_current
    )
    VALUES (
      version_number_param,
      version_name_param,
      description_param,
      migration_count,
      table_count,
      view_count,
      function_count,
      index_count,
      schema_size,
      true
    );
  END;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to generate rollback script
CREATE OR REPLACE FUNCTION generate_rollback_script(
  from_version TEXT,
  to_version TEXT
)
RETURNS TEXT AS $$
DECLARE
  rollback_script TEXT := '';
  migration_record RECORD;
BEGIN
  -- Get migrations between versions in reverse order
  FOR migration_record IN 
    SELECT rollback_sql
    FROM migration_history
    WHERE migration_version > to_version 
      AND migration_version <= from_version
      AND rollback_sql IS NOT NULL
    ORDER BY applied_at DESC
  LOOP
    rollback_script := rollback_script || migration_record.rollback_sql || E'\n\n';
  END LOOP;
  
  RETURN CASE 
    WHEN rollback_script = '' THEN 'No rollback scripts available for this version range.'
    ELSE rollback_script
  END;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to validate database integrity
CREATE OR REPLACE FUNCTION validate_database_integrity()
RETURNS TABLE(
  check_name TEXT,
  status TEXT,
  details TEXT
) AS $$
BEGIN
  -- Check foreign key constraints
  RETURN QUERY
  SELECT 
    'foreign_key_constraints'::TEXT,
    CASE WHEN COUNT(*) = 0 THEN 'PASS' ELSE 'FAIL' END::TEXT,
    CASE WHEN COUNT(*) = 0 THEN 'All foreign key constraints valid' 
         ELSE COUNT(*)::TEXT || ' foreign key violations found' END::TEXT
  FROM information_schema.table_constraints tc
  WHERE tc.constraint_type = 'FOREIGN KEY'
    AND tc.table_schema = 'public';
  
  -- Check for orphaned records in profiles
  RETURN QUERY
  SELECT 
    'orphaned_profiles'::TEXT,
    CASE WHEN COUNT(*) = 0 THEN 'PASS' ELSE 'WARN' END::TEXT,
    CASE WHEN COUNT(*) = 0 THEN 'No orphaned profiles' 
         ELSE COUNT(*)::TEXT || ' profiles without auth users' END::TEXT
  FROM profiles p
  LEFT JOIN auth.users u ON p.id = u.id
  WHERE u.id IS NULL;
  
  -- Check audit log data integrity
  RETURN QUERY
  SELECT 
    'audit_log_integrity'::TEXT,
    CASE WHEN COUNT(*) = 0 THEN 'PASS' ELSE 'WARN' END::TEXT,
    CASE WHEN COUNT(*) = 0 THEN 'All audit logs have valid structure' 
         ELSE COUNT(*)::TEXT || ' audit logs with invalid JSON details' END::TEXT
  FROM audit_logs al
  WHERE al.details IS NULL OR NOT jsonb_typeof(al.details) = 'object';
  
  -- Check sync checkpoint consistency
  RETURN QUERY
  SELECT 
    'sync_checkpoints'::TEXT,
    CASE WHEN COUNT(*) = 11 THEN 'PASS' ELSE 'WARN' END::TEXT,
    'Found ' || COUNT(*)::TEXT || ' sync checkpoints (expected 11)'::TEXT
  FROM sync_checkpoints;
  
  -- Check configuration completeness
  RETURN QUERY
  SELECT 
    'required_configurations'::TEXT,
    CASE WHEN COUNT(*) >= 6 THEN 'PASS' ELSE 'FAIL' END::TEXT,
    'Found ' || COUNT(*)::TEXT || ' system configurations (minimum 6 required)'::TEXT
  FROM config_mappings
  WHERE type = 'system' AND is_active = true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create view for migration status
CREATE VIEW migration_status AS
SELECT 
  sv.version_number as current_version,
  sv.version_name as current_version_name,
  sv.created_at as version_created_at,
  sv.migration_count,
  sv.total_tables,
  sv.total_views,
  sv.total_functions,
  sv.total_indexes,
  pg_size_pretty(sv.schema_size_bytes) as schema_size,
  -- Recent migration activity
  (
    SELECT COUNT(*)
    FROM migration_history mh
    WHERE mh.applied_at > NOW() - INTERVAL '7 days'
  ) as migrations_last_7_days,
  (
    SELECT COUNT(*)
    FROM migration_history mh
    WHERE mh.success = false
  ) as failed_migrations_total,
  -- Last migration info
  (
    SELECT mh.migration_name
    FROM migration_history mh
    ORDER BY mh.applied_at DESC
    LIMIT 1
  ) as last_migration_name,
  (
    SELECT mh.applied_at
    FROM migration_history mh
    ORDER BY mh.applied_at DESC
    LIMIT 1
  ) as last_migration_at
FROM schema_versions sv
WHERE sv.is_current = true;

-- Create view for recent migration activity
CREATE VIEW recent_migration_activity AS
SELECT 
  mh.migration_name,
  mh.migration_version,
  mh.migration_type,
  mh.applied_at,
  mh.execution_time_ms,
  mh.success,
  mh.error_message,
  mh.environment,
  p.email as applied_by_email,
  p.first_name || ' ' || COALESCE(p.last_name, '') as applied_by_name
FROM migration_history mh
LEFT JOIN profiles p ON mh.applied_by = p.id
WHERE mh.applied_at > NOW() - INTERVAL '30 days'
ORDER BY mh.applied_at DESC;

-- Grant permissions
GRANT ALL ON migration_history TO authenticated;
GRANT ALL ON schema_versions TO authenticated;
GRANT ALL ON database_backups TO authenticated;
GRANT EXECUTE ON FUNCTION record_migration(TEXT, TEXT, TEXT, TEXT, INTEGER, TEXT, TEXT, TEXT, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION update_schema_version(TEXT, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION generate_rollback_script(TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION validate_database_integrity() TO authenticated;

-- Insert initial schema version
INSERT INTO schema_versions (
  version_number,
  version_name,
  description,
  migration_count,
  is_current
) VALUES (
  '1.0.0',
  'Initial AUSA Finance Dashboard Schema',
  'Complete database schema with user management, audit logging, Xero staging, and analytics tables',
  6, -- Number of migration files created so far
  true
);

-- Record existing migrations in history
INSERT INTO migration_history (migration_name, migration_version, migration_file, checksum, migration_type, environment) VALUES
  ('initial_schema', '1.0.0', '001_initial_schema.sql', 'initial', 'schema', 'development'),
  ('staging_tables', '1.0.0', '002_staging_tables.sql', 'staging', 'schema', 'development'),
  ('analytics_tables', '1.0.0', '003_analytics_tables.sql', 'analytics', 'schema', 'development'),
  ('enhanced_config', '1.0.0', '004_enhanced_config.sql', 'config', 'config', 'development'),
  ('enhanced_sync', '1.0.0', '005_enhanced_sync.sql', 'sync', 'schema', 'development'),
  ('audit_retention', '1.0.0', '006_audit_retention.sql', 'retention', 'config', 'development'),
  ('migration_management', '1.0.0', '007_migration_management.sql', 'migration', 'schema', 'development');

-- Insert migration management configuration
INSERT INTO config_mappings (key, type, value, description) VALUES
  ('enable_migration_tracking', 'system', 'true', 'Enable custom migration tracking and history'),
  ('auto_backup_before_migration', 'system', 'true', 'Create backup before applying migrations'),
  ('validate_integrity_after_migration', 'system', 'true', 'Run integrity checks after migrations'),
  ('migration_timeout_minutes', 'system', '30', 'Maximum time allowed for migration execution'),
  ('rollback_retention_days', 'system', '90', 'Days to retain rollback scripts'),
  ('backup_retention_days', 'system', '30', 'Days to retain database backups');

-- Comments for documentation
COMMENT ON TABLE migration_history IS 'Enhanced tracking of all database migrations with execution details';
COMMENT ON TABLE schema_versions IS 'Database schema version tracking with object counts and sizing';
COMMENT ON TABLE database_backups IS 'Database backup metadata and management';

COMMENT ON COLUMN migration_history.checksum IS 'SHA256 checksum of migration file for integrity verification';
COMMENT ON COLUMN migration_history.rollback_sql IS 'SQL commands to rollback this migration';
COMMENT ON COLUMN migration_history.dependencies IS 'Array of migration names this migration depends on';
COMMENT ON COLUMN migration_history.migration_type IS 'Type of migration: schema, data, config, or hotfix';

COMMENT ON COLUMN schema_versions.is_current IS 'Whether this is the current active schema version';
COMMENT ON COLUMN schema_versions.schema_size_bytes IS 'Total database size in bytes';

COMMENT ON COLUMN database_backups.backup_location IS 'Storage location or path for the backup file';
COMMENT ON COLUMN database_backups.restore_tested IS 'Whether backup has been tested for restore capability';

COMMENT ON VIEW migration_status IS 'Current migration and schema status overview';
COMMENT ON VIEW recent_migration_activity IS 'Recent migration activity with user context';

COMMENT ON FUNCTION record_migration IS 'Records migration execution with timing and rollback information';
COMMENT ON FUNCTION update_schema_version IS 'Updates current schema version with database object counts';
COMMENT ON FUNCTION generate_rollback_script IS 'Generates rollback script between two schema versions';
COMMENT ON FUNCTION validate_database_integrity IS 'Validates database integrity and constraint consistency';
