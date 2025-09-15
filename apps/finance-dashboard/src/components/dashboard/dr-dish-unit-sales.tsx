'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { DataTable } from '@/components/ui/data-table'
import { 
  ShoppingCart, 
  TrendingUp, 
  TrendingDown, 
  Target, 
  BarChart3,
  DollarSign,
  Package,
  Calendar,
  RefreshCw,
  Download,
  Filter,
  Eye,
  Activity,
  AlertTriangle,
  CheckCircle
} from 'lucide-react'
import { formatCurrency } from '@/utils/financial'

interface UnitSalesData {
  itemCode: string
  itemName: string
  category: string
  model: string
  unitsSoldYTD: number
  unitsSoldPriorYTD: number
  unitGrowth: number
  revenueYTD: number
  revenuePriorYTD: number
  revenueGrowth: number
  currentASP: number
  priorASP: number
  aspChange: number
  averageCost: number
  grossMarginPerUnit: number
  grossMarginPercent: number
  inventoryTurnover: number
  daysOfInventory: number
  velocityRank: number
  profitabilityRank: number
  marketSharePercent: number
  seasonalityFactor: number
  monthlySales: Array<{
    month: string
    units: number
    revenue: number
    asp: number
  }>
  customerBreakdown: Array<{
    customerName: string
    units: number
    revenue: number
    lastOrderDate: Date
  }>
}

interface ASPAnalysis {
  currentPeriodASP: number
  priorPeriodASP: number
  aspChange: number
  aspTrend: 'increasing' | 'decreasing' | 'stable'
  priceOptimizationOpportunities: Array<{
    itemCode: string
    itemName: string
    currentASP: number
    recommendedASP: number
    potentialImpact: number
    confidence: 'low' | 'medium' | 'high'
    reasoning: string
  }>
  competitiveAnalysis: Array<{
    model: string
    ourPrice: number
    marketPrice: number
    pricePosition: 'premium' | 'competitive' | 'discount'
    recommendation: string
  }>
}

interface DrDishUnitSalesProps {
  className?: string
  showASPAnalysis?: boolean
  refreshInterval?: number
}

