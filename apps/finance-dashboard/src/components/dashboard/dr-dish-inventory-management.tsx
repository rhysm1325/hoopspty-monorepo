'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { DataTable } from '@/components/ui/data-table'
import { Input } from '@/components/ui/input'
import { 
  Package, 
  TrendingUp, 
  TrendingDown, 
  AlertTriangle,
  CheckCircle,
  Clock,
  Truck,
  BarChart3,
  RefreshCw,
  Download,
  Filter,
  Eye,
  Activity,
  Calculator,
  ShoppingCart,
  Target,
  Zap
} from 'lucide-react'
import { formatCurrency } from '@/utils/financial'

interface InventoryItem {
  itemCode: string
  itemName: string
  model: string
  category: string
  currentStock: number
  reorderLevel: number
  maxStockLevel: number
  averageCost: number
  currentValue: number
  lastCostUpdate: Date
  
  // Turnover metrics
  inventoryTurnover: number
  daysOfInventory: number
  sellThroughRate: number
  velocityScore: number
  
  // Sales performance
  unitsSoldLast12Months: number
  unitsSoldLast3Months: number
  averageMonthlySales: number
  lastSaleDate?: Date
  daysSinceLastSale: number
  
  // Forecasting
  forecastedDemand30d: number
  forecastedDemand90d: number
  stockoutRisk: 'low' | 'medium' | 'high'
  daysUntilStockout?: number
  
  // Supplier information
  supplierName: string
  leadTimeDays: number
  minimumOrderQuantity: number
  lastOrderDate?: Date
  nextDeliveryDate?: Date
  
  // Financial metrics
  carryingCostPercent: number
  carryingCostAmount: number
  deadStockRisk: 'low' | 'medium' | 'high'
  
  // Recommendations
  recommendedAction: 'reorder' | 'reduce' | 'maintain' | 'liquidate'
  recommendedQuantity?: number
  reasoning: string
}

interface InventoryTurnoverAnalysis {
  overallTurnover: number
  targetTurnover: number
  turnoverTrend: 'improving' | 'declining' | 'stable'
  turnoverByCategory: Array<{
    category: string
    turnover: number
    daysOfInventory: number
    status: 'excellent' | 'good' | 'fair' | 'poor'
  }>
  fastMovingItems: InventoryItem[]
  slowMovingItems: InventoryItem[]
  deadStockItems: InventoryItem[]
  stockoutRisks: InventoryItem[]
}

interface DrDishInventoryManagementProps {
  className?: string
  showRecommendations?: boolean
  refreshInterval?: number
}

