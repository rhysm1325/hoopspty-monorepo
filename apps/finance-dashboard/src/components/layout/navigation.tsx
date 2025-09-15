'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import { getAllowedDashboards } from '@/lib/auth/roles'
import { Button } from '@/components/ui/button'
import { RoleBadge } from '@/components/ui/role-badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet'
import {
  Building2,
  BarChart3,
  Plane,
  Gamepad2,
  Megaphone,
  DollarSign,
  CreditCard,
  Settings,
  RefreshCw,
  LogOut,
  Menu,
  User,
  Bell,
  ChevronDown,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import type { UserRole } from '@/types'

interface NavigationItem {
  label: string
  href: string
  icon: React.ComponentType<{ className?: string }>
  roles: UserRole[]
  description?: string
}

const navigationItems: NavigationItem[] = [
  {
    label: 'Executive',
    href: '/',
    icon: BarChart3,
    roles: ['owner', 'finance'],
    description: 'Cash, AR/AP, YTD revenue overview',
  },
  {
    label: 'Tours',
    href: '/tours',
    icon: Plane,
    roles: ['owner', 'finance', 'operations'],
    description: 'Seasonal revenue and tour bookings',
  },
  {
    label: 'Dr Dish',
    href: '/dr-dish',
    icon: Gamepad2,
    roles: ['owner', 'finance', 'sales'],
    description: 'Distribution and inventory management',
  },
  {
    label: 'Marketing',
    href: '/marketing',
    icon: Megaphone,
    roles: ['owner', 'finance', 'marketing'],
    description: 'Rebel Sport and marketing revenue',
  },
  {
    label: 'Receivables',
    href: '/ar',
    icon: DollarSign,
    roles: ['owner', 'finance', 'operations', 'sales'],
    description: 'Customer invoices and aging',
  },
  {
    label: 'Payables',
    href: '/ap',
    icon: CreditCard,
    roles: ['owner', 'finance'],
    description: 'Supplier bills and payments',
  },
  {
    label: 'Settings',
    href: '/settings',
    icon: Settings,
    roles: ['owner', 'finance'],
    description: 'System configuration and user management',
  },
  {
    label: 'Data Sync',
    href: '/sync',
    icon: RefreshCw,
    roles: ['owner', 'finance'],
    description: 'Xero synchronization and logs',
  },
]

export function Navigation() {
  const { user, isLoading, signOut } = useAuth()
  const pathname = usePathname()
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

  if (isLoading) {
    return (
      <nav className="border-b bg-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            <div className="flex items-center">
              <div className="h-8 w-8 animate-pulse rounded bg-gray-200" />
              <div className="ml-3 h-6 w-32 animate-pulse rounded bg-gray-200" />
            </div>
            <div className="h-8 w-8 animate-pulse rounded-full bg-gray-200" />
          </div>
        </div>
      </nav>
    )
  }

  if (!user) {
    return null
  }

  const allowedItems = navigationItems.filter(item =>
    item.roles.includes(user.role)
  )

  const userInitials =
    `${user.firstName?.[0] || ''}${user.lastName?.[0] || ''}`.trim() ||
    user.email[0]?.toUpperCase() ||
    'U'

  return (
    <nav className="border-b bg-white shadow-sm">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          {/* Logo and Company Name */}
          <div className="flex items-center">
            <Link href="/" className="flex items-center">
              <div className="bg-primary-600 flex h-8 w-8 items-center justify-center rounded-full text-white">
                <Building2 className="h-5 w-5" />
              </div>
              <div className="ml-3">
                <div className="text-lg font-semibold text-gray-900">
                  AUSA Finance
                </div>
                <div className="text-xs text-gray-500">Dashboard</div>
              </div>
            </Link>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden md:block">
            <div className="ml-10 flex items-baseline space-x-4">
              {allowedItems.map(item => {
                const isActive = pathname === item.href
                const Icon = item.icon

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      'flex items-center rounded-md px-3 py-2 text-sm font-medium transition-colors',
                      isActive
                        ? 'bg-primary-100 text-primary-700'
                        : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                    )}
                    title={item.description}
                  >
                    <Icon className="mr-2 h-4 w-4" />
                    {item.label}
                  </Link>
                )
              })}
            </div>
          </div>

          {/* User Menu */}
          <div className="flex items-center space-x-4">
            {/* Notifications (placeholder) */}
            <Button variant="ghost" size="sm" className="relative">
              <Bell className="h-4 w-4" />
              <span className="absolute -top-1 -right-1 h-2 w-2 rounded-full bg-red-500" />
            </Button>

            {/* User Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="flex items-center space-x-2">
                  <Avatar className="h-8 w-8">
                    <AvatarFallback className="bg-primary-100 text-primary-700">
                      {userInitials}
                    </AvatarFallback>
                  </Avatar>
                  <div className="hidden text-left md:block">
                    <div className="text-sm font-medium text-gray-900">
                      {user.firstName || user.email}
                    </div>
                    <div className="text-xs text-gray-500">
                      <RoleBadge role={user.role} size="sm" />
                    </div>
                  </div>
                  <ChevronDown className="h-4 w-4 text-gray-400" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm leading-none font-medium">
                      {user.firstName
                        ? `${user.firstName} ${user.lastName || ''}`
                        : user.email}
                    </p>
                    <p className="text-muted-foreground text-xs leading-none">
                      {user.email}
                    </p>
                    <RoleBadge role={user.role} size="sm" />
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link href="/profile" className="flex items-center">
                    <User className="mr-2 h-4 w-4" />
                    Profile Settings
                  </Link>
                </DropdownMenuItem>
                {user.role === 'owner' && (
                  <DropdownMenuItem asChild>
                    <Link href="/settings" className="flex items-center">
                      <Settings className="mr-2 h-4 w-4" />
                      System Settings
                    </Link>
                  </DropdownMenuItem>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => signOut()}
                  className="flex items-center text-red-600 focus:text-red-600"
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  Sign Out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Mobile Menu Button */}
            <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="sm" className="md:hidden">
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-80">
                <div className="flex flex-col space-y-4">
                  {/* Mobile User Info */}
                  <div className="flex items-center space-x-3 border-b pb-4">
                    <Avatar className="h-10 w-10">
                      <AvatarFallback className="bg-primary-100 text-primary-700">
                        {userInitials}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <div className="text-sm font-medium">
                        {user.firstName || user.email}
                      </div>
                      <div className="text-xs text-gray-500">{user.email}</div>
                      <RoleBadge role={user.role} size="sm" />
                    </div>
                  </div>

                  {/* Mobile Navigation Items */}
                  <div className="space-y-2">
                    {allowedItems.map(item => {
                      const isActive = pathname === item.href
                      const Icon = item.icon

                      return (
                        <Link
                          key={item.href}
                          href={item.href}
                          className={cn(
                            'flex items-center rounded-md p-3 text-sm font-medium transition-colors',
                            isActive
                              ? 'bg-primary-100 text-primary-700'
                              : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                          )}
                          onClick={() => setIsMobileMenuOpen(false)}
                        >
                          <Icon className="mr-3 h-5 w-5" />
                          <div>
                            <div>{item.label}</div>
                            <div className="text-xs text-gray-500">
                              {item.description}
                            </div>
                          </div>
                        </Link>
                      )
                    })}
                  </div>

                  {/* Mobile Sign Out */}
                  <div className="border-t pt-4">
                    <Button
                      variant="ghost"
                      onClick={() => signOut()}
                      className="w-full justify-start text-red-600 hover:text-red-600"
                    >
                      <LogOut className="mr-2 h-4 w-4" />
                      Sign Out
                    </Button>
                  </div>
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </div>
    </nav>
  )
}
