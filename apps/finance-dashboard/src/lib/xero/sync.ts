/**
 * Xero Incremental Sync System
 * 
 * This module implements incremental synchronization with Xero using If-Modified-Since headers
 * and sync checkpoints to efficiently sync only changed data since the last sync.
 * 
 * Features:
 * - Incremental sync with If-Modified-Since headers
 * - Sync checkpoint management for each entity type
 * - Batch processing with configurable page sizes
 * - Comprehensive sync session tracking
 * - Error handling with detailed logging
 * - Performance metrics and monitoring
 */

import { createServerClient } from '@/lib/supabase/server'
import { XeroClient } from '@/lib/xero/client'
import { XeroStaging } from '@/lib/xero/staging'
import { config } from '@/lib/env'
import type { 
  XeroAccount,
  XeroContact,
  XeroInvoice,
  XeroPayment,
  XeroCreditNote,
  XeroItem,
  XeroBankAccount,
  XeroBankTransaction,
  XeroManualJournal,
  XeroTrackingCategory
} from '@/types/xero'

// Sync configuration for each entity type
interface EntitySyncConfig {
  entityType: string
  tableName: string
  batchSize: number
  priority: number // Lower number = higher priority
  dependencies: string[] // Entities that must be synced first
  supportsIncrementalSync: boolean
  defaultSyncInterval: number // Hours between syncs
}

// Sync checkpoint interface
interface SyncCheckpoint {
  id: string
  entityType: string
  lastUpdatedUtc: Date
  recordsProcessed: number
  hasMoreRecords: boolean
  syncStatus: 'idle' | 'running' | 'completed' | 'error' | 'cancelled' | 'partial'
  errorMessage?: string
  lastSyncStartedAt?: Date
  lastSyncCompletedAt?: Date
  lastSuccessfulSyncAt?: Date
  totalSyncCount: number
  errorCount: number
  rateLimitHits: number
}

// Sync session interface
interface SyncSession {
  id: string
  sessionType: 'manual' | 'scheduled' | 'initial'
  syncScope: 'full' | 'incremental' | 'entity_specific'
  targetEntities: string[]
  status: 'running' | 'completed' | 'error' | 'cancelled'
  startedAt: Date
  completedAt?: Date
  totalDurationSeconds?: number
  totalRecordsProcessed: number
  totalApiCalls: number
  successRate?: number
  initiatedBy: string
  xeroTenantId?: string
}

// Sync result for individual entity
interface EntitySyncResult {
  entityType: string
  success: boolean
  recordsProcessed: number
  recordsInserted: number
  recordsUpdated: number
  recordsSkipped: number
  recordsFailed: number
  apiCallsMade: number
  rateLimitHits: number
  duration: number
  lastModified?: Date
  hasMoreRecords: boolean
  error?: string
  performanceMetrics: Record<string, any>
}

// Overall sync result
interface SyncResult {
  sessionId: string
  success: boolean
  entitiesProcessed: number
  totalRecordsProcessed: number
  totalApiCalls: number
  totalDuration: number
  successRate: number
  entityResults: EntitySyncResult[]
  errors: string[]
}

