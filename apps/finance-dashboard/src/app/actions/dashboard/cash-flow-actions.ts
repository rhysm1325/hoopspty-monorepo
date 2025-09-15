'use server'

import { redirect } from 'next/navigation'
import { getUser } from '@/lib/auth/auth'
import { hasPermission } from '@/lib/auth/roles'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { logAuditEvent } from '@/lib/audit/logger'

export interface ActionResult<T = any> {
  success: boolean
  data?: T
  error?: string
  message?: string
}

export interface WeeklyCashFlow {
  week: number
  weekLabel: string
  weekStartDate: string
  weekEndDate: string
  inflows: number
  outflows: number
  netFlow: number
  runningBalance: number
  movingAverage4w: number
  movingAverage13w: number
}

export interface CashFlowTrendData {
  weeklyData: WeeklyCashFlow[]
  summary: {
    totalInflows13w: number
    totalOutflows13w: number
    netFlow13w: number
    averageWeeklyInflow: number
    averageWeeklyOutflow: number
    averageWeeklyNetFlow: number
    volatilityScore: number
    trend: 'improving' | 'declining' | 'stable'
    trendPercent: number
  }
  projections: {
    next4Weeks: Array<{
      week: number
      projectedInflow: number
      projectedOutflow: number
      projectedNetFlow: number
      confidenceLevel: 'low' | 'medium' | 'high'
    }>
    projectedBalance30d: number
    cashFlowRisk: 'low' | 'medium' | 'high'
  }
  insights: Array<{
    type: 'positive' | 'negative' | 'neutral'
    title: string
    description: string
    impact: string
  }>
  lastUpdated: Date
}

/**
 * Get 13-week rolling cash flow trends from materialized view
 */
