'use client'

// Force dynamic rendering to prevent static generation issues
export const dynamic = 'force-dynamic'

import { useState, useEffect } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { getCurrentFinancialYear } from '@/lib/utils/dates'
import { MetricTile } from '@/components/ui/metric-tile'
import { DashboardCard } from '@/components/ui/dashboard-card'
import { DataTable } from '@/components/ui/data-table'
import { DatePicker } from '@/components/ui/date-picker'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { RevenueComparisonChart } from '@/components/charts/revenue-comparison-chart'
import { DrDishUnitSales } from '@/components/dashboard/dr-dish-unit-sales'
import { DrDishMarginAnalysis } from '@/components/dashboard/dr-dish-margin-analysis'
import { DrDishInventoryManagement } from '@/components/dashboard/dr-dish-inventory-management'
import { 
  Gamepad2, 
  Package, 
  TrendingUp, 
  TrendingDown, 
  BarChart3, 
  AlertTriangle,
  CheckCircle,
  Clock,
  DollarSign,
  RefreshCw,
  Download,
  Filter,
  Eye,
  Truck,
  ShoppingCart,
  Target,
  Activity,
  Calendar,
  Users
} from 'lucide-react'
import { formatCurrency, formatPercentage } from '@/utils/financial'

interface DrDishInventoryData {
  totalInventoryValue: number
  totalUnits: number
  inventoryTurnover: number
  daysOfInventory: number
  sellThroughRate: number
  reorderAlerts: Array<{
    itemCode: string
    itemName: string
    currentStock: number
    reorderLevel: number
    daysUntilStockout: number
    category: string
    recommendedOrderQuantity: number
  }>
  topSellingItems: Array<{
    itemCode: string
    itemName: string
    unitsSold: number
    revenue: number
    averageSellingPrice: number
    marginPercent: number
    velocityRank: number
  }>
  slowMovingItems: Array<{
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

interface DrDishSalesData {
  totalRevenue: number
  totalUnitsSold: number
  averageSellingPrice: number
  grossMargin: number
  grossMarginPercent: number
  priorPeriodRevenue: number
  priorPeriodUnits: number
  revenueGrowth: number
  unitGrowth: number
  topCustomers: Array<{
    name: string
    revenue: number
    units: number
    marginPercent: number
    lastOrderDate: Date
  }>
  productMix: Array<{
    model: string
    revenue: number
    units: number
    marketShare: number
    marginPercent: number
  }>
}

export default function DrDishDashboard() {
  const { user, hasPermission } = useAuth()
  const [selectedDate, setSelectedDate] = useState<Date>()
  const [inventoryData, setInventoryData] = useState<DrDishInventoryData | null>(null)
  const [salesData, setSalesData] = useState<DrDishSalesData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date())
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [viewMode, setViewMode] = useState<'inventory' | 'sales' | 'both'>('both')

  const [currentFY, setCurrentFY] = useState<ReturnType<typeof getCurrentFinancialYear> | null>(null)
  
  // Initialize current FY safely on client side
  useEffect(() => {
    try {
      setCurrentFY(getCurrentFinancialYear())
    } catch (error) {
      console.warn('Error getting current financial year:', error)
      setCurrentFY({
        year: 2024,
        startDate: new Date('2024-07-01'),
        endDate: new Date('2025-06-30'),
        label: 'FY 2024-25'
      })
    }
  }, [])

  // Load Dr Dish dashboard data
  useEffect(() => {
    loadDrDishData()
  }, [selectedCategory, viewMode])

  const loadDrDishData = async () => {
    setIsLoading(true)
    
    try {
      // Simulate API call - replace with actual server actions
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      // Sample Dr Dish inventory data
      setInventoryData({
        totalInventoryValue: 485000,
        totalUnits: 23,
        inventoryTurnover: 3.2,
        daysOfInventory: 114,
        sellThroughRate: 78.5,
        reorderAlerts: [
          {
            itemCode: 'DRDISH-PRO',
            itemName: 'Dr Dish Pro Basketball Machine',
            currentStock: 2,
            reorderLevel: 3,
            daysUntilStockout: 45,
            category: 'Professional',
            recommendedOrderQuantity: 5,
          },
          {
            itemCode: 'DRDISH-REBEL',
            itemName: 'Dr Dish Rebel Basketball Machine',
            currentStock: 1,
            reorderLevel: 2,
            daysUntilStockout: 30,
            category: 'Intermediate',
            recommendedOrderQuantity: 3,
          },
        ],
        topSellingItems: [
          {
            itemCode: 'DRDISH-HOME',
            itemName: 'Dr Dish Home Basketball Machine',
            unitsSold: 8,
            revenue: 120000,
            averageSellingPrice: 15000,
            marginPercent: 42.5,
            velocityRank: 1,
          },
          {
            itemCode: 'DRDISH-PRO',
            itemName: 'Dr Dish Pro Basketball Machine',
            unitsSold: 3,
            revenue: 75000,
            averageSellingPrice: 25000,
            marginPercent: 45.2,
            velocityRank: 2,
          },
          {
            itemCode: 'DRDISH-REBEL',
            itemName: 'Dr Dish Rebel Basketball Machine',
            unitsSold: 2,
            revenue: 32000,
            averageSellingPrice: 16000,
            marginPercent: 38.8,
            velocityRank: 3,
          },
        ],
        slowMovingItems: [
          {
            itemCode: 'DRDISH-ELITE',
            itemName: 'Dr Dish Elite Basketball Machine',
            daysSinceLastSale: 156,
            currentStock: 1,
            inventoryValue: 35000,
          },
          {
            itemCode: 'ACCESSORIES-NET',
            itemName: 'Dr Dish Replacement Net',
            daysSinceLastSale: 89,
            currentStock: 15,
            inventoryValue: 1500,
          },
        ],
        categoryAnalysis: [
          {
            category: 'Professional',
            totalValue: 285000,
            totalUnits: 12,
            turnoverRate: 2.8,
            marginPercent: 44.2,
          },
          {
            category: 'Home/Consumer',
            totalValue: 150000,
            totalUnits: 8,
            turnoverRate: 4.1,
            marginPercent: 41.8,
          },
          {
            category: 'Accessories',
            totalValue: 50000,
            totalUnits: 3,
            turnoverRate: 6.2,
            marginPercent: 52.5,
          },
        ],
      })

      // Sample Dr Dish sales data
      setSalesData({
        totalRevenue: 168200,
        totalUnitsSold: 15,
        averageSellingPrice: 11213,
        grossMargin: 72850,
        grossMarginPercent: 43.3,
        priorPeriodRevenue: 142500,
        priorPeriodUnits: 13,
        revenueGrowth: 18.0,
        unitGrowth: 15.4,
        topCustomers: [
          {
            name: 'Basketball Victoria',
            revenue: 50000,
            units: 2,
            marginPercent: 45.0,
            lastOrderDate: new Date('2024-10-15'),
          },
          {
            name: 'Sydney Kings Basketball Club',
            revenue: 32000,
            units: 2,
            marginPercent: 38.8,
            lastOrderDate: new Date('2024-09-20'),
          },
          {
            name: 'Adelaide 36ers Academy',
            revenue: 25000,
            units: 1,
            marginPercent: 45.2,
            lastOrderDate: new Date('2024-08-30'),
          },
        ],
        productMix: [
          {
            model: 'Dr Dish Home',
            revenue: 120000,
            units: 8,
            marketShare: 71.4,
            marginPercent: 42.5,
          },
          {
            model: 'Dr Dish Pro',
            revenue: 25000,
            units: 1,
            marketShare: 14.9,
            marginPercent: 45.2,
          },
          {
            model: 'Dr Dish Rebel',
            revenue: 16000,
            units: 1,
            marketShare: 9.5,
            marginPercent: 38.8,
          },
          {
            model: 'Accessories',
            revenue: 7200,
            units: 5,
            marketShare: 4.3,
            marginPercent: 52.5,
          },
        ],
      })

      setLastRefresh(new Date())
    } catch (error) {
      console.error('Failed to load Dr Dish data:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleRefresh = () => {
    loadDrDishData()
  }

  const getStockLevelColor = (currentStock: number, reorderLevel: number) => {
    if (currentStock <= reorderLevel * 0.5) return 'text-red-600'
    if (currentStock <= reorderLevel) return 'text-yellow-600'
    return 'text-green-600'
  }

  const getVelocityBadge = (rank: number) => {
    if (rank <= 2) return <Badge variant="default" className="bg-green-100 text-green-800">Fast</Badge>
    if (rank <= 5) return <Badge variant="default" className="bg-yellow-100 text-yellow-800">Medium</Badge>
    return <Badge variant="default" className="bg-red-100 text-red-800">Slow</Badge>
  }

  const getTurnoverStatus = (turnover: number) => {
    if (turnover >= 4) return { color: 'text-green-600', status: 'Excellent' }
    if (turnover >= 2.5) return { color: 'text-blue-600', status: 'Good' }
    if (turnover >= 1.5) return { color: 'text-yellow-600', status: 'Fair' }
    return { color: 'text-red-600', status: 'Poor' }
  }

  if (!user) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center text-gray-500">
              <Gamepad2 className="mx-auto mb-2 h-8 w-8 text-gray-400" />
              <p>Please log in to access the Dr Dish dashboard.</p>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Check if user has permission to view Dr Dish dashboard
  if (!hasPermission('canViewDrDishDashboard') && !hasPermission('canViewFinancials')) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center text-gray-500">
              <AlertTriangle className="mx-auto mb-2 h-8 w-8 text-gray-400" />
              <p>You do not have permission to view the Dr Dish dashboard.</p>
              <p className="mt-2 text-sm">Contact your administrator for access.</p>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Dashboard Header */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
            <Gamepad2 className="h-8 w-8 text-blue-600" />
            Dr Dish Distribution Dashboard
          </h1>
          <p className="text-gray-600">
            Basketball machine distribution, inventory management, and sales analysis for {currentFY?.label || 'FY 2024-25'}
          </p>
        </div>
        
        <div className="flex items-center gap-4">
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="rounded-md border-gray-300 text-sm"
          >
            <option value="all">All Categories</option>
            <option value="Professional">Professional</option>
            <option value="Home/Consumer">Home/Consumer</option>
            <option value="Accessories">Accessories</option>
          </select>

          <select
            value={viewMode}
            onChange={(e) => setViewMode(e.target.value as 'inventory' | 'sales' | 'both')}
            className="rounded-md border-gray-300 text-sm"
          >
            <option value="both">Inventory & Sales</option>
            <option value="inventory">Inventory Focus</option>
            <option value="sales">Sales Focus</option>
          </select>
          
          <DatePicker
            date={selectedDate}
            onDateChange={setSelectedDate}
            placeholder="Select reporting period"
          />
          
          <Badge variant="outline" className="flex items-center gap-1">
            <Calendar className="h-3 w-3" />
            {currentFY?.label || 'FY 2024-25'} • Week {currentFY ? Math.ceil((new Date().getTime() - currentFY.startDate.getTime()) / (7 * 24 * 60 * 60 * 1000)) : 12}
          </Badge>
          
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={isLoading}
            className="flex items-center gap-2"
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Key Performance Indicators */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-5">
        {/* Total Revenue */}
        <MetricTile
          title="Total Revenue"
          value={salesData?.totalRevenue || 0}
          currency
          isLoading={isLoading}
          change={{
            value: salesData ? `${salesData.revenueGrowth > 0 ? '+' : ''}${salesData.revenueGrowth.toFixed(1)}%` : '',
            type: salesData && salesData.revenueGrowth > 0 ? 'positive' : 'negative',
            label: 'vs prior period',
          }}
          icon={<DollarSign className="h-5 w-5" />}
        />

        {/* Units Sold */}
        <MetricTile
          title="Units Sold"
          value={salesData?.totalUnitsSold || 0}
          isLoading={isLoading}
          change={{
            value: salesData ? `${salesData.unitGrowth > 0 ? '+' : ''}${salesData.unitGrowth.toFixed(1)}%` : '',
            type: salesData && salesData.unitGrowth > 0 ? 'positive' : 'negative',
            label: 'vs prior period',
          }}
          icon={<ShoppingCart className="h-5 w-5" />}
        />

        {/* Average Selling Price */}
        <MetricTile
          title="Avg Selling Price"
          value={salesData?.averageSellingPrice || 0}
          currency
          isLoading={isLoading}
          change={{
            value: salesData && salesData.priorPeriodUnits > 0 ? 
              `${((salesData.averageSellingPrice - (salesData.priorPeriodRevenue / salesData.priorPeriodUnits)) / (salesData.priorPeriodRevenue / salesData.priorPeriodUnits) * 100).toFixed(1)}%` : '',
            type: 'neutral',
            label: 'vs prior period',
          }}
          icon={<Target className="h-5 w-5" />}
        />

        {/* Inventory Value */}
        <MetricTile
          title="Inventory Value"
          value={inventoryData?.totalInventoryValue || 0}
          currency
          isLoading={isLoading}
          change={{
            value: `${inventoryData?.totalUnits || 0} units`,
            type: 'neutral',
            label: 'on hand',
          }}
          icon={<Package className="h-5 w-5" />}
        />

        {/* Inventory Turnover */}
        <MetricTile
          title="Inventory Turnover"
          value={inventoryData ? `${inventoryData.inventoryTurnover.toFixed(1)}x` : '0x'}
          isLoading={isLoading}
          change={{
            value: `${inventoryData?.daysOfInventory || 0} days`,
            type: inventoryData && inventoryData.daysOfInventory < 120 ? 'positive' : 'negative',
            label: 'of inventory',
          }}
          icon={<BarChart3 className="h-5 w-5" />}
        />
      </div>

      {/* Revenue Comparison and Inventory Alerts */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Revenue Comparison Chart */}
        <div className="lg:col-span-2">
          <RevenueComparisonChart 
            revenueStream="dr-dish"
            chartType="bar"
            showCumulative={false}
            weeksToShow={26}
          />
        </div>

        {/* Reorder Alerts */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <AlertTriangle className="mr-2 h-5 w-5 text-orange-500" />
              Reorder Alerts
            </CardTitle>
            <CardDescription>
              Items requiring immediate attention
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {inventoryData?.reorderAlerts.map((alert, index) => (
              <div key={index} className="p-3 border border-orange-200 bg-orange-50 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-sm font-medium text-orange-800">{alert.itemName}</h4>
                  <Badge variant="destructive" className="text-xs">
                    {alert.daysUntilStockout} days
                  </Badge>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs text-orange-700">
                  <div>
                    <span className="font-medium">Current:</span> {alert.currentStock}
                  </div>
                  <div>
                    <span className="font-medium">Reorder:</span> {alert.reorderLevel}
                  </div>
                  <div>
                    <span className="font-medium">Recommended:</span> {alert.recommendedOrderQuantity}
                  </div>
                  <div>
                    <span className="font-medium">Category:</span> {alert.category}
                  </div>
                </div>
              </div>
            ))}

            {(!inventoryData?.reorderAlerts || inventoryData.reorderAlerts.length === 0) && (
              <div className="text-center py-4">
                <CheckCircle className="mx-auto h-8 w-8 text-green-400 mb-2" />
                <p className="text-sm text-gray-500">All items above reorder levels</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Product Performance and Category Analysis */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Top Selling Items */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <TrendingUp className="mr-2 h-5 w-5" />
              Top Performing Products
            </CardTitle>
            <CardDescription>
              Best selling Dr Dish models by revenue and velocity
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {inventoryData?.topSellingItems.map((item, index) => (
              <div key={index} className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex items-center justify-center w-8 h-8 rounded-full bg-blue-100 text-blue-600 text-sm font-bold">
                    #{item.velocityRank}
                  </div>
                  <div>
                    <p className="text-sm font-medium">{item.itemName}</p>
                    <p className="text-xs text-gray-500">
                      {item.unitsSold} units • {item.marginPercent.toFixed(1)}% margin
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium">{formatCurrency(item.revenue)}</p>
                  <p className="text-xs text-gray-500">{formatCurrency(item.averageSellingPrice)} ASP</p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Category Analysis */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <BarChart3 className="mr-2 h-5 w-5" />
              Category Performance
            </CardTitle>
            <CardDescription>
              Inventory and sales performance by product category
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {inventoryData?.categoryAnalysis.map((category, index) => {
              const turnoverStatus = getTurnoverStatus(category.turnoverRate)
              return (
                <div key={index} className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">{category.category}</p>
                    <p className="text-xs text-gray-500">
                      {category.totalUnits} units • {category.marginPercent.toFixed(1)}% margin
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium">{formatCurrency(category.totalValue)}</p>
                    <div className="flex items-center gap-1">
                      <span className={`text-xs ${turnoverStatus.color}`}>
                        {category.turnoverRate.toFixed(1)}x turnover
                      </span>
                      <Badge variant="outline" className="text-xs">
                        {turnoverStatus.status}
                      </Badge>
                    </div>
                  </div>
                </div>
              )
            })}
          </CardContent>
        </Card>
      </div>

      {/* Inventory Management and Slow Moving Items */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Inventory Summary */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Package className="mr-2 h-5 w-5" />
              Inventory Summary
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm">Total Value</span>
              <span className="text-sm font-medium">
                {formatCurrency(inventoryData?.totalInventoryValue || 0)}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">Total Units</span>
              <span className="text-sm font-medium">{inventoryData?.totalUnits || 0}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">Turnover Rate</span>
              <div className="text-right">
                <span className={`text-sm font-medium ${getTurnoverStatus(inventoryData?.inventoryTurnover || 0).color}`}>
                  {inventoryData?.inventoryTurnover.toFixed(1)}x
                </span>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">Days of Inventory</span>
              <span className={`text-sm font-medium ${inventoryData && inventoryData.daysOfInventory < 120 ? 'text-green-600' : 'text-yellow-600'}`}>
                {inventoryData?.daysOfInventory || 0} days
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">Sell-Through Rate</span>
              <span className="text-sm font-medium">
                {inventoryData?.sellThroughRate.toFixed(1)}%
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Slow Moving Items */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <TrendingDown className="mr-2 h-5 w-5 text-red-500" />
              Slow Moving Items
            </CardTitle>
            <CardDescription>
              Items with low velocity requiring attention
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {inventoryData?.slowMovingItems.map((item, index) => (
              <div key={index} className="p-3 border border-yellow-200 bg-yellow-50 rounded-lg">
                <h4 className="text-sm font-medium text-yellow-800 mb-1">{item.itemName}</h4>
                <div className="grid grid-cols-2 gap-2 text-xs text-yellow-700">
                  <div>
                    <span className="font-medium">Last Sale:</span> {item.daysSinceLastSale} days ago
                  </div>
                  <div>
                    <span className="font-medium">Stock:</span> {item.currentStock}
                  </div>
                  <div className="col-span-2">
                    <span className="font-medium">Value:</span> {formatCurrency(item.inventoryValue)}
                  </div>
                </div>
              </div>
            ))}

            {(!inventoryData?.slowMovingItems || inventoryData.slowMovingItems.length === 0) && (
              <div className="text-center py-4">
                <CheckCircle className="mx-auto h-8 w-8 text-green-400 mb-2" />
                <p className="text-sm text-gray-500">No slow moving items</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Top Customers */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Users className="mr-2 h-5 w-5" />
              Top Customers
            </CardTitle>
            <CardDescription>
              Highest value Dr Dish customers
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {salesData?.topCustomers.map((customer, index) => (
              <div key={index} className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">{customer.name}</p>
                  <p className="text-xs text-gray-500">
                    {customer.units} units • {customer.marginPercent.toFixed(1)}% margin
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium">{formatCurrency(customer.revenue)}</p>
                  <p className="text-xs text-gray-500">
                    Last: {customer.lastOrderDate.toLocaleDateString()}
                  </p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Product Mix and Market Share */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Eye className="mr-2 h-5 w-5" />
            Product Mix Analysis
          </CardTitle>
          <CardDescription>
            Revenue and market share breakdown by Dr Dish model
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
            {salesData?.productMix.map((product, index) => (
              <div key={index} className="p-4 border rounded-lg">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-sm font-medium">{product.model}</h4>
                  <Badge variant="outline" className="text-xs">
                    {product.marketShare.toFixed(1)}%
                  </Badge>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">Revenue:</span>
                    <span className="font-medium">{formatCurrency(product.revenue)}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">Units:</span>
                    <span className="font-medium">{product.units}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">Margin:</span>
                    <span className={`font-medium ${product.marginPercent > 40 ? 'text-green-600' : 'text-yellow-600'}`}>
                      {product.marginPercent.toFixed(1)}%
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Quick Actions and Status */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Inventory Actions */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Package className="mr-2 h-5 w-5" />
              Inventory Actions
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button className="w-full justify-start" variant="outline">
              <Truck className="mr-2 h-4 w-4" />
              Create Purchase Orders
            </Button>
            <Button className="w-full justify-start" variant="outline">
              <Download className="mr-2 h-4 w-4" />
              Export Inventory Report
            </Button>
            <Button className="w-full justify-start" variant="outline">
              <AlertTriangle className="mr-2 h-4 w-4" />
              Review Reorder Levels
            </Button>
            <Button className="w-full justify-start" variant="outline">
              <BarChart3 className="mr-2 h-4 w-4" />
              Inventory Valuation
            </Button>
          </CardContent>
        </Card>

        {/* Sales Performance */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <TrendingUp className="mr-2 h-5 w-5" />
              Sales Performance
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm">Revenue Growth</span>
              <div className="flex items-center gap-1">
                <TrendingUp className="h-3 w-3 text-green-500" />
                <span className="text-sm font-medium text-green-600">
                  +{salesData?.revenueGrowth.toFixed(1)}%
                </span>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">Unit Growth</span>
              <div className="flex items-center gap-1">
                <TrendingUp className="h-3 w-3 text-green-500" />
                <span className="text-sm font-medium text-green-600">
                  +{salesData?.unitGrowth.toFixed(1)}%
                </span>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">Gross Margin</span>
              <span className="text-sm font-medium">
                {salesData?.grossMarginPercent.toFixed(1)}%
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">Sell-Through Rate</span>
              <span className="text-sm font-medium">
                {inventoryData?.sellThroughRate.toFixed(1)}%
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Distribution Status */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Activity className="mr-2 h-5 w-5" />
              Distribution Status
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm">Pending Orders</span>
              <Badge variant="default" className="bg-blue-100 text-blue-800">3</Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">In Transit</span>
              <Badge variant="default" className="bg-yellow-100 text-yellow-800">2</Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">Delivered This Month</span>
              <Badge variant="default" className="bg-green-100 text-green-800">8</Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">Installation Support</span>
              <Badge variant="secondary">Available</Badge>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Unit Sales Tracking and ASP Analysis */}
      <DrDishUnitSales showASPAnalysis={true} />

      {/* Gross Margin Analysis by Product Model */}
      <DrDishMarginAnalysis showDetailedBreakdown={true} />

      {/* Inventory Management with Turns and Stock Levels */}
      <DrDishInventoryManagement showRecommendations={true} />

      {/* Last Updated Info */}
      <div className="flex items-center justify-between text-sm text-gray-500">
        <div className="flex items-center gap-2">
          <Clock className="h-4 w-4" />
          Last updated: {lastRefresh.toLocaleTimeString()}
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline">
            Dr Dish Distribution • {selectedCategory === 'all' ? 'All categories' : selectedCategory}
          </Badge>
        </div>
      </div>
    </div>
  )
}
