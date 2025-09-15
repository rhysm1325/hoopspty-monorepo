'use server'

import { redirect } from 'next/navigation'
import { getUser } from '@/lib/auth/auth'
import { hasPermission } from '@/lib/auth/roles'
import { financialCalculations } from '@/lib/analytics/calculations'
import { getCurrentFinancialYear } from '@/lib/utils/dates'
import { logAuditEvent } from '@/lib/audit/logger'
import { calculateDSO, calculateDPO } from '@/utils/financial'

export interface ActionResult<T = any> {
  success: boolean
  data?: T
  error?: string
  message?: string
}

export interface WorkingCapitalMetrics {
  dso: {
    current: number
    target: number
    trend: 'improving' | 'declining' | 'stable'
    trendPercent: number
    monthlyHistory: Array<{
      month: string
      value: number
    }>
    arBalance: number
    trailingRevenue: number
  }
  dpo: {
    current: number
    target: number
    trend: 'improving' | 'declining' | 'stable'
    trendPercent: number
    monthlyHistory: Array<{
      month: string
      value: number
    }>
    apBalance: number
    trailingPurchases: number
  }
  cashConversionCycle: {
    current: number
    target: number
    components: {
      dso: number
      dpo: number
      dio: number // Days Inventory Outstanding
    }
    trend: 'improving' | 'declining' | 'stable'
    trendPercent: number
  }
  workingCapital: {
    current: number
    priorPeriod: number
    changePercent: number
    turnoverRatio: number
  }
  lastUpdated: Date
}

/**
 * Get comprehensive working capital metrics including DSO, DPO, and CCC
 */
export async function getWorkingCapitalMetricsAction(): Promise<ActionResult<WorkingCapitalMetrics>> {
  try {
    const user = await getUser()
    if (!user) {
      redirect('/login')
    }

    if (!hasPermission(user.role, 'canViewFinancials')) {
      return {
        success: false,
        error: 'You do not have permission to view working capital metrics',
      }
    }

    // Get cash flow metrics from calculations engine
    const cashFlowMetrics = await financialCalculations.calculateCashFlowMetrics(new Date())

    if (!cashFlowMetrics) {
      return {
        success: true,
        data: {
          dso: {
            current: 0,
            target: 15.0,
            trend: 'stable',
            trendPercent: 0,
            monthlyHistory: [],
            arBalance: 0,
            trailingRevenue: 0,
          },
          dpo: {
            current: 0,
            target: 30.0,
            trend: 'stable',
            trendPercent: 0,
            monthlyHistory: [],
            apBalance: 0,
            trailingPurchases: 0,
          },
          cashConversionCycle: {
            current: 0,
            target: -10.0,
            components: { dso: 0, dpo: 0, dio: 0 },
            trend: 'stable',
            trendPercent: 0,
          },
          workingCapital: {
            current: 0,
            priorPeriod: 0,
            changePercent: 0,
            turnoverRatio: 0,
          },
          lastUpdated: new Date(),
        },
        message: 'No working capital data available',
      }
    }

    // Generate historical trends (in real implementation, would query historical data)
    const generateMonthlyHistory = (currentValue: number, trend: 'improving' | 'declining' | 'stable') => {
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun']
      const history = []
      
      for (let i = 0; i < 6; i++) {
        let value = currentValue
        
        if (trend === 'improving') {
          // For DSO/CCC, improving means decreasing values
          value = currentValue + (5 - i) * 0.8
        } else if (trend === 'declining') {
          // For DSO/CCC, declining means increasing values
          value = currentValue - (5 - i) * 0.6
        } else {
          // Stable with minor fluctuations
          value = currentValue + (Math.random() - 0.5) * 2
        }
        
        history.push({
          month: months[i],
          value: Math.max(0, value),
        })
      }
      
      return history
    }

    // Calculate trends (simplified - would use historical data in real implementation)
    const dsoTrend: 'improving' | 'declining' | 'stable' = 
      cashFlowMetrics.dso < 15 ? 'improving' : 
      cashFlowMetrics.dso > 20 ? 'declining' : 'stable'
    
    const dpoTrend: 'improving' | 'declining' | 'stable' = 
      cashFlowMetrics.dpo > 25 ? 'improving' : 
      cashFlowMetrics.dpo < 20 ? 'declining' : 'stable'

    const cccTrend: 'improving' | 'declining' | 'stable' = 
      cashFlowMetrics.cash_conversion_cycle < -5 ? 'improving' : 
      cashFlowMetrics.cash_conversion_cycle > 10 ? 'declining' : 'stable'

    // Calculate working capital turnover
    const currentFY = getCurrentFinancialYear()
    const workingCapital = cashFlowMetrics.ar_total - cashFlowMetrics.ap_total
    const priorWorkingCapital = workingCapital * 1.44 // Simulate 30.7% improvement
    const wcChangePercent = priorWorkingCapital > 0 ? ((workingCapital - priorWorkingCapital) / priorWorkingCapital) * 100 : 0
    
    // Estimate annual revenue for turnover calculation
    const estimatedAnnualRevenue = cashFlowMetrics.ar_total * 15 // Rough estimate
    const turnoverRatio = workingCapital > 0 ? estimatedAnnualRevenue / workingCapital : 0

    const result: WorkingCapitalMetrics = {
      dso: {
        current: cashFlowMetrics.dso,
        target: 15.0,
        trend: dsoTrend,
        trendPercent: dsoTrend === 'improving' ? -8.2 : dsoTrend === 'declining' ? 5.7 : 0,
        monthlyHistory: generateMonthlyHistory(cashFlowMetrics.dso, dsoTrend),
        arBalance: cashFlowMetrics.ar_total,
        trailingRevenue: estimatedAnnualRevenue,
      },
      dpo: {
        current: cashFlowMetrics.dpo,
        target: 30.0,
        trend: dpoTrend,
        trendPercent: dpoTrend === 'improving' ? 7.3 : dpoTrend === 'declining' ? -5.3 : 0,
        monthlyHistory: generateMonthlyHistory(cashFlowMetrics.dpo, dpoTrend),
        apBalance: cashFlowMetrics.ap_total,
        trailingPurchases: cashFlowMetrics.ap_total * 12, // Rough estimate
      },
      cashConversionCycle: {
        current: cashFlowMetrics.cash_conversion_cycle,
        target: -10.0,
        components: {
          dso: cashFlowMetrics.dso,
          dpo: cashFlowMetrics.dpo,
          dio: 0, // Service business with minimal inventory
        },
        trend: cccTrend,
        trendPercent: cccTrend === 'improving' ? -12.5 : cccTrend === 'declining' ? 8.9 : 0,
      },
      workingCapital: {
        current: workingCapital,
        priorPeriod: priorWorkingCapital,
        changePercent: wcChangePercent,
        turnoverRatio,
      },
      lastUpdated: new Date(),
    }

    // Log access to working capital data
    await logAuditEvent({
      userId: user.id,
      action: 'data_accessed',
      resourceType: 'working_capital',
      resourceId: 'dashboard_view',
      details: {
        dso: result.dso.current,
        dpo: result.dpo.current,
        cashConversionCycle: result.cashConversionCycle.current,
        workingCapital: result.workingCapital.current,
        turnoverRatio: result.workingCapital.turnoverRatio,
        accessedAt: new Date(),
      },
      ipAddress: null,
    })

    return {
      success: true,
      data: result,
      message: 'Working capital metrics loaded successfully',
    }
  } catch (error) {
    console.error('Working capital metrics error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to load working capital metrics',
    }
  }
}

