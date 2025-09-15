// Unit tests for Dr Dish inventory analytics

import { DrDishInventoryAnalytics } from './inventory'
import { createServiceRoleClient } from '@/lib/supabase/server'

// Mock Supabase client
jest.mock('@/lib/supabase/server', () => ({
  createServiceRoleClient: jest.fn(),
}))

// Mock date utilities
jest.mock('@/lib/utils/dates', () => ({
  getCurrentFinancialYear: jest.fn(() => ({ year: 2024 })),
}))

const mockSupabase = {
  from: jest.fn().mockReturnThis(),
  select: jest.fn().mockReturnThis(),
  eq: jest.fn().mockReturnThis(),
  gte: jest.fn().mockReturnThis(),
  lte: jest.fn().mockReturnThis(),
  in: jest.fn().mockReturnThis(),
  order: jest.fn().mockReturnThis(),
}

beforeEach(() => {
  jest.clearAllMocks()
  ;(createServiceRoleClient as jest.Mock).mockReturnValue(mockSupabase)
})

describe('DrDishInventoryAnalytics', () => {
  let analytics: DrDishInventoryAnalytics

  beforeEach(() => {
    analytics = new DrDishInventoryAnalytics()
  })

  describe('calculateInventoryMetrics', () => {
    it('should calculate comprehensive inventory metrics', async () => {
      const mockInventoryData = [
        {
          item_key: 'item1',
          quantity_after: 50,
          total_value: 5000,
          unit_cost: 100,
          created_at: '2024-08-01T00:00:00Z',
          dim_item: {
            code: 'DD-PRO-001',
            name: 'Dr Dish Pro',
            product_category: 'Machines',
            reorder_level: 10,
            standard_cost: 100,
            standard_price: 150,
            is_dr_dish_product: true,
          },
        },
        {
          item_key: 'item2',
          quantity_after: 5,
          total_value: 1000,
          unit_cost: 200,
          created_at: '2024-08-01T00:00:00Z',
          dim_item: {
            code: 'DD-HOME-001',
            name: 'Dr Dish Home',
            product_category: 'Machines',
            reorder_level: 15,
            standard_cost: 200,
            standard_price: 300,
            is_dr_dish_product: true,
          },
        },
      ]

      const mockSalesData = [
        {
          item_key: 'item1',
          quantity: 20,
          unit_price: 150,
          total_amount: 3000,
          date_key: '2024-07-15',
          dim_item: {
            code: 'DD-PRO-001',
            name: 'Dr Dish Pro',
            product_category: 'Machines',
            is_dr_dish_product: true,
            standard_cost: 100,
          },
        },
        {
          item_key: 'item2',
          quantity: 2,
          unit_price: 300,
          total_amount: 600,
          date_key: '2024-06-01', // Older sale - should be in slow moving
          dim_item: {
            code: 'DD-HOME-001',
            name: 'Dr Dish Home',
            product_category: 'Machines',
            is_dr_dish_product: true,
            standard_cost: 200,
          },
        },
      ]

      mockSupabase.order
        .mockReturnValueOnce({ data: mockInventoryData, error: null }) // Inventory query
        .mockReturnValueOnce({ data: mockSalesData, error: null }) // Sales query

      const result = await analytics.calculateInventoryMetrics()

      expect(result.totalInventoryValue).toBe(6000) // 5000 + 1000
      expect(result.totalUnits).toBe(55) // 50 + 5
      expect(result.inventoryTurnover).toBeGreaterThan(0)
      expect(result.daysOfInventory).toBeGreaterThan(0)
      expect(result.sellThroughRate).toBeGreaterThan(0)

      // Should have one reorder alert (item2 is below reorder level)
      expect(result.reorderAlerts).toHaveLength(1)
      expect(result.reorderAlerts[0]).toMatchObject({
        itemCode: 'DD-HOME-001',
        currentStock: 5,
        reorderLevel: 15,
      })

      // Should have top selling items
      expect(result.topSellingItems.length).toBeGreaterThan(0)
      expect(result.topSellingItems[0].itemCode).toBe('DD-PRO-001')

      // Should have category analysis
      expect(result.categoryAnalysis.length).toBeGreaterThan(0)
      expect(result.categoryAnalysis[0].category).toBe('Machines')
    })

    it('should handle empty inventory data', async () => {
      mockSupabase.order
        .mockReturnValueOnce({ data: [], error: null })
        .mockReturnValueOnce({ data: [], error: null })

      const result = await analytics.calculateInventoryMetrics()

      expect(result.totalInventoryValue).toBe(0)
      expect(result.totalUnits).toBe(0)
      expect(result.reorderAlerts).toHaveLength(0)
      expect(result.topSellingItems).toHaveLength(0)
      expect(result.slowMovingItems).toHaveLength(0)
      expect(result.categoryAnalysis).toHaveLength(0)
    })

    it('should identify slow moving items correctly', async () => {
      const oldDate = new Date()
      oldDate.setDate(oldDate.getDate() - 120) // 120 days ago

      const mockInventoryData = [
        {
          item_key: 'slow-item',
          quantity_after: 10,
          total_value: 1000,
          created_at: oldDate.toISOString(),
          dim_item: {
            code: 'DD-SLOW-001',
            name: 'Slow Moving Item',
            product_category: 'Accessories',
            reorder_level: 5,
            standard_cost: 100,
            is_dr_dish_product: true,
          },
        },
      ]

      // No recent sales for this item
      const mockSalesData: any[] = []

      mockSupabase.order
        .mockReturnValueOnce({ data: mockInventoryData, error: null })
        .mockReturnValueOnce({ data: mockSalesData, error: null })

      const result = await analytics.calculateInventoryMetrics()

      expect(result.slowMovingItems).toHaveLength(1)
      expect(result.slowMovingItems[0]).toMatchObject({
        itemCode: 'DD-SLOW-001',
        currentStock: 10,
        daysSinceLastSale: 120,
      })
    })

    it('should throw error when inventory query fails', async () => {
      mockSupabase.order.mockReturnValue({
        data: null,
        error: { message: 'Database error' },
      })

      await expect(analytics.calculateInventoryMetrics()).rejects.toThrow(
        'Failed to fetch inventory data: Database error'
      )
    })
  })

  describe('calculateUnitEconomics', () => {
    it('should calculate unit economics correctly', async () => {
      const mockSalesData = [
        {
          item_key: 'item1',
          quantity: 10,
          unit_price: 150,
          total_amount: 1500,
          dim_item: {
            code: 'DD-PRO-001',
            name: 'Dr Dish Pro',
            product_category: 'Machines',
            is_dr_dish_product: true,
            standard_cost: 100,
          },
        },
        {
          item_key: 'item1',
          quantity: 5,
          unit_price: 160,
          total_amount: 800,
          dim_item: {
            code: 'DD-PRO-001',
            name: 'Dr Dish Pro',
            product_category: 'Machines',
            is_dr_dish_product: true,
            standard_cost: 100,
          },
        },
        {
          item_key: 'item2',
          quantity: 3,
          unit_price: 300,
          total_amount: 900,
          dim_item: {
            code: 'DD-HOME-001',
            name: 'Dr Dish Home',
            product_category: 'Machines',
            is_dr_dish_product: true,
            standard_cost: 200,
          },
        },
      ]

      mockSupabase.in.mockReturnValue({ data: mockSalesData, error: null })

      const result = await analytics.calculateUnitEconomics()

      expect(result).toHaveLength(2)

      const item1Economics = result.find(r => r.itemCode === 'DD-PRO-001')
      expect(item1Economics).toMatchObject({
        itemCode: 'DD-PRO-001',
        unitsSold: 15, // 10 + 5
        totalRevenue: 2300, // 1500 + 800
        totalCOGS: 1500, // 15 * 100
        averageSellingPrice: 155, // (150 + 160) / 2
        averageCost: 100,
        grossMarginPerUnit: 55, // 155 - 100
      })
      expect(item1Economics?.grossMarginPercent).toBeCloseTo(35.48, 1) // (55/155) * 100

      // Check rankings
      expect(item1Economics?.velocityRank).toBe(1) // Highest units sold
      expect(item1Economics?.profitabilityRank).toBe(1) // Highest total margin
    })

    it('should filter by item key when provided', async () => {
      mockSupabase.in.mockReturnValue({ data: [], error: null })

      await analytics.calculateUnitEconomics('specific-item')

      expect(mockSupabase.eq).toHaveBeenCalledWith('item_key', 'specific-item')
    })

    it('should handle custom financial year', async () => {
      mockSupabase.in.mockReturnValue({ data: [], error: null })

      await analytics.calculateUnitEconomics(undefined, 2023)

      expect(mockSupabase.gte).toHaveBeenCalledWith('date_key', '2023-07-01')
      expect(mockSupabase.lte).toHaveBeenCalledWith('date_key', '2024-06-30')
    })
  })

  describe('generateInventoryRecommendations', () => {
    it('should generate comprehensive inventory recommendations', async () => {
      // Mock inventory metrics
      const mockMetrics = {
        totalInventoryValue: 50000,
        totalUnits: 100,
        inventoryTurnover: 4,
        daysOfInventory: 91,
        sellThroughRate: 80,
        reorderAlerts: [
          {
            itemKey: 'reorder-item',
            itemCode: 'DD-REORDER-001',
            itemName: 'Need Reorder Item',
            currentStock: 5,
            reorderLevel: 10,
            daysUntilStockout: 3,
            category: 'Machines',
            recommendedOrderQuantity: 20,
          },
        ],
        topSellingItems: [
          {
            itemKey: 'top-item',
            itemCode: 'DD-TOP-001',
            itemName: 'Top Selling Item',
            unitsSold: 100,
            revenue: 15000,
            averageSellingPrice: 150,
            marginPercent: 40,
          },
        ],
        slowMovingItems: [
          {
            itemKey: 'slow-item',
            itemCode: 'DD-SLOW-001',
            itemName: 'Slow Moving Item',
            daysSinceLastSale: 200,
            currentStock: 10,
            inventoryValue: 2000,
          },
        ],
        categoryAnalysis: [],
      }

      const mockUnitEconomics = [
        {
          itemKey: 'top-item',
          itemCode: 'DD-TOP-001',
          itemName: 'Top Selling Item',
          category: 'Machines',
          unitsSold: 100,
          averageSellingPrice: 150,
          averageCost: 90,
          grossMarginPerUnit: 60,
          grossMarginPercent: 40,
          totalRevenue: 15000,
          totalCOGS: 9000,
          totalGrossMargin: 6000,
          velocityRank: 1,
          profitabilityRank: 1,
        },
      ]

      jest.spyOn(analytics, 'calculateInventoryMetrics').mockResolvedValue(mockMetrics)
      jest.spyOn(analytics, 'calculateUnitEconomics').mockResolvedValue(mockUnitEconomics)

      const recommendations = await analytics.generateInventoryRecommendations()

      expect(recommendations.length).toBeGreaterThan(0)

      // Should have reorder recommendation
      const reorderRec = recommendations.find(r => r.type === 'reorder')
      expect(reorderRec).toMatchObject({
        type: 'reorder',
        priority: 'high', // 3 days until stockout
        itemCode: 'DD-REORDER-001',
      })

      // Should have discontinue recommendation
      const discontinueRec = recommendations.find(r => r.type === 'discontinue')
      expect(discontinueRec).toMatchObject({
        type: 'discontinue',
        priority: 'medium',
        itemCode: 'DD-SLOW-001',
        estimatedValue: 2000,
      })

      // Should have promotion recommendation
      const promoteRec = recommendations.find(r => r.type === 'promote')
      expect(promoteRec).toMatchObject({
        type: 'promote',
        priority: 'medium',
        itemCode: 'DD-TOP-001',
      })

      // Should be sorted by priority
      expect(recommendations[0].priority).toBe('high')
    })
  })

  describe('calculateABCAnalysis', () => {
    it('should perform ABC analysis correctly', async () => {
      const mockUnitEconomics = [
        {
          itemKey: 'item1',
          itemCode: 'DD-HIGH-001',
          itemName: 'High Revenue Item',
          category: 'Machines',
          totalRevenue: 50000, // 50% of total
          unitsSold: 100,
          averageSellingPrice: 500,
          averageCost: 300,
          grossMarginPerUnit: 200,
          grossMarginPercent: 40,
          totalCOGS: 30000,
          totalGrossMargin: 20000,
          velocityRank: 1,
          profitabilityRank: 1,
        },
        {
          itemKey: 'item2',
          itemCode: 'DD-MED-001',
          itemName: 'Medium Revenue Item',
          category: 'Accessories',
          totalRevenue: 30000, // 30% of total
          unitsSold: 60,
          averageSellingPrice: 500,
          averageCost: 350,
          grossMarginPerUnit: 150,
          grossMarginPercent: 30,
          totalCOGS: 21000,
          totalGrossMargin: 9000,
          velocityRank: 2,
          profitabilityRank: 2,
        },
        {
          itemKey: 'item3',
          itemCode: 'DD-LOW-001',
          itemName: 'Low Revenue Item',
          category: 'Parts',
          totalRevenue: 20000, // 20% of total
          unitsSold: 40,
          averageSellingPrice: 500,
          averageCost: 400,
          grossMarginPerUnit: 100,
          grossMarginPercent: 20,
          totalCOGS: 16000,
          totalGrossMargin: 4000,
          velocityRank: 3,
          profitabilityRank: 3,
        },
      ]

      jest.spyOn(analytics, 'calculateUnitEconomics').mockResolvedValue(mockUnitEconomics)

      const abcAnalysis = await analytics.calculateABCAnalysis()

      expect(abcAnalysis).toHaveLength(3)

      // Should be sorted by revenue descending
      expect(abcAnalysis[0].itemCode).toBe('DD-HIGH-001')
      expect(abcAnalysis[1].itemCode).toBe('DD-MED-001')
      expect(abcAnalysis[2].itemCode).toBe('DD-LOW-001')

      // Check percentages
      expect(abcAnalysis[0].percentOfTotalRevenue).toBe(50)
      expect(abcAnalysis[0].cumulativePercent).toBe(50)
      expect(abcAnalysis[1].cumulativePercent).toBe(80)
      expect(abcAnalysis[2].cumulativePercent).toBe(100)

      // Check classifications
      expect(abcAnalysis[0].classification).toBe('A') // 50% cumulative
      expect(abcAnalysis[1].classification).toBe('A') // 80% cumulative
      expect(abcAnalysis[2].classification).toBe('B') // 100% cumulative

      // Check management recommendations
      expect(abcAnalysis[0].recommendedManagement).toContain('Tight control')
      expect(abcAnalysis[2].recommendedManagement).toContain('Moderate control')
    })

    it('should handle empty unit economics data', async () => {
      jest.spyOn(analytics, 'calculateUnitEconomics').mockResolvedValue([])

      const abcAnalysis = await analytics.calculateABCAnalysis()

      expect(abcAnalysis).toEqual([])
    })
  })
})
