// Financial calculations engine for AUSA Finance Dashboard
// Handles AR aging, DSO, DPO, margins, and other key financial metrics

import { createServiceRoleClient } from '@/lib/supabase/server'
import {
  AR_AGING_BUCKETS,
  AP_AGING_BUCKETS,
  OVERDUE_CUSTOMER_THRESHOLD_DAYS,
  OVERDUE_SUPPLIER_THRESHOLD_DAYS,
  REVENUE_VARIANCE_THRESHOLD_PERCENT,
} from '@/constants/financial'
import {
  calculateDSO,
  calculateDPO,
  calculateGrossMarginPercent,
  calculateInventoryTurnover,
  calculateDaysOfInventory,
  calculatePercentageChange,
  isSignificantChange,
  getAgingBucket,
  daysPastDue,
  formatCurrency,
  createMoney,
} from '@/utils/financial'
import type { RevenueStream, Money } from '@/types'

export interface AgingAnalysis {
  aging_bucket: string
  invoice_count: number
  total_outstanding: number
  avg_days_past_due: number
  min_days_past_due: number
  max_days_past_due: number
}

export interface RevenueStreamAnalysis {
  revenue_stream: RevenueStream
  current_period: number
  prior_period: number
  percentage_change: number
  is_significant_change: boolean
  invoice_count: number
}

export interface CashFlowMetrics {
  ar_total: number
  ap_total: number
  net_position: number
  dso: number
  dpo: number
  cash_conversion_cycle: number
}

export interface InventoryMetrics {
  current_inventory_value: number
  inventory_turnover: number
  days_of_inventory: number
  reorder_alerts: Array<{
    item_code: string
    item_name: string
    current_stock: number
    reorder_level: number
    days_until_stockout: number
  }>
}

export interface MarginAnalysis {
  revenue_stream: RevenueStream
  gross_revenue: number
  cogs: number
  gross_margin: number
  gross_margin_percent: number
  unit_count?: number
  average_selling_price?: number
}

export class FinancialCalculationsEngine {
  private supabase = createServiceRoleClient()

  /**
   * Calculate comprehensive AR aging analysis
   */
  async calculateARAgingAnalysis(
    asOfDate: Date = new Date(),
    revenueStreams?: RevenueStream[]
  ): Promise<AgingAnalysis[]> {
    let query = this.supabase
      .from('fact_ar_lines')
      .select(`
        aging_bucket,
        revenue_stream,
        outstanding_amount,
        days_past_due
      `)
      .gt('outstanding_amount', 0)

    if (revenueStreams && revenueStreams.length > 0) {
      query = query.in('revenue_stream', revenueStreams)
    }

    const { data: arData, error } = await query

    if (error) {
      throw new Error(`Failed to fetch AR data: ${error.message}`)
    }

    if (!arData || arData.length === 0) {
      return []
    }

    // Group by aging bucket
    const bucketMap = new Map<string, {
      invoices: number
      total: number
      daysPastDue: number[]
    }>()

    arData.forEach(record => {
      const bucket = record.aging_bucket
      if (!bucketMap.has(bucket)) {
        bucketMap.set(bucket, { invoices: 0, total: 0, daysPastDue: [] })
      }
      
      const bucketData = bucketMap.get(bucket)!
      bucketData.invoices++
      bucketData.total += record.outstanding_amount
      bucketData.daysPastDue.push(record.days_past_due)
    })

    // Convert to analysis format
    return Array.from(bucketMap.entries()).map(([bucket, data]) => ({
      aging_bucket: bucket,
      invoice_count: data.invoices,
      total_outstanding: data.total,
      avg_days_past_due: data.daysPastDue.reduce((sum, days) => sum + days, 0) / data.daysPastDue.length,
      min_days_past_due: Math.min(...data.daysPastDue),
      max_days_past_due: Math.max(...data.daysPastDue),
    }))
  }

