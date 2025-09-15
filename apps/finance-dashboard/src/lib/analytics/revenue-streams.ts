// Revenue stream analysis and YTD vs prior year comparison
// Provides week-based alignment for accurate period comparisons

import { createServiceRoleClient } from '@/lib/supabase/server'
import {
  getCurrentFinancialYear,
  getFinancialYear,
  getFinancialYearWeekIndex,
  getFinancialYearWeeks,
  getSameWeekPreviousYear,
  getFinancialPeriodRanges,
} from '@/lib/utils/dates'
import {
  calculatePercentageChange,
  isSignificantChange,
  formatCurrency,
} from '@/utils/financial'
import { REVENUE_VARIANCE_THRESHOLD_PERCENT } from '@/constants/financial'
import type { RevenueStream } from '@/types'

export interface WeeklyRevenueData {
  fy_year: number
  fy_week: number
  week_start_date: string
  week_end_date: string
  revenue_stream: RevenueStream
  gross_revenue: number
  tax_amount: number
  total_revenue: number
  invoice_count: number
  fy_label: string
}

export interface YTDComparison {
  revenue_stream: RevenueStream
  current_ytd: number
  prior_ytd: number
  variance_amount: number
  variance_percent: number
  is_significant_change: boolean
  current_invoice_count: number
  prior_invoice_count: number
  current_fy_label: string
  prior_fy_label: string
}

export interface WeeklyComparison {
  week_index: number
  current_week_start: string
  current_week_end: string
  prior_week_start: string
  prior_week_end: string
  revenue_stream: RevenueStream
  current_revenue: number
  prior_revenue: number
  variance_amount: number
  variance_percent: number
  is_significant_change: boolean
  current_fy_year: number
  prior_fy_year: number
}

export interface RevenueStreamSummary {
  revenue_stream: RevenueStream
  stream_label: string
  ytd_comparison: YTDComparison
  weekly_trend: WeeklyComparison[]
  top_performing_weeks: WeeklyComparison[]
  underperforming_weeks: WeeklyComparison[]
  seasonal_insights: {
    peak_weeks: number[]
    low_weeks: number[]
    average_weekly_revenue: number
    volatility_score: number
  }
}

export class RevenueStreamAnalytics {
  private supabase = createServiceRoleClient()

  /**
   * Get weekly revenue data for a specific financial year and revenue stream
   */
  async getWeeklyRevenueData(
    fyYear: number,
    revenueStream?: RevenueStream,
    endWeek?: number
  ): Promise<WeeklyRevenueData[]> {
    let query = this.supabase
      .from('fact_revenue_by_week')
      .select('*')
      .eq('fy_year', fyYear)
      .order('fy_week', { ascending: true })

    if (revenueStream) {
      query = query.eq('revenue_stream', revenueStream)
    }

    if (endWeek) {
      query = query.lte('fy_week', endWeek)
    }

    const { data, error } = await query

    if (error) {
      throw new Error(`Failed to fetch weekly revenue data: ${error.message}`)
    }

    return data || []
  }

