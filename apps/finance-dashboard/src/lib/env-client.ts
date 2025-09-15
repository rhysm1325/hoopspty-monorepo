// Client-side environment configuration for AUSA Finance Dashboard
// Safe for use in client components

// Safe client-side environment configuration
export const clientEnv = {
  NEXT_PUBLIC_APP_NAME: process.env.NEXT_PUBLIC_APP_NAME || 'AUSA Finance Dashboard',
  NEXT_PUBLIC_APP_VERSION: process.env.NEXT_PUBLIC_APP_VERSION || '1.0.0',
  NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL!,
  NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  NODE_ENV: process.env.NODE_ENV || 'production',
}

// Client-safe configuration
export const clientConfig = {
  app: {
    name: clientEnv.NEXT_PUBLIC_APP_NAME,
    version: clientEnv.NEXT_PUBLIC_APP_VERSION,
    env: clientEnv.NODE_ENV,
  },
  supabase: {
    url: clientEnv.NEXT_PUBLIC_SUPABASE_URL,
    anonKey: clientEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  },
} as const

export type ClientConfig = typeof clientConfig
