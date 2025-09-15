'use client'

import { useState, useEffect } from 'react'
import {
  ComposedChart,
  Line,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
  Area,
  AreaChart,
} from 'recharts'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  TrendingUp,
  TrendingDown,
  Activity,
  RefreshCw,
  Download,
  Calendar,
  DollarSign,
  ArrowUpCircle,
  ArrowDownCircle,
  Target,
  AlertTriangle,
  CheckCircle,
} from 'lucide-react'
import { formatCurrency } from '@/utils/financial'

interface WeeklyCashFlow {
  week: number
  weekLabel: string
  weekStartDate: string
  weekEndDate: string
  inflows: number
  outflows: number
  netFlow: number
  runningBalance: number
  movingAverage4w: number
  movingAverage13w: number
}

interface CashFlowTrendData {
  weeklyData: WeeklyCashFlow[]
  summary: {
    totalInflows13w: number
    totalOutflows13w: number
    netFlow13w: number
    averageWeeklyInflow: number
    averageWeeklyOutflow: number
    averageWeeklyNetFlow: number
    volatilityScore: number
    trend: 'improving' | 'declining' | 'stable'
    trendPercent: number
  }
  projections: {
    next4Weeks: Array<{
      week: number
      projectedInflow: number
      projectedOutflow: number
      projectedNetFlow: number
      confidenceLevel: 'low' | 'medium' | 'high'
    }>
    projectedBalance30d: number
    cashFlowRisk: 'low' | 'medium' | 'high'
  }
  insights: Array<{
    type: 'positive' | 'negative' | 'neutral'
    title: string
    description: string
    impact: string
  }>
  lastUpdated: Date
}

interface CashFlowTrendChartProps {
  weeksToShow?: number
  chartType?: 'area' | 'bar' | 'line'
  showProjections?: boolean
  className?: string
}

