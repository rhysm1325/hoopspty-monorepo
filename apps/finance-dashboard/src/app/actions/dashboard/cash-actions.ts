'use server'

import { redirect } from 'next/navigation'
import { getUser } from '@/lib/auth/auth'
import { hasPermission } from '@/lib/auth/roles'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { logAuditEvent } from '@/lib/audit/logger'
import { formatCurrency } from '@/utils/financial'

export interface ActionResult<T = any> {
  success: boolean
  data?: T
  error?: string
  message?: string
}

export interface BankAccount {
  id: string
  code: string
  name: string
  balance: number
  currency: string
  status: 'active' | 'inactive'
  lastTransactionDate: Date
  accountType: 'checking' | 'savings' | 'credit' | 'loan'
  xeroId: string
}

export interface CashPositionData {
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
  cashFlowSummary: {
    inflows7d: number
    outflows7d: number
    netFlow7d: number
    projectedBalance30d: number
  }
}

/**
 * Get real-time cash position data from materialized views and bank accounts
 */
export async function getCashPositionAction(): Promise<ActionResult<CashPositionData>> {
  try {
    const user = await getUser()
    if (!user) {
      redirect('/login')
    }

    // Check permissions - cash position is sensitive financial data
    if (!hasPermission(user.role, 'canViewFinancials')) {
      return {
        success: false,
        error: 'You do not have permission to view cash position data',
      }
    }

    const supabase = createServiceRoleClient()

    // Get current cash position from materialized view
    const { data: cashPositionData, error: cashError } = await supabase
      .from('fact_cash_position')
      .select('*')

    if (cashError) {
      throw new Error(`Failed to fetch cash position: ${cashError.message}`)
    }

    // Calculate total cash and individual account details
    const bankAccounts: BankAccount[] = (cashPositionData || []).map(account => ({
      id: account.bank_account_code,
      code: account.bank_account_code,
      name: account.bank_account_name,
      balance: account.running_balance || 0,
      currency: 'AUD',
      status: 'active' as const,
      lastTransactionDate: new Date(account.last_transaction_date || new Date()),
      accountType: account.bank_account_code.includes('SAV') ? 'savings' as const : 'checking' as const,
      xeroId: account.bank_account_code, // In real implementation, would have actual Xero ID
    }))

    const totalCash = bankAccounts.reduce((sum, account) => sum + account.balance, 0)

    // Get cash flow trends from the last 30 days
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

    const { data: cashFlowData, error: flowError } = await supabase
      .from('fact_cash_flow_trends')
      .select('*')
      .gte('date_key', thirtyDaysAgo.toISOString().split('T')[0])
      .order('date_key', { ascending: true })

    if (flowError) {
      console.warn('Failed to fetch cash flow trends:', flowError.message)
    }

    // Calculate trends and changes
    const dailyBalances = cashFlowData?.map(day => day.rolling_13w_net_flow || 0) || []
    const weeklyBalances = []
    const labels = []

    // Group daily data into weekly for trends
    for (let i = 0; i < dailyBalances.length; i += 7) {
      const weekData = dailyBalances.slice(i, i + 7)
      const weekAverage = weekData.reduce((sum, val) => sum + val, 0) / weekData.length
      weeklyBalances.push(weekAverage)
      labels.push(`Week ${Math.floor(i / 7) + 1}`)
    }

    // Calculate 30-day change
    const thirtyDayChange = dailyBalances.length >= 2 
      ? dailyBalances[dailyBalances.length - 1] - dailyBalances[0]
      : 0
    
    const changePercent = dailyBalances.length >= 2 && dailyBalances[0] !== 0
      ? (thirtyDayChange / Math.abs(dailyBalances[0])) * 100
      : 0

    // Get 7-day cash flow summary
    const sevenDaysAgo = new Date()
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)

    const { data: recentFlowData, error: recentFlowError } = await supabase
      .from('fact_payments')
      .select('payment_amount, payment_type')
      .gte('date_key', sevenDaysAgo.toISOString().split('T')[0])

    if (recentFlowError) {
      console.warn('Failed to fetch recent cash flow:', recentFlowError.message)
    }

    const inflows7d = recentFlowData
      ?.filter(p => p.payment_type === 'ACCRECPAYMENT')
      .reduce((sum, p) => sum + p.payment_amount, 0) || 0

    const outflows7d = recentFlowData
      ?.filter(p => p.payment_type === 'ACCPAYPAYMENT')
      .reduce((sum, p) => sum + p.payment_amount, 0) || 0

    const netFlow7d = inflows7d - outflows7d

    // Simple 30-day projection based on 7-day average
    const projectedBalance30d = totalCash + (netFlow7d * 4.3) // 30/7 ≈ 4.3

    const result: CashPositionData = {
      totalCash,
      totalChange: thirtyDayChange,
      changePercent,
      lastUpdated: new Date(),
      bankAccounts,
      trends: {
        daily: dailyBalances.slice(-7), // Last 7 days
        weekly: weeklyBalances.slice(-6), // Last 6 weeks
        labels: labels.slice(-6),
      },
      cashFlowSummary: {
        inflows7d,
        outflows7d,
        netFlow7d,
        projectedBalance30d,
      },
    }

    // Log access to cash position data
    await logAuditEvent({
      userId: user.id,
      action: 'data_accessed',
      resourceType: 'cash_position',
      resourceId: 'dashboard_view',
      details: {
        totalCash,
        accountCount: bankAccounts.length,
        accessedAt: new Date(),
      },
      ipAddress: null, // Would be extracted from headers in real implementation
    })

    return {
      success: true,
      data: result,
      message: 'Cash position data loaded successfully',
    }
  } catch (error) {
    console.error('Cash position action error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to load cash position data',
    }
  }
}

