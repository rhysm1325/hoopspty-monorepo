/**
 * Xero Sync Utilities
 * 
 * Helper functions for managing sync checkpoints, monitoring sync health,
 * and providing sync-related utilities.
 */

import { createServerClient } from '@/lib/supabase/server'

// Entity types that support incremental sync
export const INCREMENTAL_SYNC_ENTITIES = [
  'accounts',
  'contacts', 
  'invoices',
  'payments',
  'credit_notes',
  'items',
  'bank_accounts',
  'bank_transactions',
  'manual_journals',
  'tracking_categories'
] as const

export type IncrementalSyncEntity = typeof INCREMENTAL_SYNC_ENTITIES[number]

// Sync priority levels
export const SYNC_PRIORITIES = {
  HIGH: 1,    // Foundation data (accounts, tracking categories)
  MEDIUM: 5,  // Transactional data (invoices, payments)
  LOW: 10     // Less frequently changing data
} as const

/**
 * Initialize sync checkpoints for all entity types
 */
export async function initializeSyncCheckpoints(): Promise<{
  success: boolean
  initialized: string[]
  errors: string[]
}> {
  const supabase = createServerClient()
  const initialized: string[] = []
  const errors: string[] = []

  try {
    for (const entityType of INCREMENTAL_SYNC_ENTITIES) {
      try {
        const { error } = await supabase
          .from('sync_checkpoints')
          .upsert({
            entity_type: entityType,
            last_updated_utc: new Date('1900-01-01').toISOString(),
            records_processed: 0,
            has_more_records: false,
            sync_status: 'idle',
            total_sync_count: 0,
            error_count: 0,
            rate_limit_hits: 0
          }, {
            onConflict: 'entity_type',
            ignoreDuplicates: true
          })

        if (error) {
          errors.push(`${entityType}: ${error.message}`)
        } else {
          initialized.push(entityType)
        }
      } catch (entityError) {
        const errorMessage = entityError instanceof Error ? entityError.message : 'Unknown error'
        errors.push(`${entityType}: ${errorMessage}`)
      }
    }

    return {
      success: errors.length === 0,
      initialized,
      errors
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown initialization error'
    return {
      success: false,
      initialized,
      errors: [errorMessage]
    }
  }
}

/**
 * Get sync health summary
 */
export async function getSyncHealthSummary(): Promise<{
  overallHealth: 'healthy' | 'warning' | 'error'
  totalEntities: number
  healthyEntities: number
  warningEntities: number
  errorEntities: number
  lastSuccessfulSync?: Date
  entitiesNeedingAttention: Array<{
    entityType: string
    status: string
    issue: string
    lastSync?: Date
  }>
}> {
  const supabase = createServerClient()

  try {
    const { data: entityStatuses } = await supabase
      .from('sync_status_dashboard')
      .select('*')

    if (!entityStatuses) {
      return {
        overallHealth: 'error',
        totalEntities: 0,
        healthyEntities: 0,
        warningEntities: 0,
        errorEntities: 0,
        entitiesNeedingAttention: []
      }
    }

    const healthyEntities = entityStatuses.filter(e => e.health_status === 'healthy').length
    const warningEntities = entityStatuses.filter(e => e.health_status === 'warning').length
    const errorEntities = entityStatuses.filter(e => 
      ['error', 'never_synced', 'overdue'].includes(e.health_status)
    ).length

    const entitiesNeedingAttention = entityStatuses
      .filter(e => e.health_status !== 'healthy')
      .map(e => ({
        entityType: e.entity_type,
        status: e.health_status,
        issue: getHealthIssueDescription(e.health_status, e.hours_since_last_sync, e.error_count),
        lastSync: e.last_successful_sync_at ? new Date(e.last_successful_sync_at) : undefined
      }))

    // Find most recent successful sync across all entities
    const recentSyncs = entityStatuses
      .filter(e => e.last_successful_sync_at)
      .map(e => new Date(e.last_successful_sync_at))
      .sort((a, b) => b.getTime() - a.getTime())

    const lastSuccessfulSync = recentSyncs.length > 0 ? recentSyncs[0] : undefined

    // Determine overall health
    let overallHealth: 'healthy' | 'warning' | 'error'
    if (errorEntities > 0) {
      overallHealth = 'error'
    } else if (warningEntities > 0) {
      overallHealth = 'warning'
    } else {
      overallHealth = 'healthy'
    }

    return {
      overallHealth,
      totalEntities: entityStatuses.length,
      healthyEntities,
      warningEntities,
      errorEntities,
      lastSuccessfulSync,
      entitiesNeedingAttention
    }
  } catch (error) {
    console.error('Failed to get sync health summary:', error)
    return {
      overallHealth: 'error',
      totalEntities: 0,
      healthyEntities: 0,
      warningEntities: 0,
      errorEntities: 0,
      entitiesNeedingAttention: [{
        entityType: 'system',
        status: 'error',
        issue: 'Failed to fetch sync health data'
      }]
    }
  }
}

/**
 * Get human-readable description of health issues
 */
function getHealthIssueDescription(
  healthStatus: string, 
  hoursSinceLastSync?: number, 
  errorCount?: number
): string {
  switch (healthStatus) {
    case 'error':
      return `Sync errors detected${errorCount ? ` (${errorCount} consecutive failures)` : ''}`
    case 'never_synced':
      return 'Never been synced - requires initial sync'
    case 'overdue':
      const hours = hoursSinceLastSync || 0
      if (hours > 48) {
        return `Severely overdue (${Math.floor(hours / 24)} days since last sync)`
      } else {
        return `Overdue (${Math.floor(hours)} hours since last sync)`
      }
    case 'warning':
      return 'Sync completed with warnings - check logs'
    case 'expiring_soon':
      return 'OAuth token expiring soon - may need re-authentication'
    default:
      return 'Unknown issue detected'
  }
}

/**
 * Get recommended sync frequency for entity type
 */
export function getRecommendedSyncFrequency(entityType: string): {
  hours: number
  description: string
} {
  const frequencies: Record<string, { hours: number; description: string }> = {
    // High frequency - transactional data
    invoices: { hours: 2, description: 'Every 2 hours (high transaction volume)' },
    payments: { hours: 2, description: 'Every 2 hours (payment processing)' },
    bank_transactions: { hours: 4, description: 'Every 4 hours (banking activity)' },

    // Medium frequency - reference data that changes occasionally
    contacts: { hours: 6, description: 'Every 6 hours (customer/supplier changes)' },
    credit_notes: { hours: 6, description: 'Every 6 hours (credit processing)' },
    items: { hours: 12, description: 'Every 12 hours (inventory changes)' },

    // Low frequency - master data that rarely changes
    accounts: { hours: 24, description: 'Daily (chart of accounts)' },
    tracking_categories: { hours: 24, description: 'Daily (tracking setup)' },
    bank_accounts: { hours: 24, description: 'Daily (account setup)' },
    manual_journals: { hours: 12, description: 'Every 12 hours (manual entries)' }
  }

  return frequencies[entityType] || { 
    hours: 24, 
    description: 'Daily (default frequency)' 
  }
}

/**
 * Calculate sync progress for a running session
 */
export async function calculateSyncProgress(sessionId: string): Promise<{
  overallProgress: number
  currentEntity?: string
  entitiesCompleted: number
  entitiesTotal: number
  estimatedTimeRemaining?: number
}> {
  const supabase = createServerClient()

  try {
    // Get session details
    const { data: session } = await supabase
      .from('sync_sessions')
      .select('target_entities, started_at')
      .eq('id', sessionId)
      .single()

    if (!session) {
      return {
        overallProgress: 0,
        entitiesCompleted: 0,
        entitiesTotal: 0
      }
    }

    // Get completed sync logs for this session
    const { data: logs } = await supabase
      .from('sync_logs')
      .select('entity_type, sync_status, started_at, completed_at')
      .eq('sync_session_id', sessionId)
      .order('started_at')

    const targetEntities = session.target_entities || []
    const completedLogs = logs?.filter(log => 
      ['completed', 'error'].includes(log.sync_status)
    ) || []

    const runningLog = logs?.find(log => log.sync_status === 'running')

    const entitiesCompleted = completedLogs.length
    const entitiesTotal = targetEntities.length
    const overallProgress = entitiesTotal > 0 ? (entitiesCompleted / entitiesTotal) * 100 : 0

    // Estimate time remaining based on average completion time
    let estimatedTimeRemaining: number | undefined

    if (completedLogs.length > 0 && entitiesCompleted < entitiesTotal) {
      const completionTimes = completedLogs
        .filter(log => log.completed_at && log.started_at)
        .map(log => {
          const start = new Date(log.started_at).getTime()
          const end = new Date(log.completed_at!).getTime()
          return end - start
        })

      if (completionTimes.length > 0) {
        const avgCompletionTime = completionTimes.reduce((a, b) => a + b, 0) / completionTimes.length
        const entitiesRemaining = entitiesTotal - entitiesCompleted
        estimatedTimeRemaining = Math.floor((avgCompletionTime * entitiesRemaining) / 1000) // seconds
      }
    }

    return {
      overallProgress: Math.round(overallProgress),
      currentEntity: runningLog?.entity_type,
      entitiesCompleted,
      entitiesTotal,
      estimatedTimeRemaining
    }
  } catch (error) {
    console.error('Failed to calculate sync progress:', error)
    return {
      overallProgress: 0,
      entitiesCompleted: 0,
      entitiesTotal: 0
    }
  }
}

/**
 * Format sync duration for display
 */
export function formatSyncDuration(durationMs: number): string {
  const seconds = Math.floor(durationMs / 1000)
  const minutes = Math.floor(seconds / 60)
  const hours = Math.floor(minutes / 60)

  if (hours > 0) {
    return `${hours}h ${minutes % 60}m ${seconds % 60}s`
  } else if (minutes > 0) {
    return `${minutes}m ${seconds % 60}s`
  } else {
    return `${seconds}s`
  }
}

/**
 * Format record count for display
 */
export function formatRecordCount(count: number): string {
  if (count >= 1000000) {
    return `${(count / 1000000).toFixed(1)}M`
  } else if (count >= 1000) {
    return `${(count / 1000).toFixed(1)}K`
  } else {
    return count.toString()
  }
}