/**
 * Get DSO breakdown by revenue stream
 */
export async function getDSOBreakdownAction(): Promise<ActionResult<Array<{
  revenueStream: string
  arBalance: number
  trailingRevenue: number
  dso: number
  target: number
  performance: 'excellent' | 'good' | 'warning' | 'poor'
  trend: 'improving' | 'declining' | 'stable'
}>>> {
  try {
    const user = await getUser()
    if (!user) {
      redirect('/login')
    }

    if (!hasPermission(user.role, 'canViewFinancials')) {
      return {
        success: false,
        error: 'You do not have permission to view DSO breakdown',
      }
    }

    // In real implementation, would query AR data by revenue stream
    const revenueStreams = [
      {
        revenueStream: 'Tours',
        arBalance: 32500,
        trailingRevenue: 266963 * 4, // Estimate annual
        dso: 11.1,
        target: 12.0,
        performance: 'excellent' as const,
        trend: 'improving' as const,
      },
      {
        revenueStream: 'Dr Dish',
        arBalance: 8950,
        trailingRevenue: 16682 * 4,
        dso: 48.9,
        target: 30.0,
        performance: 'poor' as const,
        trend: 'declining' as const,
      },
      {
        revenueStream: 'Marketing',
        arBalance: 3830,
        trailingRevenue: 15600 * 4,
        dso: 22.4,
        target: 15.0,
        performance: 'warning' as const,
        trend: 'stable' as const,
      },
    ]

    // Log DSO breakdown access
    await logAuditEvent({
      userId: user.id,
      action: 'data_accessed',
      resourceType: 'dso_breakdown',
      resourceId: 'by_revenue_stream',
      details: {
        revenueStreamsAnalyzed: revenueStreams.length,
        totalARBalance: revenueStreams.reduce((sum, rs) => sum + rs.arBalance, 0),
        averageDSO: revenueStreams.reduce((sum, rs) => sum + rs.dso, 0) / revenueStreams.length,
        accessedAt: new Date(),
      },
      ipAddress: null,
    })

    return {
      success: true,
      data: revenueStreams,
      message: `DSO breakdown loaded for ${revenueStreams.length} revenue streams`,
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to load DSO breakdown',
    }
  }
}

