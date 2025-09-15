// Sync checkpoint and session management utilities

import { createServiceRoleClient } from '@/lib/supabase/server'

export type SyncStatus =
  | 'idle'
  | 'running'
  | 'completed'
  | 'error'
  | 'cancelled'
  | 'partial'

export interface SyncCheckpoint {
  id: string
  entityType: string
  lastUpdatedUtc: Date
  recordsProcessed: number
  hasMoreRecords: boolean
  syncStatus: SyncStatus
  errorMessage?: string
  syncDurationSeconds?: number
  lastSyncStartedAt?: Date
  lastSyncCompletedAt?: Date
  lastSuccessfulSyncAt?: Date
  totalSyncCount: number
  errorCount: number
  lastErrorAt?: Date
  rateLimitHits: number
  averageSyncDurationSeconds: number
}

export interface SyncSession {
  id: string
  sessionType: 'manual' | 'scheduled' | 'initial'
  syncScope: 'full' | 'incremental' | 'entity_specific'
  targetEntities: string[]
  status: SyncStatus
  startedAt: Date
  completedAt?: Date
  totalDurationSeconds?: number
  totalRecordsProcessed: number
  totalApiCalls: number
  successRate?: number
  initiatedBy?: string
  xeroTenantId?: string
}

export interface SyncLog {
  id: string
  syncSessionId: string
  entityType: string
  syncStatus: SyncStatus
  startedAt: Date
  completedAt?: Date
  durationSeconds?: number
  recordsRequested: number
  recordsReceived: number
  recordsProcessed: number
  recordsInserted: number
  recordsUpdated: number
  recordsFailed: number
  apiCallsMade: number
  rateLimitHits: number
  errorMessage?: string
  errorDetails?: Record<string, unknown>
  performanceMetrics?: Record<string, unknown>
  initiatedBy?: string
}

/**
 * Get all sync checkpoints
 */
export async function getSyncCheckpoints(): Promise<{
  checkpoints: SyncCheckpoint[]
  error?: string
}> {
  try {
    const supabase = createServiceRoleClient()

    const { data, error } = await supabase
      .from('sync_checkpoints')
      .select('*')
      .order('entity_type')

    if (error) {
      return { checkpoints: [], error: error.message }
    }

    const checkpoints: SyncCheckpoint[] = (data || []).map(row => ({
      id: row.id,
      entityType: row.entity_type,
      lastUpdatedUtc: new Date(row.last_updated_utc),
      recordsProcessed: row.records_processed,
      hasMoreRecords: row.has_more_records,
      syncStatus: row.sync_status as SyncStatus,
      errorMessage: row.error_message,
      syncDurationSeconds: row.sync_duration_seconds,
      lastSyncStartedAt: row.last_sync_started_at
        ? new Date(row.last_sync_started_at)
        : undefined,
      lastSyncCompletedAt: row.last_sync_completed_at
        ? new Date(row.last_sync_completed_at)
        : undefined,
      lastSuccessfulSyncAt: row.last_successful_sync_at
        ? new Date(row.last_successful_sync_at)
        : undefined,
      totalSyncCount: row.total_sync_count,
      errorCount: row.error_count,
      lastErrorAt: row.last_error_at ? new Date(row.last_error_at) : undefined,
      rateLimitHits: row.rate_limit_hits,
      averageSyncDurationSeconds: row.average_sync_duration_seconds,
    }))

    return { checkpoints }
  } catch (error) {
    return {
      checkpoints: [],
      error:
        error instanceof Error
          ? error.message
          : 'Failed to get sync checkpoints',
    }
  }
}

/**
 * Update sync checkpoint
 */