  /**
   * Calculate comprehensive AP aging analysis
   */
  async calculateAPAgingAnalysis(
    asOfDate: Date = new Date(),
    supplierCategories?: string[]
  ): Promise<AgingAnalysis[]> {
    let query = this.supabase
      .from('fact_ap_lines')
      .select(`
        aging_bucket,
        supplier_category,
        outstanding_amount,
        days_past_due
      `)
      .gt('outstanding_amount', 0)

    if (supplierCategories && supplierCategories.length > 0) {
      query = query.in('supplier_category', supplierCategories)
    }

    const { data: apData, error } = await query

    if (error) {
      throw new Error(`Failed to fetch AP data: ${error.message}`)
    }

    if (!apData || apData.length === 0) {
      return []
    }

    // Group by aging bucket
    const bucketMap = new Map<string, {
      invoices: number
      total: number
      daysPastDue: number[]
    }>()

    apData.forEach(record => {
      const bucket = record.aging_bucket
      if (!bucketMap.has(bucket)) {
        bucketMap.set(bucket, { invoices: 0, total: 0, daysPastDue: [] })
      }
      
      const bucketData = bucketMap.get(bucket)!
      bucketData.invoices++
      bucketData.total += record.outstanding_amount
      bucketData.daysPastDue.push(record.days_past_due)
    })

    return Array.from(bucketMap.entries()).map(([bucket, data]) => ({
      aging_bucket: bucket,
      invoice_count: data.invoices,
      total_outstanding: data.total,
      avg_days_past_due: data.daysPastDue.reduce((sum, days) => sum + days, 0) / data.daysPastDue.length,
      min_days_past_due: Math.min(...data.daysPastDue),
      max_days_past_due: Math.max(...data.daysPastDue),
    }))
  }

  /**
   * Calculate cash flow metrics including DSO, DPO, and cash conversion cycle
   */
  async calculateCashFlowMetrics(
    asOfDate: Date = new Date()
  ): Promise<CashFlowMetrics> {
    // Get AR total
    const { data: arTotal, error: arError } = await this.supabase
      .from('fact_ar_lines')
      .select('outstanding_amount')
      .gt('outstanding_amount', 0)

    if (arError) {
      throw new Error(`Failed to fetch AR total: ${arError.message}`)
    }

    const arAmount = arTotal?.reduce((sum, record) => sum + record.outstanding_amount, 0) || 0

    // Get AP total
    const { data: apTotal, error: apError } = await this.supabase
      .from('fact_ap_lines')
      .select('outstanding_amount')
      .gt('outstanding_amount', 0)

    if (apError) {
      throw new Error(`Failed to fetch AP total: ${apError.message}`)
    }

    const apAmount = apTotal?.reduce((sum, record) => sum + record.outstanding_amount, 0) || 0

    // Calculate trailing 12-month revenue for DSO
    const trailing12MonthsStart = new Date(asOfDate)
    trailing12MonthsStart.setFullYear(trailing12MonthsStart.getFullYear() - 1)

    const { data: revenueData, error: revenueError } = await this.supabase
      .from('fact_ar_lines')
      .select('total_amount')
      .gte('date_key', trailing12MonthsStart.toISOString().split('T')[0])
      .lte('date_key', asOfDate.toISOString().split('T')[0])
      .in('invoice_status', ['AUTHORISED', 'PAID'])

    if (revenueError) {
      throw new Error(`Failed to fetch revenue data: ${revenueError.message}`)
    }

    const trailingRevenue = revenueData?.reduce((sum, record) => sum + record.total_amount, 0) || 0

    // Calculate trailing 12-month purchases for DPO
    const { data: purchaseData, error: purchaseError } = await this.supabase
      .from('fact_ap_lines')
      .select('total_amount')
      .gte('date_key', trailing12MonthsStart.toISOString().split('T')[0])
      .lte('date_key', asOfDate.toISOString().split('T')[0])

    if (purchaseError) {
      throw new Error(`Failed to fetch purchase data: ${purchaseError.message}`)
    }

    const trailingPurchases = purchaseData?.reduce((sum, record) => sum + record.total_amount, 0) || 0

    const dso = calculateDSO(arAmount, trailingRevenue)
    const dpo = calculateDPO(apAmount, trailingPurchases)

    return {
      ar_total: arAmount,
      ap_total: apAmount,
      net_position: arAmount - apAmount,
      dso,
      dpo,
      cash_conversion_cycle: dso - dpo, // Simplified CCC (excludes inventory days)
    }
  }

