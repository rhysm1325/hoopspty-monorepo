// Dr Dish inventory analytics and calculations
// Handles inventory turnover, sell-through rates, and optimization recommendations

import { createServiceRoleClient } from '@/lib/supabase/server'
import { getCurrentFinancialYear } from '@/lib/utils/dates'
import {
  calculateInventoryTurnover,
  calculateDaysOfInventory,
  formatCurrency,
} from '@/utils/financial'

export interface DrDishInventoryMetrics {
  totalInventoryValue: number
  totalUnits: number
  inventoryTurnover: number
  daysOfInventory: number
  sellThroughRate: number
  reorderAlerts: Array<{
    itemKey: string
    itemCode: string
    itemName: string
    currentStock: number
    reorderLevel: number
    daysUntilStockout: number
    category: string
    recommendedOrderQuantity: number
  }>
  topSellingItems: Array<{
    itemKey: string
    itemCode: string
    itemName: string
    unitsSold: number
    revenue: number
    averageSellingPrice: number
    marginPercent: number
  }>
  slowMovingItems: Array<{
    itemKey: string
    itemCode: string
    itemName: string
    daysSinceLastSale: number
    currentStock: number
    inventoryValue: number
  }>
  categoryAnalysis: Array<{
    category: string
    totalValue: number
    totalUnits: number
    turnoverRate: number
    marginPercent: number
  }>
}

export interface UnitEconomics {
  itemKey: string
  itemCode: string
  itemName: string
  category: string
  unitsSold: number
  averageSellingPrice: number
  averageCost: number
  grossMarginPerUnit: number
  grossMarginPercent: number
  totalRevenue: number
  totalCOGS: number
  totalGrossMargin: number
  velocityRank: number
  profitabilityRank: number
}

export interface InventoryRecommendation {
  type: 'reorder' | 'reduce' | 'discontinue' | 'promote'
  priority: 'high' | 'medium' | 'low'
  itemKey: string
  itemCode: string
  itemName: string
  reason: string
  recommendation: string
  potentialImpact: string
  estimatedValue?: number
}

export class DrDishInventoryAnalytics {
  private supabase = createServiceRoleClient()