  /**
   * Calculate YTD vs prior year comparison with week-based alignment
   */
  async calculateYTDComparison(
    currentFYYear?: number,
    asOfDate?: Date
  ): Promise<YTDComparison[]> {
    const currentFY = currentFYYear ? { year: currentFYYear } : getCurrentFinancialYear()
    const priorFY = { year: currentFY.year - 1 }
    const comparisonDate = asOfDate || new Date()
    
    // Get the current week index to ensure we compare the same period
    const currentWeekIndex = getFinancialYearWeekIndex(comparisonDate)

    // Get current YTD data
    const currentYTDData = await this.getWeeklyRevenueData(
      currentFY.year,
      undefined,
      currentWeekIndex
    )

    // Get prior year same period data
    const priorYTDData = await this.getWeeklyRevenueData(
      priorFY.year,
      undefined,
      currentWeekIndex
    )

    // Aggregate by revenue stream
    const currentMap = new Map<RevenueStream, {
      total: number
      invoices: number
    }>()
    const priorMap = new Map<RevenueStream, {
      total: number
      invoices: number
    }>()

    currentYTDData.forEach(record => {
      const stream = record.revenue_stream as RevenueStream
      if (!currentMap.has(stream)) {
        currentMap.set(stream, { total: 0, invoices: 0 })
      }
      const streamData = currentMap.get(stream)!
      streamData.total += record.total_revenue
      streamData.invoices += record.invoice_count
    })

    priorYTDData.forEach(record => {
      const stream = record.revenue_stream as RevenueStream
      if (!priorMap.has(stream)) {
        priorMap.set(stream, { total: 0, invoices: 0 })
      }
      const streamData = priorMap.get(stream)!
      streamData.total += record.total_revenue
      streamData.invoices += record.invoice_count
    })

    // Create comparison for all revenue streams
    const allStreams: RevenueStream[] = ['tours', 'dr-dish', 'marketing', 'other']
    
    return allStreams.map(stream => {
      const currentData = currentMap.get(stream) || { total: 0, invoices: 0 }
      const priorData = priorMap.get(stream) || { total: 0, invoices: 0 }
      
      const varianceAmount = currentData.total - priorData.total
      const variancePercent = calculatePercentageChange(priorData.total, currentData.total)

      return {
        revenue_stream: stream,
        current_ytd: currentData.total,
        prior_ytd: priorData.total,
        variance_amount: varianceAmount,
        variance_percent: variancePercent,
        is_significant_change: isSignificantChange(variancePercent, REVENUE_VARIANCE_THRESHOLD_PERCENT),
        current_invoice_count: currentData.invoices,
        prior_invoice_count: priorData.invoices,
        current_fy_label: `FY ${currentFY.year}-${String(currentFY.year + 1).slice(-2)}`,
        prior_fy_label: `FY ${priorFY.year}-${String(priorFY.year + 1).slice(-2)}`,
      }
    })
  }

  /**
   * Get week-by-week comparison for detailed analysis
   */
  async getWeeklyComparison(
    revenueStream: RevenueStream,
    currentFYYear?: number,
    weeksToCompare: number = 13
  ): Promise<WeeklyComparison[]> {
    const currentFY = currentFYYear ? { year: currentFYYear } : getCurrentFinancialYear()
    const priorFY = { year: currentFY.year - 1 }

    // Get current and prior year data
    const [currentData, priorData] = await Promise.all([
      this.getWeeklyRevenueData(currentFY.year, revenueStream, weeksToCompare),
      this.getWeeklyRevenueData(priorFY.year, revenueStream, weeksToCompare),
    ])

    // Create maps for easy lookup
    const currentMap = new Map<number, WeeklyRevenueData>()
    const priorMap = new Map<number, WeeklyRevenueData>()

    currentData.forEach(record => currentMap.set(record.fy_week, record))
    priorData.forEach(record => priorMap.set(record.fy_week, record))

    // Generate comparison for each week
    const comparisons: WeeklyComparison[] = []
    
    for (let week = 1; week <= weeksToCompare; week++) {
      const currentWeekData = currentMap.get(week)
      const priorWeekData = priorMap.get(week)
      
      const currentRevenue = currentWeekData?.total_revenue || 0
      const priorRevenue = priorWeekData?.total_revenue || 0
      
      const varianceAmount = currentRevenue - priorRevenue
      const variancePercent = calculatePercentageChange(priorRevenue, currentRevenue)

      comparisons.push({
        week_index: week,
        current_week_start: currentWeekData?.week_start_date || '',
        current_week_end: currentWeekData?.week_end_date || '',
        prior_week_start: priorWeekData?.week_start_date || '',
        prior_week_end: priorWeekData?.week_end_date || '',
        revenue_stream: revenueStream,
        current_revenue: currentRevenue,
        prior_revenue: priorRevenue,
        variance_amount: varianceAmount,
        variance_percent: variancePercent,
        is_significant_change: isSignificantChange(variancePercent, REVENUE_VARIANCE_THRESHOLD_PERCENT),
        current_fy_year: currentFY.year,
        prior_fy_year: priorFY.year,
      })
    }

    return comparisons
  }

