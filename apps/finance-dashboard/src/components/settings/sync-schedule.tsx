'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { getConfigValue, setConfigValue } from '@/lib/database/config'
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import {
  AlertCircle,
  CheckCircle,
  Clock,
  Settings,
  Zap,
  Globe,
  Save,
  RotateCcw,
} from 'lucide-react'
import { formatAustralianDateTime } from '@/utils/financial'

interface SyncScheduleSettings {
  enabled: boolean
  hour: number
  minute: number
  timezone: string
  batchSize: number
  rateLimitMs: number
  timeoutMinutes: number
  weekdaysOnly: boolean
  retryAttempts: number
  notifyOnFailure: boolean
  notifyEmails: string[]
}

interface SyncScheduleProps {
  className?: string
}

const TIMEZONE_OPTIONS = [
  { value: 'Australia/Sydney', label: 'Sydney (AEDT/AEST)' },
  { value: 'Australia/Melbourne', label: 'Melbourne (AEDT/AEST)' },
  { value: 'Australia/Brisbane', label: 'Brisbane (AEST)' },
  { value: 'Australia/Perth', label: 'Perth (AWST)' },
  { value: 'Australia/Adelaide', label: 'Adelaide (ACDT/ACST)' },
  { value: 'Australia/Darwin', label: 'Darwin (ACST)' },
  { value: 'UTC', label: 'UTC' },
]

const DEFAULT_SETTINGS: SyncScheduleSettings = {
  enabled: true,
  hour: 3,
  minute: 30,
  timezone: 'Australia/Sydney',
  batchSize: 100,
  rateLimitMs: 1000,
  timeoutMinutes: 30,
  weekdaysOnly: false,
  retryAttempts: 3,
  notifyOnFailure: true,
  notifyEmails: [],
}

