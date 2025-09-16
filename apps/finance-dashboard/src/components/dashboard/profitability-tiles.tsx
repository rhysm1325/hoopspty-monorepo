'use client'

import { useState, useEffect } from 'react'
import { LineChart, Line, XAxis, YAxis, ResponsiveContainer, Tooltip } from 'recharts'
import { MetricTile } from '@/components/ui/metric-tile'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  TrendingUp,
  TrendingDown,
  PieChart,
  BarChart3,
  Target,
  AlertTriangle,
  CheckCircle,
  RefreshCw,
  Eye,
  Calculator,
  Percent,
} from 'lucide-react'
import { formatCurrency, formatPercentage } from '@/utils/financial'
import type { RevenueStream } from '@/types'

interface MarginData {
  revenueStream: RevenueStream
  grossRevenue: number
  cogs: number
  grossMargin: number
  grossMarginPercent: number
  targetMarginPercent: number
  variancePercent: number
  trend: 'improving' | 'declining' | 'stable'
  trendPercent: number
}

interface NetProfitData {
  netProfit: number
  netProfitPercent: number
  grossProfit: number
  totalExpenses: number
  ebitda: number
  ebitdaPercent: number
  priorPeriodNetProfit: number
  changePercent: number
  trend: 'improving' | 'declining' | 'stable'
  monthlyTrend: number[]
  targetNetProfitPercent: number
}

interface ProfitabilityData {
  grossMarginData: MarginData[]
  netProfitData: NetProfitData
  overallMetrics: {
    totalGrossMargin: number
    totalGrossMarginPercent: number
    totalNetProfit: number
    totalNetProfitPercent: number
    marginTrend: Array<{
      period: string
      grossMargin: number
      netProfit: number
    }>
  }
  lastUpdated: Date
}

interface ProfitabilityTilesProps {
  showTrends?: boolean
  refreshInterval?: number
  className?: string
}

