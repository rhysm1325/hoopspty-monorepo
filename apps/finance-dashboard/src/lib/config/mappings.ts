/**
 * Revenue Stream and Configuration Mappings
 * 
 * This module provides comprehensive configuration management for revenue stream
 * mappings, account categorization, and business rule configuration. It enables
 * admin users to configure how Xero data is categorized and processed for
 * business intelligence reporting.
 * 
 * Features:
 * - Revenue stream mapping (Tours, Dr Dish, Marketing)
 * - Account code categorization
 * - Item code mapping for product categorization
 * - COGS account selection for margin calculations
 * - GST method configuration
 * - Deferred revenue rules for Tours
 */

import { createServiceRoleClient } from '@/lib/supabase/server'
import type { Database } from '@/types/database'

type Tables = Database['public']['Tables']

// Revenue stream types
export enum RevenueStream {
  TOURS = 'tours',
  DR_DISH = 'dr_dish',
  MARKETING = 'marketing',
  OTHER = 'other'
}

// Configuration types
export interface RevenueStreamMapping {
  id: string
  revenue_stream: RevenueStream
  account_codes: string[]
  item_codes?: string[]
  description: string
  is_active: boolean
  created_at: string
  updated_at: string
  created_by: string
}

export interface AccountMapping {
  id: string
  account_code: string
  account_name: string
  account_type: string
  revenue_stream: RevenueStream
  is_cogs_account: boolean
  is_revenue_account: boolean
  is_expense_account: boolean
  mapping_priority: number
  notes?: string
  created_at: string
  updated_at: string
  created_by: string
}

export interface ItemMapping {
  id: string
  item_code: string
  item_name: string
  product_category: string
  revenue_stream: RevenueStream
  is_tracked_inventory: boolean
  cost_method: 'FIFO' | 'LIFO' | 'AVERAGE' | 'SPECIFIC'
  notes?: string
  created_at: string
  updated_at: string
  created_by: string
}

export interface GST_Configuration {
  id: string
  gst_method: 'ACCRUAL' | 'CASH'
  gst_rate: number
  gst_account_code: string
  bas_reporting_frequency: 'MONTHLY' | 'QUARTERLY'
  effective_from: string
  created_at: string
  updated_at: string
  created_by: string
}

export interface DeferredRevenueRule {
  id: string
  revenue_stream: RevenueStream
  recognition_method: 'IMMEDIATE' | 'MONTHLY_STRAIGHT_LINE' | 'PERFORMANCE_BASED' | 'MILESTONE_BASED'
  recognition_period_months?: number
  milestone_criteria?: string[]
  deferred_revenue_account_code: string
  revenue_account_code: string
  is_active: boolean
  effective_from: string
  notes?: string
  created_at: string
  updated_at: string
  created_by: string
}

export interface ConfigurationSummary {
  revenue_streams: {
    tours: { account_count: number; item_count: number; active: boolean }
    dr_dish: { account_count: number; item_count: number; active: boolean }
    marketing: { account_count: number; item_count: number; active: boolean }
    other: { account_count: number; item_count: number; active: boolean }
  }
  total_mapped_accounts: number
  total_mapped_items: number
  unmapped_accounts: number
  unmapped_items: number
  gst_configuration: GST_Configuration | null
  deferred_revenue_rules: number
  last_updated: string
}

export class ConfigurationManager {
  private supabase = createServiceRoleClient()

  /**
   * Get all revenue stream mappings
   */
  async getRevenueStreamMappings(): Promise<{
    mappings: RevenueStreamMapping[]
    error?: string
  }> {
    try {
      const { data, error } = await this.supabase
        .from('revenue_stream_mappings')
        .select('*')
        .order('revenue_stream, created_at')

      if (error) {
        return { mappings: [], error: error.message }
      }

      return { mappings: data || [] }
    } catch (error) {
      return {
        mappings: [],
        error: error instanceof Error ? error.message : 'Failed to fetch revenue stream mappings'
      }
    }
  }