  /**
   * Generate comprehensive revenue stream analysis
   */
  async generateRevenueStreamSummary(
    revenueStream: RevenueStream,
    currentFYYear?: number
  ): Promise<RevenueStreamSummary> {
    const streamLabels: Record<RevenueStream, string> = {
      tours: 'Tours Revenue',
      'dr-dish': 'Dr Dish Distribution',
      marketing: 'Marketing Revenue',
      other: 'Other Revenue',
    }

    // Get YTD comparison
    const ytdComparisons = await this.calculateYTDComparison(currentFYYear)
    const ytdComparison = ytdComparisons.find(c => c.revenue_stream === revenueStream)!

    // Get weekly comparison (last 13 weeks for trend analysis)
    const weeklyComparisons = await this.getWeeklyComparison(revenueStream, currentFYYear, 13)

    // Identify top performing and underperforming weeks
    const sortedByVariance = [...weeklyComparisons].sort((a, b) => b.variance_percent - a.variance_percent)
    const topPerforming = sortedByVariance.slice(0, 3)
    const underperforming = sortedByVariance.slice(-3).reverse()

    // Calculate seasonal insights
    const revenues = weeklyComparisons.map(w => w.current_revenue)
    const averageRevenue = revenues.reduce((sum, rev) => sum + rev, 0) / revenues.length
    
    // Find peak and low weeks (above/below 1.5x average)
    const peakThreshold = averageRevenue * 1.5
    const lowThreshold = averageRevenue * 0.5
    
    const peakWeeks = weeklyComparisons
      .filter(w => w.current_revenue > peakThreshold)
      .map(w => w.week_index)
    
    const lowWeeks = weeklyComparisons
      .filter(w => w.current_revenue < lowThreshold && w.current_revenue > 0)
      .map(w => w.week_index)

    // Calculate volatility (coefficient of variation)
    const mean = averageRevenue
    const variance = revenues.reduce((sum, rev) => sum + Math.pow(rev - mean, 2), 0) / revenues.length
    const standardDeviation = Math.sqrt(variance)
    const volatilityScore = mean > 0 ? (standardDeviation / mean) * 100 : 0

    return {
      revenue_stream: revenueStream,
      stream_label: streamLabels[revenueStream],
      ytd_comparison: ytdComparison,
      weekly_trend: weeklyComparisons,
      top_performing_weeks: topPerforming,
      underperforming_weeks: underperforming,
      seasonal_insights: {
        peak_weeks: peakWeeks,
        low_weeks: lowWeeks,
        average_weekly_revenue: averageRevenue,
        volatility_score: volatilityScore,
      },
    }
  }

  /**
   * Get revenue stream performance alerts
   */
  async getPerformanceAlerts(currentFYYear?: number): Promise<Array<{
    revenue_stream: RevenueStream
    alert_type: 'positive' | 'negative' | 'neutral'
    message: string
    severity: 'low' | 'medium' | 'high'
    variance_percent: number
    recommended_action?: string
  }>> {
    const ytdComparisons = await this.calculateYTDComparison(currentFYYear)
    const alerts: Array<{
      revenue_stream: RevenueStream
      alert_type: 'positive' | 'negative' | 'neutral'
      message: string
      severity: 'low' | 'medium' | 'high'
      variance_percent: number
      recommended_action?: string
    }> = []

    ytdComparisons.forEach(comparison => {
      if (!comparison.is_significant_change) return

      const absVariance = Math.abs(comparison.variance_percent)
      let severity: 'low' | 'medium' | 'high' = 'low'
      
      if (absVariance > 50) severity = 'high'
      else if (absVariance > 30) severity = 'medium'

      if (comparison.variance_percent > REVENUE_VARIANCE_THRESHOLD_PERCENT) {
        // Positive performance
        alerts.push({
          revenue_stream: comparison.revenue_stream,
          alert_type: 'positive',
          message: `${comparison.revenue_stream} revenue is up ${comparison.variance_percent.toFixed(1)}% YTD vs prior year (${formatCurrency(comparison.variance_amount)} increase)`,
          severity,
          variance_percent: comparison.variance_percent,
          recommended_action: severity === 'high' 
            ? 'Investigate success factors and consider scaling successful initiatives'
            : 'Monitor trend continuation and resource allocation',
        })
      } else if (comparison.variance_percent < -REVENUE_VARIANCE_THRESHOLD_PERCENT) {
        // Negative performance
        alerts.push({
          revenue_stream: comparison.revenue_stream,
          alert_type: 'negative',
          message: `${comparison.revenue_stream} revenue is down ${Math.abs(comparison.variance_percent).toFixed(1)}% YTD vs prior year (${formatCurrency(Math.abs(comparison.variance_amount))} decrease)`,
          severity,
          variance_percent: comparison.variance_percent,
          recommended_action: severity === 'high'
            ? 'Immediate review required - investigate root causes and implement corrective actions'
            : 'Monitor closely and consider proactive measures to improve performance',
        })
      }
    })

    return alerts.sort((a, b) => {
      // Sort by severity (high first) then by absolute variance
      const severityOrder = { high: 3, medium: 2, low: 1 }
      const severityDiff = severityOrder[b.severity] - severityOrder[a.severity]
      if (severityDiff !== 0) return severityDiff
      
      return Math.abs(b.variance_percent) - Math.abs(a.variance_percent)
    })
  }