export function SyncScheduleSettings({ className }: SyncScheduleProps) {
  const { hasPermission, user } = useAuth()
  const [settings, setSettings] = useState<SyncScheduleSettings>(DEFAULT_SETTINGS)
  const [originalSettings, setOriginalSettings] = useState<SyncScheduleSettings>(DEFAULT_SETTINGS)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [hasChanges, setHasChanges] = useState(false)

  // Check permissions
  if (!hasPermission('canManageSettings')) {
    return (
      <Card className={className}>
        <CardContent className="pt-6">
          <div className="text-center text-gray-500">
            <Settings className="mx-auto mb-2 h-8 w-8 text-gray-400" />
            <p>You do not have permission to manage sync settings.</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  // Load current settings
  useEffect(() => {
    loadSettings()
  }, [])

  // Track changes
  useEffect(() => {
    setHasChanges(JSON.stringify(settings) !== JSON.stringify(originalSettings))
  }, [settings, originalSettings])

  const loadSettings = async () => {
    setIsLoading(true)
    setError(null)

    try {
      // Load all sync schedule settings
      const [
        enabledResult,
        hourResult,
        minuteResult,
        timezoneResult,
        batchSizeResult,
        rateLimitResult,
        timeoutResult,
        weekdaysOnlyResult,
        retryAttemptsResult,
        notifyOnFailureResult,
        notifyEmailsResult,
      ] = await Promise.all([
        getConfigValue<boolean>('sync_enabled', 'sync_schedule'),
        getConfigValue<number>('sync_hour', 'sync_schedule'),
        getConfigValue<number>('sync_minute', 'sync_schedule'),
        getConfigValue<string>('sync_timezone', 'sync_schedule'),
        getConfigValue<number>('sync_batch_size', 'sync_schedule'),
        getConfigValue<number>('sync_rate_limit_ms', 'sync_schedule'),
        getConfigValue<number>('sync_timeout_minutes', 'sync_schedule'),
        getConfigValue<boolean>('sync_weekdays_only', 'sync_schedule'),
        getConfigValue<number>('sync_retry_attempts', 'sync_schedule'),
        getConfigValue<boolean>('sync_notify_on_failure', 'sync_schedule'),
        getConfigValue<string[]>('sync_notify_emails', 'sync_schedule'),
      ])

      const loadedSettings: SyncScheduleSettings = {
        enabled: enabledResult.value ?? DEFAULT_SETTINGS.enabled,
        hour: hourResult.value ?? DEFAULT_SETTINGS.hour,
        minute: minuteResult.value ?? DEFAULT_SETTINGS.minute,
        timezone: timezoneResult.value ?? DEFAULT_SETTINGS.timezone,
        batchSize: batchSizeResult.value ?? DEFAULT_SETTINGS.batchSize,
        rateLimitMs: rateLimitResult.value ?? DEFAULT_SETTINGS.rateLimitMs,
        timeoutMinutes: timeoutResult.value ?? DEFAULT_SETTINGS.timeoutMinutes,
        weekdaysOnly: weekdaysOnlyResult.value ?? DEFAULT_SETTINGS.weekdaysOnly,
        retryAttempts: retryAttemptsResult.value ?? DEFAULT_SETTINGS.retryAttempts,
        notifyOnFailure: notifyOnFailureResult.value ?? DEFAULT_SETTINGS.notifyOnFailure,
        notifyEmails: notifyEmailsResult.value ?? DEFAULT_SETTINGS.notifyEmails,
      }

      setSettings(loadedSettings)
      setOriginalSettings(loadedSettings)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load sync settings')
    } finally {
      setIsLoading(false)
    }
  }

  const saveSettings = async () => {
    setIsSaving(true)
    setError(null)
    setSuccess(null)

    try {
      // Save all settings
      const savePromises = [
        setConfigValue('sync_enabled', 'sync_schedule', settings.enabled, 'Enable/disable automatic sync', user?.id),
        setConfigValue('sync_hour', 'sync_schedule', settings.hour, 'Sync schedule hour (0-23)', user?.id),
        setConfigValue('sync_minute', 'sync_schedule', settings.minute, 'Sync schedule minute (0-59)', user?.id),
        setConfigValue('sync_timezone', 'sync_schedule', settings.timezone, 'Sync schedule timezone', user?.id),
        setConfigValue('sync_batch_size', 'sync_schedule', settings.batchSize, 'Sync batch size', user?.id),
        setConfigValue('sync_rate_limit_ms', 'sync_schedule', settings.rateLimitMs, 'Rate limit delay in milliseconds', user?.id),
        setConfigValue('sync_timeout_minutes', 'sync_schedule', settings.timeoutMinutes, 'Sync timeout in minutes', user?.id),
        setConfigValue('sync_weekdays_only', 'sync_schedule', settings.weekdaysOnly, 'Run sync on weekdays only', user?.id),
        setConfigValue('sync_retry_attempts', 'sync_schedule', settings.retryAttempts, 'Number of retry attempts on failure', user?.id),
        setConfigValue('sync_notify_on_failure', 'sync_schedule', settings.notifyOnFailure, 'Send notifications on sync failure', user?.id),
        setConfigValue('sync_notify_emails', 'sync_schedule', settings.notifyEmails, 'Email addresses for failure notifications', user?.id),
      ]

      const results = await Promise.all(savePromises)
      const failedResults = results.filter(result => !result.success)

      if (failedResults.length > 0) {
        throw new Error(`Failed to save ${failedResults.length} settings: ${failedResults.map(r => r.error).join(', ')}`)
      }

      setOriginalSettings(settings)
      setSuccess('Sync schedule settings saved successfully')
      
      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(null), 3000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save sync settings')
    } finally {
      setIsSaving(false)
    }
  }

  const resetSettings = () => {
    setSettings(originalSettings)
    setError(null)
    setSuccess(null)
  }

  const formatScheduleTime = () => {
    const hour12 = settings.hour === 0 ? 12 : settings.hour > 12 ? settings.hour - 12 : settings.hour
    const ampm = settings.hour < 12 ? 'AM' : 'PM'
    const minute = settings.minute.toString().padStart(2, '0')
    return `${hour12}:${minute} ${ampm}`
  }

  const getNextSyncTime = () => {
    const now = new Date()
    const nextSync = new Date()
    nextSync.setHours(settings.hour, settings.minute, 0, 0)
    
    // If the time has passed today, schedule for tomorrow
    if (nextSync <= now) {
      nextSync.setDate(nextSync.getDate() + 1)
    }
    
    // If weekdays only, skip to next weekday
    if (settings.weekdaysOnly) {
      while (nextSync.getDay() === 0 || nextSync.getDay() === 6) {
        nextSync.setDate(nextSync.getDate() + 1)
      }
    }
    
    return nextSync
  }

  if (isLoading) {
    return (
      <Card className={className}>
        <CardContent className="pt-6">
          <div className="flex items-center justify-center">
            <Clock className="mr-2 h-4 w-4 animate-spin" />
            Loading sync settings...
          </div>
        </CardContent>
      </Card>
    )
  }

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

      {/* Current Schedule Status */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center">
            <Clock className="mr-2 h-5 w-5" />
            Current Schedule Status
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <div className="flex items-center justify-between rounded-lg border p-3">
              <div>
                <p className="text-sm font-medium text-gray-500">Status</p>
                <p className="text-lg font-semibold">
                  {settings.enabled ? (
                    <Badge variant="default" className="bg-green-100 text-green-800">
                      <Zap className="mr-1 h-3 w-3" />
                      Enabled
                    </Badge>
                  ) : (
                    <Badge variant="secondary">Disabled</Badge>
                  )}
                </p>
              </div>
            </div>

            <div className="flex items-center justify-between rounded-lg border p-3">
              <div>
                <p className="text-sm font-medium text-gray-500">Schedule</p>
                <p className="text-lg font-semibold">
                  {formatScheduleTime()}
                  {settings.weekdaysOnly && <span className="text-sm text-gray-500"> (weekdays)</span>}
                </p>
              </div>
            </div>

            <div className="flex items-center justify-between rounded-lg border p-3">
              <div>
                <p className="text-sm font-medium text-gray-500">Next Sync</p>
                <p className="text-sm font-medium">
                  {settings.enabled ? formatAustralianDateTime(getNextSyncTime()) : 'N/A'}
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Schedule Configuration */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Schedule Configuration</CardTitle>
          <CardDescription>
            Configure when automatic data synchronization should occur
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Enable/Disable */}
          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="sync-enabled"
              checked={settings.enabled}
              onChange={(e) => setSettings({ ...settings, enabled: e.target.checked })}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <Label htmlFor="sync-enabled" className="text-sm font-medium">
              Enable automatic sync
            </Label>
          </div>

          {/* Time Configuration */}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <div>
              <Label htmlFor="sync-hour">Hour (24-hour format)</Label>
              <Select
                value={settings.hour.toString()}
                onValueChange={(value) => setSettings({ ...settings, hour: parseInt(value) })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Array.from({ length: 24 }, (_, i) => (
                    <SelectItem key={i} value={i.toString()}>
                      {i.toString().padStart(2, '0')}:00 ({i === 0 ? 12 : i > 12 ? i - 12 : i} {i < 12 ? 'AM' : 'PM'})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="sync-minute">Minute</Label>
              <Select
                value={settings.minute.toString()}
                onValueChange={(value) => setSettings({ ...settings, minute: parseInt(value) })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[0, 15, 30, 45].map((minute) => (
                    <SelectItem key={minute} value={minute.toString()}>
                      {minute.toString().padStart(2, '0')}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="sync-timezone">
                <Globe className="mr-1 inline h-4 w-4" />
                Timezone
              </Label>
              <Select
                value={settings.timezone}
                onValueChange={(value) => setSettings({ ...settings, timezone: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TIMEZONE_OPTIONS.map((tz) => (
                    <SelectItem key={tz.value} value={tz.value}>
                      {tz.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Weekdays Only */}
          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="weekdays-only"
              checked={settings.weekdaysOnly}
              onChange={(e) => setSettings({ ...settings, weekdaysOnly: e.target.checked })}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <Label htmlFor="weekdays-only" className="text-sm font-medium">
              Run sync on weekdays only (Monday-Friday)
            </Label>
          </div>
        </CardContent>
      </Card>

      {/* Performance Configuration */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Performance Settings</CardTitle>
          <CardDescription>
            Configure sync performance and reliability settings
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <Label htmlFor="batch-size">Batch Size</Label>
              <Input
                id="batch-size"
                type="number"
                min="10"
                max="1000"
                value={settings.batchSize}
                onChange={(e) => setSettings({ ...settings, batchSize: parseInt(e.target.value) || 100 })}
              />
              <p className="text-xs text-gray-500 mt-1">
                Number of records to process per batch (10-1000)
              </p>
            </div>

            <div>
              <Label htmlFor="rate-limit">Rate Limit (ms)</Label>
              <Input
                id="rate-limit"
                type="number"
                min="100"
                max="10000"
                value={settings.rateLimitMs}
                onChange={(e) => setSettings({ ...settings, rateLimitMs: parseInt(e.target.value) || 1000 })}
              />
              <p className="text-xs text-gray-500 mt-1">
                Delay between API requests in milliseconds (100-10000)
              </p>
            </div>

            <div>
              <Label htmlFor="timeout">Timeout (minutes)</Label>
              <Input
                id="timeout"
                type="number"
                min="5"
                max="120"
                value={settings.timeoutMinutes}
                onChange={(e) => setSettings({ ...settings, timeoutMinutes: parseInt(e.target.value) || 30 })}
              />
              <p className="text-xs text-gray-500 mt-1">
                Maximum sync duration before timeout (5-120 minutes)
              </p>
            </div>

            <div>
              <Label htmlFor="retry-attempts">Retry Attempts</Label>
              <Input
                id="retry-attempts"
                type="number"
                min="1"
                max="10"
                value={settings.retryAttempts}
                onChange={(e) => setSettings({ ...settings, retryAttempts: parseInt(e.target.value) || 3 })}
              />
              <p className="text-xs text-gray-500 mt-1">
                Number of retry attempts on failure (1-10)
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Notification Settings */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Notification Settings</CardTitle>
          <CardDescription>
            Configure notifications for sync failures and issues
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="notify-failure"
              checked={settings.notifyOnFailure}
              onChange={(e) => setSettings({ ...settings, notifyOnFailure: e.target.checked })}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <Label htmlFor="notify-failure" className="text-sm font-medium">
              Send email notifications on sync failures
            </Label>
          </div>

          {settings.notifyOnFailure && (
            <div>
              <Label htmlFor="notify-emails">Notification Email Addresses</Label>
              <Input
                id="notify-emails"
                placeholder="admin@ausa.com.au, finance@ausa.com.au"
                value={settings.notifyEmails.join(', ')}
                onChange={(e) => setSettings({ 
                  ...settings, 
                  notifyEmails: e.target.value.split(',').map(email => email.trim()).filter(Boolean)
                })}
              />
              <p className="text-xs text-gray-500 mt-1">
                Comma-separated email addresses for failure notifications
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Action Buttons */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Button
            onClick={saveSettings}
            disabled={!hasChanges || isSaving}
            className="flex items-center"
          >
            {isSaving ? (
              <Clock className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Save className="mr-2 h-4 w-4" />
            )}
            {isSaving ? 'Saving...' : 'Save Settings'}
          </Button>

          {hasChanges && (
            <Button
              variant="outline"
              onClick={resetSettings}
              className="flex items-center"
            >
              <RotateCcw className="mr-2 h-4 w-4" />
              Reset
            </Button>
          )}
        </div>

        {hasChanges && (
          <Badge variant="outline" className="text-amber-600">
            Unsaved changes
          </Badge>
        )}
      </div>
    </div>
  )
}
