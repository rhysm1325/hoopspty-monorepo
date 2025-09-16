// Authentication and user management types

export type UserRole =
  | 'owner'
  | 'finance'
  | 'operations'
  | 'sales'
  | 'marketing'

export interface User {
  id: string
  email: string
  firstName?: string
  lastName?: string
  role: UserRole
  isActive: boolean
  lastLoginAt?: Date
  createdAt: Date
  updatedAt: Date
}

export interface AuthSession {
  user: User
  accessToken: string
  refreshToken?: string
  expiresAt: Date
}

export interface LoginCredentials {
  email: string
  password: string
}

export interface InviteUserData {
  email: string
  role: UserRole
  firstName?: string
  lastName?: string
}

export interface PasswordResetData {
  email: string
  token: string
  newPassword: string
}

// Additional authentication types for enhanced functionality
export interface UserProfile {
  id: string
  userId: string
  firstName?: string
  lastName?: string
  role: UserRole
  isActive: boolean
  lastLoginAt?: Date
  invitedBy?: string
  invitedAt?: Date
  emailVerified: boolean
  createdAt: Date
  updatedAt: Date
}

export interface AuditLog {
  id: string
  userId: string
  action: AuditAction
  details?: Record<string, unknown>
  ipAddress?: string
  userAgent?: string
  timestamp: Date
}

export type AuditAction =
  | 'user_login'
  | 'user_logout'
  | 'user_invited'
  | 'user_activated'
  | 'user_deactivated'
  | 'role_changed'
  | 'settings_updated'
  | 'sync_initiated'
  | 'data_exported'
  | 'config_changed'

export interface SessionData {
  userId: string
  email: string
  role: UserRole
  isActive: boolean
  permissions: RolePermissions
  expiresAt: Date
}

export interface AuthError {
  code: string
  message: string
  details?: Record<string, unknown>
}

export interface AuthResult<T = unknown> {
  success: boolean
  data?: T
  error?: string
  user?: User | null
}

// Role hierarchy for permission inheritance
export const ROLE_HIERARCHY: Record<UserRole, number> = {
  owner: 5,
  finance: 4,
  operations: 3,
  sales: 3,
  marketing: 2,
} as const

// Role display information
export interface RoleInfo {
  label: string
  description: string
  color: string
  defaultDashboard: string
}

export const ROLE_INFO: Record<UserRole, RoleInfo> = {
  owner: {
    label: 'Owner',
    description: 'Full access to all financial data and system settings',
    color: 'purple',
    defaultDashboard: '/',
  },
  finance: {
    label: 'Finance',
    description: 'Complete financial data access and sync management',
    color: 'blue',
    defaultDashboard: '/',
  },
  operations: {
    label: 'Operations',
    description: 'Tours dashboard and customer receivables management',
    color: 'green',
    defaultDashboard: '/tours',
  },
  sales: {
    label: 'Sales (Dr Dish)',
    description: 'Distribution dashboard and machine customer management',
    color: 'orange',
    defaultDashboard: '/dr-dish',
  },
  marketing: {
    label: 'Marketing',
    description: 'Marketing revenue dashboard and client tracking',
    color: 'pink',
    defaultDashboard: '/marketing',
  },
} as const

// Role-based permissions
export interface RolePermissions {
  canViewExecutiveDashboard: boolean
  canViewToursDashboard: boolean
  canViewDrDishDashboard: boolean
  canViewMarketingDashboard: boolean
  canViewARDetails: boolean
  canViewAPDetails: boolean
  canAccessSettings: boolean
  canManageUsers: boolean
  canRunSync: boolean
  canExportData: boolean
  canViewAuditLogs: boolean
}

export const ROLE_PERMISSIONS: Record<UserRole, RolePermissions> = {
  owner: {
    canViewExecutiveDashboard: true,
    canViewToursDashboard: true,
    canViewDrDishDashboard: true,
    canViewMarketingDashboard: true,
    canViewARDetails: true,
    canViewAPDetails: true,
    canAccessSettings: true,
    canManageUsers: true,
    canRunSync: true,
    canExportData: true,
    canViewAuditLogs: true,
  },
  finance: {
    canViewExecutiveDashboard: true,
    canViewToursDashboard: true,
    canViewDrDishDashboard: true,
    canViewMarketingDashboard: true,
    canViewARDetails: true,
    canViewAPDetails: true,
    canAccessSettings: true,
    canManageUsers: false,
    canRunSync: true,
    canExportData: true,
    canViewAuditLogs: true,
  },
  operations: {
    canViewExecutiveDashboard: false,
    canViewToursDashboard: true,
    canViewDrDishDashboard: false,
    canViewMarketingDashboard: false,
    canViewARDetails: true, // Only for tours customers
    canViewAPDetails: false,
    canAccessSettings: false,
    canManageUsers: false,
    canRunSync: false,
    canExportData: true,
    canViewAuditLogs: false,
  },
  sales: {
    canViewExecutiveDashboard: false,
    canViewToursDashboard: false,
    canViewDrDishDashboard: true,
    canViewMarketingDashboard: false,
    canViewARDetails: true, // Only for Dr Dish customers
    canViewAPDetails: false,
    canAccessSettings: false,
    canManageUsers: false,
    canRunSync: false,
    canExportData: true,
    canViewAuditLogs: false,
  },
  marketing: {
    canViewExecutiveDashboard: false,
    canViewToursDashboard: false,
    canViewDrDishDashboard: false,
    canViewMarketingDashboard: true,
    canViewARDetails: false,
    canViewAPDetails: false,
    canAccessSettings: false,
    canManageUsers: false,
    canRunSync: false,
    canExportData: true,
    canViewAuditLogs: false,
  },
}
