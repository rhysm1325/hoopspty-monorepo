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
import { RevenueComparisonChart } from '@/components/charts/revenue-comparison-chart'
import { MarketingInvoiceTracking } from '@/components/dashboard/marketing-invoice-tracking'
import { 
  Megaphone, 
  Building2, 
  TrendingUp, 
  TrendingDown, 
  DollarSign,
  Calendar,
  Users,
  Target,
  Clock,
  RefreshCw,
  Download,
  Filter,
  Eye,
  Activity,
  AlertTriangle,
  CheckCircle,
  FileText,
  CreditCard,
  BarChart3
} from 'lucide-react'
import { formatCurrency, formatPercentage } from '@/utils/financial'

interface MarketingRevenueData {
  totalRevenue: number
  totalInvoices: number
  averageInvoiceValue: number
  grossMargin: number
  grossMarginPercent: number
  priorPeriodRevenue: number
  priorPeriodInvoices: number
  revenueGrowth: number
  invoiceGrowth: number
  
  clientBreakdown: Array<{
    clientName: string
    revenue: number
    invoiceCount: number
    averageValue: number
    marginPercent: number
    lastInvoiceDate: Date
    contractValue?: number
    contractEndDate?: Date
    paymentTerms: string
    status: 'active' | 'inactive' | 'pending'
  }>
  
  serviceBreakdown: Array<{
    serviceType: string
    revenue: number
    invoiceCount: number
    marginPercent: number
    growthPercent: number
  }>
  
  monthlyPerformance: Array<{
    month: string
    revenue: number
    invoices: number
    averageValue: number
    targetRevenue: number
    variance: number
    variancePercent: number
  }>
  
  upcomingOpportunities: Array<{
    clientName: string
    opportunityType: string
    estimatedValue: number
    probability: number
    expectedCloseDate: Date
    status: 'proposal' | 'negotiation' | 'pending_approval' | 'confirmed'
  }>
}

interface RebelSportTracking {
  contractDetails: {
    contractValue: number
    contractStartDate: Date
    contractEndDate: Date
    paymentSchedule: 'monthly' | 'quarterly' | 'milestone'
    renewalStatus: 'auto_renew' | 'manual_renew' | 'under_review'
  }
  
  performanceMetrics: {
    totalBilled: number
    totalPaid: number
    outstandingAmount: number
    averagePaymentDays: number
    onTimePaymentRate: number
    lastPaymentDate?: Date
  }
  
  deliverables: Array<{
    id: string
    description: string
    dueDate: Date
    completedDate?: Date
    status: 'pending' | 'in_progress' | 'completed' | 'overdue'
    billingAmount: number
    billingStatus: 'not_billed' | 'billed' | 'paid'
  }>
  
  monthlyBilling: Array<{
    month: string
    scheduledBilling: number
    actualBilling: number
    variance: number
    deliverableCount: number
    completionRate: number
  }>
  
  relationshipHealth: {
    score: number
    factors: Array<{
      factor: string
      score: number
      impact: 'positive' | 'negative' | 'neutral'
      notes: string
    }>
    riskLevel: 'low' | 'medium' | 'high'
    nextReviewDate: Date
  }
}

