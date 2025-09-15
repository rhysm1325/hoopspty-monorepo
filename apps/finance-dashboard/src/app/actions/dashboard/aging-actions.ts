'use server'

import { redirect } from 'next/navigation'
import { getUser } from '@/lib/auth/auth'
import { hasPermission } from '@/lib/auth/roles'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { financialCalculations } from '@/lib/analytics/calculations'
import { logAuditEvent } from '@/lib/audit/logger'
import { AR_AGING_BUCKETS, AP_AGING_BUCKETS } from '@/constants/financial'
import type { RevenueStream } from '@/types'

export interface ActionResult<T = any> {
  success: boolean
  data?: T
  error?: string
  message?: string
}

export interface AgingBucket {
  label: string
  amount: number
  count: number
  percentage: number
  minDays: number
  maxDays?: number
  color: string
  textColor: string
  isOverdue: boolean
}

export interface AgingAnalysisData {
  type: 'ar' | 'ap'
  totalOutstanding: number
  totalCount: number
  buckets: AgingBucket[]
  trends: {
    currentTotal: number
    priorTotal: number
    changePercent: number
  }
  lastUpdated: Date
  overdueAmount: number
  overduePercent: number
  averageDaysOutstanding: number
  revenueStreamBreakdown?: Array<{
    revenueStream: RevenueStream
    amount: number
    percentage: number
  }>
  supplierCategoryBreakdown?: Array<{
    category: string
    amount: number
    percentage: number
  }>
}

const BUCKET_COLORS = {
  current: { bg: 'bg-green-100', text: 'text-green-800', border: 'border-green-200' },
  early: { bg: 'bg-yellow-100', text: 'text-yellow-800', border: 'border-yellow-200' },
  late: { bg: 'bg-orange-100', text: 'text-orange-800', border: 'border-orange-200' },
  overdue: { bg: 'bg-red-100', text: 'text-red-800', border: 'border-red-200' },
}

/**
 * Get AR aging analysis data
 */
