'use client'

import { useState } from 'react'
import { MetricTile } from '@/components/ui/metric-tile'
import { DashboardCard } from '@/components/ui/dashboard-card'
import { DataTable } from '@/components/ui/data-table'
import { DatePicker } from '@/components/ui/date-picker'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

export default function Home() {
  const [selectedDate, setSelectedDate] = useState<Date>()

  // Sample data for the data table
  const sampleColumns = [
    {
      key: 'customer',
      title: 'Customer',
      sortable: true,
      type: 'text' as const,
    },
    { key: 'invoice', title: 'Invoice', sortable: true, type: 'text' as const },
    {
      key: 'amount',
      title: 'Amount',
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
    { key: 'status', title: 'Status', type: 'status' as const },
    {
      key: 'daysPastDue',
      title: 'Days Past Due',
      sortable: true,
      type: 'number' as const,
      align: 'right' as const,
    },
  ]

  const sampleData = [
    {
      customer: 'Melbourne Basketball Academy',
      invoice: 'INV-2024-001',
      amount: 15600,
      dueDate: new Date('2024-09-15'),
      status: 'overdue',
      daysPastDue: 12,
    },
    {
      customer: 'Sydney Sports Tours',
      invoice: 'INV-2024-002',
      amount: 28950,
      dueDate: new Date('2024-10-01'),
      status: 'due',
      daysPastDue: 0,
    },
    {
      customer: 'Adelaide Basketball Club',
      invoice: 'INV-2024-003',
      amount: 8750,
      dueDate: new Date('2024-08-30'),
      status: 'paid',
      daysPastDue: 0,
    },
    {
      customer: 'Perth Youth League',
      invoice: 'INV-2024-004',
      amount: 12300,
      dueDate: new Date('2024-09-20'),
      status: 'draft',
      daysPastDue: 0,
    },
  ]

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="mb-2 text-3xl font-bold text-gray-900">
            AUSA Finance Dashboard
          </h1>
          <p className="mb-4 text-lg text-gray-600">
            Australian Financial Year Reporting & Analytics
          </p>
          <div className="flex items-center gap-4">
            <DatePicker
              date={selectedDate}
              onDateChange={setSelectedDate}
              placeholder="Select reporting period"
            />
            <Badge variant="outline" className="text-xs">
              FY 2024-25 • Week 12
            </Badge>
          </div>
        </div>

        {/* KPI Metrics */}
        <div className="mb-8 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
          <MetricTile
            title="Cash Position"
            value={284295}
            currency
            change={{
              value: '+15.2%',
              type: 'positive',
              label: 'from last month',
            }}
          />

          <MetricTile
            title="YTD Revenue"
            value={302053}
            currency
            change={{
              value: '+8.4%',
              type: 'positive',
              label: 'vs last FY',
            }}
          />

          <MetricTile
            title="Outstanding AR"
            value={45280}
            currency
            change={{
              value: '12 days',
              type: 'neutral',
              label: 'average DSO',
            }}
          />

          <MetricTile
            title="Gross Margin"
            value="94.1%"
            change={{
              value: '+2.3%',
              type: 'positive',
              label: 'vs target',
            }}
          />
        </div>

        {/* Dashboard Cards */}
        <div className="mb-8 grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* Revenue Breakdown */}
          <DashboardCard
            title="Revenue by Stream"
            description="YTD performance across business units"
            action={
              <Button variant="outline" size="sm">
                View Details
              </Button>
            }
          >
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="h-3 w-3 rounded-full bg-green-500"></div>
                  <span className="text-sm font-medium">Tours - AAU Tours</span>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium">A$266,963</p>
                  <p className="text-xs text-gray-500">88.4%</p>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="h-3 w-3 rounded-full bg-blue-500"></div>
                  <span className="text-sm font-medium">Dr Dish Sales</span>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium">A$16,682</p>
                  <p className="text-xs text-gray-500">5.5%</p>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="h-3 w-3 rounded-full bg-amber-500"></div>
                  <span className="text-sm font-medium">
                    Brand Partnerships
                  </span>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium">A$15,600</p>
                  <p className="text-xs text-gray-500">5.2%</p>
                </div>
              </div>
            </div>
          </DashboardCard>

          {/* Component Showcase */}
          <DashboardCard
            title="shadcn/ui Components"
            description="Dashboard-specific components ready for use"
          >
            <div className="space-y-4">
              <div className="flex flex-wrap gap-2">
                <Badge>Default</Badge>
                <Badge variant="secondary">Secondary</Badge>
                <Badge variant="outline">Outline</Badge>
                <Badge variant="destructive">Destructive</Badge>
              </div>

              <div className="flex gap-2">
                <Button size="sm">Primary</Button>
                <Button variant="outline" size="sm">
                  Outline
                </Button>
                <Button variant="ghost" size="sm">
                  Ghost
                </Button>
              </div>

              <div className="text-sm text-gray-600">
                <p>✅ MetricTile - KPI display with change indicators</p>
                <p>✅ DashboardCard - Flexible content containers</p>
                <p>
                  ✅ DataTable - Financial data tables with sorting & filtering
                </p>
                <p>✅ DatePicker - Australian FY date selection</p>
              </div>
            </div>
          </DashboardCard>
        </div>

        {/* Sample Data Table */}
        <DashboardCard
          title="Accounts Receivable"
          description="Outstanding customer invoices requiring attention"
          action={
            <Button variant="outline" size="sm">
              View All AR
            </Button>
          }
        >
          <DataTable
            columns={sampleColumns}
            data={sampleData}
            onRowClick={_row => {
              // Handle row click - could navigate to detail page
            }}
            onExport={() => {
              // Handle export - could download CSV
            }}
          />
        </DashboardCard>

        {/* Status */}
        <div className="mt-8 rounded-lg border bg-white p-6 text-center">
          <p className="mb-2 text-sm text-gray-600">
            ✅ Next.js 14 + TypeScript + Tailwind CSS + shadcn/ui
          </p>
          <p className="text-sm text-gray-600">
            🎨 Australian business theme with financial-specific components
            ready for dashboard implementation
          </p>
        </div>
      </div>
    </div>
  )
}