  /**
   * Calculate comprehensive Dr Dish inventory metrics
   */
  async calculateInventoryMetrics(
    asOfDate: Date = new Date()
  ): Promise<DrDishInventoryMetrics> {
    const asOfDateStr = asOfDate.toISOString().split('T')[0]
    
    // Get current inventory positions for Dr Dish products
    const { data: inventoryData, error: inventoryError } = await this.supabase
      .from('fact_inventory_movements')
      .select(`
        item_key,
        quantity_after,
        total_value,
        unit_cost,
        created_at,
        dim_item!inner (
          code,
          name,
          product_category,
          reorder_level,
          standard_cost,
          standard_price,
          is_dr_dish_product
        )
      `)
      .eq('dim_item.is_dr_dish_product', true)
      .order('created_at', { ascending: false })

    if (inventoryError) {
      throw new Error(`Failed to fetch inventory data: ${inventoryError.message}`)
    }

    // Get latest position for each item
    const latestInventory = new Map<string, {
      itemKey: string
      code: string
      name: string
      category: string
      currentStock: number
      inventoryValue: number
      unitCost: number
      reorderLevel: number
      standardPrice: number
      lastMovementDate: Date
    }>()

    inventoryData?.forEach(record => {
      const itemKey = record.item_key
      if (!latestInventory.has(itemKey)) {
        latestInventory.set(itemKey, {
          itemKey,
          code: record.dim_item.code,
          name: record.dim_item.name,
          category: record.dim_item.product_category || 'Other',
          currentStock: record.quantity_after,
          inventoryValue: record.total_value || (record.quantity_after * (record.dim_item.standard_cost || 0)),
          unitCost: record.unit_cost || record.dim_item.standard_cost || 0,
          reorderLevel: record.dim_item.reorder_level || 0,
          standardPrice: record.dim_item.standard_price || 0,
          lastMovementDate: new Date(record.created_at),
        })
      }
    })

    // Get sales data for last 12 months
    const trailing12MonthsStart = new Date(asOfDate)
    trailing12MonthsStart.setFullYear(trailing12MonthsStart.getFullYear() - 1)

    const { data: salesData, error: salesError } = await this.supabase
      .from('fact_ar_lines')
      .select(`
        item_key,
        quantity,
        unit_price,
        total_amount,
        date_key,
        dim_item!inner (
          code,
          name,
          product_category,
          is_dr_dish_product,
          standard_cost
        )
      `)
      .eq('dim_item.is_dr_dish_product', true)
      .gte('date_key', trailing12MonthsStart.toISOString().split('T')[0])
      .lte('date_key', asOfDateStr)
      .in('invoice_status', ['AUTHORISED', 'PAID'])

    if (salesError) {
      throw new Error(`Failed to fetch sales data: ${salesError.message}`)
    }

    // Calculate aggregated metrics
    const totalInventoryValue = Array.from(latestInventory.values())
      .reduce((sum, item) => sum + item.inventoryValue, 0)
    
    const totalUnits = Array.from(latestInventory.values())
      .reduce((sum, item) => sum + item.currentStock, 0)

    // Calculate COGS for turnover
    const totalCOGS = salesData?.reduce((sum, record) => {
      const unitCost = record.dim_item.standard_cost || 0
      return sum + (record.quantity * unitCost)
    }, 0) || 0

    const averageInventoryValue = totalInventoryValue // Simplified - should use average over period
    const inventoryTurnover = calculateInventoryTurnover(totalCOGS, averageInventoryValue)
    const daysOfInventory = calculateDaysOfInventory(averageInventoryValue, totalCOGS)

    // Calculate sell-through rate (units sold / (beginning inventory + purchases))
    const totalUnitsSold = salesData?.reduce((sum, record) => sum + record.quantity, 0) || 0
    const sellThroughRate = totalUnits > 0 ? (totalUnitsSold / (totalUnits + totalUnitsSold)) * 100 : 0

    // Generate reorder alerts
    const reorderAlerts = Array.from(latestInventory.values())
      .filter(item => item.currentStock <= item.reorderLevel && item.reorderLevel > 0)
      .map(item => {
        // Calculate daily usage rate
        const itemSales = salesData?.filter(s => s.item_key === item.itemKey) || []
        const totalSold = itemSales.reduce((sum, s) => sum + s.quantity, 0)
        const dailyUsage = totalSold / 365
        
        const daysUntilStockout = dailyUsage > 0 ? Math.floor(item.currentStock / dailyUsage) : 999
        
        // Recommend order quantity (30 days supply or reorder level * 2, whichever is higher)
        const recommendedOrderQuantity = Math.max(
          Math.ceil(dailyUsage * 30),
          item.reorderLevel * 2
        )

        return {
          itemKey: item.itemKey,
          itemCode: item.code,
          itemName: item.name,
          currentStock: item.currentStock,
          reorderLevel: item.reorderLevel,
          daysUntilStockout,
          category: item.category,
          recommendedOrderQuantity,
        }
      })
      .sort((a, b) => a.daysUntilStockout - b.daysUntilStockout)

    // Calculate top selling items
    const itemSalesMap = new Map<string, {
      itemKey: string
      code: string
      name: string
      unitsSold: number
      revenue: number
      totalCost: number
    }>()

    salesData?.forEach(record => {
      const itemKey = record.item_key
      if (!itemSalesMap.has(itemKey)) {
        itemSalesMap.set(itemKey, {
          itemKey,
          code: record.dim_item.code,
          name: record.dim_item.name,
          unitsSold: 0,
          revenue: 0,
          totalCost: 0,
        })
      }
      
      const itemData = itemSalesMap.get(itemKey)!
      itemData.unitsSold += record.quantity
      itemData.revenue += record.total_amount
      itemData.totalCost += record.quantity * (record.dim_item.standard_cost || 0)
    })

    const topSellingItems = Array.from(itemSalesMap.values())
      .sort((a, b) => b.unitsSold - a.unitsSold)
      .slice(0, 10)
      .map(item => ({
        itemKey: item.itemKey,
        itemCode: item.code,
        itemName: item.name,
        unitsSold: item.unitsSold,
        revenue: item.revenue,
        averageSellingPrice: item.unitsSold > 0 ? item.revenue / item.unitsSold : 0,
        marginPercent: item.revenue > 0 ? ((item.revenue - item.totalCost) / item.revenue) * 100 : 0,
      }))

    // Identify slow moving items (no sales in last 90 days)
    const slowMovingCutoff = new Date(asOfDate)
    slowMovingCutoff.setDate(slowMovingCutoff.getDate() - 90)

    const recentSalesItems = new Set(
      salesData?.filter(s => new Date(s.date_key) > slowMovingCutoff)
        .map(s => s.item_key) || []
    )

    const slowMovingItems = Array.from(latestInventory.values())
      .filter(item => !recentSalesItems.has(item.itemKey) && item.currentStock > 0)
      .map(item => ({
        itemKey: item.itemKey,
        itemCode: item.code,
        itemName: item.name,
        daysSinceLastSale: Math.floor(
          (asOfDate.getTime() - item.lastMovementDate.getTime()) / (24 * 60 * 60 * 1000)
        ),
        currentStock: item.currentStock,
        inventoryValue: item.inventoryValue,
      }))
      .sort((a, b) => b.daysSinceLastSale - a.daysSinceLastSale)

    // Category analysis
    const categoryMap = new Map<string, {
      totalValue: number
      totalUnits: number
      totalCOGS: number
      totalRevenue: number
    }>()

    Array.from(latestInventory.values()).forEach(item => {
      if (!categoryMap.has(item.category)) {
        categoryMap.set(item.category, {
          totalValue: 0,
          totalUnits: 0,
          totalCOGS: 0,
          totalRevenue: 0,
        })
      }
      
      const categoryData = categoryMap.get(item.category)!
      categoryData.totalValue += item.inventoryValue
      categoryData.totalUnits += item.currentStock
    })

    salesData?.forEach(record => {
      const category = record.dim_item.product_category || 'Other'
      if (categoryMap.has(category)) {
        const categoryData = categoryMap.get(category)!
        categoryData.totalCOGS += record.quantity * (record.dim_item.standard_cost || 0)
        categoryData.totalRevenue += record.total_amount
      }
    })

    const categoryAnalysis = Array.from(categoryMap.entries()).map(([category, data]) => ({
      category,
      totalValue: data.totalValue,
      totalUnits: data.totalUnits,
      turnoverRate: data.totalValue > 0 ? data.totalCOGS / data.totalValue : 0,
      marginPercent: data.totalRevenue > 0 ? ((data.totalRevenue - data.totalCOGS) / data.totalRevenue) * 100 : 0,
    }))

    return {
      totalInventoryValue,
      totalUnits,
      inventoryTurnover,
      daysOfInventory,
      sellThroughRate,
      reorderAlerts,
      topSellingItems,
      slowMovingItems,
      categoryAnalysis,
    }
  }

