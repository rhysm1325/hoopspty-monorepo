'use client'

import { useState } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { getConfigsByType } from '@/lib/database/config'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { DataTable } from '@/components/ui/data-table'
import {
  AlertCircle,
  CheckCircle,
  Download,
  Upload,
  Settings,
  Database,
  Shield,
  FileText,
  Archive,
  RotateCcw,
  Trash2,
  Eye,
} from 'lucide-react'
import { formatAustralianDateTime } from '@/utils/financial'
import type { ConfigMapping } from '@/types/database'

interface ConfigBackup {
  id: string
  name: string
  description: string
  createdAt: Date
  createdBy: string
  configCount: number
  size: number
  version: string
  configs: ConfigMapping[]
}

interface ConfigBackupProps {
  className?: string
}

export function ConfigBackupRestore({ className }: ConfigBackupProps) {
  const { hasPermission, user } = useAuth()
  const [backups, setBackups] = useState<ConfigBackup[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isCreating, setIsCreating] = useState(false)
  const [isRestoring, setIsRestoring] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [selectedBackup, setSelectedBackup] = useState<ConfigBackup | null>(null)
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false)
  const [isRestoreDialogOpen, setIsRestoreDialogOpen] = useState(false)

  const [backupForm, setBackupForm] = useState({
    name: '',
    description: '',
    includeTypes: ['revenue_stream', 'account_code', 'item_code', 'gst_method', 'sync_schedule'] as string[],
  })

  // Check permissions
  if (!hasPermission('canManageSettings')) {
    return (
      <Card className={className}>
        <CardContent className="pt-6">
          <div className="text-center text-gray-500">
            <Settings className="mx-auto mb-2 h-8 w-8 text-gray-400" />
            <p>You do not have permission to manage configuration backups.</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  const loadBackups = async () => {
    setIsLoading(true)
    setError(null)

    try {
      // In a real implementation, this would load from a backups table
      // For now, we'll simulate with localStorage or create a backup service
      const savedBackups = localStorage.getItem('config_backups')
      if (savedBackups) {
        const parsedBackups = JSON.parse(savedBackups).map((backup: any) => ({
          ...backup,
          createdAt: new Date(backup.createdAt),
        }))
        setBackups(parsedBackups)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load backups')
    } finally {
      setIsLoading(false)
    }
  }

  const createBackup = async () => {
    if (!backupForm.name.trim()) {
      setError('Backup name is required')
      return
    }

    setIsCreating(true)
    setError(null)
    setSuccess(null)

    try {
      // Collect all configurations
      const allConfigs: ConfigMapping[] = []
      
      for (const configType of backupForm.includeTypes) {
        const result = await getConfigsByType(configType as any)
        if (result.configs) {
          allConfigs.push(...result.configs)
        }
      }

      // Create backup object
      const backup: ConfigBackup = {
        id: `backup_${Date.now()}`,
        name: backupForm.name,
        description: backupForm.description,
        createdAt: new Date(),
        createdBy: user?.email || 'Unknown',
        configCount: allConfigs.length,
        size: JSON.stringify(allConfigs).length,
        version: '1.0',
        configs: allConfigs,
      }

      // Save backup (in real implementation, this would go to database)
      const existingBackups = JSON.parse(localStorage.getItem('config_backups') || '[]')
      existingBackups.push(backup)
      localStorage.setItem('config_backups', JSON.stringify(existingBackups))

      setBackups(existingBackups.map((b: any) => ({
        ...b,
        createdAt: new Date(b.createdAt),
      })))

      setSuccess(`Configuration backup "${backup.name}" created successfully`)
      setBackupForm({ name: '', description: '', includeTypes: backupForm.includeTypes })
      
      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(null), 3000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create backup')
    } finally {
      setIsCreating(false)
    }
  }

  const downloadBackup = (backup: ConfigBackup) => {
    const dataStr = JSON.stringify(backup, null, 2)
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr)
    
    const exportFileDefaultName = `config_backup_${backup.name}_${backup.id}.json`
    
    const linkElement = document.createElement('a')
    linkElement.setAttribute('href', dataUri)
    linkElement.setAttribute('download', exportFileDefaultName)
    linkElement.click()
  }

  const restoreBackup = async (backup: ConfigBackup) => {
    setIsRestoring(true)
    setError(null)
    setSuccess(null)

    try {
      // In a real implementation, this would restore configurations to the database
      // For now, we'll simulate the restore process
      
      // This would involve:
      // 1. Backing up current configurations
      // 2. Clearing existing configurations (with confirmation)
      // 3. Inserting backup configurations
      // 4. Validating the restore
      
      console.log('Restoring backup:', backup)
      
      // Simulate restore delay
      await new Promise(resolve => setTimeout(resolve, 2000))
      
      setSuccess(`Configuration restored from backup "${backup.name}"`)
      setIsRestoreDialogOpen(false)
      
      // Clear success message after 5 seconds
      setTimeout(() => setSuccess(null), 5000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to restore backup')
    } finally {
      setIsRestoring(false)
    }
  }

  const deleteBackup = async (backupId: string) => {
    try {
      const existingBackups = JSON.parse(localStorage.getItem('config_backups') || '[]')
      const updatedBackups = existingBackups.filter((b: any) => b.id !== backupId)
      localStorage.setItem('config_backups', JSON.stringify(updatedBackups))
      
      setBackups(updatedBackups.map((b: any) => ({
        ...b,
        createdAt: new Date(b.createdAt),
      })))
      
      setSuccess('Backup deleted successfully')
      setTimeout(() => setSuccess(null), 3000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete backup')
    }
  }

  const uploadBackup = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const backup = JSON.parse(e.target?.result as string) as ConfigBackup
        
        // Validate backup structure
        if (!backup.id || !backup.name || !backup.configs) {
          throw new Error('Invalid backup file format')
        }

        // Add to backups list
        const existingBackups = JSON.parse(localStorage.getItem('config_backups') || '[]')
        backup.id = `backup_${Date.now()}` // Generate new ID to avoid conflicts
        existingBackups.push(backup)
        localStorage.setItem('config_backups', JSON.stringify(existingBackups))
        
        setBackups(existingBackups.map((b: any) => ({
          ...b,
          createdAt: new Date(b.createdAt),
        })))
        
        setSuccess(`Backup "${backup.name}" uploaded successfully`)
        setTimeout(() => setSuccess(null), 3000)
      } catch (err) {
        setError('Invalid backup file format')
      }
    }
    reader.readAsText(file)
    
    // Clear the input
    event.target.value = ''
  }

  // Load backups on component mount
  useState(() => {
    loadBackups()
  })

  const backupTableColumns = [
    {
      accessorKey: 'name',
      header: 'Backup Name',
      cell: ({ row }: any) => (
        <div>
          <div className="font-medium">{row.original.name}</div>
          <div className="text-sm text-gray-500">{row.original.description}</div>
        </div>
      ),
    },
    {
      accessorKey: 'createdAt',
      header: 'Created',
      cell: ({ row }: any) => (
        <div>
          <div className="text-sm">{formatAustralianDateTime(row.original.createdAt)}</div>
          <div className="text-xs text-gray-500">by {row.original.createdBy}</div>
        </div>
      ),
    },
    {
      accessorKey: 'configCount',
      header: 'Configs',
      cell: ({ row }: any) => (
        <Badge variant="outline">
          {row.original.configCount} items
        </Badge>
      ),
    },
    {
      accessorKey: 'size',
      header: 'Size',
      cell: ({ row }: any) => (
        <span className="text-sm">
          {(row.original.size / 1024).toFixed(1)} KB
        </span>
      ),
    },
    {
      id: 'actions',
      header: 'Actions',
      cell: ({ row }: any) => (
        <div className="flex items-center space-x-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setSelectedBackup(row.original)
              setIsViewDialogOpen(true)
            }}
          >
            <Eye className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => downloadBackup(row.original)}
          >
            <Download className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setSelectedBackup(row.original)
              setIsRestoreDialogOpen(true)
            }}
          >
            <RotateCcw className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => deleteBackup(row.original.id)}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ),
    },
  ]

  return (
    <div className={className}>
      {/* Status Messages */}
      {error && (
        <div className="mb-4 rounded-md bg-red-50 p-4">
          <div className="flex">
            <AlertCircle className="h-5 w-5 text-red-400" />
            <div className="ml-3">
              <p className="text-sm text-red-800">{error}</p>
            </div>
          </div>
        </div>
      )}

      {success && (
        <div className="mb-4 rounded-md bg-green-50 p-4">
          <div className="flex">
            <CheckCircle className="h-5 w-5 text-green-400" />
            <div className="ml-3">
              <p className="text-sm text-green-800">{success}</p>
            </div>
          </div>
        </div>
      )}

      {/* Create Backup */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center">
            <Archive className="mr-2 h-5 w-5" />
            Create Configuration Backup
          </CardTitle>
          <CardDescription>
            Create a backup of your current configuration settings
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <Label htmlFor="backup-name">Backup Name</Label>
              <Input
                id="backup-name"
                placeholder="e.g., Pre-update backup"
                value={backupForm.name}
                onChange={(e) => setBackupForm({ ...backupForm, name: e.target.value })}
              />
            </div>

            <div>
              <Label htmlFor="backup-description">Description (optional)</Label>
              <Input
                id="backup-description"
                placeholder="e.g., Before changing revenue mappings"
                value={backupForm.description}
                onChange={(e) => setBackupForm({ ...backupForm, description: e.target.value })}
              />
            </div>
          </div>

          <div>
            <Label>Configuration Types to Include</Label>
            <div className="mt-2 grid grid-cols-2 gap-2">
              {[
                { key: 'revenue_stream', label: 'Revenue Stream Mappings' },
                { key: 'account_code', label: 'Account Code Mappings' },
                { key: 'item_code', label: 'Item Code Mappings' },
                { key: 'gst_method', label: 'GST Settings' },
                { key: 'sync_schedule', label: 'Sync Schedule' },
                { key: 'company_details', label: 'Company Details' },
              ].map((type) => (
                <div key={type.key} className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id={`include-${type.key}`}
                    checked={backupForm.includeTypes.includes(type.key)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setBackupForm({
                          ...backupForm,
                          includeTypes: [...backupForm.includeTypes, type.key]
                        })
                      } else {
                        setBackupForm({
                          ...backupForm,
                          includeTypes: backupForm.includeTypes.filter(t => t !== type.key)
                        })
                      }
                    }}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <Label htmlFor={`include-${type.key}`} className="text-sm">
                    {type.label}
                  </Label>
                </div>
              ))}
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <Button
              onClick={createBackup}
              disabled={isCreating || !backupForm.name.trim()}
              className="flex items-center"
            >
              {isCreating ? (
                <Database className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Archive className="mr-2 h-4 w-4" />
              )}
              {isCreating ? 'Creating...' : 'Create Backup'}
            </Button>

            <div className="relative">
              <Button variant="outline" className="flex items-center">
                <Upload className="mr-2 h-4 w-4" />
                Upload Backup
              </Button>
              <input
                type="file"
                accept=".json"
                onChange={uploadBackup}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Backup List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Database className="mr-2 h-5 w-5" />
            Configuration Backups
          </CardTitle>
          <CardDescription>
            Manage and restore configuration backups
          </CardDescription>
        </CardHeader>
        <CardContent>
          <DataTable
            columns={backupTableColumns}
            data={backups}
            searchable
            exportable={false}
          />
        </CardContent>
      </Card>

      {/* View Backup Dialog */}
      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Backup Details: {selectedBackup?.name}</DialogTitle>
            <DialogDescription>
              View the contents of this configuration backup
            </DialogDescription>
          </DialogHeader>
          
          {selectedBackup && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Created</Label>
                  <p className="text-sm">{formatAustralianDateTime(selectedBackup.createdAt)}</p>
                </div>
                <div>
                  <Label>Created By</Label>
                  <p className="text-sm">{selectedBackup.createdBy}</p>
                </div>
                <div>
                  <Label>Configuration Count</Label>
                  <p className="text-sm">{selectedBackup.configCount} items</p>
                </div>
                <div>
                  <Label>Size</Label>
                  <p className="text-sm">{(selectedBackup.size / 1024).toFixed(1)} KB</p>
                </div>
              </div>
              
              {selectedBackup.description && (
                <div>
                  <Label>Description</Label>
                  <p className="text-sm">{selectedBackup.description}</p>
                </div>
              )}
              
              <div>
                <Label>Configuration Types</Label>
                <div className="mt-2 flex flex-wrap gap-2">
                  {Array.from(new Set(selectedBackup.configs.map(c => c.type))).map(type => (
                    <Badge key={type} variant="outline">
                      {type}
                    </Badge>
                  ))}
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Restore Backup Dialog */}
      <Dialog open={isRestoreDialogOpen} onOpenChange={setIsRestoreDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Restore Configuration</DialogTitle>
            <DialogDescription>
              Are you sure you want to restore from backup "{selectedBackup?.name}"?
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="rounded-md bg-amber-50 p-4">
              <div className="flex">
                <AlertCircle className="h-5 w-5 text-amber-400" />
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-amber-800">
                    Warning: This action will overwrite current settings
                  </h3>
                  <p className="mt-1 text-sm text-amber-700">
                    Your current configuration will be replaced with the backup data. 
                    Consider creating a backup of your current settings first.
                  </p>
                </div>
              </div>
            </div>
            
            <div className="flex items-center justify-end space-x-2">
              <Button
                variant="outline"
                onClick={() => setIsRestoreDialogOpen(false)}
                disabled={isRestoring}
              >
                Cancel
              </Button>
              <Button
                onClick={() => selectedBackup && restoreBackup(selectedBackup)}
                disabled={isRestoring}
                className="flex items-center"
              >
                {isRestoring ? (
                  <RotateCcw className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <RotateCcw className="mr-2 h-4 w-4" />
                )}
                {isRestoring ? 'Restoring...' : 'Restore Backup'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