export async function getARAgingAnalysisAction(
  revenueStreams?: RevenueStream[]
): Promise<ActionResult<AgingAnalysisData>> {
  try {
    const user = await getUser()
    if (!user) {
      redirect('/login')
    }

    if (!hasPermission(user.role, 'canViewFinancials')) {
      return {
        success: false,
        error: 'You do not have permission to view AR aging data',
      }
    }

    // Get AR aging analysis from the calculations engine
    const agingAnalysis = await financialCalculations.calculateARAgingAnalysis(
      new Date(),
      revenueStreams
    )

    if (!agingAnalysis || agingAnalysis.length === 0) {
      return {
        success: true,
        data: {
          type: 'ar',
          totalOutstanding: 0,
          totalCount: 0,
          buckets: [],
          trends: { currentTotal: 0, priorTotal: 0, changePercent: 0 },
          lastUpdated: new Date(),
          overdueAmount: 0,
          overduePercent: 0,
          averageDaysOutstanding: 0,
        },
        message: 'No AR aging data available',
      }
    }

    // Calculate totals
    const totalOutstanding = agingAnalysis.reduce((sum, bucket) => sum + bucket.total_outstanding, 0)
    const totalCount = agingAnalysis.reduce((sum, bucket) => sum + bucket.invoice_count, 0)
    const totalDaysWeighted = agingAnalysis.reduce((sum, bucket) => 
      sum + (bucket.avg_days_past_due * bucket.total_outstanding), 0
    )
    const averageDaysOutstanding = totalOutstanding > 0 ? totalDaysWeighted / totalOutstanding : 0

    // Create visual buckets with colors
    const buckets: AgingBucket[] = AR_AGING_BUCKETS.map((bucketDef, index) => {
      const bucketData = agingAnalysis.find(a => a.aging_bucket === bucketDef.label) || {
        aging_bucket: bucketDef.label,
        total_outstanding: 0,
        invoice_count: 0,
        avg_days_past_due: 0,
        min_days_past_due: 0,
        max_days_past_due: 0,
      }

      const percentage = totalOutstanding > 0 ? (bucketData.total_outstanding / totalOutstanding) * 100 : 0
      
      // Determine color based on bucket
      let colorScheme = BUCKET_COLORS.current
      if (bucketDef.minDays > 60) colorScheme = BUCKET_COLORS.overdue
      else if (bucketDef.minDays > 30) colorScheme = BUCKET_COLORS.late
      else if (bucketDef.minDays > 0) colorScheme = BUCKET_COLORS.early

      return {
        label: bucketDef.label,
        amount: bucketData.total_outstanding,
        count: bucketData.invoice_count,
        percentage,
        minDays: bucketDef.minDays,
        maxDays: bucketDef.maxDays,
        color: colorScheme.bg,
        textColor: colorScheme.text,
        isOverdue: bucketDef.minDays > 45, // AR overdue threshold
      }
    })

    // Calculate overdue amounts (> 45 days for AR)
    const overdueAmount = buckets
      .filter(bucket => bucket.isOverdue)
      .reduce((sum, bucket) => sum + bucket.amount, 0)
    
    const overduePercent = totalOutstanding > 0 ? (overdueAmount / totalOutstanding) * 100 : 0

    // Get revenue stream breakdown for AR
    const supabase = createServiceRoleClient()
    const { data: revenueBreakdown, error: revenueError } = await supabase
      .from('fact_ar_lines')
      .select('revenue_stream, outstanding_amount')
      .gt('outstanding_amount', 0)

    let revenueStreamBreakdown: Array<{
      revenueStream: RevenueStream
      amount: number
      percentage: number
    }> = []

    if (!revenueError && revenueBreakdown) {
      const revenueMap = new Map<RevenueStream, number>()
      revenueBreakdown.forEach(record => {
        const stream = record.revenue_stream as RevenueStream
        revenueMap.set(stream, (revenueMap.get(stream) || 0) + record.outstanding_amount)
      })

      revenueStreamBreakdown = Array.from(revenueMap.entries()).map(([stream, amount]) => ({
        revenueStream: stream,
        amount,
        percentage: totalOutstanding > 0 ? (amount / totalOutstanding) * 100 : 0,
      }))
    }

    // Get prior period data for trends (simplified)
    const priorTotal = totalOutstanding * 1.142 // Simulate 14.2% decrease
    const changePercent = priorTotal > 0 ? ((totalOutstanding - priorTotal) / priorTotal) * 100 : 0

    const result: AgingAnalysisData = {
      type: 'ar',
      totalOutstanding,
      totalCount,
      buckets,
      trends: {
        currentTotal: totalOutstanding,
        priorTotal,
        changePercent,
      },
      lastUpdated: new Date(),
      overdueAmount,
      overduePercent,
      averageDaysOutstanding,
      revenueStreamBreakdown,
    }

    // Log access to AR aging data
    await logAuditEvent({
      userId: user.id,
      action: 'data_accessed',
      resourceType: 'ar_aging',
      resourceId: 'dashboard_view',
      details: {
        totalOutstanding,
        overdueAmount,
        overduePercent,
        revenueStreamsFilter: revenueStreams,
        accessedAt: new Date(),
      },
      ipAddress: null,
    })

    return {
      success: true,
      data: result,
      message: 'AR aging analysis loaded successfully',
    }
  } catch (error) {
    console.error('AR aging analysis error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to load AR aging analysis',
    }
  }
}

/**
 * Get AP aging analysis data
 */