export function ProfitabilityTiles({ 
  showTrends = true, 
  refreshInterval = 300000, // 5 minutes
  className 
}: ProfitabilityTilesProps) {
  const [profitabilityData, setProfitabilityData] = useState<ProfitabilityData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedMetric, setSelectedMetric] = useState<'gross' | 'net'>('gross')

  useEffect(() => {
    loadProfitabilityData()
    
    // Set up auto-refresh
    const interval = setInterval(() => {
      loadProfitabilityData()
    }, refreshInterval)
    
    return () => clearInterval(interval)
  }, [refreshInterval])

  const loadProfitabilityData = async () => {
    setIsLoading(true)
    setError(null)

    try {
      // In real implementation, this would call margin analysis from calculations engine
      // For now, simulate with sample data
      await new Promise(resolve => setTimeout(resolve, 600))

      // Sample margin data by revenue stream
      const grossMarginData: MarginData[] = [
        {
          revenueStream: 'tours',
          grossRevenue: 266963,
          cogs: 15800, // Low COGS for service business
          grossMargin: 251163,
          grossMarginPercent: 94.1,
          targetMarginPercent: 92.0,
          variancePercent: 2.3,
          trend: 'improving',
          trendPercent: 1.8,
        },
        {
          revenueStream: 'dr-dish',
          grossRevenue: 16682,
          cogs: 8900, // Higher COGS for product sales
          grossMargin: 7782,
          grossMarginPercent: 46.7,
          targetMarginPercent: 45.0,
          variancePercent: 3.8,
          trend: 'stable',
          trendPercent: 0.2,
        },
        {
          revenueStream: 'marketing',
          grossRevenue: 15600,
          cogs: 2400, // Low COGS for marketing revenue
          grossMargin: 13200,
          grossMarginPercent: 84.6,
          targetMarginPercent: 80.0,
          variancePercent: 5.8,
          trend: 'improving',
          trendPercent: 4.2,
        },
        {
          revenueStream: 'other',
          grossRevenue: 2808,
          cogs: 500,
          grossMargin: 2308,
          grossMarginPercent: 82.2,
          targetMarginPercent: 75.0,
          variancePercent: 9.6,
          trend: 'improving',
          trendPercent: 2.1,
        },
      ]

      // Calculate overall totals
      const totalGrossRevenue = grossMarginData.reduce((sum, data) => sum + data.grossRevenue, 0)
      const totalCogs = grossMarginData.reduce((sum, data) => sum + data.cogs, 0)
      const totalGrossMargin = totalGrossRevenue - totalCogs
      const totalGrossMarginPercent = totalGrossRevenue > 0 ? (totalGrossMargin / totalGrossRevenue) * 100 : 0

      // Sample net profit data
      const netProfitData: NetProfitData = {
        netProfit: 45680,
        netProfitPercent: 15.1,
        grossProfit: totalGrossMargin,
        totalExpenses: totalGrossMargin - 45680,
        ebitda: 52300,
        ebitdaPercent: 17.3,
        priorPeriodNetProfit: 38920,
        changePercent: 17.4,
        trend: 'improving',
        monthlyTrend: [35000, 37500, 39200, 42100, 44800, 45680], // Last 6 months
        targetNetProfitPercent: 14.0,
      }

      // Sample margin trends over time
      const marginTrend = [
        { period: 'Q1', grossMargin: 92.8, netProfit: 13.2 },
        { period: 'Q2', grossMargin: 93.5, netProfit: 14.1 },
        { period: 'Q3', grossMargin: 93.9, netProfit: 14.8 },
        { period: 'Q4', grossMargin: 94.1, netProfit: 15.1 },
      ]

      setProfitabilityData({
        grossMarginData,
        netProfitData,
        overallMetrics: {
          totalGrossMargin,
          totalGrossMarginPercent,
          totalNetProfit: netProfitData.netProfit,
          totalNetProfitPercent: netProfitData.netProfitPercent,
          marginTrend,
        },
        lastUpdated: new Date(),
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load profitability data')
    } finally {
      setIsLoading(false)
    }
  }

  const handleRefresh = () => {
    setIsLoading(true)
    loadProfitabilityData()
  }

  const getTrendIcon = (trend: 'improving' | 'declining' | 'stable', trendPercent?: number) => {
    if (trend === 'improving') {
      return <TrendingUp className="h-4 w-4 text-green-600" />
    } else if (trend === 'declining') {
      return <TrendingDown className="h-4 w-4 text-red-600" />
    }
    return <Target className="h-4 w-4 text-gray-600" />
  }

  const getTrendColor = (trend: 'improving' | 'declining' | 'stable') => {
    if (trend === 'improving') return 'text-green-600'
    if (trend === 'declining') return 'text-red-600'
    return 'text-gray-600'
  }

  const getVarianceColor = (variancePercent: number) => {
    if (variancePercent > 5) return 'text-green-600'
    if (variancePercent > 0) return 'text-green-500'
    if (variancePercent > -5) return 'text-red-500'
    return 'text-red-600'
  }

  const getPerformanceStatus = (actual: number, target: number) => {
    const variance = actual - target
    if (variance > 2) return { status: 'excellent', color: 'text-green-600', icon: <CheckCircle className="h-4 w-4" /> }
    if (variance > 0) return { status: 'good', color: 'text-green-500', icon: <CheckCircle className="h-4 w-4" /> }
    if (variance > -2) return { status: 'warning', color: 'text-amber-600', icon: <AlertTriangle className="h-4 w-4" /> }
    return { status: 'poor', color: 'text-red-600', icon: <AlertTriangle className="h-4 w-4" /> }
  }

  // Mini trend chart component
  const MiniTrendChart = ({ data, color = '#3b82f6' }: { data: number[], color?: string }) => (
    <div className="h-12 w-20">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data.map((value, index) => ({ value, index }))}>
          <Line
            type="monotone"
            dataKey="value"
            stroke={color}
            strokeWidth={2}
            dot={false}
            strokeDasharray="0"
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )

  if (error) {
    return (
      <div className={className}>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center text-red-600">
              <Calculator className="mx-auto h-8 w-8" />
              <p className="mt-2 text-sm">{error}</p>
              <Button variant="outline" size="sm" onClick={handleRefresh} className="mt-2">
                Try Again
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Gross Margin and Net Profit KPI Tiles */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        {/* Gross Margin Tile */}
        <MetricTile
          title="Gross Margin"
          value={profitabilityData ? `${profitabilityData.overallMetrics.totalGrossMarginPercent.toFixed(1)}%` : '0%'}
          isLoading={isLoading}
          change={{
            value: profitabilityData ? `${profitabilityData.grossMarginData[0]?.variancePercent > 0 ? '+' : ''}${profitabilityData.grossMarginData[0]?.variancePercent.toFixed(1)}%` : '',
            type: profitabilityData && profitabilityData.grossMarginData[0]?.variancePercent > 0 ? 'positive' : 'negative',
            label: 'vs target',
          }}
          icon={<PieChart className="h-5 w-5" />}
          onClick={() => setSelectedMetric('gross')}
        />

        {/* Net Profit Tile */}
        <MetricTile
          title="Net Profit"
          value={profitabilityData?.netProfitData.netProfit || 0}
          currency
          isLoading={isLoading}
          change={{
            value: profitabilityData ? `${profitabilityData.netProfitData.changePercent > 0 ? '+' : ''}${profitabilityData.netProfitData.changePercent.toFixed(1)}%` : '',
            type: profitabilityData && profitabilityData.netProfitData.changePercent > 0 ? 'positive' : 'negative',
            label: 'vs last FY',
          }}
          icon={<BarChart3 className="h-5 w-5" />}
          onClick={() => setSelectedMetric('net')}
        />
      </div>

      {/* Detailed Profitability Analysis */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Gross Margin Analysis by Revenue Stream */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center">
                  <PieChart className="mr-2 h-5 w-5" />
                  Gross Margin by Stream
                </CardTitle>
                <CardDescription>
                  Margin analysis across revenue streams
                </CardDescription>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleRefresh}
                disabled={isLoading}
              >
                <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
              </Button>
            </div>
          </CardHeader>
          
          <CardContent className="space-y-4">
            {isLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="h-16 w-full animate-pulse rounded bg-gray-200" />
                ))}
              </div>
            ) : profitabilityData ? (
              <>
                {profitabilityData.grossMarginData.map((margin, index) => {
                  const performance = getPerformanceStatus(margin.grossMarginPercent, margin.targetMarginPercent)
                  
                  return (
                    <div key={index} className="rounded-lg border p-4">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <div 
                            className="h-3 w-3 rounded-full"
                            style={{ 
                              backgroundColor: margin.revenueStream === 'tours' ? '#22c55e' :
                                             margin.revenueStream === 'dr-dish' ? '#3b82f6' :
                                             margin.revenueStream === 'marketing' ? '#f59e0b' : '#6b7280'
                            }}
                          />
                          <span className="text-sm font-medium capitalize">
                            {margin.revenueStream.replace('-', ' ')}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          {performance.icon}
                          <Badge 
                            variant={performance.status === 'excellent' || performance.status === 'good' ? 'default' : 'destructive'}
                            className="text-xs"
                          >
                            {performance.status}
                          </Badge>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <p className="text-xs text-gray-500">Gross Margin</p>
                          <p className="text-lg font-bold">
                            {margin.grossMarginPercent.toFixed(1)}%
                          </p>
                          <p className="text-xs text-gray-600">
                            {formatCurrency(margin.grossMargin)}
                          </p>
                        </div>
                        
                        <div>
                          <p className="text-xs text-gray-500">vs Target</p>
                          <div className="flex items-center gap-1">
                            <span className={`text-lg font-bold ${getVarianceColor(margin.variancePercent)}`}>
                              {margin.variancePercent > 0 ? '+' : ''}{margin.variancePercent.toFixed(1)}%
                            </span>
                            {getTrendIcon(margin.trend, margin.trendPercent)}
                          </div>
                          <p className="text-xs text-gray-600">
                            Target: {margin.targetMarginPercent.toFixed(1)}%
                          </p>
                        </div>
                      </div>

                      {showTrends && (
                        <div className="mt-3 flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-gray-500">Trend:</span>
                            <span className={`text-xs font-medium ${getTrendColor(margin.trend)}`}>
                              {margin.trend} ({margin.trendPercent > 0 ? '+' : ''}{margin.trendPercent.toFixed(1)}%)
                            </span>
                          </div>
                          <MiniTrendChart 
                            data={[92.1, 92.8, 93.2, 93.7, 94.0, margin.grossMarginPercent]} 
                            color={margin.trend === 'improving' ? '#22c55e' : margin.trend === 'declining' ? '#ef4444' : '#6b7280'}
                          />
                        </div>
                      )}
                    </div>
                  )
                })}
              </>
            ) : null}
          </CardContent>
        </Card>

        {/* Net Profit Analysis */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center">
                  <BarChart3 className="mr-2 h-5 w-5" />
                  Net Profit Analysis
                </CardTitle>
                <CardDescription>
                  Bottom-line profitability and trends
                </CardDescription>
              </div>
              <Button variant="outline" size="sm">
                <Eye className="mr-2 h-4 w-4" />
                P&L Detail
              </Button>
            </div>
          </CardHeader>
          
          <CardContent className="space-y-4">
            {isLoading ? (
              <div className="space-y-3">
                <div className="h-20 w-full animate-pulse rounded bg-gray-200" />
                <div className="h-16 w-full animate-pulse rounded bg-gray-200" />
                <div className="h-12 w-full animate-pulse rounded bg-gray-200" />
              </div>
            ) : profitabilityData ? (
              <>
                {/* Net Profit Summary */}
                <div className="rounded-lg border p-4">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm font-medium text-gray-500">Net Profit</span>
                    <div className="flex items-center gap-2">
                      {getTrendIcon(profitabilityData.netProfitData.trend)}
                      <Badge variant="default" className="text-xs">
                        {profitabilityData.netProfitData.trend}
                      </Badge>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-2xl font-bold">
                        {formatCurrency(profitabilityData.netProfitData.netProfit)}
                      </p>
                      <p className="text-sm text-gray-600">
                        {profitabilityData.netProfitData.netProfitPercent.toFixed(1)}% of revenue
                      </p>
                    </div>
                    
                    <div>
                      <p className={`text-lg font-bold ${getVarianceColor(profitabilityData.netProfitData.changePercent)}`}>
                        {profitabilityData.netProfitData.changePercent > 0 ? '+' : ''}{profitabilityData.netProfitData.changePercent.toFixed(1)}%
                      </p>
                      <p className="text-sm text-gray-600">
                        vs {formatCurrency(profitabilityData.netProfitData.priorPeriodNetProfit)}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Profit Breakdown */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Gross Profit</span>
                    <span className="text-sm font-medium">
                      {formatCurrency(profitabilityData.netProfitData.grossProfit)}
                    </span>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Total Expenses</span>
                    <span className="text-sm font-medium text-red-600">
                      ({formatCurrency(profitabilityData.netProfitData.totalExpenses)})
                    </span>
                  </div>
                  
                  <div className="flex items-center justify-between border-t pt-2">
                    <span className="text-sm font-medium">Net Profit</span>
                    <span className="text-sm font-bold">
                      {formatCurrency(profitabilityData.netProfitData.netProfit)}
                    </span>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <span className="text-sm">EBITDA</span>
                    <span className="text-sm font-medium">
                      {formatCurrency(profitabilityData.netProfitData.ebitda)}
                    </span>
                  </div>
                </div>

                {/* Monthly Trend */}
                {showTrends && (
                  <div>
                    <h5 className="mb-2 text-sm font-medium">6-Month Trend</h5>
                    <MiniTrendChart 
                      data={profitabilityData.netProfitData.monthlyTrend}
                      color={profitabilityData.netProfitData.trend === 'improving' ? '#22c55e' : '#ef4444'}
                    />
                  </div>
                )}

                {/* Performance vs Target */}
                <div className="rounded-lg bg-blue-50 p-3">
                  <div className="flex items-center gap-2 mb-1">
                    <Target className="h-4 w-4 text-blue-600" />
                    <span className="text-sm font-medium text-blue-800">Target Performance</span>
                  </div>
                  <p className="text-sm text-blue-700">
                    Net profit margin is {profitabilityData.netProfitData.netProfitPercent.toFixed(1)}% vs target of {profitabilityData.netProfitData.targetNetProfitPercent.toFixed(1)}%
                  </p>
                  <p className="text-xs text-blue-600 mt-1">
                    {profitabilityData.netProfitData.netProfitPercent > profitabilityData.netProfitData.targetNetProfitPercent 
                      ? `Exceeding target by ${(profitabilityData.netProfitData.netProfitPercent - profitabilityData.netProfitData.targetNetProfitPercent).toFixed(1)}%`
                      : `Below target by ${(profitabilityData.netProfitData.targetNetProfitPercent - profitabilityData.netProfitData.netProfitPercent).toFixed(1)}%`
                    }
                  </p>
                </div>
              </>
            ) : null}
          </CardContent>
        </Card>
      </div>

      {/* Profitability Trends Chart */}
      {showTrends && profitabilityData && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <TrendingUp className="mr-2 h-5 w-5" />
              Profitability Trends
            </CardTitle>
            <CardDescription>
              Quarterly gross margin and net profit trends
            </CardDescription>
          </CardHeader>
          
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={profitabilityData.overallMetrics.marginTrend}>
                  <XAxis dataKey="period" stroke="#666" fontSize={12} />
                  <YAxis stroke="#666" fontSize={12} />
                  <Tooltip
                    content={({ active, payload, label }) => {
                      if (active && payload && payload.length) {
                        return (
                          <div className="rounded-lg border bg-white p-3 shadow-lg">
                            <p className="font-medium">{label}</p>
                            <div className="mt-2 space-y-1">
                              <p className="text-sm">
                                <span className="text-green-600">Gross Margin: </span>
                                {payload[0]?.value?.toFixed(1)}%
                              </p>
                              <p className="text-sm">
                                <span className="text-blue-600">Net Profit: </span>
                                {payload[1]?.value?.toFixed(1)}%
                              </p>
                            </div>
                          </div>
                        )
                      }
                      return null
                    }}
                  />
                  
                  <Line
                    type="monotone"
                    dataKey="grossMargin"
                    stroke="#22c55e"
                    strokeWidth={3}
                    name="Gross Margin %"
                    dot={{ fill: '#22c55e', strokeWidth: 2, r: 4 }}
                  />
                  
                  <Line
                    type="monotone"
                    dataKey="netProfit"
                    stroke="#3b82f6"
                    strokeWidth={3}
                    name="Net Profit %"
                    dot={{ fill: '#3b82f6', strokeWidth: 2, r: 4 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
            
            {/* Trend Insights */}
            <div className="mt-4 rounded-lg bg-green-50 p-3">
              <h5 className="mb-2 text-sm font-medium text-green-800">Profitability Insights</h5>
              <div className="space-y-1 text-sm text-green-700">
                <p>
                  • Gross margin trending {profitabilityData.grossMarginData[0]?.trend} over the last quarter
                </p>
                <p>
                  • Net profit up {profitabilityData.netProfitData.changePercent.toFixed(1)}% vs prior year
                </p>
                <p>
                  • EBITDA margin of {profitabilityData.netProfitData.ebitdaPercent.toFixed(1)}% indicates strong operational efficiency
                </p>
                {profitabilityData.overallMetrics.totalGrossMarginPercent > 90 && (
                  <p className="font-medium">
                    • Excellent gross margin performance across all revenue streams
                  </p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Margin Targets and Alerts */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Target className="mr-2 h-5 w-5" />
            Margin Targets & Alerts
          </CardTitle>
          <CardDescription>
            Performance vs targets and improvement opportunities
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-4">
          {isLoading ? (
            <div className="space-y-3">
              <div className="h-16 w-full animate-pulse rounded bg-gray-200" />
              <div className="h-12 w-full animate-pulse rounded bg-gray-200" />
            </div>
          ) : profitabilityData ? (
            <>
              {/* Target Performance Summary */}
              <div className="rounded-lg border p-3">
                  <div className="flex items-center gap-2 mb-2">
                    <Percent className="h-4 w-4 text-gray-600" />
                    <span className="text-sm font-medium">Overall Performance</span>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-gray-500">Gross Margin</span>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">
                          {profitabilityData.overallMetrics.totalGrossMarginPercent.toFixed(1)}%
                        </span>
                        <Badge variant="default" className="text-xs bg-green-100 text-green-800">
                          Above Target
                        </Badge>
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-gray-500">Net Profit</span>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">
                          {profitabilityData.netProfitData.netProfitPercent.toFixed(1)}%
                        </span>
                        <Badge 
                          variant={profitabilityData.netProfitData.netProfitPercent > profitabilityData.netProfitData.targetNetProfitPercent ? 'default' : 'destructive'}
                          className="text-xs"
                        >
                          {profitabilityData.netProfitData.netProfitPercent > profitabilityData.netProfitData.targetNetProfitPercent ? 'Above' : 'Below'} Target
                        </Badge>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Improvement Opportunities */}
                <div>
                  <h5 className="mb-2 text-sm font-medium">Improvement Opportunities</h5>
                  <div className="space-y-2">
                    {profitabilityData.grossMarginData
                      .filter(margin => margin.grossMarginPercent < margin.targetMarginPercent)
                      .map((margin, index) => (
                        <div key={index} className="rounded-lg bg-amber-50 p-3">
                          <div className="flex items-center gap-2">
                            <AlertTriangle className="h-4 w-4 text-amber-600" />
                            <span className="text-sm font-medium text-amber-800 capitalize">
                              {margin.revenueStream.replace('-', ' ')} Margin
                            </span>
                          </div>
                          <p className="text-xs text-amber-700 mt-1">
                            Currently {margin.grossMarginPercent.toFixed(1)}%, target {margin.targetMarginPercent.toFixed(1)}%
                          </p>
                        </div>
                      ))
                    }

                    {profitabilityData.grossMarginData.every(margin => margin.grossMarginPercent >= margin.targetMarginPercent) && (
                      <div className="rounded-lg bg-green-50 p-3">
                        <div className="flex items-center gap-2">
                          <CheckCircle className="h-4 w-4 text-green-600" />
                          <span className="text-sm font-medium text-green-800">
                            All Revenue Streams Meeting Targets
                          </span>
                        </div>
                        <p className="text-xs text-green-700 mt-1">
                          Excellent margin performance across all business units
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Quick Actions */}
                <div className="space-y-2">
                  <Button variant="outline" size="sm" className="w-full justify-start">
                    <Calculator className="mr-2 h-4 w-4" />
                    Margin Analysis by Product
                  </Button>
                  <Button variant="outline" size="sm" className="w-full justify-start">
                    <TrendingUp className="mr-2 h-4 w-4" />
                    Cost Optimization Report
                  </Button>
                </div>
              </>
            ) : null}
          </CardContent>
        </Card>
    </div>
  )
}