  /**
   * Create or update revenue stream mapping
   */
  async upsertRevenueStreamMapping(
    mapping: Omit<RevenueStreamMapping, 'id' | 'created_at' | 'updated_at'>,
    mappingId?: string
  ): Promise<{
    success: boolean
    mapping?: RevenueStreamMapping
    error?: string
  }> {
    try {
      if (mappingId) {
        // Update existing mapping
        const { data, error } = await this.supabase
          .from('revenue_stream_mappings')
          .update({
            ...mapping,
            updated_at: new Date().toISOString()
          })
          .eq('id', mappingId)
          .select()
          .single()

        if (error) {
          return { success: false, error: error.message }
        }

        return { success: true, mapping: data }
      } else {
        // Create new mapping
        const { data, error } = await this.supabase
          .from('revenue_stream_mappings')
          .insert({
            ...mapping,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .select()
          .single()

        if (error) {
          return { success: false, error: error.message }
        }

        return { success: true, mapping: data }
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to save revenue stream mapping'
      }
    }
  }

  /**
   * Get all account mappings
   */
  async getAccountMappings(): Promise<{
    mappings: AccountMapping[]
    error?: string
  }> {
    try {
      const { data, error } = await this.supabase
        .from('account_mappings')
        .select('*')
        .order('account_code')

      if (error) {
        return { mappings: [], error: error.message }
      }

      return { mappings: data || [] }
    } catch (error) {
      return {
        mappings: [],
        error: error instanceof Error ? error.message : 'Failed to fetch account mappings'
      }
    }
  }

  /**
   * Create or update account mapping
   */
  async upsertAccountMapping(
    mapping: Omit<AccountMapping, 'id' | 'created_at' | 'updated_at'>,
    mappingId?: string
  ): Promise<{
    success: boolean
    mapping?: AccountMapping
    error?: string
  }> {
    try {
      if (mappingId) {
        // Update existing mapping
        const { data, error } = await this.supabase
          .from('account_mappings')
          .update({
            ...mapping,
            updated_at: new Date().toISOString()
          })
          .eq('id', mappingId)
          .select()
          .single()

        if (error) {
          return { success: false, error: error.message }
        }

        return { success: true, mapping: data }
      } else {
        // Create new mapping
        const { data, error } = await this.supabase
          .from('account_mappings')
          .insert({
            ...mapping,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .select()
          .single()

        if (error) {
          return { success: false, error: error.message }
        }

        return { success: true, mapping: data }
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to save account mapping'
      }
    }
  }

  /**
   * Get all item mappings
   */
  async getItemMappings(): Promise<{
    mappings: ItemMapping[]
    error?: string
  }> {
    try {
      const { data, error } = await this.supabase
        .from('item_mappings')
        .select('*')
        .order('item_code')

      if (error) {
        return { mappings: [], error: error.message }
      }

      return { mappings: data || [] }
    } catch (error) {
      return {
        mappings: [],
        error: error instanceof Error ? error.message : 'Failed to fetch item mappings'
      }
    }
  }

  /**
   * Create or update item mapping
   */
  async upsertItemMapping(
    mapping: Omit<ItemMapping, 'id' | 'created_at' | 'updated_at'>,
    mappingId?: string
  ): Promise<{
    success: boolean
    mapping?: ItemMapping
    error?: string
  }> {
    try {
      if (mappingId) {
        // Update existing mapping
        const { data, error } = await this.supabase
          .from('item_mappings')
          .update({
            ...mapping,
            updated_at: new Date().toISOString()
          })
          .eq('id', mappingId)
          .select()
          .single()

        if (error) {
          return { success: false, error: error.message }
        }

        return { success: true, mapping: data }
      } else {
        // Create new mapping
        const { data, error } = await this.supabase
          .from('item_mappings')
          .insert({
            ...mapping,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .select()
          .single()

        if (error) {
          return { success: false, error: error.message }
        }

        return { success: true, mapping: data }
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to save item mapping'
      }
    }
  }

  /**
   * Get GST configuration
   */
  async getGSTConfiguration(): Promise<{
    configuration: GST_Configuration | null
    error?: string
  }> {
    try {
      const { data, error } = await this.supabase
        .from('gst_configuration')
        .select('*')
        .order('effective_from', { ascending: false })
        .limit(1)
        .single()

      if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
        return { configuration: null, error: error.message }
      }

      return { configuration: data || null }
    } catch (error) {
      return {
        configuration: null,
        error: error instanceof Error ? error.message : 'Failed to fetch GST configuration'
      }
    }
  }

  /**
   * Update GST configuration
   */
  async updateGSTConfiguration(
    configuration: Omit<GST_Configuration, 'id' | 'created_at' | 'updated_at'>
  ): Promise<{
    success: boolean
    configuration?: GST_Configuration
    error?: string
  }> {
    try {
      const { data, error } = await this.supabase
        .from('gst_configuration')
        .insert({
          ...configuration,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select()
        .single()

      if (error) {
        return { success: false, error: error.message }
      }

      return { success: true, configuration: data }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to save GST configuration'
      }
    }
  }

  /**
   * Get deferred revenue rules
   */
  async getDeferredRevenueRules(): Promise<{
    rules: DeferredRevenueRule[]
    error?: string
  }> {
    try {
      const { data, error } = await this.supabase
        .from('deferred_revenue_rules')
        .select('*')
        .order('revenue_stream, effective_from')

      if (error) {
        return { rules: [], error: error.message }
      }

      return { rules: data || [] }
    } catch (error) {
      return {
        rules: [],
        error: error instanceof Error ? error.message : 'Failed to fetch deferred revenue rules'
      }
    }
  }

  /**
   * Create or update deferred revenue rule
   */
  async upsertDeferredRevenueRule(
    rule: Omit<DeferredRevenueRule, 'id' | 'created_at' | 'updated_at'>,
    ruleId?: string
  ): Promise<{
    success: boolean
    rule?: DeferredRevenueRule
    error?: string
  }> {
    try {
      if (ruleId) {
        // Update existing rule
        const { data, error } = await this.supabase
          .from('deferred_revenue_rules')
          .update({
            ...rule,
            updated_at: new Date().toISOString()
          })
          .eq('id', ruleId)
          .select()
          .single()

        if (error) {
          return { success: false, error: error.message }
        }

        return { success: true, rule: data }
      } else {
        // Create new rule
        const { data, error } = await this.supabase
          .from('deferred_revenue_rules')
          .insert({
            ...rule,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .select()
          .single()

        if (error) {
          return { success: false, error: error.message }
        }

        return { success: true, rule: data }
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to save deferred revenue rule'
      }
    }
  }

  /**
   * Get configuration summary
   */
  async getConfigurationSummary(): Promise<{
    summary: ConfigurationSummary
    error?: string
  }> {
    try {
      // Get revenue stream mappings summary
      const { data: revenueStreamData } = await this.supabase
        .from('revenue_stream_mappings')
        .select('revenue_stream, account_codes, item_codes, is_active')

      // Get account mappings summary
      const { data: accountData } = await this.supabase
        .from('account_mappings')
        .select('revenue_stream')

      // Get item mappings summary
      const { data: itemData } = await this.supabase
        .from('item_mappings')
        .select('revenue_stream')

      // Get unmapped accounts and items
      const { data: unmappedAccounts } = await this.supabase.rpc('get_unmapped_accounts_count')
      const { data: unmappedItems } = await this.supabase.rpc('get_unmapped_items_count')

      // Get GST configuration
      const { configuration: gstConfig } = await this.getGSTConfiguration()

      // Get deferred revenue rules count
      const { data: deferredRulesData } = await this.supabase
        .from('deferred_revenue_rules')
        .select('id', { count: 'exact' })

      // Calculate summary
      const revenueStreams = {
        tours: { account_count: 0, item_count: 0, active: false },
        dr_dish: { account_count: 0, item_count: 0, active: false },
        marketing: { account_count: 0, item_count: 0, active: false },
        other: { account_count: 0, item_count: 0, active: false }
      }

      // Process revenue stream mappings
      revenueStreamData?.forEach(mapping => {
        const stream = mapping.revenue_stream as keyof typeof revenueStreams
        if (revenueStreams[stream]) {
          revenueStreams[stream].account_count += mapping.account_codes?.length || 0
          revenueStreams[stream].item_count += mapping.item_codes?.length || 0
          revenueStreams[stream].active = mapping.is_active
        }
      })

      // Process account mappings
      accountData?.forEach(account => {
        const stream = account.revenue_stream as keyof typeof revenueStreams
        if (revenueStreams[stream]) {
          revenueStreams[stream].account_count++
        }
      })

      // Process item mappings
      itemData?.forEach(item => {
        const stream = item.revenue_stream as keyof typeof revenueStreams
        if (revenueStreams[stream]) {
          revenueStreams[stream].item_count++
        }
      })

      const summary: ConfigurationSummary = {
        revenue_streams: revenueStreams,
        total_mapped_accounts: (accountData?.length || 0) + 
          (revenueStreamData?.reduce((sum, m) => sum + (m.account_codes?.length || 0), 0) || 0),
        total_mapped_items: (itemData?.length || 0) + 
          (revenueStreamData?.reduce((sum, m) => sum + (m.item_codes?.length || 0), 0) || 0),
        unmapped_accounts: unmappedAccounts || 0,
        unmapped_items: unmappedItems || 0,
        gst_configuration: gstConfig,
        deferred_revenue_rules: deferredRulesData?.length || 0,
        last_updated: new Date().toISOString()
      }

      return { summary }
    } catch (error) {
      return {
        summary: {
          revenue_streams: {
            tours: { account_count: 0, item_count: 0, active: false },
            dr_dish: { account_count: 0, item_count: 0, active: false },
            marketing: { account_count: 0, item_count: 0, active: false },
            other: { account_count: 0, item_count: 0, active: false }
          },
          total_mapped_accounts: 0,
          total_mapped_items: 0,
          unmapped_accounts: 0,
          unmapped_items: 0,
          gst_configuration: null,
          deferred_revenue_rules: 0,
          last_updated: new Date().toISOString()
        },
        error: error instanceof Error ? error.message : 'Failed to generate configuration summary'
      }
    }
  }

  /**
   * Apply revenue stream tagging to invoices
   */
  async applyRevenueStreamTagging(invoiceIds?: string[]): Promise<{
    success: boolean
    processed: number
    tagged: number
    errors: string[]
  }> {
    try {
      const errors: string[] = []
      let processed = 0
      let tagged = 0

      // Get current mappings
      const { mappings: accountMappings } = await this.getAccountMappings()
      const { mappings: itemMappings } = await this.getItemMappings()

      // Create lookup maps for performance
      const accountToStream = new Map<string, RevenueStream>()
      accountMappings.forEach(mapping => {
        accountToStream.set(mapping.account_code, mapping.revenue_stream)
      })

      const itemToStream = new Map<string, RevenueStream>()
      itemMappings.forEach(mapping => {
        itemToStream.set(mapping.item_code, mapping.revenue_stream)
      })

      // Get invoices to process
      let query = this.supabase
        .from('stg_invoices')
        .select('xero_invoice_id, line_items')

      if (invoiceIds && invoiceIds.length > 0) {
        query = query.in('xero_invoice_id', invoiceIds)
      }

      const { data: invoices, error: fetchError } = await query

      if (fetchError) {
        throw new Error(`Failed to fetch invoices: ${fetchError.message}`)
      }

      // Process each invoice
      for (const invoice of invoices || []) {
        processed++

        try {
          const lineItems = invoice.line_items || []
          const revenueStreams = new Set<RevenueStream>()

          // Analyze line items to determine revenue streams
          for (const lineItem of lineItems) {
            const accountCode = lineItem.accountCode
            const itemCode = lineItem.itemCode

            // Check account mapping first
            if (accountCode && accountToStream.has(accountCode)) {
              revenueStreams.add(accountToStream.get(accountCode)!)
            }

            // Check item mapping
            if (itemCode && itemToStream.has(itemCode)) {
              revenueStreams.add(itemToStream.get(itemCode)!)
            }
          }

          // Determine primary revenue stream
          let primaryStream = RevenueStream.OTHER
          if (revenueStreams.size === 1) {
            primaryStream = Array.from(revenueStreams)[0]
          } else if (revenueStreams.size > 1) {
            // Use priority logic: Tours > Dr Dish > Marketing > Other
            if (revenueStreams.has(RevenueStream.TOURS)) {
              primaryStream = RevenueStream.TOURS
            } else if (revenueStreams.has(RevenueStream.DR_DISH)) {
              primaryStream = RevenueStream.DR_DISH
            } else if (revenueStreams.has(RevenueStream.MARKETING)) {
              primaryStream = RevenueStream.MARKETING
            }
          }

          // Update invoice with revenue stream tag
          const { error: updateError } = await this.supabase
            .from('stg_invoices')
            .update({
              revenue_stream: primaryStream,
              revenue_stream_confidence: revenueStreams.size === 1 ? 'HIGH' : 
                                        revenueStreams.size > 1 ? 'MEDIUM' : 'LOW',
              updated_at: new Date().toISOString()
            })
            .eq('xero_invoice_id', invoice.xero_invoice_id)

          if (updateError) {
            errors.push(`Failed to tag invoice ${invoice.xero_invoice_id}: ${updateError.message}`)
          } else {
            tagged++
          }

        } catch (error) {
          errors.push(`Error processing invoice ${invoice.xero_invoice_id}: ${error instanceof Error ? error.message : 'Unknown error'}`)
        }
      }

      return {
        success: errors.length === 0,
        processed,
        tagged,
        errors
      }

    } catch (error) {
      return {
        success: false,
        processed: 0,
        tagged: 0,
        errors: [error instanceof Error ? error.message : 'Failed to apply revenue stream tagging']
      }
    }
  }

  /**
   * Validate configuration completeness
   */
  async validateConfiguration(): Promise<{
    isValid: boolean
    warnings: string[]
    errors: string[]
    recommendations: string[]
  }> {
    const warnings: string[] = []
    const errors: string[] = []
    const recommendations: string[] = []

    try {
      const { summary } = await this.getConfigurationSummary()

      // Check for unmapped accounts
      if (summary.unmapped_accounts > 0) {
        warnings.push(`${summary.unmapped_accounts} accounts are not mapped to revenue streams`)
        recommendations.push('Map all revenue-generating accounts to appropriate revenue streams')
      }

      // Check for unmapped items
      if (summary.unmapped_items > 0) {
        warnings.push(`${summary.unmapped_items} items are not mapped to revenue streams`)
        recommendations.push('Map all inventory items to appropriate revenue streams and product categories')
      }

      // Check GST configuration
      if (!summary.gst_configuration) {
        errors.push('GST configuration is missing')
        recommendations.push('Configure GST method and BAS reporting settings')
      }

      // Check revenue stream activation
      Object.entries(summary.revenue_streams).forEach(([stream, config]) => {
        if (config.account_count === 0 && config.item_count === 0) {
          warnings.push(`${stream.toUpperCase()} revenue stream has no mapped accounts or items`)
        }
      })

      // Check deferred revenue rules for Tours
      if (summary.revenue_streams.tours.account_count > 0 && summary.deferred_revenue_rules === 0) {
        warnings.push('Tours revenue stream is configured but no deferred revenue rules are defined')
        recommendations.push('Configure deferred revenue recognition rules for Tours business')
      }

      const isValid = errors.length === 0

      return {
        isValid,
        warnings,
        errors,
        recommendations
      }

    } catch (error) {
      return {
        isValid: false,
        warnings: [],
        errors: [error instanceof Error ? error.message : 'Failed to validate configuration'],
        recommendations: ['Contact system administrator to resolve configuration validation issues']
      }
    }
  }
}

// Export singleton instance
export const ConfigManager = new ConfigurationManager()

// Export types and enums
export type {
  RevenueStreamMapping,
  AccountMapping,
  ItemMapping,
  GST_Configuration,
  DeferredRevenueRule,
  ConfigurationSummary
}
