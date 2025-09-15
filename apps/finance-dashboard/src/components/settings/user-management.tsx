'use client'

import { useState } from 'react'
import { useAuth } from '@/hooks/useAuth'
import {
  inviteUserAction,
  updateUserRoleAction,
  activateUserAction,
  deactivateUserAction,
} from '@/app/actions/auth-actions'
import { getManageableRoles, getAllRoles } from '@/lib/auth/roles'
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
import { DataTable } from '@/components/ui/data-table'
import { RoleBadge } from '@/components/ui/role-badge'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  UserPlus,
  Mail,
  Settings,
  UserCheck,
  UserX,
  AlertCircle,
  CheckCircle,
  MoreHorizontal,
  Eye,
  EyeOff,
} from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import type { UserRole, User } from '@/types'

interface UserManagementProps {
  users: User[]
  onUserUpdate: () => void
}

export function UserManagement({ users, onUserUpdate }: UserManagementProps) {
  const { user: currentUser, hasPermission } = useAuth()
  const [isInviteDialogOpen, setIsInviteDialogOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const [inviteForm, setInviteForm] = useState({
    email: '',
    firstName: '',
    lastName: '',
    role: 'operations' as UserRole,
  })

  if (!hasPermission('canManageUsers')) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center text-gray-500">
            <UserX className="mx-auto mb-2 h-8 w-8 text-gray-400" />
            <p>You do not have permission to manage users.</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  const handleInviteSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    setIsLoading(true)
    setError(null)
    setSuccess(null)

    const formData = new FormData()
    formData.append('email', inviteForm.email)
    formData.append('firstName', inviteForm.firstName)
    formData.append('lastName', inviteForm.lastName)
    formData.append('role', inviteForm.role)

    try {
      const result = await inviteUserAction(formData)

      if (!result.success) {
        setError(result.error || 'Invitation failed')
      } else {
        setSuccess(result.message || 'Invitation sent successfully')
        setInviteForm({
          email: '',
          firstName: '',
          lastName: '',
          role: 'operations',
        })
        setIsInviteDialogOpen(false)
        onUserUpdate()
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'An unexpected error occurred'
      )
    } finally {
      setIsLoading(false)
    }
  }

  const handleRoleUpdate = async (userId: string, newRole: UserRole) => {
    setIsLoading(true)
    setError(null)

    try {
      const result = await updateUserRoleAction(userId, newRole)

      if (!result.success) {
        setError(result.error || 'Role update failed')
      } else {
        setSuccess(result.message || 'Role updated successfully')
        onUserUpdate()
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'An unexpected error occurred'
      )
    } finally {
      setIsLoading(false)
    }
  }

  const handleUserActivation = async (userId: string, activate: boolean) => {
    setIsLoading(true)
    setError(null)

    try {
      const result = activate
        ? await activateUserAction(userId)
        : await deactivateUserAction(userId)

      if (!result.success) {
        setError(
          result.error || `${activate ? 'Activation' : 'Deactivation'} failed`
        )
      } else {
        setSuccess(
          result.message ||
            `User ${activate ? 'activated' : 'deactivated'} successfully`
        )
        onUserUpdate()
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'An unexpected error occurred'
      )
    } finally {
      setIsLoading(false)
    }
  }

  const userTableColumns = [
    { key: 'name', title: 'Name', sortable: true, type: 'text' as const },
    { key: 'email', title: 'Email', sortable: true, type: 'text' as const },
    { key: 'role', title: 'Role', type: 'badge' as const },
    { key: 'status', title: 'Status', type: 'status' as const },
    {
      key: 'lastLogin',
      title: 'Last Login',
      sortable: true,
      type: 'date' as const,
    },
    { key: 'actions', title: 'Actions', type: 'text' as const },
  ]

  const userTableData = users.map(user => ({
    id: user.id,
    name: `${user.firstName || ''} ${user.lastName || ''}`.trim() || 'No name',
    email: user.email,
    role: user.role,
    status: user.isActive ? 'active' : 'inactive',
    lastLogin: user.lastLoginAt,
    actions: user.id, // Used for action buttons
  }))

  const manageableRoles = getManageableRoles(currentUser?.role || 'marketing')

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">User Management</h2>
          <p className="text-gray-600">
            Manage team access to the finance dashboard
          </p>
        </div>

        <Dialog open={isInviteDialogOpen} onOpenChange={setIsInviteDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <UserPlus className="mr-2 h-4 w-4" />
              Invite User
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Invite New User</DialogTitle>
              <DialogDescription>
                Send an invitation to join the AUSA Finance Dashboard
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleInviteSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="firstName">First Name</Label>
                  <Input
                    id="firstName"
                    value={inviteForm.firstName}
                    onChange={e =>
                      setInviteForm(prev => ({
                        ...prev,
                        firstName: e.target.value,
                      }))
                    }
                    placeholder="John"
                    disabled={isLoading}
                  />
                </div>
                <div>
                  <Label htmlFor="lastName">Last Name</Label>
                  <Input
                    id="lastName"
                    value={inviteForm.lastName}
                    onChange={e =>
                      setInviteForm(prev => ({
                        ...prev,
                        lastName: e.target.value,
                      }))
                    }
                    placeholder="Smith"
                    disabled={isLoading}
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="email">Email Address</Label>
                <Input
                  id="email"
                  type="email"
                  required
                  value={inviteForm.email}
                  onChange={e =>
                    setInviteForm(prev => ({ ...prev, email: e.target.value }))
                  }
                  placeholder="colleague@ausa.com.au"
                  disabled={isLoading}
                />
              </div>

              <div>
                <Label htmlFor="role">Role</Label>
                <Select
                  value={inviteForm.role}
                  onValueChange={value =>
                    setInviteForm(prev => ({
                      ...prev,
                      role: value as UserRole,
                    }))
                  }
                  disabled={isLoading}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {getAllRoles()
                      .filter(roleData =>
                        manageableRoles.includes(roleData.role)
                      )
                      .map(({ role, info }) => (
                        <SelectItem key={role} value={role}>
                          {info.label} - {info.description}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsInviteDialogOpen(false)}
                  disabled={isLoading}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={isLoading || !inviteForm.email}>
                  {isLoading ? (
                    <>
                      <Mail className="mr-2 h-4 w-4 animate-pulse" />
                      Sending...
                    </>
                  ) : (
                    <>
                      <Mail className="mr-2 h-4 w-4" />
                      Send Invitation
                    </>
                  )}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Status Messages */}
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

      {/* Users Table */}
      <Card>
        <CardHeader>
          <CardTitle>Team Members</CardTitle>
          <CardDescription>
            Manage user roles and access permissions
          </CardDescription>
        </CardHeader>
        <CardContent>
          <DataTable
            columns={userTableColumns}
            data={userTableData}
            searchable
            exportable
            onRowClick={row => {
              // Could open user detail modal
            }}
            onExport={() => {
              // Export user list
            }}
          />
        </CardContent>
      </Card>
    </div>
  )
}