class XeroIncrementalSync {
  private readonly entityConfigs: EntitySyncConfig[] = [
    // High priority - foundation data
    {
      entityType: 'accounts',
      tableName: 'stg_accounts',
      batchSize: 100,
      priority: 1,
      dependencies: [],
      supportsIncrementalSync: true,
      defaultSyncInterval: 24 // Daily
    },
    {
      entityType: 'tracking_categories',
      tableName: 'stg_tracking_categories',
      batchSize: 100,
      priority: 2,
      dependencies: [],
      supportsIncrementalSync: true,
      defaultSyncInterval: 24
    },
    {
      entityType: 'contacts',
      tableName: 'stg_contacts',
      batchSize: 100,
      priority: 3,
      dependencies: [],
      supportsIncrementalSync: true,
      defaultSyncInterval: 6 // Every 6 hours
    },
    {
      entityType: 'items',
      tableName: 'stg_items',
      batchSize: 100,
      priority: 4,
      dependencies: ['accounts'],
      supportsIncrementalSync: true,
      defaultSyncInterval: 12
    },
    
    // Medium priority - transactional data
    {
      entityType: 'invoices',
      tableName: 'stg_invoices',
      batchSize: 50,
      priority: 5,
      dependencies: ['accounts', 'contacts', 'items'],
      supportsIncrementalSync: true,
      defaultSyncInterval: 2 // Every 2 hours
    },
    {
      entityType: 'payments',
      tableName: 'stg_payments',
      batchSize: 100,
      priority: 6,
      dependencies: ['invoices'],
      supportsIncrementalSync: true,
      defaultSyncInterval: 2
    },
    {
      entityType: 'credit_notes',
      tableName: 'stg_credit_notes',
      batchSize: 100,
      priority: 7,
      dependencies: ['accounts', 'contacts'],
      supportsIncrementalSync: true,
      defaultSyncInterval: 6
    },
    {
      entityType: 'bank_accounts',
      tableName: 'stg_bank_accounts',
      batchSize: 100,
      priority: 8,
      dependencies: [],
      supportsIncrementalSync: true,
      defaultSyncInterval: 24
    },
    {
      entityType: 'bank_transactions',
      tableName: 'stg_bank_transactions',
      batchSize: 50,
      priority: 9,
      dependencies: ['bank_accounts', 'contacts'],
      supportsIncrementalSync: true,
      defaultSyncInterval: 4
    },
    
    // Lower priority - less frequently changing data
    {
      entityType: 'manual_journals',
      tableName: 'stg_manual_journals',
      batchSize: 100,
      priority: 10,
      dependencies: ['accounts'],
      supportsIncrementalSync: true,
      defaultSyncInterval: 12
    }
  ]

  /**
   * Perform full incremental sync for all entities
   */
  async performFullSync(
    initiatedBy: string,
    tenantId?: string,
    sessionType: 'manual' | 'scheduled' = 'manual'
  ): Promise<SyncResult> {
    const sessionId = await this.createSyncSession({
      sessionType,
      syncScope: 'incremental',
      targetEntities: this.entityConfigs.map(c => c.entityType),
      initiatedBy,
      xeroTenantId: tenantId
    })

    this.log('info', 'Starting full incremental sync', { 
      sessionId, 
      sessionType, 
      initiatedBy,
      tenantId
    })

    const startTime = Date.now()
    const entityResults: EntitySyncResult[] = []
    const errors: string[] = []
    let totalRecordsProcessed = 0
    let totalApiCalls = 0

    try {
      // Connect to Xero
      const connectionResult = await XeroClient.connect(tenantId)
      if (!connectionResult.success) {
        throw new Error(`Failed to connect to Xero: ${connectionResult.error}`)
      }

      // Get entities that need syncing, sorted by priority and dependencies
      const entitiesToSync = await this.getEntitiesNeedingSync()
      const sortedEntities = this.sortEntitiesByDependencies(entitiesToSync)

      this.log('info', 'Entities identified for sync', {
        sessionId,
        totalEntities: sortedEntities.length,
        entities: sortedEntities.map(e => e.entityType)
      })

      // Sync each entity in order
      for (const entityConfig of sortedEntities) {
        try {
          const result = await this.syncEntity(sessionId, entityConfig, initiatedBy)
          entityResults.push(result)
          
          totalRecordsProcessed += result.recordsProcessed
          totalApiCalls += result.apiCallsMade

          if (!result.success) {
            errors.push(`${result.entityType}: ${result.error}`)
          }

          this.log('info', `Entity sync completed: ${entityConfig.entityType}`, {
            sessionId,
            success: result.success,
            recordsProcessed: result.recordsProcessed,
            duration: result.duration
          })

        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error'
          errors.push(`${entityConfig.entityType}: ${errorMessage}`)
          
          entityResults.push({
            entityType: entityConfig.entityType,
            success: false,
            recordsProcessed: 0,
            recordsInserted: 0,
            recordsUpdated: 0,
            recordsSkipped: 0,
            recordsFailed: 0,
            apiCallsMade: 0,
            rateLimitHits: 0,
            duration: 0,
            hasMoreRecords: false,
            error: errorMessage,
            performanceMetrics: {}
          })

          this.log('error', `Entity sync failed: ${entityConfig.entityType}`, {
            sessionId,
            error: errorMessage
          })
        }
      }

      const totalDuration = Date.now() - startTime
      const successfulSyncs = entityResults.filter(r => r.success).length
      const successRate = entityResults.length > 0 ? (successfulSyncs / entityResults.length) * 100 : 0

      // Complete sync session
      await this.completeSyncSession(sessionId, {
        status: errors.length === 0 ? 'completed' : 'partial',
        totalDurationSeconds: Math.floor(totalDuration / 1000),
        totalRecordsProcessed,
        totalApiCalls,
        successRate
      })

      const result: SyncResult = {
        sessionId,
        success: errors.length === 0,
        entitiesProcessed: entityResults.length,
        totalRecordsProcessed,
        totalApiCalls,
        totalDuration,
        successRate,
        entityResults,
        errors
      }

      this.log('info', 'Full sync completed', {
        sessionId,
        success: result.success,
        entitiesProcessed: result.entitiesProcessed,
        totalRecordsProcessed: result.totalRecordsProcessed,
        totalDuration: result.totalDuration,
        successRate: result.successRate,
        errorCount: errors.length
      })

      return result

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown sync error'
      errors.push(errorMessage)

      await this.completeSyncSession(sessionId, {
        status: 'error',
        totalDurationSeconds: Math.floor((Date.now() - startTime) / 1000),
        totalRecordsProcessed,
        totalApiCalls,
        successRate: 0
      })

      this.log('error', 'Full sync failed', { sessionId, error: errorMessage })

      return {
        sessionId,
        success: false,
        entitiesProcessed: entityResults.length,
        totalRecordsProcessed,
        totalApiCalls,
        totalDuration: Date.now() - startTime,
        successRate: 0,
        entityResults,
        errors
      }
    }
  }

