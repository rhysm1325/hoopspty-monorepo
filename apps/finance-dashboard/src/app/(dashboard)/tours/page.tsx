'use client'

// Force dynamic rendering to prevent static generation issues
export const dynamic = 'force-dynamic'

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
// TODO: Re-implement tours-specific components
// import { ToursDeferredRevenue } from '@/components/dashboard/tours-deferred-revenue'
// import { ToursARTable } from '@/components/dashboard/tours-ar-table'
import { 
  Plane, 
  Calendar, 
  TrendingUp, 
  TrendingDown, 
  MapPin, 
  Users, 
  Clock, 
  DollarSign,
  RefreshCw,
  Download,
  AlertTriangle,
  CheckCircle,
  Activity,
  Target,
  Filter,
  Eye
} from 'lucide-react'
import { formatCurrency, formatPercentage } from '@/utils/financial'

interface ToursSeasonalData {
  currentSeason: {
    totalRevenue: number
    bookingsCount: number
    averageBookingValue: number
    recognizedRevenue: number
    deferredRevenue: number
    refunds: number
    netRevenue: number
    grossMargin: number
    grossMarginPercent: number
  }
  priorSeason: {
    totalRevenue: number
    bookingsCount: number
    averageBookingValue: number
    netRevenue: number
  }
  seasonalTrends: {
    peakWeeks: number[]
    lowWeeks: number[]
    averageWeeklyRevenue: number
    volatilityScore: number
    seasonalityFactor: number
  }
  monthlyBreakdown: Array<{
    month: string
    bookings: number
    revenue: number
    cumulativeRevenue: number
    targetRevenue: number
    variance: number
    variancePercent: number
  }>
  tourTypes: Array<{
    type: string
    bookings: number
    revenue: number
    averageValue: number
    marginPercent: number
    popularity: number
  }>
  deferredRevenueSchedule: Array<{
    month: string
    openingBalance: number
    newBookings: number
    recognized: number
    closingBalance: number
  }>
}

interface ToursCustomer {
  id: string
  name: string
  contactPerson?: string
  email?: string
  phone?: string
  totalBookings: number
  totalRevenue: number
  averageBookingValue: number
  lastBookingDate: Date
  nextBookingDate?: Date
  outstandingAmount: number
  daysPastDue: number
  riskLevel: 'low' | 'medium' | 'high'
  preferredTourTypes: string[]
  bookingHistory: Array<{
    id: string
    tourType: string
    bookingDate: Date
    tourDate: Date
    participants: number
    value: number
    status: 'confirmed' | 'completed' | 'cancelled' | 'pending'
  }>
}