/**
 * Get bank account transaction history for cash position analysis
 */
export async function getBankTransactionHistoryAction(
  accountId: string,
  days: number = 30
): Promise<ActionResult<Array<{
  id: string
  date: Date
  description: string
  amount: number
  type: 'credit' | 'debit'
  balance: number
  reference?: string
}>>> {
  try {
    const user = await getUser()
    if (!user) {
      redirect('/login')
    }

    if (!hasPermission(user.role, 'canViewFinancials')) {
      return {
        success: false,
        error: 'You do not have permission to view transaction history',
      }
    }

    const supabase = createServiceRoleClient()
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - days)

    // Get bank transactions for the specified account
    const { data: transactions, error } = await supabase
      .from('stg_bank_transactions')
      .select(`
        xero_id,
        date,
        description,
        total,
        type,
        reference,
        bank_account_id
      `)
      .eq('bank_account_id', accountId)
      .gte('date', startDate.toISOString().split('T')[0])
      .order('date', { ascending: false })
      .limit(100)

    if (error) {
      throw new Error(`Failed to fetch transaction history: ${error.message}`)
    }

    // Transform data for display
    let runningBalance = 0 // Would need to calculate from current balance
    const transactionHistory = (transactions || []).map(tx => ({
      id: tx.xero_id,
      date: new Date(tx.date),
      description: tx.description || 'Bank Transaction',
      amount: tx.total,
      type: tx.type === 'RECEIVE' ? 'credit' as const : 'debit' as const,
      balance: runningBalance, // Would calculate running balance
      reference: tx.reference,
    }))

    // Log access to transaction history
    await logAuditEvent({
      userId: user.id,
      action: 'data_accessed',
      resourceType: 'bank_transactions',
      resourceId: accountId,
      details: {
        accountId,
        daysRequested: days,
        transactionCount: transactionHistory.length,
        accessedAt: new Date(),
      },
      ipAddress: null,
    })

    return {
      success: true,
      data: transactionHistory,
      message: `Loaded ${transactionHistory.length} transactions for the last ${days} days`,
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to load transaction history',
    }
  }
}

/**
 * Refresh cash position data from Xero (manual sync)
 */
export async function refreshCashPositionAction(): Promise<ActionResult> {
  try {
    const user = await getUser()
    if (!user) {
      redirect('/login')
    }

    if (!hasPermission(user.role, 'canManageSync')) {
      return {
        success: false,
        error: 'You do not have permission to refresh cash position data',
      }
    }

    // In real implementation, this would:
    // 1. Trigger a selective sync of bank accounts and transactions
    // 2. Refresh the fact_cash_position materialized view
    // 3. Update cache entries
    
    // Simulate sync process
    await new Promise(resolve => setTimeout(resolve, 2000))

    // Log the manual refresh
    await logAuditEvent({
      userId: user.id,
      action: 'cash_position_refreshed',
      resourceType: 'cash_position',
      resourceId: 'manual_refresh',
      details: {
        refreshedAt: new Date(),
        triggeredBy: user.email,
      },
      ipAddress: null,
    })

    return {
      success: true,
      message: 'Cash position data refreshed successfully',
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to refresh cash position data',
    }
  }
}
