'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { DataTable } from '@/components/ui/data-table'
import { 
  Calendar, 
  Clock, 
  DollarSign, 
  TrendingUp, 
  TrendingDown, 
  RefreshCw,
  Download,
  AlertTriangle,
  CheckCircle,
  Eye,
  Plane
} from 'lucide-react'
import { formatCurrency } from '@/utils/financial'

interface DeferredRevenueItem {
  id: string
  customerName: string
  tourType: string
  bookingDate: Date
  tourDate: Date
  totalAmount: number
  recognizedAmount: number
  deferredAmount: number
  recognitionMethod: 'immediate' | 'monthly' | 'performance' | 'milestone'
  recognitionSchedule: Array<{
    date: Date
    amount: number
    status: 'pending' | 'recognized' | 'adjusted'
  }>
  milestones?: Array<{
    name: string
    targetDate: Date
    completedDate?: Date
    amount: number
    status: 'pending' | 'completed' | 'overdue'
  }>
  participants: number
  depositReceived: number
  finalPaymentDue: Date
  status: 'booked' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled'
}

interface DeferredRevenueSummary {
  totalDeferred: number
  totalToBeRecognized: number
  recognizedThisMonth: number
  recognizedYTD: number
  averageDeferralPeriod: number
  recognitionMethods: Record<string, number>
  upcomingRecognition: Array<{
    month: string
    amount: number
    itemCount: number
  }>
  overdueRecognitions: Array<{
    id: string
    customerName: string
    amount: number
    daysPastDue: number
  }>
}

interface ToursDeferredRevenueProps {
  className?: string
  showDetails?: boolean
  refreshInterval?: number
}

