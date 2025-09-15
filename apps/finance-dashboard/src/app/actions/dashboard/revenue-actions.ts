'use server'

import { redirect } from 'next/navigation'
import { getUser } from '@/lib/auth/auth'
import { hasPermission } from '@/lib/auth/roles'
import { revenueStreamAnalytics } from '@/lib/analytics/revenue-streams'
import { getCurrentFinancialYear, getFinancialYearWeekIndex } from '@/lib/utils/dates'
import { logAuditEvent } from '@/lib/audit/logger'
import type { RevenueStream } from '@/types'

export interface ActionResult<T = any> {
  success: boolean
  data?: T
  error?: string
  message?: string
}

export interface WeeklyRevenueData {
  week: number
  weekLabel: string
  weekStartDate: string
  weekEndDate: string
  currentYear: number
  priorYear: number
  variance: number
  variancePercent: number
  currentYearCumulative: number
  priorYearCumulative: number
}

export interface RevenueComparisonData {
  weeklyData: WeeklyRevenueData[]
  summary: {
    currentYTD: number
    priorYTD: number
    totalVariance: number
    totalVariancePercent: number
    currentFYLabel: string
    priorFYLabel: string
    weeksAnalyzed: number
  }
  revenueStreams: Array<{
    stream: RevenueStream
    currentYTD: number
    priorYTD: number
    variancePercent: number
    color: string
    invoiceCount: number
  }>
  lastUpdated: Date
}

const REVENUE_STREAM_COLORS = {
  tours: '#22c55e',
  'dr-dish': '#3b82f6',
  marketing: '#f59e0b',
  other: '#6b7280',
}

/**
 * Get YTD revenue comparison with week-based alignment
 */