export function CashFlowTrendChart({
  weeksToShow = 13,
  chartType = 'area',
  showProjections = true,
  className,
}: CashFlowTrendChartProps) {
  const [cashFlowData, setCashFlowData] = useState<CashFlowTrendData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedView, setSelectedView] = useState<'weekly' | 'cumulative' | 'moving-average'>('weekly')

  useEffect(() => {
    loadCashFlowData()
  }, [weeksToShow])

  const loadCashFlowData = async () => {
    setIsLoading(true)
    setError(null)

    try {
      // In real implementation, this would query fact_cash_flow_trends materialized view
      // For now, simulate with sample data
      await new Promise(resolve => setTimeout(resolve, 800))

      // Generate sample 13-week cash flow data
      const weeklyData: WeeklyCashFlow[] = []
      let runningBalance = 250000 // Starting balance

      for (let week = 1; week <= weeksToShow; week++) {
        // Simulate seasonal patterns and business cycles
        const baseInflow = 25000 + Math.sin(week * 0.3) * 8000 + Math.random() * 5000
        const baseOutflow = 18000 + Math.sin(week * 0.2) * 3000 + Math.random() * 4000
        
        // Add some volatility and business patterns
        const inflows = Math.max(0, baseInflow + (week % 4 === 0 ? 15000 : 0)) // Month-end spikes
        const outflows = Math.max(0, baseOutflow + (week % 2 === 0 ? 5000 : 0)) // Bi-weekly expenses
        
        const netFlow = inflows - outflows
        runningBalance += netFlow

        // Calculate moving averages
        const movingAverage4w = week >= 4 
          ? weeklyData.slice(-3).reduce((sum, w) => sum + w.netFlow, netFlow) / 4
          : netFlow

        const movingAverage13w = weeklyData.length >= 12
          ? weeklyData.slice(-12).reduce((sum, w) => sum + w.netFlow, netFlow) / 13
          : netFlow

        const weekStartDate = new Date()
        weekStartDate.setDate(weekStartDate.getDate() - (weeksToShow - week) * 7)
        
        const weekEndDate = new Date(weekStartDate)
        weekEndDate.setDate(weekEndDate.getDate() + 6)

        weeklyData.push({
          week,
          weekLabel: `W${week}`,
          weekStartDate: weekStartDate.toISOString().split('T')[0],
          weekEndDate: weekEndDate.toISOString().split('T')[0],
          inflows: Math.round(inflows),
          outflows: Math.round(outflows),
          netFlow: Math.round(netFlow),
          runningBalance: Math.round(runningBalance),
          movingAverage4w: Math.round(movingAverage4w),
          movingAverage13w: Math.round(movingAverage13w),
        })
      }

      // Calculate summary metrics
      const totalInflows = weeklyData.reduce((sum, w) => sum + w.inflows, 0)
      const totalOutflows = weeklyData.reduce((sum, w) => sum + w.outflows, 0)
      const netFlow13w = totalInflows - totalOutflows
      const averageWeeklyInflow = totalInflows / weeklyData.length
      const averageWeeklyOutflow = totalOutflows / weeklyData.length
      const averageWeeklyNetFlow = netFlow13w / weeklyData.length

      // Calculate volatility (coefficient of variation of net flows)
      const netFlows = weeklyData.map(w => w.netFlow)
      const meanNetFlow = netFlows.reduce((sum, flow) => sum + flow, 0) / netFlows.length
      const variance = netFlows.reduce((sum, flow) => sum + Math.pow(flow - meanNetFlow, 2), 0) / netFlows.length
      const standardDeviation = Math.sqrt(variance)
      const volatilityScore = Math.abs(meanNetFlow) > 0 ? (standardDeviation / Math.abs(meanNetFlow)) * 100 : 0

      // Determine trend
      const firstHalf = weeklyData.slice(0, Math.floor(weeklyData.length / 2))
      const secondHalf = weeklyData.slice(Math.floor(weeklyData.length / 2))
      const firstHalfAvg = firstHalf.reduce((sum, w) => sum + w.netFlow, 0) / firstHalf.length
      const secondHalfAvg = secondHalf.reduce((sum, w) => sum + w.netFlow, 0) / secondHalf.length
      const trendPercent = firstHalfAvg !== 0 ? ((secondHalfAvg - firstHalfAvg) / Math.abs(firstHalfAvg)) * 100 : 0

      const trend: 'improving' | 'declining' | 'stable' = 
        trendPercent > 10 ? 'improving' :
        trendPercent < -10 ? 'declining' : 'stable'

      // Generate projections for next 4 weeks
      const projections = []
      for (let i = 1; i <= 4; i++) {
        const projectedInflow = averageWeeklyInflow * (1 + (trendPercent / 100) * 0.5)
        const projectedOutflow = averageWeeklyOutflow * (1 + Math.random() * 0.1 - 0.05)
        const projectedNetFlow = projectedInflow - projectedOutflow
        
        projections.push({
          week: weeksToShow + i,
          projectedInflow: Math.round(projectedInflow),
          projectedOutflow: Math.round(projectedOutflow),
          projectedNetFlow: Math.round(projectedNetFlow),
          confidenceLevel: volatilityScore < 30 ? 'high' as const : volatilityScore < 60 ? 'medium' as const : 'low' as const,
        })
      }

      const projectedBalance30d = runningBalance + projections.reduce((sum, p) => sum + p.projectedNetFlow, 0)
      const cashFlowRisk: 'low' | 'medium' | 'high' = 
        projectedBalance30d > 100000 ? 'low' :
        projectedBalance30d > 50000 ? 'medium' : 'high'

      // Generate insights
      const insights = []
      
      if (trend === 'improving') {
        insights.push({
          type: 'positive' as const,
          title: 'Cash Flow Improving',
          description: `Net cash flow trending upward by ${trendPercent.toFixed(1)}%`,
          impact: 'Strengthening liquidity position',
        })
      } else if (trend === 'declining') {
        insights.push({
          type: 'negative' as const,
          title: 'Cash Flow Declining',
          description: `Net cash flow trending downward by ${Math.abs(trendPercent).toFixed(1)}%`,
          impact: 'Monitor liquidity and consider cash management actions',
        })
      }

      if (volatilityScore > 50) {
        insights.push({
          type: 'negative' as const,
          title: 'High Cash Flow Volatility',
          description: `Cash flow volatility score of ${volatilityScore.toFixed(1)}% indicates unpredictable patterns`,
          impact: 'Consider improving cash flow forecasting and management',
        })
      }

      if (averageWeeklyNetFlow > 0) {
        insights.push({
          type: 'positive' as const,
          title: 'Positive Cash Generation',
          description: `Average weekly net flow of ${formatCurrency(averageWeeklyNetFlow)}`,
          impact: 'Business is generating positive cash flow from operations',
        })
      }

      if (cashFlowRisk === 'high') {
        insights.push({
          type: 'negative' as const,
          title: 'Cash Flow Risk Alert',
          description: `Projected 30-day balance of ${formatCurrency(projectedBalance30d)} below safety threshold`,
          impact: 'Consider accelerating collections or delaying non-critical payments',
        })
      }

      setCashFlowData({
        weeklyData,
        summary: {
          totalInflows13w: totalInflows,
          totalOutflows13w: totalOutflows,
          netFlow13w,
          averageWeeklyInflow,
          averageWeeklyOutflow,
          averageWeeklyNetFlow,
          volatilityScore,
          trend,
          trendPercent,
        },
        projections: {
          next4Weeks: projections,
          projectedBalance30d,
          cashFlowRisk,
        },
        insights,
        lastUpdated: new Date(),
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load cash flow trend data')
    } finally {
      setIsLoading(false)
    }
  }

  const handleRefresh = () => {
    setIsLoading(true)
    loadCashFlowData()
  }

  const getTrendIcon = (trend: 'improving' | 'declining' | 'stable') => {
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

  // Custom tooltip for cash flow chart
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload
      return (
        <div className="rounded-lg border bg-white p-3 shadow-lg">
          <p className="font-medium">{label}</p>
          <div className="mt-2 space-y-1">
            <p className="text-sm">
              <span className="text-green-600">Inflows: </span>
              {formatCurrency(data.inflows)}
            </p>
            <p className="text-sm">
              <span className="text-red-600">Outflows: </span>
              {formatCurrency(data.outflows)}
            </p>
            <p className="text-sm font-medium">
              <span className={data.netFlow > 0 ? 'text-green-600' : 'text-red-600'}>
                Net Flow: 
              </span>
              {formatCurrency(data.netFlow)}
            </p>
            <p className="text-sm">
              <span className="text-blue-600">Balance: </span>
              {formatCurrency(data.runningBalance)}
            </p>
          </div>
        </div>
      )
    }
    return null
  }

  if (isLoading) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Activity className="mr-2 h-5 w-5" />
            Cash Flow Trends
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-80 w-full animate-pulse rounded-lg bg-gray-200" />
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card className={className}>
        <CardContent className="pt-6">
          <div className="text-center text-red-600">
            <Activity className="mx-auto h-8 w-8" />
            <p className="mt-2 text-sm">{error}</p>
            <Button variant="outline" size="sm" onClick={handleRefresh} className="mt-2">
              Try Again
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center">
              <Activity className="mr-2 h-5 w-5" />
              Cash Flow Trends
            </CardTitle>
            <CardDescription>
              13-week rolling cash flow analysis with projections
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Select
              value={selectedView}
              onValueChange={(value) => setSelectedView(value as 'weekly' | 'cumulative' | 'moving-average')}
            >
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="weekly">Weekly Flow</SelectItem>
                <SelectItem value="cumulative">Running Balance</SelectItem>
                <SelectItem value="moving-average">Moving Average</SelectItem>
              </SelectContent>
            </Select>

            <Button
              variant="ghost"
              size="sm"
              onClick={handleRefresh}
              disabled={isLoading}
            >
              <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* Summary Metrics */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
          <div className="rounded-lg border p-3">
            <div className="flex items-center gap-2">
              <ArrowUpCircle className="h-4 w-4 text-green-600" />
              <span className="text-sm font-medium">Total Inflows</span>
            </div>
            <p className="mt-1 text-lg font-bold text-green-900">
              {formatCurrency(cashFlowData?.summary.totalInflows13w || 0)}
            </p>
            <p className="text-xs text-gray-500">
              Avg: {formatCurrency(cashFlowData?.summary.averageWeeklyInflow || 0)}/week
            </p>
          </div>

          <div className="rounded-lg border p-3">
            <div className="flex items-center gap-2">
              <ArrowDownCircle className="h-4 w-4 text-red-600" />
              <span className="text-sm font-medium">Total Outflows</span>
            </div>
            <p className="mt-1 text-lg font-bold text-red-900">
              {formatCurrency(cashFlowData?.summary.totalOutflows13w || 0)}
            </p>
            <p className="text-xs text-gray-500">
              Avg: {formatCurrency(cashFlowData?.summary.averageWeeklyOutflow || 0)}/week
            </p>
          </div>

          <div className="rounded-lg border p-3">
            <div className="flex items-center gap-2">
              <DollarSign className={`h-4 w-4 ${(cashFlowData?.summary.netFlow13w || 0) > 0 ? 'text-green-600' : 'text-red-600'}`} />
              <span className="text-sm font-medium">Net Flow</span>
            </div>
            <p className={`mt-1 text-lg font-bold ${(cashFlowData?.summary.netFlow13w || 0) > 0 ? 'text-green-900' : 'text-red-900'}`}>
              {formatCurrency(cashFlowData?.summary.netFlow13w || 0)}
            </p>
            <p className="text-xs text-gray-500">
              Avg: {formatCurrency(cashFlowData?.summary.averageWeeklyNetFlow || 0)}/week
            </p>
          </div>

          <div className="rounded-lg border p-3">
            <div className="flex items-center gap-2">
              {cashFlowData && getTrendIcon(cashFlowData.summary.trend)}
              <span className="text-sm font-medium">Trend</span>
            </div>
            <p className={`mt-1 text-lg font-bold ${cashFlowData ? getTrendColor(cashFlowData.summary.trend) : ''}`}>
              {cashFlowData?.summary.trend || 'stable'}
            </p>
            <p className="text-xs text-gray-500">
              {cashFlowData ? `${cashFlowData.summary.trendPercent > 0 ? '+' : ''}${cashFlowData.summary.trendPercent.toFixed(1)}%` : '0%'}
            </p>
          </div>
        </div>

        {/* Cash Flow Chart */}
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            {selectedView === 'weekly' ? (
              <ComposedChart data={cashFlowData?.weeklyData || []}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="weekLabel" stroke="#666" fontSize={12} />
                <YAxis stroke="#666" fontSize={12} tickFormatter={(value) => `$${(value / 1000).toFixed(0)}K`} />
                <Tooltip content={<CustomTooltip />} />
                <Legend />
                
                <Bar dataKey="inflows" fill="#22c55e" name="Inflows" radius={[2, 2, 0, 0]} />
                <Bar dataKey="outflows" fill="#ef4444" name="Outflows" radius={[2, 2, 0, 0]} />
                <Line
                  type="monotone"
                  dataKey="netFlow"
                  stroke="#3b82f6"
                  strokeWidth={3}
                  name="Net Flow"
                  dot={{ fill: '#3b82f6', r: 4 }}
                />
                
                <ReferenceLine y={0} stroke="#666" strokeDasharray="2 2" />
              </ComposedChart>
            ) : selectedView === 'cumulative' ? (
              <AreaChart data={cashFlowData?.weeklyData || []}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="weekLabel" stroke="#666" fontSize={12} />
                <YAxis stroke="#666" fontSize={12} tickFormatter={(value) => `$${(value / 1000).toFixed(0)}K`} />
                <Tooltip content={<CustomTooltip />} />
                <Legend />
                
                <Area
                  type="monotone"
                  dataKey="runningBalance"
                  stroke="#3b82f6"
                  fill="#3b82f6"
                  fillOpacity={0.2}
                  strokeWidth={2}
                  name="Running Balance"
                />
              </AreaChart>
            ) : (
              <AreaChart data={cashFlowData?.weeklyData || []}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="weekLabel" stroke="#666" fontSize={12} />
                <YAxis stroke="#666" fontSize={12} tickFormatter={(value) => `$${(value / 1000).toFixed(0)}K`} />
                <Tooltip content={<CustomTooltip />} />
                <Legend />
                
                <Area
                  type="monotone"
                  dataKey="movingAverage4w"
                  stroke="#8b5cf6"
                  fill="#8b5cf6"
                  fillOpacity={0.1}
                  strokeWidth={2}
                  name="4-Week Average"
                />
                <Line
                  type="monotone"
                  dataKey="movingAverage13w"
                  stroke="#f59e0b"
                  strokeWidth={3}
                  name="13-Week Average"
                  dot={false}
                />
              </AreaChart>
            )}
          </ResponsiveContainer>
        </div>

        {/* Cash Flow Insights and Projections */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* Insights */}
          <div>
            <h4 className="mb-3 text-sm font-medium text-gray-900">Cash Flow Insights</h4>
            <div className="space-y-3">
              {cashFlowData?.insights.map((insight, index) => (
                <div
                  key={index}
                  className={`rounded-lg p-3 ${
                    insight.type === 'positive' ? 'bg-green-50' :
                    insight.type === 'negative' ? 'bg-red-50' : 'bg-blue-50'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    {insight.type === 'positive' ? (
                      <CheckCircle className="h-4 w-4 text-green-600" />
                    ) : insight.type === 'negative' ? (
                      <AlertTriangle className="h-4 w-4 text-red-600" />
                    ) : (
                      <Target className="h-4 w-4 text-blue-600" />
                    )}
                    <span className={`text-sm font-medium ${
                      insight.type === 'positive' ? 'text-green-800' :
                      insight.type === 'negative' ? 'text-red-800' : 'text-blue-800'
                    }`}>
                      {insight.title}
                    </span>
                  </div>
                  <p className={`text-sm ${
                    insight.type === 'positive' ? 'text-green-700' :
                    insight.type === 'negative' ? 'text-red-700' : 'text-blue-700'
                  }`}>
                    {insight.description}
                  </p>
                  <p className={`text-xs mt-1 ${
                    insight.type === 'positive' ? 'text-green-600' :
                    insight.type === 'negative' ? 'text-red-600' : 'text-blue-600'
                  }`}>
                    {insight.impact}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* 4-Week Projections */}
          {showProjections && cashFlowData && (
            <div>
              <h4 className="mb-3 text-sm font-medium text-gray-900">4-Week Projections</h4>
              <div className="space-y-3">
                {cashFlowData.projections.next4Weeks.map((projection, index) => (
                  <div key={index} className="rounded-lg border p-3">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium">Week {projection.week}</span>
                      <Badge 
                        variant={projection.confidenceLevel === 'high' ? 'default' : 'outline'}
                        className="text-xs"
                      >
                        {projection.confidenceLevel} confidence
                      </Badge>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div>
                        <span className="text-gray-500">In: </span>
                        <span className="font-medium text-green-600">
                          {formatCurrency(projection.projectedInflow)}
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-500">Out: </span>
                        <span className="font-medium text-red-600">
                          {formatCurrency(projection.projectedOutflow)}
                        </span>
                      </div>
                    </div>
                    
                    <div className="mt-2 text-sm">
                      <span className="text-gray-500">Net: </span>
                      <span className={`font-medium ${projection.projectedNetFlow > 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {formatCurrency(projection.projectedNetFlow)}
                      </span>
                    </div>
                  </div>
                ))}

                {/* 30-Day Projection Summary */}
                <div className={`rounded-lg p-3 ${
                  cashFlowData.projections.cashFlowRisk === 'low' ? 'bg-green-50' :
                  cashFlowData.projections.cashFlowRisk === 'medium' ? 'bg-amber-50' : 'bg-red-50'
                }`}>
                  <div className="flex items-center gap-2 mb-2">
                    {cashFlowData.projections.cashFlowRisk === 'low' ? (
                      <CheckCircle className="h-4 w-4 text-green-600" />
                    ) : (
                      <AlertTriangle className="h-4 w-4 text-amber-600" />
                    )}
                    <span className={`text-sm font-medium ${
                      cashFlowData.projections.cashFlowRisk === 'low' ? 'text-green-800' : 'text-amber-800'
                    }`}>
                      30-Day Outlook
                    </span>
                  </div>
                  <p className="text-sm font-bold">
                    Projected Balance: {formatCurrency(cashFlowData.projections.projectedBalance30d)}
                  </p>
                  <p className={`text-xs mt-1 ${
                    cashFlowData.projections.cashFlowRisk === 'low' ? 'text-green-700' : 'text-amber-700'
                  }`}>
                    Risk Level: {cashFlowData.projections.cashFlowRisk}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Chart Controls and Legend */}
        <div className="flex items-center justify-between text-xs text-gray-500">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <div className="h-3 w-6 rounded bg-green-500" />
              <span>Inflows</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-3 w-6 rounded bg-red-500" />
              <span>Outflows</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-3 w-6 rounded bg-blue-500" />
              <span>Net Flow / Balance</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span>Volatility: {cashFlowData?.summary.volatilityScore.toFixed(1)}%</span>
            <Button variant="outline" size="sm">
              <Download className="h-3 w-3" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
