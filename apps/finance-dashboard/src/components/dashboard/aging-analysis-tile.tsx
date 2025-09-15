'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Users,
  Building2,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  Eye,
  RefreshCw,
  Clock,
  DollarSign,
  FileText,
} from 'lucide-react'
import { formatCurrency, formatPercentage } from '@/utils/financial'
import { AR_AGING_BUCKETS, AP_AGING_BUCKETS } from '@/constants/financial'

interface AgingBucket {
  label: string
  amount: number
  count: number
  percentage: number
  minDays: number
  maxDays?: number
  color: string
  textColor: string
  isOverdue: boolean
}

interface AgingAnalysisData {
  type: 'ar' | 'ap'
  totalOutstanding: number
  totalCount: number
  buckets: AgingBucket[]
  trends: {
    currentTotal: number
    priorTotal: number
    changePercent: number
  }
  lastUpdated: Date
  overdueAmount: number
  overduePercent: number
  averageDaysOutstanding: number
}

interface AgingAnalysisTileProps {
  type: 'ar' | 'ap'
  showDetails?: boolean
  refreshInterval?: number
  className?: string
}

const BUCKET_COLORS = {
  current: { bg: 'bg-green-100', text: 'text-green-800', border: 'border-green-200' },
  early: { bg: 'bg-yellow-100', text: 'text-yellow-800', border: 'border-yellow-200' },
  late: { bg: 'bg-orange-100', text: 'text-orange-800', border: 'border-orange-200' },
  overdue: { bg: 'bg-red-100', text: 'text-red-800', border: 'border-red-200' },
}

