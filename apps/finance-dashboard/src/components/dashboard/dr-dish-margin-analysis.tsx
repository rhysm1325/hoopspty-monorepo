'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { DataTable } from '@/components/ui/data-table'
import { 
  PieChart, 
  TrendingUp, 
  TrendingDown, 
  Target, 
  BarChart3,
  DollarSign,
  Package,
  AlertTriangle,
  CheckCircle,
  RefreshCw,
  Download,
  Filter,
  Eye,
  Activity,
  Calculator
} from 'lucide-react'
import { formatCurrency, formatPercentage } from '@/utils/financial'

interface ProductMarginData {
  itemCode: string
  itemName: string
  model: string
  category: string
  unitsSold: number
  totalRevenue: number
  totalCOGS: number
  grossMargin: number
  grossMarginPercent: number
  averageSellingPrice: number
  averageCost: number
  marginPerUnit: number
  targetMarginPercent: number
  marginVariance: number
  marginTrend: 'improving' | 'declining' | 'stable'
  marginTrendPercent: number
  costBreakdown: {
    productCost: number
    shippingCost: number
    handlingCost: number
    warrantyReserve: number
    otherCosts: number
  }
  priceHistory: Array<{
    date: Date
    sellingPrice: number
    cost: number
    marginPercent: number
  }>
  competitorComparison: {
    ourPrice: number
    competitorAvgPrice: number
    pricePosition: 'premium' | 'competitive' | 'discount'
    marketShareImpact: number
  }
}

interface MarginAnalysisSummary {
  overallGrossMargin: number
  overallGrossMarginPercent: number
  weightedAverageMargin: number
  marginTrend: 'improving' | 'declining' | 'stable'
  marginTrendPercent: number
  bestPerformingModel: string
  worstPerformingModel: string
  marginOpportunities: Array<{
    model: string
    currentMargin: number
    potentialMargin: number
    potentialImpact: number
    actionRequired: string
  }>
  costPressures: Array<{
    model: string
    costCategory: string
    impact: number
    trend: 'increasing' | 'decreasing' | 'stable'
  }>
}

interface DrDishMarginAnalysisProps {
  className?: string
  showDetailedBreakdown?: boolean
  refreshInterval?: number
}