  /**
   * Calculate Dr Dish unit economics and profitability
   */
  async calculateUnitEconomics(
    itemKey?: string,
    fyYear?: number
  ): Promise<UnitEconomics[]> {
    const currentFY = fyYear || getCurrentFinancialYear().year
    const startDate = `${currentFY}-07-01`
    const endDate = `${currentFY + 1}-06-30`

    let salesQuery = this.supabase
      .from('fact_ar_lines')
      .select(`
        item_key,
        quantity,
        unit_price,
        total_amount,
        dim_item!inner (
          code,
          name,
          product_category,
          is_dr_dish_product,
          standard_cost
        )
      `)
      .eq('dim_item.is_dr_dish_product', true)
      .gte('date_key', startDate)
      .lte('date_key', endDate)
      .in('invoice_status', ['AUTHORISED', 'PAID'])

    if (itemKey) {
      salesQuery = salesQuery.eq('item_key', itemKey)
    }

    const { data: salesData, error } = await salesQuery

    if (error) {
      throw new Error(`Failed to fetch unit economics data: ${error.message}`)
    }

    // Aggregate by item
    const itemMap = new Map<string, {
      itemKey: string
      code: string
      name: string
      category: string
      unitsSold: number
      totalRevenue: number
      totalCOGS: number
      prices: number[]
      costs: number[]
    }>()

    salesData?.forEach(record => {
      const itemKey = record.item_key
      if (!itemMap.has(itemKey)) {
        itemMap.set(itemKey, {
          itemKey,
          code: record.dim_item.code,
          name: record.dim_item.name,
          category: record.dim_item.product_category || 'Other',
          unitsSold: 0,
          totalRevenue: 0,
          totalCOGS: 0,
          prices: [],
          costs: [],
        })
      }
      
      const itemData = itemMap.get(itemKey)!
      itemData.unitsSold += record.quantity
      itemData.totalRevenue += record.total_amount
      itemData.totalCOGS += record.quantity * (record.dim_item.standard_cost || 0)
      itemData.prices.push(record.unit_price)
      itemData.costs.push(record.dim_item.standard_cost || 0)
    })

    // Calculate unit economics
    const unitEconomics = Array.from(itemMap.values()).map(item => {
      const averageSellingPrice = item.prices.length > 0 
        ? item.prices.reduce((sum, price) => sum + price, 0) / item.prices.length 
        : 0
      
      const averageCost = item.costs.length > 0
        ? item.costs.reduce((sum, cost) => sum + cost, 0) / item.costs.length
        : 0

      const grossMarginPerUnit = averageSellingPrice - averageCost
      const grossMarginPercent = averageSellingPrice > 0 
        ? (grossMarginPerUnit / averageSellingPrice) * 100 
        : 0
      
      const totalGrossMargin = item.totalRevenue - item.totalCOGS

      return {
        itemKey: item.itemKey,
        itemCode: item.code,
        itemName: item.name,
        category: item.category,
        unitsSold: item.unitsSold,
        averageSellingPrice,
        averageCost,
        grossMarginPerUnit,
        grossMarginPercent,
        totalRevenue: item.totalRevenue,
        totalCOGS: item.totalCOGS,
        totalGrossMargin,
        velocityRank: 0, // Will be calculated below
        profitabilityRank: 0, // Will be calculated below
      }
    })

    // Calculate rankings
    const sortedByVelocity = [...unitEconomics].sort((a, b) => b.unitsSold - a.unitsSold)
    const sortedByProfitability = [...unitEconomics].sort((a, b) => b.totalGrossMargin - a.totalGrossMargin)

    unitEconomics.forEach(item => {
      item.velocityRank = sortedByVelocity.findIndex(i => i.itemKey === item.itemKey) + 1
      item.profitabilityRank = sortedByProfitability.findIndex(i => i.itemKey === item.itemKey) + 1
    })

    return unitEconomics.sort((a, b) => b.totalRevenue - a.totalRevenue)
  }