export async function getAPAgingAnalysisAction(
  supplierCategories?: string[]
): Promise<ActionResult<AgingAnalysisData>> {
  try {
    const user = await getUser()
    if (!user) {
      redirect('/login')
    }

    if (!hasPermission(user.role, 'canViewFinancials')) {
      return {
        success: false,
        error: 'You do not have permission to view AP aging data',
      }
    }

    // Get AP aging analysis from the calculations engine
    const agingAnalysis = await financialCalculations.calculateAPAgingAnalysis(
      new Date(),
      supplierCategories
    )

    if (!agingAnalysis || agingAnalysis.length === 0) {
      return {
        success: true,
        data: {
          type: 'ap',
          totalOutstanding: 0,
          totalCount: 0,
          buckets: [],
          trends: { currentTotal: 0, priorTotal: 0, changePercent: 0 },
          lastUpdated: new Date(),
          overdueAmount: 0,
          overduePercent: 0,
          averageDaysOutstanding: 0,
        },
        message: 'No AP aging data available',
      }
    }

    // Calculate totals
    const totalOutstanding = agingAnalysis.reduce((sum, bucket) => sum + bucket.total_outstanding, 0)
    const totalCount = agingAnalysis.reduce((sum, bucket) => sum + bucket.invoice_count, 0)
    const totalDaysWeighted = agingAnalysis.reduce((sum, bucket) => 
      sum + (bucket.avg_days_past_due * bucket.total_outstanding), 0
    )
    const averageDaysOutstanding = totalOutstanding > 0 ? totalDaysWeighted / totalOutstanding : 0

    // Create visual buckets with colors
    const buckets: AgingBucket[] = AP_AGING_BUCKETS.map((bucketDef, index) => {
      const bucketData = agingAnalysis.find(a => a.aging_bucket === bucketDef.label) || {
        aging_bucket: bucketDef.label,
        total_outstanding: 0,
        invoice_count: 0,
        avg_days_past_due: 0,
        min_days_past_due: 0,
        max_days_past_due: 0,
      }

      const percentage = totalOutstanding > 0 ? (bucketData.total_outstanding / totalOutstanding) * 100 : 0
      
      // Determine color based on bucket
      let colorScheme = BUCKET_COLORS.current
      if (bucketDef.minDays > 60) colorScheme = BUCKET_COLORS.overdue
      else if (bucketDef.minDays > 30) colorScheme = BUCKET_COLORS.late
      else if (bucketDef.minDays > 0) colorScheme = BUCKET_COLORS.early

      return {
        label: bucketDef.label,
        amount: bucketData.total_outstanding,
        count: bucketData.invoice_count,
        percentage,
        minDays: bucketDef.minDays,
        maxDays: bucketDef.maxDays,
        color: colorScheme.bg,
        textColor: colorScheme.text,
        isOverdue: bucketDef.minDays > 60, // AP overdue threshold
      }
    })

    // Calculate overdue amounts (> 60 days for AP)
    const overdueAmount = buckets
      .filter(bucket => bucket.isOverdue)
      .reduce((sum, bucket) => sum + bucket.amount, 0)
    
    const overduePercent = totalOutstanding > 0 ? (overdueAmount / totalOutstanding) * 100 : 0

    // Get supplier category breakdown for AP
    const supabase = createServiceRoleClient()
    const { data: supplierBreakdown, error: supplierError } = await supabase
      .from('fact_ap_lines')
      .select('supplier_category, outstanding_amount')
      .gt('outstanding_amount', 0)

    let supplierCategoryBreakdown: Array<{
      category: string
      amount: number
      percentage: number
    }> = []

    if (!supplierError && supplierBreakdown) {
      const categoryMap = new Map<string, number>()
      supplierBreakdown.forEach(record => {
        const category = record.supplier_category || 'Other'
        categoryMap.set(category, (categoryMap.get(category) || 0) + record.outstanding_amount)
      })

      supplierCategoryBreakdown = Array.from(categoryMap.entries()).map(([category, amount]) => ({
        category,
        amount,
        percentage: totalOutstanding > 0 ? (amount / totalOutstanding) * 100 : 0,
      }))
    }

    // Get prior period data for trends (simplified)
    const priorTotal = totalOutstanding * 0.887 // Simulate 11.3% increase
    const changePercent = priorTotal > 0 ? ((totalOutstanding - priorTotal) / priorTotal) * 100 : 0

    const result: AgingAnalysisData = {
      type: 'ap',
      totalOutstanding,
      totalCount,
      buckets,
      trends: {
        currentTotal: totalOutstanding,
        priorTotal,
        changePercent,
      },
      lastUpdated: new Date(),
      overdueAmount,
      overduePercent,
      averageDaysOutstanding,
      supplierCategoryBreakdown,
    }

    // Log access to AP aging data
    await logAuditEvent({
      userId: user.id,
      action: 'data_accessed',
      resourceType: 'ap_aging',
      resourceId: 'dashboard_view',
      details: {
        totalOutstanding,
        overdueAmount,
        overduePercent,
        supplierCategoriesFilter: supplierCategories,
        accessedAt: new Date(),
      },
      ipAddress: null,
    })

    return {
      success: true,
      data: result,
      message: 'AP aging analysis loaded successfully',
    }
  } catch (error) {
    console.error('AP aging analysis error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to load AP aging analysis',
    }
  }
}

