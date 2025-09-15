'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/hooks/useAuth'
import {
  getSessionInfo,
  refreshSession,
  formatTimeUntilExpiry,
  isSessionApproachingTimeout,
} from '@/lib/auth/session'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { AlertTriangle, RefreshCw, LogOut } from 'lucide-react'

export function SessionTimeoutWarning() {
  const { signOut } = useAuth()
  const [showWarning, setShowWarning] = useState(false)
  const [timeRemaining, setTimeRemaining] = useState<number>(0)
  const [isRefreshing, setIsRefreshing] = useState(false)

  useEffect(() => {
    let interval: NodeJS.Timeout

    const checkSession = async () => {
      try {
        const sessionInfo = await getSessionInfo()

        if (!sessionInfo.isValid) {
          // Session expired - sign out
          await signOut()
          return
        }

        const isApproaching = await isSessionApproachingTimeout()
        setShowWarning(isApproaching)

        if (isApproaching && sessionInfo.timeUntilExpiry) {
          setTimeRemaining(sessionInfo.timeUntilExpiry)
        }
      } catch (error) {
        console.error('Error checking session:', error)
      }
    }

    // Check session every 30 seconds
    interval = setInterval(checkSession, 30 * 1000)

    // Initial check
    checkSession()

    return () => {
      if (interval) {
        clearInterval(interval)
      }
    }
  }, [signOut])

  // Update countdown every second when warning is shown
  useEffect(() => {
    let countdown: NodeJS.Timeout

    if (showWarning && timeRemaining > 0) {
      countdown = setInterval(() => {
        setTimeRemaining(prev => {
          const newTime = prev - 1000
          if (newTime <= 0) {
            // Time's up - sign out
            signOut()
            return 0
          }
          return newTime
        })
      }, 1000)
    }

    return () => {
      if (countdown) {
        clearInterval(countdown)
      }
    }
  }, [showWarning, timeRemaining, signOut])

  const handleExtendSession = async () => {
    setIsRefreshing(true)
    try {
      const result = await refreshSession()
      if (result.success) {
        setShowWarning(false)
        setTimeRemaining(0)
      } else {
        console.error('Failed to refresh session:', result.error)
        await signOut()
      }
    } catch (error) {
      console.error('Error extending session:', error)
      await signOut()
    } finally {
      setIsRefreshing(false)
    }
  }

  const handleSignOut = async () => {
    setShowWarning(false)
    await signOut()
  }

  if (!showWarning) {
    return null
  }

  return (
    <Dialog open={showWarning} onOpenChange={() => {}}>
      <DialogContent
        className="sm:max-w-md"
        onPointerDownOutside={e => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle className="flex items-center text-amber-600">
            <AlertTriangle className="mr-2 h-5 w-5" />
            Session Timeout Warning
          </DialogTitle>
          <DialogDescription>
            Your session will expire soon for security reasons.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="rounded-md bg-amber-50 p-4">
            <div className="flex items-center">
              <AlertTriangle className="h-5 w-5 text-amber-400" />
              <div className="ml-3">
                <p className="text-sm text-amber-800">
                  <strong>Time remaining:</strong>{' '}
                  {formatTimeUntilExpiry(timeRemaining)}
                </p>
                <p className="mt-1 text-xs text-amber-600">
                  You will be automatically signed out when the timer reaches
                  zero.
                </p>
              </div>
            </div>
          </div>

          <div className="text-sm text-gray-600">
            <p>
              For security, financial dashboard sessions expire after a period
              of inactivity. You can extend your session or sign out now.
            </p>
          </div>
        </div>

        <DialogFooter className="flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2">
          <Button
            variant="outline"
            onClick={handleSignOut}
            disabled={isRefreshing}
            className="w-full sm:w-auto"
          >
            <LogOut className="mr-2 h-4 w-4" />
            Sign Out Now
          </Button>
          <Button
            onClick={handleExtendSession}
            disabled={isRefreshing}
            className="w-full sm:w-auto"
          >
            {isRefreshing ? (
              <>
                <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                Extending...
              </>
            ) : (
              <>
                <RefreshCw className="mr-2 h-4 w-4" />
                Extend Session
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
