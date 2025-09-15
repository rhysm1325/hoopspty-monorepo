'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { getUser } from '@/lib/auth/auth'
import { hasPermission } from '@/lib/auth/roles'
import { getConfigValue, setConfigValue, getConfigsByType } from '@/lib/database/config'
import { logAuditEvent } from '@/lib/audit/logger'
import type { ConfigMapping } from '@/types/database'

export interface ActionResult {
  success: boolean
  message?: string
  error?: string
  data?: any
}

/**
 * Update sync schedule configuration
 */
export async function updateSyncScheduleAction(formData: FormData): Promise<ActionResult> {
  try {
    const user = await getUser()
    if (!user) {
      redirect('/login')
    }

    if (!hasPermission(user.role, 'canManageSettings')) {
      return {
        success: false,
        error: 'You do not have permission to manage sync settings',
      }
    }

    const enabled = formData.get('enabled') === 'true'
    const hour = parseInt(formData.get('hour') as string)
    const minute = parseInt(formData.get('minute') as string)
    const timezone = formData.get('timezone') as string
    const batchSize = parseInt(formData.get('batchSize') as string)
    const rateLimitMs = parseInt(formData.get('rateLimitMs') as string)
    const timeoutMinutes = parseInt(formData.get('timeoutMinutes') as string)
    const weekdaysOnly = formData.get('weekdaysOnly') === 'true'
    const retryAttempts = parseInt(formData.get('retryAttempts') as string)
    const notifyOnFailure = formData.get('notifyOnFailure') === 'true'
    const notifyEmails = (formData.get('notifyEmails') as string)?.split(',').map(e => e.trim()).filter(Boolean) || []

    // Validate inputs
    if (hour < 0 || hour > 23) {
      return { success: false, error: 'Hour must be between 0 and 23' }
    }
    if (minute < 0 || minute > 59) {
      return { success: false, error: 'Minute must be between 0 and 59' }
    }
    if (batchSize < 10 || batchSize > 1000) {
      return { success: false, error: 'Batch size must be between 10 and 1000' }
    }
    if (rateLimitMs < 100 || rateLimitMs > 10000) {
      return { success: false, error: 'Rate limit must be between 100 and 10000 ms' }
    }
    if (timeoutMinutes < 5 || timeoutMinutes > 120) {
      return { success: false, error: 'Timeout must be between 5 and 120 minutes' }
    }
    if (retryAttempts < 1 || retryAttempts > 10) {
      return { success: false, error: 'Retry attempts must be between 1 and 10' }
    }

    // Save all settings
    const savePromises = [
      setConfigValue('sync_enabled', 'sync_schedule', enabled, 'Enable/disable automatic sync', user.id),
      setConfigValue('sync_hour', 'sync_schedule', hour, 'Sync schedule hour (0-23)', user.id),
      setConfigValue('sync_minute', 'sync_schedule', minute, 'Sync schedule minute (0-59)', user.id),
      setConfigValue('sync_timezone', 'sync_schedule', timezone, 'Sync schedule timezone', user.id),
      setConfigValue('sync_batch_size', 'sync_schedule', batchSize, 'Sync batch size', user.id),
      setConfigValue('sync_rate_limit_ms', 'sync_schedule', rateLimitMs, 'Rate limit delay in milliseconds', user.id),
      setConfigValue('sync_timeout_minutes', 'sync_schedule', timeoutMinutes, 'Sync timeout in minutes', user.id),
      setConfigValue('sync_weekdays_only', 'sync_schedule', weekdaysOnly, 'Run sync on weekdays only', user.id),
      setConfigValue('sync_retry_attempts', 'sync_schedule', retryAttempts, 'Number of retry attempts on failure', user.id),
      setConfigValue('sync_notify_on_failure', 'sync_schedule', notifyOnFailure, 'Send notifications on sync failure', user.id),
      setConfigValue('sync_notify_emails', 'sync_schedule', notifyEmails, 'Email addresses for failure notifications', user.id),
    ]

    const results = await Promise.all(savePromises)
    const failedResults = results.filter(result => !result.success)

    if (failedResults.length > 0) {
      return {
        success: false,
        error: `Failed to save ${failedResults.length} settings: ${failedResults.map(r => r.error).join(', ')}`
      }
    }

    // Log the configuration change
    await logAuditEvent({
      userId: user.id,
      action: 'settings_updated',
      resourceType: 'sync_schedule',
      resourceId: 'sync_schedule_config',
      details: {
        enabled,
        hour,
        minute,
        timezone,
        batchSize,
        rateLimitMs,
        timeoutMinutes,
        weekdaysOnly,
        retryAttempts,
        notifyOnFailure,
        notifyEmailCount: notifyEmails.length,
      },
      ipAddress: null, // Would be extracted from headers in real implementation
    })

    revalidatePath('/settings')
    return {
      success: true,
      message: 'Sync schedule settings updated successfully',
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update sync schedule',
    }
  }
}

/**
 * Create configuration backup
 */
