'use client'

import { useState, Suspense } from 'react'

// Force dynamic rendering to prevent build-time issues
export const dynamic = 'force-dynamic'
import { useRouter, useSearchParams } from 'next/navigation'
import { signInWithPassword } from '@/lib/auth/auth-client'
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
import { Badge } from '@/components/ui/badge'
import { Loader2, AlertCircle, Building2 } from 'lucide-react'

function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const redirectTo = searchParams.get('redirect') || '/dashboard'
  const errorParam = searchParams.get('error')

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setIsLoading(true)
    setError(null)

    const formData = new FormData(event.currentTarget)
    const email = formData.get('email') as string
    const password = formData.get('password') as string

    if (!email || !password) {
      setError('Please enter both email and password')
      setIsLoading(false)
      return
    }

    try {
      const result = await signInWithPassword({ email, password })

      if (!result.success) {
        setError(result.error || 'Login failed')
        setIsLoading(false)
        return
      }

      // Redirect to intended page or dashboard
      router.push(redirectTo)
      router.refresh()
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'An unexpected error occurred'
      )
      setIsLoading(false)
    }
  }

  const getErrorMessage = (errorCode: string | null) => {
    switch (errorCode) {
      case 'account_disabled':
        return 'Your account has been disabled. Please contact your administrator.'
      case 'insufficient_permissions':
        return 'You do not have permission to access that page.'
      case 'no_dashboard_access':
        return 'No dashboard access configured for your role.'
      case 'auth_error':
        return 'Authentication error. Please try logging in again.'
      default:
        return null
    }
  }

  const systemError = getErrorMessage(errorParam)

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4 py-12 sm:px-6 lg:px-8">
      <div className="w-full max-w-md space-y-8">
        {/* Header */}
        <div className="text-center">
          <div className="bg-primary-100 mx-auto flex h-12 w-12 items-center justify-center rounded-full">
            <Building2 className="text-primary-600 h-6 w-6" />
          </div>
          <h2 className="mt-6 text-3xl font-bold text-gray-900">
            AUSA Finance Dashboard
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            Australian Financial Year Reporting & Analytics
          </p>
          <Badge variant="outline" className="mt-2">
            Secure Access Portal
          </Badge>
        </div>

        {/* Login Form */}
        <Card>
          <CardHeader>
            <CardTitle>Sign in to your account</CardTitle>
            <CardDescription>
              Enter your email and password to access the financial dashboard
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* System Error Display */}
              {systemError && (
                <div className="rounded-md bg-red-50 p-4">
                  <div className="flex">
                    <AlertCircle className="h-5 w-5 text-red-400" />
                    <div className="ml-3">
                      <p className="text-sm text-red-800">{systemError}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Form Error Display */}
              {error && (
                <div className="rounded-md bg-red-50 p-4">
                  <div className="flex">
                    <AlertCircle className="h-5 w-5 text-red-400" />
                    <div className="ml-3">
                      <p className="text-sm text-red-800">{error}</p>
                    </div>
                  </div>
                </div>
              )}

              <div className="space-y-4">
                <div>
                  <Label htmlFor="email">Email address</Label>
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    required
                    placeholder="your.email@ausa.com.au"
                    className="mt-1"
                    disabled={isLoading}
                  />
                </div>

                <div>
                  <Label htmlFor="password">Password</Label>
                  <Input
                    id="password"
                    name="password"
                    type="password"
                    autoComplete="current-password"
                    required
                    placeholder="Enter your password"
                    className="mt-1"
                    disabled={isLoading}
                  />
                </div>
              </div>

              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Signing in...
                  </>
                ) : (
                  'Sign in'
                )}
              </Button>
            </form>

            {/* Help Text */}
            <div className="mt-6 text-center">
              <p className="text-sm text-gray-600">
                Need access?{' '}
                <span className="text-primary-600 font-medium">
                  Contact your administrator for an invitation
                </span>
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Footer */}
        <div className="text-center text-xs text-gray-500">
          <p>AUSA Hoops Pty Ltd • Australian Financial Year Reporting</p>
          <p className="mt-1">Secure authentication powered by Supabase</p>
        </div>
      </div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-screen">Loading...</div>}>
      <LoginForm />
    </Suspense>
  )
}