export async function updateSyncCheckpoint(
  entityType: string,
  lastUpdatedUtc: Date,
  recordsProcessed: number,
  status: SyncStatus,
  errorMessage?: string
): Promise<{
  success: boolean
  error?: string
}> {
  try {
    const supabase = createServiceRoleClient()

    const { error } = await supabase.rpc('update_sync_checkpoint', {
      entity_type_param: entityType,
      last_updated_utc_param: lastUpdatedUtc.toISOString(),
      records_processed_param: recordsProcessed,
      status_param: status,
      error_message_param: errorMessage,
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
          : 'Failed to update sync checkpoint',
    }
  }
}

/**
 * Start new sync session
 */
export async function startSyncSession(
  sessionType: 'manual' | 'scheduled' | 'initial',
  syncScope: 'full' | 'incremental' | 'entity_specific',
  targetEntities: string[],
  initiatedBy: string,
  xeroTenantId?: string
): Promise<{
  sessionId: string | null
  error?: string
}> {
  try {
    const supabase = createServiceRoleClient()

    const { data, error } = await supabase.rpc('start_sync_session', {
      session_type_param: sessionType,
      sync_scope_param: syncScope,
      target_entities_param: targetEntities,
      initiated_by_param: initiatedBy,
      xero_tenant_id_param: xeroTenantId,
    })

    if (error) {
      return { sessionId: null, error: error.message }
    }

    return { sessionId: data }
  } catch (error) {
    return {
      sessionId: null,
      error:
        error instanceof Error ? error.message : 'Failed to start sync session',
    }
  }
}

/**
 * Complete sync session
 */
export async function completeSyncSession(
  sessionId: string,
  status: SyncStatus
): Promise<{
  success: boolean
  error?: string
}> {
  try {
    const supabase = createServiceRoleClient()

    const { error } = await supabase.rpc('complete_sync_session', {
      session_id_param: sessionId,
      status_param: status,
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
          : 'Failed to complete sync session',
    }
  }
}

/**
 * Log sync operation
 */
export async function logSyncOperation(
  sessionId: string,
  entityType: string,
  status: SyncStatus,
  metrics: {
    recordsRequested?: number
    recordsReceived?: number
    recordsProcessed?: number
    recordsInserted?: number
    recordsUpdated?: number
    recordsFailed?: number
    apiCallsMade?: number
    rateLimitHits?: number
    errorMessage?: string
    errorDetails?: Record<string, unknown>
    performanceMetrics?: Record<string, unknown>
  },
  startedAt: Date,
  completedAt?: Date
): Promise<{
  success: boolean
  error?: string
}> {
  try {
    const supabase = createServiceRoleClient()

    const logData = {
      sync_session_id: sessionId,
      entity_type: entityType,
      sync_status: status,
      started_at: startedAt.toISOString(),
      completed_at: completedAt?.toISOString(),
      duration_seconds: completedAt
        ? Math.round((completedAt.getTime() - startedAt.getTime()) / 1000)
        : null,
      records_requested: metrics.recordsRequested || 0,
      records_received: metrics.recordsReceived || 0,
      records_processed: metrics.recordsProcessed || 0,
      records_inserted: metrics.recordsInserted || 0,
      records_updated: metrics.recordsUpdated || 0,
      records_failed: metrics.recordsFailed || 0,
      api_calls_made: metrics.apiCallsMade || 0,
      rate_limit_hits: metrics.rateLimitHits || 0,
      error_message: metrics.errorMessage,
      error_details: metrics.errorDetails || {},
      performance_metrics: metrics.performanceMetrics || {},
    }

    const { error } = await supabase.from('sync_logs').insert(logData)

    if (error) {
      return { success: false, error: error.message }
    }

    return { success: true }
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error ? error.message : 'Failed to log sync operation',
    }
  }
}

/**
 * Get entities needing sync
 */
export async function getEntitiesNeedingSync(
  maxAgeHours: number = 24
): Promise<{
  entities: Array<{
    entityType: string
    lastUpdatedUtc: Date
    hoursSinceSync: number
    syncStatus: SyncStatus
    priorityScore: number
  }>
  error?: string
}> {
  try {
    const supabase = createServiceRoleClient()

    const { data, error } = await supabase.rpc('get_entities_needing_sync', {
      max_age_hours: maxAgeHours,
    })

    if (error) {
      return { entities: [], error: error.message }
    }

    const entities = (data || []).map((row: any) => ({
      entityType: row.entity_type,
      lastUpdatedUtc: new Date(row.last_updated_utc),
      hoursSinceSync: parseFloat(row.hours_since_sync),
      syncStatus: row.sync_status as SyncStatus,
      priorityScore: row.priority_score,
    }))

    return { entities }
  } catch (error) {
    return {
      entities: [],
      error:
        error instanceof Error
          ? error.message
          : 'Failed to get entities needing sync',
    }
  }
}

/**
 * Get sync status dashboard data
 */
export async function getSyncStatusDashboard(): Promise<{
  status: Array<{
    entityType: string
    syncStatus: SyncStatus
    lastUpdatedUtc: Date
    recordsProcessed: number
    lastSuccessfulSyncAt?: Date
    totalSyncCount: number
    errorCount: number
    hoursSinceLastSync?: number
    healthStatus: string
    successRatePercent: number
  }>
  error?: string
}> {
  try {
    const supabase = createServiceRoleClient()

    const { data, error } = await supabase
      .from('sync_status_dashboard')
      .select('*')

    if (error) {
      return { status: [], error: error.message }
    }

    const status = (data || []).map((row: any) => ({
      entityType: row.entity_type,
      syncStatus: row.sync_status as SyncStatus,
      lastUpdatedUtc: new Date(row.last_updated_utc),
      recordsProcessed: row.records_processed,
      lastSuccessfulSyncAt: row.last_successful_sync_at
        ? new Date(row.last_successful_sync_at)
        : undefined,
      totalSyncCount: row.total_sync_count,
      errorCount: row.error_count,
      hoursSinceLastSync: row.hours_since_last_sync
        ? parseFloat(row.hours_since_last_sync)
        : undefined,
      healthStatus: row.health_status,
      successRatePercent: parseFloat(row.success_rate_percent),
    }))

    return { status }
  } catch (error) {
    return {
      status: [],
      error:
        error instanceof Error
          ? error.message
          : 'Failed to get sync status dashboard',
    }
  }
}

/**
 * Get recent sync activity
 */
export async function getRecentSyncActivity(limit: number = 50): Promise<{
  activity: Array<{
    syncSessionId: string
    sessionType: string
    entityType: string
    syncStatus: SyncStatus
    startedAt: Date
    completedAt?: Date
    durationSeconds?: number
    recordsProcessed: number
    errorMessage?: string
    initiatedByEmail?: string
    initiatedByName?: string
  }>
  error?: string
}> {
  try {
    const supabase = createServiceRoleClient()

    const { data, error } = await supabase
      .from('recent_sync_activity')
      .select('*')
      .limit(limit)

    if (error) {
      return { activity: [], error: error.message }
    }

    const activity = (data || []).map((row: any) => ({
      syncSessionId: row.sync_session_id,
      sessionType: row.session_type,
      entityType: row.entity_type,
      syncStatus: row.sync_status as SyncStatus,
      startedAt: new Date(row.started_at),
      completedAt: row.completed_at ? new Date(row.completed_at) : undefined,
      durationSeconds: row.duration_seconds,
      recordsProcessed: row.records_processed,
      errorMessage: row.error_message,
      initiatedByEmail: row.initiated_by_email,
      initiatedByName: row.initiated_by_name,
    }))

    return { activity }
  } catch (error) {
    return {
      activity: [],
      error:
        error instanceof Error
          ? error.message
          : 'Failed to get recent sync activity',
    }
  }
}
