// Role management utilities for AUSA Finance Dashboard

import {
  type UserRole,
  type RolePermissions,
  type RoleInfo,
  ROLE_PERMISSIONS,
  ROLE_INFO,
  ROLE_HIERARCHY,
} from '@/types/auth'

/**
 * Get permissions for a specific role
 */
export function getRolePermissions(role: UserRole): RolePermissions {
  return ROLE_PERMISSIONS[role]
}

/**
 * Get display information for a specific role
 */
export function getRoleInfo(role: UserRole): RoleInfo {
  return ROLE_INFO[role]
}

/**
 * Get all available roles with their information
 */
export function getAllRoles(): Array<{
  role: UserRole
  info: RoleInfo
  permissions: RolePermissions
}> {
  return Object.entries(ROLE_INFO).map(([role, info]) => ({
    role: role as UserRole,
    info,
    permissions: ROLE_PERMISSIONS[role as UserRole],
  }))
}

/**
 * Check if a role has a specific permission
 */
export function roleHasPermission(
  role: UserRole,
  permission: keyof RolePermissions
): boolean {
  return ROLE_PERMISSIONS[role][permission]
}

/**
 * Check if a role is higher in hierarchy than another role
 */
export function isHigherRole(role1: UserRole, role2: UserRole): boolean {
  return ROLE_HIERARCHY[role1] > ROLE_HIERARCHY[role2]
}

/**
 * Check if a role can manage another role
 */
export function canManageRole(
  managerRole: UserRole,
  targetRole: UserRole
): boolean {
  // Owner can manage all roles
  if (managerRole === 'owner') return true

  // Finance can manage operations, sales, marketing (but not owner)
  if (managerRole === 'finance') {
    return ['operations', 'sales', 'marketing'].includes(targetRole)
  }

  // Other roles cannot manage users
  return false
}

/**
 * Get roles that a user can invite/manage
 */
export function getManageableRoles(managerRole: UserRole): UserRole[] {
  if (managerRole === 'owner') {
    return ['owner', 'finance', 'operations', 'sales', 'marketing']
  }

  if (managerRole === 'finance') {
    return ['operations', 'sales', 'marketing']
  }

  return []
}

/**
 * Get the default dashboard path for a role
 */
export function getDefaultDashboard(role: UserRole): string {
  return ROLE_INFO[role].defaultDashboard
}

/**
 * Check if a role can access a specific dashboard
 */
export function canAccessDashboard(role: UserRole, dashboard: string): boolean {
  const permissions = ROLE_PERMISSIONS[role]

  switch (dashboard) {
    case '/':
    case '/dashboard':
      return permissions.canViewExecutiveDashboard
    case '/tours':
      return permissions.canViewToursDashboard
    case '/dr-dish':
      return permissions.canViewDrDishDashboard
    case '/marketing':
      return permissions.canViewMarketingDashboard
    case '/ar':
      return permissions.canViewARDetails
    case '/ap':
      return permissions.canViewAPDetails
    case '/settings':
      return permissions.canAccessSettings
    case '/sync':
      return permissions.canRunSync
    default:
      return false
  }
}

/**
 * Get allowed dashboards for a role
 */
export function getAllowedDashboards(
  role: UserRole
): Array<{ path: string; label: string }> {
  const permissions = ROLE_PERMISSIONS[role]
  const dashboards: Array<{ path: string; label: string }> = []

  if (permissions.canViewExecutiveDashboard) {
    dashboards.push({ path: '/', label: 'Executive Dashboard' })
  }

  if (permissions.canViewToursDashboard) {
    dashboards.push({ path: '/tours', label: 'Tours' })
  }

  if (permissions.canViewDrDishDashboard) {
    dashboards.push({ path: '/dr-dish', label: 'Dr Dish Distribution' })
  }

  if (permissions.canViewMarketingDashboard) {
    dashboards.push({ path: '/marketing', label: 'Marketing Revenue' })
  }

  if (permissions.canViewARDetails) {
    dashboards.push({ path: '/ar', label: 'Accounts Receivable' })
  }

  if (permissions.canViewAPDetails) {
    dashboards.push({ path: '/ap', label: 'Accounts Payable' })
  }

  if (permissions.canAccessSettings) {
    dashboards.push({ path: '/settings', label: 'Settings' })
  }

  if (permissions.canRunSync) {
    dashboards.push({ path: '/sync', label: 'Data Sync' })
  }

  return dashboards
}

/**
 * Validate role assignment
 */
export function validateRoleAssignment(
  assignerRole: UserRole,
  targetRole: UserRole
): { isValid: boolean; error?: string } {
  if (!canManageRole(assignerRole, targetRole)) {
    return {
      isValid: false,
      error: `${ROLE_INFO[assignerRole].label} cannot assign ${ROLE_INFO[targetRole].label} role`,
    }
  }

  return { isValid: true }
}

/**
 * Get role badge color for UI display
 */
export function getRoleBadgeVariant(
  role: UserRole
): 'default' | 'secondary' | 'destructive' | 'outline' {
  switch (role) {
    case 'owner':
      return 'default' // Purple/primary
    case 'finance':
      return 'secondary' // Blue
    case 'operations':
      return 'outline' // Green
    case 'sales':
      return 'outline' // Orange
    case 'marketing':
      return 'outline' // Pink
    default:
      return 'secondary'
  }
}

/**
 * Format role display name with description
 */
export function formatRoleDisplay(
  role: UserRole,
  includeDescription: boolean = false
): string {
  const info = ROLE_INFO[role]
  return includeDescription ? `${info.label} - ${info.description}` : info.label
}

/**
 * Check if role requires elevated security
 */
export function requiresElevatedSecurity(role: UserRole): boolean {
  return ['owner', 'finance'].includes(role)
}

/**
 * Get audit actions available for a role
 */
export function getAuditActionsForRole(role: UserRole): string[] {
  const permissions = ROLE_PERMISSIONS[role]
  const actions: string[] = ['user_login', 'user_logout']

  if (permissions.canManageUsers) {
    actions.push(
      'user_invited',
      'user_activated',
      'user_deactivated',
      'role_changed'
    )
  }

  if (permissions.canAccessSettings) {
    actions.push('settings_updated', 'config_changed')
  }

  if (permissions.canRunSync) {
    actions.push('sync_initiated')
  }

  if (permissions.canExportData) {
    actions.push('data_exported')
  }

  return actions
}
