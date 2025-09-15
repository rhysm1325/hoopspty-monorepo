// Financial constants for AUSA Finance Dashboard

import type { RevenueStream, UserRole } from '@/types'

// Australian Financial Year
export const AUSTRALIAN_FY_START_MONTH = 6 // July (0-indexed)
export const AUSTRALIAN_FY_START_DAY = 1

// Currency
export const DEFAULT_CURRENCY = 'AUD'
export const CURRENCY_SYMBOL = 'A$'

// Date formats
export const AU_DATE_FORMAT = 'dd/MM/yyyy'
export const AU_DATETIME_FORMAT = 'dd/MM/yyyy HH:mm'
export const ISO_DATE_FORMAT = 'yyyy-MM-dd'
export const TIMEZONE = 'Australia/Sydney'

// Revenue streams
export const REVENUE_STREAMS: Record<RevenueStream, string> = {
  tours: 'Tours',
  'dr-dish': 'Dr Dish Distribution',
  marketing: 'Marketing Revenue',
  other: 'Other Revenue',
} as const

export const REVENUE_STREAM_COLORS: Record<RevenueStream, string> = {
  tours: '#22c55e', // Green
  'dr-dish': '#3b82f6', // Blue
  marketing: '#f59e0b', // Amber
  other: '#6b7280', // Gray
} as const

// Aging buckets for AR/AP
export const AR_AGING_BUCKETS = [
  { label: 'Current', minDays: 0, maxDays: 30 },
  { label: '31-60 days', minDays: 31, maxDays: 60 },
  { label: '61-90 days', minDays: 61, maxDays: 90 },
  { label: '90+ days', minDays: 91 },
] as const

export const AP_AGING_BUCKETS = [
  { label: 'Current', minDays: 0, maxDays: 30 },
  { label: '31-60 days', minDays: 31, maxDays: 60 },
  { label: '61-90 days', minDays: 61, maxDays: 90 },
  { label: '90+ days', minDays: 91 },
] as const

// Alert thresholds
export const OVERDUE_CUSTOMER_THRESHOLD_DAYS = 45
export const OVERDUE_SUPPLIER_THRESHOLD_DAYS = 60
export const REVENUE_VARIANCE_THRESHOLD_PERCENT = 20

// Sync settings
export const SYNC_SCHEDULE_HOUR = 3 // 3:30 AM Sydney time
export const SYNC_SCHEDULE_MINUTE = 30
export const SYNC_BATCH_SIZE = 100
export const SYNC_RATE_LIMIT_DELAY_MS = 1000

// Data retention
export const AUDIT_LOG_RETENTION_DAYS = 365
export const SYNC_LOG_RETENTION_DAYS = 90
export const STAGING_DATA_RETENTION_DAYS = 30

// Performance settings
export const DASHBOARD_CACHE_TTL_MINUTES = 60
export const API_TIMEOUT_MS = 30000
export const MAX_EXPORT_RECORDS = 10000

// User role display names
export const USER_ROLE_LABELS: Record<UserRole, string> = {
  owner: 'Owner',
  finance: 'Finance',
  operations: 'Operations',
  sales: 'Sales (Dr Dish)',
  marketing: 'Marketing',
} as const

// Chart colors
export const CHART_COLORS = {
  primary: '#0ea5e9',
  success: '#22c55e',
  warning: '#f59e0b',
  danger: '#ef4444',
  neutral: '#6b7280',
  cash: '#0ea5e9',
  receivables: '#f59e0b',
  payables: '#ef4444',
} as const

// Number formatting
export const DECIMAL_PLACES = {
  currency: 2,
  percentage: 1,
  units: 0,
  rates: 2,
} as const

// Dashboard refresh intervals (in milliseconds)
export const REFRESH_INTERVALS = {
  realtime: 30000, // 30 seconds
  frequent: 300000, // 5 minutes
  normal: 1800000, // 30 minutes
  slow: 3600000, // 1 hour
} as const

// File export limits
export const EXPORT_LIMITS = {
  csv: 50000,
  excel: 100000,
  pdf: 1000,
} as const

// Validation rules
export const VALIDATION_RULES = {
  minPasswordLength: 8,
  maxPasswordLength: 128,
  maxFileSize: 10 * 1024 * 1024, // 10MB
  allowedFileTypes: ['csv', 'xlsx', 'pdf'],
} as const

// API endpoints (relative to base URL)
export const API_ENDPOINTS = {
  auth: {
    login: '/api/auth/login',
    logout: '/api/auth/logout',
    refresh: '/api/auth/refresh',
    invite: '/api/auth/invite',
  },
  sync: {
    manual: '/api/sync/manual',
    status: '/api/sync/status',
    logs: '/api/sync/logs',
  },
  dashboard: {
    executive: '/api/dashboard/executive',
    tours: '/api/dashboard/tours',
    drDish: '/api/dashboard/dr-dish',
    marketing: '/api/dashboard/marketing',
  },
  data: {
    ar: '/api/data/ar',
    ap: '/api/data/ap',
    export: '/api/data/export',
  },
  config: {
    mappings: '/api/config/mappings',
    settings: '/api/config/settings',
  },
} as const

// Error messages
export const ERROR_MESSAGES = {
  auth: {
    invalidCredentials: 'Invalid email or password',
    sessionExpired: 'Your session has expired. Please log in again.',
    insufficientPermissions:
      'You do not have permission to access this resource',
  },
  sync: {
    connectionFailed:
      'Unable to connect to Xero. Please check your connection.',
    syncInProgress: 'A sync is already in progress. Please wait.',
    syncFailed: 'Sync failed. Please try again or contact support.',
  },
  validation: {
    required: 'This field is required',
    invalidEmail: 'Please enter a valid email address',
    passwordTooShort: `Password must be at least ${VALIDATION_RULES.minPasswordLength} characters`,
    fileTooLarge: 'File size exceeds the maximum allowed limit',
    invalidFileType: 'File type not supported',
  },
  general: {
    networkError: 'Network error. Please check your connection and try again.',
    serverError: 'Server error. Please try again later.',
    notFound: 'The requested resource was not found',
  },
} as const