  /**
   * Get revenue forecasting data based on trends
   */
  async getRevenueForecast(
    revenueStream: RevenueStream,
    currentFYYear?: number,
    forecastWeeks: number = 4
  ): Promise<Array<{
    week_index: number
    forecasted_revenue: number
    confidence_level: 'low' | 'medium' | 'high'
    forecast_method: string
    lower_bound: number
    upper_bound: number
  }>> {
    // Get historical data for trend analysis
    const currentFY = currentFYYear ? { year: currentFYYear } : getCurrentFinancialYear()
    const currentWeek = getFinancialYearWeekIndex(new Date())
    
    // Get last 8 weeks of data for trend calculation
    const historicalData = await this.getWeeklyRevenueData(
      currentFY.year,
      revenueStream,
      currentWeek
    )

    if (historicalData.length < 4) {
      // Not enough data for reliable forecasting
      return []
    }

    // Simple linear regression for trend
    const recentWeeks = historicalData.slice(-8) // Last 8 weeks
    const revenues = recentWeeks.map(w => w.total_revenue)
    const weeks = recentWeeks.map((_, index) => index + 1)

    // Calculate linear trend
    const n = revenues.length
    const sumX = weeks.reduce((sum, x) => sum + x, 0)
    const sumY = revenues.reduce((sum, y) => sum + y, 0)
    const sumXY = weeks.reduce((sum, x, i) => sum + x * revenues[i], 0)
    const sumXX = weeks.reduce((sum, x) => sum + x * x, 0)

    const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX)
    const intercept = (sumY - slope * sumX) / n

    // Calculate confidence based on R-squared
    const meanY = sumY / n
    const ssRes = revenues.reduce((sum, y, i) => {
      const predicted = intercept + slope * weeks[i]
      return sum + Math.pow(y - predicted, 2)
    }, 0)
    const ssTot = revenues.reduce((sum, y) => sum + Math.pow(y - meanY, 2), 0)
    const rSquared = 1 - (ssRes / ssTot)

    let confidenceLevel: 'low' | 'medium' | 'high' = 'low'
    if (rSquared > 0.7) confidenceLevel = 'high'
    else if (rSquared > 0.4) confidenceLevel = 'medium'

    // Generate forecasts
    const forecasts: Array<{
      week_index: number
      forecasted_revenue: number
      confidence_level: 'low' | 'medium' | 'high'
      forecast_method: string
      lower_bound: number
      upper_bound: number
    }> = []

    for (let i = 1; i <= forecastWeeks; i++) {
      const weekIndex = currentWeek + i
      const forecastedRevenue = Math.max(0, intercept + slope * (recentWeeks.length + i))
      
      // Calculate confidence intervals (simplified)
      const standardError = Math.sqrt(ssRes / (n - 2))
      const margin = standardError * 1.96 // 95% confidence interval
      
      forecasts.push({
        week_index: weekIndex,
        forecasted_revenue: forecastedRevenue,
        confidence_level: confidenceLevel,
        forecast_method: 'Linear Trend',
        lower_bound: Math.max(0, forecastedRevenue - margin),
        upper_bound: forecastedRevenue + margin,
      })
    }

    return forecasts
  }
}

// Export singleton instance
export const revenueStreamAnalytics = new RevenueStreamAnalytics()