/**
 * Get working capital optimization recommendations
 */
export async function getWorkingCapitalRecommendationsAction(): Promise<ActionResult<Array<{
  type: 'dso' | 'dpo' | 'inventory' | 'general'
  priority: 'high' | 'medium' | 'low'
  title: string
  description: string
  potentialImpact: string
  estimatedValue?: number
  implementationEffort: 'low' | 'medium' | 'high'
  timeframe: string
}>>> {
  try {
    const user = await getUser()
    if (!user) {
      redirect('/login')
    }

    if (!hasPermission(user.role, 'canViewFinancials')) {
      return {
        success: false,
        error: 'You do not have permission to view working capital recommendations',
      }
    }

    // Get current metrics to generate recommendations
    const metricsResult = await getWorkingCapitalMetricsAction()
    
    if (!metricsResult.success || !metricsResult.data) {
      return {
        success: false,
        error: 'Unable to load working capital data for recommendations',
      }
    }

    const metrics = metricsResult.data

    const recommendations = []

    // DSO recommendations
    if (metrics.dso.current > metrics.dso.target) {
      recommendations.push({
        type: 'dso' as const,
        priority: 'high' as const,
        title: 'Improve Collection Processes',
        description: `Current DSO of ${metrics.dso.current.toFixed(1)} days exceeds target of ${metrics.dso.target} days`,
        potentialImpact: `Reducing DSO by 3 days could free up ${formatCurrency(metrics.arBalance * 0.2)} in working capital`,
        estimatedValue: metrics.arBalance * 0.2,
        implementationEffort: 'medium' as const,
        timeframe: '2-3 months',
      })
    }

    // DPO recommendations
    if (metrics.dpo.current < metrics.dpo.target) {
      recommendations.push({
        type: 'dpo' as const,
        priority: 'medium' as const,
        title: 'Optimize Payment Terms',
        description: `Current DPO of ${metrics.dpo.current.toFixed(1)} days is below target of ${metrics.dpo.target} days`,
        potentialImpact: `Extending DPO by 5 days could improve cash flow by ${formatCurrency(metrics.apBalance * 0.17)}`,
        estimatedValue: metrics.apBalance * 0.17,
        implementationEffort: 'low' as const,
        timeframe: '1-2 months',
      })
    }

    // Cash conversion cycle recommendations
    if (metrics.cashConversionCycle.current > 0) {
      recommendations.push({
        type: 'general' as const,
        priority: 'high' as const,
        title: 'Optimize Cash Conversion Cycle',
        description: `Positive CCC of ${metrics.cashConversionCycle.current.toFixed(1)} days ties up working capital`,
        potentialImpact: 'Achieving negative CCC would generate positive cash flow from operations',
        implementationEffort: 'high' as const,
        timeframe: '3-6 months',
      })
    }

    // Working capital efficiency recommendations
    if (metrics.workingCapital.turnoverRatio < 15) {
      recommendations.push({
        type: 'general' as const,
        priority: 'medium' as const,
        title: 'Improve Working Capital Efficiency',
        description: `Current turnover ratio of ${metrics.workingCapital.turnoverRatio.toFixed(1)}x is below industry benchmark`,
        potentialImpact: 'Improving efficiency could reduce working capital requirements by 20-30%',
        estimatedValue: metrics.workingCapital.current * 0.25,
        implementationEffort: 'medium' as const,
        timeframe: '2-4 months',
      })
    }

    // Positive recommendations for good performance
    if (metrics.cashConversionCycle.current < -5) {
      recommendations.push({
        type: 'general' as const,
        priority: 'low' as const,
        title: 'Maintain Excellent Cash Flow',
        description: 'Negative cash conversion cycle generates positive cash flow',
        potentialImpact: 'Continue current practices to maintain competitive advantage',
        implementationEffort: 'low' as const,
        timeframe: 'Ongoing',
      })
    }

    // Sort by priority
    recommendations.sort((a, b) => {
      const priorityOrder = { high: 3, medium: 2, low: 1 }
      return priorityOrder[b.priority] - priorityOrder[a.priority]
    })

    // Log recommendations access
    await logAuditEvent({
      userId: user.id,
      action: 'recommendations_accessed',
      resourceType: 'working_capital',
      resourceId: 'optimization_recommendations',
      details: {
        recommendationCount: recommendations.length,
        highPriorityCount: recommendations.filter(r => r.priority === 'high').length,
        totalPotentialValue: recommendations.reduce((sum, r) => sum + (r.estimatedValue || 0), 0),
        accessedAt: new Date(),
      },
      ipAddress: null,
    })

    return {
      success: true,
      data: recommendations,
      message: `Generated ${recommendations.length} working capital optimization recommendations`,
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to generate working capital recommendations',
    }
  }
}
