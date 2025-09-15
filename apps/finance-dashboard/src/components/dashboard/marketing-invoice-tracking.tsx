'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { DataTable } from '@/components/ui/data-table'
import { Input } from '@/components/ui/input'
import { 
  FileText, 
  CreditCard, 
  Clock, 
  CheckCircle,
  AlertTriangle,
  DollarSign,
  Calendar,
  Users,
  RefreshCw,
  Download,
  Filter,
  Eye,
  Activity,
  Target,
  TrendingUp,
  TrendingDown,
  Building2
} from 'lucide-react'
import { formatCurrency } from '@/utils/financial'

interface MarketingInvoice {
  id: string
  invoiceNumber: string
  clientName: string
  serviceType: string
  invoiceDate: Date
  dueDate: Date
  amount: number
  paidAmount: number
  outstandingAmount: number
  status: 'draft' | 'sent' | 'viewed' | 'partial' | 'paid' | 'overdue' | 'cancelled'
  paymentTerms: string
  daysPastDue: number
  
  // Client details
  clientContact: {
    name: string
    email: string
    phone?: string
  }
  
  // Service details
  projectDetails: {
    projectName: string
    deliverables: string[]
    completionDate?: Date
    approvalStatus: 'pending' | 'approved' | 'requires_revision'
  }
  
  // Payment tracking
  paymentHistory: Array<{
    date: Date
    amount: number
    method: string
    reference?: string
    transactionId?: string
  }>
  
  // Communication tracking
  communicationHistory: Array<{
    date: Date
    type: 'email' | 'phone' | 'meeting' | 'document'
    subject: string
    outcome: string
    followUpRequired: boolean
    followUpDate?: Date
  }>
  
  // Contract information
  contractReference?: string
  milestonePayment: boolean
  retentionAmount?: number
  retentionReleaseDate?: Date
  
  // Risk assessment
  riskLevel: 'low' | 'medium' | 'high'
  riskFactors: string[]
  
  // Performance metrics
  daysToPayment?: number
  paymentVelocity: 'fast' | 'normal' | 'slow'
  clientSatisfactionScore?: number
}

interface PaymentTrackingSummary {
  totalOutstanding: number
  totalOverdue: number
  overduePercent: number
  averageDaysToPayment: number
  onTimePaymentRate: number
  
  paymentStatus: {
    draft: number
    sent: number
    viewed: number
    partial: number
    paid: number
    overdue: number
  }
  
  clientPerformance: Array<{
    clientName: string
    totalInvoices: number
    totalValue: number
    averagePaymentDays: number
    onTimeRate: number
    riskLevel: 'low' | 'medium' | 'high'
  }>
  
  upcomingPayments: Array<{
    clientName: string
    invoiceNumber: string
    amount: number
    dueDate: Date
    daysUntilDue: number
    likelihood: 'high' | 'medium' | 'low'
  }>
  
  paymentTrends: Array<{
    month: string
    invoicesSent: number
    invoicesPaid: number
    averageDaysToPayment: number
    collectionEfficiency: number
  }>
}

interface MarketingInvoiceTrackingProps {
  className?: string
  showPaymentDetails?: boolean
  refreshInterval?: number
}