export function ToursDeferredRevenue({ 
  className, 
  showDetails = true,
  refreshInterval = 300000 // 5 minutes
}: ToursDeferredRevenueProps) {
  const [summary, setSummary] = useState<DeferredRevenueSummary | null>(null)
  const [deferredItems, setDeferredItems] = useState<DeferredRevenueItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date())
  const [selectedMethod, setSelectedMethod] = useState<string>('all')

  useEffect(() => {
    loadDeferredRevenueData()
    
    // Set up refresh interval
    const interval = setInterval(loadDeferredRevenueData, refreshInterval)
    return () => clearInterval(interval)
  }, [refreshInterval, selectedMethod])

  const loadDeferredRevenueData = async () => {
    setIsLoading(true)
    
    try {
      // Simulate API call - replace with actual server actions
      await new Promise(resolve => setTimeout(resolve, 800))
      
      // Sample deferred revenue data
      setSummary({
        totalDeferred: 125000,
        totalToBeRecognized: 98000,
        recognizedThisMonth: 45000,
        recognizedYTD: 266963,
        averageDeferralPeriod: 120, // days
        recognitionMethods: {
          immediate: 85,
          monthly: 10,
          performance: 3,
          milestone: 2,
        },
        upcomingRecognition: [
          { month: 'Jan', amount: 32000, itemCount: 8 },
          { month: 'Feb', amount: 28000, itemCount: 6 },
          { month: 'Mar', amount: 38000, itemCount: 9 },
          { month: 'Apr', amount: 0, itemCount: 0 },
          { month: 'May', amount: 0, itemCount: 0 },
          { month: 'Jun', amount: 0, itemCount: 0 },
        ],
        overdueRecognitions: [
          {
            id: 'overdue-1',
            customerName: 'Perth Youth League',
            amount: 8500,
            daysPastDue: 15,
          },
        ],
      })

      setDeferredItems([
        {
          id: 'def-1',
          customerName: 'Brisbane Basketball Association',
          tourType: 'AAU Basketball Tours',
          bookingDate: new Date('2024-06-15'),
          tourDate: new Date('2025-09-20'),
          totalAmount: 24000,
          recognizedAmount: 0,
          deferredAmount: 24000,
          recognitionMethod: 'monthly',
          recognitionSchedule: [
            { date: new Date('2025-01-01'), amount: 4000, status: 'pending' },
            { date: new Date('2025-02-01'), amount: 4000, status: 'pending' },
            { date: new Date('2025-03-01'), amount: 4000, status: 'pending' },
            { date: new Date('2025-04-01'), amount: 4000, status: 'pending' },
            { date: new Date('2025-05-01'), amount: 4000, status: 'pending' },
            { date: new Date('2025-06-01'), amount: 4000, status: 'pending' },
          ],
          participants: 28,
          depositReceived: 12000,
          finalPaymentDue: new Date('2025-08-20'),
          status: 'confirmed',
        },
        {
          id: 'def-2',
          customerName: 'Gold Coast Sports Academy',
          tourType: 'Elite Training Camps',
          bookingDate: new Date('2024-07-20'),
          tourDate: new Date('2025-10-15'),
          totalAmount: 18000,
          recognizedAmount: 0,
          deferredAmount: 18000,
          recognitionMethod: 'milestone',
          recognitionSchedule: [
            { date: new Date('2025-08-01'), amount: 9000, status: 'pending' },
            { date: new Date('2025-10-15'), amount: 9000, status: 'pending' },
          ],
          milestones: [
            { name: 'Final Payment Received', targetDate: new Date('2025-08-01'), amount: 9000, status: 'pending' },
            { name: 'Tour Completed', targetDate: new Date('2025-10-15'), amount: 9000, status: 'pending' },
          ],
          participants: 20,
          depositReceived: 9000,
          finalPaymentDue: new Date('2025-08-01'),
          status: 'confirmed',
        },
        {
          id: 'def-3',
          customerName: 'Darwin Basketball Club',
          tourType: 'School Holiday Programs',
          bookingDate: new Date('2024-05-10'),
          tourDate: new Date('2024-12-20'),
          totalAmount: 15000,
          recognizedAmount: 15000,
          deferredAmount: 0,
          recognitionMethod: 'immediate',
          recognitionSchedule: [
            { date: new Date('2024-12-20'), amount: 15000, status: 'recognized' },
          ],
          participants: 35,
          depositReceived: 15000,
          finalPaymentDue: new Date('2024-12-01'),
          status: 'completed',
        },
      ])

      setLastRefresh(new Date())
    } catch (error) {
      console.error('Failed to load deferred revenue data:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleRefresh = () => {
    loadDeferredRevenueData()
  }

  const getStatusBadge = (status: DeferredRevenueItem['status']) => {
    switch (status) {
      case 'completed':
        return <Badge variant="default" className="bg-green-100 text-green-800">Completed</Badge>
      case 'confirmed':
        return <Badge variant="default" className="bg-blue-100 text-blue-800">Confirmed</Badge>
      case 'in_progress':
        return <Badge variant="default" className="bg-yellow-100 text-yellow-800">In Progress</Badge>
      case 'booked':
        return <Badge variant="secondary">Booked</Badge>
      case 'cancelled':
        return <Badge variant="destructive">Cancelled</Badge>
      default:
        return <Badge variant="outline">Unknown</Badge>
    }
  }

  const getMethodBadge = (method: DeferredRevenueItem['recognitionMethod']) => {
    switch (method) {
      case 'immediate':
        return <Badge variant="default" className="bg-green-100 text-green-800">Immediate</Badge>
      case 'monthly':
        return <Badge variant="default" className="bg-blue-100 text-blue-800">Monthly</Badge>
      case 'performance':
        return <Badge variant="default" className="bg-purple-100 text-purple-800">Performance</Badge>
      case 'milestone':
        return <Badge variant="default" className="bg-orange-100 text-orange-800">Milestone</Badge>
      default:
        return <Badge variant="outline">Unknown</Badge>
    }
  }

  // Column definitions for deferred revenue items
  const deferredColumns = [
    {
      key: 'customerName',
      title: 'Customer',
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
      key: 'totalAmount',
      title: 'Total Amount',
      sortable: true,
      type: 'currency' as const,
      align: 'right' as const,
    },
    {
      key: 'deferredAmount',
      title: 'Deferred',
      sortable: true,
      type: 'currency' as const,
      align: 'right' as const,
    },
    {
      key: 'recognitionMethod',
      title: 'Method',
      type: 'text' as const,
    },
    {
      key: 'status',
      title: 'Status',
      type: 'status' as const,
    },
  ]

  // Filter deferred items based on selected method
  const filteredItems = selectedMethod === 'all' 
    ? deferredItems 
    : deferredItems.filter(item => item.recognitionMethod === selectedMethod)

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Summary Cards */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {/* Total Deferred */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center">
              <Clock className="mr-2 h-4 w-4" />
              Total Deferred
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <p className="text-2xl font-bold">
                {formatCurrency(summary?.totalDeferred || 0)}
              </p>
              <p className="text-sm text-gray-600">
                From {deferredItems.filter(item => item.deferredAmount > 0).length} bookings
              </p>
            </div>
          </CardContent>
        </Card>

        {/* To Be Recognized */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center">
              <TrendingUp className="mr-2 h-4 w-4" />
              To Be Recognized
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <p className="text-2xl font-bold">
                {formatCurrency(summary?.totalToBeRecognized || 0)}
              </p>
              <p className="text-sm text-gray-600">
                Next 12 months
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Recognized This Month */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center">
              <CheckCircle className="mr-2 h-4 w-4" />
              This Month
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <p className="text-2xl font-bold">
                {formatCurrency(summary?.recognizedThisMonth || 0)}
              </p>
              <p className="text-sm text-gray-600">
                Recognized revenue
              </p>
            </div>
          </CardContent>
        </Card>

        {/* YTD Recognized */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center">
              <DollarSign className="mr-2 h-4 w-4" />
              YTD Recognized
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <p className="text-2xl font-bold">
                {formatCurrency(summary?.recognizedYTD || 0)}
              </p>
              <p className="text-sm text-gray-600">
                Total revenue recognized
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recognition Schedule and Methods */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Upcoming Recognition Schedule */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Calendar className="mr-2 h-5 w-5" />
              Recognition Schedule
            </CardTitle>
            <CardDescription>
              Monthly revenue recognition forecast
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {summary?.upcomingRecognition.map((month, index) => (
                <div key={index} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-medium w-8">{month.month}</span>
                    <div>
                      <p className="text-sm">{month.itemCount} bookings</p>
                      <p className="text-xs text-gray-500">to be recognized</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium">{formatCurrency(month.amount)}</p>
                    <p className="text-xs text-gray-500">
                      {month.amount > 0 ? ((month.amount / (summary?.totalToBeRecognized || 1)) * 100).toFixed(1) : 0}%
                    </p>
                  </div>
                </div>
              ))}
            </div>

            {summary?.overdueRecognitions && summary.overdueRecognitions.length > 0 && (
              <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                <h4 className="text-sm font-medium text-red-800 mb-2 flex items-center">
                  <AlertTriangle className="mr-1 h-4 w-4" />
                  Overdue Recognitions ({summary.overdueRecognitions.length})
                </h4>
                <div className="space-y-1">
                  {summary.overdueRecognitions.map((overdue, index) => (
                    <div key={index} className="flex items-center justify-between text-sm">
                      <span className="text-red-700">{overdue.customerName}</span>
                      <div className="text-right">
                        <span className="font-medium text-red-800">{formatCurrency(overdue.amount)}</span>
                        <span className="ml-2 text-xs text-red-600">({overdue.daysPastDue} days)</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recognition Methods Breakdown */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Eye className="mr-2 h-5 w-5" />
              Recognition Methods
            </CardTitle>
            <CardDescription>
              Revenue recognition method distribution
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {summary && Object.entries(summary.recognitionMethods).map(([method, percentage]) => (
              <div key={method} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className={`h-3 w-3 rounded-full ${
                    method === 'immediate' ? 'bg-green-500' :
                    method === 'monthly' ? 'bg-blue-500' :
                    method === 'performance' ? 'bg-purple-500' : 'bg-orange-500'
                  }`}></div>
                  <span className="text-sm font-medium capitalize">{method}</span>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium">{percentage}%</p>
                  <p className="text-xs text-gray-500">of bookings</p>
                </div>
              </div>
            ))}

            <div className="mt-4 p-3 bg-blue-50 rounded-lg">
              <h4 className="text-sm font-medium text-blue-800 mb-1">Recognition Policy</h4>
              <div className="text-xs text-blue-700 space-y-1">
                <p>• <strong>Immediate:</strong> Tours completed within booking month</p>
                <p>• <strong>Monthly:</strong> Multi-month tour programs</p>
                <p>• <strong>Performance:</strong> Based on attendance milestones</p>
                <p>• <strong>Milestone:</strong> Specific deliverable completion</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Deferred Revenue Items */}
      {showDetails && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center">
                  <Plane className="mr-2 h-5 w-5" />
                  Deferred Revenue Items
                </CardTitle>
                <CardDescription>
                  Detailed view of all deferred revenue bookings
                </CardDescription>
              </div>
              <div className="flex items-center gap-3">
                <select
                  value={selectedMethod}
                  onChange={(e) => setSelectedMethod(e.target.value)}
                  className="rounded-md border-gray-300 text-sm"
                >
                  <option value="all">All Methods</option>
                  <option value="immediate">Immediate</option>
                  <option value="monthly">Monthly</option>
                  <option value="performance">Performance</option>
                  <option value="milestone">Milestone</option>
                </select>
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
              columns={deferredColumns}
              data={filteredItems}
              loading={isLoading}
              searchPlaceholder="Search deferred revenue items..."
              onRowClick={(item) => {
                // Navigate to detailed recognition schedule
                console.log('Deferred revenue item clicked:', item.customerName)
              }}
              onExport={() => {
                // Export deferred revenue data
                console.log('Export deferred revenue data')
              }}
            />
          </CardContent>
        </Card>
      )}

      {/* Recognition Performance Metrics */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Performance Summary */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <TrendingUp className="mr-2 h-5 w-5" />
              Performance Metrics
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm">Recognition Accuracy</span>
              <Badge variant="default" className="bg-green-100 text-green-800">98.5%</Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">On-Time Recognition</span>
              <Badge variant="default" className="bg-blue-100 text-blue-800">95.2%</Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">Avg Deferral Period</span>
              <span className="text-sm font-medium">{summary?.averageDeferralPeriod || 0} days</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">Manual Adjustments</span>
              <span className="text-sm font-medium">3 this month</span>
            </div>
          </CardContent>
        </Card>

        {/* Compliance Status */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <CheckCircle className="mr-2 h-5 w-5" />
              Compliance Status
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm">AASB 15 Compliance</span>
              <Badge variant="default" className="bg-green-100 text-green-800">Compliant</Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">Recognition Policy</span>
              <Badge variant="default" className="bg-blue-100 text-blue-800">Active</Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">Audit Trail</span>
              <Badge variant="default" className="bg-green-100 text-green-800">Complete</Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">Last Review</span>
              <span className="text-sm text-gray-600">{lastRefresh.toLocaleDateString()}</span>
            </div>
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <RefreshCw className="mr-2 h-5 w-5" />
              Quick Actions
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button className="w-full justify-start" variant="outline">
              <Download className="mr-2 h-4 w-4" />
              Export Recognition Schedule
            </Button>
            <Button className="w-full justify-start" variant="outline">
              <Calendar className="mr-2 h-4 w-4" />
              Manual Recognition Entry
            </Button>
            <Button className="w-full justify-start" variant="outline">
              <Eye className="mr-2 h-4 w-4" />
              Review Overdue Items
            </Button>
            <Button className="w-full justify-start" variant="outline">
              <CheckCircle className="mr-2 h-4 w-4" />
              Run Recognition Process
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Last Updated Info */}
      <div className="flex items-center justify-between text-sm text-gray-500">
        <div className="flex items-center gap-2">
          <Clock className="h-4 w-4" />
          Last updated: {lastRefresh.toLocaleTimeString()}
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline">
            {filteredItems.length} items • {selectedMethod === 'all' ? 'All methods' : selectedMethod}
          </Badge>
        </div>
      </div>
    </div>
  )
}
