// Re-export all types from a central location for cleaner imports

export type * from './auth'
export type * from './financial'
export type * from './xero'

// Common utility types
export type Optional<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>
export type Required<T, K extends keyof T> = T & Required<Pick<T, K>>
export type Nullable<T> = T | null
export type Maybe<T> = T | undefined | null

// API response types
export interface ApiResponse<T = unknown> {
  success: boolean
  data?: T
  error?: string
  message?: string
}

export interface PaginatedResponse<T = unknown> {
  data: T[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
    hasNext: boolean
    hasPrevious: boolean
  }
}

// Form types
export interface FormError {
  field: string
  message: string
}

export interface FormState<T = unknown> {
  data: T
  errors: FormError[]
  isSubmitting: boolean
  isValid: boolean
}

// Table types for data grids
export interface TableColumn<T = unknown> {
  key: keyof T
  title: string
  sortable?: boolean
  filterable?: boolean
  width?: string | number
  align?: 'left' | 'center' | 'right'
  render?: (value: T[keyof T], row: T) => React.ReactNode
}

export interface TableProps<T = unknown> {
  data: T[]
  columns: TableColumn<T>[]
  loading?: boolean
  onRowClick?: (row: T) => void
  onSort?: (column: keyof T, direction: 'asc' | 'desc') => void
  onFilter?: (filters: Record<keyof T, unknown>) => void
}

// Chart types
export interface ChartDataPoint {
  label: string
  value: number
  color?: string
  metadata?: Record<string, unknown>
}

export interface ChartProps {
  data: ChartDataPoint[]
  title?: string
  width?: number
  height?: number
  showLegend?: boolean
  showTooltip?: boolean
}
