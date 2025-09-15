import type { Metadata } from 'next'
import { Inter, JetBrains_Mono } from 'next/font/google'
import { AuthProvider } from '@/providers/auth-provider'
import './globals.css'

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
})

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-jetbrains-mono',
})

export const metadata: Metadata = {
  title: 'AUSA Finance Dashboard',
  description:
    'Australian financial year reporting and analytics for AUSA Hoops Pty Ltd',
  keywords: [
    'finance',
    'dashboard',
    'australian',
    'financial year',
    'reporting',
    'analytics',
  ],
  authors: [{ name: 'AUSA Hoops Pty Ltd' }],
  creator: 'AUSA Hoops Pty Ltd',
  publisher: 'AUSA Hoops Pty Ltd',
  robots: {
    index: false, // Private application
    follow: false,
  },
}

export const viewport = {
  width: 'device-width',
  initialScale: 1,
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className={`${inter.variable} ${jetbrainsMono.variable}`}>
      <body className="antialiased">
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  )
}