export async function createConfigBackupAction(formData: FormData): Promise<ActionResult> {
  try {
    const user = await getUser()
    if (!user) {
      redirect('/login')
    }

    if (!hasPermission(user.role, 'canManageSettings')) {
      return {
        success: false,
        error: 'You do not have permission to create configuration backups',
      }
    }

    const name = formData.get('name') as string
    const description = formData.get('description') as string
    const includeTypesStr = formData.get('includeTypes') as string
    const includeTypes = includeTypesStr ? includeTypesStr.split(',') : []

    if (!name?.trim()) {
      return { success: false, error: 'Backup name is required' }
    }

    if (includeTypes.length === 0) {
      return { success: false, error: 'At least one configuration type must be selected' }
    }

    // Collect all configurations
    const allConfigs: ConfigMapping[] = []
    
    for (const configType of includeTypes) {
      const result = await getConfigsByType(configType as any)
      if (result.configs) {
        allConfigs.push(...result.configs)
      }
    }

    // Create backup object
    const backup = {
      id: `backup_${Date.now()}`,
      name: name.trim(),
      description: description?.trim() || '',
      createdAt: new Date().toISOString(),
      createdBy: user.email,
      configCount: allConfigs.length,
      size: JSON.stringify(allConfigs).length,
      version: '1.0',
      configs: allConfigs,
    }

    // Log the backup creation
    await logAuditEvent({
      userId: user.id,
      action: 'config_backup_created',
      resourceType: 'configuration',
      resourceId: backup.id,
      details: {
        backupName: backup.name,
        configCount: backup.configCount,
        includeTypes,
        size: backup.size,
      },
      ipAddress: null,
    })

    return {
      success: true,
      message: `Configuration backup "${backup.name}" created successfully`,
      data: backup,
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create configuration backup',
    }
  }
}

/**
 * Restore configuration from backup
 */
export async function restoreConfigBackupAction(formData: FormData): Promise<ActionResult> {
  try {
    const user = await getUser()
    if (!user) {
      redirect('/login')
    }

    if (!hasPermission(user.role, 'canManageSettings')) {
      return {
        success: false,
        error: 'You do not have permission to restore configuration backups',
      }
    }

    const backupDataStr = formData.get('backupData') as string
    const backupId = formData.get('backupId') as string

    if (!backupDataStr) {
      return { success: false, error: 'Backup data is required' }
    }

    let backup: any
    try {
      backup = JSON.parse(backupDataStr)
    } catch {
      return { success: false, error: 'Invalid backup data format' }
    }

    if (!backup.configs || !Array.isArray(backup.configs)) {
      return { success: false, error: 'Invalid backup format - missing configs array' }
    }

    // Create a current backup before restoring
    const currentBackupResult = await createConfigBackupAction(
      new FormData([
        ['name', `Pre-restore backup ${new Date().toISOString()}`],
        ['description', `Automatic backup before restoring ${backup.name}`],
        ['includeTypes', 'revenue_stream,account_code,item_code,gst_method,sync_schedule,company_details'],
      ] as any)
    )

    if (!currentBackupResult.success) {
      return {
        success: false,
        error: `Failed to create pre-restore backup: ${currentBackupResult.error}`,
      }
    }

    // Restore configurations
    let restoredCount = 0
    const errors: string[] = []

    for (const config of backup.configs) {
      try {
        const result = await setConfigValue(
          config.key,
          config.type,
          config.value,
          `Restored from backup: ${backup.name}`,
          user.id
        )

        if (result.success) {
          restoredCount++
        } else {
          errors.push(`${config.key}: ${result.error}`)
        }
      } catch (err) {
        errors.push(`${config.key}: ${err instanceof Error ? err.message : 'Unknown error'}`)
      }
    }

    // Log the restore operation
    await logAuditEvent({
      userId: user.id,
      action: 'config_backup_restored',
      resourceType: 'configuration',
      resourceId: backupId,
      details: {
        backupName: backup.name,
        totalConfigs: backup.configs.length,
        restoredCount,
        errorCount: errors.length,
        errors: errors.slice(0, 10), // Limit error details
      },
      ipAddress: null,
    })

    if (errors.length > 0) {
      return {
        success: false,
        error: `Partially restored ${restoredCount}/${backup.configs.length} configurations. Errors: ${errors.slice(0, 3).join(', ')}${errors.length > 3 ? '...' : ''}`,
      }
    }

    revalidatePath('/settings')
    return {
      success: true,
      message: `Successfully restored ${restoredCount} configurations from backup "${backup.name}"`,
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to restore configuration backup',
    }
  }
}

/**
 * Export all configurations as JSON
 */