  /**
   * Calculate revenue stream analysis with YTD vs prior year comparison
   */
  async calculateRevenueStreamAnalysis(
    currentFYYear: number,
    endDate: Date = new Date()
  ): Promise<RevenueStreamAnalysis[]> {
    const priorFYYear = currentFYYear - 1
    const endDateStr = endDate.toISOString().split('T')[0]

    // Get current FY revenue by stream
    const { data: currentData, error: currentError } = await this.supabase
      .from('fact_revenue_by_week')
      .select('revenue_stream, total_revenue')
      .eq('fy_year', currentFYYear)
      .lte('week_start_date', endDateStr)

    if (currentError) {
      throw new Error(`Failed to fetch current FY revenue: ${currentError.message}`)
    }

    // Get prior FY revenue by stream (same period)
    const { data: priorData, error: priorError } = await this.supabase
      .from('fact_revenue_by_week')
      .select('revenue_stream, total_revenue')
      .eq('fy_year', priorFYYear)
      .lte('week_start_date', endDateStr)

    if (priorError) {
      throw new Error(`Failed to fetch prior FY revenue: ${priorError.message}`)
    }

    // Get invoice counts for current period
    const { data: invoiceCountData, error: invoiceError } = await this.supabase
      .from('fact_ar_lines')
      .select('revenue_stream')
      .gte('date_key', `${currentFYYear}-07-01`)
      .lte('date_key', endDateStr)
      .in('invoice_status', ['AUTHORISED', 'PAID'])

    if (invoiceError) {
      throw new Error(`Failed to fetch invoice counts: ${invoiceError.message}`)
    }

    // Aggregate data by revenue stream
    const currentMap = new Map<RevenueStream, number>()
    const priorMap = new Map<RevenueStream, number>()
    const invoiceCountMap = new Map<RevenueStream, number>()

    currentData?.forEach(record => {
      const stream = record.revenue_stream as RevenueStream
      currentMap.set(stream, (currentMap.get(stream) || 0) + record.total_revenue)
    })

    priorData?.forEach(record => {
      const stream = record.revenue_stream as RevenueStream
      priorMap.set(stream, (priorMap.get(stream) || 0) + record.total_revenue)
    })

    invoiceCountData?.forEach(record => {
      const stream = record.revenue_stream as RevenueStream
      invoiceCountMap.set(stream, (invoiceCountMap.get(stream) || 0) + 1)
    })

    // Create analysis for all revenue streams
    const allStreams: RevenueStream[] = ['tours', 'dr-dish', 'marketing', 'other']
    
    return allStreams.map(stream => {
      const currentAmount = currentMap.get(stream) || 0
      const priorAmount = priorMap.get(stream) || 0
      const percentageChange = calculatePercentageChange(priorAmount, currentAmount)

      return {
        revenue_stream: stream,
        current_period: currentAmount,
        prior_period: priorAmount,
        percentage_change: percentageChange,
        is_significant_change: isSignificantChange(percentageChange, REVENUE_VARIANCE_THRESHOLD_PERCENT),
        invoice_count: invoiceCountMap.get(stream) || 0,
      }
    })
  }

