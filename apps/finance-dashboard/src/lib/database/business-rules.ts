// Business rules and configuration management utilities

import {
  createServiceRoleClient,
  createServiceRoleClient,
} from '@/lib/supabase/server'
import type { Json } from '@/types/database'
import type { RevenueStream } from '@/types'

export interface BusinessRule {
  id: string
  ruleName: string
  ruleType: string
  ruleDefinition: Json
  isActive: boolean
  appliesToRevenueStream?: RevenueStream
  effectiveDate?: Date
  expiryDate?: Date
  createdBy?: string
  createdAt: Date
  updatedAt: Date
}

export interface SystemAlert {
  id: string
  alertType: string
  severity: 'info' | 'warning' | 'error' | 'critical'
  title: string
  message: string
  alertData: Json
  isActive: boolean
  autoResolve: boolean
  resolvedAt?: Date
  resolvedBy?: string
  createdAt: Date
}

export interface UserPreference {
  id: string
  userId: string
  preferenceKey: string
  preferenceValue: Json
  createdAt: Date
  updatedAt: Date
}

/**
 * Get effective business rule by name
 */
export async function getBusinessRule(
  ruleName: string,
  asOfDate: Date = new Date()
): Promise<{
  rule: Json | null
  error?: string
}> {
  try {
    const supabase = createServiceRoleClient()

    const { data, error } = await supabase.rpc('get_effective_business_rule', {
      rule_name_param: ruleName,
      as_of_date: asOfDate.toISOString().split('T')[0],
    })

    if (error) {
      return { rule: null, error: error.message }
    }

    return { rule: data }
  } catch (error) {
    return {
      rule: null,
      error:
        error instanceof Error ? error.message : 'Failed to get business rule',
    }
  }
}

/**
 * Set business rule
 */
export async function setBusinessRule(
  ruleName: string,
  ruleType: string,
  ruleDefinition: Json,
  options: {
    appliesToRevenueStream?: RevenueStream
    effectiveDate?: Date
    expiryDate?: Date
    createdBy?: string
  } = {}
): Promise<{
  success: boolean
  error?: string
}> {
  try {
    const supabase = createServiceRoleClient()

    const ruleData = {
      rule_name: ruleName,
      rule_type: ruleType,
      rule_definition: ruleDefinition,
      applies_to_revenue_stream: options.appliesToRevenueStream,
      effective_date: options.effectiveDate?.toISOString().split('T')[0],
      expiry_date: options.expiryDate?.toISOString().split('T')[0],
      created_by: options.createdBy,
    }

    const { error } = await supabase.from('business_rules').upsert(ruleData, {
      onConflict: 'rule_name',
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
        error instanceof Error ? error.message : 'Failed to set business rule',
    }
  }
}

/**
 * Get revenue stream for account code
 */
export async function getRevenueStreamForAccount(accountCode: string): Promise<{
  revenueStream: RevenueStream
  error?: string
}> {
  try {
    const supabase = createServiceRoleClient()

    const { data, error } = await supabase.rpc(
      'get_revenue_stream_for_account',
      {
        account_code_param: accountCode,
      }
    )

    if (error) {
      return { revenueStream: 'other', error: error.message }
    }

    const revenueStream = (data as string) || 'other'
    return { revenueStream: revenueStream as RevenueStream }
  } catch (error) {
    return {
      revenueStream: 'other',
      error:
        error instanceof Error ? error.message : 'Failed to get revenue stream',
    }
  }
}

/**
 * Get alert threshold value
 */
export async function getAlertThreshold(thresholdName: string): Promise<{
  threshold: number
  error?: string
}> {
  try {
    const supabase = createServiceRoleClient()

    const { data, error } = await supabase.rpc('get_alert_threshold', {
      threshold_name: thresholdName,
    })

    if (error) {
      return { threshold: 0, error: error.message }
    }

    return { threshold: parseFloat(data.toString()) || 0 }
  } catch (error) {
    return {
      threshold: 0,
      error:
        error instanceof Error
          ? error.message
          : 'Failed to get alert threshold',
    }
  }
}

/**
 * Create system alert
 */
export async function createSystemAlert(
  alertType: string,
  severity: 'info' | 'warning' | 'error' | 'critical',
  title: string,
  message: string,
  alertData: Json = {},
  autoResolve: boolean = false
): Promise<{
  success: boolean
  alertId?: string
  error?: string
}> {
  try {
    const supabase = createServiceRoleClient()

    const alertRecord = {
      alert_type: alertType,
      severity,
      title,
      message,
      alert_data: alertData,
      auto_resolve: autoResolve,
    }

    const { data, error } = await supabase
      .from('system_alerts')
      .insert(alertRecord)
      .select('id')
      .single()

    if (error) {
      return { success: false, error: error.message }
    }

    return { success: true, alertId: data.id }
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : 'Failed to create system alert',
    }
  }
}

/**
 * Get active system alerts
 */