  /**
   * Sync specific entities
   */
  async syncSpecificEntities(
    entityTypes: string[],
    initiatedBy: string,
    tenantId?: string,
    forceFullSync = false
  ): Promise<SyncResult> {
    const sessionId = await this.createSyncSession({
      sessionType: 'manual',
      syncScope: 'entity_specific',
      targetEntities: entityTypes,
      initiatedBy,
      xeroTenantId: tenantId
    })

    this.log('info', 'Starting specific entity sync', { 
      sessionId, 
      entityTypes, 
      initiatedBy,
      forceFullSync
    })

    const startTime = Date.now()
    const entityResults: EntitySyncResult[] = []
    const errors: string[] = []
    let totalRecordsProcessed = 0
    let totalApiCalls = 0

    try {
      // Connect to Xero
      const connectionResult = await XeroClient.connect(tenantId)
      if (!connectionResult.success) {
        throw new Error(`Failed to connect to Xero: ${connectionResult.error}`)
      }

      // Get entity configurations for requested types
      const entityConfigs = this.entityConfigs.filter(c => 
        entityTypes.includes(c.entityType)
      )

      if (entityConfigs.length === 0) {
        throw new Error(`No valid entity types found: ${entityTypes.join(', ')}`)
      }

      // Sort by dependencies
      const sortedConfigs = this.sortEntitiesByDependencies(entityConfigs)

      // Sync each entity
      for (const entityConfig of sortedConfigs) {
        try {
          // Override incremental sync if force full sync is requested
          const configOverride = forceFullSync ? 
            { ...entityConfig, supportsIncrementalSync: false } : 
            entityConfig

          const result = await this.syncEntity(sessionId, configOverride, initiatedBy)
          entityResults.push(result)
          
          totalRecordsProcessed += result.recordsProcessed
          totalApiCalls += result.apiCallsMade

          if (!result.success) {
            errors.push(`${result.entityType}: ${result.error}`)
          }

        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error'
          errors.push(`${entityConfig.entityType}: ${errorMessage}`)
          
          entityResults.push({
            entityType: entityConfig.entityType,
            success: false,
            recordsProcessed: 0,
            recordsInserted: 0,
            recordsUpdated: 0,
            recordsSkipped: 0,
            recordsFailed: 0,
            apiCallsMade: 0,
            rateLimitHits: 0,
            duration: 0,
            hasMoreRecords: false,
            error: errorMessage,
            performanceMetrics: {}
          })
        }
      }

      const totalDuration = Date.now() - startTime
      const successfulSyncs = entityResults.filter(r => r.success).length
      const successRate = entityResults.length > 0 ? (successfulSyncs / entityResults.length) * 100 : 0

      await this.completeSyncSession(sessionId, {
        status: errors.length === 0 ? 'completed' : 'partial',
        totalDurationSeconds: Math.floor(totalDuration / 1000),
        totalRecordsProcessed,
        totalApiCalls,
        successRate
      })

      return {
        sessionId,
        success: errors.length === 0,
        entitiesProcessed: entityResults.length,
        totalRecordsProcessed,
        totalApiCalls,
        totalDuration,
        successRate,
        entityResults,
        errors
      }

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown sync error'
      errors.push(errorMessage)

      await this.completeSyncSession(sessionId, {
        status: 'error',
        totalDurationSeconds: Math.floor((Date.now() - startTime) / 1000),
        totalRecordsProcessed,
        totalApiCalls,
        successRate: 0
      })

      return {
        sessionId,
        success: false,
        entitiesProcessed: entityResults.length,
        totalRecordsProcessed,
        totalApiCalls,
        totalDuration: Date.now() - startTime,
        successRate: 0,
        entityResults,
        errors
      }
    }
  }