  /**
   * Calculate Dr Dish inventory metrics
   */
  async calculateInventoryMetrics(
    asOfDate: Date = new Date()
  ): Promise<InventoryMetrics> {
    // Get current inventory levels for Dr Dish products
    const { data: inventoryData, error: inventoryError } = await this.supabase
      .from('fact_inventory_movements')
      .select(`
        item_key,
        quantity_after,
        total_value,
        dim_item!inner (
          code,
          name,
          is_dr_dish_product,
          reorder_level,
          standard_cost
        )
      `)
      .eq('dim_item.is_dr_dish_product', true)
      .order('created_at', { ascending: false })

    if (inventoryError) {
      throw new Error(`Failed to fetch inventory data: ${inventoryError.message}`)
    }

    if (!inventoryData || inventoryData.length === 0) {
      return {
        current_inventory_value: 0,
        inventory_turnover: 0,
        days_of_inventory: 0,
        reorder_alerts: [],
      }
    }

    // Get latest inventory position for each item
    const latestInventory = new Map<string, {
      item_key: string
      code: string
      name: string
      quantity: number
      value: number
      reorder_level: number
      standard_cost: number
    }>()

    inventoryData.forEach(record => {
      const itemKey = record.item_key
      if (!latestInventory.has(itemKey)) {
        latestInventory.set(itemKey, {
          item_key: itemKey,
          code: record.dim_item.code,
          name: record.dim_item.name,
          quantity: record.quantity_after,
          value: record.total_value || 0,
          reorder_level: record.dim_item.reorder_level || 0,
          standard_cost: record.dim_item.standard_cost || 0,
        })
      }
    })

    const totalInventoryValue = Array.from(latestInventory.values())
      .reduce((sum, item) => sum + item.value, 0)

    // Calculate COGS for last 12 months for Dr Dish products
    const trailing12MonthsStart = new Date(asOfDate)
    trailing12MonthsStart.setFullYear(trailing12MonthsStart.getFullYear() - 1)

    const { data: cogsData, error: cogsError } = await this.supabase
      .from('fact_ar_lines')
      .select(`
        total_amount,
        dim_item!inner (
          is_dr_dish_product
        )
      `)
      .eq('dim_item.is_dr_dish_product', true)
      .gte('date_key', trailing12MonthsStart.toISOString().split('T')[0])
      .lte('date_key', asOfDate.toISOString().split('T')[0])
      .in('invoice_status', ['AUTHORISED', 'PAID'])

    if (cogsError) {
      throw new Error(`Failed to fetch COGS data: ${cogsError.message}`)
    }

    const annualCOGS = cogsData?.reduce((sum, record) => sum + (record.total_amount * 0.7), 0) || 0 // Assume 70% COGS

    // Calculate metrics
    const averageInventoryValue = totalInventoryValue // Simplified - should use average over period
    const inventoryTurnover = calculateInventoryTurnover(annualCOGS, averageInventoryValue)
    const daysOfInventory = calculateDaysOfInventory(averageInventoryValue, annualCOGS)

    // Identify reorder alerts
    const reorderAlerts = Array.from(latestInventory.values())
      .filter(item => item.quantity <= item.reorder_level && item.reorder_level > 0)
      .map(item => ({
        item_code: item.code,
        item_name: item.name,
        current_stock: item.quantity,
        reorder_level: item.reorder_level,
        days_until_stockout: Math.max(0, Math.floor(item.quantity / (annualCOGS / item.standard_cost / 365))),
      }))

    return {
      current_inventory_value: totalInventoryValue,
      inventory_turnover: inventoryTurnover,
      days_of_inventory: daysOfInventory,
      reorder_alerts: reorderAlerts,
    }
  }

  /**
   * Calculate gross margin analysis by revenue stream
   */
  async calculateMarginAnalysis(
    fyYear: number,
    endDate: Date = new Date()
  ): Promise<MarginAnalysis[]> {
    const endDateStr = endDate.toISOString().split('T')[0]
    const startDateStr = `${fyYear}-07-01`

    // Get revenue data with COGS mapping
    const { data: revenueData, error: revenueError } = await this.supabase
      .from('fact_ar_lines')
      .select(`
        revenue_stream,
        line_amount,
        total_amount,
        quantity,
        unit_price,
        dim_account!inner (
          is_revenue_account,
          is_cogs_account
        )
      `)
      .gte('date_key', startDateStr)
      .lte('date_key', endDateStr)
      .in('invoice_status', ['AUTHORISED', 'PAID'])
      .eq('dim_account.is_revenue_account', true)

    if (revenueError) {
      throw new Error(`Failed to fetch revenue data: ${revenueError.message}`)
    }

    // Get corresponding COGS data (simplified approach)
    const { data: cogsData, error: cogsError } = await this.supabase
      .from('fact_ap_lines')
      .select(`
        line_amount,
        total_amount,
        supplier_category,
        dim_account!inner (
          is_cogs_account
        )
      `)
      .gte('date_key', startDateStr)
      .lte('date_key', endDateStr)
      .eq('dim_account.is_cogs_account', true)

    if (cogsError) {
      throw new Error(`Failed to fetch COGS data: ${cogsError.message}`)
    }

    // Aggregate by revenue stream
    const revenueMap = new Map<RevenueStream, {
      revenue: number
      quantity: number
      totalUnitPrice: number
      count: number
    }>()

    revenueData?.forEach(record => {
      const stream = record.revenue_stream as RevenueStream
      if (!revenueMap.has(stream)) {
        revenueMap.set(stream, { revenue: 0, quantity: 0, totalUnitPrice: 0, count: 0 })
      }
      
      const streamData = revenueMap.get(stream)!
      streamData.revenue += record.total_amount
      streamData.quantity += record.quantity
      streamData.totalUnitPrice += record.unit_price
      streamData.count++
    })

    // Simplified COGS allocation (in real implementation, would need better mapping)
    const totalCOGS = cogsData?.reduce((sum, record) => sum + record.total_amount, 0) || 0
    const totalRevenue = Array.from(revenueMap.values()).reduce((sum, data) => sum + data.revenue, 0)

    const allStreams: RevenueStream[] = ['tours', 'dr-dish', 'marketing', 'other']
    
    return allStreams.map(stream => {
      const streamData = revenueMap.get(stream)
      const grossRevenue = streamData?.revenue || 0
      
      // Allocate COGS proportionally to revenue (simplified)
      const cogs = totalRevenue > 0 ? (grossRevenue / totalRevenue) * totalCOGS : 0
      const grossMargin = grossRevenue - cogs
      const grossMarginPercent = calculateGrossMarginPercent(grossRevenue, cogs)

      return {
        revenue_stream: stream,
        gross_revenue: grossRevenue,
        cogs,
        gross_margin: grossMargin,
        gross_margin_percent: grossMarginPercent,
        unit_count: streamData?.quantity,
        average_selling_price: streamData && streamData.count > 0 
          ? streamData.totalUnitPrice / streamData.count 
          : undefined,
      }
    })
  }

