// Supabase client configuration for AUSA Finance Dashboard

import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  // Access environment variables directly - Next.js injects these at build time
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  
  // During build or when missing, use safe defaults
  const isBuildTime = process.env.VERCEL_ENV || process.env.CI || typeof window === 'undefined'
  
  if (!url || !anonKey) {
    if (isBuildTime) {
      // During build, return a client with safe defaults
      console.warn('Using build-time Supabase defaults')
      return createBrowserClient(
        'https://build-time-placeholder.supabase.co',
        'build-time-placeholder-key'
      )
    } else {
      console.error('Supabase environment variables are missing at runtime')
      console.warn('⚠️  Using fallback Supabase configuration. Authentication features will be limited.')
      // Use fallback values instead of throwing
      return createBrowserClient(
        'https://fallback-placeholder.supabase.co',
        'fallback-placeholder-key'
      )
    }
  }
  
  // Check for placeholders at runtime only
  if (!isBuildTime && (url.includes('placeholder') || anonKey.includes('placeholder'))) {
    console.warn('Using placeholder Supabase values at runtime:', { 
      url: url, 
      anonKey: anonKey.substring(0, 20) + '...' 
    })
    // Instead of throwing, use fallback values and warn user
    console.warn('⚠️  Supabase not configured properly. Authentication features will be limited.')
  }
  
  console.log('Supabase client connecting to:', url)
  console.log('Environment check:', {
    hasUrl: !!url,
    hasAnonKey: !!anonKey,
    urlValue: url,
    anonKeyPrefix: anonKey?.substring(0, 20) + '...',
    isBuildTime,
    nodeEnv: process.env.NODE_ENV
  })
  
  return createBrowserClient(url, anonKey)
}

// Singleton client for browser usage
let supabaseClient: ReturnType<typeof createClient> | null = null

export function getSupabaseClient() {
  if (!supabaseClient) {
    supabaseClient = createClient()
  }
  return supabaseClient
}

// Export the client instance for convenience
export const supabase = getSupabaseClient()
