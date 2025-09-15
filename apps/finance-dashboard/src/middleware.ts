// Authentication middleware for AUSA Finance Dashboard

import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import type { UserRole } from '@/types'

// Safely get environment variables with fallbacks
function getEnvVar(key: string, fallback: string = ''): string {
  return process.env[key] || fallback
}

// Simple rate limiting without external dependencies
const rateLimitMap = new Map<string, { count: number; resetTime: number }>()

function checkSimpleRateLimit(key: string, limit: number, windowMs: number) {
  const now = Date.now()
  const current = rateLimitMap.get(key)
  
  if (!current || now > current.resetTime) {
    rateLimitMap.set(key, { count: 1, resetTime: now + windowMs })
    return { isAllowed: true, remaining: limit - 1, resetTime: now + windowMs }
  }
  
  if (current.count >= limit) {
    return { isAllowed: false, remaining: 0, resetTime: current.resetTime }
  }
  
  current.count++
  return { isAllowed: true, remaining: limit - current.count, resetTime: current.resetTime }
}

function getClientIP(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for')
  const realIp = request.headers.get('x-real-ip')
  
  if (forwarded) {
    return forwarded.split(',')[0]?.trim() || 'unknown'
  }
  
  return realIp || 'unknown'
}

export async function middleware(request: NextRequest) {
  try {
    const { pathname } = request.nextUrl
    const clientIP = getClientIP(request)

    // Rate limiting for login attempts (temporarily disabled for setup)
    if (pathname === '/api/auth/login' || pathname.includes('/login')) {
      // TODO: Re-enable rate limiting after initial setup
      console.log('Login attempt from:', clientIP, 'to:', pathname)
      // const loginRateLimit = checkSimpleRateLimit(clientIP, 5, 15 * 60 * 1000) // 5 attempts per 15 minutes
      // Rate limiting temporarily disabled for initial setup
    }

    let supabaseResponse = NextResponse.next({
      request,
    })

    // Get Supabase configuration safely
    const supabaseUrl = getEnvVar('NEXT_PUBLIC_SUPABASE_URL')
    const supabaseAnonKey = getEnvVar('NEXT_PUBLIC_SUPABASE_ANON_KEY')

    // If Supabase is not configured, allow requests to pass through
    if (!supabaseUrl || !supabaseAnonKey) {
      console.warn('Supabase not configured, skipping auth middleware')
      return supabaseResponse
    }

    const supabase = createServerClient(
      supabaseUrl,
      supabaseAnonKey,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll()
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) => {
              request.cookies.set(name, value)
              supabaseResponse.cookies.set(name, value, options)
            })
          },
        },
      }
    )

    // Refresh session if expired
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser()

    // Security headers for all responses
    supabaseResponse.headers.set('X-Frame-Options', 'DENY')
    supabaseResponse.headers.set('X-Content-Type-Options', 'nosniff')
    supabaseResponse.headers.set(
      'Referrer-Policy',
      'strict-origin-when-cross-origin'
    )
    supabaseResponse.headers.set('X-XSS-Protection', '1; mode=block')

    // Content Security Policy for financial application
    const csp = [
      "default-src 'self'",
      "script-src 'self' 'unsafe-eval' 'unsafe-inline' https://fonts.googleapis.com",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "font-src 'self' https://fonts.gstatic.com",
      "img-src 'self' data: https:",
      "connect-src 'self' https://*.supabase.co",
      "frame-ancestors 'none'",
    ].join('; ')
    supabaseResponse.headers.set('Content-Security-Policy', csp)

    // Public routes that don't require authentication
    const publicRoutes = [
      '/login',
      '/signup',
      '/invite',
      '/demo',
      '/api/auth',
      '/api/health',
    ]
    const isPublicRoute = publicRoutes.some(route => pathname.startsWith(route))

    // API routes that require authentication
    const protectedApiRoutes = [
      '/api/sync',
      '/api/dashboard',
      '/api/config',
      '/api/export',
    ]
    const isProtectedApiRoute = protectedApiRoutes.some(route =>
      pathname.startsWith(route)
    )

    // Dashboard routes (all require authentication)
    const isDashboardRoute = pathname.startsWith('/dashboard') || pathname === '/'

    // If user is not authenticated and trying to access protected route
    if (!user && (isDashboardRoute || isProtectedApiRoute)) {
      // Don't redirect if already on login page to prevent loops
      if (!pathname.includes('/login')) {
        const loginUrl = new URL('/login', request.url)
        loginUrl.searchParams.set('redirect', pathname)
        return NextResponse.redirect(loginUrl)
      }
    }

    // If user is authenticated and trying to access auth pages, redirect to dashboard
    if (user && isPublicRoute && !pathname.startsWith('/api/') && !pathname.includes('/login')) {
      return NextResponse.redirect(new URL('/', request.url))
    }

    // For authenticated users, check role-based permissions (simplified)
    if (user && (isDashboardRoute || isProtectedApiRoute)) {
      try {
        // Get user profile with role
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('role, is_active')
          .eq('id', user.id)
          .single()

        if (profileError || !profile) {
          console.error('Error fetching user profile:', profileError)
          // During setup, allow access without profile - don't redirect
          console.warn('User has no profile, allowing access for setup')
        } else {
          // Check if user is active
          if (!profile.is_active) {
            return NextResponse.redirect(
              new URL('/login?error=account_disabled', request.url)
            )
          }

          // Add user context to request headers for Server Actions
          supabaseResponse.headers.set('x-user-id', user.id)
          supabaseResponse.headers.set('x-user-role', profile.role || 'viewer')
          supabaseResponse.headers.set('x-user-email', user.email || '')
        }
      } catch (error) {
        console.error('Error in role-based auth:', error)
        // Continue with request but without role information
      }
    }

    // Rate limiting for API requests
    if (isProtectedApiRoute && user) {
      const apiRateLimit = checkSimpleRateLimit(`api-${user.id}`, 100, 60 * 1000) // 100 requests per minute

      if (!apiRateLimit.isAllowed) {
        const response = NextResponse.json(
          {
            error: 'API rate limit exceeded. Please slow down.',
            resetTime: apiRateLimit.resetTime,
          },
          { status: 429 }
        )

        response.headers.set('X-RateLimit-Limit', '100')
        response.headers.set('X-RateLimit-Remaining', apiRateLimit.remaining.toString())
        response.headers.set('X-RateLimit-Reset', apiRateLimit.resetTime.toString())

        return response
      }

      // Add rate limit headers to successful responses
      supabaseResponse.headers.set('X-RateLimit-Limit', '100')
      supabaseResponse.headers.set('X-RateLimit-Remaining', apiRateLimit.remaining.toString())
      supabaseResponse.headers.set('X-RateLimit-Reset', apiRateLimit.resetTime.toString())
    }

    // Add client IP to headers
    supabaseResponse.headers.set('x-client-ip', clientIP)

    // Log API requests for audit purposes (non-health checks)
    if (
      request.nextUrl.pathname.startsWith('/api/') &&
      !request.nextUrl.pathname.includes('/health')
    ) {
      console.log(
        `API ${request.method} ${request.nextUrl.pathname} - User: ${user?.email || 'anonymous'}`
      )
    }

    return supabaseResponse
  } catch (error) {
    console.error('Middleware error:', error)
    
    // For API routes, return JSON error
    if (request.nextUrl.pathname.startsWith('/api/')) {
      return NextResponse.json(
        { error: 'Internal server error' },
        { status: 500 }
      )
    }
    
    // For regular routes, allow the request to continue
    return NextResponse.next()
  }
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!_next/static|_next/image|favicon.ico|public/).*)',
  ],
}
