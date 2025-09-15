'use client'

import { useState, useEffect } from 'react'
import { LineChart, Line, XAxis, YAxis, ResponsiveContainer, Tooltip, AreaChart, Area } from 'recharts'
import { MetricTile } from '@/components/ui/metric-tile'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Clock,
  TrendingUp,
  TrendingDown,
  Target,
  AlertTriangle,
  CheckCircle,
  RefreshCw,
  Eye,
  Calculator,
  RotateCcw,
  DollarSign,
  Calendar,
} from 'lucide-react'
import { formatCurrency } from '@/utils/financial'

interface WorkingCapitalMetrics {
  dso: {
    current: number
    target: number
    trend: 'improving' | 'declining' | 'stable'
    trendPercent: number
    monthlyHistory: Array<{
      month: string
      value: number
    }>
    arBalance: number
    trailingRevenue: number
  }
  dpo: {
    current: number
    target: number
    trend: 'improving' | 'declining' | 'stable'
    trendPercent: number
    monthlyHistory: Array<{
      month: string
      value: number
    }>
    apBalance: number
    trailingPurchases: number
  }
  cashConversionCycle: {
    current: number
    target: number
    components: {
      dso: number
      dpo: number
      dio: number // Days Inventory Outstanding
    }
    trend: 'improving' | 'declining' | 'stable'
    trendPercent: number
  }
  workingCapital: {
    current: number
    priorPeriod: number
    changePercent: number
    turnoverRatio: number
  }
  lastUpdated: Date
}

interface WorkingCapitalTilesProps {
  showDetails?: boolean
  refreshInterval?: number
  className?: string
}