export async function getActiveSystemAlerts(severity?: string): Promise<{
  alerts: SystemAlert[]
  error?: string
}> {
  try {
    const supabase = createServiceRoleClient()

    let query = supabase
      .from('system_alerts')
      .select('*')
      .eq('is_active', true)
      .order('created_at', { ascending: false })

    if (severity) {
      query = query.eq('severity', severity)
    }

    const { data, error } = await query

    if (error) {
      return { alerts: [], error: error.message }
    }

    const alerts: SystemAlert[] = (data || []).map(row => ({
      id: row.id,
      alertType: row.alert_type,
      severity: row.severity as 'info' | 'warning' | 'error' | 'critical',
      title: row.title,
      message: row.message,
      alertData: row.alert_data,
      isActive: row.is_active,
      autoResolve: row.auto_resolve,
      resolvedAt: row.resolved_at ? new Date(row.resolved_at) : undefined,
      resolvedBy: row.resolved_by,
      createdAt: new Date(row.created_at),
    }))

    return { alerts }
  } catch (error) {
    return {
      alerts: [],
      error:
        error instanceof Error ? error.message : 'Failed to get system alerts',
    }
  }
}

/**
 * Resolve system alert
 */
export async function resolveSystemAlert(
  alertId: string,
  resolvedBy: string
): Promise<{
  success: boolean
  error?: string
}> {
  try {
    const supabase = createServiceRoleClient()

    const { error } = await supabase
      .from('system_alerts')
      .update({
        is_active: false,
        resolved_at: new Date().toISOString(),
        resolved_by: resolvedBy,
      })
      .eq('id', alertId)

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
          : 'Failed to resolve system alert',
    }
  }
}

/**
 * Get user dashboard preferences
 */
export async function getUserPreferences(userId: string): Promise<{
  preferences: Record<string, Json>
  error?: string
}> {
  try {
    const supabase = createServiceRoleClient()

    const { data, error } = await supabase
      .from('user_dashboard_preferences')
      .select('preference_key, preference_value')
      .eq('user_id', userId)

    if (error) {
      return { preferences: {}, error: error.message }
    }

    const preferences: Record<string, Json> = {}
    data?.forEach(pref => {
      preferences[pref.preference_key] = pref.preference_value
    })

    return { preferences }
  } catch (error) {
    return {
      preferences: {},
      error:
        error instanceof Error
          ? error.message
          : 'Failed to get user preferences',
    }
  }
}

/**
 * Set user dashboard preference
 */
export async function setUserPreference(
  userId: string,
  preferenceKey: string,
  preferenceValue: Json
): Promise<{
  success: boolean
  error?: string
}> {
  try {
    const supabase = createServiceRoleClient()

    const { error } = await supabase.from('user_dashboard_preferences').upsert(
      {
        user_id: userId,
        preference_key: preferenceKey,
        preference_value: preferenceValue,
      },
      {
        onConflict: 'user_id,preference_key',
        ignoreDuplicates: false,
      }
    )

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
          : 'Failed to set user preference',
    }
  }
}

/**
 * Get configuration summary for admin dashboard
 */
export async function getConfigurationSummary(): Promise<{
  summary: {
    totalConfigurations: number
    configurationsByType: Record<string, number>
    lastUpdated: Date | null
    activeRules: number
    activeAlerts: number
  }
  error?: string
}> {
  try {
    const supabase = createServiceRoleClient()

    // Get configuration summary
    const { data: configSummary, error: configError } = await supabase
      .from('active_configuration_summary')
      .select('*')

    if (configError) {
      return {
        summary: {
          totalConfigurations: 0,
          configurationsByType: {},
          lastUpdated: null,
          activeRules: 0,
          activeAlerts: 0,
        },
        error: configError.message,
      }
    }

    const configsByType: Record<string, number> = {}
    let totalConfigs = 0
    let lastUpdated: Date | null = null

    configSummary?.forEach(row => {
      configsByType[row.type] = row.config_count
      totalConfigs += row.config_count
      const rowUpdated = new Date(row.last_updated)
      if (!lastUpdated || rowUpdated > lastUpdated) {
        lastUpdated = rowUpdated
      }
    })

    // Get active business rules count
    const { count: rulesCount } = await supabase
      .from('business_rules')
      .select('*', { count: 'exact', head: true })
      .eq('is_active', true)

    // Get active alerts count
    const { count: alertsCount } = await supabase
      .from('system_alerts')
      .select('*', { count: 'exact', head: true })
      .eq('is_active', true)

    return {
      summary: {
        totalConfigurations: totalConfigs,
        configurationsByType: configsByType,
        lastUpdated,
        activeRules: rulesCount || 0,
        activeAlerts: alertsCount || 0,
      },
    }
  } catch (error) {
    return {
      summary: {
        totalConfigurations: 0,
        configurationsByType: {},
        lastUpdated: null,
        activeRules: 0,
        activeAlerts: 0,
      },
      error:
        error instanceof Error
          ? error.message
          : 'Failed to get configuration summary',
    }
  }
}
