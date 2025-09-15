/**
 * Data Sync Status and Management Page
 * 
 * This page provides comprehensive sync monitoring and manual sync functionality
 * for Finance and Owner roles. Features include:
 * - Real-time sync status monitoring
 * - Manual sync triggers for full or specific entities
 * - Sync history and performance metrics
 * - Error logs and troubleshooting information
 */

'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { DataTable } from '@/components/ui/data-table'
import { 
  RefreshCw, 
  Play, 
  AlertCircle, 
  CheckCircle2, 
  Clock, 
  Database,
  Activity,
  TrendingUp,
  Zap,
  Settings
} from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { triggerFullSync, triggerEntitySync, getSyncStatus } from '@/app/actions/sync/sync-actions'
// Simple toast replacement
const toast = {
  success: (message: string) => alert(`✅ ${message}`),
  error: (message: string) => alert(`❌ ${message}`)
}

interface SyncStatus {
  currentSession?: {
    id: string
    status: 'running' | 'completed' | 'error'
    startedAt: Date
    completedAt?: Date
    entitiesProcessed: number
    totalRecordsProcessed: number
    errors: string[]
  }
  recentSessions: Array<{
    id: string
    status: 'running' | 'completed' | 'error'
    startedAt: Date
    completedAt?: Date
    entitiesProcessed: number
    totalRecordsProcessed: number
    durationSeconds: number
    initiatedBy: string
    sessionType: 'manual' | 'scheduled'
  }>
  entityStatus: Array<{
    entityType: string
    lastSyncAt?: Date
    lastSuccessfulSyncAt?: Date
    recordsProcessed: number
    syncStatus: 'completed' | 'error' | 'running' | 'pending'
    errorMessage?: string
    hasMoreRecords: boolean
    rateLimitHits: number
  }>
  lastSuccessfulSync?: Date
  nextScheduledSync?: Date
}

const ENTITY_DISPLAY_NAMES: Record<string, string> = {
  'accounts': 'Chart of Accounts',
  'contacts': 'Contacts',
  'invoices': 'Invoices (AR)',
  'payments': 'Payments',
  'credit_notes': 'Credit Notes',
  'items': 'Items/Inventory',
  'bank_accounts': 'Bank Accounts',
  'bank_transactions': 'Bank Transactions',
  'manual_journals': 'Manual Journals',
  'tracking_categories': 'Tracking Categories'
}

const ENTITY_PRIORITIES: Record<string, number> = {
  'accounts': 1,
  'tracking_categories': 2,
  'contacts': 3,
  'items': 4,
  'invoices': 5,
  'payments': 6,
  'credit_notes': 7,
  'bank_accounts': 8,
  'bank_transactions': 9,
  'manual_journals': 10
}