  /**
   * Sync individual entity with incremental support
   */
  private async syncEntity(
    sessionId: string,
    entityConfig: EntitySyncConfig,
    initiatedBy: string
  ): Promise<EntitySyncResult> {
    const startTime = Date.now()
    let recordsProcessed = 0
    let recordsInserted = 0
    let recordsUpdated = 0
    let recordsSkipped = 0
    let recordsFailed = 0
    let apiCallsMade = 0
    let rateLimitHits = 0
    let lastModified: Date | undefined
    let hasMoreRecords = false

    try {
      this.log('info', `Starting entity sync: ${entityConfig.entityType}`, {
        sessionId,
        entityType: entityConfig.entityType,
        supportsIncremental: entityConfig.supportsIncrementalSync
      })

      // Update checkpoint to running status
      await this.updateSyncCheckpoint(entityConfig.entityType, {
        syncStatus: 'running',
        lastSyncStartedAt: new Date()
      })

      // Get last sync checkpoint for incremental sync
      const checkpoint = await this.getSyncCheckpoint(entityConfig.entityType)
      const modifiedSince = entityConfig.supportsIncrementalSync && checkpoint?.lastSuccessfulSyncAt
        ? checkpoint.lastSuccessfulSyncAt
        : undefined

      // Log sync start
      const logId = await this.createSyncLog({
        syncSessionId: sessionId,
        entityType: entityConfig.entityType,
        syncStatus: 'running',
        initiatedBy
      })

      // Perform the actual sync based on entity type
      const syncResult = await this.performEntitySync(entityConfig, modifiedSince)
      
      recordsProcessed = syncResult.recordsProcessed
      recordsInserted = syncResult.recordsInserted
      recordsUpdated = syncResult.recordsUpdated
      recordsSkipped = syncResult.recordsSkipped
      recordsFailed = syncResult.recordsFailed
      apiCallsMade = syncResult.apiCallsMade
      rateLimitHits = syncResult.rateLimitHits
      lastModified = syncResult.lastModified
      hasMoreRecords = syncResult.hasMoreRecords

      const duration = Date.now() - startTime

      // Update sync log with results
      await this.completeSyncLog(logId, {
        syncStatus: syncResult.success ? 'completed' : 'error',
        completedAt: new Date(),
        durationSeconds: Math.floor(duration / 1000),
        recordsProcessed,
        recordsInserted,
        recordsUpdated,
        recordsFailed,
        apiCallsMade,
        rateLimitHits,
        errorMessage: syncResult.error
      })

      // Update checkpoint
      await this.updateSyncCheckpoint(entityConfig.entityType, {
        syncStatus: syncResult.success ? 'completed' : 'error',
        lastSyncCompletedAt: new Date(),
        lastSuccessfulSyncAt: syncResult.success ? new Date() : undefined,
        lastUpdatedUtc: lastModified || new Date(),
        recordsProcessed: checkpoint ? checkpoint.recordsProcessed + recordsProcessed : recordsProcessed,
        hasMoreRecords,
        errorMessage: syncResult.error,
        totalSyncCount: checkpoint ? checkpoint.totalSyncCount + 1 : 1,
        errorCount: syncResult.success ? 0 : (checkpoint ? checkpoint.errorCount + 1 : 1),
        rateLimitHits: checkpoint ? checkpoint.rateLimitHits + rateLimitHits : rateLimitHits
      })

      return {
        entityType: entityConfig.entityType,
        success: syncResult.success,
        recordsProcessed,
        recordsInserted,
        recordsUpdated,
        recordsSkipped,
        recordsFailed,
        apiCallsMade,
        rateLimitHits,
        duration,
        lastModified,
        hasMoreRecords,
        error: syncResult.error,
        performanceMetrics: {
          avgRecordProcessingTime: recordsProcessed > 0 ? duration / recordsProcessed : 0,
          apiCallsPerRecord: recordsProcessed > 0 ? apiCallsMade / recordsProcessed : 0,
          successRate: recordsProcessed > 0 ? ((recordsProcessed - recordsFailed) / recordsProcessed) * 100 : 100
        }
      }

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown entity sync error'
      const duration = Date.now() - startTime

      // Update checkpoint with error
      await this.updateSyncCheckpoint(entityConfig.entityType, {
        syncStatus: 'error',
        lastSyncCompletedAt: new Date(),
        errorMessage,
        errorCount: (await this.getSyncCheckpoint(entityConfig.entityType))?.errorCount ?? 0 + 1
      })

      this.log('error', `Entity sync failed: ${entityConfig.entityType}`, {
        sessionId,
        error: errorMessage,
        duration
      })

      return {
        entityType: entityConfig.entityType,
        success: false,
        recordsProcessed,
        recordsInserted,
        recordsUpdated,
        recordsSkipped,
        recordsFailed,
        apiCallsMade,
        rateLimitHits,
        duration,
        hasMoreRecords: false,
        error: errorMessage,
        performanceMetrics: {}
      }
    }
  }

