// Unit tests for financial calculations engine

import { FinancialCalculationsEngine } from './calculations'
import { createServiceRoleClient } from '@/lib/supabase/server'
import {
  AR_AGING_BUCKETS,
  AP_AGING_BUCKETS,
  OVERDUE_CUSTOMER_THRESHOLD_DAYS,
  OVERDUE_SUPPLIER_THRESHOLD_DAYS,
} from '@/constants/financial'

// Mock Supabase client
jest.mock('@/lib/supabase/server', () => ({
  createServiceRoleClient: jest.fn(),
}))

const mockSupabase = {
  from: jest.fn().mockReturnThis(),
  select: jest.fn().mockReturnThis(),
  eq: jest.fn().mockReturnThis(),
  in: jest.fn().mockReturnThis(),
  gt: jest.fn().mockReturnThis(),
  gte: jest.fn().mockReturnThis(),
  lte: jest.fn().mockReturnThis(),
  order: jest.fn().mockReturnThis(),
}

beforeEach(() => {
  jest.clearAllMocks()
  ;(createServiceRoleClient as jest.Mock).mockReturnValue(mockSupabase)
})

describe('FinancialCalculationsEngine', () => {
  let engine: FinancialCalculationsEngine

  beforeEach(() => {
    engine = new FinancialCalculationsEngine()
  })

  describe('calculateARAgingAnalysis', () => {
    it('should calculate AR aging buckets correctly', async () => {
      const mockARData = [
        {
          aging_bucket: 'Current',
          revenue_stream: 'tours',
          outstanding_amount: 1000,
          days_past_due: 15,
        },
        {
          aging_bucket: 'Current',
          revenue_stream: 'tours',
          outstanding_amount: 500,
          days_past_due: 20,
        },
        {
          aging_bucket: '31-60 days',
          revenue_stream: 'dr-dish',
          outstanding_amount: 750,
          days_past_due: 45,
        },
      ]

      mockSupabase.from.mockReturnValue(mockSupabase)
      mockSupabase.select.mockReturnValue(mockSupabase)
      mockSupabase.gt.mockReturnValue({ data: mockARData, error: null })

      const result = await engine.calculateARAgingAnalysis()

      expect(result).toHaveLength(2)
      expect(result[0]).toMatchObject({
        aging_bucket: 'Current',
        invoice_count: 2,
        total_outstanding: 1500,
        avg_days_past_due: 17.5,
        min_days_past_due: 15,
        max_days_past_due: 20,
      })
      expect(result[1]).toMatchObject({
        aging_bucket: '31-60 days',
        invoice_count: 1,
        total_outstanding: 750,
        avg_days_past_due: 45,
      })
    })

    it('should handle empty AR data', async () => {
      mockSupabase.gt.mockReturnValue({ data: [], error: null })

      const result = await engine.calculateARAgingAnalysis()

      expect(result).toEqual([])
    })

    it('should filter by revenue streams when provided', async () => {
      mockSupabase.gt.mockReturnValue({ data: [], error: null })

      await engine.calculateARAgingAnalysis(new Date(), ['tours'])

      expect(mockSupabase.in).toHaveBeenCalledWith('revenue_stream', ['tours'])
    })

    it('should throw error when Supabase query fails', async () => {
      mockSupabase.gt.mockReturnValue({ 
        data: null, 
        error: { message: 'Database error' } 
      })

      await expect(engine.calculateARAgingAnalysis()).rejects.toThrow(
        'Failed to fetch AR data: Database error'
      )
    })
  })

  describe('calculateAPAgingAnalysis', () => {
    it('should calculate AP aging buckets correctly', async () => {
      const mockAPData = [
        {
          aging_bucket: '61-90 days',
          supplier_category: 'equipment',
          outstanding_amount: 2000,
          days_past_due: 75,
        },
        {
          aging_bucket: '90+ days',
          supplier_category: 'services',
          outstanding_amount: 1200,
          days_past_due: 120,
        },
      ]

      mockSupabase.gt.mockReturnValue({ data: mockAPData, error: null })

      const result = await engine.calculateAPAgingAnalysis()

      expect(result).toHaveLength(2)
      expect(result[0]).toMatchObject({
        aging_bucket: '61-90 days',
        invoice_count: 1,
        total_outstanding: 2000,
        avg_days_past_due: 75,
      })
    })

    it('should filter by supplier categories when provided', async () => {
      mockSupabase.gt.mockReturnValue({ data: [], error: null })

      await engine.calculateAPAgingAnalysis(new Date(), ['equipment'])

      expect(mockSupabase.in).toHaveBeenCalledWith('supplier_category', ['equipment'])
    })
  })

  describe('calculateCashFlowMetrics', () => {
    it('should calculate DSO, DPO, and cash conversion cycle', async () => {
      const mockARData = [{ outstanding_amount: 5000 }, { outstanding_amount: 3000 }]
      const mockAPData = [{ outstanding_amount: 2000 }, { outstanding_amount: 1500 }]
      const mockRevenueData = [{ total_amount: 10000 }, { total_amount: 15000 }]
      const mockPurchaseData = [{ total_amount: 8000 }, { total_amount: 6000 }]

      mockSupabase.select
        .mockReturnValueOnce(mockSupabase) // AR query
        .mockReturnValueOnce(mockSupabase) // AP query
        .mockReturnValueOnce(mockSupabase) // Revenue query
        .mockReturnValueOnce(mockSupabase) // Purchase query

      mockSupabase.gt
        .mockReturnValueOnce({ data: mockARData, error: null }) // AR
        .mockReturnValueOnce({ data: mockAPData, error: null }) // AP

      mockSupabase.in.mockReturnValue({ data: mockRevenueData, error: null })
      mockSupabase.lte.mockReturnValue({ data: mockPurchaseData, error: null })

      const result = await engine.calculateCashFlowMetrics()

      expect(result.ar_total).toBe(8000)
      expect(result.ap_total).toBe(3500)
      expect(result.net_position).toBe(4500)
      expect(result.dso).toBeGreaterThan(0)
      expect(result.dpo).toBeGreaterThan(0)
      expect(result.cash_conversion_cycle).toBeDefined()
    })
  })

  describe('calculateRevenueStreamAnalysis', () => {
    it('should compare current vs prior year revenue by stream', async () => {
      const mockCurrentData = [
        { revenue_stream: 'tours', total_revenue: 50000 },
        { revenue_stream: 'dr-dish', total_revenue: 30000 },
      ]
      const mockPriorData = [
        { revenue_stream: 'tours', total_revenue: 45000 },
        { revenue_stream: 'dr-dish', total_revenue: 35000 },
      ]
      const mockInvoiceData = [
        { revenue_stream: 'tours' },
        { revenue_stream: 'tours' },
        { revenue_stream: 'dr-dish' },
      ]

      mockSupabase.lte
        .mockReturnValueOnce({ data: mockCurrentData, error: null })
        .mockReturnValueOnce({ data: mockPriorData, error: null })
        .mockReturnValueOnce({ data: mockInvoiceData, error: null })

      const result = await engine.calculateRevenueStreamAnalysis(2024)

      expect(result).toHaveLength(4) // All revenue streams
      
      const toursAnalysis = result.find(r => r.revenue_stream === 'tours')
      expect(toursAnalysis).toMatchObject({
        revenue_stream: 'tours',
        current_period: 50000,
        prior_period: 45000,
        invoice_count: 2,
      })
      expect(toursAnalysis?.percentage_change).toBeGreaterThan(0)

      const drDishAnalysis = result.find(r => r.revenue_stream === 'dr-dish')
      expect(drDishAnalysis).toMatchObject({
        revenue_stream: 'dr-dish',
        current_period: 30000,
        prior_period: 35000,
        invoice_count: 1,
      })
      expect(drDishAnalysis?.percentage_change).toBeLessThan(0)
    })
  })

  describe('calculateInventoryMetrics', () => {
    it('should calculate Dr Dish inventory turnover and days on hand', async () => {
      const mockInventoryData = [
        {
          item_key: 'item1',
          quantity_after: 50,
          total_value: 5000,
          dim_item: {
            code: 'DD-PRO-001',
            name: 'Dr Dish Pro',
            is_dr_dish_product: true,
            reorder_level: 10,
            standard_cost: 100,
          },
        },
        {
          item_key: 'item2',
          quantity_after: 5,
          total_value: 1000,
          dim_item: {
            code: 'DD-HOME-001',
            name: 'Dr Dish Home',
            is_dr_dish_product: true,
            reorder_level: 15,
            standard_cost: 200,
          },
        },
      ]
      const mockCOGSData = [{ total_amount: 10000 }]

      mockSupabase.order.mockReturnValue({ data: mockInventoryData, error: null })
      mockSupabase.in.mockReturnValue({ data: mockCOGSData, error: null })

      const result = await engine.calculateInventoryMetrics()

      expect(result.current_inventory_value).toBe(6000)
      expect(result.inventory_turnover).toBeGreaterThan(0)
      expect(result.days_of_inventory).toBeGreaterThan(0)
      expect(result.reorder_alerts).toHaveLength(1) // Item2 is below reorder level
      expect(result.reorder_alerts[0]).toMatchObject({
        item_code: 'DD-HOME-001',
        current_stock: 5,
        reorder_level: 15,
      })
    })

    it('should handle empty inventory data', async () => {
      mockSupabase.order.mockReturnValue({ data: [], error: null })

      const result = await engine.calculateInventoryMetrics()

      expect(result).toMatchObject({
        current_inventory_value: 0,
        inventory_turnover: 0,
        days_of_inventory: 0,
        reorder_alerts: [],
      })
    })
  })

  describe('calculateMarginAnalysis', () => {
    it('should calculate gross margins by revenue stream', async () => {
      const mockRevenueData = [
        {
          revenue_stream: 'tours',
          line_amount: 8000,
          total_amount: 8800,
          quantity: 10,
          unit_price: 800,
          dim_account: { is_revenue_account: true, is_cogs_account: false },
        },
        {
          revenue_stream: 'dr-dish',
          line_amount: 5000,
          total_amount: 5500,
          quantity: 5,
          unit_price: 1000,
          dim_account: { is_revenue_account: true, is_cogs_account: false },
        },
      ]
      const mockCOGSData = [
        {
          line_amount: 3000,
          total_amount: 3000,
          supplier_category: 'equipment',
          dim_account: { is_cogs_account: true },
        },
      ]

      mockSupabase.eq
        .mockReturnValueOnce({ data: mockRevenueData, error: null })
        .mockReturnValueOnce({ data: mockCOGSData, error: null })

      const result = await engine.calculateMarginAnalysis(2024)

      expect(result).toHaveLength(4) // All revenue streams
      
      const toursMargin = result.find(r => r.revenue_stream === 'tours')
      expect(toursMargin).toMatchObject({
        revenue_stream: 'tours',
        gross_revenue: 8800,
        unit_count: 10,
        average_selling_price: 800,
      })
      expect(toursMargin?.cogs).toBeGreaterThan(0)
      expect(toursMargin?.gross_margin_percent).toBeGreaterThan(0)
    })
  })

  describe('getOverdueCustomers', () => {
    it('should return customers with overdue invoices', async () => {
      const mockOverdueData = [
        {
          contact_key: 'customer1',
          revenue_stream: 'tours',
          outstanding_amount: 2000,
          days_past_due: 60,
          dim_contact: { name: 'ABC Tours Pty Ltd' },
        },
        {
          contact_key: 'customer1',
          revenue_stream: 'tours',
          outstanding_amount: 1500,
          days_past_due: 50,
          dim_contact: { name: 'ABC Tours Pty Ltd' },
        },
      ]

      mockSupabase.gte.mockReturnValue({ data: mockOverdueData, error: null })

      const result = await engine.getOverdueCustomers()

      expect(result).toHaveLength(1)
      expect(result[0]).toMatchObject({
        contact_name: 'ABC Tours Pty Ltd',
        contact_key: 'customer1',
        total_outstanding: 3500,
        oldest_invoice_days: 60,
        invoice_count: 2,
        revenue_stream: 'tours',
      })
    })

    it('should return empty array when no overdue customers', async () => {
      mockSupabase.gte.mockReturnValue({ data: [], error: null })

      const result = await engine.getOverdueCustomers()

      expect(result).toEqual([])
    })
  })

  describe('getOverdueSuppliers', () => {
    it('should return suppliers with overdue bills', async () => {
      const mockOverdueData = [
        {
          contact_key: 'supplier1',
          supplier_category: 'equipment',
          outstanding_amount: 5000,
          days_past_due: 90,
          dim_contact: { name: 'Equipment Supplier Ltd' },
        },
      ]

      mockSupabase.gte.mockReturnValue({ data: mockOverdueData, error: null })

      const result = await engine.getOverdueSuppliers()

      expect(result).toHaveLength(1)
      expect(result[0]).toMatchObject({
        contact_name: 'Equipment Supplier Ltd',
        contact_key: 'supplier1',
        total_outstanding: 5000,
        oldest_bill_days: 90,
        bill_count: 1,
        supplier_category: 'equipment',
      })
    })
  })
})
