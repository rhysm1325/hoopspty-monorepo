// Database migration management utilities

import { createServiceRoleClient } from '@/lib/supabase/server'

export interface MigrationRecord {
  id: string
  migrationName: string
  migrationVersion: string
  migrationFile: string
  checksum: string
  appliedAt: Date
  appliedBy?: string
  executionTimeMs?: number
  rollbackSql?: string
  migrationType: 'schema' | 'data' | 'config' | 'hotfix'
  environment: 'development' | 'staging' | 'production'
  success: boolean
  errorMessage?: string
  dependencies: string[]
}

export interface SchemaVersion {
  id: string
  versionNumber: string
  versionName: string
  description?: string
  migrationCount: number
  totalTables: number
  totalViews: number
  totalFunctions: number
  totalIndexes: number
  schemaSizeBytes: number
  createdAt: Date
  isCurrent: boolean
}

export interface DatabaseBackup {
  id: string
  backupName: string
  backupType: 'manual' | 'automated' | 'pre_migration'
  backupSizeBytes?: number
  backupLocation?: string
  backupChecksum?: string
  createdBy?: string
  createdAt: Date
  expiresAt?: Date
  isCompressed: boolean
  backupStatus: 'running' | 'completed' | 'failed'
  restoreTested: boolean
  restoreTestedAt?: Date
}

/**
 * Get current schema version
 */
export async function getCurrentSchemaVersion(): Promise<{
  version: SchemaVersion | null
  error?: string
}> {
  try {
    const supabase = createServiceRoleClient()

    const { data, error } = await supabase
      .from('schema_versions')
      .select('*')
      .eq('is_current', true)
      .single()

    if (error) {
      return { version: null, error: error.message }
    }

    const version: SchemaVersion = {
      id: data.id,
      versionNumber: data.version_number,
      versionName: data.version_name,
      description: data.description,
      migrationCount: data.migration_count,
      totalTables: data.total_tables,
      totalViews: data.total_views,
      totalFunctions: data.total_functions,
      totalIndexes: data.total_indexes,
      schemaSizeBytes: data.schema_size_bytes,
      createdAt: new Date(data.created_at),
      isCurrent: data.is_current,
    }

    return { version }
  } catch (error) {
    return {
      version: null,
      error:
        error instanceof Error
          ? error.message
          : 'Failed to get current schema version',
    }
  }
}

/**
 * Get migration history
 */
export async function getMigrationHistory(limit: number = 50): Promise<{
  migrations: MigrationRecord[]
  error?: string
}> {
  try {
    const supabase = createServiceRoleClient()

    const { data, error } = await supabase
      .from('migration_history')
      .select('*')
      .order('applied_at', { ascending: false })
      .limit(limit)

    if (error) {
      return { migrations: [], error: error.message }
    }

    const migrations: MigrationRecord[] = (data || []).map(row => ({
      id: row.id,
      migrationName: row.migration_name,
      migrationVersion: row.migration_version,
      migrationFile: row.migration_file,
      checksum: row.checksum,
      appliedAt: new Date(row.applied_at),
      appliedBy: row.applied_by,
      executionTimeMs: row.execution_time_ms,
      rollbackSql: row.rollback_sql,
      migrationType: row.migration_type as
        | 'schema'
        | 'data'
        | 'config'
        | 'hotfix',
      environment: row.environment as 'development' | 'staging' | 'production',
      success: row.success,
      errorMessage: row.error_message,
      dependencies: row.dependencies || [],
    }))

    return { migrations }
  } catch (error) {
    return {
      migrations: [],
      error:
        error instanceof Error
          ? error.message
          : 'Failed to get migration history',
    }
  }
}

/**
 * Record migration execution
 */
export async function recordMigration(
  migrationName: string,
  migrationVersion: string,
  migrationFile: string,
  checksum: string,
  executionTimeMs: number,
  options: {
    rollbackSql?: string
    migrationType?: 'schema' | 'data' | 'config' | 'hotfix'
    environment?: 'development' | 'staging' | 'production'
    appliedBy?: string
  } = {}
): Promise<{
  migrationId: string | null
  error?: string
}> {
  try {
    const supabase = createServiceRoleClient()

    const { data, error } = await supabase.rpc('record_migration', {
      migration_name_param: migrationName,
      migration_version_param: migrationVersion,
      migration_file_param: migrationFile,
      checksum_param: checksum,
      execution_time_ms_param: executionTimeMs,
      rollback_sql_param: options.rollbackSql,
      migration_type_param: options.migrationType || 'schema',
      environment_param: options.environment || 'development',
      applied_by_param: options.appliedBy,
    })

    if (error) {
      return { migrationId: null, error: error.message }
    }

    return { migrationId: data }
  } catch (error) {
    return {
      migrationId: null,
      error:
        error instanceof Error ? error.message : 'Failed to record migration',
    }
  }
}

/**
 * Update schema version
 */