  /**
   * Perform actual sync for specific entity type
   */
  private async performEntitySync(
    entityConfig: EntitySyncConfig,
    modifiedSince?: Date
  ): Promise<{
    success: boolean
    recordsProcessed: number
    recordsInserted: number
    recordsUpdated: number
    recordsSkipped: number
    recordsFailed: number
    apiCallsMade: number
    rateLimitHits: number
    lastModified?: Date
    hasMoreRecords: boolean
    error?: string
  }> {
    try {
      // Build sync options
      const syncOptions = {
        modifiedSince,
        pageSize: entityConfig.batchSize,
        includeArchived: false
      }

      // Call appropriate sync method based on entity type
      switch (entityConfig.entityType) {
        case 'accounts':
          return await this.syncAccountsData(syncOptions)
        case 'contacts':
          return await this.syncContactsData(syncOptions)
        case 'invoices':
          return await this.syncInvoicesData(syncOptions)
        case 'payments':
          return await this.syncPaymentsData(syncOptions)
        case 'credit_notes':
          return await this.syncCreditNotesData(syncOptions)
        case 'items':
          return await this.syncItemsData(syncOptions)
        case 'bank_accounts':
          return await this.syncBankAccountsData(syncOptions)
        case 'bank_transactions':
          return await this.syncBankTransactionsData(syncOptions)
        case 'manual_journals':
          return await this.syncManualJournalsData(syncOptions)
        case 'tracking_categories':
          return await this.syncTrackingCategoriesData(syncOptions)
        default:
          throw new Error(`Unsupported entity type: ${entityConfig.entityType}`)
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown sync error'
      return {
        success: false,
        recordsProcessed: 0,
        recordsInserted: 0,
        recordsUpdated: 0,
        recordsSkipped: 0,
        recordsFailed: 0,
        apiCallsMade: 0,
        rateLimitHits: 0,
        hasMoreRecords: false,
        error: errorMessage
      }
    }
  }

  /**
   * Sync accounts data
   */
  private async syncAccountsData(options: any) {
    const result = await XeroClient.syncAccounts(options)
    
    if (!result.success) {
      return {
        success: false,
        recordsProcessed: 0,
        recordsInserted: 0,
        recordsUpdated: 0,
        recordsSkipped: 0,
        recordsFailed: 0,
        apiCallsMade: 1,
        rateLimitHits: 0,
        hasMoreRecords: false,
        error: result.error
      }
    }

    // Process and store the records in staging tables
    const stagingResult = await XeroStaging.upsertAccounts(result.records as XeroAccount[])
    
    return {
      success: stagingResult.success,
      recordsProcessed: result.records.length,
      recordsInserted: stagingResult.recordsInserted,
      recordsUpdated: stagingResult.recordsUpdated,
      recordsSkipped: stagingResult.recordsSkipped,
      recordsFailed: stagingResult.recordsFailed,
      apiCallsMade: 1,
      rateLimitHits: 0,
      lastModified: result.lastModified,
      hasMoreRecords: result.hasMoreRecords,
      error: stagingResult.errors.length > 0 ? stagingResult.errors.join('; ') : undefined
    }
  }

  /**
   * Sync contacts data
   */
  private async syncContactsData(options: any) {
    const result = await XeroClient.syncContacts(options)
    
    if (!result.success) {
      return this.createErrorSyncResult(result.error)
    }

    const stagingResult = await XeroStaging.upsertContacts(result.records as XeroContact[])
    return this.createStagingSyncResult(result, stagingResult)
  }

  private async syncInvoicesData(options: any) {
    const result = await XeroClient.syncInvoices(options)
    
    if (!result.success) {
      return this.createErrorSyncResult(result.error)
    }

    const stagingResult = await XeroStaging.upsertInvoices(result.records as XeroInvoice[])
    return this.createStagingSyncResult(result, stagingResult)
  }

  private async syncPaymentsData(options: any) {
    const result = await XeroClient.syncPayments(options)
    
    if (!result.success) {
      return this.createErrorSyncResult(result.error)
    }

    const stagingResult = await XeroStaging.upsertPayments(result.records as XeroPayment[])
    return this.createStagingSyncResult(result, stagingResult)
  }

  private async syncCreditNotesData(options: any) {
    const result = await XeroClient.syncCreditNotes(options)
    
    if (!result.success) {
      return this.createErrorSyncResult(result.error)
    }

    const stagingResult = await XeroStaging.upsertCreditNotes(result.records as XeroCreditNote[])
    return this.createStagingSyncResult(result, stagingResult)
  }

  private async syncItemsData(options: any) {
    const result = await XeroClient.syncItems(options)
    
    if (!result.success) {
      return this.createErrorSyncResult(result.error)
    }

    const stagingResult = await XeroStaging.upsertItems(result.records as XeroItem[])
    return this.createStagingSyncResult(result, stagingResult)
  }

  private async syncBankAccountsData(options: any) {
    const result = await XeroClient.syncBankAccounts(options)
    
    if (!result.success) {
      return this.createErrorSyncResult(result.error)
    }

    const stagingResult = await XeroStaging.upsertBankAccounts(result.records as XeroBankAccount[])
    return this.createStagingSyncResult(result, stagingResult)
  }

  private async syncBankTransactionsData(options: any) {
    const result = await XeroClient.syncBankTransactions(options)
    
    if (!result.success) {
      return this.createErrorSyncResult(result.error)
    }

    const stagingResult = await XeroStaging.upsertBankTransactions(result.records as XeroBankTransaction[])
    return this.createStagingSyncResult(result, stagingResult)
  }

  private async syncManualJournalsData(options: any) {
    const result = await XeroClient.syncManualJournals(options)
    
    if (!result.success) {
      return this.createErrorSyncResult(result.error)
    }

    const stagingResult = await XeroStaging.upsertManualJournals(result.records as XeroManualJournal[])
    return this.createStagingSyncResult(result, stagingResult)
  }

  private async syncTrackingCategoriesData(options: any) {
    const result = await XeroClient.syncTrackingCategories(options)
    
    if (!result.success) {
      return this.createErrorSyncResult(result.error)
    }

    const stagingResult = await XeroStaging.upsertTrackingCategories(result.records as XeroTrackingCategory[])
    return this.createStagingSyncResult(result, stagingResult)
  }

  /**
   * Helper methods for sync result processing
   */
  private createErrorSyncResult(error: string) {
    return {
      success: false,
      recordsProcessed: 0,
      recordsInserted: 0,
      recordsUpdated: 0,
      recordsSkipped: 0,
      recordsFailed: 0,
      apiCallsMade: 1,
      rateLimitHits: 0,
      hasMoreRecords: false,
      error
    }
  }

  private createStagingSyncResult(apiResult: any, stagingResult: any) {
    return {
      success: stagingResult.success,
      recordsProcessed: apiResult.records.length,
      recordsInserted: stagingResult.recordsInserted,
      recordsUpdated: stagingResult.recordsUpdated,
      recordsSkipped: stagingResult.recordsSkipped,
      recordsFailed: stagingResult.recordsFailed,
      apiCallsMade: 1,
      rateLimitHits: 0,
      lastModified: apiResult.lastModified,
      hasMoreRecords: apiResult.hasMoreRecords,
      error: stagingResult.errors.length > 0 ? stagingResult.errors.join('; ') : undefined
    }
  }

  /**
   * Database helper methods
   */
  private async createSyncSession(params: {
    sessionType: 'manual' | 'scheduled' | 'initial'
    syncScope: 'full' | 'incremental' | 'entity_specific'
    targetEntities: string[]
    initiatedBy: string
    xeroTenantId?: string
  }): Promise<string> {
    const supabase = createServerClient()
    
    const { data, error } = await supabase
      .from('sync_sessions')
      .insert({
        session_type: params.sessionType,
        sync_scope: params.syncScope,
        target_entities: params.targetEntities,
        initiated_by: params.initiatedBy,
        xero_tenant_id: params.xeroTenantId
      })
      .select('id')
      .single()

    if (error) {
      throw new Error(`Failed to create sync session: ${error.message}`)
    }

    return data.id
  }

  private async completeSyncSession(sessionId: string, updates: {
    status: 'completed' | 'error' | 'partial'
    totalDurationSeconds: number
    totalRecordsProcessed: number
    totalApiCalls: number
    successRate: number
  }): Promise<void> {
    const supabase = createServerClient()
    
    const { error } = await supabase
      .from('sync_sessions')
      .update({
        status: updates.status,
        completed_at: new Date().toISOString(),
        total_duration_seconds: updates.totalDurationSeconds,
        total_records_processed: updates.totalRecordsProcessed,
        total_api_calls: updates.totalApiCalls,
        success_rate: updates.successRate
      })
      .eq('id', sessionId)

    if (error) {
      this.log('error', 'Failed to complete sync session', { sessionId, error: error.message })
    }
  }

  private async getSyncCheckpoint(entityType: string): Promise<SyncCheckpoint | null> {
    const supabase = createServerClient()
    
    const { data, error } = await supabase
      .from('sync_checkpoints')
      .select('*')
      .eq('entity_type', entityType)
      .single()

    if (error && error.code !== 'PGRST116') {
      this.log('error', 'Failed to get sync checkpoint', { entityType, error: error.message })
      return null
    }

    return data ? {
      id: data.id,
      entityType: data.entity_type,
      lastUpdatedUtc: new Date(data.last_updated_utc),
      recordsProcessed: data.records_processed,
      hasMoreRecords: data.has_more_records,
      syncStatus: data.sync_status,
      errorMessage: data.error_message,
      lastSyncStartedAt: data.last_sync_started_at ? new Date(data.last_sync_started_at) : undefined,
      lastSyncCompletedAt: data.last_sync_completed_at ? new Date(data.last_sync_completed_at) : undefined,
      lastSuccessfulSyncAt: data.last_successful_sync_at ? new Date(data.last_successful_sync_at) : undefined,
      totalSyncCount: data.total_sync_count,
      errorCount: data.error_count,
      rateLimitHits: data.rate_limit_hits
    } : null
  }

  private async updateSyncCheckpoint(entityType: string, updates: Partial<SyncCheckpoint>): Promise<void> {
    const supabase = createServerClient()
    
    // Convert updates to database format
    const dbUpdates: any = {}
    
    if (updates.syncStatus) dbUpdates.sync_status = updates.syncStatus
    if (updates.lastUpdatedUtc) dbUpdates.last_updated_utc = updates.lastUpdatedUtc.toISOString()
    if (updates.recordsProcessed !== undefined) dbUpdates.records_processed = updates.recordsProcessed
    if (updates.hasMoreRecords !== undefined) dbUpdates.has_more_records = updates.hasMoreRecords
    if (updates.errorMessage !== undefined) dbUpdates.error_message = updates.errorMessage
    if (updates.lastSyncStartedAt) dbUpdates.last_sync_started_at = updates.lastSyncStartedAt.toISOString()
    if (updates.lastSyncCompletedAt) dbUpdates.last_sync_completed_at = updates.lastSyncCompletedAt.toISOString()
    if (updates.lastSuccessfulSyncAt) dbUpdates.last_successful_sync_at = updates.lastSuccessfulSyncAt.toISOString()
    if (updates.totalSyncCount !== undefined) dbUpdates.total_sync_count = updates.totalSyncCount
    if (updates.errorCount !== undefined) dbUpdates.error_count = updates.errorCount
    if (updates.rateLimitHits !== undefined) dbUpdates.rate_limit_hits = updates.rateLimitHits

    const { error } = await supabase
      .from('sync_checkpoints')
      .upsert({
        entity_type: entityType,
        ...dbUpdates,
        updated_at: new Date().toISOString()
      })

    if (error) {
      this.log('error', 'Failed to update sync checkpoint', { entityType, error: error.message })
    }
  }

  private async createSyncLog(params: {
    syncSessionId: string
    entityType: string
    syncStatus: 'running'
    initiatedBy: string
  }): Promise<string> {
    const supabase = createServerClient()
    
    const { data, error } = await supabase
      .from('sync_logs')
      .insert({
        sync_session_id: params.syncSessionId,
        entity_type: params.entityType,
        sync_status: params.syncStatus,
        initiated_by: params.initiatedBy
      })
      .select('id')
      .single()

    if (error) {
      throw new Error(`Failed to create sync log: ${error.message}`)
    }

    return data.id
  }

  private async completeSyncLog(logId: string, updates: {
    syncStatus: 'completed' | 'error'
    completedAt: Date
    durationSeconds: number
    recordsProcessed: number
    recordsInserted: number
    recordsUpdated: number
    recordsFailed: number
    apiCallsMade: number
    rateLimitHits: number
    errorMessage?: string
  }): Promise<void> {
    const supabase = createServerClient()
    
    const { error } = await supabase
      .from('sync_logs')
      .update({
        sync_status: updates.syncStatus,
        completed_at: updates.completedAt.toISOString(),
        duration_seconds: updates.durationSeconds,
        records_processed: updates.recordsProcessed,
        records_inserted: updates.recordsInserted,
        records_updated: updates.recordsUpdated,
        records_failed: updates.recordsFailed,
        api_calls_made: updates.apiCallsMade,
        rate_limit_hits: updates.rateLimitHits,
        error_message: updates.errorMessage
      })
      .eq('id', logId)

    if (error) {
      this.log('error', 'Failed to complete sync log', { logId, error: error.message })
    }
  }

  private async getEntitiesNeedingSync(): Promise<EntitySyncConfig[]> {
    const supabase = createServerClient()
    
    // Get entities that haven't been synced recently or have errors
    const { data, error } = await supabase
      .rpc('get_entities_needing_sync', { max_age_hours: 24 })

    if (error) {
      this.log('error', 'Failed to get entities needing sync', { error: error.message })
      // Return all entities as fallback
      return this.entityConfigs
    }

    // Map database results to entity configs
    const needingSyncTypes = data?.map((row: any) => row.entity_type) || []
    
    return this.entityConfigs.filter(config => 
      needingSyncTypes.includes(config.entityType) ||
      // Always include high priority entities
      config.priority <= 5
    )
  }

  private sortEntitiesByDependencies(entities: EntitySyncConfig[]): EntitySyncConfig[] {
    const sorted: EntitySyncConfig[] = []
    const remaining = [...entities]
    
    while (remaining.length > 0) {
      const nextBatch = remaining.filter(entity => 
        entity.dependencies.every(dep => 
          sorted.some(s => s.entityType === dep)
        )
      )
      
      if (nextBatch.length === 0) {
        // Circular dependency or missing dependency - add by priority
        const next = remaining.sort((a, b) => a.priority - b.priority)[0]
        sorted.push(next)
        remaining.splice(remaining.indexOf(next), 1)
      } else {
        // Sort by priority within the batch
        nextBatch.sort((a, b) => a.priority - b.priority)
        sorted.push(...nextBatch)
        nextBatch.forEach(entity => {
          remaining.splice(remaining.indexOf(entity), 1)
        })
      }
    }
    
    return sorted
  }

  private log(level: 'info' | 'warn' | 'error', message: string, context?: any): void {
    const logEntry = {
      timestamp: new Date().toISOString(),
      level,
      service: 'XeroIncrementalSync',
      message,
      context
    }

    if (config.app.debug) {
      console.log(JSON.stringify(logEntry, null, 2))
    }
  }
}

// Export singleton instance
export const XeroSync = new XeroIncrementalSync()

// Export types
export type {
  EntitySyncConfig,
  SyncCheckpoint,
  SyncSession,
  EntitySyncResult,
  SyncResult
}
