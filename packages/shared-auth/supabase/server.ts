// Server-side Supabase client for AUSA Finance Dashboard

import { createServerClient as createSupabaseServerClient } from '@supabase/ssr'
import { config } from '@/lib/env'

export function createServerClient() {
  // Create a simplified client for build-time compatibility
  if (typeof window === 'undefined' && !process.env.NODE_ENV) {
    // During build, create a minimal client
    return createSupabaseServerClient(config.supabase.url, config.supabase.anonKey, {
      cookies: {
        getAll: () => [],
        setAll: () => {},
      },
    })
  }

  // For runtime server components, use dynamic import
  let cookieStore: any
  try {
    const { cookies } = require('next/headers')
    cookieStore = cookies()
  } catch {
    // Fallback for build-time
    return createSupabaseServerClient(config.supabase.url, config.supabase.anonKey, {
      cookies: {
        getAll: () => [],
        setAll: () => {},
      },
    })
  }

  return createSupabaseServerClient(config.supabase.url, config.supabase.anonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll()
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options)
          })
        } catch (error) {
          // The `setAll` method was called from a Server Component.
          // This can be ignored if you have middleware refreshing
          // user sessions.
        }
      },
    },
  })
}

export function createServiceRoleClient() {
  return createSupabaseServerClient(
    config.supabase.url,
    config.supabase.serviceRoleKey,
    {
      cookies: {
        getAll() {
          return []
        },
        setAll() {
          // No-op for service role client
        },
      },
    }
  )
}
