'use client'

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
import { CashPositionTile } from '@/components/dashboard/cash-position-tile'
import { AgingAnalysisTile } from '@/components/dashboard/aging-analysis-tile'
import { RevenueComparisonChart } from '@/components/charts/revenue-comparison-chart'
import { ProfitabilityTiles } from '@/components/dashboard/profitability-tiles'
import { WorkingCapitalTiles } from '@/components/dashboard/working-capital-tiles'
import { CashFlowTrendChart } from '@/components/charts/cash-flow-trend-chart'
import { OverdueCustomersTable } from '@/components/dashboard/overdue-customers-table'
import { OverdueSuppliersTable } from '@/components/dashboard/overdue-suppliers-table'
import { InsightsAlerts } from '@/components/dashboard/insights-alerts'
import { RevenueStreamFilter } from '@/components/dashboard/revenue-stream-filter'
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Users,
  Calendar,
  AlertTriangle,
  Clock,
  BarChart3,
  PieChart,
  Activity,
  RefreshCw,
  Download,
  Filter,
  Eye,
} from 'lucide-react'
import { formatCurrency, formatPercentage } from '@/utils/financial'

interface ExecutiveDashboardData {
  cashPosition: {
    total: number
    change: number
    changePercent: number
    lastUpdated: Date
  }
  revenue: {
    ytd: number
    priorYtd: number
    changePercent: number
    invoiceCount: number
  }
  receivables: {
    total: number
    overdue: number
    dso: number
    overduePercent: number
  }
  payables: {
    total: number
    overdue: number
    dpo: number
    overduePercent: number
  }
  grossMargin: {
    percent: number
    amount: number
    targetPercent: number
    variancePercent: number
  }
  netProfit: {
    amount: number
    percent: number
    priorAmount: number
    changePercent: number
  }
}

interface OverdueCustomer {
  id: string
  name: string
  totalOutstanding: number
  oldestInvoiceDays: number
  invoiceCount: number
  revenueStream: string
  riskLevel: 'low' | 'medium' | 'high'
}

interface OverdueSupplier {
  id: string
  name: string
  totalOutstanding: number
  oldestBillDays: number
  billCount: number
  category: string
  priority: 'low' | 'medium' | 'high'
}

