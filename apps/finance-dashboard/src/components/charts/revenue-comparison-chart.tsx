'use client'

import { useState, useEffect } from 'react'
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
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
  BarChart3,
  LineChart as LineChartIcon,
  RefreshCw,
  Download,
  Filter,
  Calendar,
  DollarSign,
} from 'lucide-react'
import { formatCurrency } from '@/utils/financial'
import { getCurrentFinancialYear } from '@/lib/utils/dates'
import type { RevenueStream } from '@/types'

interface WeeklyRevenueData {
  week: number
  weekLabel: string
  currentYear: number
  priorYear: number
  variance: number
  variancePercent: number
  currentYearCumulative: number
  priorYearCumulative: number
}

interface RevenueComparisonData {
  weeklyData: WeeklyRevenueData[]
  summary: {
    currentYTD: number
    priorYTD: number
    totalVariance: number
    totalVariancePercent: number
    currentFYLabel: string
    priorFYLabel: string
  }
  revenueStreams: Array<{
    stream: RevenueStream
    currentYTD: number
    priorYTD: number
    variancePercent: number
    color: string
  }>
  lastUpdated: Date
}

interface RevenueComparisonChartProps {
  revenueStream?: RevenueStream | 'all'
  chartType?: 'line' | 'bar'
  showCumulative?: boolean
  weeksToShow?: number
  className?: string
}

const REVENUE_STREAM_COLORS = {
  tours: '#22c55e',
  'dr-dish': '#3b82f6',
  marketing: '#f59e0b',
  other: '#6b7280',
  all: '#8b5cf6',
}