export function DrDishInventoryManagement({ 
  className,
  showRecommendations = true,
  refreshInterval = 300000 // 5 minutes
}: DrDishInventoryManagementProps) {
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([])
  const [turnoverAnalysis, setTurnoverAnalysis] = useState<InventoryTurnoverAnalysis | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date())
  const [filters, setFilters] = useState({
    category: 'all',
    stockLevel: 'all',
    turnoverStatus: 'all',
    riskLevel: 'all',
  })
  const [searchTerm, setSearchTerm] = useState('')
  const [filteredItems, setFilteredItems] = useState<InventoryItem[]>([])

  useEffect(() => {
    loadInventoryData()
    
    // Set up refresh interval
    const interval = setInterval(loadInventoryData, refreshInterval)
    return () => clearInterval(interval)
  }, [refreshInterval])

  useEffect(() => {
    applyFilters()
  }, [inventoryItems, filters, searchTerm])

  const loadInventoryData = async () => {
    setIsLoading(true)
    
    try {
      // Simulate API call - replace with actual server actions
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      // Sample inventory data
      setInventoryItems([
        {
          itemCode: 'DRDISH-HOME',
          itemName: 'Dr Dish Home Basketball Machine',
          model: 'Home',
          category: 'Home/Consumer',
          currentStock: 5,
          reorderLevel: 3,
          maxStockLevel: 15,
          averageCost: 8625,
          currentValue: 43125,
          lastCostUpdate: new Date('2024-10-15'),
          inventoryTurnover: 4.1,
          daysOfInventory: 89,
          sellThroughRate: 85.2,
          velocityScore: 92,
          unitsSoldLast12Months: 18,
          unitsSoldLast3Months: 4,
          averageMonthlySales: 1.5,
          lastSaleDate: new Date('2024-11-20'),
          daysSinceLastSale: 15,
          forecastedDemand30d: 2,
          forecastedDemand90d: 5,
          stockoutRisk: 'low',
          daysUntilStockout: 100,
          supplierName: 'Dr Dish USA',
          leadTimeDays: 45,
          minimumOrderQuantity: 5,
          lastOrderDate: new Date('2024-09-15'),
          nextDeliveryDate: new Date('2024-12-30'),
          carryingCostPercent: 18.5,
          carryingCostAmount: 7978,
          deadStockRisk: 'low',
          recommendedAction: 'maintain',
          reasoning: 'Healthy turnover and demand forecast. Current stock levels appropriate.',
        },
        {
          itemCode: 'DRDISH-PRO',
          itemName: 'Dr Dish Pro Basketball Machine',
          model: 'Pro',
          category: 'Professional',
          currentStock: 2,
          reorderLevel: 3,
          maxStockLevel: 8,
          averageCost: 13700,
          currentValue: 27400,
          lastCostUpdate: new Date('2024-11-01'),
          inventoryTurnover: 2.1,
          daysOfInventory: 174,
          sellThroughRate: 65.3,
          velocityScore: 68,
          unitsSoldLast12Months: 8,
          unitsSoldLast3Months: 1,
          averageMonthlySales: 0.7,
          lastSaleDate: new Date('2024-10-15'),
          daysSinceLastSale: 45,
          forecastedDemand30d: 1,
          forecastedDemand90d: 2,
          stockoutRisk: 'medium',
          daysUntilStockout: 60,
          supplierName: 'Dr Dish USA',
          leadTimeDays: 45,
          minimumOrderQuantity: 3,
          lastOrderDate: new Date('2024-08-20'),
          nextDeliveryDate: new Date('2025-01-15'),
          carryingCostPercent: 18.5,
          carryingCostAmount: 5069,
          deadStockRisk: 'medium',
          recommendedAction: 'reorder',
          recommendedQuantity: 3,
          reasoning: 'Below reorder level with medium stockout risk. Order now to avoid stockout.',
        },
        {
          itemCode: 'DRDISH-REBEL',
          itemName: 'Dr Dish Rebel Basketball Machine',
          model: 'Rebel',
          category: 'Intermediate',
          currentStock: 1,
          reorderLevel: 2,
          maxStockLevel: 6,
          averageCost: 9800,
          currentValue: 9800,
          lastCostUpdate: new Date('2024-10-01'),
          inventoryTurnover: 1.8,
          daysOfInventory: 203,
          sellThroughRate: 55.8,
          velocityScore: 58,
          unitsSoldLast12Months: 6,
          unitsSoldLast3Months: 1,
          averageMonthlySales: 0.5,
          lastSaleDate: new Date('2024-09-20'),
          daysSinceLastSale: 65,
          forecastedDemand30d: 0,
          forecastedDemand90d: 1,
          stockoutRisk: 'high',
          daysUntilStockout: 30,
          supplierName: 'Dr Dish USA',
          leadTimeDays: 45,
          minimumOrderQuantity: 3,
          lastOrderDate: new Date('2024-07-10'),
          carryingCostPercent: 18.5,
          carryingCostAmount: 1813,
          deadStockRisk: 'medium',
          recommendedAction: 'reorder',
          recommendedQuantity: 3,
          reasoning: 'Critical stock level with high stockout risk. Immediate reorder required.',
        },
        {
          itemCode: 'DRDISH-ELITE',
          itemName: 'Dr Dish Elite Basketball Machine',
          model: 'Elite',
          category: 'Professional',
          currentStock: 1,
          reorderLevel: 1,
          maxStockLevel: 3,
          averageCost: 19250,
          currentValue: 19250,
          lastCostUpdate: new Date('2024-08-15'),
          inventoryTurnover: 0.2,
          daysOfInventory: 1825,
          sellThroughRate: 12.5,
          velocityScore: 15,
          unitsSoldLast12Months: 1,
          unitsSoldLast3Months: 0,
          averageMonthlySales: 0.08,
          lastSaleDate: new Date('2023-12-15'),
          daysSinceLastSale: 365,
          forecastedDemand30d: 0,
          forecastedDemand90d: 0,
          stockoutRisk: 'low',
          supplierName: 'Dr Dish USA',
          leadTimeDays: 45,
          minimumOrderQuantity: 1,
          lastOrderDate: new Date('2023-11-20'),
          carryingCostPercent: 18.5,
          carryingCostAmount: 3561,
          deadStockRisk: 'high',
          recommendedAction: 'liquidate',
          reasoning: 'No sales in 12 months. High carrying costs. Consider promotional pricing or liquidation.',
        },
        {
          itemCode: 'ACCESSORIES-NET',
          itemName: 'Dr Dish Replacement Net',
          model: 'Accessories',
          category: 'Accessories',
          currentStock: 15,
          reorderLevel: 10,
          maxStockLevel: 50,
          averageCost: 100,
          currentValue: 1500,
          lastCostUpdate: new Date('2024-11-10'),
          inventoryTurnover: 6.2,
          daysOfInventory: 59,
          sellThroughRate: 92.3,
          velocityScore: 95,
          unitsSoldLast12Months: 85,
          unitsSoldLast3Months: 22,
          averageMonthlySales: 7.1,
          lastSaleDate: new Date('2024-11-25'),
          daysSinceLastSale: 8,
          forecastedDemand30d: 8,
          forecastedDemand90d: 22,
          stockoutRisk: 'medium',
          daysUntilStockout: 63,
          supplierName: 'Sports Equipment Co',
          leadTimeDays: 14,
          minimumOrderQuantity: 25,
          lastOrderDate: new Date('2024-10-20'),
          nextDeliveryDate: new Date('2024-12-15'),
          carryingCostPercent: 15.0,
          carryingCostAmount: 225,
          deadStockRisk: 'low',
          recommendedAction: 'maintain',
          reasoning: 'Excellent turnover and velocity. Stock levels adequate for current demand.',
        },
      ])

      // Sample turnover analysis
      setTurnoverAnalysis({
        overallTurnover: 3.2,
        targetTurnover: 4.0,
        turnoverTrend: 'improving',
        turnoverByCategory: [
          {
            category: 'Accessories',
            turnover: 6.2,
            daysOfInventory: 59,
            status: 'excellent',
          },
          {
            category: 'Home/Consumer',
            turnover: 4.1,
            daysOfInventory: 89,
            status: 'good',
          },
          {
            category: 'Professional',
            turnover: 1.4,
            daysOfInventory: 261,
            status: 'poor',
          },
        ],
        fastMovingItems: inventoryItems.filter(item => item.velocityScore > 80),
        slowMovingItems: inventoryItems.filter(item => item.velocityScore < 50),
        deadStockItems: inventoryItems.filter(item => item.deadStockRisk === 'high'),
        stockoutRisks: inventoryItems.filter(item => item.stockoutRisk === 'high'),
      })

      setLastRefresh(new Date())
    } catch (error) {
      console.error('Failed to load inventory management data:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const applyFilters = () => {
    let filtered = [...inventoryItems]

    // Apply search filter
    if (searchTerm.trim()) {
      const search = searchTerm.toLowerCase()
      filtered = filtered.filter(item =>
        item.itemName.toLowerCase().includes(search) ||
        item.itemCode.toLowerCase().includes(search) ||
        item.model.toLowerCase().includes(search) ||
        item.category.toLowerCase().includes(search)
      )
    }

    // Apply category filter
    if (filters.category !== 'all') {
      filtered = filtered.filter(item => item.category === filters.category)
    }

    // Apply stock level filter
    if (filters.stockLevel !== 'all') {
      switch (filters.stockLevel) {
        case 'low':
          filtered = filtered.filter(item => item.currentStock <= item.reorderLevel)
          break
        case 'adequate':
          filtered = filtered.filter(item => 
            item.currentStock > item.reorderLevel && 
            item.currentStock < item.maxStockLevel * 0.8
          )
          break
        case 'high':
          filtered = filtered.filter(item => item.currentStock >= item.maxStockLevel * 0.8)
          break
      }
    }

    // Apply turnover status filter
    if (filters.turnoverStatus !== 'all') {
      switch (filters.turnoverStatus) {
        case 'fast':
          filtered = filtered.filter(item => item.inventoryTurnover >= 4)
          break
        case 'medium':
          filtered = filtered.filter(item => item.inventoryTurnover >= 2 && item.inventoryTurnover < 4)
          break
        case 'slow':
          filtered = filtered.filter(item => item.inventoryTurnover < 2)
          break
      }
    }

    // Apply risk level filter
    if (filters.riskLevel !== 'all') {
      filtered = filtered.filter(item => 
        item.stockoutRisk === filters.riskLevel || 
        item.deadStockRisk === filters.riskLevel
      )
    }

    setFilteredItems(filtered)
  }

  const handleRefresh = () => {
    loadInventoryData()
  }

  const getStockLevelStatus = (item: InventoryItem) => {
    if (item.currentStock <= item.reorderLevel * 0.5) {
      return { color: 'text-red-600', status: 'Critical', badge: 'destructive' as const }
    }
    if (item.currentStock <= item.reorderLevel) {
      return { color: 'text-yellow-600', status: 'Low', badge: 'warning' as const }
    }
    if (item.currentStock >= item.maxStockLevel * 0.8) {
      return { color: 'text-blue-600', status: 'High', badge: 'secondary' as const }
    }
    return { color: 'text-green-600', status: 'Adequate', badge: 'default' as const }
  }

  const getTurnoverStatus = (turnover: number) => {
    if (turnover >= 4) return { color: 'text-green-600', status: 'Excellent', badge: 'default' as const }
    if (turnover >= 2.5) return { color: 'text-blue-600', status: 'Good', badge: 'default' as const }
    if (turnover >= 1.5) return { color: 'text-yellow-600', status: 'Fair', badge: 'warning' as const }
    return { color: 'text-red-600', status: 'Poor', badge: 'destructive' as const }
  }

  const getRecommendationBadge = (action: InventoryItem['recommendedAction']) => {
    switch (action) {
      case 'reorder':
        return <Badge variant="default" className="bg-blue-100 text-blue-800">Reorder</Badge>
      case 'reduce':
        return <Badge variant="default" className="bg-yellow-100 text-yellow-800">Reduce</Badge>
      case 'maintain':
        return <Badge variant="default" className="bg-green-100 text-green-800">Maintain</Badge>
      case 'liquidate':
        return <Badge variant="destructive">Liquidate</Badge>
      default:
        return <Badge variant="outline">Review</Badge>
    }
  }

  const getRiskBadge = (risk: 'low' | 'medium' | 'high') => {
    switch (risk) {
      case 'high':
        return <Badge variant="destructive">High</Badge>
      case 'medium':
        return <Badge variant="default" className="bg-yellow-100 text-yellow-800">Medium</Badge>
      default:
        return <Badge variant="default" className="bg-green-100 text-green-800">Low</Badge>
    }
  }

  // Column definitions for inventory table
  const inventoryColumns = [
    {
      key: 'itemName',
      title: 'Product',
      sortable: true,
      type: 'text' as const,
    },
    {
      key: 'currentStock',
      title: 'Stock',
      sortable: true,
      type: 'number' as const,
      align: 'right' as const,
    },
    {
      key: 'currentValue',
      title: 'Value',
      sortable: true,
      type: 'currency' as const,
      align: 'right' as const,
    },
    {
      key: 'inventoryTurnover',
      title: 'Turnover',
      sortable: true,
      type: 'number' as const,
      align: 'right' as const,
    },
    {
      key: 'daysOfInventory',
      title: 'Days of Inventory',
      sortable: true,
      type: 'number' as const,
      align: 'right' as const,
    },
    {
      key: 'sellThroughRate',
      title: 'Sell-Through %',
      sortable: true,
      type: 'number' as const,
      align: 'right' as const,
    },
    {
      key: 'stockoutRisk',
      title: 'Stockout Risk',
      type: 'status' as const,
    },
    {
      key: 'recommendedAction',
      title: 'Recommendation',
      type: 'text' as const,
    },
  ]

  const handleRowClick = (item: InventoryItem) => {
    // Navigate to detailed inventory item page
    console.log('Inventory item clicked:', item.itemName)
  }

  const handleExport = () => {
    // Export inventory data
    console.log('Export inventory management data')
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Summary Cards */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {/* Overall Turnover */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center">
              <BarChart3 className="mr-2 h-4 w-4" />
              Inventory Turnover
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <p className="text-2xl font-bold">
                {turnoverAnalysis?.overallTurnover.toFixed(1)}x
              </p>
              <div className="flex items-center gap-1">
                {turnoverAnalysis && getTurnoverStatus(turnoverAnalysis.overallTurnover).color && (
                  <span className={`text-sm ${getTurnoverStatus(turnoverAnalysis.overallTurnover).color}`}>
                    {getTurnoverStatus(turnoverAnalysis.overallTurnover).status}
                  </span>
                )}
                <span className="text-xs text-gray-500">
                  Target: {turnoverAnalysis?.targetTurnover.toFixed(1)}x
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Total Inventory Value */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center">
              <Package className="mr-2 h-4 w-4" />
              Total Value
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <p className="text-2xl font-bold">
                {formatCurrency(inventoryItems.reduce((sum, item) => sum + item.currentValue, 0))}
              </p>
              <p className="text-sm text-gray-600">
                {inventoryItems.reduce((sum, item) => sum + item.currentStock, 0)} units
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Stockout Risks */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center">
              <AlertTriangle className="mr-2 h-4 w-4" />
              Stockout Risks
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <p className="text-2xl font-bold">
                {turnoverAnalysis?.stockoutRisks.length || 0}
              </p>
              <p className="text-sm text-red-600">
                Items requiring immediate attention
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Dead Stock */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center">
              <TrendingDown className="mr-2 h-4 w-4" />
              Dead Stock
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <p className="text-2xl font-bold">
                {turnoverAnalysis?.deadStockItems.length || 0}
              </p>
              <p className="text-sm text-gray-600">
                {formatCurrency(turnoverAnalysis?.deadStockItems.reduce((sum, item) => sum + item.currentValue, 0) || 0)} value
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Turnover Analysis by Category */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Activity className="mr-2 h-5 w-5" />
            Turnover Analysis by Category
          </CardTitle>
          <CardDescription>
            Inventory performance metrics by product category
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            {turnoverAnalysis?.turnoverByCategory.map((category, index) => (
              <div key={index} className="p-4 border rounded-lg">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-sm font-medium">{category.category}</h4>
                  <Badge variant={getTurnoverStatus(category.turnover).badge}>
                    {getTurnoverStatus(category.turnover).status}
                  </Badge>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">Turnover:</span>
                    <span className={`font-medium ${getTurnoverStatus(category.turnover).color}`}>
                      {category.turnover.toFixed(1)}x
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">Days of Inventory:</span>
                    <span className="font-medium">{category.daysOfInventory} days</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Filters and Search */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Filter className="mr-2 h-5 w-5" />
            Inventory Filters & Search
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Search</label>
              <Input
                placeholder="Product name, code..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="text-sm"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
              <select
                value={filters.category}
                onChange={(e) => setFilters(prev => ({ ...prev, category: e.target.value }))}
                className="w-full rounded-md border-gray-300 text-sm"
              >
                <option value="all">All</option>
                <option value="Professional">Professional</option>
                <option value="Home/Consumer">Home/Consumer</option>
                <option value="Intermediate">Intermediate</option>
                <option value="Accessories">Accessories</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Stock Level</label>
              <select
                value={filters.stockLevel}
                onChange={(e) => setFilters(prev => ({ ...prev, stockLevel: e.target.value }))}
                className="w-full rounded-md border-gray-300 text-sm"
              >
                <option value="all">All</option>
                <option value="low">Low Stock</option>
                <option value="adequate">Adequate</option>
                <option value="high">High Stock</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Turnover</label>
              <select
                value={filters.turnoverStatus}
                onChange={(e) => setFilters(prev => ({ ...prev, turnoverStatus: e.target.value }))}
                className="w-full rounded-md border-gray-300 text-sm"
              >
                <option value="all">All</option>
                <option value="fast">Fast (4+ turns)</option>
                <option value="medium">Medium (2-4 turns)</option>
                <option value="slow">Slow (&lt;2 turns)</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Risk Level</label>
              <select
                value={filters.riskLevel}
                onChange={(e) => setFilters(prev => ({ ...prev, riskLevel: e.target.value }))}
                className="w-full rounded-md border-gray-300 text-sm"
              >
                <option value="all">All</option>
                <option value="low">Low Risk</option>
                <option value="medium">Medium Risk</option>
                <option value="high">High Risk</option>
              </select>
            </div>

            <div className="flex items-end">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setFilters({ category: 'all', stockLevel: 'all', turnoverStatus: 'all', riskLevel: 'all' })}
                className="w-full"
              >
                Clear Filters
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Inventory Management Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center">
                <Package className="mr-2 h-5 w-5" />
                Inventory Management
              </CardTitle>
              <CardDescription>
                Stock levels, turnover rates, and management recommendations
              </CardDescription>
            </div>
            <div className="flex items-center gap-3">
              <Badge variant="outline">
                {filteredItems.length} of {inventoryItems.length} items
              </Badge>
              <Button
                variant="outline"
                size="sm"
                onClick={handleRefresh}
                disabled={isLoading}
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <DataTable
            columns={inventoryColumns}
            data={filteredItems}
            loading={isLoading}
            searchPlaceholder="Search inventory items..."
            onRowClick={handleRowClick}
            onExport={handleExport}
          />
        </CardContent>
      </Card>

      {/* Action Items and Recommendations */}
      {showRecommendations && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* Immediate Actions Required */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Zap className="mr-2 h-5 w-5 text-red-500" />
                Immediate Actions
              </CardTitle>
              <CardDescription>
                Items requiring immediate attention
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {filteredItems
                .filter(item => item.recommendedAction === 'reorder' || item.stockoutRisk === 'high')
                .slice(0, 5)
                .map((item, index) => (
                  <div key={index} className="p-3 border border-red-200 bg-red-50 rounded-lg">
                    <div className="flex items-center justify-between mb-1">
                      <h4 className="text-sm font-medium text-red-800">{item.model}</h4>
                      {getRecommendationBadge(item.recommendedAction)}
                    </div>
                    <p className="text-xs text-red-700 mb-2">{item.reasoning}</p>
                    <div className="grid grid-cols-2 gap-2 text-xs text-red-600">
                      <div>Stock: {item.currentStock}</div>
                      <div>Reorder: {item.reorderLevel}</div>
                      {item.recommendedQuantity && (
                        <div className="col-span-2">
                          Recommended Order: {item.recommendedQuantity} units
                        </div>
                      )}
                    </div>
                  </div>
                ))}

              {filteredItems.filter(item => item.recommendedAction === 'reorder' || item.stockoutRisk === 'high').length === 0 && (
                <div className="text-center py-4">
                  <CheckCircle className="mx-auto h-8 w-8 text-green-400 mb-2" />
                  <p className="text-sm text-gray-500">No immediate actions required</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Performance Insights */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Eye className="mr-2 h-5 w-5" />
                Performance Insights
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                <div className="flex items-center mb-1">
                  <CheckCircle className="mr-2 h-4 w-4 text-green-600" />
                  <h4 className="text-sm font-medium text-green-800">Strong Accessories Performance</h4>
                </div>
                <p className="text-xs text-green-700">
                  Accessories category showing excellent 6.2x turnover. 
                  Consider expanding accessory product line.
                </p>
              </div>

              <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                <div className="flex items-center mb-1">
                  <AlertTriangle className="mr-2 h-4 w-4 text-yellow-600" />
                  <h4 className="text-sm font-medium text-yellow-800">Professional Category Concern</h4>
                </div>
                <p className="text-xs text-yellow-700">
                  Professional models showing poor turnover (1.4x). 
                  Review pricing strategy and marketing approach.
                </p>
              </div>

              <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="flex items-center mb-1">
                  <Target className="mr-2 h-4 w-4 text-blue-600" />
                  <h4 className="text-sm font-medium text-blue-800">Optimization Opportunity</h4>
                </div>
                <p className="text-xs text-blue-700">
                  Overall turnover at 3.2x vs 4.0x target. Focus on fast-moving 
                  models and reduce slow-moving inventory.
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Carrying Cost Analysis */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Calculator className="mr-2 h-5 w-5" />
                Carrying Cost Analysis
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm">Total Carrying Costs</span>
                <span className="text-sm font-medium">
                  {formatCurrency(inventoryItems.reduce((sum, item) => sum + item.carryingCostAmount, 0))}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">As % of Inventory Value</span>
                <span className="text-sm font-medium">18.5%</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Monthly Carrying Cost</span>
                <span className="text-sm font-medium">
                  {formatCurrency(inventoryItems.reduce((sum, item) => sum + item.carryingCostAmount, 0) / 12)}
                </span>
              </div>

              <div className="mt-3 p-3 bg-gray-50 rounded-lg">
                <h4 className="text-sm font-medium text-gray-800 mb-2">Cost Breakdown</h4>
                <div className="text-xs text-gray-700 space-y-1">
                  <div className="flex justify-between">
                    <span>Storage & Handling:</span>
                    <span>45%</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Insurance:</span>
                    <span>25%</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Opportunity Cost:</span>
                    <span>20%</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Obsolescence Risk:</span>
                    <span>10%</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <ShoppingCart className="mr-2 h-5 w-5" />
            Inventory Actions
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            <Button variant="outline" className="flex items-center justify-center">
              <Truck className="mr-2 h-4 w-4" />
              Create Purchase Orders
            </Button>
            <Button variant="outline" className="flex items-center justify-center">
              <AlertTriangle className="mr-2 h-4 w-4" />
              Review Reorder Levels
            </Button>
            <Button variant="outline" className="flex items-center justify-center">
              <Download className="mr-2 h-4 w-4" />
              Export Inventory Report
            </Button>
            <Button variant="outline" className="flex items-center justify-center">
              <Calculator className="mr-2 h-4 w-4" />
              Inventory Valuation
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
