'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { getAuditLogs, getAuditLogStats } from '@/lib/audit/logger'
import { formatAustralianDateTime } from '@/utils/financial'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { DataTable } from '@/components/ui/data-table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { DatePicker } from '@/components/ui/date-picker'
import { MetricTile } from '@/components/ui/metric-tile'
import {
  Shield,
  Search,
  Download,
  RefreshCw,
  Filter,
  Eye,
  AlertTriangle,
  User,
  Settings as SettingsIcon,
  Database,
} from 'lucide-react'
import type { AuditLog, AuditAction } from '@/types'

interface AuditLogsProps {
  className?: string
}

export function AuditLogs({ className }: AuditLogsProps) {
  const { hasPermission } = useAuth()
  const [logs, setLogs] = useState<AuditLog[]>([])
  const [stats, setStats] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Filters
  const [actionFilter, setActionFilter] = useState<AuditAction | 'all'>('all')
  const [userFilter, setUserFilter] = useState('')
  const [ipFilter, setIpFilter] = useState('')
  const [startDate, setStartDate] = useState<Date>()
  const [endDate, setEndDate] = useState<Date>()

  if (!hasPermission('canViewAuditLogs')) {
    return (
      <Card className={className}>
        <CardContent className="pt-6">
          <div className="text-center text-gray-500">
            <Shield className="mx-auto mb-2 h-8 w-8 text-gray-400" />
            <p>You do not have permission to view audit logs.</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  const loadAuditLogs = async () => {
    setIsLoading(true)
    setError(null)

    try {
      const filter = {
        action: actionFilter !== 'all' ? actionFilter : undefined,
        startDate,
        endDate,
        limit: 100,
        offset: 0,
      }

      const result = await getAuditLogs(filter)

      if (result.error) {
        setError(result.error)
      } else {
        setLogs(result.logs)
      }

      // Load statistics
      const statsResult = await getAuditLogStats(30)
      setStats(statsResult)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load audit logs')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadAuditLogs()
  }, [actionFilter, startDate, endDate])

  const handleExport = async () => {
    // TODO: Implement audit log export
    console.log('Export audit logs')
  }

  const getActionIcon = (action: AuditAction) => {
    switch (action) {
      case 'user_login':
      case 'user_logout':
        return <User className="h-4 w-4" />
      case 'user_invited':
      case 'user_activated':
      case 'user_deactivated':
      case 'role_changed':
        return <User className="h-4 w-4" />
      case 'settings_updated':
      case 'config_changed':
        return <SettingsIcon className="h-4 w-4" />
      case 'sync_initiated':
      case 'data_exported':
        return <Database className="h-4 w-4" />
      default:
        return <Shield className="h-4 w-4" />
    }
  }

  const getActionBadgeVariant = (action: AuditAction) => {
    if (action.includes('login') || action.includes('activated'))
      return 'default'
    if (action.includes('logout') || action.includes('deactivated'))
      return 'secondary'
    if (action.includes('invited') || action.includes('sync')) return 'outline'
    return 'secondary'
  }

  const auditLogColumns = [
    {
      key: 'timestamp',
      title: 'Time',
      sortable: true,
      type: 'date' as const,
      width: '150px',
    },
    {
      key: 'action',
      title: 'Action',
      type: 'badge' as const,
      width: '150px',
    },
    {
      key: 'userEmail',
      title: 'User',
      sortable: true,
      type: 'text' as const,
      width: '200px',
    },
    {
      key: 'details',
      title: 'Details',
      type: 'text' as const,
    },
    {
      key: 'ipAddress',
      title: 'IP Address',
      type: 'text' as const,
      width: '120px',
    },
  ]

  const auditLogData = logs.map(log => ({
    id: log.id,
    timestamp: log.timestamp,
    action: {
      label: log.action
        .replace(/_/g, ' ')
        .replace(/\b\w/g, l => l.toUpperCase()),
      variant: getActionBadgeVariant(log.action),
    },
    userEmail: log.details?.email || log.userId,
    details: JSON.stringify(log.details, null, 2),
    ipAddress: log.ipAddress || 'Unknown',
  }))

  return (
    <div className={className}>
      <div className="space-y-6">
        {/* Statistics */}
        {stats && (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
            <MetricTile
              title="Total Events"
              value={stats.totalEvents}
              change={{
                value: 'Last 30 days',
                type: 'neutral',
              }}
            />
            <MetricTile
              title="Login Events"
              value={stats.loginEvents}
              change={{
                value: `${Math.round((stats.loginEvents / stats.totalEvents) * 100)}%`,
                type: 'neutral',
                label: 'of total',
              }}
            />
            <MetricTile
              title="Config Changes"
              value={stats.configChanges}
              change={{
                value:
                  stats.configChanges > 0 ? 'Recent activity' : 'No changes',
                type: stats.configChanges > 0 ? 'warning' : 'neutral',
              }}
            />
            <MetricTile
              title="Data Operations"
              value={stats.dataOperations}
              change={{
                value: 'Sync & Export',
                type: 'neutral',
              }}
            />
          </div>
        )}

        {/* Filters */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Shield className="mr-2 h-5 w-5" />
              Audit Log Filters
            </CardTitle>
            <CardDescription>
              Filter audit events by action, user, date range, or IP address
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
              <div>
                <Label htmlFor="action">Action Type</Label>
                <Select
                  value={actionFilter}
                  onValueChange={value =>
                    setActionFilter(value as AuditAction | 'all')
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Actions</SelectItem>
                    <SelectItem value="user_login">User Login</SelectItem>
                    <SelectItem value="user_logout">User Logout</SelectItem>
                    <SelectItem value="user_invited">User Invited</SelectItem>
                    <SelectItem value="role_changed">Role Changed</SelectItem>
                    <SelectItem value="settings_updated">
                      Settings Updated
                    </SelectItem>
                    <SelectItem value="sync_initiated">
                      Sync Initiated
                    </SelectItem>
                    <SelectItem value="data_exported">Data Exported</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="user">User Email</Label>
                <Input
                  id="user"
                  placeholder="user@ausa.com.au"
                  value={userFilter}
                  onChange={e => setUserFilter(e.target.value)}
                />
              </div>

              <div>
                <Label htmlFor="startDate">Start Date</Label>
                <DatePicker
                  date={startDate}
                  onDateChange={setStartDate}
                  placeholder="Select start date"
                />
              </div>

              <div>
                <Label htmlFor="endDate">End Date</Label>
                <DatePicker
                  date={endDate}
                  onDateChange={setEndDate}
                  placeholder="Select end date"
                />
              </div>
            </div>

            <div className="mt-4 flex gap-2">
              <Button onClick={loadAuditLogs} disabled={isLoading}>
                <RefreshCw
                  className={`mr-2 h-4 w-4 ${isLoading ? 'animate-spin' : ''}`}
                />
                Refresh
              </Button>
              <Button variant="outline" onClick={handleExport}>
                <Download className="mr-2 h-4 w-4" />
                Export
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Error Display */}
        {error && (
          <div className="rounded-md bg-red-50 p-4">
            <div className="flex">
              <AlertTriangle className="h-5 w-5 text-red-400" />
              <div className="ml-3">
                <p className="text-sm text-red-800">{error}</p>
              </div>
            </div>
          </div>
        )}

        {/* Audit Logs Table */}
        <Card>
          <CardHeader>
            <CardTitle>Security Audit Log</CardTitle>
            <CardDescription>
              Complete record of all authentication and system events
            </CardDescription>
          </CardHeader>
          <CardContent>
            <DataTable
              columns={auditLogColumns}
              data={auditLogData}
              loading={isLoading}
              searchable
              exportable
              onExport={handleExport}
            />
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