export function WorkingCapitalTiles({ 
  showDetails = true, 
  refreshInterval = 300000, // 5 minutes
  className 
}: WorkingCapitalTilesProps) {
  const [wcData, setWcData] = useState<WorkingCapitalMetrics | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedMetric, setSelectedMetric] = useState<'dso' | 'dpo' | 'ccc'>('dso')

  useEffect(() => {
    loadWorkingCapitalData()
    
    // Set up auto-refresh
    const interval = setInterval(() => {
      loadWorkingCapitalData()
    }, refreshInterval)
    
    return () => clearInterval(interval)
  }, [refreshInterval])

  const loadWorkingCapitalData = async () => {
    setIsLoading(true)
    setError(null)

    try {
      // In real implementation, this would call cash flow metrics from calculations engine
      // For now, simulate with sample data
      await new Promise(resolve => setTimeout(resolve, 600))

      // Sample working capital metrics
      const sampleData: WorkingCapitalMetrics = {
        dso: {
          current: 12.3,
          target: 15.0,
          trend: 'improving',
          trendPercent: -8.2, // Negative is good for DSO
          monthlyHistory: [
            { month: 'Jan', value: 16.8 },
            { month: 'Feb', value: 15.2 },
            { month: 'Mar', value: 14.1 },
            { month: 'Apr', value: 13.5 },
            { month: 'May', value: 12.9 },
            { month: 'Jun', value: 12.3 },
          ],
          arBalance: 45280,
          trailingRevenue: 1342950,
        },
        dpo: {
          current: 28.4,
          target: 30.0,
          trend: 'declining',
          trendPercent: -5.3, // Negative is bad for DPO
          monthlyHistory: [
            { month: 'Jan', value: 32.1 },
            { month: 'Feb', value: 31.5 },
            { month: 'Mar', value: 30.8 },
            { month: 'Apr', value: 29.7 },
            { month: 'May', value: 29.1 },
            { month: 'Jun', value: 28.4 },
          ],
          apBalance: 32150,
          trailingPurchases: 413800,
        },
        cashConversionCycle: {
          current: -16.1, // Negative is excellent (cash comes in before it goes out)
          target: -10.0,
          components: {
            dso: 12.3,
            dpo: 28.4,
            dio: 0, // Service business with minimal inventory
          },
          trend: 'improving',
          trendPercent: -12.5, // More negative is better for CCC
        },
        workingCapital: {
          current: 13130, // AR - AP
          priorPeriod: 18950,
          changePercent: -30.7, // Reduction in working capital is good
          turnoverRatio: 25.6, // Revenue / Average Working Capital
        },
        lastUpdated: new Date(),
      }
      
      setWcData(sampleData)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load working capital data')
    } finally {
      setIsLoading(false)
    }
  }

  const handleRefresh = () => {
    setIsLoading(true)
    loadWorkingCapitalData()
  }

  const getTrendIcon = (trend: 'improving' | 'declining' | 'stable', isInverse = false) => {
    const isGood = isInverse ? trend === 'declining' : trend === 'improving'
    
    if (isGood) {
      return <TrendingUp className="h-4 w-4 text-green-600" />
    } else if (trend === 'declining' && !isInverse) {
      return <TrendingDown className="h-4 w-4 text-red-600" />
    } else if (trend === 'improving' && isInverse) {
      return <TrendingDown className="h-4 w-4 text-red-600" />
    }
    return <Target className="h-4 w-4 text-gray-600" />
  }

  const getTrendColor = (trend: 'improving' | 'declining' | 'stable', isInverse = false) => {
    const isGood = isInverse ? trend === 'declining' : trend === 'improving'
    
    if (isGood) return 'text-green-600'
    if (trend !== 'stable') return 'text-red-600'
    return 'text-gray-600'
  }

  const getPerformanceStatus = (actual: number, target: number, lowerIsBetter = false) => {
    const variance = lowerIsBetter ? target - actual : actual - target
    const percentVariance = Math.abs(target) > 0 ? (variance / Math.abs(target)) * 100 : 0
    
    if (percentVariance > 10) {
      return { 
        status: 'excellent', 
        color: 'text-green-600', 
        bgColor: 'bg-green-50',
        icon: <CheckCircle className="h-4 w-4 text-green-600" /> 
      }
    }
    if (percentVariance > 0) {
      return { 
        status: 'good', 
        color: 'text-green-500', 
        bgColor: 'bg-green-50',
        icon: <CheckCircle className="h-4 w-4 text-green-500" /> 
      }
    }
    if (percentVariance > -10) {
      return { 
        status: 'warning', 
        color: 'text-amber-600', 
        bgColor: 'bg-amber-50',
        icon: <AlertTriangle className="h-4 w-4 text-amber-600" /> 
      }
    }
    return { 
      status: 'poor', 
      color: 'text-red-600', 
      bgColor: 'bg-red-50',
      icon: <AlertTriangle className="h-4 w-4 text-red-600" /> 
    }
  }

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

  if (!showDetails) {
    // Compact tiles for dashboard grid
    return (
      <div className={`grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3 ${className}`}>
        {/* DSO Tile */}
        <MetricTile
          title="DSO"
          value={wcData ? `${wcData.dso.current.toFixed(1)} days` : '0 days'}
          isLoading={isLoading}
          change={{
            value: wcData ? `${wcData.dso.trendPercent > 0 ? '+' : ''}${wcData.dso.trendPercent.toFixed(1)}%` : '',
            type: wcData && wcData.dso.trendPercent < 0 ? 'positive' : 'negative', // Lower DSO is better
            label: 'vs target',
          }}
          icon={<Clock className="h-5 w-5" />}
          onClick={() => setSelectedMetric('dso')}
        />

        {/* DPO Tile */}
        <MetricTile
          title="DPO"
          value={wcData ? `${wcData.dpo.current.toFixed(1)} days` : '0 days'}
          isLoading={isLoading}
          change={{
            value: wcData ? `${wcData.dpo.trendPercent > 0 ? '+' : ''}${wcData.dpo.trendPercent.toFixed(1)}%` : '',
            type: wcData && wcData.dpo.trendPercent > 0 ? 'positive' : 'negative', // Higher DPO is better
            label: 'vs target',
          }}
          icon={<Calendar className="h-5 w-5" />}
          onClick={() => setSelectedMetric('dpo')}
        />

        {/* Cash Conversion Cycle */}
        <MetricTile
          title="Cash Cycle"
          value={wcData ? `${wcData.cashConversionCycle.current.toFixed(1)} days` : '0 days'}
          isLoading={isLoading}
          change={{
            value: wcData ? `${wcData.cashConversionCycle.trendPercent > 0 ? '+' : ''}${wcData.cashConversionCycle.trendPercent.toFixed(1)}%` : '',
            type: wcData && wcData.cashConversionCycle.trendPercent < 0 ? 'positive' : 'negative', // Lower CCC is better
            label: 'vs target',
          }}
          icon={<RotateCcw className="h-5 w-5" />}
          onClick={() => setSelectedMetric('ccc')}
        />
      </div>
    )
  }

  // Detailed view
  return (
    <div className={`space-y-6 ${className}`}>
      {/* Working Capital KPI Summary */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        {/* DSO Analysis */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center">
                  <Clock className="mr-2 h-5 w-5" />
                  DSO Analysis
                </CardTitle>
                <CardDescription>Days Sales Outstanding</CardDescription>
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
                <div className="h-16 w-full animate-pulse rounded bg-gray-200" />
                <div className="h-20 w-full animate-pulse rounded bg-gray-200" />
              </div>
            ) : wcData ? (
              <>
                {/* Current DSO */}
                <div className="rounded-lg border p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-500">Current DSO</span>
                    <div className="flex items-center gap-2">
                      {getTrendIcon(wcData.dso.trend, true)} {/* Lower DSO is better */}
                      <Badge 
                        variant={wcData.dso.current <= wcData.dso.target ? 'default' : 'destructive'}
                        className="text-xs"
                      >
                        {wcData.dso.current <= wcData.dso.target ? 'On Target' : 'Above Target'}
                      </Badge>
                    </div>
                  </div>
                  
                  <div className="flex items-baseline gap-2">
                    <p className="text-2xl font-bold">
                      {wcData.dso.current.toFixed(1)}
                    </p>
                    <span className="text-sm text-gray-600">days</span>
                  </div>
                  
                  <div className="mt-2 flex items-center justify-between text-sm">
                    <span className="text-gray-500">Target: {wcData.dso.target} days</span>
                    <span className={getTrendColor(wcData.dso.trend, true)}>
                      {wcData.dso.trendPercent > 0 ? '+' : ''}{wcData.dso.trendPercent.toFixed(1)}%
                    </span>
                  </div>
                </div>

                {/* DSO Components */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-500">AR Balance</span>
                    <span className="font-medium">{formatCurrency(wcData.dso.arBalance)}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-500">Trailing Revenue (12M)</span>
                    <span className="font-medium">{formatCurrency(wcData.dso.trailingRevenue)}</span>
                  </div>
                  <div className="text-xs text-gray-500 pt-2 border-t">
                    DSO = (AR Balance ÷ Trailing Revenue) × 365
                  </div>
                </div>

                {/* DSO Trend Chart */}
                <div>
                  <h5 className="mb-2 text-sm font-medium">6-Month Trend</h5>
                  <div className="h-16">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={wcData.dso.monthlyHistory}>
                        <Line
                          type="monotone"
                          dataKey="value"
                          stroke="#3b82f6"
                          strokeWidth={2}
                          dot={{ fill: '#3b82f6', r: 3 }}
                        />
                        <Tooltip
                          content={({ active, payload, label }) => {
                            if (active && payload && payload.length) {
                              return (
                                <div className="rounded border bg-white p-2 shadow">
                                  <p className="text-xs">{label}: {payload[0]?.value?.toFixed(1)} days</p>
                                </div>
                              )
                            }
                            return null
                          }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </>
            ) : null}
          </CardContent>
        </Card>

        {/* DPO Analysis */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Calendar className="mr-2 h-5 w-5" />
              DPO Analysis
            </CardTitle>
            <CardDescription>Days Payable Outstanding</CardDescription>
          </CardHeader>
          
          <CardContent className="space-y-4">
            {isLoading ? (
              <div className="space-y-3">
                <div className="h-16 w-full animate-pulse rounded bg-gray-200" />
                <div className="h-20 w-full animate-pulse rounded bg-gray-200" />
              </div>
            ) : wcData ? (
              <>
                {/* Current DPO */}
                <div className="rounded-lg border p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-500">Current DPO</span>
                    <div className="flex items-center gap-2">
                      {getTrendIcon(wcData.dpo.trend)} {/* Higher DPO is better */}
                      <Badge 
                        variant={wcData.dpo.current >= wcData.dpo.target ? 'default' : 'destructive'}
                        className="text-xs"
                      >
                        {wcData.dpo.current >= wcData.dpo.target ? 'On Target' : 'Below Target'}
                      </Badge>
                    </div>
                  </div>
                  
                  <div className="flex items-baseline gap-2">
                    <p className="text-2xl font-bold">
                      {wcData.dpo.current.toFixed(1)}
                    </p>
                    <span className="text-sm text-gray-600">days</span>
                  </div>
                  
                  <div className="mt-2 flex items-center justify-between text-sm">
                    <span className="text-gray-500">Target: {wcData.dpo.target} days</span>
                    <span className={getTrendColor(wcData.dpo.trend)}>
                      {wcData.dpo.trendPercent > 0 ? '+' : ''}{wcData.dpo.trendPercent.toFixed(1)}%
                    </span>
                  </div>
                </div>

                {/* DPO Components */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-500">AP Balance</span>
                    <span className="font-medium">{formatCurrency(wcData.dpo.apBalance)}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-500">Trailing Purchases (12M)</span>
                    <span className="font-medium">{formatCurrency(wcData.dpo.trailingPurchases)}</span>
                  </div>
                  <div className="text-xs text-gray-500 pt-2 border-t">
                    DPO = (AP Balance ÷ Trailing Purchases) × 365
                  </div>
                </div>

                {/* DPO Trend Chart */}
                <div>
                  <h5 className="mb-2 text-sm font-medium">6-Month Trend</h5>
                  <div className="h-16">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={wcData.dpo.monthlyHistory}>
                        <Line
                          type="monotone"
                          dataKey="value"
                          stroke="#f59e0b"
                          strokeWidth={2}
                          dot={{ fill: '#f59e0b', r: 3 }}
                        />
                        <Tooltip
                          content={({ active, payload, label }) => {
                            if (active && payload && payload.length) {
                              return (
                                <div className="rounded border bg-white p-2 shadow">
                                  <p className="text-xs">{label}: {payload[0]?.value?.toFixed(1)} days</p>
                                </div>
                              )
                            }
                            return null
                          }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </>
            ) : null}
          </CardContent>
        </Card>

        {/* Cash Conversion Cycle */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <RotateCcw className="mr-2 h-5 w-5" />
              Cash Conversion Cycle
            </CardTitle>
            <CardDescription>Working capital efficiency</CardDescription>
          </CardHeader>
          
          <CardContent className="space-y-4">
            {isLoading ? (
              <div className="space-y-3">
                <div className="h-16 w-full animate-pulse rounded bg-gray-200" />
                <div className="h-20 w-full animate-pulse rounded bg-gray-200" />
              </div>
            ) : wcData ? (
              <>
                {/* Current CCC */}
                <div className="rounded-lg border p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-500">Cash Conversion Cycle</span>
                    <div className="flex items-center gap-2">
                      {getTrendIcon(wcData.cashConversionCycle.trend, true)} {/* Lower CCC is better */}
                      <Badge 
                        variant={wcData.cashConversionCycle.current <= wcData.cashConversionCycle.target ? 'default' : 'destructive'}
                        className="text-xs"
                      >
                        {wcData.cashConversionCycle.current <= wcData.cashConversionCycle.target ? 'Excellent' : 'Needs Improvement'}
                      </Badge>
                    </div>
                  </div>
                  
                  <div className="flex items-baseline gap-2">
                    <p className={`text-2xl font-bold ${wcData.cashConversionCycle.current < 0 ? 'text-green-600' : 'text-gray-900'}`}>
                      {wcData.cashConversionCycle.current.toFixed(1)}
                    </p>
                    <span className="text-sm text-gray-600">days</span>
                  </div>
                  
                  <div className="mt-2 text-sm">
                    <span className="text-gray-500">Target: {wcData.cashConversionCycle.target} days</span>
                  </div>
                </div>

                {/* CCC Components */}
                <div className="space-y-3">
                  <h5 className="text-sm font-medium">Components</h5>
                  
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-500">DSO (Days Sales Outstanding)</span>
                      <span className="font-medium">+{wcData.cashConversionCycle.components.dso.toFixed(1)} days</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-500">DIO (Days Inventory Outstanding)</span>
                      <span className="font-medium">+{wcData.cashConversionCycle.components.dio.toFixed(1)} days</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-500">DPO (Days Payable Outstanding)</span>
                      <span className="font-medium">-{wcData.cashConversionCycle.components.dpo.toFixed(1)} days</span>
                    </div>
                    <div className="flex items-center justify-between text-sm font-medium border-t pt-2">
                      <span>Cash Conversion Cycle</span>
                      <span className={wcData.cashConversionCycle.current < 0 ? 'text-green-600' : 'text-gray-900'}>
                        {wcData.cashConversionCycle.current.toFixed(1)} days
                      </span>
                    </div>
                  </div>
                  
                  <div className="text-xs text-gray-500 pt-2 border-t">
                    CCC = DSO + DIO - DPO
                  </div>
                </div>

                {/* CCC Insights */}
                {wcData.cashConversionCycle.current < 0 && (
                  <div className="rounded-lg bg-green-50 p-3">
                    <div className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-green-600" />
                      <span className="text-sm font-medium text-green-800">Excellent Cash Flow</span>
                    </div>
                    <p className="text-xs text-green-700 mt-1">
                      Negative cash conversion cycle means you collect cash before paying suppliers
                    </p>
                  </div>
                )}
              </>
            ) : null}
          </CardContent>
        </Card>

        {/* Working Capital Summary */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <DollarSign className="mr-2 h-5 w-5" />
              Working Capital
            </CardTitle>
            <CardDescription>Net working capital analysis</CardDescription>
          </CardHeader>
          
          <CardContent className="space-y-4">
            {isLoading ? (
              <div className="space-y-3">
                <div className="h-16 w-full animate-pulse rounded bg-gray-200" />
                <div className="h-20 w-full animate-pulse rounded bg-gray-200" />
              </div>
            ) : wcData ? (
              <>
                {/* Working Capital Amount */}
                <div className="rounded-lg border p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-500">Net Working Capital</span>
                    <div className="flex items-center gap-2">
                      {wcData.workingCapital.changePercent < 0 ? (
                        <TrendingDown className="h-4 w-4 text-green-600" />
                      ) : (
                        <TrendingUp className="h-4 w-4 text-red-600" />
                      )}
                    </div>
                  </div>
                  
                  <p className="text-2xl font-bold">
                    {formatCurrency(wcData.workingCapital.current)}
                  </p>
                  
                  <div className="mt-2 text-sm">
                    <span className={wcData.workingCapital.changePercent < 0 ? 'text-green-600' : 'text-red-600'}>
                      {wcData.workingCapital.changePercent > 0 ? '+' : ''}{wcData.workingCapital.changePercent.toFixed(1)}% vs prior
                    </span>
                  </div>
                </div>

                {/* Working Capital Efficiency */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-500">Turnover Ratio</span>
                    <span className="font-medium">{wcData.workingCapital.turnoverRatio.toFixed(1)}x</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-500">Prior Period</span>
                    <span className="font-medium">{formatCurrency(wcData.workingCapital.priorPeriod)}</span>
                  </div>
                </div>

                {/* Efficiency Rating */}
                <div className={`rounded-lg p-3 ${wcData.workingCapital.turnoverRatio > 20 ? 'bg-green-50' : wcData.workingCapital.turnoverRatio > 15 ? 'bg-yellow-50' : 'bg-red-50'}`}>
                  <div className="flex items-center gap-2">
                    {wcData.workingCapital.turnoverRatio > 20 ? (
                      <CheckCircle className="h-4 w-4 text-green-600" />
                    ) : (
                      <AlertTriangle className="h-4 w-4 text-amber-600" />
                    )}
                    <span className={`text-sm font-medium ${wcData.workingCapital.turnoverRatio > 20 ? 'text-green-800' : 'text-amber-800'}`}>
                      {wcData.workingCapital.turnoverRatio > 20 ? 'Excellent' : wcData.workingCapital.turnoverRatio > 15 ? 'Good' : 'Needs Improvement'}
                    </span>
                  </div>
                  <p className={`text-xs mt-1 ${wcData.workingCapital.turnoverRatio > 20 ? 'text-green-700' : 'text-amber-700'}`}>
                    {wcData.workingCapital.turnoverRatio > 20 
                      ? 'Highly efficient working capital management'
                      : 'Consider optimizing collection and payment cycles'
                    }
                  </p>
                </div>
              </>
            ) : null}
          </CardContent>
        </Card>

        {/* Performance Benchmarks */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Target className="mr-2 h-5 w-5" />
              Industry Benchmarks
            </CardTitle>
            <CardDescription>Performance vs industry standards</CardDescription>
          </CardHeader>
          
          <CardContent className="space-y-4">
            {isLoading ? (
              <div className="space-y-3">
                <div className="h-16 w-full animate-pulse rounded bg-gray-200" />
                <div className="h-20 w-full animate-pulse rounded bg-gray-200" />
              </div>
            ) : wcData ? (
              <>
                {/* DSO Benchmark */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">DSO Performance</span>
                    {getPerformanceStatus(wcData.dso.current, 18, true).icon}
                  </div>
                  
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center justify-between">
                      <span className="text-gray-500">Your DSO</span>
                      <span className="font-medium">{wcData.dso.current.toFixed(1)} days</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-500">Industry Average</span>
                      <span className="text-gray-600">18 days</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-500">Top Quartile</span>
                      <span className="text-gray-600">12 days</span>
                    </div>
                  </div>
                </div>

                {/* DPO Benchmark */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">DPO Performance</span>
                    {getPerformanceStatus(wcData.dpo.current, 25, false).icon}
                  </div>
                  
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center justify-between">
                      <span className="text-gray-500">Your DPO</span>
                      <span className="font-medium">{wcData.dpo.current.toFixed(1)} days</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-500">Industry Average</span>
                      <span className="text-gray-600">25 days</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-500">Top Quartile</span>
                      <span className="text-gray-600">35 days</span>
                    </div>
                  </div>
                </div>

                {/* Optimization Recommendations */}
                <div className="space-y-2">
                  <h5 className="text-sm font-medium">Recommendations</h5>
                  {wcData.dso.current > wcData.dso.target && (
                    <div className="rounded bg-amber-50 p-2">
                      <p className="text-xs text-amber-800">
                        Improve collection processes to reduce DSO
                      </p>
                    </div>
                  )}
                  {wcData.dpo.current < wcData.dpo.target && (
                    <div className="rounded bg-blue-50 p-2">
                      <p className="text-xs text-blue-800">
                        Extend payment terms with suppliers to improve DPO
                      </p>
                    </div>
                  )}
                  {wcData.cashConversionCycle.current < 0 && (
                    <div className="rounded bg-green-50 p-2">
                      <p className="text-xs text-green-800">
                        Excellent cash flow timing - maintain current practices
                      </p>
                    </div>
                  )}
                </div>
              </>
            ) : null}
          </CardContent>
        </Card>
      </div>

      {/* Combined Working Capital Trends */}
      {wcData && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <TrendingUp className="mr-2 h-5 w-5" />
              Working Capital Trends
            </CardTitle>
            <CardDescription>
              DSO, DPO, and Cash Conversion Cycle trends over time
            </CardDescription>
          </CardHeader>
          
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={wcData.dso.monthlyHistory.map((dsoData, index) => ({
                  month: dsoData.month,
                  dso: dsoData.value,
                  dpo: wcData.dpo.monthlyHistory[index]?.value || 0,
                  ccc: dsoData.value - (wcData.dpo.monthlyHistory[index]?.value || 0),
                }))}>
                  <XAxis dataKey="month" stroke="#666" fontSize={12} />
                  <YAxis stroke="#666" fontSize={12} />
                  <Tooltip
                    content={({ active, payload, label }) => {
                      if (active && payload && payload.length) {
                        return (
                          <div className="rounded-lg border bg-white p-3 shadow-lg">
                            <p className="font-medium">{label}</p>
                            <div className="mt-2 space-y-1">
                              <p className="text-sm">
                                <span className="text-blue-600">DSO: </span>
                                {payload[0]?.value?.toFixed(1)} days
                              </p>
                              <p className="text-sm">
                                <span className="text-amber-600">DPO: </span>
                                {payload[1]?.value?.toFixed(1)} days
                              </p>
                              <p className="text-sm">
                                <span className="text-purple-600">CCC: </span>
                                {payload[2]?.value?.toFixed(1)} days
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
                    dataKey="dso"
                    stroke="#3b82f6"
                    strokeWidth={2}
                    name="DSO"
                    dot={{ fill: '#3b82f6', r: 3 }}
                  />
                  
                  <Line
                    type="monotone"
                    dataKey="dpo"
                    stroke="#f59e0b"
                    strokeWidth={2}
                    name="DPO"
                    dot={{ fill: '#f59e0b', r: 3 }}
                  />
                  
                  <Line
                    type="monotone"
                    dataKey="ccc"
                    stroke="#8b5cf6"
                    strokeWidth={3}
                    name="Cash Conversion Cycle"
                    dot={{ fill: '#8b5cf6', r: 4 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
            
            {/* Working Capital Insights */}
            <div className="mt-4 rounded-lg bg-purple-50 p-3">
              <h5 className="mb-2 text-sm font-medium text-purple-800">Working Capital Insights</h5>
              <div className="space-y-1 text-sm text-purple-700">
                <p>
                  • Cash conversion cycle of {wcData.cashConversionCycle.current.toFixed(1)} days {wcData.cashConversionCycle.current < 0 ? 'generates positive cash flow' : 'requires working capital investment'}
                </p>
                <p>
                  • DSO trending {wcData.dso.trend} - {wcData.dso.trend === 'improving' ? 'collections improving' : 'monitor collection processes'}
                </p>
                <p>
                  • DPO trending {wcData.dpo.trend} - {wcData.dpo.trend === 'improving' ? 'extending payment terms' : 'payment terms shortening'}
                </p>
                {wcData.workingCapital.turnoverRatio > 20 && (
                  <p className="font-medium">
                    • Excellent working capital efficiency with {wcData.workingCapital.turnoverRatio.toFixed(1)}x turnover ratio
                  </p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
