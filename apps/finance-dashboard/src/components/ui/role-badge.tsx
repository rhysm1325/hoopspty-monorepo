// Role badge component for displaying user roles

import * as React from 'react'
import { Badge } from '@/components/ui/badge'
import { getRoleInfo, getRoleBadgeVariant } from '@/lib/auth/roles'
import type { UserRole } from '@/types'
import { cn } from '@/lib/utils'

export interface RoleBadgeProps {
  role: UserRole
  showDescription?: boolean
  size?: 'sm' | 'default' | 'lg'
  className?: string
}

const RoleBadge = React.forwardRef<HTMLSpanElement, RoleBadgeProps>(
  ({ role, showDescription = false, size = 'default', className }, ref) => {
    const roleInfo = getRoleInfo(role)
    const variant = getRoleBadgeVariant(role)

    const sizeClasses = {
      sm: 'text-xs px-2 py-0.5',
      default: 'text-sm px-2.5 py-0.5',
      lg: 'text-base px-3 py-1',
    }

    const colorClasses = {
      owner: 'bg-purple-100 text-purple-800 border-purple-200',
      finance: 'bg-blue-100 text-blue-800 border-blue-200',
      operations: 'bg-green-100 text-green-800 border-green-200',
      sales: 'bg-orange-100 text-orange-800 border-orange-200',
      marketing: 'bg-pink-100 text-pink-800 border-pink-200',
    }

    return (
      <Badge
        ref={ref}
        variant={variant}
        className={cn(
          sizeClasses[size],
          colorClasses[role],
          'font-medium',
          className
        )}
      >
        {showDescription
          ? `${roleInfo.label} - ${roleInfo.description}`
          : roleInfo.label}
      </Badge>
    )
  }
)
RoleBadge.displayName = 'RoleBadge'

export { RoleBadge }
