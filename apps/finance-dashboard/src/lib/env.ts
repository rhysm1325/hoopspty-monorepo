// Environment configuration for AUSA Finance Dashboard
// Server-side only - DO NOT import this file from client components

import {
  validateEnv,
  validateEnvForStage,
  getValidatedEnv,
  type ValidatedEnv,
} from './validation/env'

// Export the validated environment
export const env = getValidatedEnv()

// Validate environment on module load (server-side only)
// Skip validation during build process (VERCEL_ENV exists during builds)
if (typeof window === 'undefined' && !process.env.VERCEL_ENV && !process.env.CI && !process.env.NEXT_PHASE && process.env.NODE_ENV !== 'production') {
  try {
    const result = validateEnvForStage(env.NODE_ENV)

    if (!result.success) {
      console.error('❌ Environment validation failed:')
      result.errors.forEach(error => {
        console.error(`  - ${error.field}: ${error.message}`)
      })

      // In development, warn but continue - never fail
      console.warn(
        '⚠️  Continuing with invalid environment in development mode'
      )
    } else {
      console.log('✅ Environment validation passed')

      // Log important configuration in development
      if (env.NODE_ENV === 'development') {
        console.log('🔧 Development configuration:')
        console.log(
          `  - App: ${env.NEXT_PUBLIC_APP_NAME} v${env.NEXT_PUBLIC_APP_VERSION}`
        )
        console.log(`  - Company: ${env.COMPANY_NAME}`)
        console.log(
          `  - FY Start: ${env.FINANCIAL_YEAR_START_DAY}/${env.FINANCIAL_YEAR_START_MONTH}`
        )
        console.log(`  - Timezone: ${env.DEFAULT_TIMEZONE}`)
        console.log(`  - Currency: ${env.DEFAULT_CURRENCY}`)
        console.log(`  - GST Method: ${env.DEFAULT_GST_METHOD}`)
        console.log(
          `  - Sync Schedule: ${env.SYNC_SCHEDULE_HOUR}:${env.SYNC_SCHEDULE_MINUTE.toString().padStart(2, '0')} ${env.DEFAULT_TIMEZONE}`
        )
        console.log(
          `  - Debug Mode: ${env.ENABLE_DEBUG_MODE ? 'enabled' : 'disabled'}`
        )
      }
    }
  } catch (error) {
    // Silently continue if validation fails during build
    console.warn('⚠️  Environment validation skipped during build process')
  }
}

// Utility functions for accessing environment variables
export const config = {
  // Application
  app: {
    name: env.NEXT_PUBLIC_APP_NAME,
    version: env.NEXT_PUBLIC_APP_VERSION,
    env: env.NODE_ENV,
    debug: env.ENABLE_DEBUG_MODE,
  },

  // Supabase
  supabase: {
    url: env.NEXT_PUBLIC_SUPABASE_URL,
    anonKey: env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    serviceRoleKey: env.SUPABASE_SERVICE_ROLE_KEY,
  },

  // Xero
  xero: {
    clientId: env.XERO_CLIENT_ID,
    clientSecret: env.XERO_CLIENT_SECRET,
    redirectUri: env.XERO_REDIRECT_URI,
    scopes: env.XERO_SCOPES,
    tenantId: env.XERO_TENANT_ID,
    tenantName: env.XERO_TENANT_NAME,
  },

  // Authentication
  auth: {
    secret: env.NEXTAUTH_SECRET,
    url: env.NEXTAUTH_URL,
    sessionTimeout: env.SESSION_TIMEOUT_MINUTES,
    refreshTokenExpiry: env.REFRESH_TOKEN_EXPIRY_DAYS,
  },

  // Australian business settings
  business: {
    fyStartMonth: env.FINANCIAL_YEAR_START_MONTH,
    fyStartDay: env.FINANCIAL_YEAR_START_DAY,
    timezone: env.DEFAULT_TIMEZONE,
    currency: env.DEFAULT_CURRENCY,
    gstMethod: env.DEFAULT_GST_METHOD,
    companyName: env.COMPANY_NAME,
    companyABN: env.COMPANY_ABN,
  },

  // Sync and performance
  sync: {
    scheduleHour: env.SYNC_SCHEDULE_HOUR,
    scheduleMinute: env.SYNC_SCHEDULE_MINUTE,
    batchSize: env.SYNC_BATCH_SIZE,
    rateLimitMs: env.SYNC_RATE_LIMIT_MS,
    timeoutMinutes: env.SYNC_TIMEOUT_MINUTES,
  },

  // Caching
  cache: {
    ttlMinutes: env.CACHE_TTL_MINUTES,
  },

  // Security
  security: {
    cronSecret: env.CRON_SECRET,
    rateLimitRpm: env.RATE_LIMIT_REQUESTS_PER_MINUTE,
  },

  // Email
  email: {
    provider: env.EMAIL_PROVIDER,
    apiKey: env.EMAIL_API_KEY,
    fromAddress: env.EMAIL_FROM_ADDRESS,
    fromName: env.EMAIL_FROM_NAME,
  },

  // Monitoring
  monitoring: {
    logLevel: env.LOG_LEVEL,
    enableRequestLogging: env.ENABLE_REQUEST_LOGGING,
    sentryDsn: env.SENTRY_DSN,
    sentryEnvironment: env.SENTRY_ENVIRONMENT,
    enablePerformanceMonitoring: env.ENABLE_PERFORMANCE_MONITORING,
  },

  // Feature flags
  features: {
    deferredRevenue: env.ENABLE_DEFERRED_REVENUE,
    multiCurrency: env.ENABLE_MULTI_CURRENCY,
    advancedAnalytics: env.ENABLE_ADVANCED_ANALYTICS,
    exportExcel: env.ENABLE_EXPORT_EXCEL,
    emailReports: env.ENABLE_EMAIL_REPORTS,
  },
} as const

// Export types
export type Config = typeof config
export type { ValidatedEnv }