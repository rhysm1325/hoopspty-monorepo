'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { inviteUser } from '@/lib/auth/auth'
import { getAllRoles, canManageRole } from '@/lib/auth/roles'
import { useAuth } from '@/hooks/useAuth'
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
import { RoleBadge } from '@/components/ui/role-badge'
import { Loader2, AlertCircle, CheckCircle, UserPlus, Mail } from 'lucide-react'
import type { UserRole, InviteUserData } from '@/types'

export default function InvitePage() {
  const router = useRouter()
  const { user, hasPermission } = useAuth()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [formData, setFormData] = useState<InviteUserData>({
    email: '',
    role: 'operations',
    firstName: '',
    lastName: '',
  })

  // Check if user has permission to invite users
  if (!hasPermission('canManageUsers')) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle className="text-center text-red-600">
              Access Denied
            </CardTitle>
          </CardHeader>
          <CardContent className="text-center">
            <p>You do not have permission to invite users.</p>
            <Button className="mt-4" onClick={() => router.push('/')}>
              Return to Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setIsLoading(true)
    setError(null)
    setSuccess(null)

    if (!user) {
      setError('You must be logged in to invite users')
      setIsLoading(false)
      return
    }

    // Validate that current user can assign this role
    if (!canManageRole(user.role, formData.role)) {
      setError(`You cannot assign the ${formData.role} role`)
      setIsLoading(false)
      return
    }

    try {
      const result = await inviteUser(formData, user.id)

      if (!result.success) {
        setError(result.error || 'Invitation failed')
        setIsLoading(false)
        return
      }

      setSuccess(`Invitation sent successfully to ${formData.email}`)

      // Reset form
      setFormData({
        email: '',
        role: 'operations',
        firstName: '',
        lastName: '',
      })

      setIsLoading(false)
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'An unexpected error occurred'
      )
      setIsLoading(false)
    }
  }

  const availableRoles = getAllRoles().filter(roleData =>
    canManageRole(user?.role || 'marketing', roleData.role)
  )

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4 py-12 sm:px-6 lg:px-8">
      <div className="w-full max-w-md space-y-8">
        {/* Header */}
        <div className="text-center">
          <div className="bg-primary-100 mx-auto flex h-12 w-12 items-center justify-center rounded-full">
            <UserPlus className="text-primary-600 h-6 w-6" />
          </div>
          <h2 className="mt-6 text-3xl font-bold text-gray-900">
            Invite New User
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            Send an invitation to join the AUSA Finance Dashboard
          </p>
        </div>

        {/* Invitation Form */}
        <Card>
          <CardHeader>
            <CardTitle>User Invitation</CardTitle>
            <CardDescription>
              Invite a team member with appropriate role and permissions
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Success Message */}
              {success && (
                <div className="rounded-md bg-green-50 p-4">
                  <div className="flex">
                    <CheckCircle className="h-5 w-5 text-green-400" />
                    <div className="ml-3">
                      <p className="text-sm text-green-800">{success}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Error Message */}
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
                {/* Email */}
                <div>
                  <Label htmlFor="email">Email Address</Label>
                  <div className="relative mt-1">
                    <Mail className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 transform text-gray-400" />
                    <Input
                      id="email"
                      name="email"
                      type="email"
                      required
                      placeholder="colleague@ausa.com.au"
                      className="pl-9"
                      value={formData.email}
                      onChange={e =>
                        setFormData(prev => ({
                          ...prev,
                          email: e.target.value,
                        }))
                      }
                      disabled={isLoading}
                    />
                  </div>
                </div>

                {/* First Name */}
                <div>
                  <Label htmlFor="firstName">First Name</Label>
                  <Input
                    id="firstName"
                    name="firstName"
                    type="text"
                    placeholder="John"
                    className="mt-1"
                    value={formData.firstName}
                    onChange={e =>
                      setFormData(prev => ({
                        ...prev,
                        firstName: e.target.value,
                      }))
                    }
                    disabled={isLoading}
                  />
                </div>

                {/* Last Name */}
                <div>
                  <Label htmlFor="lastName">Last Name</Label>
                  <Input
                    id="lastName"
                    name="lastName"
                    type="text"
                    placeholder="Smith"
                    className="mt-1"
                    value={formData.lastName}
                    onChange={e =>
                      setFormData(prev => ({
                        ...prev,
                        lastName: e.target.value,
                      }))
                    }
                    disabled={isLoading}
                  />
                </div>

                {/* Role Selection */}
                <div>
                  <Label htmlFor="role">Role Assignment</Label>
                  <Select
                    value={formData.role}
                    onValueChange={value =>
                      setFormData(prev => ({
                        ...prev,
                        role: value as UserRole,
                      }))
                    }
                    disabled={isLoading}
                  >
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder="Select a role" />
                    </SelectTrigger>
                    <SelectContent>
                      {availableRoles.map(({ role, info }) => (
                        <SelectItem key={role} value={role}>
                          <div className="flex items-center gap-2">
                            <span>{info.label}</span>
                            <span className="text-xs text-gray-500">
                              - {info.description}
                            </span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  {/* Role Preview */}
                  <div className="mt-2 rounded-md bg-gray-50 p-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-gray-600">
                        Selected Role:
                      </span>
                      <RoleBadge role={formData.role} />
                    </div>
                    <p className="mt-1 text-xs text-gray-500">
                      Default access:{' '}
                      {
                        availableRoles.find(r => r.role === formData.role)?.info
                          .defaultDashboard
                      }
                    </p>
                  </div>
                </div>
              </div>

              <Button
                type="submit"
                className="w-full"
                disabled={isLoading || !formData.email}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Sending invitation...
                  </>
                ) : (
                  <>
                    <Mail className="mr-2 h-4 w-4" />
                    Send Invitation
                  </>
                )}
              </Button>
            </form>

            {/* Help Text */}
            <div className="mt-6 text-center">
              <p className="text-xs text-gray-500">
                The invited user will receive an email with setup instructions
                and will be automatically assigned the selected role and
                permissions.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Navigation */}
        <div className="text-center">
          <Button
            variant="outline"
            onClick={() => router.push('/')}
            className="w-full"
          >
            Return to Dashboard
          </Button>
        </div>
      </div>
    </div>
  )
}
