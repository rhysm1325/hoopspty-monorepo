'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { 
  Filter, 
  Search, 
  Calendar, 
  TrendingUp, 
  TrendingDown, 
  DollarSign,
  BarChart3,
  Eye,
  Target,
  RefreshCw,
  Download,
  X,
  Plus,
  Settings
} from 'lucide-react'
import { formatCurrency } from '@/utils/financial'
import type { RevenueStream } from '@/types'

interface FilterOption {
  id: string
  label: string
  value: string
  type: 'select' | 'date' | 'number' | 'text' | 'boolean'
  options?: Array<{ value: string; label: string }>
  placeholder?: string
  min?: number
  max?: number
}

interface ActiveFilter {
  id: string
  label: string
  value: string
  displayValue: string
}

interface DrillDownLevel {
  level: number
  title: string
  description: string
  filters: ActiveFilter[]
  dataCount: number
  totalValue: number
}

interface RevenueStreamFilterProps {
  currentRevenueStream?: RevenueStream | 'all'
  onRevenueStreamChange?: (stream: RevenueStream | 'all') => void
  onFiltersChange?: (filters: Record<string, any>) => void
  onDrillDown?: (level: DrillDownLevel) => void
  availableFilters?: FilterOption[]
  showDrillDown?: boolean
  className?: string
}