export function RevenueComparisonChart({
  revenueStream = 'all',
  chartType = 'line',
  showCumulative = true,
  weeksToShow = 26,
  className,
}: RevenueComparisonChartProps) {
  const [revenueData, setRevenueData] = useState<RevenueComparisonData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedView, setSelectedView] = useState<'weekly' | 'cumulative'>('cumulative')
  const [selectedStream, setSelectedStream] = useState<RevenueStream | 'all'>(revenueStream)

  const currentFY = getCurrentFinancialYear()

  useEffect(() => {
    loadRevenueData()
  }, [selectedStream, weeksToShow])

  const loadRevenueData = async () => {
    setIsLoading(true)
    setError(null)

    try {
      // In real implementation, this would call the revenue stream analytics
      // For now, simulate with sample data
      await new Promise(resolve => setTimeout(resolve, 800))

      // Generate sample weekly data
      const weeklyData: WeeklyRevenueData[] = []
      let currentCumulative = 0
      let priorCumulative = 0

      for (let week = 1; week <= weeksToShow; week++) {
        // Simulate weekly revenue with seasonal patterns
        const baseRevenue = 15000 + Math.sin(week * 0.2) * 5000 + Math.random() * 3000
        const currentWeekRevenue = selectedStream === 'tours' 
          ? baseRevenue * 1.2 // Tours higher in certain weeks
          : selectedStream === 'dr-dish'
          ? baseRevenue * 0.3 // Dr Dish lower volume
          : selectedStream === 'marketing'
          ? baseRevenue * 0.2 // Marketing lowest
          : baseRevenue // All streams combined

        const priorWeekRevenue = currentWeekRevenue * (0.85 + Math.random() * 0.3) // Prior year variation

        currentCumulative += currentWeekRevenue
        priorCumulative += priorWeekRevenue

        const variance = currentWeekRevenue - priorWeekRevenue
        const variancePercent = priorWeekRevenue > 0 ? (variance / priorWeekRevenue) * 100 : 0

        weeklyData.push({
          week,
          weekLabel: `W${week}`,
          currentYear: Math.round(currentWeekRevenue),
          priorYear: Math.round(priorWeekRevenue),
          variance: Math.round(variance),
          variancePercent: Number(variancePercent.toFixed(1)),
          currentYearCumulative: Math.round(currentCumulative),
          priorYearCumulative: Math.round(priorCumulative),
        })
      }

      const totalVariance = currentCumulative - priorCumulative
      const totalVariancePercent = priorCumulative > 0 ? (totalVariance / priorCumulative) * 100 : 0

      // Sample revenue stream data
      const revenueStreams = [
        {
          stream: 'tours' as RevenueStream,
          currentYTD: 266963,
          priorYTD: 245800,
          variancePercent: 8.6,
          color: REVENUE_STREAM_COLORS.tours,
        },
        {
          stream: 'dr-dish' as RevenueStream,
          currentYTD: 16682,
          priorYTD: 19200,
          variancePercent: -13.1,
          color: REVENUE_STREAM_COLORS['dr-dish'],
        },
        {
          stream: 'marketing' as RevenueStream,
          currentYTD: 15600,
          priorYTD: 12400,
          variancePercent: 25.8,
          color: REVENUE_STREAM_COLORS.marketing,
        },
        {
          stream: 'other' as RevenueStream,
          currentYTD: 2808,
          priorYTD: 1240,
          variancePercent: 126.5,
          color: REVENUE_STREAM_COLORS.other,
        },
      ]

      setRevenueData({
        weeklyData,
        summary: {
          currentYTD: Math.round(currentCumulative),
          priorYTD: Math.round(priorCumulative),
          totalVariance: Math.round(totalVariance),
          totalVariancePercent: Number(totalVariancePercent.toFixed(1)),
          currentFYLabel: currentFY.label,
          priorFYLabel: `FY ${currentFY.year - 1}-${String(currentFY.year).slice(-2)}`,
        },
        revenueStreams,
        lastUpdated: new Date(),
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load revenue comparison data')
    } finally {
      setIsLoading(false)
    }
  }

  const handleRefresh = () => {
    loadRevenueData()
  }

  const getVarianceColor = (variancePercent: number) => {
    if (variancePercent > 10) return 'text-green-600'
    if (variancePercent > 0) return 'text-green-500'
    if (variancePercent > -10) return 'text-red-500'
    return 'text-red-600'
  }

  const getVarianceIcon = (variancePercent: number) => {
    return variancePercent > 0 
      ? <TrendingUp className="h-4 w-4 text-green-600" />
      : <TrendingDown className="h-4 w-4 text-red-600" />
  }

  // Custom tooltip for charts
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload
      return (
        <div className="rounded-lg border bg-white p-3 shadow-lg">
          <p className="font-medium">{`Week ${label}`}</p>
          <div className="mt-2 space-y-1">
            <p className="text-sm">
              <span className="text-blue-600">Current FY: </span>
              {formatCurrency(data.currentYear)}
            </p>
            <p className="text-sm">
              <span className="text-gray-600">Prior FY: </span>
              {formatCurrency(data.priorYear)}
            </p>
            <p className="text-sm">
              <span className={getVarianceColor(data.variancePercent)}>
                Variance: {data.variancePercent > 0 ? '+' : ''}{data.variancePercent}%
              </span>
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
            <BarChart3 className="mr-2 h-5 w-5" />
            YTD Revenue Comparison
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
            <BarChart3 className="mx-auto h-8 w-8" />
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
              <BarChart3 className="mr-2 h-5 w-5" />
              YTD Revenue Comparison
            </CardTitle>
            <CardDescription>
              Week-by-week revenue comparison: {revenueData?.summary.currentFYLabel} vs {revenueData?.summary.priorFYLabel}
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Select
              value={selectedView}
              onValueChange={(value) => setSelectedView(value as 'weekly' | 'cumulative')}
            >
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="weekly">Weekly</SelectItem>
                <SelectItem value="cumulative">Cumulative</SelectItem>
              </SelectContent>
            </Select>
            
            <Select
              value={selectedStream}
              onValueChange={(value) => setSelectedStream(value as RevenueStream | 'all')}
            >
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Streams</SelectItem>
                <SelectItem value="tours">Tours</SelectItem>
                <SelectItem value="dr-dish">Dr Dish</SelectItem>
                <SelectItem value="marketing">Marketing</SelectItem>
                <SelectItem value="other">Other</SelectItem>
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
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <div className="rounded-lg border p-3">
            <div className="flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-blue-600" />
              <span className="text-sm font-medium">Current YTD</span>
            </div>
            <p className="mt-1 text-xl font-bold text-blue-900">
              {formatCurrency(revenueData?.summary.currentYTD || 0)}
            </p>
          </div>

          <div className="rounded-lg border p-3">
            <div className="flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-gray-600" />
              <span className="text-sm font-medium">Prior YTD</span>
            </div>
            <p className="mt-1 text-xl font-bold text-gray-900">
              {formatCurrency(revenueData?.summary.priorYTD || 0)}
            </p>
          </div>

          <div className="rounded-lg border p-3">
            <div className="flex items-center gap-2">
              {revenueData && getVarianceIcon(revenueData.summary.totalVariancePercent)}
              <span className="text-sm font-medium">Variance</span>
            </div>
            <p className={`mt-1 text-xl font-bold ${revenueData ? getVarianceColor(revenueData.summary.totalVariancePercent) : ''}`}>
              {revenueData ? `${revenueData.summary.totalVariancePercent > 0 ? '+' : ''}${revenueData.summary.totalVariancePercent.toFixed(1)}%` : '0%'}
            </p>
            <p className="text-xs text-gray-500">
              {formatCurrency(Math.abs(revenueData?.summary.totalVariance || 0))}
            </p>
          </div>
        </div>

        {/* Chart */}
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            {chartType === 'line' ? (
              <LineChart data={revenueData?.weeklyData || []}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis 
                  dataKey="weekLabel" 
                  stroke="#666"
                  fontSize={12}
                />
                <YAxis 
                  stroke="#666"
                  fontSize={12}
                  tickFormatter={(value) => `$${(value / 1000).toFixed(0)}K`}
                />
                <Tooltip content={<CustomTooltip />} />
                <Legend />
                
                {selectedView === 'weekly' ? (
                  <>
                    <Line
                      type="monotone"
                      dataKey="currentYear"
                      stroke="#3b82f6"
                      strokeWidth={3}
                      name={revenueData?.summary.currentFYLabel || 'Current FY'}
                      dot={{ fill: '#3b82f6', strokeWidth: 2, r: 4 }}
                      activeDot={{ r: 6, stroke: '#3b82f6', strokeWidth: 2 }}
                    />
                    <Line
                      type="monotone"
                      dataKey="priorYear"
                      stroke="#9ca3af"
                      strokeWidth={2}
                      strokeDasharray="5 5"
                      name={revenueData?.summary.priorFYLabel || 'Prior FY'}
                      dot={{ fill: '#9ca3af', strokeWidth: 2, r: 3 }}
                    />
                  </>
                ) : (
                  <>
                    <Line
                      type="monotone"
                      dataKey="currentYearCumulative"
                      stroke="#3b82f6"
                      strokeWidth={3}
                      name={`${revenueData?.summary.currentFYLabel || 'Current FY'} (Cumulative)`}
                      dot={{ fill: '#3b82f6', strokeWidth: 2, r: 4 }}
                      activeDot={{ r: 6, stroke: '#3b82f6', strokeWidth: 2 }}
                    />
                    <Line
                      type="monotone"
                      dataKey="priorYearCumulative"
                      stroke="#9ca3af"
                      strokeWidth={2}
                      strokeDasharray="5 5"
                      name={`${revenueData?.summary.priorFYLabel || 'Prior FY'} (Cumulative)`}
                      dot={{ fill: '#9ca3af', strokeWidth: 2, r: 3 }}
                    />
                  </>
                )}
                
                {/* Reference line for break-even or target */}
                <ReferenceLine 
                  y={selectedView === 'weekly' ? 12000 : 200000} 
                  stroke="#ef4444" 
                  strokeDasharray="2 2" 
                  label={{ value: "Target", position: "insideTopRight" }}
                />
              </LineChart>
            ) : (
              <BarChart data={revenueData?.weeklyData || []}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis 
                  dataKey="weekLabel" 
                  stroke="#666"
                  fontSize={12}
                />
                <YAxis 
                  stroke="#666"
                  fontSize={12}
                  tickFormatter={(value) => `$${(value / 1000).toFixed(0)}K`}
                />
                <Tooltip content={<CustomTooltip />} />
                <Legend />
                
                <Bar
                  dataKey={selectedView === 'weekly' ? 'currentYear' : 'currentYearCumulative'}
                  fill="#3b82f6"
                  name={revenueData?.summary.currentFYLabel || 'Current FY'}
                  radius={[2, 2, 0, 0]}
                />
                <Bar
                  dataKey={selectedView === 'weekly' ? 'priorYear' : 'priorYearCumulative'}
                  fill="#9ca3af"
                  name={revenueData?.summary.priorFYLabel || 'Prior FY'}
                  radius={[2, 2, 0, 0]}
                />
              </BarChart>
            )}
          </ResponsiveContainer>
        </div>

        {/* Revenue Stream Breakdown */}
        {selectedStream === 'all' && revenueData && (
          <div>
            <h4 className="mb-3 text-sm font-medium text-gray-900">Revenue Stream Performance</h4>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-4">
              {revenueData.revenueStreams.map((stream) => (
                <div
                  key={stream.stream}
                  className="rounded-lg border p-3 hover:bg-gray-50 cursor-pointer"
                  onClick={() => setSelectedStream(stream.stream)}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <div 
                      className="h-3 w-3 rounded-full" 
                      style={{ backgroundColor: stream.color }}
                    />
                    <span className="text-sm font-medium capitalize">
                      {stream.stream.replace('-', ' ')}
                    </span>
                  </div>
                  <p className="text-lg font-bold">
                    {formatCurrency(stream.currentYTD)}
                  </p>
                  <div className="flex items-center gap-1 mt-1">
                    {getVarianceIcon(stream.variancePercent)}
                    <span className={`text-xs font-medium ${getVarianceColor(stream.variancePercent)}`}>
                      {stream.variancePercent > 0 ? '+' : ''}{stream.variancePercent.toFixed(1)}%
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Performance Insights */}
        <div className="rounded-lg bg-blue-50 p-4">
          <h5 className="mb-2 text-sm font-medium text-blue-800">Performance Insights</h5>
          <div className="space-y-1 text-sm text-blue-700">
            {revenueData && (
              <>
                <p>
                  • YTD revenue is {revenueData.summary.totalVariancePercent > 0 ? 'up' : 'down'} {Math.abs(revenueData.summary.totalVariancePercent).toFixed(1)}% vs prior year
                </p>
                <p>
                  • {formatCurrency(Math.abs(revenueData.summary.totalVariance))} {revenueData.summary.totalVariancePercent > 0 ? 'increase' : 'decrease'} in total revenue
                </p>
                {revenueData.revenueStreams.find(s => s.variancePercent > 20) && (
                  <p className="font-medium text-green-700">
                    • Strong growth in {revenueData.revenueStreams.filter(s => s.variancePercent > 20).map(s => s.stream).join(', ')}
                  </p>
                )}
                {revenueData.revenueStreams.find(s => s.variancePercent < -10) && (
                  <p className="font-medium text-red-700">
                    • Declining performance in {revenueData.revenueStreams.filter(s => s.variancePercent < -10).map(s => s.stream).join(', ')}
                  </p>
                )}
              </>
            )}
          </div>
        </div>

        {/* Chart Controls */}
        <div className="flex items-center justify-between text-xs text-gray-500">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <div className="h-3 w-6 rounded bg-blue-500" />
              <span>{revenueData?.summary.currentFYLabel}</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-3 w-6 rounded bg-gray-400" style={{ backgroundImage: 'repeating-linear-gradient(45deg, transparent, transparent 2px, white 2px, white 4px)' }} />
              <span>{revenueData?.summary.priorFYLabel}</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant={chartType === 'line' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSelectedView('weekly')}
            >
              <LineChartIcon className="h-3 w-3" />
            </Button>
            <Button
              variant={chartType === 'bar' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSelectedView('cumulative')}
            >
              <BarChart3 className="h-3 w-3" />
            </Button>
            <Button variant="outline" size="sm">
              <Download className="h-3 w-3" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