  /**
   * Get overdue customers (>45 days)
   */
  async getOverdueCustomers(): Promise<Array<{
    contact_name: string
    contact_key: string
    total_outstanding: number
    oldest_invoice_days: number
    invoice_count: number
    revenue_stream: RevenueStream
  }>> {
    const { data, error } = await this.supabase
      .from('fact_ar_lines')
      .select(`
        contact_key,
        revenue_stream,
        outstanding_amount,
        days_past_due,
        dim_contact!inner (
          name
        )
      `)
      .gt('outstanding_amount', 0)
      .gte('days_past_due', OVERDUE_CUSTOMER_THRESHOLD_DAYS)

    if (error) {
      throw new Error(`Failed to fetch overdue customers: ${error.message}`)
    }

    if (!data || data.length === 0) {
      return []
    }

    // Group by contact
    const contactMap = new Map<string, {
      name: string
      total: number
      maxDays: number
      count: number
      revenueStream: RevenueStream
    }>()

    data.forEach(record => {
      const contactKey = record.contact_key
      if (!contactMap.has(contactKey)) {
        contactMap.set(contactKey, {
          name: record.dim_contact.name,
          total: 0,
          maxDays: 0,
          count: 0,
          revenueStream: record.revenue_stream as RevenueStream,
        })
      }
      
      const contactData = contactMap.get(contactKey)!
      contactData.total += record.outstanding_amount
      contactData.maxDays = Math.max(contactData.maxDays, record.days_past_due)
      contactData.count++
    })

    return Array.from(contactMap.entries()).map(([contactKey, data]) => ({
      contact_name: data.name,
      contact_key: contactKey,
      total_outstanding: data.total,
      oldest_invoice_days: data.maxDays,
      invoice_count: data.count,
      revenue_stream: data.revenueStream,
    }))
  }

  /**
   * Get overdue suppliers (>60 days)
   */
  async getOverdueSuppliers(): Promise<Array<{
    contact_name: string
    contact_key: string
    total_outstanding: number
    oldest_bill_days: number
    bill_count: number
    supplier_category: string
  }>> {
    const { data, error } = await this.supabase
      .from('fact_ap_lines')
      .select(`
        contact_key,
        supplier_category,
        outstanding_amount,
        days_past_due,
        dim_contact!inner (
          name
        )
      `)
      .gt('outstanding_amount', 0)
      .gte('days_past_due', OVERDUE_SUPPLIER_THRESHOLD_DAYS)

    if (error) {
      throw new Error(`Failed to fetch overdue suppliers: ${error.message}`)
    }

    if (!data || data.length === 0) {
      return []
    }

    // Group by contact
    const contactMap = new Map<string, {
      name: string
      total: number
      maxDays: number
      count: number
      category: string
    }>()

    data.forEach(record => {
      const contactKey = record.contact_key
      if (!contactMap.has(contactKey)) {
        contactMap.set(contactKey, {
          name: record.dim_contact.name,
          total: 0,
          maxDays: 0,
          count: 0,
          category: record.supplier_category || 'Other',
        })
      }
      
      const contactData = contactMap.get(contactKey)!
      contactData.total += record.outstanding_amount
      contactData.maxDays = Math.max(contactData.maxDays, record.days_past_due)
      contactData.count++
    })

    return Array.from(contactMap.entries()).map(([contactKey, data]) => ({
      contact_name: data.name,
      contact_key: contactKey,
      total_outstanding: data.total,
      oldest_bill_days: data.maxDays,
      bill_count: data.count,
      supplier_category: data.category,
    }))
  }
}

// Export singleton instance
export const financialCalculations = new FinancialCalculationsEngine()