export default function MarketingDashboard() {
  const { user, hasPermission } = useAuth()
  const [selectedDate, setSelectedDate] = useState<Date>()
  const [marketingData, setMarketingData] = useState<MarketingRevenueData | null>(null)
  const [rebelSportData, setRebelSportData] = useState<RebelSportTracking | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date())
  const [selectedClient, setSelectedClient] = useState<string>('all')
  const [viewMode, setViewMode] = useState<'overview' | 'rebel_sport' | 'all_clients'>('overview')

  const currentFY = getCurrentFinancialYear()

  // Load Marketing dashboard data
  useEffect(() => {
    loadMarketingData()
  }, [selectedClient, viewMode])

  const loadMarketingData = async () => {
    setIsLoading(true)
    
    try {
      // Simulate API call - replace with actual server actions
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      // Sample Marketing revenue data
      setMarketingData({
        totalRevenue: 156000,
        totalInvoices: 18,
        averageInvoiceValue: 8667,
        grossMargin: 124800,
        grossMarginPercent: 80.0,
        priorPeriodRevenue: 142500,
        priorPeriodInvoices: 16,
        revenueGrowth: 9.5,
        invoiceGrowth: 12.5,
        
        clientBreakdown: [
          {
            clientName: 'Rebel Sport',
            revenue: 120000,
            invoiceCount: 12,
            averageValue: 10000,
            marginPercent: 82.5,
            lastInvoiceDate: new Date('2024-11-15'),
            contractValue: 180000,
            contractEndDate: new Date('2025-06-30'),
            paymentTerms: 'Net 30',
            status: 'active',
          },
          {
            clientName: 'Basketball Australia',
            revenue: 24000,
            invoiceCount: 4,
            averageValue: 6000,
            marginPercent: 75.0,
            lastInvoiceDate: new Date('2024-10-30'),
            contractValue: 36000,
            contractEndDate: new Date('2025-03-31'),
            paymentTerms: 'Net 30',
            status: 'active',
          },
          {
            clientName: 'Sports Marketing Co',
            revenue: 12000,
            invoiceCount: 2,
            averageValue: 6000,
            marginPercent: 70.0,
            lastInvoiceDate: new Date('2024-09-15'),
            paymentTerms: 'Net 45',
            status: 'inactive',
          },
        ],
        
        serviceBreakdown: [
          {
            serviceType: 'Brand Partnership Management',
            revenue: 96000,
            invoiceCount: 8,
            marginPercent: 85.0,
            growthPercent: 12.0,
          },
          {
            serviceType: 'Event Marketing',
            revenue: 36000,
            invoiceCount: 6,
            marginPercent: 78.0,
            growthPercent: 8.5,
          },
          {
            serviceType: 'Digital Marketing',
            revenue: 18000,
            invoiceCount: 3,
            marginPercent: 70.0,
            growthPercent: 5.0,
          },
          {
            serviceType: 'Consulting Services',
            revenue: 6000,
            invoiceCount: 1,
            marginPercent: 75.0,
            growthPercent: -10.0,
          },
        ],
        
        monthlyPerformance: [
          { month: 'Jul', revenue: 24000, invoices: 3, averageValue: 8000, targetRevenue: 22000, variance: 2000, variancePercent: 9.1 },
          { month: 'Aug', revenue: 30000, invoices: 3, averageValue: 10000, targetRevenue: 26000, variance: 4000, variancePercent: 15.4 },
          { month: 'Sep', revenue: 18000, invoices: 2, averageValue: 9000, targetRevenue: 20000, variance: -2000, variancePercent: -10.0 },
          { month: 'Oct', revenue: 36000, invoices: 4, averageValue: 9000, targetRevenue: 28000, variance: 8000, variancePercent: 28.6 },
          { month: 'Nov', revenue: 30000, invoices: 3, averageValue: 10000, targetRevenue: 25000, variance: 5000, variancePercent: 20.0 },
          { month: 'Dec', revenue: 18000, invoices: 3, averageValue: 6000, targetRevenue: 24000, variance: -6000, variancePercent: -25.0 },
        ],
        
        upcomingOpportunities: [
          {
            clientName: 'Rebel Sport',
            opportunityType: 'Contract Renewal',
            estimatedValue: 200000,
            probability: 85,
            expectedCloseDate: new Date('2025-05-30'),
            status: 'negotiation',
          },
          {
            clientName: 'Nike Australia',
            opportunityType: 'New Partnership',
            estimatedValue: 120000,
            probability: 60,
            expectedCloseDate: new Date('2025-02-28'),
            status: 'proposal',
          },
          {
            clientName: 'Basketball Australia',
            opportunityType: 'Event Series',
            estimatedValue: 45000,
            probability: 75,
            expectedCloseDate: new Date('2025-01-31'),
            status: 'pending_approval',
          },
        ],
      })

      // Sample Rebel Sport tracking data
      setRebelSportData({
        contractDetails: {
          contractValue: 180000,
          contractStartDate: new Date('2024-07-01'),
          contractEndDate: new Date('2025-06-30'),
          paymentSchedule: 'monthly',
          renewalStatus: 'under_review',
        },
        
        performanceMetrics: {
          totalBilled: 120000,
          totalPaid: 105000,
          outstandingAmount: 15000,
          averagePaymentDays: 28,
          onTimePaymentRate: 91.7,
          lastPaymentDate: new Date('2024-11-20'),
        },
        
        deliverables: [
          {
            id: 'del-1',
            description: 'Q2 Basketball Campaign Strategy',
            dueDate: new Date('2024-12-31'),
            completedDate: new Date('2024-12-15'),
            status: 'completed',
            billingAmount: 15000,
            billingStatus: 'billed',
          },
          {
            id: 'del-2',
            description: 'Summer Basketball Event Coordination',
            dueDate: new Date('2025-01-15'),
            status: 'in_progress',
            billingAmount: 12000,
            billingStatus: 'not_billed',
          },
          {
            id: 'del-3',
            description: 'Brand Partnership Review',
            dueDate: new Date('2025-02-28'),
            status: 'pending',
            billingAmount: 8000,
            billingStatus: 'not_billed',
          },
        ],
        
        monthlyBilling: [
          { month: 'Jul', scheduledBilling: 15000, actualBilling: 15000, variance: 0, deliverableCount: 2, completionRate: 100 },
          { month: 'Aug', scheduledBilling: 15000, actualBilling: 15000, variance: 0, deliverableCount: 2, completionRate: 100 },
          { month: 'Sep', scheduledBilling: 15000, actualBilling: 12000, variance: -3000, deliverableCount: 1, completionRate: 50 },
          { month: 'Oct', scheduledBilling: 15000, actualBilling: 18000, variance: 3000, deliverableCount: 3, completionRate: 100 },
          { month: 'Nov', scheduledBilling: 15000, actualBilling: 15000, variance: 0, deliverableCount: 2, completionRate: 100 },
          { month: 'Dec', scheduledBilling: 15000, actualBilling: 15000, variance: 0, deliverableCount: 2, completionRate: 100 },
        ],
        
        relationshipHealth: {
          score: 8.2,
          factors: [
            {
              factor: 'Payment Performance',
              score: 9.2,
              impact: 'positive',
              notes: 'Consistently pays within terms, excellent payment history',
            },
            {
              factor: 'Project Delivery',
              score: 8.5,
              impact: 'positive',
              notes: 'High-quality deliverables, meeting deadlines consistently',
            },
            {
              factor: 'Communication',
              score: 7.8,
              impact: 'positive',
              notes: 'Regular communication, responsive to requests',
            },
            {
              factor: 'Contract Renewal Risk',
              score: 7.0,
              impact: 'neutral',
              notes: 'Contract up for renewal, some competitive pressure',
            },
          ],
          riskLevel: 'low',
          nextReviewDate: new Date('2025-04-30'),
        },
      })

      setLastRefresh(new Date())
    } catch (error) {
      console.error('Failed to load Marketing data:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleRefresh = () => {
    loadMarketingData()
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge variant="default" className="bg-green-100 text-green-800">Active</Badge>
      case 'inactive':
        return <Badge variant="secondary">Inactive</Badge>
      case 'pending':
        return <Badge variant="default" className="bg-yellow-100 text-yellow-800">Pending</Badge>
      default:
        return <Badge variant="outline">Unknown</Badge>
    }
  }

  const getOpportunityBadge = (status: string) => {
    switch (status) {
      case 'confirmed':
        return <Badge variant="default" className="bg-green-100 text-green-800">Confirmed</Badge>
      case 'negotiation':
        return <Badge variant="default" className="bg-blue-100 text-blue-800">Negotiation</Badge>
      case 'proposal':
        return <Badge variant="default" className="bg-yellow-100 text-yellow-800">Proposal</Badge>
      case 'pending_approval':
        return <Badge variant="default" className="bg-purple-100 text-purple-800">Pending Approval</Badge>
      default:
        return <Badge variant="outline">Unknown</Badge>
    }
  }

  const getDeliverableStatus = (status: string) => {
    switch (status) {
      case 'completed':
        return <Badge variant="default" className="bg-green-100 text-green-800">Completed</Badge>
      case 'in_progress':
        return <Badge variant="default" className="bg-blue-100 text-blue-800">In Progress</Badge>
      case 'pending':
        return <Badge variant="secondary">Pending</Badge>
      case 'overdue':
        return <Badge variant="destructive">Overdue</Badge>
      default:
        return <Badge variant="outline">Unknown</Badge>
    }
  }

  const getHealthScoreColor = (score: number) => {
    if (score >= 8) return 'text-green-600'
    if (score >= 6) return 'text-yellow-600'
    return 'text-red-600'
  }

  const getRiskBadge = (risk: 'low' | 'medium' | 'high') => {
    switch (risk) {
      case 'high':
        return <Badge variant="destructive">High Risk</Badge>
      case 'medium':
        return <Badge variant="default" className="bg-yellow-100 text-yellow-800">Medium Risk</Badge>
      default:
        return <Badge variant="default" className="bg-green-100 text-green-800">Low Risk</Badge>
    }
  }

  // Column definitions for client breakdown table
  const clientColumns = [
    {
      key: 'clientName',
      title: 'Client',
      sortable: true,
      type: 'text' as const,
    },
    {
      key: 'revenue',
      title: 'Revenue',
      sortable: true,
      type: 'currency' as const,
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
      key: 'averageValue',
      title: 'Avg Value',
      sortable: true,
      type: 'currency' as const,
      align: 'right' as const,
    },
    {
      key: 'marginPercent',
      title: 'Margin %',
      sortable: true,
      type: 'number' as const,
      align: 'right' as const,
    },
    {
      key: 'lastInvoiceDate',
      title: 'Last Invoice',
      sortable: true,
      type: 'date' as const,
    },
    {
      key: 'status',
      title: 'Status',
      type: 'status' as const,
    },
  ]

  if (!user) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center text-gray-500">
              <Megaphone className="mx-auto mb-2 h-8 w-8 text-gray-400" />
              <p>Please log in to access the Marketing dashboard.</p>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Check if user has permission to view Marketing dashboard
  if (!hasPermission('canViewMarketingDashboard') && !hasPermission('canViewFinancials')) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center text-gray-500">
              <AlertTriangle className="mx-auto mb-2 h-8 w-8 text-gray-400" />
              <p>You do not have permission to view the Marketing dashboard.</p>
              <p className="mt-2 text-sm">Contact your administrator for access.</p>
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
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
            <Megaphone className="h-8 w-8 text-pink-600" />
            Marketing Revenue Dashboard
          </h1>
          <p className="text-gray-600">
            Client revenue tracking, partnership management, and performance analysis for {currentFY.label}
          </p>
        </div>
        
        <div className="flex items-center gap-4">
          <select
            value={selectedClient}
            onChange={(e) => setSelectedClient(e.target.value)}
            className="rounded-md border-gray-300 text-sm"
          >
            <option value="all">All Clients</option>
            <option value="rebel_sport">Rebel Sport</option>
            <option value="basketball_australia">Basketball Australia</option>
            <option value="sports_marketing_co">Sports Marketing Co</option>
          </select>

          <select
            value={viewMode}
            onChange={(e) => setViewMode(e.target.value as 'overview' | 'rebel_sport' | 'all_clients')}
            className="rounded-md border-gray-300 text-sm"
          >
            <option value="overview">Overview</option>
            <option value="rebel_sport">Rebel Sport Focus</option>
            <option value="all_clients">All Clients</option>
          </select>
          
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

      {/* Key Performance Indicators */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {/* Total Revenue */}
        <MetricTile
          title="Total Revenue"
          value={marketingData?.totalRevenue || 0}
          currency
          isLoading={isLoading}
          change={{
            value: marketingData ? `${marketingData.revenueGrowth > 0 ? '+' : ''}${marketingData.revenueGrowth.toFixed(1)}%` : '',
            type: marketingData && marketingData.revenueGrowth > 0 ? 'positive' : 'negative',
            label: 'vs prior period',
          }}
          icon={<DollarSign className="h-5 w-5" />}
        />

        {/* Total Invoices */}
        <MetricTile
          title="Total Invoices"
          value={marketingData?.totalInvoices || 0}
          isLoading={isLoading}
          change={{
            value: marketingData ? `${marketingData.invoiceGrowth > 0 ? '+' : ''}${marketingData.invoiceGrowth.toFixed(1)}%` : '',
            type: marketingData && marketingData.invoiceGrowth > 0 ? 'positive' : 'negative',
            label: 'vs prior period',
          }}
          icon={<FileText className="h-5 w-5" />}
        />

        {/* Average Invoice Value */}
        <MetricTile
          title="Avg Invoice Value"
          value={marketingData?.averageInvoiceValue || 0}
          currency
          isLoading={isLoading}
          change={{
            value: marketingData && marketingData.priorPeriodInvoices > 0 ? 
              `${(((marketingData.averageInvoiceValue - (marketingData.priorPeriodRevenue / marketingData.priorPeriodInvoices)) / (marketingData.priorPeriodRevenue / marketingData.priorPeriodInvoices)) * 100).toFixed(1)}%` : '',
            type: 'neutral',
            label: 'vs prior period',
          }}
          icon={<Target className="h-5 w-5" />}
        />

        {/* Gross Margin */}
        <MetricTile
          title="Gross Margin"
          value={marketingData ? `${marketingData.grossMarginPercent.toFixed(1)}%` : '0%'}
          isLoading={isLoading}
          change={{
            value: '+2.5%',
            type: 'positive',
            label: 'vs target 77.5%',
          }}
          icon={<BarChart3 className="h-5 w-5" />}
        />
      </div>

      {/* Rebel Sport Focus Section */}
      {(viewMode === 'rebel_sport' || viewMode === 'overview') && rebelSportData && (
        <div className="space-y-6">
          {/* Rebel Sport Contract Overview */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Building2 className="mr-2 h-5 w-5 text-red-600" />
                Rebel Sport Partnership
              </CardTitle>
              <CardDescription>
                Primary marketing partnership performance and contract tracking
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
                {/* Contract Details */}
                <div className="space-y-4">
                  <h4 className="text-sm font-medium">Contract Details</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Contract Value:</span>
                      <span className="font-medium">{formatCurrency(rebelSportData.contractDetails.contractValue)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Start Date:</span>
                      <span className="font-medium">{rebelSportData.contractDetails.contractStartDate.toLocaleDateString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">End Date:</span>
                      <span className="font-medium">{rebelSportData.contractDetails.contractEndDate.toLocaleDateString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Payment:</span>
                      <span className="font-medium capitalize">{rebelSportData.contractDetails.paymentSchedule}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Renewal:</span>
                      <Badge variant="default" className="bg-yellow-100 text-yellow-800">
                        {rebelSportData.contractDetails.renewalStatus.replace('_', ' ')}
                      </Badge>
                    </div>
                  </div>
                </div>

                {/* Performance Metrics */}
                <div className="space-y-4">
                  <h4 className="text-sm font-medium">Performance Metrics</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Total Billed:</span>
                      <span className="font-medium">{formatCurrency(rebelSportData.performanceMetrics.totalBilled)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Total Paid:</span>
                      <span className="font-medium">{formatCurrency(rebelSportData.performanceMetrics.totalPaid)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Outstanding:</span>
                      <span className="font-medium">{formatCurrency(rebelSportData.performanceMetrics.outstandingAmount)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Avg Payment Days:</span>
                      <span className="font-medium">{rebelSportData.performanceMetrics.averagePaymentDays} days</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">On-Time Rate:</span>
                      <span className="font-medium text-green-600">{rebelSportData.performanceMetrics.onTimePaymentRate.toFixed(1)}%</span>
                    </div>
                  </div>
                </div>

                {/* Relationship Health */}
                <div className="space-y-4">
                  <h4 className="text-sm font-medium">Relationship Health</h4>
                  <div className="text-center">
                    <p className={`text-3xl font-bold ${getHealthScoreColor(rebelSportData.relationshipHealth.score)}`}>
                      {rebelSportData.relationshipHealth.score.toFixed(1)}
                    </p>
                    <p className="text-sm text-gray-600">Health Score</p>
                    {getRiskBadge(rebelSportData.relationshipHealth.riskLevel)}
                  </div>
                  <div className="space-y-2">
                    {rebelSportData.relationshipHealth.factors.map((factor, index) => (
                      <div key={index} className="flex items-center justify-between text-xs">
                        <span className="text-gray-600">{factor.factor}:</span>
                        <span className={`font-medium ${getHealthScoreColor(factor.score)}`}>
                          {factor.score.toFixed(1)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Rebel Sport Monthly Billing */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Calendar className="mr-2 h-5 w-5" />
                Rebel Sport Monthly Billing Performance
              </CardTitle>
              <CardDescription>
                Scheduled vs actual billing with deliverable completion rates
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {rebelSportData.monthlyBilling.map((month, index) => (
                  <div key={index} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-medium w-8">{month.month}</span>
                      <div>
                        <p className="text-sm">{month.deliverableCount} deliverables</p>
                        <p className="text-xs text-gray-500">{month.completionRate}% completion</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium">{formatCurrency(month.actualBilling)}</p>
                      <div className={`flex items-center gap-1 text-xs ${
                        month.variance > 0 ? 'text-green-600' : 
                        month.variance < 0 ? 'text-red-600' : 'text-gray-600'
                      }`}>
                        {month.variance > 0 ? (
                          <TrendingUp className="h-3 w-3" />
                        ) : month.variance < 0 ? (
                          <TrendingDown className="h-3 w-3" />
                        ) : (
                          <Target className="h-3 w-3" />
                        )}
                        <span>
                          {month.variance > 0 ? '+' : ''}{formatCurrency(month.variance)} vs scheduled
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Revenue Comparison and Service Breakdown */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Revenue Comparison Chart */}
        <div className="lg:col-span-2">
          <RevenueComparisonChart 
            revenueStream="marketing"
            chartType="line"
            showCumulative={true}
            weeksToShow={26}
          />
        </div>

        {/* Service Type Performance */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <BarChart3 className="mr-2 h-5 w-5" />
              Service Performance
            </CardTitle>
            <CardDescription>
              Revenue breakdown by service type
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {marketingData?.serviceBreakdown.map((service, index) => (
              <div key={index} className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">{service.serviceType}</p>
                  <p className="text-xs text-gray-500">
                    {service.invoiceCount} invoices • {service.marginPercent.toFixed(1)}% margin
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium">{formatCurrency(service.revenue)}</p>
                  <div className={`flex items-center gap-1 text-xs ${
                    service.growthPercent > 0 ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {service.growthPercent > 0 ? (
                      <TrendingUp className="h-3 w-3" />
                    ) : (
                      <TrendingDown className="h-3 w-3" />
                    )}
                    <span>{service.growthPercent > 0 ? '+' : ''}{service.growthPercent.toFixed(1)}%</span>
                  </div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Client Breakdown Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Users className="mr-2 h-5 w-5" />
            Client Revenue Breakdown
          </CardTitle>
          <CardDescription>
            Detailed performance metrics for all marketing clients
          </CardDescription>
        </CardHeader>
        <CardContent>
          <DataTable
            columns={clientColumns}
            data={marketingData?.clientBreakdown || []}
            loading={isLoading}
            searchPlaceholder="Search clients..."
            onRowClick={(client) => {
              // Navigate to client detail page
              console.log('Client clicked:', client.clientName)
            }}
            onExport={() => {
              // Export client data
              console.log('Export client data')
            }}
          />
        </CardContent>
      </Card>

      {/* Upcoming Opportunities and Monthly Performance */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Upcoming Opportunities */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Target className="mr-2 h-5 w-5" />
              Upcoming Opportunities
            </CardTitle>
            <CardDescription>
              Pipeline opportunities and expected revenue
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {marketingData?.upcomingOpportunities.map((opportunity, index) => (
              <div key={index} className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">{opportunity.clientName}</p>
                  <p className="text-xs text-gray-500">
                    {opportunity.opportunityType} • {opportunity.probability}% probability
                  </p>
                  <p className="text-xs text-gray-500">
                    Expected: {opportunity.expectedCloseDate.toLocaleDateString()}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium">{formatCurrency(opportunity.estimatedValue)}</p>
                  {getOpportunityBadge(opportunity.status)}
                </div>
              </div>
            ))}

            <div className="mt-4 p-3 bg-blue-50 rounded-lg">
              <h4 className="text-sm font-medium text-blue-800 mb-1">Pipeline Summary</h4>
              <div className="text-xs text-blue-700">
                <p>Total Pipeline Value: {formatCurrency(marketingData?.upcomingOpportunities.reduce((sum, opp) => sum + opp.estimatedValue, 0) || 0)}</p>
                <p>Weighted Value: {formatCurrency(marketingData?.upcomingOpportunities.reduce((sum, opp) => sum + (opp.estimatedValue * opp.probability / 100), 0) || 0)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Monthly Performance vs Target */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Activity className="mr-2 h-5 w-5" />
              Monthly Performance vs Target
            </CardTitle>
            <CardDescription>
              Revenue performance against monthly targets
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {marketingData?.monthlyPerformance.map((month, index) => (
              <div key={index} className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-sm font-medium w-8">{month.month}</span>
                  <div>
                    <p className="text-sm">{month.invoices} invoices</p>
                    <p className="text-xs text-gray-500">{formatCurrency(month.averageValue)} avg</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium">{formatCurrency(month.revenue)}</p>
                  <div className={`flex items-center gap-1 text-xs ${
                    month.variancePercent > 0 ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {month.variancePercent > 0 ? (
                      <TrendingUp className="h-3 w-3" />
                    ) : (
                      <TrendingDown className="h-3 w-3" />
                    )}
                    <span>
                      {month.variancePercent > 0 ? '+' : ''}{month.variancePercent.toFixed(1)}% vs target
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Marketing Invoice Status and Payment Tracking */}
      <MarketingInvoiceTracking showPaymentDetails={true} />

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
              <FileText className="mr-2 h-4 w-4" />
              Generate Client Reports
            </Button>
            <Button className="w-full justify-start" variant="outline">
              <CreditCard className="mr-2 h-4 w-4" />
              Process Monthly Billing
            </Button>
            <Button className="w-full justify-start" variant="outline">
              <Target className="mr-2 h-4 w-4" />
              Review Opportunities
            </Button>
            <Button className="w-full justify-start" variant="outline">
              <Download className="mr-2 h-4 w-4" />
              Export Marketing Data
            </Button>
          </CardContent>
        </Card>

        {/* Contract Status */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Building2 className="mr-2 h-5 w-5" />
              Contract Status
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm">Active Contracts</span>
              <Badge variant="default" className="bg-green-100 text-green-800">
                {marketingData?.clientBreakdown.filter(c => c.status === 'active').length || 0}
              </Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">Pending Renewals</span>
              <Badge variant="default" className="bg-yellow-100 text-yellow-800">1</Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">New Opportunities</span>
              <Badge variant="default" className="bg-blue-100 text-blue-800">
                {marketingData?.upcomingOpportunities.length || 0}
              </Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">Contract Value</span>
              <span className="text-sm font-medium">
                {formatCurrency(marketingData?.clientBreakdown.reduce((sum, client) => sum + (client.contractValue || 0), 0) || 0)}
              </span>
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
              <p className="font-medium">Invoice processed</p>
              <p className="text-xs text-gray-500">Rebel Sport - 2 hours ago</p>
            </div>
            <div className="text-sm">
              <p className="font-medium">Payment received</p>
              <p className="text-xs text-gray-500">Basketball Australia - 1 day ago</p>
            </div>
            <div className="text-sm">
              <p className="font-medium">Deliverable completed</p>
              <p className="text-xs text-gray-500">Q2 Campaign Strategy - 3 days ago</p>
            </div>
            <div className="text-sm">
              <p className="font-medium">Contract review scheduled</p>
              <p className="text-xs text-gray-500">Rebel Sport renewal - Next month</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