export async function getRevenueComparisonAction(
  revenueStream?: RevenueStream | 'all',
  weeksToAnalyze?: number
): Promise<ActionResult<RevenueComparisonData>> {
  try {
    const user = await getUser()
    if (!user) {
      redirect('/login')
    }

    // Check permissions based on revenue stream and user role
    if (revenueStream && revenueStream !== 'all') {
      const canViewStream = 
        hasPermission(user.role, 'canViewFinancials') || // Owner/Finance can view all
        (user.role === 'operations' && revenueStream === 'tours') || // Operations can view tours
        (user.role === 'sales' && revenueStream === 'dr-dish') || // Sales can view dr-dish
        (user.role === 'marketing' && revenueStream === 'marketing') // Marketing can view marketing

      if (!canViewStream) {
        return {
          success: false,
          error: `You do not have permission to view ${revenueStream} revenue data`,
        }
      }
    } else if (!hasPermission(user.role, 'canViewFinancials')) {
      return {
        success: false,
        error: 'You do not have permission to view revenue comparison data',
      }
    }

    const currentFY = getCurrentFinancialYear()
    const currentWeek = getFinancialYearWeekIndex(new Date())
    const weeksToShow = Math.min(weeksToAnalyze || currentWeek, currentWeek)

    // Get YTD comparison data
    const ytdComparison = await revenueStreamAnalytics.calculateYTDComparison(
      currentFY.year,
      new Date()
    )

    if (!ytdComparison || ytdComparison.length === 0) {
      return {
        success: true,
        data: {
          weeklyData: [],
          summary: {
            currentYTD: 0,
            priorYTD: 0,
            totalVariance: 0,
            totalVariancePercent: 0,
            currentFYLabel: currentFY.label,
            priorFYLabel: `FY ${currentFY.year - 1}-${String(currentFY.year).slice(-2)}`,
            weeksAnalyzed: 0,
          },
          revenueStreams: [],
          lastUpdated: new Date(),
        },
        message: 'No revenue comparison data available',
      }
    }

    // Get weekly data for the specified revenue stream
    const targetStream = revenueStream === 'all' ? undefined : revenueStream
    let weeklyComparison = []

    if (targetStream) {
      weeklyComparison = await revenueStreamAnalytics.getWeeklyComparison(
        targetStream,
        currentFY.year,
        weeksToShow
      )
    } else {
      // For 'all' streams, we need to aggregate weekly data
      const allStreams: RevenueStream[] = ['tours', 'dr-dish', 'marketing', 'other']
      const streamComparisons = await Promise.all(
        allStreams.map(stream => 
          revenueStreamAnalytics.getWeeklyComparison(stream, currentFY.year, weeksToShow)
        )
      )

      // Aggregate by week
      const weekMap = new Map<number, {
        currentRevenue: number
        priorRevenue: number
        weekStartDate: string
        weekEndDate: string
      }>()

      streamComparisons.forEach(streamData => {
        streamData.forEach(weekData => {
          const existing = weekMap.get(weekData.week_index) || {
            currentRevenue: 0,
            priorRevenue: 0,
            weekStartDate: weekData.current_week_start,
            weekEndDate: weekData.current_week_end,
          }
          
          existing.currentRevenue += weekData.current_revenue
          existing.priorRevenue += weekData.prior_revenue
          weekMap.set(weekData.week_index, existing)
        })
      })

      // Convert to comparison format
      weeklyComparison = Array.from(weekMap.entries()).map(([weekIndex, data]) => ({
        week_index: weekIndex,
        current_week_start: data.weekStartDate,
        current_week_end: data.weekEndDate,
        prior_week_start: data.weekStartDate, // Simplified
        prior_week_end: data.weekEndDate, // Simplified
        revenue_stream: 'all' as any,
        current_revenue: data.currentRevenue,
        prior_revenue: data.priorRevenue,
        variance_amount: data.currentRevenue - data.priorRevenue,
        variance_percent: data.priorRevenue > 0 ? ((data.currentRevenue - data.priorRevenue) / data.priorRevenue) * 100 : 0,
        is_significant_change: Math.abs(((data.currentRevenue - data.priorRevenue) / data.priorRevenue) * 100) > 20,
        current_fy_year: currentFY.year,
        prior_fy_year: currentFY.year - 1,
      }))
    }

    // Transform to chart data format
    let currentCumulative = 0
    let priorCumulative = 0

    const weeklyData: WeeklyRevenueData[] = weeklyComparison.map(week => {
      currentCumulative += week.current_revenue
      priorCumulative += week.prior_revenue

      return {
        week: week.week_index,
        weekLabel: `W${week.week_index}`,
        weekStartDate: week.current_week_start,
        weekEndDate: week.current_week_end,
        currentYear: Math.round(week.current_revenue),
        priorYear: Math.round(week.prior_revenue),
        variance: Math.round(week.variance_amount),
        variancePercent: Number(week.variance_percent.toFixed(1)),
        currentYearCumulative: Math.round(currentCumulative),
        priorYearCumulative: Math.round(priorCumulative),
      }
    })

    // Calculate summary metrics
    const totalVariance = currentCumulative - priorCumulative
    const totalVariancePercent = priorCumulative > 0 ? (totalVariance / priorCumulative) * 100 : 0

    // Prepare revenue stream summary
    const revenueStreams = ytdComparison.map(comparison => ({
      stream: comparison.revenue_stream,
      currentYTD: comparison.current_ytd,
      priorYTD: comparison.prior_ytd,
      variancePercent: comparison.variance_percent,
      color: REVENUE_STREAM_COLORS[comparison.revenue_stream] || '#6b7280',
      invoiceCount: comparison.current_invoice_count,
    }))

    const result: RevenueComparisonData = {
      weeklyData,
      summary: {
        currentYTD: Math.round(currentCumulative),
        priorYTD: Math.round(priorCumulative),
        totalVariance: Math.round(totalVariance),
        totalVariancePercent: Number(totalVariancePercent.toFixed(1)),
        currentFYLabel: currentFY.label,
        priorFYLabel: `FY ${currentFY.year - 1}-${String(currentFY.year).slice(-2)}`,
        weeksAnalyzed: weeksToShow,
      },
      revenueStreams,
      lastUpdated: new Date(),
    }

    // Log access to revenue comparison data
    await logAuditEvent({
      userId: user.id,
      action: 'data_accessed',
      resourceType: 'revenue_comparison',
      resourceId: targetStream || 'all_streams',
      details: {
        revenueStream: targetStream || 'all',
        weeksAnalyzed: weeksToShow,
        currentYTD: result.summary.currentYTD,
        priorYTD: result.summary.priorYTD,
        variancePercent: result.summary.totalVariancePercent,
        accessedAt: new Date(),
      },
      ipAddress: null,
    })

    return {
      success: true,
      data: result,
      message: `Revenue comparison loaded for ${weeksToShow} weeks`,
    }
  } catch (error) {
    console.error('Revenue comparison action error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to load revenue comparison data',
    }
  }
}

/**
 * Get revenue forecasting data based on trends
 */
