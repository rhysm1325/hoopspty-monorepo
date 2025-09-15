// Layout for authentication pages

import type { Metadata } from 'next'

// Force dynamic rendering for all auth pages
export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Authentication - AUSA Finance Dashboard',
  description: 'Secure access to AUSA Hoops financial reporting and analytics',
}

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <div className="min-h-screen bg-gray-50">{children}</div>
}
