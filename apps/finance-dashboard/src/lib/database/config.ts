// Database utilities for configuration management

import {
  createServerSupabaseClient,
  createServiceRoleClient,
} from '@/lib/supabase/server'
import type {
  ConfigMapping,
  ConfigMappingInsert,
  ConfigMappingUpdate,
} from '@/types/database'
import type { Json } from '@/types/database'

export type ConfigType =
  | 'system'
  | 'revenue_stream'
  | 'account_code'
  | 'item_code'
  | 'contact_id'
  | 'gst_method'
  | 'sync_schedule'
  | 'company_details'

/**
 * Get configuration value by key and type
 */
export async function getConfigValue<T = Json>(
  key: string,
  type: ConfigType
): Promise<{
  value: T | null
  error?: string
}> {
  try {
    const supabase = createServerSupabaseClient()

    const { data, error } = await supabase
      .from('config_mappings')
      .select('value')
      .eq('key', key)
      .eq('type', type)
      .eq('is_active', true)
      .single()

    if (error && error.code !== 'PGRST116') {
      return { value: null, error: error.message }
    }

    return { value: (data?.value as T) || null }
  } catch (error) {
    return {
      value: null,
      error:
        error instanceof Error ? error.message : 'Failed to get config value',
    }
  }
}

/**
 * Set configuration value
 */
export async function setConfigValue(
  key: string,
  type: ConfigType,
  value: Json,
  description?: string,
  createdBy?: string
): Promise<{
  success: boolean
  error?: string
}> {
  try {
    const supabase = createServiceRoleClient()

    const configData: ConfigMappingInsert = {
      key,
      type,
      value,
      description,
      created_by: createdBy,
    }

    const { error } = await supabase
      .from('config_mappings')
      .upsert(configData, {
        onConflict: 'key,type',
        ignoreDuplicates: false,
      })

    if (error) {
      return { success: false, error: error.message }
    }

    return { success: true }
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error ? error.message : 'Failed to set config value',
    }
  }
}

/**
 * Get all configurations by type
 */
export async function getConfigsByType(type: ConfigType): Promise<{
  configs: ConfigMapping[]
  error?: string
}> {
  try {
    const supabase = createServerSupabaseClient()

    const { data, error } = await supabase
      .from('config_mappings')
      .select('*')
      .eq('type', type)
      .eq('is_active', true)
      .order('key')

    if (error) {
      return { configs: [], error: error.message }
    }

    return { configs: data || [] }
  } catch (error) {
    return {
      configs: [],
      error:
        error instanceof Error
          ? error.message
          : 'Failed to get configs by type',
    }
  }
}

/**
 * Get revenue stream mappings
 */
export async function getRevenueStreamMappings(): Promise<{
  mappings: Record<string, string>
  error?: string
}> {
  try {
    const { configs, error } = await getConfigsByType('revenue_stream')

    if (error) {
      return { mappings: {}, error }
    }

    const mappings: Record<string, string> = {}
    configs.forEach(config => {
      if (typeof config.value === 'string') {
        mappings[config.key] = config.value
      }
    })

    return { mappings }
  } catch (error) {
    return {
      mappings: {},
      error:
        error instanceof Error
          ? error.message
          : 'Failed to get revenue stream mappings',
    }
  }
}

/**
 * Set revenue stream mapping
 */
export async function setRevenueStreamMapping(
  accountCode: string,
  revenueStream: string,
  updatedBy: string
): Promise<{
  success: boolean
  error?: string
}> {
  return setConfigValue(
    accountCode,
    'revenue_stream',
    revenueStream,
    `Revenue stream mapping for account ${accountCode}`,
    updatedBy
  )
}

/**
 * Get GST method setting
 */
export async function getGSTMethod(): Promise<{
  method: 'accrual' | 'cash'
  error?: string
}> {
  try {
    const { value, error } = await getConfigValue<string>(
      'gst_method',
      'system'
    )

    if (error) {
      return { method: 'accrual', error }
    }

    const method = (value === 'cash' ? 'cash' : 'accrual') as 'accrual' | 'cash'
    return { method }
  } catch (error) {
    return {
      method: 'accrual',
      error:
        error instanceof Error ? error.message : 'Failed to get GST method',
    }
  }
}

/**
 * Set GST method
 */
export async function setGSTMethod(
  method: 'accrual' | 'cash',
  updatedBy: string
): Promise<{
  success: boolean
  error?: string
}> {
  return setConfigValue(
    'gst_method',
    'system',
    method,
    'GST reporting method (accrual or cash)',
    updatedBy
  )
}

/**
 * Get company details
 */
export async function getCompanyDetails(): Promise<{
  details: {
    name: string
    abn?: string
    address?: string
  }
  error?: string
}> {
  try {
    const { value, error } = await getConfigValue<{
      name: string
      abn?: string
      address?: string
    }>('company_details', 'system')

    if (error) {
      return {
        details: { name: 'AUSA Hoops Pty Ltd' },
        error,
      }
    }

    return {
      details: value || { name: 'AUSA Hoops Pty Ltd' },
    }
  } catch (error) {
    return {
      details: { name: 'AUSA Hoops Pty Ltd' },
      error:
        error instanceof Error
          ? error.message
          : 'Failed to get company details',
    }
  }
}

/**
 * Set company details
 */
export async function setCompanyDetails(
  details: {
    name: string
    abn?: string
    address?: string
  },
  updatedBy: string
): Promise<{
  success: boolean
  error?: string
}> {
  return setConfigValue(
    'company_details',
    'system',
    details,
    'Company information and details',
    updatedBy
  )
}

/**
 * Get sync schedule configuration
 */
export async function getSyncSchedule(): Promise<{
  schedule: {
    hour: number
    minute: number
    timezone: string
  }
  error?: string
}> {
  try {
    const { value, error } = await getConfigValue<{
      hour: number
      minute: number
      timezone: string
    }>('sync_schedule', 'system')

    if (error) {
      return {
        schedule: { hour: 3, minute: 30, timezone: 'Australia/Sydney' },
        error,
      }
    }

    return {
      schedule: value || { hour: 3, minute: 30, timezone: 'Australia/Sydney' },
    }
  } catch (error) {
    return {
      schedule: { hour: 3, minute: 30, timezone: 'Australia/Sydney' },
      error:
        error instanceof Error ? error.message : 'Failed to get sync schedule',
    }
  }
}

/**
 * Delete configuration (deactivate)
 */
export async function deleteConfig(
  key: string,
  type: ConfigType,
  deletedBy: string
): Promise<{
  success: boolean
  error?: string
}> {
  try {
    const supabase = createServiceRoleClient()

    const { error } = await supabase
      .from('config_mappings')
      .update({ is_active: false })
      .eq('key', key)
      .eq('type', type)

    if (error) {
      return { success: false, error: error.message }
    }

    // Log the configuration deletion
    await supabase.from('audit_logs').insert({
      user_id: deletedBy,
      action: 'config_changed',
      details: {
        operation: 'delete',
        config_key: key,
        config_type: type,
      },
    })

    return { success: true }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to delete config',
    }
  }
}