export function MarketingInvoiceTracking({ 
  className,
  showPaymentDetails = true,
  refreshInterval = 300000 // 5 minutes
}: MarketingInvoiceTrackingProps) {
  const [invoices, setInvoices] = useState<MarketingInvoice[]>([])
  const [summary, setSummary] = useState<PaymentTrackingSummary | null>(null)
  const [filteredInvoices, setFilteredInvoices] = useState<MarketingInvoice[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date())
  const [filters, setFilters] = useState({
    status: 'all',
    client: 'all',
    serviceType: 'all',
    overdueOnly: false,
    riskLevel: 'all',
  })
  const [searchTerm, setSearchTerm] = useState('')

  useEffect(() => {
    loadInvoiceData()
    
    // Set up refresh interval
    const interval = setInterval(loadInvoiceData, refreshInterval)
    return () => clearInterval(interval)
  }, [refreshInterval])

  useEffect(() => {
    applyFilters()
  }, [invoices, filters, searchTerm])

  const loadInvoiceData = async () => {
    setIsLoading(true)
    
    try {
      // Simulate API call - replace with actual server actions
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      // Sample invoice data
      setInvoices([
        {
          id: 'inv-mkt-1',
          invoiceNumber: 'INV-MKT-2024-001',
          clientName: 'Rebel Sport',
          serviceType: 'Brand Partnership Management',
          invoiceDate: new Date('2024-11-01'),
          dueDate: new Date('2024-12-01'),
          amount: 15000,
          paidAmount: 15000,
          outstandingAmount: 0,
          status: 'paid',
          paymentTerms: 'Net 30',
          daysPastDue: 0,
          clientContact: {
            name: 'Jennifer Smith',
            email: 'jennifer.smith@rebelsport.com.au',
            phone: '+61 2 9876 5432',
          },
          projectDetails: {
            projectName: 'Q4 Basketball Campaign',
            deliverables: ['Campaign Strategy', 'Creative Assets', 'Performance Report'],
            completionDate: new Date('2024-10-28'),
            approvalStatus: 'approved',
          },
          paymentHistory: [
            {
              date: new Date('2024-11-25'),
              amount: 15000,
              method: 'Bank Transfer',
              reference: 'Q4 Campaign Payment',
              transactionId: 'TXN-RS-001',
            },
          ],
          communicationHistory: [
            {
              date: new Date('2024-11-01'),
              type: 'email',
              subject: 'Invoice INV-MKT-2024-001 - Q4 Campaign',
              outcome: 'Invoice sent and acknowledged',
              followUpRequired: false,
            },
            {
              date: new Date('2024-11-20'),
              type: 'email',
              subject: 'Payment reminder',
              outcome: 'Payment confirmed for Nov 25',
              followUpRequired: false,
            },
          ],
          contractReference: 'RS-CONTRACT-2024',
          milestonePayment: true,
          riskLevel: 'low',
          riskFactors: [],
          daysToPayment: 24,
          paymentVelocity: 'normal',
          clientSatisfactionScore: 9.2,
        },
        {
          id: 'inv-mkt-2',
          invoiceNumber: 'INV-MKT-2024-002',
          clientName: 'Basketball Australia',
          serviceType: 'Event Marketing',
          invoiceDate: new Date('2024-10-15'),
          dueDate: new Date('2024-11-14'),
          amount: 12000,
          paidAmount: 0,
          outstandingAmount: 12000,
          status: 'overdue',
          paymentTerms: 'Net 30',
          daysPastDue: 18,
          clientContact: {
            name: 'Michael Johnson',
            email: 'michael.j@basketballaustralia.com.au',
            phone: '+61 3 9654 3210',
          },
          projectDetails: {
            projectName: 'National Championships Marketing',
            deliverables: ['Event Promotion', 'Social Media Campaign', 'Post-Event Report'],
            completionDate: new Date('2024-10-10'),
            approvalStatus: 'approved',
          },
          paymentHistory: [],
          communicationHistory: [
            {
              date: new Date('2024-10-15'),
              type: 'email',
              subject: 'Invoice INV-MKT-2024-002 - Championships Marketing',
              outcome: 'Invoice sent',
              followUpRequired: false,
            },
            {
              date: new Date('2024-11-15'),
              type: 'email',
              subject: 'Payment reminder - Invoice overdue',
              outcome: 'Client acknowledged, payment processing',
              followUpRequired: true,
              followUpDate: new Date('2024-12-05'),
            },
            {
              date: new Date('2024-11-30'),
              type: 'phone',
              subject: 'Overdue payment follow-up call',
              outcome: 'Payment promised by Dec 10',
              followUpRequired: true,
              followUpDate: new Date('2024-12-12'),
            },
          ],
          contractReference: 'BA-CONTRACT-2024',
          milestonePayment: false,
          riskLevel: 'medium',
          riskFactors: ['Payment delay', 'Budget constraints mentioned'],
          paymentVelocity: 'slow',
          clientSatisfactionScore: 8.1,
        },
        {
          id: 'inv-mkt-3',
          invoiceNumber: 'INV-MKT-2024-003',
          clientName: 'Rebel Sport',
          serviceType: 'Digital Marketing',
          invoiceDate: new Date('2024-12-01'),
          dueDate: new Date('2024-12-31'),
          amount: 8000,
          paidAmount: 0,
          outstandingAmount: 8000,
          status: 'sent',
          paymentTerms: 'Net 30',
          daysPastDue: 0,
          clientContact: {
            name: 'Jennifer Smith',
            email: 'jennifer.smith@rebelsport.com.au',
            phone: '+61 2 9876 5432',
          },
          projectDetails: {
            projectName: 'Holiday Season Digital Campaign',
            deliverables: ['Social Media Strategy', 'Ad Creative', 'Performance Analytics'],
            completionDate: new Date('2024-11-28'),
            approvalStatus: 'approved',
          },
          paymentHistory: [],
          communicationHistory: [
            {
              date: new Date('2024-12-01'),
              type: 'email',
              subject: 'Invoice INV-MKT-2024-003 - Holiday Campaign',
              outcome: 'Invoice sent and viewed',
              followUpRequired: false,
            },
          ],
          contractReference: 'RS-CONTRACT-2024',
          milestonePayment: true,
          riskLevel: 'low',
          riskFactors: [],
          paymentVelocity: 'normal',
          clientSatisfactionScore: 9.2,
        },
      ])

      // Sample payment tracking summary
      setSummary({
        totalOutstanding: 20000,
        totalOverdue: 12000,
        overduePercent: 60.0,
        averageDaysToPayment: 26,
        onTimePaymentRate: 83.3,
        
        paymentStatus: {
          draft: 0,
          sent: 1,
          viewed: 0,
          partial: 0,
          paid: 1,
          overdue: 1,
        },
        
        clientPerformance: [
          {
            clientName: 'Rebel Sport',
            totalInvoices: 2,
            totalValue: 23000,
            averagePaymentDays: 24,
            onTimeRate: 100,
            riskLevel: 'low',
          },
          {
            clientName: 'Basketball Australia',
            totalInvoices: 1,
            totalValue: 12000,
            averagePaymentDays: 48,
            onTimeRate: 0,
            riskLevel: 'medium',
          },
        ],
        
        upcomingPayments: [
          {
            clientName: 'Rebel Sport',
            invoiceNumber: 'INV-MKT-2024-003',
            amount: 8000,
            dueDate: new Date('2024-12-31'),
            daysUntilDue: 18,
            likelihood: 'high',
          },
        ],
        
        paymentTrends: [
          { month: 'Jul', invoicesSent: 3, invoicesPaid: 3, averageDaysToPayment: 25, collectionEfficiency: 100 },
          { month: 'Aug', invoicesSent: 3, invoicesPaid: 3, averageDaysToPayment: 27, collectionEfficiency: 100 },
          { month: 'Sep', invoicesSent: 2, invoicesPaid: 2, averageDaysToPayment: 22, collectionEfficiency: 100 },
          { month: 'Oct', invoicesSent: 4, invoicesPaid: 3, averageDaysToPayment: 31, collectionEfficiency: 75 },
          { month: 'Nov', invoicesSent: 3, invoicesPaid: 2, averageDaysToPayment: 28, collectionEfficiency: 67 },
          { month: 'Dec', invoicesSent: 3, invoicesPaid: 1, averageDaysToPayment: 24, collectionEfficiency: 33 },
        ],
      })

      setLastRefresh(new Date())
    } catch (error) {
      console.error('Failed to load marketing invoice data:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const applyFilters = () => {
    let filtered = [...invoices]

    // Apply search filter
    if (searchTerm.trim()) {
      const search = searchTerm.toLowerCase()
      filtered = filtered.filter(invoice =>
        invoice.clientName.toLowerCase().includes(search) ||
        invoice.invoiceNumber.toLowerCase().includes(search) ||
        invoice.serviceType.toLowerCase().includes(search) ||
        invoice.projectDetails.projectName.toLowerCase().includes(search)
      )
    }

    // Apply status filter
    if (filters.status !== 'all') {
      filtered = filtered.filter(invoice => invoice.status === filters.status)
    }

    // Apply client filter
    if (filters.client !== 'all') {
      filtered = filtered.filter(invoice => invoice.clientName === filters.client)
    }

    // Apply service type filter
    if (filters.serviceType !== 'all') {
      filtered = filtered.filter(invoice => invoice.serviceType === filters.serviceType)
    }

    // Apply overdue only filter
    if (filters.overdueOnly) {
      filtered = filtered.filter(invoice => invoice.daysPastDue > 0)
    }

    // Apply risk level filter
    if (filters.riskLevel !== 'all') {
      filtered = filtered.filter(invoice => invoice.riskLevel === filters.riskLevel)
    }

    setFilteredInvoices(filtered)
  }

  const handleRefresh = () => {
    loadInvoiceData()
  }

  const getStatusBadge = (status: MarketingInvoice['status']) => {
    switch (status) {
      case 'paid':
        return <Badge variant="default" className="bg-green-100 text-green-800">Paid</Badge>
      case 'sent':
        return <Badge variant="default" className="bg-blue-100 text-blue-800">Sent</Badge>
      case 'viewed':
        return <Badge variant="default" className="bg-purple-100 text-purple-800">Viewed</Badge>
      case 'partial':
        return <Badge variant="default" className="bg-yellow-100 text-yellow-800">Partial</Badge>
      case 'overdue':
        return <Badge variant="destructive">Overdue</Badge>
      case 'draft':
        return <Badge variant="secondary">Draft</Badge>
      case 'cancelled':
        return <Badge variant="outline">Cancelled</Badge>
      default:
        return <Badge variant="outline">Unknown</Badge>
    }
  }

  const getRiskBadge = (riskLevel: 'low' | 'medium' | 'high') => {
    switch (riskLevel) {
      case 'high':
        return <Badge variant="destructive">High Risk</Badge>
      case 'medium':
        return <Badge variant="default" className="bg-yellow-100 text-yellow-800">Medium Risk</Badge>
      default:
        return <Badge variant="default" className="bg-green-100 text-green-800">Low Risk</Badge>
    }
  }

  const getPaymentVelocityBadge = (velocity: 'fast' | 'normal' | 'slow') => {
    switch (velocity) {
      case 'fast':
        return <Badge variant="default" className="bg-green-100 text-green-800">Fast</Badge>
      case 'slow':
        return <Badge variant="default" className="bg-red-100 text-red-800">Slow</Badge>
      default:
        return <Badge variant="default" className="bg-blue-100 text-blue-800">Normal</Badge>
    }
  }

  const getLikelihoodBadge = (likelihood: 'high' | 'medium' | 'low') => {
    switch (likelihood) {
      case 'high':
        return <Badge variant="default" className="bg-green-100 text-green-800">High</Badge>
      case 'medium':
        return <Badge variant="default" className="bg-yellow-100 text-yellow-800">Medium</Badge>
      default:
        return <Badge variant="default" className="bg-red-100 text-red-800">Low</Badge>
    }
  }

  // Column definitions for invoice table
  const invoiceColumns = [
    {
      key: 'invoiceNumber',
      title: 'Invoice',
      sortable: true,
      type: 'text' as const,
    },
    {
      key: 'clientName',
      title: 'Client',
      sortable: true,
      type: 'text' as const,
    },
    {
      key: 'serviceType',
      title: 'Service',
      sortable: true,
      type: 'text' as const,
    },
    {
      key: 'amount',
      title: 'Amount',
      sortable: true,
      type: 'currency' as const,
      align: 'right' as const,
    },
    {
      key: 'outstandingAmount',
      title: 'Outstanding',
      sortable: true,
      type: 'currency' as const,
      align: 'right' as const,
    },
    {
      key: 'dueDate',
      title: 'Due Date',
      sortable: true,
      type: 'date' as const,
    },
    {
      key: 'daysPastDue',
      title: 'Days Past Due',
      sortable: true,
      type: 'number' as const,
      align: 'right' as const,
    },
    {
      key: 'status',
      title: 'Status',
      type: 'status' as const,
    },
    {
      key: 'riskLevel',
      title: 'Risk',
      type: 'status' as const,
    },
  ]

  const handleRowClick = (invoice: MarketingInvoice) => {
    // Navigate to invoice detail page
    console.log('Invoice clicked:', invoice.invoiceNumber)
  }

  const handleExport = () => {
    // Export invoice data
    console.log('Export marketing invoice data')
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Summary Cards */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {/* Total Outstanding */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center">
              <DollarSign className="mr-2 h-4 w-4" />
              Total Outstanding
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <p className="text-2xl font-bold">
                {formatCurrency(summary?.totalOutstanding || 0)}
              </p>
              <div className="flex items-center gap-1">
                <span className={`text-sm ${summary && summary.overduePercent > 30 ? 'text-red-600' : 'text-gray-600'}`}>
                  {summary?.overduePercent.toFixed(1)}% overdue
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Average Payment Days */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center">
              <Clock className="mr-2 h-4 w-4" />
              Avg Payment Days
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <p className="text-2xl font-bold">
                {summary?.averageDaysToPayment || 0} days
              </p>
              <div className="flex items-center gap-1">
                <CheckCircle className="h-3 w-3 text-green-500" />
                <span className="text-sm text-green-600">Within terms</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* On-Time Payment Rate */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center">
              <Target className="mr-2 h-4 w-4" />
              On-Time Rate
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <p className="text-2xl font-bold">
                {summary?.onTimePaymentRate.toFixed(1)}%
              </p>
              <p className="text-sm text-gray-600">
                Payment performance
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Active Invoices */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center">
              <FileText className="mr-2 h-4 w-4" />
              Active Invoices
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <p className="text-2xl font-bold">
                {invoices.filter(inv => inv.status !== 'paid' && inv.status !== 'cancelled').length}
              </p>
              <p className="text-sm text-gray-600">
                Requiring attention
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Payment Status Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Activity className="mr-2 h-5 w-5" />
            Invoice Status Breakdown
          </CardTitle>
          <CardDescription>
            Current status of all marketing invoices
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4 md:grid-cols-6">
            {summary && Object.entries(summary.paymentStatus).map(([status, count]) => (
              <div key={status} className="text-center p-3 border rounded-lg">
                <p className="text-2xl font-bold">{count}</p>
                <p className="text-sm text-gray-600 capitalize">{status.replace('_', ' ')}</p>
                {getStatusBadge(status as MarketingInvoice['status'])}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Filters and Search */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Filter className="mr-2 h-5 w-5" />
            Invoice Filters & Search
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Search</label>
              <Input
                placeholder="Invoice, client, project..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="text-sm"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
              <select
                value={filters.status}
                onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}
                className="w-full rounded-md border-gray-300 text-sm"
              >
                <option value="all">All</option>
                <option value="draft">Draft</option>
                <option value="sent">Sent</option>
                <option value="viewed">Viewed</option>
                <option value="partial">Partial</option>
                <option value="paid">Paid</option>
                <option value="overdue">Overdue</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Client</label>
              <select
                value={filters.client}
                onChange={(e) => setFilters(prev => ({ ...prev, client: e.target.value }))}
                className="w-full rounded-md border-gray-300 text-sm"
              >
                <option value="all">All</option>
                <option value="Rebel Sport">Rebel Sport</option>
                <option value="Basketball Australia">Basketball Australia</option>
                <option value="Sports Marketing Co">Sports Marketing Co</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Service</label>
              <select
                value={filters.serviceType}
                onChange={(e) => setFilters(prev => ({ ...prev, serviceType: e.target.value }))}
                className="w-full rounded-md border-gray-300 text-sm"
              >
                <option value="all">All</option>
                <option value="Brand Partnership Management">Brand Partnership</option>
                <option value="Event Marketing">Event Marketing</option>
                <option value="Digital Marketing">Digital Marketing</option>
                <option value="Consulting Services">Consulting</option>
              </select>
            </div>

            <div className="flex items-end">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={filters.overdueOnly}
                  onChange={(e) => setFilters(prev => ({ ...prev, overdueOnly: e.target.checked }))}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="ml-2 text-sm">Overdue only</span>
              </label>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Risk Level</label>
              <select
                value={filters.riskLevel}
                onChange={(e) => setFilters(prev => ({ ...prev, riskLevel: e.target.value }))}
                className="w-full rounded-md border-gray-300 text-sm"
              >
                <option value="all">All</option>
                <option value="low">Low Risk</option>
                <option value="medium">Medium Risk</option>
                <option value="high">High Risk</option>
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Invoice Tracking Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center">
                <FileText className="mr-2 h-5 w-5" />
                Marketing Invoice Tracking
              </CardTitle>
              <CardDescription>
                Detailed invoice status and payment tracking
              </CardDescription>
            </div>
            <div className="flex items-center gap-3">
              <Badge variant="outline">
                {filteredInvoices.length} of {invoices.length} invoices
              </Badge>
              <Button
                variant="outline"
                size="sm"
                onClick={handleRefresh}
                disabled={isLoading}
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <DataTable
            columns={invoiceColumns}
            data={filteredInvoices}
            loading={isLoading}
            searchPlaceholder="Search invoices..."
            onRowClick={handleRowClick}
            onExport={handleExport}
          />
        </CardContent>
      </Card>

      {/* Payment Performance and Client Analysis */}
      {showPaymentDetails && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* Client Payment Performance */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Users className="mr-2 h-5 w-5" />
                Client Payment Performance
              </CardTitle>
              <CardDescription>
                Payment behavior analysis by client
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {summary?.clientPerformance.map((client, index) => (
                <div key={index} className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">{client.clientName}</p>
                    <p className="text-xs text-gray-500">
                      {client.totalInvoices} invoices • {formatCurrency(client.totalValue)} total
                    </p>
                  </div>
                  <div className="text-right">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">{client.averagePaymentDays} days</span>
                      {getPaymentVelocityBadge(
                        client.averagePaymentDays <= 25 ? 'fast' :
                        client.averagePaymentDays <= 35 ? 'normal' : 'slow'
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-500">{client.onTimeRate}% on-time</span>
                      {getRiskBadge(client.riskLevel)}
                    </div>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Upcoming Payments */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Calendar className="mr-2 h-5 w-5" />
                Upcoming Payments
              </CardTitle>
              <CardDescription>
                Expected payments and likelihood assessment
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {summary?.upcomingPayments.map((payment, index) => (
                <div key={index} className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">{payment.clientName}</p>
                    <p className="text-xs text-gray-500">
                      {payment.invoiceNumber} • Due {payment.dueDate.toLocaleDateString()}
                    </p>
                    <p className="text-xs text-gray-500">
                      {payment.daysUntilDue > 0 ? `${payment.daysUntilDue} days until due` : `${Math.abs(payment.daysUntilDue)} days overdue`}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium">{formatCurrency(payment.amount)}</p>
                    {getLikelihoodBadge(payment.likelihood)}
                  </div>
                </div>
              ))}

              {(!summary?.upcomingPayments || summary.upcomingPayments.length === 0) && (
                <div className="text-center py-4">
                  <CheckCircle className="mx-auto h-8 w-8 text-green-400 mb-2" />
                  <p className="text-sm text-gray-500">All invoices current or paid</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Payment Trends */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <TrendingUp className="mr-2 h-5 w-5" />
            Payment Collection Trends
          </CardTitle>
          <CardDescription>
            Monthly collection efficiency and payment performance
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {summary?.paymentTrends.map((trend, index) => (
              <div key={index} className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-sm font-medium w-8">{trend.month}</span>
                  <div>
                    <p className="text-sm">{trend.invoicesSent} sent • {trend.invoicesPaid} paid</p>
                    <p className="text-xs text-gray-500">{trend.averageDaysToPayment} avg days</p>
                  </div>
                </div>
                <div className="text-right">
                  <div className="flex items-center gap-1">
                    <span className={`text-sm font-medium ${
                      trend.collectionEfficiency >= 90 ? 'text-green-600' :
                      trend.collectionEfficiency >= 70 ? 'text-yellow-600' : 'text-red-600'
                    }`}>
                      {trend.collectionEfficiency}%
                    </span>
                    <span className="text-xs text-gray-500">efficiency</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Invoice Actions */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <FileText className="mr-2 h-5 w-5" />
              Invoice Actions
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button className="w-full justify-start" variant="outline">
              <FileText className="mr-2 h-4 w-4" />
              Create New Invoice
            </Button>
            <Button className="w-full justify-start" variant="outline">
              <CreditCard className="mr-2 h-4 w-4" />
              Process Payments
            </Button>
            <Button className="w-full justify-start" variant="outline">
              <AlertTriangle className="mr-2 h-4 w-4" />
              Send Payment Reminders
            </Button>
            <Button className="w-full justify-start" variant="outline">
              <Download className="mr-2 h-4 w-4" />
              Export Invoice Data
            </Button>
          </CardContent>
        </Card>

        {/* Client Management */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Building2 className="mr-2 h-5 w-5" />
              Client Management
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button className="w-full justify-start" variant="outline">
              <Users className="mr-2 h-4 w-4" />
              Contact Overdue Clients
            </Button>
            <Button className="w-full justify-start" variant="outline">
              <Target className="mr-2 h-4 w-4" />
              Review Opportunities
            </Button>
            <Button className="w-full justify-start" variant="outline">
              <Eye className="mr-2 h-4 w-4" />
              Client Relationship Review
            </Button>
            <Button className="w-full justify-start" variant="outline">
              <Calendar className="mr-2 h-4 w-4" />
              Schedule Follow-ups
            </Button>
          </CardContent>
        </Card>

        {/* Performance Metrics */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <BarChart3 className="mr-2 h-5 w-5" />
              Performance Summary
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm">Collection Efficiency</span>
              <span className="text-sm font-medium">
                {summary?.paymentTrends[summary.paymentTrends.length - 1]?.collectionEfficiency || 0}%
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">Payment Velocity</span>
              <Badge variant="default" className="bg-blue-100 text-blue-800">Normal</Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">Client Satisfaction</span>
              <span className="text-sm font-medium text-green-600">8.7/10</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">Contract Renewals</span>
              <Badge variant="default" className="bg-yellow-100 text-yellow-800">1 pending</Badge>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
