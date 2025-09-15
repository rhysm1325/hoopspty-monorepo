// Financial data types for AUSA Finance Dashboard

export type RevenueStream = 'tours' | 'dr-dish' | 'marketing' | 'other'

export type CurrencyCode = 'AUD'

export type GSTMethod = 'accrual' | 'cash'

// Core financial entities
export interface Money {
  amount: number
  currency: CurrencyCode
}

export interface DateRange {
  startDate: Date
  endDate: Date
}

// Australian Financial Year utilities
export interface FinancialYear {
  year: number // e.g., 2024 for FY 2024-25
  startDate: Date // July 1
  endDate: Date // June 30
  label: string // "FY 2024-25"
}

// Accounts Receivable
export interface ARRecord {
  id: string
  customerId: string
  customerName: string
  invoiceNumber: string
  invoiceDate: Date
  dueDate: Date
  originalAmount: Money
  paidAmount: Money
  outstandingAmount: Money
  daysPastDue: number
  status: 'current' | 'overdue' | 'paid'
  revenueStream: RevenueStream
  contact?: ContactInfo
}

// Accounts Payable
export interface APRecord {
  id: string
  supplierId: string
  supplierName: string
  billNumber: string
  billDate: Date
  dueDate: Date
  originalAmount: Money
  paidAmount: Money
  outstandingAmount: Money
  daysPastDue: number
  status: 'current' | 'overdue' | 'paid'
  contact?: ContactInfo
}

// Contact information
export interface ContactInfo {
  name: string
  email?: string
  phone?: string
  address?: string
}

// Aging buckets for AR/AP
export interface AgingBucket {
  label: string
  minDays: number
  maxDays?: number
  amount: Money
  count: number
  percentage: number
}

export interface AgingReport {
  totalAmount: Money
  totalCount: number
  buckets: AgingBucket[]
  asOfDate: Date
}

// Revenue and profitability
export interface RevenueData {
  period: DateRange
  revenueStream: RevenueStream
  grossRevenue: Money
  netRevenue: Money
  cogs?: Money
  grossMargin?: Money
  grossMarginPercent?: number
}

// Key Performance Indicators
export interface KPIData {
  label: string
  value: string | number
  previousValue?: string | number
  change?: {
    amount: string | number
    percentage: number
    direction: 'up' | 'down' | 'neutral'
  }
  format: 'currency' | 'percentage' | 'number' | 'days' | 'text'
  currency?: CurrencyCode
}

// Cash flow
export interface CashFlowData {
  date: Date
  openingBalance: Money
  receipts: Money
  payments: Money
  closingBalance: Money
  netCashFlow: Money
}

// Dr Dish specific types
export interface DrDishInventoryItem {
  itemCode: string
  itemName: string
  quantityOnHand: number
  averageCost: Money
  totalValue: Money
  reorderLevel?: number
  lastPurchaseDate?: Date
  lastSaleDate?: Date
}

export interface DrDishSalesData {
  period: DateRange
  itemCode: string
  itemName: string
  unitsSold: number
  totalRevenue: Money
  averageSellingPrice: Money
  cogs: Money
  grossMargin: Money
  grossMarginPercent: number
}

// Tours specific types
export interface ToursRevenueData {
  period: DateRange
  tourType: string
  bookingsReceived: number
  recognizedRevenue: Money
  deferredRevenue?: Money
  refunds: Money
  netRevenue: Money
  directCosts: Money
  grossMargin: Money
}

// Marketing specific types
export interface MarketingRevenueData {
  period: DateRange
  clientName: string
  invoicesIssued: Money
  paymentsReceived: Money
  outstandingAmount: Money
  nextExpectedPayment?: {
    amount: Money
    date: Date
  }
}

// Dashboard filters
export interface DashboardFilters {
  dateRange: DateRange
  revenueStream?: RevenueStream
  gstMethod: GSTMethod
  comparisonPeriod?: DateRange
}

// Sync and data management
export interface SyncStatus {
  lastSyncDate?: Date
  isRunning: boolean
  progress?: number
  errors?: string[]
  recordsProcessed?: number
  recordsTotal?: number
}

export interface DataValidationError {
  field: string
  message: string
  value?: unknown
  severity: 'error' | 'warning'
}