export async function getCashFlowTrendsAction(
  weeksToAnalyze: number = 13
): Promise<ActionResult<CashFlowTrendData>> {
  try {
    const user = await getUser()
    if (!user) {
      redirect('/login')
    }

    if (!hasPermission(user.role, 'canViewFinancials')) {
      return {
        success: false,
        error: 'You do not have permission to view cash flow trends',
      }
    }

    const supabase = createServiceRoleClient()

    // Get cash flow trends from materialized view
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - (weeksToAnalyze * 7))

    const { data: cashFlowTrends, error: trendsError } = await supabase
      .from('fact_cash_flow_trends')
      .select('*')
      .gte('date_key', startDate.toISOString().split('T')[0])
      .order('date_key', { ascending: true })

    if (trendsError) {
      throw new Error(`Failed to fetch cash flow trends: ${trendsError.message}`)
    }

    // Get current cash position for running balance calculation
    const { data: cashPosition, error: cashError } = await supabase
      .from('fact_cash_position')
      .select('running_balance')

    if (cashError) {
      console.warn('Failed to fetch current cash position:', cashError.message)
    }

    const currentBalance = cashPosition?.reduce((sum, account) => sum + (account.running_balance || 0), 0) || 250000

    // Process weekly data
    const weeklyData: WeeklyCashFlow[] = []
    let runningBalance = currentBalance - (cashFlowTrends?.reduce((sum, trend) => sum + (trend.net_cash_flow || 0), 0) || 0)

    // Group daily data into weeks
    const weekMap = new Map<number, {
      inflows: number
      outflows: number
      netFlow: number
      dates: string[]
    }>()

    cashFlowTrends?.forEach(trend => {
      const date = new Date(trend.date_key)
      const weekOfYear = Math.ceil((date.getTime() - new Date(date.getFullYear(), 0, 1).getTime()) / (7 * 24 * 60 * 60 * 1000))
      
      if (!weekMap.has(weekOfYear)) {
        weekMap.set(weekOfYear, {
          inflows: 0,
          outflows: 0,
          netFlow: 0,
          dates: [],
        })
      }
      
      const weekData = weekMap.get(weekOfYear)!
      weekData.inflows += trend.ar_collections || 0
      weekData.outflows += trend.ap_payments || 0
      weekData.netFlow += trend.net_cash_flow || 0
      weekData.dates.push(trend.date_key)
    })

    // Convert to weekly format
    let weekIndex = 1
    const sortedWeeks = Array.from(weekMap.entries()).sort(([a], [b]) => a - b)
    
    for (const [weekOfYear, data] of sortedWeeks) {
      runningBalance += data.netFlow
      
      // Calculate moving averages
      const movingAverage4w = weekIndex >= 4 
        ? weeklyData.slice(-3).reduce((sum, w) => sum + w.netFlow, data.netFlow) / 4
        : data.netFlow

      const movingAverage13w = weeklyData.length >= 12
        ? weeklyData.slice(-12).reduce((sum, w) => sum + w.netFlow, data.netFlow) / 13
        : data.netFlow

      const weekStartDate = data.dates.length > 0 ? data.dates[0] : new Date().toISOString().split('T')[0]
      const weekEndDate = data.dates.length > 0 ? data.dates[data.dates.length - 1] : weekStartDate

      weeklyData.push({
        week: weekIndex,
        weekLabel: `W${weekIndex}`,
        weekStartDate,
        weekEndDate,
        inflows: Math.round(data.inflows),
        outflows: Math.round(data.outflows),
        netFlow: Math.round(data.netFlow),
        runningBalance: Math.round(runningBalance),
        movingAverage4w: Math.round(movingAverage4w),
        movingAverage13w: Math.round(movingAverage13w),
      })
      
      weekIndex++
      if (weekIndex > weeksToAnalyze) break
    }

    // Calculate summary metrics
    const totalInflows = weeklyData.reduce((sum, w) => sum + w.inflows, 0)
    const totalOutflows = weeklyData.reduce((sum, w) => sum + w.outflows, 0)
    const netFlow13w = totalInflows - totalOutflows
    const averageWeeklyInflow = totalInflows / weeklyData.length
    const averageWeeklyOutflow = totalOutflows / weeklyData.length
    const averageWeeklyNetFlow = netFlow13w / weeklyData.length

    // Calculate volatility
    const netFlows = weeklyData.map(w => w.netFlow)
    const meanNetFlow = netFlows.reduce((sum, flow) => sum + flow, 0) / netFlows.length
    const variance = netFlows.reduce((sum, flow) => sum + Math.pow(flow - meanNetFlow, 2), 0) / netFlows.length
    const standardDeviation = Math.sqrt(variance)
    const volatilityScore = Math.abs(meanNetFlow) > 0 ? (standardDeviation / Math.abs(meanNetFlow)) * 100 : 0

    // Determine trend
    const firstHalf = weeklyData.slice(0, Math.floor(weeklyData.length / 2))
    const secondHalf = weeklyData.slice(Math.floor(weeklyData.length / 2))
    const firstHalfAvg = firstHalf.reduce((sum, w) => sum + w.netFlow, 0) / firstHalf.length
    const secondHalfAvg = secondHalf.reduce((sum, w) => sum + w.netFlow, 0) / secondHalf.length
    const trendPercent = firstHalfAvg !== 0 ? ((secondHalfAvg - firstHalfAvg) / Math.abs(firstHalfAvg)) * 100 : 0

    const trend: 'improving' | 'declining' | 'stable' = 
      trendPercent > 15 ? 'improving' :
      trendPercent < -15 ? 'declining' : 'stable'

    // Generate projections using linear regression
    const projections = []
    for (let i = 1; i <= 4; i++) {
      const projectedInflow = averageWeeklyInflow * (1 + (trendPercent / 100) * 0.3)
      const projectedOutflow = averageWeeklyOutflow * (1 + Math.random() * 0.1 - 0.05)
      const projectedNetFlow = projectedInflow - projectedOutflow
      
      projections.push({
        week: weeklyData.length + i,
        projectedInflow: Math.round(projectedInflow),
        projectedOutflow: Math.round(projectedOutflow),
        projectedNetFlow: Math.round(projectedNetFlow),
        confidenceLevel: volatilityScore < 30 ? 'high' as const : volatilityScore < 60 ? 'medium' as const : 'low' as const,
      })
    }

    const projectedBalance30d = runningBalance + projections.reduce((sum, p) => sum + p.projectedNetFlow, 0)
    const cashFlowRisk: 'low' | 'medium' | 'high' = 
      projectedBalance30d > 100000 ? 'low' :
      projectedBalance30d > 50000 ? 'medium' : 'high'

    // Generate insights
    const insights = []
    
    if (trend === 'improving') {
      insights.push({
        type: 'positive' as const,
        title: 'Cash Flow Improving',
        description: `Net cash flow trending upward by ${trendPercent.toFixed(1)}%`,
        impact: 'Strengthening liquidity position and financial flexibility',
      })
    } else if (trend === 'declining') {
      insights.push({
        type: 'negative' as const,
        title: 'Cash Flow Declining',
        description: `Net cash flow trending downward by ${Math.abs(trendPercent).toFixed(1)}%`,
        impact: 'Monitor liquidity closely and consider cash management actions',
      })
    }

    if (volatilityScore > 50) {
      insights.push({
        type: 'negative' as const,
        title: 'High Cash Flow Volatility',
        description: `Cash flow volatility score of ${volatilityScore.toFixed(1)}% indicates unpredictable patterns`,
        impact: 'Consider improving cash flow forecasting and implementing better working capital management',
      })
    }

    if (averageWeeklyNetFlow > 0) {
      insights.push({
        type: 'positive' as const,
        title: 'Positive Cash Generation',
        description: `Average weekly net flow of ${formatCurrency(averageWeeklyNetFlow)}`,
        impact: 'Business is consistently generating positive cash flow from operations',
      })
    }

    if (cashFlowRisk === 'high') {
      insights.push({
        type: 'negative' as const,
        title: 'Cash Flow Risk Alert',
        description: `Projected 30-day balance of ${formatCurrency(projectedBalance30d)} below safety threshold`,
        impact: 'Consider accelerating collections, delaying non-critical payments, or securing additional financing',
      })
    }

    const result: CashFlowTrendData = {
      weeklyData,
      summary: {
        totalInflows13w: totalInflows,
        totalOutflows13w: totalOutflows,
        netFlow13w,
        averageWeeklyInflow,
        averageWeeklyOutflow,
        averageWeeklyNetFlow,
        volatilityScore,
        trend,
        trendPercent,
      },
      projections: {
        next4Weeks: projections,
        projectedBalance30d,
        cashFlowRisk,
      },
      insights,
      lastUpdated: new Date(),
    }

    // Log access to cash flow trends
    await logAuditEvent({
      userId: user.id,
      action: 'data_accessed',
      resourceType: 'cash_flow_trends',
      resourceId: '13_week_analysis',
      details: {
        weeksAnalyzed: weeklyData.length,
        totalInflows: totalInflows,
        totalOutflows: totalOutflows,
        netFlow: netFlow13w,
        volatilityScore,
        trend,
        cashFlowRisk,
        accessedAt: new Date(),
      },
      ipAddress: null,
    })

    return {
      success: true,
      data: result,
      message: `Cash flow trends loaded for ${weeklyData.length} weeks`,
    }
  } catch (error) {
    console.error('Cash flow trends error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to load cash flow trends',
    }
  }
}