export function DrDishUnitSales({ 
  className,
  showASPAnalysis = true,
  refreshInterval = 300000 // 5 minutes
}: DrDishUnitSalesProps) {
  const [unitSalesData, setUnitSalesData] = useState<UnitSalesData[]>([])
  const [aspAnalysis, setASPAnalysis] = useState<ASPAnalysis | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date())
  const [selectedModel, setSelectedModel] = useState<string>('all')
  const [sortBy, setSortBy] = useState<'revenue' | 'units' | 'asp' | 'margin'>('revenue')

  useEffect(() => {
    loadUnitSalesData()
    
    // Set up refresh interval
    const interval = setInterval(loadUnitSalesData, refreshInterval)
    return () => clearInterval(interval)
  }, [refreshInterval, selectedModel])

  const loadUnitSalesData = async () => {
    setIsLoading(true)
    
    try {
      // Simulate API call - replace with actual server actions
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      // Sample unit sales data
      setUnitSalesData([
        {
          itemCode: 'DRDISH-HOME',
          itemName: 'Dr Dish Home Basketball Machine',
          category: 'Home/Consumer',
          model: 'Home',
          unitsSoldYTD: 8,
          unitsSoldPriorYTD: 6,
          unitGrowth: 33.3,
          revenueYTD: 120000,
          revenuePriorYTD: 90000,
          revenueGrowth: 33.3,
          currentASP: 15000,
          priorASP: 15000,
          aspChange: 0,
          averageCost: 8625,
          grossMarginPerUnit: 6375,
          grossMarginPercent: 42.5,
          inventoryTurnover: 4.1,
          daysOfInventory: 89,
          velocityRank: 1,
          profitabilityRank: 2,
          marketSharePercent: 71.4,
          seasonalityFactor: 1.2,
          monthlySales: [
            { month: 'Jul', units: 1, revenue: 15000, asp: 15000 },
            { month: 'Aug', units: 2, revenue: 30000, asp: 15000 },
            { month: 'Sep', units: 2, revenue: 30000, asp: 15000 },
            { month: 'Oct', units: 1, revenue: 15000, asp: 15000 },
            { month: 'Nov', units: 2, revenue: 30000, asp: 15000 },
            { month: 'Dec', units: 0, revenue: 0, asp: 0 },
          ],
          customerBreakdown: [
            { customerName: 'Basketball Victoria', units: 3, revenue: 45000, lastOrderDate: new Date('2024-10-15') },
            { customerName: 'Private Customer - Melbourne', units: 2, revenue: 30000, lastOrderDate: new Date('2024-09-20') },
            { customerName: 'Local Basketball Club', units: 2, revenue: 30000, lastOrderDate: new Date('2024-08-10') },
            { customerName: 'School - Brisbane', units: 1, revenue: 15000, lastOrderDate: new Date('2024-07-25') },
          ],
        },
        {
          itemCode: 'DRDISH-PRO',
          itemName: 'Dr Dish Pro Basketball Machine',
          category: 'Professional',
          model: 'Pro',
          unitsSoldYTD: 3,
          unitsSoldPriorYTD: 4,
          unitGrowth: -25.0,
          revenueYTD: 75000,
          revenuePriorYTD: 100000,
          revenueGrowth: -25.0,
          currentASP: 25000,
          priorASP: 25000,
          aspChange: 0,
          averageCost: 13700,
          grossMarginPerUnit: 11300,
          grossMarginPercent: 45.2,
          inventoryTurnover: 2.1,
          daysOfInventory: 174,
          velocityRank: 2,
          profitabilityRank: 1,
          marketSharePercent: 14.9,
          seasonalityFactor: 0.8,
          monthlySales: [
            { month: 'Jul', units: 1, revenue: 25000, asp: 25000 },
            { month: 'Aug', units: 1, revenue: 25000, asp: 25000 },
            { month: 'Sep', units: 0, revenue: 0, asp: 0 },
            { month: 'Oct', units: 1, revenue: 25000, asp: 25000 },
            { month: 'Nov', units: 0, revenue: 0, asp: 0 },
            { month: 'Dec', units: 0, revenue: 0, asp: 0 },
          ],
          customerBreakdown: [
            { customerName: 'Sydney Kings Basketball Club', units: 2, revenue: 50000, lastOrderDate: new Date('2024-10-15') },
            { customerName: 'Adelaide 36ers Academy', units: 1, revenue: 25000, lastOrderDate: new Date('2024-08-30') },
          ],
        },
        {
          itemCode: 'DRDISH-REBEL',
          itemName: 'Dr Dish Rebel Basketball Machine',
          category: 'Intermediate',
          model: 'Rebel',
          unitsSoldYTD: 2,
          unitsSoldPriorYTD: 2,
          unitGrowth: 0,
          revenueYTD: 32000,
          revenuePriorYTD: 30000,
          revenueGrowth: 6.7,
          currentASP: 16000,
          priorASP: 15000,
          aspChange: 6.7,
          averageCost: 9800,
          grossMarginPerUnit: 6200,
          grossMarginPercent: 38.8,
          inventoryTurnover: 1.8,
          daysOfInventory: 203,
          velocityRank: 3,
          profitabilityRank: 3,
          marketSharePercent: 9.5,
          seasonalityFactor: 1.0,
          monthlySales: [
            { month: 'Jul', units: 0, revenue: 0, asp: 0 },
            { month: 'Aug', units: 1, revenue: 16000, asp: 16000 },
            { month: 'Sep', units: 1, revenue: 16000, asp: 16000 },
            { month: 'Oct', units: 0, revenue: 0, asp: 0 },
            { month: 'Nov', units: 0, revenue: 0, asp: 0 },
            { month: 'Dec', units: 0, revenue: 0, asp: 0 },
          ],
          customerBreakdown: [
            { customerName: 'Perth Wildcats Academy', units: 1, revenue: 16000, lastOrderDate: new Date('2024-09-20') },
            { customerName: 'Gold Coast Basketball', units: 1, revenue: 16000, lastOrderDate: new Date('2024-08-15') },
          ],
        },
        {
          itemCode: 'DRDISH-ELITE',
          itemName: 'Dr Dish Elite Basketball Machine',
          category: 'Professional',
          model: 'Elite',
          unitsSoldYTD: 0,
          unitsSoldPriorYTD: 1,
          unitGrowth: -100,
          revenueYTD: 0,
          revenuePriorYTD: 35000,
          revenueGrowth: -100,
          currentASP: 0,
          priorASP: 35000,
          aspChange: -100,
          averageCost: 19250,
          grossMarginPerUnit: 0,
          grossMarginPercent: 0,
          inventoryTurnover: 0,
          daysOfInventory: 999,
          velocityRank: 4,
          profitabilityRank: 4,
          marketSharePercent: 0,
          seasonalityFactor: 0.5,
          monthlySales: [
            { month: 'Jul', units: 0, revenue: 0, asp: 0 },
            { month: 'Aug', units: 0, revenue: 0, asp: 0 },
            { month: 'Sep', units: 0, revenue: 0, asp: 0 },
            { month: 'Oct', units: 0, revenue: 0, asp: 0 },
            { month: 'Nov', units: 0, revenue: 0, asp: 0 },
            { month: 'Dec', units: 0, revenue: 0, asp: 0 },
          ],
          customerBreakdown: [],
        },
      ])

      // Sample ASP analysis
      setASPAnalysis({
        currentPeriodASP: 16750,
        priorPeriodASP: 16923,
        aspChange: -1.0,
        aspTrend: 'stable',
        priceOptimizationOpportunities: [
          {
            itemCode: 'DRDISH-REBEL',
            itemName: 'Dr Dish Rebel Basketball Machine',
            currentASP: 16000,
            recommendedASP: 17500,
            potentialImpact: 3000,
            confidence: 'medium',
            reasoning: 'Market demand strong, competitor pricing allows for increase',
          },
          {
            itemCode: 'DRDISH-HOME',
            itemName: 'Dr Dish Home Basketball Machine',
            currentASP: 15000,
            recommendedASP: 15500,
            potentialImpact: 4000,
            confidence: 'high',
            reasoning: 'High demand, limited supply, premium positioning opportunity',
          },
        ],
        competitiveAnalysis: [
          {
            model: 'Dr Dish Home',
            ourPrice: 15000,
            marketPrice: 16200,
            pricePosition: 'discount',
            recommendation: 'Consider price increase to capture more value',
          },
          {
            model: 'Dr Dish Pro',
            ourPrice: 25000,
            marketPrice: 24500,
            pricePosition: 'premium',
            recommendation: 'Maintain premium positioning with value justification',
          },
          {
            model: 'Dr Dish Rebel',
            ourPrice: 16000,
            marketPrice: 17000,
            pricePosition: 'competitive',
            recommendation: 'Opportunity for modest price increase',
          },
        ],
      })

      setLastRefresh(new Date())
    } catch (error) {
      console.error('Failed to load Dr Dish unit sales data:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleRefresh = () => {
    loadUnitSalesData()
  }

  const getGrowthColor = (growth: number) => {
    if (growth > 10) return 'text-green-600'
    if (growth > 0) return 'text-blue-600'
    if (growth > -10) return 'text-yellow-600'
    return 'text-red-600'
  }

  const getGrowthIcon = (growth: number) => {
    if (growth > 0) return <TrendingUp className="h-3 w-3" />
    if (growth < 0) return <TrendingDown className="h-3 w-3" />
    return <Target className="h-3 w-3" />
  }

  const getVelocityBadge = (rank: number) => {
    if (rank <= 2) return <Badge variant="default" className="bg-green-100 text-green-800">Fast</Badge>
    if (rank <= 3) return <Badge variant="default" className="bg-yellow-100 text-yellow-800">Medium</Badge>
    return <Badge variant="default" className="bg-red-100 text-red-800">Slow</Badge>
  }

  const getPricePositionBadge = (position: string) => {
    switch (position) {
      case 'premium':
        return <Badge variant="default" className="bg-purple-100 text-purple-800">Premium</Badge>
      case 'competitive':
        return <Badge variant="default" className="bg-blue-100 text-blue-800">Competitive</Badge>
      case 'discount':
        return <Badge variant="default" className="bg-green-100 text-green-800">Discount</Badge>
      default:
        return <Badge variant="outline">Unknown</Badge>
    }
  }

  // Column definitions for unit sales table
  const unitSalesColumns = [
    {
      key: 'itemName',
      title: 'Product',
      sortable: true,
      type: 'text' as const,
    },
    {
      key: 'unitsSoldYTD',
      title: 'Units Sold',
      sortable: true,
      type: 'number' as const,
      align: 'right' as const,
    },
    {
      key: 'revenueYTD',
      title: 'Revenue',
      sortable: true,
      type: 'currency' as const,
      align: 'right' as const,
    },
    {
      key: 'currentASP',
      title: 'ASP',
      sortable: true,
      type: 'currency' as const,
      align: 'right' as const,
    },
    {
      key: 'grossMarginPercent',
      title: 'Margin %',
      sortable: true,
      type: 'number' as const,
      align: 'right' as const,
    },
    {
      key: 'unitGrowth',
      title: 'Unit Growth',
      sortable: true,
      type: 'number' as const,
      align: 'right' as const,
    },
    {
      key: 'velocityRank',
      title: 'Velocity',
      type: 'text' as const,
    },
    {
      key: 'marketSharePercent',
      title: 'Market Share',
      sortable: true,
      type: 'number' as const,
      align: 'right' as const,
    },
  ]

  // Filter and sort data
  const filteredData = selectedModel === 'all' 
    ? unitSalesData 
    : unitSalesData.filter(item => item.model.toLowerCase().includes(selectedModel.toLowerCase()))

  const sortedData = [...filteredData].sort((a, b) => {
    switch (sortBy) {
      case 'revenue':
        return b.revenueYTD - a.revenueYTD
      case 'units':
        return b.unitsSoldYTD - a.unitsSoldYTD
      case 'asp':
        return b.currentASP - a.currentASP
      case 'margin':
        return b.grossMarginPercent - a.grossMarginPercent
      default:
        return 0
    }
  })

  // Calculate totals
  const totalRevenue = unitSalesData.reduce((sum, item) => sum + item.revenueYTD, 0)
  const totalUnits = unitSalesData.reduce((sum, item) => sum + item.unitsSoldYTD, 0)
  const totalPriorRevenue = unitSalesData.reduce((sum, item) => sum + item.revenuePriorYTD, 0)
  const totalPriorUnits = unitSalesData.reduce((sum, item) => sum + item.unitsSoldPriorYTD, 0)
  const overallASP = totalUnits > 0 ? totalRevenue / totalUnits : 0
  const priorASP = totalPriorUnits > 0 ? totalPriorRevenue / totalPriorUnits : 0
  const aspChange = priorASP > 0 ? ((overallASP - priorASP) / priorASP) * 100 : 0

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Summary Cards */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {/* Total Units Sold */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center">
              <ShoppingCart className="mr-2 h-4 w-4" />
              Units Sold YTD
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <p className="text-2xl font-bold">{totalUnits}</p>
              <div className="flex items-center gap-1">
                {getGrowthIcon(((totalUnits - totalPriorUnits) / totalPriorUnits) * 100)}
                <span className={`text-sm ${getGrowthColor(((totalUnits - totalPriorUnits) / totalPriorUnits) * 100)}`}>
                  {totalPriorUnits > 0 ? `${((totalUnits - totalPriorUnits) / totalPriorUnits * 100).toFixed(1)}%` : 'N/A'} vs prior
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Average Selling Price */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center">
              <Target className="mr-2 h-4 w-4" />
              Average Selling Price
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <p className="text-2xl font-bold">{formatCurrency(overallASP)}</p>
              <div className="flex items-center gap-1">
                {getGrowthIcon(aspChange)}
                <span className={`text-sm ${getGrowthColor(aspChange)}`}>
                  {aspChange !== 0 ? `${aspChange > 0 ? '+' : ''}${aspChange.toFixed(1)}%` : 'Stable'} vs prior
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Revenue per Unit */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center">
              <DollarSign className="mr-2 h-4 w-4" />
              Revenue YTD
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <p className="text-2xl font-bold">{formatCurrency(totalRevenue)}</p>
              <div className="flex items-center gap-1">
                {getGrowthIcon(((totalRevenue - totalPriorRevenue) / totalPriorRevenue) * 100)}
                <span className={`text-sm ${getGrowthColor(((totalRevenue - totalPriorRevenue) / totalPriorRevenue) * 100)}`}>
                  {totalPriorRevenue > 0 ? `${((totalRevenue - totalPriorRevenue) / totalPriorRevenue * 100).toFixed(1)}%` : 'N/A'} vs prior
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Gross Margin */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center">
              <BarChart3 className="mr-2 h-4 w-4" />
              Gross Margin
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <p className="text-2xl font-bold">
                {unitSalesData.length > 0 ? 
                  ((unitSalesData.reduce((sum, item) => sum + item.grossMarginPerUnit * item.unitsSoldYTD, 0) / totalRevenue) * 100).toFixed(1) + '%' :
                  '0%'
                }
              </p>
              <p className="text-sm text-gray-600">
                {formatCurrency(unitSalesData.reduce((sum, item) => sum + item.grossMarginPerUnit * item.unitsSoldYTD, 0))} total
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Controls and Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Filter className="mr-2 h-5 w-5" />
            Analysis Controls
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Product Model</label>
              <select
                value={selectedModel}
                onChange={(e) => setSelectedModel(e.target.value)}
                className="w-full rounded-md border-gray-300 text-sm"
              >
                <option value="all">All Models</option>
                <option value="home">Dr Dish Home</option>
                <option value="pro">Dr Dish Pro</option>
                <option value="rebel">Dr Dish Rebel</option>
                <option value="elite">Dr Dish Elite</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Sort By</label>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as 'revenue' | 'units' | 'asp' | 'margin')}
                className="w-full rounded-md border-gray-300 text-sm"
              >
                <option value="revenue">Revenue</option>
                <option value="units">Units Sold</option>
                <option value="asp">ASP</option>
                <option value="margin">Margin %</option>
              </select>
            </div>

            <div className="flex items-end">
              <Button
                variant="outline"
                size="sm"
                onClick={handleRefresh}
                disabled={isLoading}
                className="w-full"
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
                Refresh Data
              </Button>
            </div>

            <div className="flex items-end">
              <Button
                variant="outline"
                size="sm"
                className="w-full"
                onClick={() => console.log('Export unit sales data')}
              >
                <Download className="h-4 w-4 mr-2" />
                Export Data
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Unit Sales Performance Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <BarChart3 className="mr-2 h-5 w-5" />
            Unit Sales Performance
          </CardTitle>
          <CardDescription>
            Detailed sales analysis by product model
          </CardDescription>
        </CardHeader>
        <CardContent>
          <DataTable
            columns={unitSalesColumns}
            data={sortedData}
            loading={isLoading}
            searchPlaceholder="Search products..."
            onRowClick={(item) => {
              // Navigate to product detail page
              console.log('Product clicked:', item.itemName)
            }}
            onExport={() => {
              // Export unit sales data
              console.log('Export unit sales data')
            }}
          />
        </CardContent>
      </Card>

      {/* ASP Analysis */}
      {showASPAnalysis && aspAnalysis && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* Price Optimization Opportunities */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Target className="mr-2 h-5 w-5" />
                Price Optimization Opportunities
              </CardTitle>
              <CardDescription>
                Recommended pricing adjustments based on market analysis
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {aspAnalysis.priceOptimizationOpportunities.map((opportunity, index) => (
                <div key={index} className="p-4 border border-blue-200 bg-blue-50 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-sm font-medium text-blue-800">{opportunity.itemName}</h4>
                    <Badge variant={opportunity.confidence === 'high' ? 'default' : 'secondary'}>
                      {opportunity.confidence} confidence
                    </Badge>
                  </div>
                  <div className="grid grid-cols-2 gap-3 text-sm text-blue-700 mb-2">
                    <div>
                      <span className="font-medium">Current ASP:</span> {formatCurrency(opportunity.currentASP)}
                    </div>
                    <div>
                      <span className="font-medium">Recommended:</span> {formatCurrency(opportunity.recommendedASP)}
                    </div>
                    <div className="col-span-2">
                      <span className="font-medium">Potential Impact:</span> {formatCurrency(opportunity.potentialImpact)} annually
                    </div>
                  </div>
                  <p className="text-xs text-blue-600">{opportunity.reasoning}</p>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Competitive Analysis */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Eye className="mr-2 h-5 w-5" />
                Competitive Pricing Analysis
              </CardTitle>
              <CardDescription>
                Market positioning vs competitor pricing
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {aspAnalysis.competitiveAnalysis.map((analysis, index) => (
                <div key={index} className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">{analysis.model}</p>
                    <div className="flex items-center gap-2 mt-1">
                      {getPricePositionBadge(analysis.pricePosition)}
                      <span className="text-xs text-gray-500">
                        vs {formatCurrency(analysis.marketPrice)} market
                      </span>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium">{formatCurrency(analysis.ourPrice)}</p>
                    <p className="text-xs text-gray-500">
                      {((analysis.ourPrice - analysis.marketPrice) / analysis.marketPrice * 100).toFixed(1)}% diff
                    </p>
                  </div>
                </div>
              ))}

              <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                <h4 className="text-sm font-medium text-gray-800 mb-2">Overall ASP Trend</h4>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Current Period ASP:</span>
                  <span className="text-sm font-medium">{formatCurrency(aspAnalysis.currentPeriodASP)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Prior Period ASP:</span>
                  <span className="text-sm font-medium">{formatCurrency(aspAnalysis.priorPeriodASP)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Change:</span>
                  <div className="flex items-center gap-1">
                    {getGrowthIcon(aspAnalysis.aspChange)}
                    <span className={`text-sm font-medium ${getGrowthColor(aspAnalysis.aspChange)}`}>
                      {aspAnalysis.aspChange > 0 ? '+' : ''}{aspAnalysis.aspChange.toFixed(1)}%
                    </span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Monthly Sales Trends */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Calendar className="mr-2 h-5 w-5" />
            Monthly Sales Trends
          </CardTitle>
          <CardDescription>
            Unit sales and ASP trends by month for each product
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2">Product</th>
                  <th className="text-center py-2">Jul</th>
                  <th className="text-center py-2">Aug</th>
                  <th className="text-center py-2">Sep</th>
                  <th className="text-center py-2">Oct</th>
                  <th className="text-center py-2">Nov</th>
                  <th className="text-center py-2">Dec</th>
                  <th className="text-right py-2">Total</th>
                </tr>
              </thead>
              <tbody>
                {sortedData.map((item, index) => (
                  <tr key={index} className="border-b">
                    <td className="py-2">
                      <div>
                        <p className="font-medium">{item.itemName}</p>
                        <p className="text-xs text-gray-500">{item.category}</p>
                      </div>
                    </td>
                    {item.monthlySales.map((month, monthIndex) => (
                      <td key={monthIndex} className="text-center py-2">
                        <div>
                          <p className="font-medium">{month.units}</p>
                          <p className="text-xs text-gray-500">
                            {month.revenue > 0 ? formatCurrency(month.asp) : '-'}
                          </p>
                        </div>
                      </td>
                    ))}
                    <td className="text-right py-2">
                      <div>
                        <p className="font-medium">{item.unitsSoldYTD}</p>
                        <p className="text-xs text-gray-500">{formatCurrency(item.currentASP)}</p>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Customer Breakdown by Product */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {sortedData.slice(0, 2).map((product, productIndex) => (
          <Card key={productIndex}>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Users className="mr-2 h-5 w-5" />
                {product.itemName} - Customer Breakdown
              </CardTitle>
              <CardDescription>
                Customer purchases for this product model
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {product.customerBreakdown.length > 0 ? (
                product.customerBreakdown.map((customer, index) => (
                  <div key={index} className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium">{customer.customerName}</p>
                      <p className="text-xs text-gray-500">
                        Last order: {customer.lastOrderDate.toLocaleDateString()}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium">{customer.units} units</p>
                      <p className="text-xs text-gray-500">{formatCurrency(customer.revenue)}</p>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-4">
                  <Package className="mx-auto h-8 w-8 text-gray-400 mb-2" />
                  <p className="text-sm text-gray-500">No sales this period</p>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Performance Insights */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Activity className="mr-2 h-5 w-5" />
            Performance Insights
          </CardTitle>
          <CardDescription>
            Key insights and recommendations for Dr Dish distribution
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {/* Velocity Insight */}
            <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
              <div className="flex items-center mb-2">
                <CheckCircle className="mr-2 h-4 w-4 text-green-600" />
                <h4 className="text-sm font-medium text-green-800">Strong Velocity</h4>
              </div>
              <p className="text-xs text-green-700">
                Dr Dish Home model showing excellent velocity with 8 units sold. 
                Consider increasing inventory levels for this high-performing model.
              </p>
            </div>

            {/* ASP Opportunity */}
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-center mb-2">
                <Target className="mr-2 h-4 w-4 text-blue-600" />
                <h4 className="text-sm font-medium text-blue-800">ASP Opportunity</h4>
              </div>
              <p className="text-xs text-blue-700">
                Market analysis suggests potential for 5-10% ASP increase on Home and Rebel models 
                based on competitive positioning and demand strength.
              </p>
            </div>

            {/* Inventory Alert */}
            <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <div className="flex items-center mb-2">
                <AlertTriangle className="mr-2 h-4 w-4 text-yellow-600" />
                <h4 className="text-sm font-medium text-yellow-800">Elite Model Review</h4>
              </div>
              <p className="text-xs text-yellow-700">
                Dr Dish Elite has no sales this period. Consider promotional pricing, 
                customer demos, or inventory liquidation strategies.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