  /**
   * Generate inventory optimization recommendations
   */
  async generateInventoryRecommendations(): Promise<InventoryRecommendation[]> {
    const metrics = await this.calculateInventoryMetrics()
    const unitEconomics = await this.calculateUnitEconomics()
    
    const recommendations: InventoryRecommendation[] = []

    // Reorder recommendations
    metrics.reorderAlerts.forEach(alert => {
      recommendations.push({
        type: 'reorder',
        priority: alert.daysUntilStockout < 7 ? 'high' : alert.daysUntilStockout < 30 ? 'medium' : 'low',
        itemKey: alert.itemKey,
        itemCode: alert.itemCode,
        itemName: alert.itemName,
        reason: `Stock level (${alert.currentStock}) below reorder point (${alert.reorderLevel}). Estimated ${alert.daysUntilStockout} days until stockout.`,
        recommendation: `Reorder ${alert.recommendedOrderQuantity} units immediately.`,
        potentialImpact: `Prevent stockout and maintain sales continuity.`,
      })
    })

    // Slow moving inventory recommendations
    metrics.slowMovingItems.slice(0, 10).forEach(item => {
      if (item.daysSinceLastSale > 180) {
        recommendations.push({
          type: 'discontinue',
          priority: 'medium',
          itemKey: item.itemKey,
          itemCode: item.itemCode,
          itemName: item.itemName,
          reason: `No sales in ${item.daysSinceLastSale} days. Tying up ${formatCurrency(item.inventoryValue)} in capital.`,
          recommendation: `Consider discontinuing or liquidating remaining ${item.currentStock} units.`,
          potentialImpact: `Free up ${formatCurrency(item.inventoryValue)} in working capital.`,
          estimatedValue: item.inventoryValue,
        })
      } else if (item.daysSinceLastSale > 90) {
        recommendations.push({
          type: 'reduce',
          priority: 'low',
          itemKey: item.itemKey,
          itemCode: item.itemCode,
          itemName: item.itemName,
          reason: `Slow sales - ${item.daysSinceLastSale} days since last sale.`,
          recommendation: `Reduce inventory levels and consider promotional pricing.`,
          potentialImpact: `Improve inventory turnover and cash flow.`,
        })
      }
    })

    // High performing item promotion recommendations
    metrics.topSellingItems.slice(0, 5).forEach(item => {
      if (item.marginPercent > 30) {
        recommendations.push({
          type: 'promote',
          priority: 'medium',
          itemKey: item.itemKey,
          itemCode: item.itemCode,
          itemName: item.itemName,
          reason: `High margin (${item.marginPercent.toFixed(1)}%) and strong sales (${item.unitsSold} units).`,
          recommendation: `Increase marketing focus and ensure adequate inventory levels.`,
          potentialImpact: `Maximize revenue from high-margin, fast-moving products.`,
        })
      }
    })

    return recommendations.sort((a, b) => {
      const priorityOrder = { high: 3, medium: 2, low: 1 }
      return priorityOrder[b.priority] - priorityOrder[a.priority]
    })
  }

