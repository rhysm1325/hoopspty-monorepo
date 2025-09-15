// Tests for role management utilities

import {
  getRolePermissions,
  getRoleInfo,
  getAllRoles,
  roleHasPermission,
  isHigherRole,
  canManageRole,
  getManageableRoles,
  getDefaultDashboard,
  canAccessDashboard,
  getAllowedDashboards,
} from '@/lib/auth/roles'
import type { UserRole } from '@/types'

describe('Role Management Utilities', () => {
  describe('getRolePermissions', () => {
    test('should return correct permissions for owner', () => {
      const permissions = getRolePermissions('owner')
      expect(permissions.canViewExecutiveDashboard).toBe(true)
      expect(permissions.canManageUsers).toBe(true)
      expect(permissions.canAccessSettings).toBe(true)
      expect(permissions.canRunSync).toBe(true)
    })

    test('should return correct permissions for operations', () => {
      const permissions = getRolePermissions('operations')
      expect(permissions.canViewExecutiveDashboard).toBe(false)
      expect(permissions.canViewToursDashboard).toBe(true)
      expect(permissions.canViewDrDishDashboard).toBe(false)
      expect(permissions.canManageUsers).toBe(false)
      expect(permissions.canAccessSettings).toBe(false)
    })

    test('should return correct permissions for marketing', () => {
      const permissions = getRolePermissions('marketing')
      expect(permissions.canViewMarketingDashboard).toBe(true)
      expect(permissions.canViewToursDashboard).toBe(false)
      expect(permissions.canViewDrDishDashboard).toBe(false)
      expect(permissions.canViewExecutiveDashboard).toBe(false)
      expect(permissions.canExportData).toBe(true)
    })
  })

  describe('getRoleInfo', () => {
    test('should return correct display information for all roles', () => {
      const ownerInfo = getRoleInfo('owner')
      expect(ownerInfo.label).toBe('Owner')
      expect(ownerInfo.defaultDashboard).toBe('/')
      expect(ownerInfo.description).toContain('Full access')

      const operationsInfo = getRoleInfo('operations')
      expect(operationsInfo.label).toBe('Operations')
      expect(operationsInfo.defaultDashboard).toBe('/tours')
      expect(operationsInfo.description).toContain('Tours')
    })
  })

  describe('roleHasPermission', () => {
    test('should correctly check specific permissions', () => {
      expect(roleHasPermission('owner', 'canManageUsers')).toBe(true)
      expect(roleHasPermission('finance', 'canManageUsers')).toBe(false)
      expect(roleHasPermission('operations', 'canViewToursDashboard')).toBe(
        true
      )
      expect(roleHasPermission('sales', 'canViewToursDashboard')).toBe(false)
    })
  })

  describe('isHigherRole', () => {
    test('should correctly compare role hierarchy', () => {
      expect(isHigherRole('owner', 'finance')).toBe(true)
      expect(isHigherRole('finance', 'operations')).toBe(true)
      expect(isHigherRole('operations', 'marketing')).toBe(true)
      expect(isHigherRole('sales', 'marketing')).toBe(true)
      expect(isHigherRole('marketing', 'owner')).toBe(false)
    })

    test('should handle equal roles', () => {
      expect(isHigherRole('operations', 'sales')).toBe(false)
      expect(isHigherRole('sales', 'operations')).toBe(false)
    })
  })

  describe('canManageRole', () => {
    test('owner can manage all roles', () => {
      const roles: UserRole[] = [
        'owner',
        'finance',
        'operations',
        'sales',
        'marketing',
      ]
      roles.forEach(role => {
        expect(canManageRole('owner', role)).toBe(true)
      })
    })

    test('finance can manage operations, sales, marketing but not owner', () => {
      expect(canManageRole('finance', 'operations')).toBe(true)
      expect(canManageRole('finance', 'sales')).toBe(true)
      expect(canManageRole('finance', 'marketing')).toBe(true)
      expect(canManageRole('finance', 'owner')).toBe(false)
      expect(canManageRole('finance', 'finance')).toBe(false)
    })

    test('operations cannot manage any roles', () => {
      const roles: UserRole[] = [
        'owner',
        'finance',
        'operations',
        'sales',
        'marketing',
      ]
      roles.forEach(role => {
        expect(canManageRole('operations', role)).toBe(false)
      })
    })
  })

  describe('getManageableRoles', () => {
    test('should return correct manageable roles for each role', () => {
      expect(getManageableRoles('owner')).toEqual([
        'owner',
        'finance',
        'operations',
        'sales',
        'marketing',
      ])
      expect(getManageableRoles('finance')).toEqual([
        'operations',
        'sales',
        'marketing',
      ])
      expect(getManageableRoles('operations')).toEqual([])
      expect(getManageableRoles('sales')).toEqual([])
      expect(getManageableRoles('marketing')).toEqual([])
    })
  })

  describe('getDefaultDashboard', () => {
    test('should return correct default dashboard for each role', () => {
      expect(getDefaultDashboard('owner')).toBe('/')
      expect(getDefaultDashboard('finance')).toBe('/')
      expect(getDefaultDashboard('operations')).toBe('/tours')
      expect(getDefaultDashboard('sales')).toBe('/dr-dish')
      expect(getDefaultDashboard('marketing')).toBe('/marketing')
    })
  })

  describe('canAccessDashboard', () => {
    test('should correctly check dashboard access permissions', () => {
      // Executive dashboard
      expect(canAccessDashboard('owner', '/')).toBe(true)
      expect(canAccessDashboard('finance', '/')).toBe(true)
      expect(canAccessDashboard('operations', '/')).toBe(false)

      // Tours dashboard
      expect(canAccessDashboard('operations', '/tours')).toBe(true)
      expect(canAccessDashboard('finance', '/tours')).toBe(true)
      expect(canAccessDashboard('sales', '/tours')).toBe(false)

      // Dr Dish dashboard
      expect(canAccessDashboard('sales', '/dr-dish')).toBe(true)
      expect(canAccessDashboard('finance', '/dr-dish')).toBe(true)
      expect(canAccessDashboard('operations', '/dr-dish')).toBe(false)

      // Marketing dashboard
      expect(canAccessDashboard('marketing', '/marketing')).toBe(true)
      expect(canAccessDashboard('finance', '/marketing')).toBe(true)
      expect(canAccessDashboard('operations', '/marketing')).toBe(false)

      // Settings
      expect(canAccessDashboard('owner', '/settings')).toBe(true)
      expect(canAccessDashboard('finance', '/settings')).toBe(true)
      expect(canAccessDashboard('operations', '/settings')).toBe(false)
    })
  })

  describe('getAllowedDashboards', () => {
    test('should return correct allowed dashboards for owner', () => {
      const dashboards = getAllowedDashboards('owner')
      expect(dashboards).toHaveLength(8) // All dashboards
      expect(dashboards.map(d => d.path)).toContain('/')
      expect(dashboards.map(d => d.path)).toContain('/settings')
      expect(dashboards.map(d => d.path)).toContain('/sync')
    })

    test('should return correct allowed dashboards for operations', () => {
      const dashboards = getAllowedDashboards('operations')
      expect(dashboards.map(d => d.path)).toContain('/tours')
      expect(dashboards.map(d => d.path)).toContain('/ar')
      expect(dashboards.map(d => d.path)).not.toContain('/')
      expect(dashboards.map(d => d.path)).not.toContain('/settings')
    })

    test('should return correct allowed dashboards for marketing', () => {
      const dashboards = getAllowedDashboards('marketing')
      expect(dashboards.map(d => d.path)).toContain('/marketing')
      expect(dashboards.map(d => d.path)).not.toContain('/tours')
      expect(dashboards.map(d => d.path)).not.toContain('/dr-dish')
      expect(dashboards.map(d => d.path)).not.toContain('/')
    })
  })

  describe('getAllRoles', () => {
    test('should return all roles with complete information', () => {
      const roles = getAllRoles()
      expect(roles).toHaveLength(5)

      const roleNames = roles.map(r => r.role)
      expect(roleNames).toContain('owner')
      expect(roleNames).toContain('finance')
      expect(roleNames).toContain('operations')
      expect(roleNames).toContain('sales')
      expect(roleNames).toContain('marketing')

      // Each role should have complete info and permissions
      roles.forEach(roleData => {
        expect(roleData.info).toBeDefined()
        expect(roleData.permissions).toBeDefined()
        expect(roleData.info.label).toBeTruthy()
        expect(roleData.info.description).toBeTruthy()
        expect(roleData.info.defaultDashboard).toBeTruthy()
      })
    })
  })
})
