// Dashboard layout with role-based navigation

import { Navigation } from '@/components/layout/navigation'
import { SessionTimeoutWarning } from '@/components/layout/session-timeout-warning'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Dashboard - AUSA Finance',
  description: 'Australian financial year reporting and analytics dashboard',
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />
      <main className="py-6">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">{children}</div>
      </main>
      <SessionTimeoutWarning />
    </div>
  )
}