export async function exportAllConfigurationsAction(): Promise<ActionResult> {
  try {
    const user = await getUser()
    if (!user) {
      redirect('/login')
    }

    if (!hasPermission(user.role, 'canManageSettings')) {
      return {
        success: false,
        error: 'You do not have permission to export configurations',
      }
    }

    // Get all configuration types
    const configTypes = [
      'system',
      'revenue_stream',
      'account_code',
      'item_code',
      'contact_id',
      'gst_method',
      'sync_schedule',
      'company_details',
    ]

    const allConfigs: ConfigMapping[] = []
    
    for (const configType of configTypes) {
      const result = await getConfigsByType(configType as any)
      if (result.configs) {
        allConfigs.push(...result.configs)
      }
    }

    // Create export object
    const exportData = {
      exportedAt: new Date().toISOString(),
      exportedBy: user.email,
      version: '1.0',
      totalConfigs: allConfigs.length,
      configurations: allConfigs,
    }

    // Log the export
    await logAuditEvent({
      userId: user.id,
      action: 'config_exported',
      resourceType: 'configuration',
      resourceId: 'all_configs',
      details: {
        configCount: allConfigs.length,
        exportSize: JSON.stringify(exportData).length,
      },
      ipAddress: null,
    })

    return {
      success: true,
      message: `Successfully exported ${allConfigs.length} configurations`,
      data: exportData,
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to export configurations',
    }
  }
}

/**
 * Get sync schedule settings
 */
export async function getSyncScheduleSettingsAction(): Promise<ActionResult> {
  try {
    const user = await getUser()
    if (!user) {
      redirect('/login')
    }

    if (!hasPermission(user.role, 'canViewSettings')) {
      return {
        success: false,
        error: 'You do not have permission to view sync settings',
      }
    }

    // Load all sync schedule settings
    const [
      enabledResult,
      hourResult,
      minuteResult,
      timezoneResult,
      batchSizeResult,
      rateLimitResult,
      timeoutResult,
      weekdaysOnlyResult,
      retryAttemptsResult,
      notifyOnFailureResult,
      notifyEmailsResult,
    ] = await Promise.all([
      getConfigValue<boolean>('sync_enabled', 'sync_schedule'),
      getConfigValue<number>('sync_hour', 'sync_schedule'),
      getConfigValue<number>('sync_minute', 'sync_schedule'),
      getConfigValue<string>('sync_timezone', 'sync_schedule'),
      getConfigValue<number>('sync_batch_size', 'sync_schedule'),
      getConfigValue<number>('sync_rate_limit_ms', 'sync_schedule'),
      getConfigValue<number>('sync_timeout_minutes', 'sync_schedule'),
      getConfigValue<boolean>('sync_weekdays_only', 'sync_schedule'),
      getConfigValue<number>('sync_retry_attempts', 'sync_schedule'),
      getConfigValue<boolean>('sync_notify_on_failure', 'sync_schedule'),
      getConfigValue<string[]>('sync_notify_emails', 'sync_schedule'),
    ])

    const settings = {
      enabled: enabledResult.value ?? true,
      hour: hourResult.value ?? 3,
      minute: minuteResult.value ?? 30,
      timezone: timezoneResult.value ?? 'Australia/Sydney',
      batchSize: batchSizeResult.value ?? 100,
      rateLimitMs: rateLimitResult.value ?? 1000,
      timeoutMinutes: timeoutResult.value ?? 30,
      weekdaysOnly: weekdaysOnlyResult.value ?? false,
      retryAttempts: retryAttemptsResult.value ?? 3,
      notifyOnFailure: notifyOnFailureResult.value ?? true,
      notifyEmails: notifyEmailsResult.value ?? [],
    }

    return {
      success: true,
      data: settings,
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get sync schedule settings',
    }
  }
}

/**
 * Validate configuration backup file
 */
export async function validateConfigBackupAction(formData: FormData): Promise<ActionResult> {
  try {
    const user = await getUser()
    if (!user) {
      redirect('/login')
    }

    if (!hasPermission(user.role, 'canManageSettings')) {
      return {
        success: false,
        error: 'You do not have permission to validate configuration backups',
      }
    }

    const backupDataStr = formData.get('backupData') as string

    if (!backupDataStr) {
      return { success: false, error: 'Backup data is required' }
    }

    let backup: any
    try {
      backup = JSON.parse(backupDataStr)
    } catch {
      return { success: false, error: 'Invalid JSON format' }
    }

    // Validate backup structure
    const requiredFields = ['id', 'name', 'createdAt', 'createdBy', 'configs']
    const missingFields = requiredFields.filter(field => !(field in backup))

    if (missingFields.length > 0) {
      return {
        success: false,
        error: `Missing required fields: ${missingFields.join(', ')}`,
      }
    }

    if (!Array.isArray(backup.configs)) {
      return {
        success: false,
        error: 'Configs must be an array',
      }
    }

    // Validate each config entry
    const invalidConfigs = backup.configs.filter((config: any) => 
      !config.key || !config.type || config.value === undefined
    )

    if (invalidConfigs.length > 0) {
      return {
        success: false,
        error: `${invalidConfigs.length} invalid configuration entries found`,
      }
    }

    return {
      success: true,
      message: `Backup validation successful - ${backup.configs.length} configurations found`,
      data: {
        name: backup.name,
        configCount: backup.configs.length,
        createdAt: backup.createdAt,
        createdBy: backup.createdBy,
        configTypes: Array.from(new Set(backup.configs.map((c: any) => c.type))),
      },
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to validate configuration backup',
    }
  }
}
