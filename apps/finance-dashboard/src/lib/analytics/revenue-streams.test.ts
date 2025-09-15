// Unit tests for revenue stream analytics and YTD comparisons

import { RevenueStreamAnalytics } from './revenue-streams'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { REVENUE_VARIANCE_THRESHOLD_PERCENT } from '@/constants/financial'

// Mock Supabase client
jest.mock('@/lib/supabase/server', () => ({
  createServiceRoleClient: jest.fn(),
}))

// Mock date utilities
jest.mock('@/lib/utils/dates', () => ({
  getCurrentFinancialYear: jest.fn(() => ({ year: 2024 })),
  getFinancialYearWeekIndex: jest.fn(() => 8), // Mock current week as week 8
}))

const mockSupabase = {
  from: jest.fn().mockReturnThis(),
  select: jest.fn().mockReturnThis(),
  eq: jest.fn().mockReturnThis(),
  lte: jest.fn().mockReturnThis(),
  order: jest.fn().mockReturnThis(),
}

beforeEach(() => {
  jest.clearAllMocks()
  ;(createServiceRoleClient as jest.Mock).mockReturnValue(mockSupabase)
})

describe('RevenueStreamAnalytics', () => {
  let analytics: RevenueStreamAnalytics

  beforeEach(() => {
    analytics = new RevenueStreamAnalytics()
  })

  describe('getWeeklyRevenueData', () => {
    it('should fetch weekly revenue data correctly', async () => {
      const mockWeeklyData = [
        {
          fy_year: 2024,
          fy_week: 1,
          week_start_date: '2024-07-01',
          week_end_date: '2024-07-07',
          revenue_stream: 'tours',
          gross_revenue: 10000,
          tax_amount: 1000,
          total_revenue: 11000,
          invoice_count: 5,
          fy_label: 'FY 2024-25',
        },
        {
          fy_year: 2024,
          fy_week: 2,
          week_start_date: '2024-07-08',
          week_end_date: '2024-07-14',
          revenue_stream: 'tours',
          gross_revenue: 12000,
          tax_amount: 1200,
          total_revenue: 13200,
          invoice_count: 6,
          fy_label: 'FY 2024-25',
        },
      ]

      mockSupabase.order.mockReturnValue({ data: mockWeeklyData, error: null })

      const result = await analytics.getWeeklyRevenueData(2024, 'tours', 8)

      expect(mockSupabase.from).toHaveBeenCalledWith('fact_revenue_by_week')
      expect(mockSupabase.eq).toHaveBeenCalledWith('fy_year', 2024)
      expect(mockSupabase.eq).toHaveBeenCalledWith('revenue_stream', 'tours')
      expect(mockSupabase.lte).toHaveBeenCalledWith('fy_week', 8)
      expect(result).toEqual(mockWeeklyData)
    })

    it('should handle query without revenue stream filter', async () => {
      mockSupabase.order.mockReturnValue({ data: [], error: null })

      await analytics.getWeeklyRevenueData(2024)

      expect(mockSupabase.eq).toHaveBeenCalledWith('fy_year', 2024)
      expect(mockSupabase.eq).toHaveBeenCalledTimes(1) // Only FY year filter
    })

    it('should throw error when query fails', async () => {
      mockSupabase.order.mockReturnValue({
        data: null,
        error: { message: 'Database error' },
      })

      await expect(analytics.getWeeklyRevenueData(2024)).rejects.toThrow(
        'Failed to fetch weekly revenue data: Database error'
      )
    })
  })

  describe('calculateYTDComparison', () => {
    it('should calculate YTD vs prior year comparison correctly', async () => {
      const mockCurrentData = [
        {
          fy_year: 2024,
          fy_week: 1,
          revenue_stream: 'tours',
          total_revenue: 50000,
          invoice_count: 10,
        },
        {
          fy_year: 2024,
          fy_week: 2,
          revenue_stream: 'tours',
          total_revenue: 45000,
          invoice_count: 9,
        },
        {
          fy_year: 2024,
          fy_week: 1,
          revenue_stream: 'dr-dish',
          total_revenue: 30000,
          invoice_count: 5,
        },
      ]

      const mockPriorData = [
        {
          fy_year: 2023,
          fy_week: 1,
          revenue_stream: 'tours',
          total_revenue: 40000,
          invoice_count: 8,
        },
        {
          fy_year: 2023,
          fy_week: 2,
          revenue_stream: 'tours',
          total_revenue: 38000,
          invoice_count: 7,
        },
        {
          fy_year: 2023,
          fy_week: 1,
          revenue_stream: 'dr-dish',
          total_revenue: 35000,
          invoice_count: 6,
        },
      ]

      mockSupabase.order
        .mockReturnValueOnce({ data: mockCurrentData, error: null })
        .mockReturnValueOnce({ data: mockPriorData, error: null })

      const result = await analytics.calculateYTDComparison(2024)

      expect(result).toHaveLength(4) // All revenue streams

      const toursComparison = result.find(r => r.revenue_stream === 'tours')
      expect(toursComparison).toMatchObject({
        revenue_stream: 'tours',
        current_ytd: 95000, // 50000 + 45000
        prior_ytd: 78000, // 40000 + 38000
        current_invoice_count: 19, // 10 + 9
        prior_invoice_count: 15, // 8 + 7
        current_fy_label: 'FY 2024-25',
        prior_fy_label: 'FY 2023-24',
      })
      expect(toursComparison?.variance_amount).toBe(17000)
      expect(toursComparison?.variance_percent).toBeGreaterThan(0)

      const drDishComparison = result.find(r => r.revenue_stream === 'dr-dish')
      expect(drDishComparison).toMatchObject({
        revenue_stream: 'dr-dish',
        current_ytd: 30000,
        prior_ytd: 35000,
        variance_amount: -5000,
      })
      expect(drDishComparison?.variance_percent).toBeLessThan(0)
    })

    it('should handle empty data gracefully', async () => {
      mockSupabase.order
        .mockReturnValueOnce({ data: [], error: null })
        .mockReturnValueOnce({ data: [], error: null })

      const result = await analytics.calculateYTDComparison(2024)

      expect(result).toHaveLength(4)
      result.forEach(comparison => {
        expect(comparison.current_ytd).toBe(0)
        expect(comparison.prior_ytd).toBe(0)
        expect(comparison.variance_amount).toBe(0)
      })
    })
  })

  describe('getWeeklyComparison', () => {
    it('should generate week-by-week comparison', async () => {
      const mockCurrentData = [
        {
          fy_year: 2024,
          fy_week: 1,
          week_start_date: '2024-07-01',
          week_end_date: '2024-07-07',
          revenue_stream: 'tours',
          total_revenue: 25000,
        },
        {
          fy_year: 2024,
          fy_week: 2,
          week_start_date: '2024-07-08',
          week_end_date: '2024-07-14',
          revenue_stream: 'tours',
          total_revenue: 30000,
        },
      ]

      const mockPriorData = [
        {
          fy_year: 2023,
          fy_week: 1,
          week_start_date: '2023-07-03',
          week_end_date: '2023-07-09',
          revenue_stream: 'tours',
          total_revenue: 20000,
        },
        {
          fy_year: 2023,
          fy_week: 2,
          week_start_date: '2023-07-10',
          week_end_date: '2023-07-16',
          revenue_stream: 'tours',
          total_revenue: 22000,
        },
      ]

      mockSupabase.order
        .mockReturnValueOnce({ data: mockCurrentData, error: null })
        .mockReturnValueOnce({ data: mockPriorData, error: null })

      const result = await analytics.getWeeklyComparison('tours', 2024, 2)

      expect(result).toHaveLength(2)

      expect(result[0]).toMatchObject({
        week_index: 1,
        revenue_stream: 'tours',
        current_revenue: 25000,
        prior_revenue: 20000,
        variance_amount: 5000,
        current_fy_year: 2024,
        prior_fy_year: 2023,
      })
      expect(result[0].variance_percent).toBe(25) // (25000-20000)/20000 * 100

      expect(result[1]).toMatchObject({
        week_index: 2,
        current_revenue: 30000,
        prior_revenue: 22000,
        variance_amount: 8000,
      })
    })

    it('should handle missing weeks with zero values', async () => {
      const mockCurrentData = [
        {
          fy_year: 2024,
          fy_week: 1,
          revenue_stream: 'tours',
          total_revenue: 25000,
        },
        // Week 2 missing
      ]

      const mockPriorData = [
        {
          fy_year: 2023,
          fy_week: 1,
          revenue_stream: 'tours',
          total_revenue: 20000,
        },
        {
          fy_year: 2023,
          fy_week: 2,
          revenue_stream: 'tours',
          total_revenue: 22000,
        },
      ]

      mockSupabase.order
        .mockReturnValueOnce({ data: mockCurrentData, error: null })
        .mockReturnValueOnce({ data: mockPriorData, error: null })

      const result = await analytics.getWeeklyComparison('tours', 2024, 2)

      expect(result).toHaveLength(2)
      expect(result[1]).toMatchObject({
        week_index: 2,
        current_revenue: 0, // Missing data
        prior_revenue: 22000,
        variance_amount: -22000,
      })
    })
  })

  describe('generateRevenueStreamSummary', () => {
    it('should generate comprehensive revenue stream analysis', async () => {
      // Mock YTD comparison
      const mockYTDData = [
        {
          revenue_stream: 'tours',
          current_ytd: 100000,
          prior_ytd: 80000,
          variance_amount: 20000,
          variance_percent: 25,
          is_significant_change: true,
          current_invoice_count: 20,
          prior_invoice_count: 16,
          current_fy_label: 'FY 2024-25',
          prior_fy_label: 'FY 2023-24',
        },
      ]

      // Mock weekly comparison data
      const mockWeeklyData = Array.from({ length: 13 }, (_, i) => ({
        week_index: i + 1,
        current_week_start: `2024-07-${i * 7 + 1}`,
        current_week_end: `2024-07-${i * 7 + 7}`,
        prior_week_start: `2023-07-${i * 7 + 3}`,
        prior_week_end: `2023-07-${i * 7 + 9}`,
        revenue_stream: 'tours' as const,
        current_revenue: 8000 + (i * 500), // Increasing trend
        prior_revenue: 7000 + (i * 300),
        variance_amount: 1000 + (i * 200),
        variance_percent: 15 + (i * 2),
        is_significant_change: i > 5, // Significant after week 6
        current_fy_year: 2024,
        prior_fy_year: 2023,
      }))

      // Mock the methods
      jest.spyOn(analytics, 'calculateYTDComparison').mockResolvedValue(mockYTDData)
      jest.spyOn(analytics, 'getWeeklyComparison').mockResolvedValue(mockWeeklyData)

      const result = await analytics.generateRevenueStreamSummary('tours', 2024)

      expect(result).toMatchObject({
        revenue_stream: 'tours',
        stream_label: 'Tours Revenue',
        ytd_comparison: mockYTDData[0],
        weekly_trend: mockWeeklyData,
      })

      expect(result.top_performing_weeks).toHaveLength(3)
      expect(result.underperforming_weeks).toHaveLength(3)
      expect(result.seasonal_insights.average_weekly_revenue).toBeGreaterThan(0)
      expect(result.seasonal_insights.volatility_score).toBeGreaterThan(0)
    })
  })

  describe('getPerformanceAlerts', () => {
    it('should generate performance alerts for significant variances', async () => {
      const mockYTDData = [
        {
          revenue_stream: 'tours' as const,
          current_ytd: 150000,
          prior_ytd: 100000,
          variance_amount: 50000,
          variance_percent: 50, // High positive variance
          is_significant_change: true,
          current_invoice_count: 30,
          prior_invoice_count: 20,
          current_fy_label: 'FY 2024-25',
          prior_fy_label: 'FY 2023-24',
        },
        {
          revenue_stream: 'dr-dish' as const,
          current_ytd: 60000,
          prior_ytd: 100000,
          variance_amount: -40000,
          variance_percent: -40, // High negative variance
          is_significant_change: true,
          current_invoice_count: 12,
          prior_invoice_count: 20,
          current_fy_label: 'FY 2024-25',
          prior_fy_label: 'FY 2023-24',
        },
        {
          revenue_stream: 'marketing' as const,
          current_ytd: 50000,
          prior_ytd: 48000,
          variance_amount: 2000,
          variance_percent: 4.2, // Small variance, not significant
          is_significant_change: false,
          current_invoice_count: 10,
          prior_invoice_count: 10,
          current_fy_label: 'FY 2024-25',
          prior_fy_label: 'FY 2023-24',
        },
      ]

      jest.spyOn(analytics, 'calculateYTDComparison').mockResolvedValue(mockYTDData)

      const alerts = await analytics.getPerformanceAlerts(2024)

      expect(alerts).toHaveLength(2) // Only significant changes

      const positiveAlert = alerts.find(a => a.alert_type === 'positive')
      expect(positiveAlert).toMatchObject({
        revenue_stream: 'tours',
        alert_type: 'positive',
        severity: 'high', // >50% variance
        variance_percent: 50,
      })
      expect(positiveAlert?.message).toContain('up 50.0%')
      expect(positiveAlert?.recommended_action).toContain('scaling successful initiatives')

      const negativeAlert = alerts.find(a => a.alert_type === 'negative')
      expect(negativeAlert).toMatchObject({
        revenue_stream: 'dr-dish',
        alert_type: 'negative',
        severity: 'medium', // 30-50% variance
        variance_percent: -40,
      })
      expect(negativeAlert?.message).toContain('down 40.0%')
      expect(negativeAlert?.recommended_action).toContain('Monitor closely')
    })

    it('should sort alerts by severity and variance', async () => {
      const mockYTDData = [
        {
          revenue_stream: 'tours' as const,
          variance_percent: 25,
          is_significant_change: true,
          current_ytd: 125000,
          prior_ytd: 100000,
          variance_amount: 25000,
          current_invoice_count: 25,
          prior_invoice_count: 20,
          current_fy_label: 'FY 2024-25',
          prior_fy_label: 'FY 2023-24',
        },
        {
          revenue_stream: 'dr-dish' as const,
          variance_percent: -60, // Higher severity
          is_significant_change: true,
          current_ytd: 40000,
          prior_ytd: 100000,
          variance_amount: -60000,
          current_invoice_count: 8,
          prior_invoice_count: 20,
          current_fy_label: 'FY 2024-25',
          prior_fy_label: 'FY 2023-24',
        },
      ]

      jest.spyOn(analytics, 'calculateYTDComparison').mockResolvedValue(mockYTDData)

      const alerts = await analytics.getPerformanceAlerts(2024)

      expect(alerts[0].revenue_stream).toBe('dr-dish') // Higher severity first
      expect(alerts[0].severity).toBe('high')
      expect(alerts[1].revenue_stream).toBe('tours')
      expect(alerts[1].severity).toBe('medium')
    })
  })

  describe('getRevenueForecast', () => {
    it('should generate revenue forecast based on trends', async () => {
      // Mock historical data with increasing trend
      const mockHistoricalData = Array.from({ length: 8 }, (_, i) => ({
        fy_year: 2024,
        fy_week: i + 1,
        week_start_date: `2024-07-${i * 7 + 1}`,
        week_end_date: `2024-07-${i * 7 + 7}`,
        revenue_stream: 'tours',
        gross_revenue: 9000 + (i * 1000),
        tax_amount: 900 + (i * 100),
        total_revenue: 10000 + (i * 1000), // Linear increase
        invoice_count: 5,
        fy_label: 'FY 2024-25',
      }))

      mockSupabase.order.mockReturnValue({ data: mockHistoricalData, error: null })

      const forecast = await analytics.getRevenueForecast('tours', 2024, 4)

      expect(forecast).toHaveLength(4)
      expect(forecast[0]).toMatchObject({
        week_index: 9, // Current week + 1
        confidence_level: expect.any(String),
        forecast_method: 'Linear Trend',
      })
      expect(forecast[0].forecasted_revenue).toBeGreaterThan(0)
      expect(forecast[0].lower_bound).toBeLessThan(forecast[0].forecasted_revenue)
      expect(forecast[0].upper_bound).toBeGreaterThan(forecast[0].forecasted_revenue)

      // Forecast should show increasing trend
      expect(forecast[1].forecasted_revenue).toBeGreaterThan(forecast[0].forecasted_revenue)
    })

    it('should return empty array for insufficient historical data', async () => {
      const mockLimitedData = [
        {
          fy_year: 2024,
          fy_week: 1,
          total_revenue: 10000,
        },
      ]

      mockSupabase.order.mockReturnValue({ data: mockLimitedData, error: null })

      const forecast = await analytics.getRevenueForecast('tours', 2024, 4)

      expect(forecast).toEqual([])
    })

    it('should adjust confidence level based on trend reliability', async () => {
      // Mock data with perfect linear trend (high R-squared)
      const mockPerfectTrendData = Array.from({ length: 8 }, (_, i) => ({
        fy_year: 2024,
        fy_week: i + 1,
        total_revenue: 10000 + (i * 2000), // Perfect linear trend
      }))

      mockSupabase.order.mockReturnValue({ data: mockPerfectTrendData, error: null })

      const forecast = await analytics.getRevenueForecast('tours', 2024, 2)

      expect(forecast[0].confidence_level).toBe('high') // Perfect trend should have high confidence
    })
  })
})
