'use client'

import { useState, useEffect, Suspense } from 'react'

// Force dynamic rendering to prevent build-time issues
export const dynamic = 'force-dynamic'
import { useRouter, useSearchParams } from 'next/navigation'
import { completeSignup, validatePassword } from '@/lib/auth/auth-client'
import { getRoleInfo } from '@/lib/auth/roles'
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
import { RoleBadge } from '@/components/ui/role-badge'
import { PasswordStrength } from '@/components/ui/password-strength'
import {
  Loader2,
  AlertCircle,
  CheckCircle,
  Building2,
  UserCheck,
} from 'lucide-react'
import type { UserRole } from '@/types'

function SignupPageContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [passwordErrors, setPasswordErrors] = useState<string[]>([])
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')

  const token = searchParams.get('token')
  const email = searchParams.get('email')
  const role = searchParams.get('role') as UserRole | null
  const firstName = searchParams.get('first_name')
  const lastName = searchParams.get('last_name')

  useEffect(() => {
    if (!token) {
      router.push('/login?error=invalid_invitation')
    }
  }, [token, router])

  useEffect(() => {
    if (password) {
      const validation = validatePassword(password)
      setPasswordErrors(validation.errors)
    } else {
      setPasswordErrors([])
    }
  }, [password])

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setIsLoading(true)
    setError(null)

    if (!token) {
      setError('Invalid invitation token')
      setIsLoading(false)
      return
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match')
      setIsLoading(false)
      return
    }

    const passwordValidation = validatePassword(password)
    if (!passwordValidation.isValid) {
      setError('Password does not meet security requirements')
      setPasswordErrors(passwordValidation.errors)
      setIsLoading(false)
      return
    }

    try {
      const result = await completeSignup(token, password)

      if (!result.success) {
        setError(result.error || 'Signup failed')
        setIsLoading(false)
        return
      }

      // Redirect to dashboard
      router.push('/')
      router.refresh()
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'An unexpected error occurred'
      )
      setIsLoading(false)
    }
  }

  if (!token) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle className="text-center text-red-600">
              Invalid Invitation
            </CardTitle>
          </CardHeader>
          <CardContent className="text-center">
            <p>This invitation link is invalid or has expired.</p>
            <Button className="mt-4" onClick={() => router.push('/login')}>
              Return to Login
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4 py-12 sm:px-6 lg:px-8">
      <div className="w-full max-w-md space-y-8">
        {/* Header */}
        <div className="text-center">
          <div className="bg-primary-100 mx-auto flex h-12 w-12 items-center justify-center rounded-full">
            <Building2 className="text-primary-600 h-6 w-6" />
          </div>
          <h2 className="mt-6 text-3xl font-bold text-gray-900">
            Complete Your Account
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            Welcome to AUSA Finance Dashboard
          </p>
          <div className="mt-2 flex flex-col items-center gap-2">
            {email && <Badge variant="outline">{email}</Badge>}
            {role && (
              <div className="flex items-center gap-2">
                <UserCheck className="h-4 w-4 text-gray-500" />
                <RoleBadge role={role} />
              </div>
            )}
          </div>
        </div>

        {/* Signup Form */}
        <Card>
          <CardHeader>
            <CardTitle>Set Your Password</CardTitle>
            <CardDescription>
              Create a secure password to complete your account setup
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Error Display */}
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
                  <Label htmlFor="password">New Password</Label>
                  <Input
                    id="password"
                    name="password"
                    type="password"
                    required
                    placeholder="Enter a secure password"
                    className="mt-1"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    disabled={isLoading}
                  />

                  {/* Enhanced Password Validation */}
                  <div className="mt-2">
                    <PasswordStrength
                      password={password}
                      showRequirements={true}
                      showStrengthBar={true}
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="confirmPassword">Confirm Password</Label>
                  <Input
                    id="confirmPassword"
                    name="confirmPassword"
                    type="password"
                    required
                    placeholder="Confirm your password"
                    className="mt-1"
                    value={confirmPassword}
                    onChange={e => setConfirmPassword(e.target.value)}
                    disabled={isLoading}
                  />

                  {/* Password Match Indicator */}
                  {confirmPassword && (
                    <div className="mt-1 flex items-center text-xs">
                      {password === confirmPassword ? (
                        <>
                          <CheckCircle className="mr-1 h-3 w-3 text-green-500" />
                          <span className="text-green-600">
                            Passwords match
                          </span>
                        </>
                      ) : (
                        <>
                          <AlertCircle className="mr-1 h-3 w-3 text-red-500" />
                          <span className="text-red-600">
                            Passwords do not match
                          </span>
                        </>
                      )}
                    </div>
                  )}
                </div>
              </div>

              <Button
                type="submit"
                className="w-full"
                disabled={
                  isLoading ||
                  passwordErrors.length > 0 ||
                  password !== confirmPassword
                }
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating account...
                  </>
                ) : (
                  'Complete Setup'
                )}
              </Button>
            </form>

            {/* Role-Specific Welcome */}
            {role && (
              <div className="mt-6 rounded-md bg-blue-50 p-4">
                <div className="flex">
                  <UserCheck className="h-5 w-5 text-blue-400" />
                  <div className="ml-3">
                    <p className="text-sm text-blue-800">
                      <strong>Welcome, {firstName || 'Team Member'}!</strong>
                    </p>
                    <p className="mt-1 text-xs text-blue-600">
                      You've been assigned the{' '}
                      <strong>{getRoleInfo(role).label}</strong> role.{' '}
                      {getRoleInfo(role).description}
                    </p>
                    <p className="mt-2 text-xs text-blue-600">
                      After setup, you'll have access to:{' '}
                      <strong>
                        {getRoleInfo(role).defaultDashboard === '/'
                          ? 'Executive Dashboard'
                          : getRoleInfo(role)
                              .defaultDashboard.replace('/', '')
                              .replace('-', ' ')}
                      </strong>
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Security Notice */}
            <div className="mt-4 rounded-md bg-green-50 p-4">
              <div className="flex">
                <CheckCircle className="h-5 w-5 text-green-400" />
                <div className="ml-3">
                  <p className="text-sm text-green-800">
                    <strong>Secure Setup</strong>
                  </p>
                  <p className="mt-1 text-xs text-green-600">
                    Your account has been pre-configured with appropriate access
                    permissions for the AUSA Finance Dashboard.
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Footer */}
        <div className="text-center text-xs text-gray-500">
          <p>AUSA Hoops Pty Ltd • Secure Financial Reporting</p>
          <p className="mt-1">Questions? Contact your system administrator</p>
        </div>
      </div>
    </div>
  )
}

function LoadingFallback() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50">
      <Card className="max-w-md">
        <CardContent className="flex items-center justify-center p-8">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <span className="ml-2">Loading...</span>
        </CardContent>
      </Card>
    </div>
  )
}

export default function SignupPage() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <SignupPageContent />
    </Suspense>
  )
}