export function DrDishMarginAnalysis({ 
  className,
  showDetailedBreakdown = true,
  refreshInterval = 300000 // 5 minutes
}: DrDishMarginAnalysisProps) {
  const [marginData, setMarginData] = useState<ProductMarginData[]>([])
  const [summary, setSummary] = useState<MarginAnalysisSummary | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date())
  const [selectedModel, setSelectedModel] = useState<string>('all')
  const [viewMode, setViewMode] = useState<'summary' | 'detailed' | 'trends'>('summary')

  useEffect(() => {
    loadMarginData()
    
    // Set up refresh interval
    const interval = setInterval(loadMarginData, refreshInterval)
    return () => clearInterval(interval)
  }, [refreshInterval, selectedModel])

  const loadMarginData = async () => {
    setIsLoading(true)
    
    try {
      // Simulate API call - replace with actual server actions
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      // Sample product margin data
      setMarginData([
        {
          itemCode: 'DRDISH-HOME',
          itemName: 'Dr Dish Home Basketball Machine',
          model: 'Home',
          category: 'Home/Consumer',
          unitsSold: 8,
          totalRevenue: 120000,
          totalCOGS: 69000,
          grossMargin: 51000,
          grossMarginPercent: 42.5,
          averageSellingPrice: 15000,
          averageCost: 8625,
          marginPerUnit: 6375,
          targetMarginPercent: 45.0,
          marginVariance: -2.5,
          marginTrend: 'stable',
          marginTrendPercent: 0.2,
          costBreakdown: {
            productCost: 7500,
            shippingCost: 800,
            handlingCost: 200,
            warrantyReserve: 100,
            otherCosts: 25,
          },
          priceHistory: [
            { date: new Date('2024-01-01'), sellingPrice: 15000, cost: 8500, marginPercent: 43.3 },
            { date: new Date('2024-04-01'), sellingPrice: 15000, cost: 8600, marginPercent: 42.7 },
            { date: new Date('2024-07-01'), sellingPrice: 15000, cost: 8625, marginPercent: 42.5 },
          ],
          competitorComparison: {
            ourPrice: 15000,
            competitorAvgPrice: 16200,
            pricePosition: 'discount',
            marketShareImpact: 15.2,
          },
        },
        {
          itemCode: 'DRDISH-PRO',
          itemName: 'Dr Dish Pro Basketball Machine',
          model: 'Pro',
          category: 'Professional',
          unitsSold: 3,
          totalRevenue: 75000,
          totalCOGS: 41100,
          grossMargin: 33900,
          grossMarginPercent: 45.2,
          averageSellingPrice: 25000,
          averageCost: 13700,
          marginPerUnit: 11300,
          targetMarginPercent: 48.0,
          marginVariance: -2.8,
          marginTrend: 'declining',
          marginTrendPercent: -1.8,
          costBreakdown: {
            productCost: 12000,
            shippingCost: 1200,
            handlingCost: 300,
            warrantyReserve: 150,
            otherCosts: 50,
          },
          priceHistory: [
            { date: new Date('2024-01-01'), sellingPrice: 25000, cost: 13200, marginPercent: 47.2 },
            { date: new Date('2024-04-01'), sellingPrice: 25000, cost: 13500, marginPercent: 46.0 },
            { date: new Date('2024-07-01'), sellingPrice: 25000, cost: 13700, marginPercent: 45.2 },
          ],
          competitorComparison: {
            ourPrice: 25000,
            competitorAvgPrice: 24500,
            pricePosition: 'premium',
            marketShareImpact: -3.5,
          },
        },
        {
          itemCode: 'DRDISH-REBEL',
          itemName: 'Dr Dish Rebel Basketball Machine',
          model: 'Rebel',
          category: 'Intermediate',
          unitsSold: 2,
          totalRevenue: 32000,
          totalCOGS: 19600,
          grossMargin: 12400,
          grossMarginPercent: 38.8,
          averageSellingPrice: 16000,
          averageCost: 9800,
          marginPerUnit: 6200,
          targetMarginPercent: 42.0,
          marginVariance: -3.2,
          marginTrend: 'improving',
          marginTrendPercent: 2.1,
          costBreakdown: {
            productCost: 8500,
            shippingCost: 900,
            handlingCost: 250,
            warrantyReserve: 125,
            otherCosts: 25,
          },
          priceHistory: [
            { date: new Date('2024-01-01'), sellingPrice: 15000, cost: 9500, marginPercent: 36.7 },
            { date: new Date('2024-04-01'), sellingPrice: 15500, cost: 9650, marginPercent: 37.7 },
            { date: new Date('2024-07-01'), sellingPrice: 16000, cost: 9800, marginPercent: 38.8 },
          ],
          competitorComparison: {
            ourPrice: 16000,
            competitorAvgPrice: 17000,
            pricePosition: 'competitive',
            marketShareImpact: 8.3,
          },
        },
      ])

      // Sample margin analysis summary
      setSummary({
        overallGrossMargin: 97300,
        overallGrossMarginPercent: 42.8,
        weightedAverageMargin: 43.1,
        marginTrend: 'stable',
        marginTrendPercent: 0.3,
        bestPerformingModel: 'Dr Dish Pro',
        worstPerformingModel: 'Dr Dish Rebel',
        marginOpportunities: [
          {
            model: 'Dr Dish Home',
            currentMargin: 42.5,
            potentialMargin: 45.0,
            potentialImpact: 3750,
            actionRequired: 'Optimize shipping costs and negotiate better supplier terms',
          },
          {
            model: 'Dr Dish Rebel',
            currentMargin: 38.8,
            potentialMargin: 42.0,
            potentialImpact: 6400,
            actionRequired: 'Increase selling price and review warranty reserve allocation',
          },
        ],
        costPressures: [
          {
            model: 'Dr Dish Pro',
            costCategory: 'Product Cost',
            impact: 1.8,
            trend: 'increasing',
          },
          {
            model: 'All Models',
            costCategory: 'Shipping Cost',
            impact: 0.5,
            trend: 'increasing',
          },
        ],
      })

      setLastRefresh(new Date())
    } catch (error) {
      console.error('Failed to load Dr Dish margin data:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleRefresh = () => {
    loadMarginData()
  }

  const getMarginColor = (marginPercent: number, target: number) => {
    if (marginPercent >= target) return 'text-green-600'
    if (marginPercent >= target * 0.9) return 'text-yellow-600'
    return 'text-red-600'
  }

  const getTrendIcon = (trend: 'improving' | 'declining' | 'stable') => {
    switch (trend) {
      case 'improving':
        return <TrendingUp className="h-3 w-3 text-green-500" />
      case 'declining':
        return <TrendingDown className="h-3 w-3 text-red-500" />
      default:
        return <Target className="h-3 w-3 text-gray-500" />
    }
  }

  const getTrendColor = (trend: 'improving' | 'declining' | 'stable') => {
    switch (trend) {
      case 'improving':
        return 'text-green-600'
      case 'declining':
        return 'text-red-600'
      default:
        return 'text-gray-600'
    }
  }

  const getVarianceBadge = (variance: number) => {
    if (variance >= 0) return <Badge variant="default" className="bg-green-100 text-green-800">Above Target</Badge>
    if (variance >= -2) return <Badge variant="default" className="bg-yellow-100 text-yellow-800">Near Target</Badge>
    return <Badge variant="destructive">Below Target</Badge>
  }

  // Column definitions for margin analysis table
  const marginColumns = [
    {
      key: 'itemName',
      title: 'Product',
      sortable: true,
      type: 'text' as const,
    },
    {
      key: 'unitsSold',
      title: 'Units',
      sortable: true,
      type: 'number' as const,
      align: 'right' as const,
    },
    {
      key: 'totalRevenue',
      title: 'Revenue',
      sortable: true,
      type: 'currency' as const,
      align: 'right' as const,
    },
    {
      key: 'totalCOGS',
      title: 'COGS',
      sortable: true,
      type: 'currency' as const,
      align: 'right' as const,
    },
    {
      key: 'grossMargin',
      title: 'Gross Margin',
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
      key: 'marginVariance',
      title: 'vs Target',
      sortable: true,
      type: 'number' as const,
      align: 'right' as const,
    },
    {
      key: 'marginTrend',
      title: 'Trend',
      type: 'text' as const,
    },
  ]

  // Filter data based on selected model
  const filteredData = selectedModel === 'all' 
    ? marginData 
    : marginData.filter(item => item.model.toLowerCase().includes(selectedModel.toLowerCase()))

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Summary Cards */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {/* Overall Gross Margin */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center">
              <PieChart className="mr-2 h-4 w-4" />
              Overall Margin
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <p className="text-2xl font-bold">
                {summary?.overallGrossMarginPercent.toFixed(1)}%
              </p>
              <div className="flex items-center gap-1">
                {getTrendIcon(summary?.marginTrend || 'stable')}
                <span className={`text-sm ${getTrendColor(summary?.marginTrend || 'stable')}`}>
                  {summary?.marginTrendPercent !== undefined ? 
                    `${summary.marginTrendPercent > 0 ? '+' : ''}${summary.marginTrendPercent.toFixed(1)}%` : 
                    'Stable'
                  } trend
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Best Performing */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center">
              <TrendingUp className="mr-2 h-4 w-4" />
              Best Performer
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <p className="text-lg font-bold">{summary?.bestPerformingModel}</p>
              <p className="text-sm text-green-600">
                {marginData.find(m => m.model === summary?.bestPerformingModel)?.grossMarginPercent.toFixed(1)}% margin
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Improvement Opportunities */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center">
              <Target className="mr-2 h-4 w-4" />
              Opportunities
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <p className="text-2xl font-bold">{summary?.marginOpportunities.length || 0}</p>
              <p className="text-sm text-blue-600">
                {formatCurrency(summary?.marginOpportunities.reduce((sum, opp) => sum + opp.potentialImpact, 0) || 0)} potential
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Cost Pressures */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center">
              <AlertTriangle className="mr-2 h-4 w-4" />
              Cost Pressures
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <p className="text-2xl font-bold">{summary?.costPressures.length || 0}</p>
              <p className="text-sm text-red-600">
                {summary?.costPressures.filter(cp => cp.trend === 'increasing').length || 0} increasing
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* View Mode Controls */}
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
              <label className="block text-sm font-medium text-gray-700 mb-1">View Mode</label>
              <select
                value={viewMode}
                onChange={(e) => setViewMode(e.target.value as 'summary' | 'detailed' | 'trends')}
                className="w-full rounded-md border-gray-300 text-sm"
              >
                <option value="summary">Summary View</option>
                <option value="detailed">Detailed Breakdown</option>
                <option value="trends">Trend Analysis</option>
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
                Refresh
              </Button>
            </div>

            <div className="flex items-end">
              <Button
                variant="outline"
                size="sm"
                className="w-full"
                onClick={() => console.log('Export margin analysis')}
              >
                <Download className="h-4 w-4 mr-2" />
                Export
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Margin Analysis Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <BarChart3 className="mr-2 h-5 w-5" />
            Gross Margin Analysis by Product Model
          </CardTitle>
          <CardDescription>
            Detailed margin breakdown and performance vs targets
          </CardDescription>
        </CardHeader>
        <CardContent>
          <DataTable
            columns={marginColumns}
            data={filteredData}
            loading={isLoading}
            searchPlaceholder="Search products..."
            onRowClick={(item) => {
              // Navigate to detailed product margin page
              console.log('Product margin clicked:', item.itemName)
            }}
            onExport={() => {
              // Export margin analysis data
              console.log('Export margin analysis data')
            }}
          />
        </CardContent>
      </Card>

      {/* Detailed Breakdown Views */}
      {showDetailedBreakdown && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* Cost Breakdown Analysis */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Calculator className="mr-2 h-5 w-5" />
                Cost Breakdown Analysis
              </CardTitle>
              <CardDescription>
                Average cost composition across all models
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {marginData.length > 0 && (
                  <div className="space-y-3">
                    {Object.entries(marginData[0].costBreakdown).map(([category, amount]) => {
                      const totalCost = Object.values(marginData[0].costBreakdown).reduce((sum, val) => sum + val, 0)
                      const percentage = totalCost > 0 ? (amount / totalCost) * 100 : 0
                      
                      return (
                        <div key={category} className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div className={`h-3 w-3 rounded-full ${
                              category === 'productCost' ? 'bg-blue-500' :
                              category === 'shippingCost' ? 'bg-orange-500' :
                              category === 'handlingCost' ? 'bg-green-500' :
                              category === 'warrantyReserve' ? 'bg-purple-500' : 'bg-gray-500'
                            }`}></div>
                            <span className="text-sm font-medium capitalize">
                              {category.replace(/([A-Z])/g, ' $1').toLowerCase()}
                            </span>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-medium">{formatCurrency(amount)}</p>
                            <p className="text-xs text-gray-500">{percentage.toFixed(1)}%</p>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}

                <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                  <h4 className="text-sm font-medium text-gray-800 mb-2">Cost Optimization Insights</h4>
                  <div className="text-xs text-gray-700 space-y-1">
                    <p>• Product costs represent 85-90% of total COGS</p>
                    <p>• Shipping costs averaging 8-10% - negotiate volume discounts</p>
                    <p>• Warranty reserves at 1-2% appear adequate based on claims history</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Margin Improvement Opportunities */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Target className="mr-2 h-5 w-5" />
                Margin Improvement Opportunities
              </CardTitle>
              <CardDescription>
                Actionable recommendations to improve gross margins
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {summary?.marginOpportunities.map((opportunity, index) => (
                <div key={index} className="p-4 border border-blue-200 bg-blue-50 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-sm font-medium text-blue-800">{opportunity.model}</h4>
                    <Badge variant="outline">
                      +{(opportunity.potentialMargin - opportunity.currentMargin).toFixed(1)}% potential
                    </Badge>
                  </div>
                  <div className="grid grid-cols-2 gap-3 text-sm text-blue-700 mb-2">
                    <div>
                      <span className="font-medium">Current:</span> {opportunity.currentMargin.toFixed(1)}%
                    </div>
                    <div>
                      <span className="font-medium">Potential:</span> {opportunity.potentialMargin.toFixed(1)}%
                    </div>
                    <div className="col-span-2">
                      <span className="font-medium">Annual Impact:</span> {formatCurrency(opportunity.potentialImpact)}
                    </div>
                  </div>
                  <p className="text-xs text-blue-600">{opportunity.actionRequired}</p>
                </div>
              ))}

              {summary?.costPressures && summary.costPressures.length > 0 && (
                <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                  <h4 className="text-sm font-medium text-red-800 mb-2 flex items-center">
                    <AlertTriangle className="mr-1 h-4 w-4" />
                    Cost Pressure Alerts
                  </h4>
                  <div className="space-y-1">
                    {summary.costPressures.map((pressure, index) => (
                      <div key={index} className="flex items-center justify-between text-sm">
                        <span className="text-red-700">{pressure.model} - {pressure.costCategory}</span>
                        <div className="flex items-center gap-1">
                          {getTrendIcon(pressure.trend)}
                          <span className="text-red-800 font-medium">+{pressure.impact.toFixed(1)}%</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Price History Trends */}
      {viewMode === 'trends' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Activity className="mr-2 h-5 w-5" />
              Margin Trend Analysis
            </CardTitle>
            <CardDescription>
              Historical margin performance and price/cost evolution
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              {filteredData.slice(0, 2).map((product, index) => (
                <div key={index} className="space-y-4">
                  <h4 className="text-lg font-medium">{product.itemName}</h4>
                  
                  <div className="space-y-3">
                    {product.priceHistory.map((history, historyIndex) => (
                      <div key={historyIndex} className="flex items-center justify-between p-3 border rounded-lg">
                        <div>
                          <p className="text-sm font-medium">{history.date.toLocaleDateString()}</p>
                          <p className="text-xs text-gray-500">Selling Price: {formatCurrency(history.sellingPrice)}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-medium">{history.marginPercent.toFixed(1)}%</p>
                          <p className="text-xs text-gray-500">Cost: {formatCurrency(history.cost)}</p>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="p-3 bg-gray-50 rounded-lg">
                    <h5 className="text-sm font-medium text-gray-800 mb-2">Competitive Position</h5>
                    <div className="text-xs text-gray-700 space-y-1">
                      <div className="flex justify-between">
                        <span>Our Price:</span>
                        <span>{formatCurrency(product.competitorComparison.ourPrice)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Market Avg:</span>
                        <span>{formatCurrency(product.competitorComparison.competitorAvgPrice)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Position:</span>
                        <span className="capitalize">{product.competitorComparison.pricePosition}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Market Share Impact:</span>
                        <span className={`${product.competitorComparison.marketShareImpact > 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {product.competitorComparison.marketShareImpact > 0 ? '+' : ''}{product.competitorComparison.marketShareImpact.toFixed(1)}%
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Strategic Recommendations */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Eye className="mr-2 h-5 w-5" />
            Strategic Recommendations
          </CardTitle>
          <CardDescription>
            Data-driven recommendations for margin optimization
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {/* Price Increase Opportunity */}
            <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
              <div className="flex items-center mb-2">
                <TrendingUp className="mr-2 h-4 w-4 text-green-600" />
                <h4 className="text-sm font-medium text-green-800">Price Optimization</h4>
              </div>
              <p className="text-xs text-green-700">
                Dr Dish Home is priced below market average. Consider 3-5% price increase 
                to improve margins while maintaining competitive advantage.
              </p>
            </div>

            {/* Cost Reduction */}
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-center mb-2">
                <Calculator className="mr-2 h-4 w-4 text-blue-600" />
                <h4 className="text-sm font-medium text-blue-800">Cost Optimization</h4>
              </div>
              <p className="text-xs text-blue-700">
                Shipping costs are increasing across all models. Negotiate volume discounts 
                or explore alternative logistics partners to reduce COGS by 1-2%.
              </p>
            </div>

            {/* Product Mix */}
            <div className="p-4 bg-purple-50 border border-purple-200 rounded-lg">
              <div className="flex items-center mb-2">
                <PieChart className="mr-2 h-4 w-4 text-purple-600" />
                <h4 className="text-sm font-medium text-purple-800">Product Mix Strategy</h4>
              </div>
              <p className="text-xs text-purple-700">
                Focus sales efforts on Dr Dish Pro (highest margin) and Home (highest volume) 
                models. Consider discontinuing slow-moving Elite model.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

