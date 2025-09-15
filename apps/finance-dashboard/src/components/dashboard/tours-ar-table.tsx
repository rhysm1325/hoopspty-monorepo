'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { DataTable } from '@/components/ui/data-table'
import { Input } from '@/components/ui/input'
import { 
  Users, 
  Mail, 
  Phone, 
  MapPin, 
  Calendar, 
  DollarSign, 
  AlertTriangle,
  CheckCircle,
  Clock,
  RefreshCw,
  Download,
  Filter,
  Eye,
  MessageSquare,
  FileText,
  CreditCard
} from 'lucide-react'
import { formatCurrency } from '@/utils/financial'

interface ToursARRecord {
  id: string
  customerName: string
  contactPerson?: string
  email?: string
  phone?: string
  mobile?: string
  address?: {
    line1: string
    city: string
    state: string
    postcode: string
  }
  invoiceNumber: string
  invoiceDate: Date
  dueDate: Date
  tourType: string
  tourDate: Date
  participants: number
  originalAmount: number
  paidAmount: number
  outstandingAmount: number
  daysPastDue: number
  agingBucket: 'current' | '1-30' | '31-60' | '61-90' | '90+'
  status: 'current' | 'overdue' | 'paid' | 'partial'
  riskLevel: 'low' | 'medium' | 'high'
  lastContactDate?: Date
  lastContactMethod?: 'email' | 'phone' | 'letter' | 'meeting'
  nextFollowUpDate?: Date
  paymentTerms: string
  creditLimit?: number
  totalBookingsYTD: number
  totalRevenueYTD: number
  customerSince: Date
  preferredContactMethod: 'email' | 'phone' | 'both'
  notes?: string
  paymentHistory: Array<{
    date: Date
    amount: number
    method: string
    reference?: string
  }>
  contactHistory: Array<{
    date: Date
    method: 'email' | 'phone' | 'letter' | 'meeting'
    subject: string
    outcome: string
    followUpRequired: boolean
    followUpDate?: Date
  }>
}

interface ToursARSummary {
  totalOutstanding: number
  totalOverdue: number
  overduePercent: number
  averageDSO: number
  currentBucket: number
  bucket1to30: number
  bucket31to60: number
  bucket61to90: number
  bucket90plus: number
  highRiskCustomers: number
  contactsRequiredToday: number
  upcomingPayments: Array<{
    customerName: string
    amount: number
    dueDate: Date
    tourType: string
  }>
}

interface ToursARTableProps {
  className?: string
  maxRows?: number
  showContactActions?: boolean
  refreshInterval?: number
}