export async function getRevenueForecastAction(
  revenueStream: RevenueStream,
  forecastWeeks: number = 4
): Promise<ActionResult<Array<{
  week: number
  weekLabel: string
  forecastedRevenue: number
  confidenceLevel: 'low' | 'medium' | 'high'
  lowerBound: number
  upperBound: number
  method: string
}>>> {
  try {
    const user = await getUser()
    if (!user) {
      redirect('/login')
    }

    if (!hasPermission(user.role, 'canViewFinancials')) {
      return {
        success: false,
        error: 'You do not have permission to view revenue forecasts',
      }
    }

    const currentFY = getCurrentFinancialYear()
    const currentWeek = getFinancialYearWeekIndex(new Date())

    // Get forecast from revenue stream analytics
    const forecast = await revenueStreamAnalytics.getRevenueForecast(
      revenueStream,
      currentFY.year,
      forecastWeeks
    )

    if (!forecast || forecast.length === 0) {
      return {
        success: true,
        data: [],
        message: 'Insufficient historical data for reliable forecasting',
      }
    }

    // Transform forecast data
    const forecastData = forecast.map(item => ({
      week: item.week_index,
      weekLabel: `W${item.week_index}`,
      forecastedRevenue: Math.round(item.forecasted_revenue),
      confidenceLevel: item.confidence_level,
      lowerBound: Math.round(item.lower_bound),
      upperBound: Math.round(item.upper_bound),
      method: item.forecast_method,
    }))

    // Log forecast access
    await logAuditEvent({
      userId: user.id,
      action: 'forecast_accessed',
      resourceType: 'revenue_forecast',
      resourceId: revenueStream,
      details: {
        revenueStream,
        forecastWeeks,
        currentWeek,
        forecastMethod: forecastData[0]?.method,
        averageConfidence: forecastData.reduce((sum, f) => {
          const confidenceScore = f.confidenceLevel === 'high' ? 3 : f.confidenceLevel === 'medium' ? 2 : 1
          return sum + confidenceScore
        }, 0) / forecastData.length,
        accessedAt: new Date(),
      },
      ipAddress: null,
    })

    return {
      success: true,
      data: forecastData,
      message: `Generated ${forecastData.length}-week revenue forecast for ${revenueStream}`,
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to generate revenue forecast',
    }
  }
}

/**
 * Get revenue performance alerts
 */
export async function getRevenuePerformanceAlertsAction(): Promise<ActionResult<Array<{
  type: 'positive' | 'negative' | 'neutral'
  severity: 'low' | 'medium' | 'high'
  title: string
  message: string
  revenueStream: RevenueStream
  variancePercent: number
  recommendedAction?: string
}>>> {
  try {
    const user = await getUser()
    if (!user) {
      redirect('/login')
    }

    if (!hasPermission(user.role, 'canViewFinancials')) {
      return {
        success: false,
        error: 'You do not have permission to view performance alerts',
      }
    }

    const currentFY = getCurrentFinancialYear()

    // Get performance alerts from revenue stream analytics
    const alerts = await revenueStreamAnalytics.getPerformanceAlerts(currentFY.year)

    if (!alerts || alerts.length === 0) {
      return {
        success: true,
        data: [],
        message: 'No significant revenue performance alerts',
      }
    }

    // Transform alerts for display
    const transformedAlerts = alerts.map(alert => ({
      type: alert.alert_type,
      severity: alert.severity,
      title: `${alert.revenue_stream.charAt(0).toUpperCase() + alert.revenue_stream.slice(1)} Revenue Alert`,
      message: alert.message,
      revenueStream: alert.revenue_stream,
      variancePercent: alert.variance_percent,
      recommendedAction: alert.recommended_action,
    }))

    // Log alert access
    await logAuditEvent({
      userId: user.id,
      action: 'alerts_accessed',
      resourceType: 'revenue_alerts',
      resourceId: 'performance_alerts',
      details: {
        alertCount: transformedAlerts.length,
        highSeverityCount: transformedAlerts.filter(a => a.severity === 'high').length,
        negativeAlertCount: transformedAlerts.filter(a => a.type === 'negative').length,
        accessedAt: new Date(),
      },
      ipAddress: null,
    })

    return {
      success: true,
      data: transformedAlerts,
      message: `Found ${transformedAlerts.length} revenue performance alerts`,
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to load revenue performance alerts',
    }
  }
}