export default function SyncPage() {
  const { user, profile } = useAuth()
  const [syncStatus, setSyncStatus] = useState<SyncStatus | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSyncing, setIsSyncing] = useState(false)
  const [selectedEntities, setSelectedEntities] = useState<string[]>([])

  // Check if user has sync permissions
  const canSync = profile?.role === 'owner' || profile?.role === 'finance'

  // Load sync status
  useEffect(() => {
    loadSyncStatus()
    
    // Refresh every 30 seconds if there's an active sync
    const interval = setInterval(() => {
      if (syncStatus?.currentSession?.status === 'running') {
        loadSyncStatus()
      }
    }, 30000)

    return () => clearInterval(interval)
  }, [syncStatus?.currentSession?.status])

  const loadSyncStatus = async () => {
    try {
      const result = await getSyncStatus()
      if (result.success && result.data) {
        setSyncStatus(result.data)
      } else {
        toast.error(result.error || 'Failed to load sync status')
      }
    } catch (error) {
      toast.error('Failed to load sync status')
    } finally {
      setIsLoading(false)
    }
  }

  const handleFullSync = async () => {
    if (!canSync) {
      toast.error('Insufficient permissions')
      return
    }

    setIsSyncing(true)
    try {
      const result = await triggerFullSync()
      if (result.success) {
        toast.success(result.message || 'Full sync started successfully')
        await loadSyncStatus()
      } else {
        toast.error(result.error || 'Failed to start sync')
      }
    } catch (error) {
      toast.error('Failed to trigger sync')
    } finally {
      setIsSyncing(false)
    }
  }

  const handleEntitySync = async () => {
    if (!canSync || selectedEntities.length === 0) {
      toast.error(selectedEntities.length === 0 ? 'Please select entities to sync' : 'Insufficient permissions')
      return
    }

    setIsSyncing(true)
    try {
      const result = await triggerEntitySync(selectedEntities)
      if (result.success) {
        toast.success(result.message || 'Entity sync started successfully')
        await loadSyncStatus()
      } else {
        toast.error(result.error || 'Failed to start entity sync')
      }
    } catch (error) {
      toast.error('Failed to trigger entity sync')
    } finally {
      setIsSyncing(false)
      setSelectedEntities([])
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <Badge variant="success" className="gap-1"><CheckCircle2 className="w-3 h-3" />Completed</Badge>
      case 'running':
        return <Badge variant="warning" className="gap-1"><RefreshCw className="w-3 h-3 animate-spin" />Running</Badge>
      case 'error':
        return <Badge variant="destructive" className="gap-1"><AlertCircle className="w-3 h-3" />Error</Badge>
      default:
        return <Badge variant="secondary" className="gap-1"><Clock className="w-3 h-3" />Pending</Badge>
    }
  }

  const formatDuration = (seconds: number) => {
    if (seconds < 60) return `${seconds}s`
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ${seconds % 60}s`
    return `${Math.floor(seconds / 3600)}h ${Math.floor((seconds % 3600) / 60)}m`
  }

  const formatDate = (date: Date | string) => {
    const d = typeof date === 'string' ? new Date(date) : date
    return d.toLocaleString('en-AU', {
      timeZone: 'Australia/Sydney',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <RefreshCw className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!canSync) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Data Sync</h1>
            <p className="text-muted-foreground">
              Xero synchronization monitoring and management
            </p>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-yellow-500" />
              Access Restricted
            </CardTitle>
            <CardDescription>
              Data sync functionality is only available to Owner and Finance roles.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Contact your system administrator if you need access to sync management features.
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  const entityStatusSorted = syncStatus?.entityStatus
    ?.sort((a, b) => (ENTITY_PRIORITIES[a.entityType] || 99) - (ENTITY_PRIORITIES[b.entityType] || 99)) || []

  const recentSessionsColumns = [
    {
      accessorKey: 'startedAt',
      header: 'Started',
      cell: ({ row }: any) => formatDate(row.getValue('startedAt'))
    },
    {
      accessorKey: 'sessionType',
      header: 'Type',
      cell: ({ row }: any) => (
        <Badge variant={row.getValue('sessionType') === 'manual' ? 'default' : 'secondary'}>
          {row.getValue('sessionType')}
        </Badge>
      )
    },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ row }: any) => getStatusBadge(row.getValue('status'))
    },
    {
      accessorKey: 'entitiesProcessed',
      header: 'Entities',
      cell: ({ row }: any) => row.getValue('entitiesProcessed')
    },
    {
      accessorKey: 'totalRecordsProcessed',
      header: 'Records',
      cell: ({ row }: any) => row.getValue('totalRecordsProcessed').toLocaleString()
    },
    {
      accessorKey: 'durationSeconds',
      header: 'Duration',
      cell: ({ row }: any) => formatDuration(row.getValue('durationSeconds'))
    }
  ]

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Data Sync</h1>
          <p className="text-muted-foreground">
            Xero synchronization monitoring and management
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={loadSyncStatus}
            disabled={isSyncing}
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
          
          <Button
            onClick={handleFullSync}
            disabled={isSyncing || syncStatus?.currentSession?.status === 'running'}
            className="gap-2"
          >
            {isSyncing ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <Play className="w-4 h-4" />
            )}
            Full Sync
          </Button>
        </div>
      </div>

      {/* Current Sync Status */}
      {syncStatus?.currentSession && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="w-5 h-5" />
              Current Sync Session
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-sm font-medium">Status</p>
                {getStatusBadge(syncStatus.currentSession.status)}
              </div>
              <div className="space-y-1">
                <p className="text-sm font-medium">Started</p>
                <p className="text-sm text-muted-foreground">
                  {formatDate(syncStatus.currentSession.startedAt)}
                </p>
              </div>
              <div className="space-y-1">
                <p className="text-sm font-medium">Entities Processed</p>
                <p className="text-sm text-muted-foreground">
                  {syncStatus.currentSession.entitiesProcessed}
                </p>
              </div>
              <div className="space-y-1">
                <p className="text-sm font-medium">Records Processed</p>
                <p className="text-sm text-muted-foreground">
                  {syncStatus.currentSession.totalRecordsProcessed.toLocaleString()}
                </p>
              </div>
            </div>
            
            {syncStatus.currentSession.errors.length > 0 && (
              <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                <h4 className="text-sm font-medium text-red-800 mb-2">Errors ({syncStatus.currentSession.errors.length})</h4>
                <ul className="text-sm text-red-700 space-y-1">
                  {syncStatus.currentSession.errors.map((error, index) => (
                    <li key={index}>• {error}</li>
                  ))}
                </ul>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Entity Status Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {entityStatusSorted.map((entity) => (
          <Card key={entity.entityType} className="relative">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">
                  {ENTITY_DISPLAY_NAMES[entity.entityType] || entity.entityType}
                </CardTitle>
                {getStatusBadge(entity.syncStatus)}
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Last Sync</p>
                  <p className="font-medium">
                    {entity.lastSyncAt ? formatDate(entity.lastSyncAt) : 'Never'}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">Records</p>
                  <p className="font-medium">{entity.recordsProcessed.toLocaleString()}</p>
                </div>
              </div>
              
              {entity.rateLimitHits > 0 && (
                <div className="flex items-center gap-2 text-sm text-orange-600">
                  <Zap className="w-4 h-4" />
                  <span>{entity.rateLimitHits} rate limit hits</span>
                </div>
              )}
              
              {entity.hasMoreRecords && (
                <div className="flex items-center gap-2 text-sm text-blue-600">
                  <TrendingUp className="w-4 h-4" />
                  <span>More records available</span>
                </div>
              )}
              
              {entity.errorMessage && (
                <div className="p-2 bg-red-50 border border-red-200 rounded text-sm text-red-700">
                  {entity.errorMessage}
                </div>
              )}
              
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id={`entity-${entity.entityType}`}
                  checked={selectedEntities.includes(entity.entityType)}
                  onChange={(e) => {
                    if (e.target.checked) {
                      setSelectedEntities([...selectedEntities, entity.entityType])
                    } else {
                      setSelectedEntities(selectedEntities.filter(t => t !== entity.entityType))
                    }
                  }}
                  disabled={isSyncing || syncStatus?.currentSession?.status === 'running'}
                  className="rounded border-gray-300"
                />
                <label
                  htmlFor={`entity-${entity.entityType}`}
                  className="text-sm text-muted-foreground cursor-pointer"
                >
                  Select for sync
                </label>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Entity Sync Controls */}
      {selectedEntities.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="w-5 h-5" />
              Selected Entity Sync
            </CardTitle>
            <CardDescription>
              Sync only the selected entities: {selectedEntities.map(e => ENTITY_DISPLAY_NAMES[e]).join(', ')}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-3">
              <Button
                onClick={handleEntitySync}
                disabled={isSyncing || syncStatus?.currentSession?.status === 'running'}
                className="gap-2"
              >
                {isSyncing ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <Play className="w-4 h-4" />
                )}
                Sync Selected ({selectedEntities.length})
              </Button>
              
              <Button
                variant="outline"
                onClick={() => setSelectedEntities([])}
                disabled={isSyncing}
              >
                Clear Selection
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Sync Schedule Info */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="w-5 h-5" />
              Sync Schedule
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <p className="text-sm text-muted-foreground">Last Successful Sync</p>
              <p className="font-medium">
                {syncStatus?.lastSuccessfulSync 
                  ? formatDate(syncStatus.lastSuccessfulSync)
                  : 'Never'
                }
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Next Scheduled Sync</p>
              <p className="font-medium">
                {syncStatus?.nextScheduledSync 
                  ? formatDate(syncStatus.nextScheduledSync)
                  : 'Daily at 3:30 AM AEDT'
                }
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="w-5 h-5" />
              Quick Stats
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <p className="text-sm text-muted-foreground">Total Entities</p>
              <p className="font-medium">{entityStatusSorted.length}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total Records Synced</p>
              <p className="font-medium">
                {entityStatusSorted.reduce((sum, e) => sum + e.recordsProcessed, 0).toLocaleString()}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Sync History */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Sync History</CardTitle>
          <CardDescription>
            Recent synchronization sessions and their results
          </CardDescription>
        </CardHeader>
        <CardContent>
          <DataTable
            columns={recentSessionsColumns}
            data={syncStatus?.recentSessions || []}
            searchPlaceholder="Search sync history..."
          />
        </CardContent>
      </Card>
    </div>
  )
}