export function AgingAnalysisTile({ 
  type, 
  showDetails = false, 
  refreshInterval = 300000, // 5 minutes
  className 
}: AgingAnalysisTileProps) {
  const [agingData, setAgingData] = useState<AgingAnalysisData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date())

  const title = type === 'ar' ? 'AR Aging Analysis' : 'AP Aging Analysis'
  const description = type === 'ar' 
    ? 'Accounts receivable aging buckets' 
    : 'Accounts payable aging buckets'
  const icon = type === 'ar' ? <Users className="h-5 w-5" /> : <Building2 className="h-5 w-5" />

  useEffect(() => {
    loadAgingData()
    
    // Set up auto-refresh
    const interval = setInterval(() => {
      loadAgingData()
    }, refreshInterval)
    
    return () => clearInterval(interval)
  }, [type, refreshInterval])

  const loadAgingData = async () => {
    try {
      setError(null)
      
      // In real implementation, this would call the aging analysis server action
      // For now, simulate with sample data
      await new Promise(resolve => setTimeout(resolve, 500))
      
      const buckets = type === 'ar' ? AR_AGING_BUCKETS : AP_AGING_BUCKETS
      
      // Sample aging data
      const sampleAmounts = type === 'ar' 
        ? [26530, 12400, 8950, 9800] // AR amounts
        : [18650, 8900, 4600, 0] // AP amounts
      
      const sampleCounts = type === 'ar'
        ? [45, 18, 12, 8] // AR invoice counts
        : [32, 14, 6, 0] // AP bill counts

      const totalAmount = sampleAmounts.reduce((sum, amount) => sum + amount, 0)
      const totalCount = sampleCounts.reduce((sum, count) => sum + count, 0)
      
      const agingBuckets: AgingBucket[] = buckets.map((bucket, index) => {
        const amount = sampleAmounts[index] || 0
        const count = sampleCounts[index] || 0
        const percentage = totalAmount > 0 ? (amount / totalAmount) * 100 : 0
        
        // Determine color based on bucket
        let colorScheme = BUCKET_COLORS.current
        if (bucket.minDays > 60) colorScheme = BUCKET_COLORS.overdue
        else if (bucket.minDays > 30) colorScheme = BUCKET_COLORS.late
        else if (bucket.minDays > 0) colorScheme = BUCKET_COLORS.early

        return {
          label: bucket.label,
          amount,
          count,
          percentage,
          minDays: bucket.minDays,
          maxDays: bucket.maxDays,
          color: colorScheme.bg,
          textColor: colorScheme.text,
          isOverdue: bucket.minDays > (type === 'ar' ? 45 : 60),
        }
      })

      // Calculate overdue amounts (AR > 45 days, AP > 60 days)
      const overdueThreshold = type === 'ar' ? 45 : 60
      const overdueAmount = agingBuckets
        .filter(bucket => bucket.minDays > overdueThreshold)
        .reduce((sum, bucket) => sum + bucket.amount, 0)
      
      const overduePercent = totalAmount > 0 ? (overdueAmount / totalAmount) * 100 : 0

      // Calculate average days outstanding (weighted by amount)
      const totalDaysWeighted = agingBuckets.reduce((sum, bucket) => {
        const avgDays = bucket.maxDays ? (bucket.minDays + bucket.maxDays) / 2 : bucket.minDays + 15
        return sum + (avgDays * bucket.amount)
      }, 0)
      const averageDaysOutstanding = totalAmount > 0 ? totalDaysWeighted / totalAmount : 0

      const data: AgingAnalysisData = {
        type,
        totalOutstanding: totalAmount,
        totalCount,
        buckets: agingBuckets,
        trends: {
          currentTotal: totalAmount,
          priorTotal: type === 'ar' ? 52800 : 28900, // Sample prior period
          changePercent: type === 'ar' ? -14.2 : 11.3, // Sample change
        },
        lastUpdated: new Date(),
        overdueAmount,
        overduePercent,
        averageDaysOutstanding,
      }
      
      setAgingData(data)
      setLastRefresh(new Date())
    } catch (err) {
      setError(err instanceof Error ? err.message : `Failed to load ${type.toUpperCase()} aging data`)
    } finally {
      setIsLoading(false)
    }
  }

  const handleRefresh = () => {
    setIsLoading(true)
    loadAgingData()
  }

  const getTrendIcon = () => {
    if (!agingData) return <Clock className="h-4 w-4" />
    
    if (agingData.trends.changePercent > 0) {
      return <TrendingUp className="h-4 w-4 text-red-600" /> // Increase in outstanding is bad
    } else if (agingData.trends.changePercent < 0) {
      return <TrendingDown className="h-4 w-4 text-green-600" /> // Decrease in outstanding is good
    }
    return <Clock className="h-4 w-4 text-gray-600" />
  }

  if (!showDetails) {
    // Compact view for dashboard
    return (
      <Card className={className}>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center text-lg">
            {icon}
            <span className="ml-2">{title}</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              <div className="h-6 w-24 animate-pulse rounded bg-gray-200" />
              <div className="space-y-2">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="h-4 w-full animate-pulse rounded bg-gray-200" />
                ))}
              </div>
            </div>
          ) : error ? (
            <div className="text-center text-red-600">
              <AlertTriangle className="mx-auto h-6 w-6" />
              <p className="mt-2 text-sm">{error}</p>
            </div>
          ) : agingData ? (
            <div className="space-y-3">
              {/* Total Outstanding */}
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Total Outstanding</span>
                <span className="text-lg font-bold">{formatCurrency(agingData.totalOutstanding)}</span>
              </div>

              {/* Aging Buckets */}
              <div className="space-y-2">
                {agingData.buckets.map((bucket, index) => (
                  <div key={index} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className={`h-3 w-3 rounded-full ${bucket.color.replace('bg-', 'bg-').replace('-100', '-500')}`} />
                      <span className={`text-sm ${bucket.isOverdue ? 'font-medium text-red-600' : ''}`}>
                        {bucket.label}
                      </span>
                    </div>
                    <span className={`text-sm font-medium ${bucket.isOverdue ? 'text-red-600' : ''}`}>
                      {formatCurrency(bucket.amount)}
                    </span>
                  </div>
                ))}
              </div>

              {/* Overdue Summary */}
              {agingData.overdueAmount > 0 && (
                <div className="rounded-lg bg-red-50 p-3">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-red-600" />
                    <span className="text-sm font-medium text-red-800">
                      {formatCurrency(agingData.overdueAmount)} overdue
                    </span>
                  </div>
                  <p className="text-xs text-red-700">
                    {agingData.overduePercent.toFixed(1)}% of total outstanding
                  </p>
                </div>
              )}
            </div>
          ) : null}
        </CardContent>
      </Card>
    )
  }

  // Detailed view
  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center">
              {icon}
              <span className="ml-2">{title}</span>
            </CardTitle>
            <CardDescription>{description}</CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleRefresh}
              disabled={isLoading}
            >
              <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            </Button>
            <Button variant="outline" size="sm">
              <Eye className="mr-2 h-4 w-4" />
              View {type.toUpperCase()}
            </Button>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {error && (
          <div className="rounded-md bg-red-50 p-4">
            <div className="flex">
              <AlertTriangle className="h-5 w-5 text-red-400" />
              <div className="ml-3">
                <p className="text-sm text-red-800">{error}</p>
              </div>
            </div>
          </div>
        )}

        {isLoading ? (
          <div className="space-y-4">
            <div className="h-16 w-full animate-pulse rounded-lg bg-gray-200" />
            <div className="space-y-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-12 w-full animate-pulse rounded bg-gray-200" />
              ))}
            </div>
          </div>
        ) : agingData ? (
          <>
            {/* Summary Metrics */}
            <div className="grid grid-cols-2 gap-4">
              <div className="rounded-lg border p-3">
                <div className="flex items-center gap-2">
                  <DollarSign className="h-4 w-4 text-gray-600" />
                  <span className="text-sm font-medium">Total Outstanding</span>
                </div>
                <p className="mt-1 text-xl font-bold">
                  {formatCurrency(agingData.totalOutstanding)}
                </p>
                <div className="mt-1 flex items-center gap-1">
                  {getTrendIcon()}
                  <span className="text-xs text-gray-600">
                    {Math.abs(agingData.trends.changePercent).toFixed(1)}% vs prior
                  </span>
                </div>
              </div>

              <div className="rounded-lg border p-3">
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-gray-600" />
                  <span className="text-sm font-medium">Total {type === 'ar' ? 'Invoices' : 'Bills'}</span>
                </div>
                <p className="mt-1 text-xl font-bold">{agingData.totalCount}</p>
                <p className="mt-1 text-xs text-gray-600">
                  Avg: {agingData.averageDaysOutstanding.toFixed(0)} days
                </p>
              </div>
            </div>

            {/* Visual Aging Buckets */}
            <div>
              <h4 className="mb-3 text-sm font-medium text-gray-900">Aging Breakdown</h4>
              
              {/* Progress Bar Visualization */}
              <div className="mb-4 h-6 overflow-hidden rounded-lg bg-gray-200">
                <div className="flex h-full">
                  {agingData.buckets.map((bucket, index) => (
                    bucket.percentage > 0 && (
                      <div
                        key={index}
                        className={`${bucket.color.replace('-100', '-400')} flex items-center justify-center text-xs font-medium text-white`}
                        style={{ width: `${bucket.percentage}%` }}
                        title={`${bucket.label}: ${formatCurrency(bucket.amount)} (${bucket.percentage.toFixed(1)}%)`}
                      >
                        {bucket.percentage > 10 && bucket.percentage.toFixed(0)}
                      </div>
                    )
                  ))}
                </div>
              </div>

              {/* Detailed Bucket List */}
              <div className="space-y-2">
                {agingData.buckets.map((bucket, index) => (
                  <div
                    key={index}
                    className={`flex items-center justify-between rounded-lg border p-3 ${bucket.color} ${bucket.isOverdue ? 'ring-2 ring-red-200' : ''}`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-2">
                        <div className={`h-3 w-3 rounded-full ${bucket.color.replace('bg-', 'bg-').replace('-100', '-500')}`} />
                        <span className={`text-sm font-medium ${bucket.textColor}`}>
                          {bucket.label}
                        </span>
                        {bucket.isOverdue && (
                          <AlertTriangle className="h-4 w-4 text-red-600" />
                        )}
                      </div>
                    </div>
                    
                    <div className="text-right">
                      <p className={`text-sm font-bold ${bucket.textColor}`}>
                        {formatCurrency(bucket.amount)}
                      </p>
                      <div className="flex items-center gap-2 text-xs">
                        <span className={bucket.textColor}>
                          {bucket.count} {type === 'ar' ? 'invoices' : 'bills'}
                        </span>
                        <Badge variant="outline" className="text-xs">
                          {bucket.percentage.toFixed(1)}%
                        </Badge>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Risk Indicators */}
            {agingData.overdueAmount > 0 && (
              <div className="rounded-lg bg-red-50 p-4">
                <div className="flex items-center gap-2 mb-2">
                  <AlertTriangle className="h-5 w-5 text-red-600" />
                  <span className="font-medium text-red-800">
                    {type === 'ar' ? 'Collection Risk Alert' : 'Payment Priority Alert'}
                  </span>
                </div>
                <p className="text-sm text-red-700 mb-2">
                  {formatCurrency(agingData.overdueAmount)} ({agingData.overduePercent.toFixed(1)}%) 
                  is overdue and requires immediate attention.
                </p>
                <div className="flex items-center gap-2">
                  <Button size="sm" variant="outline" className="text-red-700 border-red-300">
                    <Eye className="mr-2 h-3 w-3" />
                    View Overdue {type === 'ar' ? 'Customers' : 'Suppliers'}
                  </Button>
                  {type === 'ar' && (
                    <Button size="sm" variant="outline" className="text-red-700 border-red-300">
                      <FileText className="mr-2 h-3 w-3" />
                      Send Reminders
                    </Button>
                  )}
                </div>
              </div>
            )}

            {/* Performance Insights */}
            <div className="rounded-lg bg-blue-50 p-4">
              <h5 className="mb-2 text-sm font-medium text-blue-800">Performance Insights</h5>
              <div className="space-y-1 text-sm text-blue-700">
                <p>
                  • Average {type === 'ar' ? 'collection' : 'payment'} time: {agingData.averageDaysOutstanding.toFixed(0)} days
                </p>
                <p>
                  • {agingData.trends.changePercent > 0 ? 'Increase' : 'Decrease'} of {Math.abs(agingData.trends.changePercent).toFixed(1)}% vs prior period
                </p>
                <p>
                  • {((agingData.buckets[0]?.percentage || 0)).toFixed(1)}% of amounts are current (0-30 days)
                </p>
                {agingData.overduePercent > 20 && (
                  <p className="font-medium text-red-700">
                    • High overdue percentage ({agingData.overduePercent.toFixed(1)}%) requires attention
                  </p>
                )}
              </div>
            </div>

            {/* Last Updated */}
            <div className="flex items-center justify-between text-xs text-gray-500">
              <div className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                Last updated: {lastRefresh.toLocaleTimeString()}
              </div>
              <div className="flex items-center gap-1">
                <RefreshCw className="h-3 w-3" />
                Auto-refresh: {refreshInterval / 60000}min
              </div>
            </div>
          </>
        ) : null}
      </CardContent>
    </Card>
  )
}
