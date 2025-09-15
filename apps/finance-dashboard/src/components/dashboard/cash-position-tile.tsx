'use client'

import { useState, useEffect } from 'react'
import { MetricTile } from '@/components/ui/metric-tile'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  Minus,
  RefreshCw,
  Eye,
  AlertCircle,
  CheckCircle,
  Clock,
  Banknote,
} from 'lucide-react'
import { formatCurrency, formatAustralianDateTime } from '@/utils/financial'

interface BankAccount {
  id: string
  code: string
  name: string
  balance: number
  currency: string
  status: 'active' | 'inactive'
  lastTransactionDate: Date
  accountType: 'checking' | 'savings' | 'credit' | 'loan'
}

interface CashPositionData {
  totalCash: number
  totalChange: number
  changePercent: number
  lastUpdated: Date
  bankAccounts: BankAccount[]
  trends: {
    daily: number[]
    weekly: number[]
    labels: string[]
  }
}

interface CashPositionTileProps {
  showDetails?: boolean
  refreshInterval?: number
  className?: string
}

export function CashPositionTile({ 
  showDetails = false, 
  refreshInterval = 300000, // 5 minutes
  className 
}: CashPositionTileProps) {
  const [cashData, setCashData] = useState<CashPositionData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date())

  useEffect(() => {
    loadCashPosition()
    
    // Set up auto-refresh
    const interval = setInterval(() => {
      loadCashPosition()
    }, refreshInterval)
    
    return () => clearInterval(interval)
  }, [refreshInterval])

  const loadCashPosition = async () => {
    try {
      setError(null)
      
      // In real implementation, this would call a server action
      // For now, simulate with sample data
      await new Promise(resolve => setTimeout(resolve, 500))
      
      const sampleData: CashPositionData = {
        totalCash: 284295.50,
        totalChange: 36420.75,
        changePercent: 15.2,
        lastUpdated: new Date(),
        bankAccounts: [
          {
            id: 'bank1',
            code: 'CHQACC',
            name: 'ANZ Business Cheque Account',
            balance: 156780.25,
            currency: 'AUD',
            status: 'active',
            lastTransactionDate: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
            accountType: 'checking',
          },
          {
            id: 'bank2',
            code: 'SAVACC',
            name: 'ANZ Business Savings Account',
            balance: 127515.25,
            currency: 'AUD',
            status: 'active',
            lastTransactionDate: new Date(Date.now() - 24 * 60 * 60 * 1000), // 1 day ago
            accountType: 'savings',
          },
          {
            id: 'bank3',
            code: 'PETTY',
            name: 'Petty Cash',
            balance: 0,
            currency: 'AUD',
            status: 'active',
            lastTransactionDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // 1 week ago
            accountType: 'checking',
          },
        ],
        trends: {
          daily: [248750, 251200, 256800, 262400, 268900, 275300, 284295],
          weekly: [220000, 235000, 248000, 262000, 275000, 284295],
          labels: ['Week 1', 'Week 2', 'Week 3', 'Week 4', 'Week 5', 'Current'],
        },
      }
      
      setCashData(sampleData)
      setLastRefresh(new Date())
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load cash position')
    } finally {
      setIsLoading(false)
    }
  }

  const handleRefresh = () => {
    setIsLoading(true)
    loadCashPosition()
  }

  const getTrendIcon = () => {
    if (!cashData) return <Minus className="h-4 w-4" />
    
    if (cashData.changePercent > 0) {
      return <TrendingUp className="h-4 w-4 text-green-600" />
    } else if (cashData.changePercent < 0) {
      return <TrendingDown className="h-4 w-4 text-red-600" />
    }
    return <Minus className="h-4 w-4 text-gray-600" />
  }

  const getTrendColor = () => {
    if (!cashData) return 'neutral'
    return cashData.changePercent > 0 ? 'positive' : cashData.changePercent < 0 ? 'negative' : 'neutral'
  }

  const getAccountStatusIcon = (account: BankAccount) => {
    const hoursSinceLastTransaction = (Date.now() - account.lastTransactionDate.getTime()) / (1000 * 60 * 60)
    
    if (hoursSinceLastTransaction > 72) { // 3 days
      return <AlertCircle className="h-4 w-4 text-amber-500" />
    }
    return <CheckCircle className="h-4 w-4 text-green-500" />
  }

  if (!showDetails) {
    // Compact tile view for dashboard grid
    return (
      <MetricTile
        title="Cash Position"
        value={cashData?.totalCash || 0}
        currency
        isLoading={isLoading}
        change={{
          value: cashData ? `${cashData.changePercent > 0 ? '+' : ''}${cashData.changePercent.toFixed(1)}%` : '',
          type: getTrendColor(),
          label: 'from last month',
        }}
        icon={<DollarSign className="h-5 w-5" />}
        className={className}
        onClick={() => {
          // Could open detailed cash position modal
          console.log('Open cash position details')
        }}
      />
    )
  }

  // Detailed view for dedicated cash position card
  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center">
              <Banknote className="mr-2 h-5 w-5" />
              Cash Position
            </CardTitle>
            <CardDescription>
              Real-time bank account balances and trends
            </CardDescription>
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
              Details
            </Button>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {error && (
          <div className="rounded-md bg-red-50 p-4">
            <div className="flex">
              <AlertCircle className="h-5 w-5 text-red-400" />
              <div className="ml-3">
                <p className="text-sm text-red-800">{error}</p>
              </div>
            </div>
          </div>
        )}

        {/* Total Cash Summary */}
        <div className="flex items-center justify-between rounded-lg border p-4">
          <div>
            <p className="text-sm font-medium text-gray-500">Total Cash Position</p>
            <p className="text-2xl font-bold">
              {isLoading ? (
                <div className="h-8 w-32 animate-pulse rounded bg-gray-200" />
              ) : (
                formatCurrency(cashData?.totalCash || 0)
              )}
            </p>
          </div>
          <div className="text-right">
            <div className="flex items-center gap-1">
              {getTrendIcon()}
              <span className={`text-sm font-medium ${
                getTrendColor() === 'positive' ? 'text-green-600' : 
                getTrendColor() === 'negative' ? 'text-red-600' : 'text-gray-600'
              }`}>
                {cashData ? `${cashData.changePercent > 0 ? '+' : ''}${cashData.changePercent.toFixed(1)}%` : '0%'}
              </span>
            </div>
            <p className="text-xs text-gray-500">
              {cashData ? formatCurrency(Math.abs(cashData.totalChange)) : formatCurrency(0)} change
            </p>
          </div>
        </div>

        {/* Bank Accounts Breakdown */}
        <div>
          <h4 className="mb-3 text-sm font-medium text-gray-900">Bank Accounts</h4>
          <div className="space-y-3">
            {isLoading ? (
              // Loading skeleton
              Array.from({ length: 3 }).map((_, index) => (
                <div key={index} className="flex items-center justify-between rounded-lg border p-3">
                  <div className="flex items-center gap-3">
                    <div className="h-4 w-4 animate-pulse rounded bg-gray-200" />
                    <div>
                      <div className="h-4 w-24 animate-pulse rounded bg-gray-200" />
                      <div className="mt-1 h-3 w-16 animate-pulse rounded bg-gray-200" />
                    </div>
                  </div>
                  <div className="h-5 w-20 animate-pulse rounded bg-gray-200" />
                </div>
              ))
            ) : (
              cashData?.bankAccounts.map((account) => (
                <div key={account.id} className="flex items-center justify-between rounded-lg border p-3 hover:bg-gray-50">
                  <div className="flex items-center gap-3">
                    {getAccountStatusIcon(account)}
                    <div>
                      <p className="text-sm font-medium">{account.name}</p>
                      <p className="text-xs text-gray-500">
                        {account.code} • {account.accountType}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium">
                      {formatCurrency(account.balance)}
                    </p>
                    <p className="text-xs text-gray-500">
                      {account.status}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Last Updated */}
        <div className="flex items-center justify-between text-xs text-gray-500">
          <div className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            Last updated: {formatAustralianDateTime(lastRefresh)}
          </div>
          <div className="flex items-center gap-1">
            <RefreshCw className="h-3 w-3" />
            Auto-refresh: {refreshInterval / 60000}min
          </div>
        </div>

        {/* Cash Flow Indicators */}
        {cashData && (
          <div className="grid grid-cols-2 gap-4">
            <div className="rounded-lg bg-green-50 p-3">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-green-600" />
                <span className="text-sm font-medium text-green-800">Inflows (7d)</span>
              </div>
              <p className="mt-1 text-lg font-bold text-green-900">
                {formatCurrency(45680)}
              </p>
            </div>
            
            <div className="rounded-lg bg-red-50 p-3">
              <div className="flex items-center gap-2">
                <TrendingDown className="h-4 w-4 text-red-600" />
                <span className="text-sm font-medium text-red-800">Outflows (7d)</span>
              </div>
              <p className="mt-1 text-lg font-bold text-red-900">
                {formatCurrency(32150)}
              </p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

// Server action to get real-time cash position data
export async function getCashPositionData(): Promise<{
  success: boolean
  data?: CashPositionData
  error?: string
}> {
  try {
    // In real implementation, this would query the fact_cash_position materialized view
    // and get real-time data from Xero via MCP
    
    // For now, return sample data
    const data: CashPositionData = {
      totalCash: 284295.50,
      totalChange: 36420.75,
      changePercent: 15.2,
      lastUpdated: new Date(),
      bankAccounts: [
        {
          id: 'bank1',
          code: 'CHQACC',
          name: 'ANZ Business Cheque Account',
          balance: 156780.25,
          currency: 'AUD',
          status: 'active',
          lastTransactionDate: new Date(Date.now() - 2 * 60 * 60 * 1000),
          accountType: 'checking',
        },
        {
          id: 'bank2',
          code: 'SAVACC',
          name: 'ANZ Business Savings Account',
          balance: 127515.25,
          currency: 'AUD',
          status: 'active',
          lastTransactionDate: new Date(Date.now() - 24 * 60 * 60 * 1000),
          accountType: 'savings',
        },
        {
          id: 'bank3',
          code: 'PETTY',
          name: 'Petty Cash',
          balance: 0,
          currency: 'AUD',
          status: 'active',
          lastTransactionDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
          accountType: 'checking',
        },
      ],
      trends: {
        daily: [248750, 251200, 256800, 262400, 268900, 275300, 284295],
        weekly: [220000, 235000, 248000, 262000, 275000, 284295],
        labels: ['Week 1', 'Week 2', 'Week 3', 'Week 4', 'Week 5', 'Current'],
      },
    }
    
    setCashData(data)
    setLastRefresh(new Date())
    
    return { success: true, data }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Failed to load cash position'
    setError(errorMessage)
    return { success: false, error: errorMessage }
  } finally {
    setIsLoading(false)
  }
}