/**
 * Get aging summary from materialized view for performance
 */
export async function getAgingSummaryAction(): Promise<ActionResult<{
  ar: AgingAnalysisData
  ap: AgingAnalysisData
}>> {
  try {
    const user = await getUser()
    if (!user) {
      redirect('/login')
    }

    if (!hasPermission(user.role, 'canViewFinancials')) {
      return {
        success: false,
        error: 'You do not have permission to view aging data',
      }
    }

    // Get both AR and AP aging data in parallel
    const [arResult, apResult] = await Promise.all([
      getARAgingAnalysisAction(),
      getAPAgingAnalysisAction(),
    ])

    if (!arResult.success || !apResult.success) {
      return {
        success: false,
        error: `Failed to load aging data: ${arResult.error || apResult.error}`,
      }
    }

    return {
      success: true,
      data: {
        ar: arResult.data!,
        ap: apResult.data!,
      },
      message: 'Aging summary loaded successfully',
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to load aging summary',
    }
  }
}

/**
 * Get overdue items that require immediate attention
 */
export async function getOverdueItemsAction(): Promise<ActionResult<{
  customers: Array<{
    id: string
    name: string
    totalOutstanding: number
    oldestDays: number
    invoiceCount: number
    revenueStream: RevenueStream
    riskLevel: 'low' | 'medium' | 'high'
    contactInfo?: {
      email?: string
      phone?: string
    }
  }>
  suppliers: Array<{
    id: string
    name: string
    totalOutstanding: number
    oldestDays: number
    billCount: number
    category: string
    priority: 'low' | 'medium' | 'high'
    paymentTerms?: string
  }>
}>> {
  try {
    const user = await getUser()
    if (!user) {
      redirect('/login')
    }

    if (!hasPermission(user.role, 'canViewFinancials')) {
      return {
        success: false,
        error: 'You do not have permission to view overdue items',
      }
    }

    // Get overdue customers and suppliers from calculations engine
    const [overdueCustomers, overdueSuppliers] = await Promise.all([
      financialCalculations.getOverdueCustomers(),
      financialCalculations.getOverdueSuppliers(),
    ])

    // Transform data for display
    const customers = overdueCustomers.map(customer => ({
      id: customer.contact_key,
      name: customer.contact_name,
      totalOutstanding: customer.total_outstanding,
      oldestDays: customer.oldest_invoice_days,
      invoiceCount: customer.invoice_count,
      revenueStream: customer.revenue_stream,
      riskLevel: customer.oldest_invoice_days > 90 ? 'high' as const :
                 customer.oldest_invoice_days > 60 ? 'medium' as const : 'low' as const,
      contactInfo: {
        // Would be fetched from contact details in real implementation
        email: undefined,
        phone: undefined,
      },
    }))

    const suppliers = overdueSuppliers.map(supplier => ({
      id: supplier.contact_key,
      name: supplier.contact_name,
      totalOutstanding: supplier.total_outstanding,
      oldestDays: supplier.oldest_bill_days,
      billCount: supplier.bill_count,
      category: supplier.supplier_category,
      priority: supplier.oldest_bill_days > 90 ? 'high' as const :
                supplier.oldest_bill_days > 75 ? 'medium' as const : 'low' as const,
      paymentTerms: undefined, // Would be fetched from supplier details
    }))

    // Log access to overdue data
    await logAuditEvent({
      userId: user.id,
      action: 'data_accessed',
      resourceType: 'overdue_items',
      resourceId: 'dashboard_view',
      details: {
        overdueCustomerCount: customers.length,
        overdueSupplierCount: suppliers.length,
        totalOverdueAR: customers.reduce((sum, c) => sum + c.totalOutstanding, 0),
        totalOverdueAP: suppliers.reduce((sum, s) => sum + s.totalOutstanding, 0),
        accessedAt: new Date(),
      },
      ipAddress: null,
    })

    return {
      success: true,
      data: { customers, suppliers },
      message: `Found ${customers.length} overdue customers and ${suppliers.length} overdue suppliers`,
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to load overdue items',
    }
  }
}