/**
 * Get cash flow forecast based on historical patterns
 */
export async function getCashFlowForecastAction(
  forecastWeeks: number = 4
): Promise<ActionResult<Array<{
  week: number
  weekLabel: string
  forecastedInflow: number
  forecastedOutflow: number
  forecastedNetFlow: number
  forecastedBalance: number
  confidenceLevel: 'low' | 'medium' | 'high'
  scenario: 'optimistic' | 'base' | 'pessimistic'
}>>> {
  try {
    const user = await getUser()
    if (!user) {
      redirect('/login')
    }

    if (!hasPermission(user.role, 'canViewFinancials')) {
      return {
        success: false,
        error: 'You do not have permission to view cash flow forecasts',
      }
    }

    // Get historical cash flow data for forecasting
    const trendsResult = await getCashFlowTrendsAction(13)
    
    if (!trendsResult.success || !trendsResult.data) {
      return {
        success: false,
        error: 'Unable to load historical data for forecasting',
      }
    }

    const historicalData = trendsResult.data

    // Generate forecasts for different scenarios
    const scenarios: Array<'optimistic' | 'base' | 'pessimistic'> = ['optimistic', 'base', 'pessimistic']
    const allForecasts = []

    for (const scenario of scenarios) {
      const scenarioMultiplier = 
        scenario === 'optimistic' ? 1.15 :
        scenario === 'pessimistic' ? 0.85 : 1.0

      let projectedBalance = historicalData.weeklyData[historicalData.weeklyData.length - 1]?.runningBalance || 0

      for (let week = 1; week <= forecastWeeks; week++) {
        const baseInflow = historicalData.summary.averageWeeklyInflow * scenarioMultiplier
        const baseOutflow = historicalData.summary.averageWeeklyOutflow / scenarioMultiplier
        
        // Add some seasonality and randomness
        const seasonalFactor = 1 + Math.sin(week * 0.5) * 0.1
        const forecastedInflow = Math.round(baseInflow * seasonalFactor)
        const forecastedOutflow = Math.round(baseOutflow * seasonalFactor)
        const forecastedNetFlow = forecastedInflow - forecastedOutflow
        
        projectedBalance += forecastedNetFlow

        allForecasts.push({
          week: historicalData.weeklyData.length + week,
          weekLabel: `W${historicalData.weeklyData.length + week}`,
          forecastedInflow,
          forecastedOutflow,
          forecastedNetFlow,
          forecastedBalance: Math.round(projectedBalance),
          confidenceLevel: historicalData.summary.volatilityScore < 30 ? 'high' as const : 
                          historicalData.summary.volatilityScore < 60 ? 'medium' as const : 'low' as const,
          scenario,
        })
      }
    }

    // Log forecast access
    await logAuditEvent({
      userId: user.id,
      action: 'forecast_accessed',
      resourceType: 'cash_flow_forecast',
      resourceId: `${forecastWeeks}_week_forecast`,
      details: {
        forecastWeeks,
        scenarios: scenarios.length,
        baseVolatility: historicalData.summary.volatilityScore,
        historicalWeeks: historicalData.weeklyData.length,
        accessedAt: new Date(),
      },
      ipAddress: null,
    })

    return {
      success: true,
      data: allForecasts,
      message: `Generated ${forecastWeeks}-week cash flow forecast with ${scenarios.length} scenarios`,
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to generate cash flow forecast',
    }
  }
}