  /**
   * Calculate inventory ABC analysis (Pareto analysis)
   */
  async calculateABCAnalysis(): Promise<Array<{
    itemKey: string
    itemCode: string
    itemName: string
    category: string
    annualRevenue: number
    percentOfTotalRevenue: number
    cumulativePercent: number
    classification: 'A' | 'B' | 'C'
    recommendedManagement: string
  }>> {
    const unitEconomics = await this.calculateUnitEconomics()
    
    // Sort by revenue descending
    const sortedItems = unitEconomics.sort((a, b) => b.totalRevenue - a.totalRevenue)
    
    const totalRevenue = sortedItems.reduce((sum, item) => sum + item.totalRevenue, 0)
    
    let cumulativeRevenue = 0
    
    return sortedItems.map(item => {
      cumulativeRevenue += item.totalRevenue
      const percentOfTotal = totalRevenue > 0 ? (item.totalRevenue / totalRevenue) * 100 : 0
      const cumulativePercent = totalRevenue > 0 ? (cumulativeRevenue / totalRevenue) * 100 : 0
      
      // ABC Classification: A = top 80%, B = next 15%, C = remaining 5%
      let classification: 'A' | 'B' | 'C'
      let recommendedManagement: string
      
      if (cumulativePercent <= 80) {
        classification = 'A'
        recommendedManagement = 'Tight control, frequent monitoring, accurate forecasting'
      } else if (cumulativePercent <= 95) {
        classification = 'B'
        recommendedManagement = 'Moderate control, periodic review, good forecasting'
      } else {
        classification = 'C'
        recommendedManagement = 'Simple control, annual review, basic forecasting'
      }
      
      return {
        itemKey: item.itemKey,
        itemCode: item.itemCode,
        itemName: item.itemName,
        category: item.category,
        annualRevenue: item.totalRevenue,
        percentOfTotalRevenue: percentOfTotal,
        cumulativePercent,
        classification,
        recommendedManagement,
      }
    })
  }
}

// Export singleton instance
export const drDishInventoryAnalytics = new DrDishInventoryAnalytics()