export function ToursARTable({ 
  className,
  maxRows = 50,
  showContactActions = true,
  refreshInterval = 300000 // 5 minutes
}: ToursARTableProps) {
  const [summary, setSummary] = useState<ToursARSummary | null>(null)
  const [arRecords, setArRecords] = useState<ToursARRecord[]>([])
  const [filteredRecords, setFilteredRecords] = useState<ToursARRecord[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date())
  const [filters, setFilters] = useState({
    agingBucket: 'all',
    riskLevel: 'all',
    tourType: 'all',
    contactRequired: false,
    overdueOnly: false,
  })
  const [searchTerm, setSearchTerm] = useState('')

  useEffect(() => {
    loadARData()
    
    // Set up refresh interval
    const interval = setInterval(loadARData, refreshInterval)
    return () => clearInterval(interval)
  }, [refreshInterval])

  useEffect(() => {
    applyFilters()
  }, [arRecords, filters, searchTerm])

  const loadARData = async () => {
    setIsLoading(true)
    
    try {
      // Simulate API call - replace with actual server actions
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      // Sample Tours AR summary
      setSummary({
        totalOutstanding: 52430,
        totalOverdue: 24350,
        overduePercent: 46.5,
        averageDSO: 11.1,
        currentBucket: 28080,
        bucket1to30: 8950,
        bucket31to60: 0,
        bucket61to90: 15400,
        bucket90plus: 0,
        highRiskCustomers: 2,
        contactsRequiredToday: 3,
        upcomingPayments: [
          {
            customerName: 'Brisbane Basketball Association',
            amount: 12000,
            dueDate: new Date('2024-12-31'),
            tourType: 'AAU Basketball Tours',
          },
          {
            customerName: 'Perth Youth League',
            amount: 8500,
            dueDate: new Date('2025-01-15'),
            tourType: 'Elite Training Camps',
          },
        ],
      })

      // Sample Tours AR records
      setArRecords([
        {
          id: 'ar-tours-1',
          customerName: 'Melbourne Basketball Academy',
          contactPerson: 'Sarah Johnson',
          email: 'sarah@melbournebasketball.com.au',
          phone: '+61 3 9123 4567',
          mobile: '+61 412 345 678',
          address: {
            line1: '123 Basketball Court',
            city: 'Melbourne',
            state: 'VIC',
            postcode: '3000',
          },
          invoiceNumber: 'INV-TOURS-2024-001',
          invoiceDate: new Date('2024-08-01'),
          dueDate: new Date('2024-08-31'),
          tourType: 'AAU Basketball Tours',
          tourDate: new Date('2024-10-12'),
          participants: 24,
          originalAmount: 15600,
          paidAmount: 0,
          outstandingAmount: 15600,
          daysPastDue: 67,
          agingBucket: '61-90',
          status: 'overdue',
          riskLevel: 'high',
          lastContactDate: new Date('2024-11-15'),
          lastContactMethod: 'email',
          nextFollowUpDate: new Date('2024-12-20'),
          paymentTerms: 'Net 30',
          creditLimit: 50000,
          totalBookingsYTD: 8,
          totalRevenueYTD: 48000,
          customerSince: new Date('2019-03-15'),
          preferredContactMethod: 'email',
          notes: 'Long-standing customer, usually pays but currently experiencing cash flow issues.',
          paymentHistory: [
            { date: new Date('2024-06-15'), amount: 12000, method: 'Bank Transfer', reference: 'Previous tour payment' },
            { date: new Date('2024-03-20'), amount: 18000, method: 'Credit Card', reference: 'Q1 tour payment' },
          ],
          contactHistory: [
            {
              date: new Date('2024-11-15'),
              method: 'email',
              subject: 'Outstanding Invoice Reminder',
              outcome: 'Customer acknowledged, requested payment plan',
              followUpRequired: true,
              followUpDate: new Date('2024-12-20'),
            },
            {
              date: new Date('2024-10-30'),
              method: 'phone',
              subject: 'Payment Follow-up Call',
              outcome: 'Left voicemail, no response',
              followUpRequired: true,
              followUpDate: new Date('2024-11-15'),
            },
          ],
        },
        {
          id: 'ar-tours-2',
          customerName: 'Sydney Sports Tours',
          contactPerson: 'Michael Chen',
          email: 'michael@sydneysports.com.au',
          phone: '+61 2 8234 5678',
          mobile: '+61 423 456 789',
          address: {
            line1: '456 Sports Avenue',
            city: 'Sydney',
            state: 'NSW',
            postcode: '2000',
          },
          invoiceNumber: 'INV-TOURS-2024-002',
          invoiceDate: new Date('2024-09-15'),
          dueDate: new Date('2024-10-15'),
          tourType: 'AAU Basketball Tours',
          tourDate: new Date('2024-10-28'),
          participants: 32,
          originalAmount: 28950,
          paidAmount: 0,
          outstandingAmount: 28950,
          daysPastDue: 0,
          agingBucket: 'current',
          status: 'current',
          riskLevel: 'low',
          lastContactDate: new Date('2024-10-01'),
          lastContactMethod: 'email',
          paymentTerms: 'Net 30',
          creditLimit: 75000,
          totalBookingsYTD: 6,
          totalRevenueYTD: 36000,
          customerSince: new Date('2020-08-10'),
          preferredContactMethod: 'email',
          notes: 'Reliable customer with excellent payment history.',
          paymentHistory: [
            { date: new Date('2024-08-20'), amount: 18000, method: 'Bank Transfer', reference: 'August tour payment' },
            { date: new Date('2024-05-15'), amount: 15000, method: 'Bank Transfer', reference: 'May tour payment' },
          ],
          contactHistory: [
            {
              date: new Date('2024-10-01'),
              method: 'email',
              subject: 'Tour Confirmation and Invoice',
              outcome: 'Customer confirmed receipt, payment scheduled',
              followUpRequired: false,
            },
          ],
        },
        {
          id: 'ar-tours-3',
          customerName: 'Adelaide Basketball Club',
          contactPerson: 'Emma Wilson',
          email: 'emma@adelaidebasketball.com.au',
          phone: '+61 8 8345 6789',
          address: {
            line1: '789 Court Street',
            city: 'Adelaide',
            state: 'SA',
            postcode: '5000',
          },
          invoiceNumber: 'INV-TOURS-2024-003',
          invoiceDate: new Date('2024-08-20'),
          dueDate: new Date('2024-09-19'),
          tourType: 'Elite Training Camps',
          tourDate: new Date('2024-09-15'),
          participants: 20,
          originalAmount: 12000,
          paidAmount: 12000,
          outstandingAmount: 0,
          daysPastDue: 0,
          agingBucket: 'current',
          status: 'paid',
          riskLevel: 'low',
          lastContactDate: new Date('2024-09-01'),
          lastContactMethod: 'email',
          paymentTerms: 'Net 30',
          creditLimit: 40000,
          totalBookingsYTD: 4,
          totalRevenueYTD: 24000,
          customerSince: new Date('2021-11-05'),
          preferredContactMethod: 'email',
          notes: 'Excellent customer, always pays on time.',
          paymentHistory: [
            { date: new Date('2024-09-15'), amount: 12000, method: 'Credit Card', reference: 'Elite camp payment' },
            { date: new Date('2024-06-10'), amount: 8000, method: 'Bank Transfer', reference: 'June camp payment' },
          ],
          contactHistory: [
            {
              date: new Date('2024-09-01'),
              method: 'email',
              subject: 'Payment Confirmation',
              outcome: 'Payment received and processed',
              followUpRequired: false,
            },
          ],
        },
        {
          id: 'ar-tours-4',
          customerName: 'Perth Youth League',
          contactPerson: 'David Thompson',
          email: 'david@perthyouth.com.au',
          phone: '+61 8 9456 7890',
          mobile: '+61 434 567 890',
          address: {
            line1: '321 Youth Centre Road',
            city: 'Perth',
            state: 'WA',
            postcode: '6000',
          },
          invoiceNumber: 'INV-TOURS-2024-004',
          invoiceDate: new Date('2024-09-01'),
          dueDate: new Date('2024-10-01'),
          tourType: 'School Holiday Programs',
          tourDate: new Date('2024-12-20'),
          participants: 35,
          originalAmount: 8500,
          paidAmount: 0,
          outstandingAmount: 8500,
          daysPastDue: 45,
          agingBucket: '31-60',
          status: 'overdue',
          riskLevel: 'medium',
          lastContactDate: new Date('2024-11-20'),
          lastContactMethod: 'phone',
          nextFollowUpDate: new Date('2024-12-25'),
          paymentTerms: 'Net 30',
          creditLimit: 25000,
          totalBookingsYTD: 3,
          totalRevenueYTD: 18500,
          customerSince: new Date('2022-01-20'),
          preferredContactMethod: 'phone',
          notes: 'New customer, first overdue payment. School budget constraints mentioned.',
          paymentHistory: [
            { date: new Date('2024-07-15'), amount: 6000, method: 'Cheque', reference: 'July program payment' },
            { date: new Date('2024-04-10'), amount: 4000, method: 'Bank Transfer', reference: 'April program payment' },
          ],
          contactHistory: [
            {
              date: new Date('2024-11-20'),
              method: 'phone',
              subject: 'Payment Follow-up Call',
              outcome: 'Customer explained budget delays, committed to pay by Dec 30',
              followUpRequired: true,
              followUpDate: new Date('2024-12-25'),
            },
            {
              date: new Date('2024-11-05'),
              method: 'email',
              subject: 'Overdue Payment Notice',
              outcome: 'Email opened but no response',
              followUpRequired: true,
              followUpDate: new Date('2024-11-20'),
            },
          ],
        },
      ])

      setLastRefresh(new Date())
    } catch (error) {
      console.error('Failed to load Tours AR data:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const applyFilters = () => {
    let filtered = [...arRecords]

    // Apply search filter
    if (searchTerm.trim()) {
      const search = searchTerm.toLowerCase()
      filtered = filtered.filter(record =>
        record.customerName.toLowerCase().includes(search) ||
        record.contactPerson?.toLowerCase().includes(search) ||
        record.email?.toLowerCase().includes(search) ||
        record.invoiceNumber.toLowerCase().includes(search) ||
        record.tourType.toLowerCase().includes(search)
      )
    }

    // Apply aging bucket filter
    if (filters.agingBucket !== 'all') {
      filtered = filtered.filter(record => record.agingBucket === filters.agingBucket)
    }

    // Apply risk level filter
    if (filters.riskLevel !== 'all') {
      filtered = filtered.filter(record => record.riskLevel === filters.riskLevel)
    }

    // Apply tour type filter
    if (filters.tourType !== 'all') {
      filtered = filtered.filter(record => record.tourType === filters.tourType)
    }

    // Apply overdue only filter
    if (filters.overdueOnly) {
      filtered = filtered.filter(record => record.daysPastDue > 0)
    }

    // Apply contact required filter
    if (filters.contactRequired) {
      filtered = filtered.filter(record => 
        record.nextFollowUpDate && record.nextFollowUpDate <= new Date()
      )
    }

    // Limit results
    if (maxRows) {
      filtered = filtered.slice(0, maxRows)
    }

    setFilteredRecords(filtered)
  }

  const handleRefresh = () => {
    loadARData()
  }

  const handleContactCustomer = (record: ToursARRecord, method: 'email' | 'phone' | 'letter') => {
    // In real implementation, would open contact form or initiate contact
    console.log(`Contact ${record.customerName} via ${method}`)
  }

  const getRiskBadgeColor = (riskLevel: 'low' | 'medium' | 'high') => {
    switch (riskLevel) {
      case 'high':
        return 'bg-red-100 text-red-800'
      case 'medium':
        return 'bg-yellow-100 text-yellow-800'
      default:
        return 'bg-green-100 text-green-800'
    }
  }

  const getAgingBadgeColor = (bucket: string) => {
    switch (bucket) {
      case 'current':
        return 'bg-green-100 text-green-800'
      case '1-30':
        return 'bg-yellow-100 text-yellow-800'
      case '31-60':
        return 'bg-orange-100 text-orange-800'
      case '61-90':
        return 'bg-red-100 text-red-800'
      case '90+':
        return 'bg-red-200 text-red-900'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const getStatusBadge = (status: ToursARRecord['status']) => {
    switch (status) {
      case 'paid':
        return <Badge variant="default" className="bg-green-100 text-green-800">Paid</Badge>
      case 'current':
        return <Badge variant="default" className="bg-blue-100 text-blue-800">Current</Badge>
      case 'overdue':
        return <Badge variant="destructive">Overdue</Badge>
      case 'partial':
        return <Badge variant="default" className="bg-yellow-100 text-yellow-800">Partial</Badge>
      default:
        return <Badge variant="outline">Unknown</Badge>
    }
  }

  // Column definitions for Tours AR table
  const arColumns = [
    {
      key: 'customerName',
      title: 'Customer',
      sortable: true,
      type: 'text' as const,
    },
    {
      key: 'invoiceNumber',
      title: 'Invoice',
      sortable: true,
      type: 'text' as const,
    },
    {
      key: 'tourType',
      title: 'Tour Type',
      sortable: true,
      type: 'text' as const,
    },
    {
      key: 'tourDate',
      title: 'Tour Date',
      sortable: true,
      type: 'date' as const,
    },
    {
      key: 'outstandingAmount',
      title: 'Outstanding',
      sortable: true,
      type: 'currency' as const,
      align: 'right' as const,
    },
    {
      key: 'daysPastDue',
      title: 'Days Past Due',
      sortable: true,
      type: 'number' as const,
      align: 'right' as const,
    },
    {
      key: 'agingBucket',
      title: 'Aging',
      type: 'text' as const,
    },
    {
      key: 'riskLevel',
      title: 'Risk',
      type: 'status' as const,
    },
    {
      key: 'lastContactDate',
      title: 'Last Contact',
      sortable: true,
      type: 'date' as const,
    },
  ]

  const handleRowClick = (record: ToursARRecord) => {
    // Navigate to customer detail page
    console.log('AR record clicked:', record.customerName)
  }

  const handleExport = () => {
    // Export AR data to CSV
    console.log('Export Tours AR data')
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
              <div className="flex items-center gap-1 text-sm">
                <span className={`${summary && summary.overduePercent > 30 ? 'text-red-600' : 'text-gray-600'}`}>
                  {summary?.overduePercent.toFixed(1)}% overdue
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Average DSO */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center">
              <Clock className="mr-2 h-4 w-4" />
              Average DSO
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <p className="text-2xl font-bold">
                {summary?.averageDSO.toFixed(1)} days
              </p>
              <div className="flex items-center gap-1 text-sm">
                <CheckCircle className="h-3 w-3 text-green-500" />
                <span className="text-green-600">Below target (15 days)</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* High Risk Customers */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center">
              <AlertTriangle className="mr-2 h-4 w-4" />
              High Risk
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <p className="text-2xl font-bold">
                {summary?.highRiskCustomers || 0}
              </p>
              <p className="text-sm text-gray-600">
                Customers requiring attention
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Contacts Required */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center">
              <MessageSquare className="mr-2 h-4 w-4" />
              Contacts Due
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <p className="text-2xl font-bold">
                {summary?.contactsRequiredToday || 0}
              </p>
              <p className="text-sm text-gray-600">
                Follow-ups due today
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Aging Analysis and Upcoming Payments */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Aging Breakdown */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Calendar className="mr-2 h-5 w-5" />
              Aging Analysis
            </CardTitle>
            <CardDescription>
              Outstanding amounts by aging bucket
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="h-3 w-3 rounded-full bg-green-500"></div>
                <span className="text-sm">Current (0-30 days)</span>
              </div>
              <div className="text-right">
                <p className="text-sm font-medium">{formatCurrency(summary?.currentBucket || 0)}</p>
                <p className="text-xs text-gray-500">
                  {summary && summary.totalOutstanding > 0 ? ((summary.currentBucket / summary.totalOutstanding) * 100).toFixed(1) : 0}%
                </p>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="h-3 w-3 rounded-full bg-yellow-500"></div>
                <span className="text-sm">1-30 days</span>
              </div>
              <div className="text-right">
                <p className="text-sm font-medium">{formatCurrency(summary?.bucket1to30 || 0)}</p>
                <p className="text-xs text-gray-500">
                  {summary && summary.totalOutstanding > 0 ? ((summary.bucket1to30 / summary.totalOutstanding) * 100).toFixed(1) : 0}%
                </p>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="h-3 w-3 rounded-full bg-orange-500"></div>
                <span className="text-sm">31-60 days</span>
              </div>
              <div className="text-right">
                <p className="text-sm font-medium">{formatCurrency(summary?.bucket31to60 || 0)}</p>
                <p className="text-xs text-gray-500">
                  {summary && summary.totalOutstanding > 0 ? ((summary.bucket31to60 / summary.totalOutstanding) * 100).toFixed(1) : 0}%
                </p>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="h-3 w-3 rounded-full bg-red-500"></div>
                <span className="text-sm">61-90 days</span>
              </div>
              <div className="text-right">
                <p className="text-sm font-medium">{formatCurrency(summary?.bucket61to90 || 0)}</p>
                <p className="text-xs text-gray-500">
                  {summary && summary.totalOutstanding > 0 ? ((summary.bucket61to90 / summary.totalOutstanding) * 100).toFixed(1) : 0}%
                </p>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="h-3 w-3 rounded-full bg-red-700"></div>
                <span className="text-sm">90+ days</span>
              </div>
              <div className="text-right">
                <p className="text-sm font-medium">{formatCurrency(summary?.bucket90plus || 0)}</p>
                <p className="text-xs text-gray-500">
                  {summary && summary.totalOutstanding > 0 ? ((summary.bucket90plus / summary.totalOutstanding) * 100).toFixed(1) : 0}%
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Upcoming Payments */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <CreditCard className="mr-2 h-5 w-5" />
              Upcoming Payments
            </CardTitle>
            <CardDescription>
              Expected payments from confirmed bookings
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {summary?.upcomingPayments.map((payment, index) => (
              <div key={index} className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">{payment.customerName}</p>
                  <p className="text-xs text-gray-500">
                    {payment.tourType} • Due {payment.dueDate.toLocaleDateString()}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium">{formatCurrency(payment.amount)}</p>
                  <p className="text-xs text-gray-500">
                    {payment.dueDate > new Date() ? 'Future' : 'Overdue'}
                  </p>
                </div>
              </div>
            ))}

            {(!summary?.upcomingPayments || summary.upcomingPayments.length === 0) && (
              <div className="text-center py-4">
                <CheckCircle className="mx-auto h-8 w-8 text-gray-400 mb-2" />
                <p className="text-sm text-gray-500">No upcoming payments scheduled</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Filters and Search */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Filter className="mr-2 h-5 w-5" />
            Filters & Search
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Search</label>
              <Input
                placeholder="Customer, invoice, email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="text-sm"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Aging</label>
              <select
                value={filters.agingBucket}
                onChange={(e) => setFilters(prev => ({ ...prev, agingBucket: e.target.value }))}
                className="w-full rounded-md border-gray-300 text-sm"
              >
                <option value="all">All</option>
                <option value="current">Current</option>
                <option value="1-30">1-30 days</option>
                <option value="31-60">31-60 days</option>
                <option value="61-90">61-90 days</option>
                <option value="90+">90+ days</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Risk Level</label>
              <select
                value={filters.riskLevel}
                onChange={(e) => setFilters(prev => ({ ...prev, riskLevel: e.target.value }))}
                className="w-full rounded-md border-gray-300 text-sm"
              >
                <option value="all">All</option>
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Tour Type</label>
              <select
                value={filters.tourType}
                onChange={(e) => setFilters(prev => ({ ...prev, tourType: e.target.value }))}
                className="w-full rounded-md border-gray-300 text-sm"
              >
                <option value="all">All Types</option>
                <option value="AAU Basketball Tours">AAU Tours</option>
                <option value="Elite Training Camps">Elite Camps</option>
                <option value="School Holiday Programs">Holiday Programs</option>
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

            <div className="flex items-end">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={filters.contactRequired}
                  onChange={(e) => setFilters(prev => ({ ...prev, contactRequired: e.target.checked }))}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="ml-2 text-sm">Contact due</span>
              </label>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tours AR Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center">
                <Users className="mr-2 h-5 w-5" />
                Tours Accounts Receivable
              </CardTitle>
              <CardDescription>
                Outstanding invoices with customer contact information
              </CardDescription>
            </div>
            <div className="flex items-center gap-3">
              <Badge variant="outline">
                {filteredRecords.length} of {arRecords.length} records
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
            columns={arColumns}
            data={filteredRecords}
            loading={isLoading}
            searchPlaceholder="Search AR records..."
            onRowClick={handleRowClick}
            onExport={handleExport}
          />
        </CardContent>
      </Card>

      {/* Contact Actions */}
      {showContactActions && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* Quick Contact Actions */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <MessageSquare className="mr-2 h-5 w-5" />
                Quick Actions
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button className="w-full justify-start" variant="outline">
                <Mail className="mr-2 h-4 w-4" />
                Send Payment Reminders
              </Button>
              <Button className="w-full justify-start" variant="outline">
                <Phone className="mr-2 h-4 w-4" />
                Call Overdue Customers
              </Button>
              <Button className="w-full justify-start" variant="outline">
                <FileText className="mr-2 h-4 w-4" />
                Generate Statements
              </Button>
              <Button className="w-full justify-start" variant="outline">
                <Download className="mr-2 h-4 w-4" />
                Export Contact List
              </Button>
            </CardContent>
          </Card>

          {/* Contact Statistics */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Users className="mr-2 h-5 w-5" />
                Contact Statistics
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm">Email Addresses</span>
                <span className="text-sm font-medium">
                  {arRecords.filter(r => r.email).length}/{arRecords.length}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Phone Numbers</span>
                <span className="text-sm font-medium">
                  {arRecords.filter(r => r.phone).length}/{arRecords.length}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Complete Addresses</span>
                <span className="text-sm font-medium">
                  {arRecords.filter(r => r.address).length}/{arRecords.length}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Contact Persons</span>
                <span className="text-sm font-medium">
                  {arRecords.filter(r => r.contactPerson).length}/{arRecords.length}
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Recent Contact Activity */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Clock className="mr-2 h-5 w-5" />
                Recent Activity
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="text-sm">
                <p className="font-medium">Payment received</p>
                <p className="text-xs text-gray-500">Adelaide Basketball Club - 2 hours ago</p>
              </div>
              <div className="text-sm">
                <p className="font-medium">Follow-up call completed</p>
                <p className="text-xs text-gray-500">Perth Youth League - 4 hours ago</p>
              </div>
              <div className="text-sm">
                <p className="font-medium">Email reminder sent</p>
                <p className="text-xs text-gray-500">Melbourne Basketball Academy - 1 day ago</p>
              </div>
              <div className="text-sm">
                <p className="font-medium">New booking confirmed</p>
                <p className="text-xs text-gray-500">Brisbane Basketball Association - 2 days ago</p>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