export function RevenueStreamFilter({
  currentRevenueStream = 'all',
  onRevenueStreamChange,
  onFiltersChange,
  onDrillDown,
  availableFilters = [],
  showDrillDown = true,
  className
}: RevenueStreamFilterProps) {
  const [activeFilters, setActiveFilters] = useState<ActiveFilter[]>([])
  const [drillDownPath, setDrillDownPath] = useState<DrillDownLevel[]>([])
  const [isExpanded, setIsExpanded] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [dateRange, setDateRange] = useState({
    startDate: '',
    endDate: '',
  })
  const [customFilters, setCustomFilters] = useState<Record<string, any>>({})

  // Default filter options for revenue streams
  const defaultFilters: FilterOption[] = [
    {
      id: 'revenue_stream',
      label: 'Revenue Stream',
      value: currentRevenueStream,
      type: 'select',
      options: [
        { value: 'all', label: 'All Streams' },
        { value: 'tours', label: 'Tours' },
        { value: 'dr-dish', label: 'Dr Dish' },
        { value: 'marketing', label: 'Marketing' },
        { value: 'other', label: 'Other' },
      ],
    },
    {
      id: 'date_range',
      label: 'Date Range',
      value: 'current_fy',
      type: 'select',
      options: [
        { value: 'current_fy', label: 'Current FY' },
        { value: 'last_30_days', label: 'Last 30 Days' },
        { value: 'last_90_days', label: 'Last 90 Days' },
        { value: 'ytd', label: 'Year to Date' },
        { value: 'custom', label: 'Custom Range' },
      ],
    },
    {
      id: 'amount_min',
      label: 'Minimum Amount',
      value: '',
      type: 'number',
      placeholder: 'Enter minimum amount',
      min: 0,
    },
    {
      id: 'amount_max',
      label: 'Maximum Amount',
      value: '',
      type: 'number',
      placeholder: 'Enter maximum amount',
      min: 0,
    },
    {
      id: 'customer_segment',
      label: 'Customer Segment',
      value: 'all',
      type: 'select',
      options: [
        { value: 'all', label: 'All Segments' },
        { value: 'enterprise', label: 'Enterprise' },
        { value: 'mid_market', label: 'Mid-Market' },
        { value: 'small_business', label: 'Small Business' },
        { value: 'individual', label: 'Individual' },
      ],
    },
    {
      id: 'payment_status',
      label: 'Payment Status',
      value: 'all',
      type: 'select',
      options: [
        { value: 'all', label: 'All Statuses' },
        { value: 'paid', label: 'Paid' },
        { value: 'outstanding', label: 'Outstanding' },
        { value: 'overdue', label: 'Overdue' },
        { value: 'partial', label: 'Partial Payment' },
      ],
    },
    ...availableFilters,
  ]

  useEffect(() => {
    // Notify parent of filter changes
    const filterValues = {
      revenueStream: currentRevenueStream,
      search: searchTerm,
      dateRange,
      ...customFilters,
    }
    
    onFiltersChange?.(filterValues)
  }, [currentRevenueStream, searchTerm, dateRange, customFilters, onFiltersChange])

  const handleRevenueStreamChange = (stream: RevenueStream | 'all') => {
    onRevenueStreamChange?.(stream)
  }

  const addFilter = (filterId: string, value: string, displayValue?: string) => {
    const filterOption = defaultFilters.find(f => f.id === filterId)
    if (!filterOption) return

    const newFilter: ActiveFilter = {
      id: filterId,
      label: filterOption.label,
      value,
      displayValue: displayValue || value,
    }

    setActiveFilters(prev => {
      // Remove existing filter with same id
      const filtered = prev.filter(f => f.id !== filterId)
      return [...filtered, newFilter]
    })

    // Update custom filters
    setCustomFilters(prev => ({
      ...prev,
      [filterId]: value,
    }))
  }

  const removeFilter = (filterId: string) => {
    setActiveFilters(prev => prev.filter(f => f.id !== filterId))
    setCustomFilters(prev => {
      const { [filterId]: removed, ...rest } = prev
      return rest
    })
  }

  const clearAllFilters = () => {
    setActiveFilters([])
    setCustomFilters({})
    setSearchTerm('')
    setDateRange({ startDate: '', endDate: '' })
    setDrillDownPath([])
  }

  const handleDrillDown = (newLevel: Omit<DrillDownLevel, 'level'>) => {
    const level: DrillDownLevel = {
      ...newLevel,
      level: drillDownPath.length + 1,
    }
    
    setDrillDownPath(prev => [...prev, level])
    onDrillDown?.(level)
  }

  const navigateToDrillDownLevel = (targetLevel: number) => {
    setDrillDownPath(prev => prev.slice(0, targetLevel))
  }

  const getRevenueStreamColor = (stream: RevenueStream | 'all') => {
    switch (stream) {
      case 'tours':
        return 'bg-green-100 text-green-800'
      case 'dr-dish':
        return 'bg-blue-100 text-blue-800'
      case 'marketing':
        return 'bg-pink-100 text-pink-800'
      case 'other':
        return 'bg-gray-100 text-gray-800'
      default:
        return 'bg-purple-100 text-purple-800'
    }
  }

  const getRevenueStreamIcon = (stream: RevenueStream | 'all') => {
    switch (stream) {
      case 'tours':
        return '✈️'
      case 'dr-dish':
        return '🏀'
      case 'marketing':
        return '📢'
      case 'other':
        return '📊'
      default:
        return '🔍'
    }
  }

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Main Filter Controls */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center">
                <Filter className="mr-2 h-5 w-5" />
                Revenue Stream Filters
              </CardTitle>
              <CardDescription>
                Filter and drill down into revenue data across all business streams
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsExpanded(!isExpanded)}
              >
                <Settings className="h-4 w-4 mr-2" />
                {isExpanded ? 'Simple' : 'Advanced'}
              </Button>
              {activeFilters.length > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={clearAllFilters}
                >
                  <X className="h-4 w-4 mr-2" />
                  Clear All
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Primary Revenue Stream Selection */}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-5">
            {(['all', 'tours', 'dr-dish', 'marketing', 'other'] as const).map((stream) => (
              <Button
                key={stream}
                variant={currentRevenueStream === stream ? 'default' : 'outline'}
                onClick={() => handleRevenueStreamChange(stream)}
                className="flex items-center justify-center gap-2"
              >
                <span className="text-lg">{getRevenueStreamIcon(stream)}</span>
                <span className="capitalize">{stream === 'all' ? 'All Streams' : stream.replace('-', ' ')}</span>
              </Button>
            ))}
          </div>

          {/* Search Bar */}
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <Input
                  placeholder="Search customers, invoices, products..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
            <Button variant="outline" onClick={() => setSearchTerm('')}>
              <X className="h-4 w-4" />
            </Button>
          </div>

          {/* Advanced Filters */}
          {isExpanded && (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3 lg:grid-cols-4">
              {defaultFilters.slice(1).map((filter) => (
                <div key={filter.id}>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {filter.label}
                  </label>
                  {filter.type === 'select' && filter.options ? (
                    <select
                      value={customFilters[filter.id] || filter.value}
                      onChange={(e) => addFilter(filter.id, e.target.value)}
                      className="w-full rounded-md border-gray-300 text-sm"
                    >
                      {filter.options.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  ) : filter.type === 'number' ? (
                    <Input
                      type="number"
                      placeholder={filter.placeholder}
                      value={customFilters[filter.id] || ''}
                      onChange={(e) => addFilter(filter.id, e.target.value)}
                      min={filter.min}
                      max={filter.max}
                      className="text-sm"
                    />
                  ) : filter.type === 'date' ? (
                    <Input
                      type="date"
                      value={customFilters[filter.id] || ''}
                      onChange={(e) => addFilter(filter.id, e.target.value)}
                      className="text-sm"
                    />
                  ) : (
                    <Input
                      placeholder={filter.placeholder}
                      value={customFilters[filter.id] || ''}
                      onChange={(e) => addFilter(filter.id, e.target.value)}
                      className="text-sm"
                    />
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Active Filters Display */}
          {activeFilters.length > 0 && (
            <div className="flex flex-wrap gap-2">
              <span className="text-sm font-medium text-gray-700">Active Filters:</span>
              {activeFilters.map((filter) => (
                <Badge
                  key={filter.id}
                  variant="secondary"
                  className="flex items-center gap-1"
                >
                  {filter.label}: {filter.displayValue}
                  <button
                    onClick={() => removeFilter(filter.id)}
                    className="ml-1 hover:bg-gray-300 rounded-full p-0.5"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Drill-Down Navigation */}
      {showDrillDown && drillDownPath.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Eye className="mr-2 h-5 w-5" />
              Drill-Down Navigation
            </CardTitle>
            <CardDescription>
              Navigate through different levels of detail
            </CardDescription>
          </CardHeader>
          <CardContent>
            {/* Breadcrumb Navigation */}
            <div className="flex items-center gap-2 mb-4">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setDrillDownPath([])}
                className="flex items-center gap-1"
              >
                <BarChart3 className="h-3 w-3" />
                Overview
              </Button>
              {drillDownPath.map((level, index) => (
                <div key={index} className="flex items-center gap-2">
                  <span className="text-gray-400">/</span>
                  <Button
                    variant={index === drillDownPath.length - 1 ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => navigateToDrillDownLevel(index + 1)}
                  >
                    {level.title}
                  </Button>
                </div>
              ))}
            </div>

            {/* Current Drill-Down Level Info */}
            {drillDownPath.length > 0 && (
              <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                {drillDownPath.map((level, index) => (
                  <div key={index} className="p-3 border rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="text-sm font-medium">Level {level.level}</h4>
                      <Badge variant="outline">
                        {level.dataCount} records
                      </Badge>
                    </div>
                    <p className="text-xs text-gray-600 mb-2">{level.description}</p>
                    <p className="text-sm font-medium">{formatCurrency(level.totalValue)}</p>
                    
                    {level.filters.length > 0 && (
                      <div className="mt-2 space-y-1">
                        {level.filters.map((filter, filterIndex) => (
                          <div key={filterIndex} className="text-xs text-gray-500">
                            {filter.label}: {filter.displayValue}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Quick Drill-Down Options */}
      {showDrillDown && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Target className="mr-2 h-5 w-5" />
              Quick Drill-Down Options
            </CardTitle>
            <CardDescription>
              Common analysis views and drill-down patterns
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-4">
              {/* Top Customers Drill-Down */}
              <Button
                variant="outline"
                className="flex items-center justify-start p-4 h-auto"
                onClick={() => handleDrillDown({
                  title: 'Top Customers',
                  description: 'Revenue analysis by top performing customers',
                  filters: [
                    { id: 'sort', label: 'Sort', value: 'revenue_desc', displayValue: 'Revenue (High to Low)' },
                    { id: 'limit', label: 'Limit', value: '10', displayValue: 'Top 10' },
                  ],
                  dataCount: 10,
                  totalValue: 450000,
                })}
              >
                <div className="text-left">
                  <div className="flex items-center gap-2 mb-1">
                    <Users className="h-4 w-4" />
                    <span className="text-sm font-medium">Top Customers</span>
                  </div>
                  <p className="text-xs text-gray-500">By revenue performance</p>
                </div>
              </Button>

              {/* Overdue Analysis */}
              <Button
                variant="outline"
                className="flex items-center justify-start p-4 h-auto"
                onClick={() => handleDrillDown({
                  title: 'Overdue Analysis',
                  description: 'Outstanding invoices requiring attention',
                  filters: [
                    { id: 'status', label: 'Status', value: 'overdue', displayValue: 'Overdue Only' },
                    { id: 'sort', label: 'Sort', value: 'days_past_due_desc', displayValue: 'Days Past Due (High to Low)' },
                  ],
                  dataCount: 8,
                  totalValue: 85000,
                })}
              >
                <div className="text-left">
                  <div className="flex items-center gap-2 mb-1">
                    <AlertTriangle className="h-4 w-4" />
                    <span className="text-sm font-medium">Overdue Analysis</span>
                  </div>
                  <p className="text-xs text-gray-500">Payment collection focus</p>
                </div>
              </Button>

              {/* Seasonal Trends */}
              <Button
                variant="outline"
                className="flex items-center justify-start p-4 h-auto"
                onClick={() => handleDrillDown({
                  title: 'Seasonal Trends',
                  description: 'Revenue patterns by season and month',
                  filters: [
                    { id: 'group_by', label: 'Group By', value: 'month', displayValue: 'Monthly' },
                    { id: 'comparison', label: 'Comparison', value: 'prior_year', displayValue: 'vs Prior Year' },
                  ],
                  dataCount: 12,
                  totalValue: 750000,
                })}
              >
                <div className="text-left">
                  <div className="flex items-center gap-2 mb-1">
                    <Calendar className="h-4 w-4" />
                    <span className="text-sm font-medium">Seasonal Trends</span>
                  </div>
                  <p className="text-xs text-gray-500">Time-based analysis</p>
                </div>
              </Button>

              {/* Product Performance */}
              <Button
                variant="outline"
                className="flex items-center justify-start p-4 h-auto"
                onClick={() => handleDrillDown({
                  title: 'Product Performance',
                  description: 'Revenue and margin analysis by product/service',
                  filters: [
                    { id: 'group_by', label: 'Group By', value: 'product', displayValue: 'Product/Service' },
                    { id: 'metric', label: 'Metric', value: 'margin', displayValue: 'Gross Margin' },
                  ],
                  dataCount: 25,
                  totalValue: 650000,
                })}
              >
                <div className="text-left">
                  <div className="flex items-center gap-2 mb-1">
                    <BarChart3 className="h-4 w-4" />
                    <span className="text-sm font-medium">Product Performance</span>
                  </div>
                  <p className="text-xs text-gray-500">Product/service analysis</p>
                </div>
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Filter Summary and Quick Stats */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <BarChart3 className="mr-2 h-5 w-5" />
            Filtered Results Summary
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
            {/* Current Selection */}
            <div className="text-center p-3 border rounded-lg">
              <div className="flex items-center justify-center gap-2 mb-2">
                <span className="text-lg">{getRevenueStreamIcon(currentRevenueStream)}</span>
                <Badge className={getRevenueStreamColor(currentRevenueStream)}>
                  {currentRevenueStream === 'all' ? 'All Streams' : currentRevenueStream.replace('-', ' ')}
                </Badge>
              </div>
              <p className="text-sm text-gray-600">Current Selection</p>
            </div>

            {/* Sample metrics - would be calculated based on actual filters */}
            <div className="text-center p-3 border rounded-lg">
              <p className="text-2xl font-bold">127</p>
              <p className="text-sm text-gray-600">Records Found</p>
              <Badge variant="outline" className="mt-1">
                {activeFilters.length} filters
              </Badge>
            </div>

            <div className="text-center p-3 border rounded-lg">
              <p className="text-2xl font-bold">{formatCurrency(485000)}</p>
              <p className="text-sm text-gray-600">Total Value</p>
              <div className="flex items-center justify-center gap-1 mt-1">
                <TrendingUp className="h-3 w-3 text-green-500" />
                <span className="text-xs text-green-600">+12.5%</span>
              </div>
            </div>

            <div className="text-center p-3 border rounded-lg">
              <p className="text-2xl font-bold">94.2%</p>
              <p className="text-sm text-gray-600">Avg Margin</p>
              <div className="flex items-center justify-center gap-1 mt-1">
                <Target className="h-3 w-3 text-blue-500" />
                <span className="text-xs text-blue-600">Above target</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Export and Action Options */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Download className="mr-2 h-5 w-5" />
            Export & Actions
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <Button variant="outline" className="flex items-center justify-center">
              <Download className="mr-2 h-4 w-4" />
              Export CSV
            </Button>
            <Button variant="outline" className="flex items-center justify-center">
              <FileText className="mr-2 h-4 w-4" />
              Export PDF Report
            </Button>
            <Button variant="outline" className="flex items-center justify-center">
              <Eye className="mr-2 h-4 w-4" />
              Detailed Analysis
            </Button>
            <Button variant="outline" className="flex items-center justify-center">
              <Settings className="mr-2 h-4 w-4" />
              Save Filter Set
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Saved Filter Sets */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Settings className="mr-2 h-5 w-5" />
            Saved Filter Sets
          </CardTitle>
          <CardDescription>
            Quickly apply commonly used filter combinations
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-4">
            {/* Predefined filter sets */}
            <Button
              variant="outline"
              className="flex items-center justify-start p-3 h-auto"
              onClick={() => {
                handleRevenueStreamChange('tours')
                addFilter('payment_status', 'overdue', 'Overdue')
                addFilter('date_range', 'current_fy', 'Current FY')
              }}
            >
              <div className="text-left">
                <p className="text-sm font-medium">Tours - Overdue Focus</p>
                <p className="text-xs text-gray-500">Tours revenue stream, overdue payments</p>
              </div>
            </Button>

            <Button
              variant="outline"
              className="flex items-center justify-start p-3 h-auto"
              onClick={() => {
                handleRevenueStreamChange('dr-dish')
                addFilter('customer_segment', 'enterprise', 'Enterprise')
                addFilter('amount_min', '10000', '$10,000+')
              }}
            >
              <div className="text-left">
                <p className="text-sm font-medium">Dr Dish - Enterprise</p>
                <p className="text-xs text-gray-500">High-value enterprise customers</p>
              </div>
            </Button>

            <Button
              variant="outline"
              className="flex items-center justify-start p-3 h-auto"
              onClick={() => {
                handleRevenueStreamChange('marketing')
                addFilter('payment_status', 'outstanding', 'Outstanding')
                addFilter('date_range', 'last_90_days', 'Last 90 Days')
              }}
            >
              <div className="text-left">
                <p className="text-sm font-medium">Marketing - Recent Outstanding</p>
                <p className="text-xs text-gray-500">Recent marketing invoices outstanding</p>
              </div>
            </Button>

            <Button
              variant="outline"
              className="flex items-center justify-start p-3 h-auto"
              onClick={() => {
                handleRevenueStreamChange('all')
                addFilter('amount_min', '5000', '$5,000+')
                addFilter('payment_status', 'paid', 'Paid')
              }}
            >
              <div className="text-left">
                <p className="text-sm font-medium">High-Value Paid</p>
                <p className="text-xs text-gray-500">All streams, high-value, paid invoices</p>
              </div>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Filter Performance Insights */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Activity className="mr-2 h-5 w-5" />
            Filter Insights
          </CardTitle>
          <CardDescription>
            Key insights based on current filter selection
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            {/* Revenue Distribution */}
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-center mb-2">
                <DollarSign className="mr-2 h-4 w-4 text-blue-600" />
                <h4 className="text-sm font-medium text-blue-800">Revenue Distribution</h4>
              </div>
              <p className="text-xs text-blue-700">
                {currentRevenueStream === 'all' ? 
                  'All revenue streams included. Tours represents 65% of total revenue.' :
                  `Focused on ${currentRevenueStream} revenue stream. ${
                    currentRevenueStream === 'tours' ? 'Peak season Sep-Nov.' :
                    currentRevenueStream === 'dr-dish' ? 'Inventory-based business model.' :
                    currentRevenueStream === 'marketing' ? 'Rebel Sport is primary client.' : 
                    'Miscellaneous revenue sources.'
                  }`
                }
              </p>
            </div>

            {/* Payment Performance */}
            <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
              <div className="flex items-center mb-2">
                <CheckCircle className="mr-2 h-4 w-4 text-green-600" />
                <h4 className="text-sm font-medium text-green-800">Payment Performance</h4>
              </div>
              <p className="text-xs text-green-700">
                {currentRevenueStream === 'tours' ? 
                  'Tours customers typically pay within 15 days. Excellent payment velocity.' :
                  currentRevenueStream === 'dr-dish' ? 
                  'Dr Dish customers require 30-45 days. Larger transaction amounts.' :
                  currentRevenueStream === 'marketing' ?
                  'Marketing clients average 28 days. Rebel Sport consistently on-time.' :
                  'Mixed payment patterns across revenue streams.'
                }
              </p>
            </div>

            {/* Risk Assessment */}
            <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <div className="flex items-center mb-2">
                <AlertTriangle className="mr-2 h-4 w-4 text-yellow-600" />
                <h4 className="text-sm font-medium text-yellow-800">Risk Assessment</h4>
              </div>
              <p className="text-xs text-yellow-700">
                {activeFilters.some(f => f.value === 'overdue') ?
                  'Overdue filter active. Focus on collection activities and customer communication.' :
                  activeFilters.some(f => f.id === 'amount_min') ?
                  'High-value filter active. Monitor large transactions closely for cash flow impact.' :
                  'Current selection shows balanced risk profile across revenue streams.'
                }
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