export default function ToursDashboard() {
  const { user, hasPermission } = useAuth()
  const [selectedDate, setSelectedDate] = useState<Date>()
  const [toursData, setToursData] = useState<ToursSeasonalData | null>(null)
  const [toursCustomers, setToursCustomers] = useState<ToursCustomer[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date())
  const [selectedTourType, setSelectedTourType] = useState<string>('all')
  const [seasonFilter, setSeasonFilter] = useState<'current' | 'prior' | 'both'>('current')

  const [currentFY, setCurrentFY] = useState<ReturnType<typeof getCurrentFinancialYear> | null>(null)
  
  // Initialize current FY safely on client side
  useEffect(() => {
    try {
      setCurrentFY(getCurrentFinancialYear())
    } catch (error) {
      console.warn('Error getting current financial year:', error)
      setCurrentFY({
        year: 2024,
        startDate: new Date('2024-07-01'),
        endDate: new Date('2025-06-30'),
        label: 'FY 2024-25'
      })
    }
  }, [])

  // Load Tours dashboard data
  useEffect(() => {
    loadToursData()
  }, [selectedTourType, seasonFilter])

  const loadToursData = async () => {
    setIsLoading(true)
    
    try {
      // Simulate API call - replace with actual server actions
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      // Sample Tours seasonal data
      setToursData({
        currentSeason: {
          totalRevenue: 266963,
          bookingsCount: 47,
          averageBookingValue: 5679,
          recognizedRevenue: 266963,
          deferredRevenue: 0, // Tours are typically recognized immediately
          refunds: 8500,
          netRevenue: 258463,
          grossMargin: 258463, // Service business with minimal COGS
          grossMarginPercent: 96.8,
        },
        priorSeason: {
          totalRevenue: 246180,
          bookingsCount: 43,
          averageBookingValue: 5725,
          netRevenue: 238920,
        },
        seasonalTrends: {
          peakWeeks: [6, 7, 8, 9, 10, 11], // Sep-Nov peak season
          lowWeeks: [20, 21, 22, 23, 24, 25], // Mar-May low season
          averageWeeklyRevenue: 5137,
          volatilityScore: 78.5, // High volatility due to seasonal nature
          seasonalityFactor: 3.2, // Peak season 3.2x higher than low season
        },
        monthlyBreakdown: [
          { month: 'Jul', bookings: 2, revenue: 12000, cumulativeRevenue: 12000, targetRevenue: 15000, variance: -3000, variancePercent: -20 },
          { month: 'Aug', bookings: 3, revenue: 18500, cumulativeRevenue: 30500, targetRevenue: 35000, variance: -4500, variancePercent: -12.9 },
          { month: 'Sep', bookings: 12, revenue: 68200, cumulativeRevenue: 98700, targetRevenue: 85000, variance: 13700, variancePercent: 16.1 },
          { month: 'Oct', bookings: 15, revenue: 89750, cumulativeRevenue: 188450, targetRevenue: 145000, variance: 43450, variancePercent: 30.0 },
          { month: 'Nov', bookings: 11, revenue: 62500, cumulativeRevenue: 250950, targetRevenue: 195000, variance: 55950, variancePercent: 28.7 },
          { month: 'Dec', bookings: 4, revenue: 16013, cumulativeRevenue: 266963, targetRevenue: 225000, variance: 41963, variancePercent: 18.7 },
        ],
        tourTypes: [
          { type: 'AAU Basketball Tours', bookings: 28, revenue: 168000, averageValue: 6000, marginPercent: 97.2, popularity: 59.6 },
          { type: 'Elite Training Camps', bookings: 12, revenue: 72000, averageValue: 6000, marginPercent: 96.8, popularity: 25.5 },
          { type: 'School Holiday Programs', bookings: 7, revenue: 26963, averageValue: 3852, marginPercent: 95.1, popularity: 14.9 },
        ],
        deferredRevenueSchedule: [
          { month: 'Jan', openingBalance: 0, newBookings: 0, recognized: 0, closingBalance: 0 },
          { month: 'Feb', openingBalance: 0, newBookings: 0, recognized: 0, closingBalance: 0 },
          { month: 'Mar', openingBalance: 0, newBookings: 5000, recognized: 0, closingBalance: 5000 },
          { month: 'Apr', openingBalance: 5000, newBookings: 12000, recognized: 0, closingBalance: 17000 },
          { month: 'May', openingBalance: 17000, newBookings: 8000, recognized: 0, closingBalance: 25000 },
          { month: 'Jun', openingBalance: 25000, newBookings: 0, recognized: 25000, closingBalance: 0 },
        ],
      })

      // Sample Tours customers data
      setToursCustomers([
        {
          id: '1',
          name: 'Melbourne Basketball Academy',
          contactPerson: 'Sarah Johnson',
          email: 'sarah@melbournebasketball.com.au',
          phone: '+61 3 9123 4567',
          totalBookings: 8,
          totalRevenue: 48000,
          averageBookingValue: 6000,
          lastBookingDate: new Date('2024-11-15'),
          nextBookingDate: new Date('2025-09-20'),
          outstandingAmount: 15600,
          daysPastDue: 67,
          riskLevel: 'high',
          preferredTourTypes: ['AAU Basketball Tours', 'Elite Training Camps'],
          bookingHistory: [
            {
              id: 'booking-1',
              tourType: 'AAU Basketball Tours',
              bookingDate: new Date('2024-08-15'),
              tourDate: new Date('2024-10-12'),
              participants: 24,
              value: 15600,
              status: 'completed',
            },
            {
              id: 'booking-2',
              tourType: 'Elite Training Camps',
              bookingDate: new Date('2024-09-20'),
              tourDate: new Date('2024-11-15'),
              participants: 16,
              value: 12000,
              status: 'completed',
            },
          ],
        },
        {
          id: '2',
          name: 'Sydney Sports Tours',
          contactPerson: 'Michael Chen',
          email: 'michael@sydneysports.com.au',
          phone: '+61 2 8234 5678',
          totalBookings: 6,
          totalRevenue: 36000,
          averageBookingValue: 6000,
          lastBookingDate: new Date('2024-10-28'),
          nextBookingDate: new Date('2025-10-05'),
          outstandingAmount: 28950,
          daysPastDue: 0,
          riskLevel: 'low',
          preferredTourTypes: ['AAU Basketball Tours'],
          bookingHistory: [
            {
              id: 'booking-3',
              tourType: 'AAU Basketball Tours',
              bookingDate: new Date('2024-09-10'),
              tourDate: new Date('2024-10-28'),
              participants: 32,
              value: 18000,
              status: 'completed',
            },
          ],
        },
        {
          id: '3',
          name: 'Adelaide Basketball Club',
          contactPerson: 'Emma Wilson',
          email: 'emma@adelaidebasketball.com.au',
          phone: '+61 8 8345 6789',
          totalBookings: 4,
          totalRevenue: 24000,
          averageBookingValue: 6000,
          lastBookingDate: new Date('2024-09-15'),
          outstandingAmount: 0,
          daysPastDue: 0,
          riskLevel: 'low',
          preferredTourTypes: ['Elite Training Camps', 'School Holiday Programs'],
          bookingHistory: [
            {
              id: 'booking-4',
              tourType: 'Elite Training Camps',
              bookingDate: new Date('2024-08-20'),
              tourDate: new Date('2024-09-15'),
              participants: 20,
              value: 12000,
              status: 'completed',
            },
          ],
        },
      ])

      setLastRefresh(new Date())
    } catch (error) {
      console.error('Failed to load Tours data:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleRefresh = () => {
    loadToursData()
  }

  // Column definitions for Tours customers table
  const customerColumns = [
    {
      key: 'name',
      title: 'Customer',
      sortable: true,
      type: 'text' as const,
    },
    {
      key: 'totalBookings',
      title: 'Bookings',
      sortable: true,
      type: 'number' as const,
      align: 'right' as const,
    },
    {
      key: 'totalRevenue',
      title: 'Revenue',
      sortable: true,
      type: 'currency' as const,
      align: 'right' as const,
    },
    {
      key: 'averageBookingValue',
      title: 'Avg Value',
      sortable: true,
      type: 'currency' as const,
      align: 'right' as const,
    },
    {
      key: 'lastBookingDate',
      title: 'Last Booking',
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
      key: 'riskLevel',
      title: 'Risk',
      type: 'status' as const,
    },
  ]

  const getSeasonalInsight = () => {
    if (!toursData) return null
    
    const currentWeek = currentFY ? Math.ceil((new Date().getTime() - currentFY.startDate.getTime()) / (7 * 24 * 60 * 60 * 1000)) : 12
    const isPeakSeason = toursData.seasonalTrends.peakWeeks.includes(currentWeek)
    const isLowSeason = toursData.seasonalTrends.lowWeeks.includes(currentWeek)
    
    if (isPeakSeason) {
      return {
        type: 'info' as const,
        message: 'Currently in peak season (Sep-Nov). Focus on maximizing bookings and managing capacity.',
      }
    } else if (isLowSeason) {
      return {
        type: 'warning' as const,
        message: 'Currently in low season (Mar-May). Consider promotional activities and planning for next peak season.',
      }
    } else {
      return {
        type: 'neutral' as const,
        message: 'Currently in transition period. Plan marketing campaigns for upcoming peak season.',
      }
    }
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

  const seasonalInsight = getSeasonalInsight()

  if (!user) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center text-gray-500">
              <Plane className="mx-auto mb-2 h-8 w-8 text-gray-400" />
              <p>Please log in to access the Tours dashboard.</p>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Check if user has permission to view Tours dashboard
  if (!hasPermission('canViewToursDashboard') && !hasPermission('canViewFinancials')) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center text-gray-500">
              <AlertTriangle className="mx-auto mb-2 h-8 w-8 text-gray-400" />
              <p>You do not have permission to view the Tours dashboard.</p>
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
            <Plane className="h-8 w-8 text-green-600" />
            Tours Dashboard
          </h1>
          <p className="text-gray-600">
            Seasonal revenue analysis and tour booking performance for {currentFY?.label || 'FY 2024-25'}
          </p>
        </div>
        
        <div className="flex items-center gap-4">
          <select
            value={selectedTourType}
            onChange={(e) => setSelectedTourType(e.target.value)}
            className="rounded-md border-gray-300 text-sm"
          >
            <option value="all">All Tour Types</option>
            <option value="AAU Basketball Tours">AAU Basketball Tours</option>
            <option value="Elite Training Camps">Elite Training Camps</option>
            <option value="School Holiday Programs">School Holiday Programs</option>
          </select>
          
          <DatePicker
            date={selectedDate}
            onDateChange={setSelectedDate}
            placeholder="Select reporting period"
          />
          
          <Badge variant="outline" className="flex items-center gap-1">
            <Calendar className="h-3 w-3" />
            {currentFY?.label || 'FY 2024-25'} • Week {currentFY ? Math.ceil((new Date().getTime() - currentFY.startDate.getTime()) / (7 * 24 * 60 * 60 * 1000)) : 12}
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

      {/* Seasonal Insight Alert */}
      {seasonalInsight && (
        <Card>
          <CardContent className="pt-6">
            <div className={`flex items-center rounded-md p-4 ${
              seasonalInsight.type === 'info' ? 'bg-blue-50' :
              seasonalInsight.type === 'warning' ? 'bg-yellow-50' : 'bg-gray-50'
            }`}>
              {seasonalInsight.type === 'info' && <Activity className="h-5 w-5 text-blue-400" />}
              {seasonalInsight.type === 'warning' && <AlertTriangle className="h-5 w-5 text-yellow-400" />}
              {seasonalInsight.type === 'neutral' && <Clock className="h-5 w-5 text-gray-400" />}
              <div className="ml-3">
                <h3 className={`text-sm font-medium ${
                  seasonalInsight.type === 'info' ? 'text-blue-800' :
                  seasonalInsight.type === 'warning' ? 'text-yellow-800' : 'text-gray-800'
                }`}>
                  Seasonal Status
                </h3>
                <p className={`mt-1 text-sm ${
                  seasonalInsight.type === 'info' ? 'text-blue-700' :
                  seasonalInsight.type === 'warning' ? 'text-yellow-700' : 'text-gray-700'
                }`}>
                  {seasonalInsight.message}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Key Performance Indicators */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {/* Total Revenue */}
        <MetricTile
          title="Total Revenue"
          value={toursData?.currentSeason.totalRevenue || 0}
          currency
          isLoading={isLoading}
          change={{
            value: toursData ? `${((toursData.currentSeason.totalRevenue - toursData.priorSeason.totalRevenue) / toursData.priorSeason.totalRevenue * 100).toFixed(1)}%` : '',
            type: toursData && toursData.currentSeason.totalRevenue > toursData.priorSeason.totalRevenue ? 'positive' : 'negative',
            label: 'vs prior season',
          }}
          icon={<DollarSign className="h-5 w-5" />}
        />

        {/* Total Bookings */}
        <MetricTile
          title="Total Bookings"
          value={toursData?.currentSeason.bookingsCount || 0}
          isLoading={isLoading}
          change={{
            value: toursData ? `${toursData.currentSeason.bookingsCount - toursData.priorSeason.bookingsCount > 0 ? '+' : ''}${toursData.currentSeason.bookingsCount - toursData.priorSeason.bookingsCount}` : '',
            type: toursData && toursData.currentSeason.bookingsCount > toursData.priorSeason.bookingsCount ? 'positive' : 'negative',
            label: 'vs prior season',
          }}
          icon={<Users className="h-5 w-5" />}
        />

        {/* Average Booking Value */}
        <MetricTile
          title="Avg Booking Value"
          value={toursData?.currentSeason.averageBookingValue || 0}
          currency
          isLoading={isLoading}
          change={{
            value: toursData ? `${((toursData.currentSeason.averageBookingValue - toursData.priorSeason.averageBookingValue) / toursData.priorSeason.averageBookingValue * 100).toFixed(1)}%` : '',
            type: toursData && toursData.currentSeason.averageBookingValue > toursData.priorSeason.averageBookingValue ? 'positive' : 'negative',
            label: 'vs prior season',
          }}
          icon={<Target className="h-5 w-5" />}
        />

        {/* Gross Margin */}
        <MetricTile
          title="Gross Margin"
          value={toursData ? `${toursData.currentSeason.grossMarginPercent.toFixed(1)}%` : '0%'}
          isLoading={isLoading}
          change={{
            value: '+2.1%',
            type: 'positive',
            label: 'vs target 94.7%',
          }}
          icon={<TrendingUp className="h-5 w-5" />}
        />
      </div>

      {/* Seasonal Revenue Analysis and Tour Types Performance */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Revenue Comparison Chart */}
        <div className="lg:col-span-2">
          <RevenueComparisonChart 
            revenueStream="tours"
            chartType="line"
            showCumulative={true}
            weeksToShow={26}
          />
        </div>

        {/* Tour Types Performance */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <MapPin className="mr-2 h-5 w-5" />
              Tour Types Performance
            </CardTitle>
            <CardDescription>
              Revenue breakdown by tour category
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {toursData?.tourTypes.map((tourType, index) => (
              <div key={index} className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">{tourType.type}</p>
                  <p className="text-xs text-gray-500">
                    {tourType.bookings} bookings • {tourType.marginPercent.toFixed(1)}% margin
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium">{formatCurrency(tourType.revenue)}</p>
                  <p className="text-xs text-gray-500">{tourType.popularity.toFixed(1)}% of total</p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Monthly Performance and Seasonal Trends */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Monthly Breakdown */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Calendar className="mr-2 h-5 w-5" />
              Monthly Performance vs Target
            </CardTitle>
            <CardDescription>
              Booking revenue by month with variance analysis
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {toursData?.monthlyBreakdown.map((month, index) => (
                <div key={index} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-medium w-8">{month.month}</span>
                    <div>
                      <p className="text-sm">{month.bookings} bookings</p>
                      <p className="text-xs text-gray-500">{formatCurrency(month.revenue)}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className={`flex items-center gap-1 ${
                      month.variancePercent > 0 ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {month.variancePercent > 0 ? (
                        <TrendingUp className="h-3 w-3" />
                      ) : (
                        <TrendingDown className="h-3 w-3" />
                      )}
                      <span className="text-sm font-medium">
                        {month.variancePercent > 0 ? '+' : ''}{month.variancePercent.toFixed(1)}%
                      </span>
                    </div>
                    <p className="text-xs text-gray-500">vs target</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Seasonal Insights */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Activity className="mr-2 h-5 w-5" />
              Seasonal Analysis
            </CardTitle>
            <CardDescription>
              Tours business seasonality patterns and insights
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="rounded-lg border p-3">
                <div className="flex items-center">
                  <TrendingUp className="mr-2 h-4 w-4 text-green-500" />
                  <span className="text-sm font-medium">Peak Season</span>
                </div>
                <p className="mt-1 text-sm text-gray-600">Sep-Nov</p>
                <p className="text-xs text-gray-500">Weeks 6-11</p>
              </div>
              
              <div className="rounded-lg border p-3">
                <div className="flex items-center">
                  <TrendingDown className="mr-2 h-4 w-4 text-red-500" />
                  <span className="text-sm font-medium">Low Season</span>
                </div>
                <p className="mt-1 text-sm text-gray-600">Mar-May</p>
                <p className="text-xs text-gray-500">Weeks 20-25</p>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm">Seasonality Factor</span>
                <span className="text-sm font-medium">
                  {toursData?.seasonalTrends.seasonalityFactor.toFixed(1)}x
                </span>
              </div>
              
              <div className="flex items-center justify-between">
                <span className="text-sm">Revenue Volatility</span>
                <Badge variant={toursData && toursData.seasonalTrends.volatilityScore > 70 ? 'destructive' : 'secondary'}>
                  {toursData?.seasonalTrends.volatilityScore.toFixed(1)}%
                </Badge>
              </div>
              
              <div className="flex items-center justify-between">
                <span className="text-sm">Avg Weekly Revenue</span>
                <span className="text-sm font-medium">
                  {formatCurrency(toursData?.seasonalTrends.averageWeeklyRevenue || 0)}
                </span>
              </div>
            </div>

            <div className="mt-4 p-3 bg-blue-50 rounded-lg">
              <h4 className="text-sm font-medium text-blue-800 mb-1">Strategic Recommendation</h4>
              <p className="text-xs text-blue-700">
                Focus marketing efforts in Jun-Aug to maximize peak season bookings. 
                Consider off-season promotional activities to reduce revenue volatility.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Deferred Revenue Tracking - TODO: Re-implement component */}
      <Card>
        <CardHeader>
          <CardTitle>Deferred Revenue Tracking</CardTitle>
          <CardDescription>Tours deferred revenue tracking and recognition views</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-500">Component temporarily unavailable - under development</p>
        </CardContent>
      </Card>

      {/* Tours AR Table - TODO: Re-implement component */}
      <Card>
        <CardHeader>
          <CardTitle>Tours Customer AR</CardTitle>
          <CardDescription>Tours AR table with customer contact integration</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-500">Component temporarily unavailable - under development</p>
        </CardContent>
      </Card>

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
              <Download className="mr-2 h-4 w-4" />
              Export Tours Report
            </Button>
            <Button className="w-full justify-start" variant="outline">
              <Users className="mr-2 h-4 w-4" />
              Contact Overdue Customers
            </Button>
            <Button className="w-full justify-start" variant="outline">
              <Calendar className="mr-2 h-4 w-4" />
              View Booking Calendar
            </Button>
            <Button className="w-full justify-start" variant="outline">
              <Filter className="mr-2 h-4 w-4" />
              Advanced Filters
            </Button>
          </CardContent>
        </Card>

        {/* Booking Status Summary */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <CheckCircle className="mr-2 h-5 w-5" />
              Booking Status
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm">Confirmed Bookings</span>
              <Badge variant="default" className="bg-green-100 text-green-800">
                {toursData?.currentSeason.bookingsCount || 0}
              </Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">Pending Confirmations</span>
              <Badge variant="secondary">3</Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">Cancelled Tours</span>
              <Badge variant="outline">2</Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">Refunds Processed</span>
              <span className="text-sm font-medium">{formatCurrency(toursData?.currentSeason.refunds || 0)}</span>
            </div>
          </CardContent>
        </Card>

        {/* Seasonal Performance */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Calendar className="mr-2 h-5 w-5" />
              Seasonal Performance
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm">Peak Season Revenue</span>
              <span className="text-sm font-medium">
                {formatCurrency((toursData?.currentSeason.totalRevenue || 0) * 0.75)}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">Off-Season Revenue</span>
              <span className="text-sm font-medium">
                {formatCurrency((toursData?.currentSeason.totalRevenue || 0) * 0.25)}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">Seasonality Impact</span>
              <Badge variant="warning">High</Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">Next Peak Season</span>
              <span className="text-sm text-gray-600">Sep 2025</span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
