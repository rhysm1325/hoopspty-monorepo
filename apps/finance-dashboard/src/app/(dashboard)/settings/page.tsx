'use client'

import { useState } from 'react'
import { useAuth } from '@/hooks/useAuth'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs'
import { UserManagement } from '@/components/settings/user-management'
import { AuditLogs } from '@/components/settings/audit-logs'
import { SyncScheduleSettings } from '@/components/settings/sync-schedule'
import { ConfigBackupRestore } from '@/components/settings/config-backup'
import {
  Settings,
  Users,
  Shield,
  Clock,
  Database,
  Zap,
  Globe,
  FileText,
  Archive,
  AlertTriangle,
} from 'lucide-react'

export default function SettingsPage() {
  const { user, hasPermission } = useAuth()
  const [activeTab, setActiveTab] = useState('general')

  if (!user) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center text-gray-500">
              <Shield className="mx-auto mb-2 h-8 w-8 text-gray-400" />
              <p>Please log in to access settings.</p>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  const settingsTabs = [
    {
      id: 'general',
      label: 'General',
      icon: Settings,
      description: 'Basic application settings and preferences',
      requiresPermission: null,
    },
    {
      id: 'sync',
      label: 'Sync Schedule',
      icon: Clock,
      description: 'Configure automatic data synchronization',
      requiresPermission: 'canManageSettings',
    },
    {
      id: 'backup',
      label: 'Backup & Restore',
      icon: Archive,
      description: 'Manage configuration backups and restore points',
      requiresPermission: 'canManageSettings',
    },
    {
      id: 'users',
      label: 'User Management',
      icon: Users,
      description: 'Manage team members and role assignments',
      requiresPermission: 'canManageUsers',
    },
    {
      id: 'audit',
      label: 'Audit Logs',
      icon: Shield,
      description: 'View system activity and security events',
      requiresPermission: 'canViewAuditLogs',
    },
  ]

  const availableTabs = settingsTabs.filter(
    tab => !tab.requiresPermission || hasPermission(tab.requiresPermission as any)
  )

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Settings</h1>
        <p className="mt-2 text-gray-600">
          Manage your AUSA Finance Dashboard configuration and preferences
        </p>
        <div className="mt-4 flex items-center space-x-2">
          <Badge variant="outline" className="flex items-center">
            <Users className="mr-1 h-3 w-3" />
            {user.role}
          </Badge>
          <Badge variant="outline" className="flex items-center">
            <Globe className="mr-1 h-3 w-3" />
            Australia/Sydney
          </Badge>
        </div>
      </div>

      {/* Settings Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-5">
          {availableTabs.map((tab) => {
            const Icon = tab.icon
            return (
              <TabsTrigger key={tab.id} value={tab.id} className="flex items-center">
                <Icon className="mr-2 h-4 w-4" />
                {tab.label}
              </TabsTrigger>
            )
          })}
        </TabsList>

        {/* General Settings */}
        <TabsContent value="general" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Settings className="mr-2 h-5 w-5" />
                General Settings
              </CardTitle>
              <CardDescription>
                Basic application settings and user preferences
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* User Profile Section */}
              <div>
                <h3 className="text-lg font-medium mb-4">User Profile</h3>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Email Address
                    </label>
                    <p className="mt-1 text-sm text-gray-900">{user.email}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Role
                    </label>
                    <div className="mt-1">
                      <Badge variant="outline">{user.role}</Badge>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Full Name
                    </label>
                    <p className="mt-1 text-sm text-gray-900">
                      {user.firstName} {user.lastName}
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Last Login
                    </label>
                    <p className="mt-1 text-sm text-gray-900">
                      {user.lastLoginAt ? new Date(user.lastLoginAt).toLocaleString() : 'Never'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Application Preferences */}
              <div>
                <h3 className="text-lg font-medium mb-4">Application Preferences</h3>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <label className="text-sm font-medium text-gray-700">
                        Default Dashboard View
                      </label>
                      <p className="text-sm text-gray-500">
                        Choose which dashboard loads by default
                      </p>
                    </div>
                    <select className="rounded-md border-gray-300 text-sm">
                      <option>Executive Dashboard</option>
                      <option>Tours Dashboard</option>
                      <option>Dr Dish Dashboard</option>
                      <option>Marketing Dashboard</option>
                    </select>
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <label className="text-sm font-medium text-gray-700">
                        Email Notifications
                      </label>
                      <p className="text-sm text-gray-500">
                        Receive email alerts for important events
                      </p>
                    </div>
                    <input
                      type="checkbox"
                      defaultChecked
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <label className="text-sm font-medium text-gray-700">
                        Auto-refresh Dashboard
                      </label>
                      <p className="text-sm text-gray-500">
                        Automatically refresh dashboard data every 5 minutes
                      </p>
                    </div>
                    <input
                      type="checkbox"
                      defaultChecked
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                  </div>
                </div>
              </div>

              {/* System Information */}
              <div>
                <h3 className="text-lg font-medium mb-4">System Information</h3>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                  <div className="rounded-lg border p-3">
                    <div className="flex items-center">
                      <Database className="mr-2 h-4 w-4 text-gray-500" />
                      <span className="text-sm font-medium">Database</span>
                    </div>
                    <p className="mt-1 text-sm text-green-600">Connected</p>
                  </div>
                  <div className="rounded-lg border p-3">
                    <div className="flex items-center">
                      <Zap className="mr-2 h-4 w-4 text-gray-500" />
                      <span className="text-sm font-medium">Xero Integration</span>
                    </div>
                    <p className="mt-1 text-sm text-green-600">Active</p>
                  </div>
                  <div className="rounded-lg border p-3">
                    <div className="flex items-center">
                      <Clock className="mr-2 h-4 w-4 text-gray-500" />
                      <span className="text-sm font-medium">Last Sync</span>
                    </div>
                    <p className="mt-1 text-sm text-gray-600">2 hours ago</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Sync Schedule Settings */}
        <TabsContent value="sync" className="space-y-6">
          <SyncScheduleSettings />
        </TabsContent>

        {/* Backup & Restore */}
        <TabsContent value="backup" className="space-y-6">
          <ConfigBackupRestore />
        </TabsContent>

        {/* User Management */}
        <TabsContent value="users" className="space-y-6">
          <UserManagement 
            users={[]} // This would be loaded from a server component or API
            onUserUpdate={() => {
              // Refresh users list
            }}
          />
        </TabsContent>

        {/* Audit Logs */}
        <TabsContent value="audit" className="space-y-6">
          <AuditLogs />
        </TabsContent>
      </Tabs>

      {/* Warning for Limited Permissions */}
      {availableTabs.length < settingsTabs.length && (
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center rounded-md bg-amber-50 p-4">
              <AlertTriangle className="h-5 w-5 text-amber-400" />
              <div className="ml-3">
                <h3 className="text-sm font-medium text-amber-800">
                  Limited Access
                </h3>
                <p className="mt-1 text-sm text-amber-700">
                  Some settings are not available due to your current role permissions. 
                  Contact an administrator if you need access to additional settings.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
