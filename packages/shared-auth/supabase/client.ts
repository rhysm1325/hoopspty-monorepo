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
      throw new Error('Supabase configuration is missing. Please check your environment variables.')
    }
  }
  
  // Check for placeholders at runtime only
  if (!isBuildTime && (url.includes('placeholder') || anonKey.includes('placeholder'))) {
    console.error('Using placeholder Supabase values at runtime:', { 
      url: url, 
      anonKey: anonKey.substring(0, 20) + '...' 
    })
    throw new Error('Supabase configuration is using placeholder values. Please check your environment variables in Vercel.')
  }
  
  console.log('Supabase client connecting to:', url)
  
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