export default function ExecutiveDashboard() {
  const { user, hasPermission } = useAuth()
  const [selectedDate, setSelectedDate] = useState<Date>()
  const [dashboardData, setDashboardData] = useState<ExecutiveDashboardData | null>(null)
  const [overdueCustomers, setOverdueCustomers] = useState<OverdueCustomer[]>([])
  const [overdueSuppliers, setOverdueSuppliers] = useState<OverdueSupplier[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date())
  const [autoRefresh, setAutoRefresh] = useState(true)

  const currentFY = getCurrentFinancialYear()

  // Sample data - in real implementation, this would come from server actions
  useEffect(() => {
    loadDashboardData()
    
    // Auto-refresh every 5 minutes if enabled
    if (autoRefresh) {
      const interval = setInterval(() => {
        loadDashboardData()
      }, 5 * 60 * 1000)
      
      return () => clearInterval(interval)
    }
  }, [autoRefresh])

  const loadDashboardData = async () => {
    setIsLoading(true)
    
    try {
      // Simulate API call - replace with actual server actions
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      // Sample data
      setDashboardData({
        cashPosition: {
          total: 284295,
          change: 36420,
          changePercent: 15.2,
          lastUpdated: new Date(),
        },
        revenue: {
          ytd: 302053,
          priorYtd: 278640,
          changePercent: 8.4,
          invoiceCount: 127,
        },
        receivables: {
          total: 45280,
          overdue: 18750,
          dso: 12,
          overduePercent: 41.4,
        },
        payables: {
          total: 32150,
          overdue: 8900,
          dpo: 28,
          overduePercent: 27.7,
        },
        grossMargin: {
          percent: 94.1,
          amount: 284295,
          targetPercent: 92.0,
          variancePercent: 2.3,
        },
        netProfit: {
          amount: 45680,
          percent: 15.1,
          priorAmount: 38920,
          changePercent: 17.4,
        },
      })

      setOverdueCustomers([
        {
          id: '1',
          name: 'Melbourne Basketball Academy',
          totalOutstanding: 15600,
          oldestInvoiceDays: 67,
          invoiceCount: 3,
          revenueStream: 'tours',
          riskLevel: 'high',
        },
        {
          id: '2',
          name: 'Sydney Sports Tours',
          totalOutstanding: 8950,
          oldestInvoiceDays: 45,
          invoiceCount: 2,
          revenueStream: 'tours',
          riskLevel: 'medium',
        },
        {
          id: '3',
          name: 'Adelaide Basketball Club',
          totalOutstanding: 12300,
          oldestInvoiceDays: 52,
          invoiceCount: 1,
          revenueStream: 'dr-dish',
          riskLevel: 'medium',
        },
      ])

      setOverdueSuppliers([
        {
          id: '1',
          name: 'Flight Centre Business',
          totalOutstanding: 12500,
          oldestBillDays: 78,
          billCount: 2,
          category: 'flights',
          priority: 'high',
        },
        {
          id: '2',
          name: 'Equipment Supplier Ltd',
          totalOutstanding: 8400,
          oldestBillDays: 65,
          billCount: 1,
          category: 'equipment',
          priority: 'medium',
        },
      ])

      setLastRefresh(new Date())
    } catch (error) {
      console.error('Failed to load dashboard data:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleRefresh = () => {
    loadDashboardData()
  }

  // Column definitions for overdue customers table
  const customerColumns = [
    {
      key: 'name',
      title: 'Customer',
      sortable: true,
      type: 'text' as const,
    },
    {
      key: 'totalOutstanding',
      title: 'Outstanding',
      sortable: true,
      type: 'currency' as const,
      align: 'right' as const,
    },
    {
      key: 'oldestInvoiceDays',
      title: 'Days Overdue',
      sortable: true,
      type: 'number' as const,
      align: 'right' as const,
    },
    {
      key: 'invoiceCount',
      title: 'Invoices',
      sortable: true,
      type: 'number' as const,
      align: 'right' as const,
    },
    {
      key: 'revenueStream',
      title: 'Stream',
      type: 'text' as const,
    },
    {
      key: 'riskLevel',
      title: 'Risk',
      type: 'status' as const,
    },
  ]

  // Column definitions for overdue suppliers table
  const supplierColumns = [
    {
      key: 'name',
      title: 'Supplier',
      sortable: true,
      type: 'text' as const,
    },
    {
      key: 'totalOutstanding',
      title: 'Outstanding',
      sortable: true,
      type: 'currency' as const,
      align: 'right' as const,
    },
    {
      key: 'oldestBillDays',
      title: 'Days Overdue',
      sortable: true,
      type: 'number' as const,
      align: 'right' as const,
    },
    {
      key: 'billCount',
      title: 'Bills',
      sortable: true,
      type: 'number' as const,
      align: 'right' as const,
    },
    {
      key: 'category',
      title: 'Category',
      type: 'text' as const,
    },
    {
      key: 'priority',
      title: 'Priority',
      type: 'status' as const,
    },
  ]

  if (!user) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center text-gray-500">
              <DollarSign className="mx-auto mb-2 h-8 w-8 text-gray-400" />
              <p>Please log in to access the executive dashboard.</p>
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
          <h1 className="text-3xl font-bold text-gray-900">Executive Dashboard</h1>
          <p className="text-gray-600">
            Real-time financial insights for {currentFY.label}
          </p>
        </div>
        
        <div className="flex items-center gap-4">
          <DatePicker
            date={selectedDate}
            onDateChange={setSelectedDate}
            placeholder="Select reporting period"
          />
          <Badge variant="outline" className="flex items-center gap-1">
            <Calendar className="h-3 w-3" />
            {currentFY.label} • Week {Math.ceil((new Date().getTime() - currentFY.startDate.getTime()) / (7 * 24 * 60 * 60 * 1000))}
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

      {/* Last Updated Info */}
      <div className="flex items-center justify-between text-sm text-gray-500">
        <div className="flex items-center gap-2">
          <Clock className="h-4 w-4" />
          Last updated: {lastRefresh.toLocaleTimeString()}
        </div>
        <div className="flex items-center gap-2">
          <Activity className="h-4 w-4" />
          Auto-refresh: {autoRefresh ? 'On' : 'Off'}
          <button
            onClick={() => setAutoRefresh(!autoRefresh)}
            className="ml-2 text-blue-600 hover:text-blue-800"
          >
            {autoRefresh ? 'Disable' : 'Enable'}
          </button>
        </div>
      </div>

      {/* Revenue Stream Filtering and Drill-Down */}
      <RevenueStreamFilter 
        currentRevenueStream="all"
        showDrillDown={true}
        onRevenueStreamChange={(stream) => {
          console.log('Revenue stream changed to:', stream)
          // Handle revenue stream filter change
        }}
        onFiltersChange={(filters) => {
          console.log('Filters changed:', filters)
          // Handle filter changes
        }}
        onDrillDown={(level) => {
          console.log('Drill down to level:', level)
          // Handle drill-down navigation
        }}
      />

      {/* Critical Insights and Alerts */}
      <InsightsAlerts showExpanded={true} maxInsights={3} className="mb-6" />

      {/* Key Performance Indicators - Responsive Grid */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        {/* Cash Position */}
        <div className="xl:col-span-1">
          <CashPositionTile showDetails={false} />
        </div>

        {/* YTD Revenue */}
        <div className="xl:col-span-1">
          <MetricTile
            title="YTD Revenue"
            value={dashboardData?.revenue.ytd || 0}
            currency
            isLoading={isLoading}
            change={{
              value: dashboardData ? `${dashboardData.revenue.changePercent > 0 ? '+' : ''}${dashboardData.revenue.changePercent.toFixed(1)}%` : '',
              type: dashboardData && dashboardData.revenue.changePercent > 0 ? 'positive' : 'negative',
              label: 'vs last FY',
            }}
            icon={<TrendingUp className="h-5 w-5" />}
          />
        </div>

        {/* Outstanding AR */}
        <div className="xl:col-span-1">
          <MetricTile
            title="Outstanding AR"
            value={dashboardData?.receivables.total || 0}
            currency
            isLoading={isLoading}
            change={{
              value: dashboardData ? `${dashboardData.receivables.dso} days` : '',
              type: 'neutral',
              label: 'average DSO',
            }}
            icon={<Users className="h-5 w-5" />}
          />
        </div>

        {/* Outstanding AP */}
        <div className="xl:col-span-1">
          <MetricTile
            title="Outstanding AP"
            value={dashboardData?.payables.total || 0}
            currency
            isLoading={isLoading}
            change={{
              value: dashboardData ? `${dashboardData.payables.dpo} days` : '',
              type: 'neutral',
              label: 'average DPO',
            }}
            icon={<Clock className="h-5 w-5" />}
          />
        </div>

        {/* Gross Margin */}
        <div className="xl:col-span-1">
          <MetricTile
            title="Gross Margin"
            value={dashboardData ? `${dashboardData.grossMargin.percent.toFixed(1)}%` : '0%'}
            isLoading={isLoading}
            change={{
              value: dashboardData ? `${dashboardData.grossMargin.variancePercent > 0 ? '+' : ''}${dashboardData.grossMargin.variancePercent.toFixed(1)}%` : '',
              type: dashboardData && dashboardData.grossMargin.variancePercent > 0 ? 'positive' : 'negative',
              label: 'vs target',
            }}
            icon={<PieChart className="h-5 w-5" />}
          />
        </div>

        {/* Net Profit */}
        <div className="xl:col-span-1">
          <MetricTile
            title="Net Profit"
            value={dashboardData?.netProfit.amount || 0}
            currency
            isLoading={isLoading}
            change={{
              value: dashboardData ? `${dashboardData.netProfit.changePercent > 0 ? '+' : ''}${dashboardData.netProfit.changePercent.toFixed(1)}%` : '',
              type: dashboardData && dashboardData.netProfit.changePercent > 0 ? 'positive' : 'negative',
              label: 'vs last FY',
            }}
            icon={<BarChart3 className="h-5 w-5" />}
          />
        </div>
      </div>

      {/* Cash Position Details and Revenue Breakdown */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Detailed Cash Position */}
        <CashPositionTile showDetails={true} className="lg:col-span-1" />

        {/* YTD Revenue Comparison Chart */}
        <RevenueComparisonChart 
          revenueStream="all"
          chartType="line"
          showCumulative={true}
          weeksToShow={26}
          className="lg:col-span-2"
        />

      </div>

      {/* Aging Analysis and Performance Metrics */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* AR Aging Analysis */}
        <AgingAnalysisTile type="ar" showDetails={true} />

        {/* AP Aging Analysis */}
        <AgingAnalysisTile type="ap" showDetails={true} />

        {/* Financial Insights and Alerts */}
        <InsightsAlerts showExpanded={false} maxInsights={5} />
      </div>

      {/* Overdue Management Tables */}
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        {/* Overdue Customers */}
        <OverdueCustomersTable maxRows={10} showContactActions={true} />

        {/* Overdue Suppliers */}
        <OverdueSuppliersTable maxRows={10} showPaymentActions={true} />
      </div>

      {/* Profitability Analysis */}
      <ProfitabilityTiles showTrends={true} />

      {/* Working Capital Analysis */}
      <WorkingCapitalTiles showDetails={true} />

      {/* Cash Flow Trends */}
      <CashFlowTrendChart weeksToShow={13} showProjections={true} />

      {/* Quick Actions and Status */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Activity className="mr-2 h-5 w-5" />
              Quick Actions
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button className="w-full justify-start" variant="outline">
              <RefreshCw className="mr-2 h-4 w-4" />
              Sync Xero Data
            </Button>
            <Button className="w-full justify-start" variant="outline">
              <Download className="mr-2 h-4 w-4" />
              Export Financial Report
            </Button>
            <Button className="w-full justify-start" variant="outline">
              <Users className="mr-2 h-4 w-4" />
              Contact Overdue Customers
            </Button>
            <Button className="w-full justify-start" variant="outline">
              <Filter className="mr-2 h-4 w-4" />
              Advanced Filters
            </Button>
          </CardContent>
        </Card>

        {/* System Health */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Activity className="mr-2 h-5 w-5" />
              System Health
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm">Database</span>
              <Badge variant="default" className="bg-green-100 text-green-800">Connected</Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">Xero Integration</span>
              <Badge variant="default" className="bg-green-100 text-green-800">Active</Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">Last Sync</span>
              <span className="text-sm text-gray-600">2 hours ago</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">Next Sync</span>
              <span className="text-sm text-gray-600">Tomorrow 3:30 AM</span>
            </div>
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Clock className="mr-2 h-5 w-5" />
              Recent Activity
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="text-sm">
              <p className="font-medium">Data sync completed</p>
              <p className="text-xs text-gray-500">2 hours ago</p>
            </div>
            <div className="text-sm">
              <p className="font-medium">New invoice created</p>
              <p className="text-xs text-gray-500">4 hours ago</p>
            </div>
            <div className="text-sm">
              <p className="font-medium">Payment received</p>
              <p className="text-xs text-gray-500">6 hours ago</p>
            </div>
            <div className="text-sm">
              <p className="font-medium">User login: finance@ausa.com.au</p>
              <p className="text-xs text-gray-500">8 hours ago</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Role-based Access Message */}
      {user.role !== 'owner' && user.role !== 'finance' && (
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center rounded-md bg-blue-50 p-4">
              <AlertTriangle className="h-5 w-5 text-blue-400" />
              <div className="ml-3">
                <h3 className="text-sm font-medium text-blue-800">
                  Limited Dashboard View
                </h3>
                <p className="mt-1 text-sm text-blue-700">
                  You're viewing a filtered dashboard based on your role ({user.role}). 
                  Some financial data may be restricted. Contact an administrator for full access.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