export async function updateSchemaVersion(
  versionNumber: string,
  versionName: string,
  description?: string
): Promise<{
  success: boolean
  error?: string
}> {
  try {
    const supabase = createServiceRoleClient()

    const { error } = await supabase.rpc('update_schema_version', {
      version_number_param: versionNumber,
      version_name_param: versionName,
      description_param: description,
    })

    if (error) {
      return { success: false, error: error.message }
    }

    return { success: true }
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : 'Failed to update schema version',
    }
  }
}

/**
 * Validate database integrity
 */
export async function validateDatabaseIntegrity(): Promise<{
  checks: Array<{
    checkName: string
    status: 'PASS' | 'WARN' | 'FAIL'
    details: string
  }>
  overallStatus: 'PASS' | 'WARN' | 'FAIL'
  error?: string
}> {
  try {
    const supabase = createServiceRoleClient()

    const { data, error } = await supabase.rpc('validate_database_integrity')

    if (error) {
      return {
        checks: [],
        overallStatus: 'FAIL',
        error: error.message,
      }
    }

    const checks = (data || []).map((row: any) => ({
      checkName: row.check_name,
      status: row.status as 'PASS' | 'WARN' | 'FAIL',
      details: row.details,
    }))

    // Determine overall status
    const hasFailures = checks.some(check => check.status === 'FAIL')
    const hasWarnings = checks.some(check => check.status === 'WARN')

    const overallStatus = hasFailures ? 'FAIL' : hasWarnings ? 'WARN' : 'PASS'

    return { checks, overallStatus }
  } catch (error) {
    return {
      checks: [],
      overallStatus: 'FAIL',
      error:
        error instanceof Error
          ? error.message
          : 'Failed to validate database integrity',
    }
  }
}

/**
 * Generate rollback script between versions
 */
export async function generateRollbackScript(
  fromVersion: string,
  toVersion: string
): Promise<{
  rollbackScript: string
  error?: string
}> {
  try {
    const supabase = createServiceRoleClient()

    const { data, error } = await supabase.rpc('generate_rollback_script', {
      from_version: fromVersion,
      to_version: toVersion,
    })

    if (error) {
      return { rollbackScript: '', error: error.message }
    }

    return { rollbackScript: data || '' }
  } catch (error) {
    return {
      rollbackScript: '',
      error:
        error instanceof Error
          ? error.message
          : 'Failed to generate rollback script',
    }
  }
}

/**
 * Get migration status overview
 */
export async function getMigrationStatus(): Promise<{
  status: {
    currentVersion: string
    currentVersionName: string
    versionCreatedAt: Date
    migrationCount: number
    totalTables: number
    totalViews: number
    totalFunctions: number
    totalIndexes: number
    schemaSize: string
    migrationsLast7Days: number
    failedMigrationsTotal: number
    lastMigrationName?: string
    lastMigrationAt?: Date
  } | null
  error?: string
}> {
  try {
    const supabase = createServiceRoleClient()

    const { data, error } = await supabase
      .from('migration_status')
      .select('*')
      .single()

    if (error) {
      return { status: null, error: error.message }
    }

    const status = {
      currentVersion: data.current_version,
      currentVersionName: data.current_version_name,
      versionCreatedAt: new Date(data.version_created_at),
      migrationCount: data.migration_count,
      totalTables: data.total_tables,
      totalViews: data.total_views,
      totalFunctions: data.total_functions,
      totalIndexes: data.total_indexes,
      schemaSize: data.schema_size,
      migrationsLast7Days: data.migrations_last_7_days,
      failedMigrationsTotal: data.failed_migrations_total,
      lastMigrationName: data.last_migration_name,
      lastMigrationAt: data.last_migration_at
        ? new Date(data.last_migration_at)
        : undefined,
    }

    return { status }
  } catch (error) {
    return {
      status: null,
      error:
        error instanceof Error
          ? error.message
          : 'Failed to get migration status',
    }
  }
}

/**
 * Get recent migration activity
 */
export async function getRecentMigrationActivity(limit: number = 20): Promise<{
  activity: Array<{
    migrationName: string
    migrationVersion: string
    migrationType: string
    appliedAt: Date
    executionTimeMs?: number
    success: boolean
    errorMessage?: string
    environment: string
    appliedByEmail?: string
    appliedByName?: string
  }>
  error?: string
}> {
  try {
    const supabase = createServiceRoleClient()

    const { data, error } = await supabase
      .from('recent_migration_activity')
      .select('*')
      .limit(limit)

    if (error) {
      return { activity: [], error: error.message }
    }

    const activity = (data || []).map((row: any) => ({
      migrationName: row.migration_name,
      migrationVersion: row.migration_version,
      migrationType: row.migration_type,
      appliedAt: new Date(row.applied_at),
      executionTimeMs: row.execution_time_ms,
      success: row.success,
      errorMessage: row.error_message,
      environment: row.environment,
      appliedByEmail: row.applied_by_email,
      appliedByName: row.applied_by_name,
    }))

    return { activity }
  } catch (error) {
    return {
      activity: [],
      error:
        error instanceof Error
          ? error.message
          : 'Failed to get recent migration activity',
    }
  }
}
