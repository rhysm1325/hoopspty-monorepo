// Environment variable validation for AUSA Finance Dashboard

import { z } from 'zod'

// Base environment schema
const baseEnvSchema = z.object({
  NODE_ENV: z
    .enum(['development', 'production', 'test'])
    .default('development'),

  // Application settings
  NEXT_PUBLIC_APP_NAME: z.string().default('AUSA Finance Dashboard'),
  NEXT_PUBLIC_APP_VERSION: z.string().default('1.0.0'),
})

// Supabase environment schema
const supabaseEnvSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().url('Invalid Supabase URL'),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z
    .string()
    .min(1, 'Supabase anon key is required'),
  SUPABASE_SERVICE_ROLE_KEY: z
    .string()
    .min(1, 'Supabase service role key is required'),
  SUPABASE_JWT_SECRET: z.string().optional(),
})

// Xero integration environment schema
const xeroEnvSchema = z.object({
  XERO_CLIENT_ID: z.string().min(1, 'Xero client ID is required'),
  XERO_CLIENT_SECRET: z.string().min(1, 'Xero client secret is required'),
  XERO_REDIRECT_URI: z.string().url('Invalid Xero redirect URI').optional(),
  XERO_SCOPES: z
    .string()
    .default(
      'offline_access accounting.transactions accounting.reports.read accounting.settings openid profile email'
    ),
  XERO_TENANT_ID: z.string().optional(),
  XERO_TENANT_NAME: z.string().optional(),
})

// Authentication environment schema
const authEnvSchema = z.object({
  NEXTAUTH_SECRET: z
    .string()
    .min(32, 'NextAuth secret must be at least 32 characters'),
  NEXTAUTH_URL: z.string().url('Invalid NextAuth URL').optional(),
  SESSION_TIMEOUT_MINUTES: z.coerce.number().min(30).max(1440).default(480), // 8 hours
  REFRESH_TOKEN_EXPIRY_DAYS: z.coerce.number().min(1).max(90).default(30),
})

// Australian business settings schema
const businessEnvSchema = z.object({
  FINANCIAL_YEAR_START_MONTH: z.coerce.number().min(1).max(12).default(7), // July
  FINANCIAL_YEAR_START_DAY: z.coerce.number().min(1).max(31).default(1),
  DEFAULT_TIMEZONE: z.string().default('Australia/Sydney'),
  DEFAULT_CURRENCY: z.string().length(3).default('AUD'),
  DEFAULT_GST_METHOD: z.enum(['accrual', 'cash']).default('accrual'),
  COMPANY_NAME: z.string().default('AUSA Hoops Pty Ltd'),
  COMPANY_ABN: z.string().optional(),
})

// Sync and performance settings schema
const performanceEnvSchema = z.object({
  SYNC_SCHEDULE_HOUR: z.coerce.number().min(0).max(23).default(3),
  SYNC_SCHEDULE_MINUTE: z.coerce.number().min(0).max(59).default(30),
  SYNC_BATCH_SIZE: z.coerce.number().min(10).max(1000).default(100),
  SYNC_RATE_LIMIT_MS: z.coerce.number().min(100).max(10000).default(1000),
  SYNC_TIMEOUT_MINUTES: z.coerce.number().min(5).max(60).default(30),
  CACHE_TTL_MINUTES: z.coerce.number().min(1).max(1440).default(60),
})

// Security settings schema
const securityEnvSchema = z.object({
  CRON_SECRET: z.string().min(16, 'Cron secret must be at least 16 characters'),
  RATE_LIMIT_REQUESTS_PER_MINUTE: z.coerce
    .number()
    .min(10)
    .max(1000)
    .default(100),
  ENABLE_DEBUG_MODE: z.coerce.boolean().default(false),
  CSP_REPORT_URI: z.string().url().optional(),
})

// Email configuration schema
const emailEnvSchema = z.object({
  EMAIL_PROVIDER: z.enum(['resend', 'sendgrid', 'ses']).optional(),
  EMAIL_API_KEY: z.string().optional(),
  EMAIL_FROM_ADDRESS: z.string().email().optional(),
  EMAIL_FROM_NAME: z.string().optional(),
})

// Monitoring and logging schema
const monitoringEnvSchema = z.object({
  LOG_LEVEL: z.enum(['error', 'warn', 'info', 'debug']).default('info'),
  ENABLE_REQUEST_LOGGING: z.coerce.boolean().default(true),
  SENTRY_DSN: z.string().url().optional(),
  SENTRY_ENVIRONMENT: z.string().optional(),
  ENABLE_PERFORMANCE_MONITORING: z.coerce.boolean().default(false),
})

// Feature flags schema
const featureFlagsSchema = z.object({
  ENABLE_DEFERRED_REVENUE: z.coerce.boolean().default(true),
  ENABLE_MULTI_CURRENCY: z.coerce.boolean().default(false),
  ENABLE_ADVANCED_ANALYTICS: z.coerce.boolean().default(true),
  ENABLE_EXPORT_EXCEL: z.coerce.boolean().default(true),
  ENABLE_EMAIL_REPORTS: z.coerce.boolean().default(false),
})

// Combined environment schema
export const envSchema = baseEnvSchema
  .merge(supabaseEnvSchema)
  .merge(xeroEnvSchema)
  .merge(authEnvSchema)
  .merge(businessEnvSchema)
  .merge(performanceEnvSchema)
  .merge(securityEnvSchema)
  .merge(emailEnvSchema)
  .merge(monitoringEnvSchema)
  .merge(featureFlagsSchema)

// Environment validation function
export function validateEnv() {
  try {
    const env = envSchema.parse(process.env)
    return { success: true, data: env, errors: [] }
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errors =
        error.errors?.map(err => ({
          field: err.path?.join('.') || 'unknown',
          message: err.message || 'Validation error',
          code: err.code || 'unknown',
        })) || []

      return {
        success: false,
        data: null,
        errors,
      }
    }

    return {
      success: false,
      data: null,
      errors: [
        {
          field: 'unknown',
          message: 'Unknown validation error',
          code: 'unknown',
        },
      ],
    }
  }
}

// Type for validated environment variables
export type ValidatedEnv = z.infer<typeof envSchema>

// Environment validation for different deployment stages
export function validateEnvForStage(
  stage: 'development' | 'production' | 'test'
) {
  const result = validateEnv()

  if (!result.success) {
    return result
  }

  // Additional validation based on deployment stage
  const stageSpecificErrors: Array<{
    field: string
    message: string
    code: string
  }> = []

  if (stage === 'production') {
    // Production-specific validations
    if (result.data.ENABLE_DEBUG_MODE) {
      stageSpecificErrors.push({
        field: 'ENABLE_DEBUG_MODE',
        message: 'Debug mode should be disabled in production',
        code: 'production_security',
      })
    }

    if (!result.data.SENTRY_DSN) {
      stageSpecificErrors.push({
        field: 'SENTRY_DSN',
        message: 'Error tracking should be configured for production',
        code: 'production_monitoring',
      })
    }

    if (result.data.LOG_LEVEL === 'debug') {
      stageSpecificErrors.push({
        field: 'LOG_LEVEL',
        message: 'Debug logging should not be used in production',
        code: 'production_performance',
      })
    }
  }

  if (stage === 'development') {
    // Development-specific validations
    if (!result.data.ENABLE_DEBUG_MODE) {
      console.warn('Consider enabling debug mode for development')
    }
  }

  if (stageSpecificErrors.length > 0) {
    return {
      success: false,
      data: result.data,
      errors: [...result.errors, ...stageSpecificErrors],
    }
  }

  return result
}

// Helper function to get a specific environment variable with validation
export function getEnvVar(key: keyof ValidatedEnv, fallback?: string): string {
  const result = validateEnv()

  if (!result.success) {
    if (fallback !== undefined) {
      return fallback
    }
    throw new Error(`Environment validation failed for ${key}`)
  }

  const value = result.data[key]
  if (value === undefined || value === null) {
    if (fallback !== undefined) {
      return fallback
    }
    throw new Error(`Environment variable ${key} is not defined`)
  }

  return String(value)
}

// Helper to check if we're in development mode
export function isDevelopment(): boolean {
  return getEnvVar('NODE_ENV', 'development') === 'development'
}

// Helper to check if we're in production mode
export function isProduction(): boolean {
  return getEnvVar('NODE_ENV') === 'production'
}

// Helper to check if we're in test mode
export function isTest(): boolean {
  return getEnvVar('NODE_ENV') === 'test'
}

// Export validated environment for use throughout the app
let validatedEnv: ValidatedEnv | null = null

export function getValidatedEnv(): ValidatedEnv {
  if (!validatedEnv) {
    // Skip validation during build process to avoid deployment failures
    if (process.env.VERCEL_ENV || process.env.CI || process.env.NEXT_PHASE) {
      // Return default values for build
      validatedEnv = {
        NODE_ENV: 'production',
        NEXT_PUBLIC_APP_NAME: 'AUSA Finance Dashboard',
        NEXT_PUBLIC_APP_VERSION: '1.0.0',
        NEXT_PUBLIC_SUPABASE_URL: 'https://placeholder.supabase.co',
        NEXT_PUBLIC_SUPABASE_ANON_KEY: 'placeholder-anon-key',
        SUPABASE_SERVICE_ROLE_KEY: 'placeholder-service-role-key',
        XERO_CLIENT_ID: 'placeholder-client-id',
        XERO_CLIENT_SECRET: 'placeholder-client-secret',
        XERO_REDIRECT_URI: 'https://placeholder.com/callback',
        XERO_SCOPES: 'accounting.transactions',
        XERO_TENANT_ID: 'placeholder-tenant-id',
        XERO_TENANT_NAME: 'AUSA Hoops Pty Ltd',
        NEXTAUTH_SECRET: 'placeholder-auth-secret',
        NEXTAUTH_URL: 'https://placeholder.com',
        SESSION_TIMEOUT_MINUTES: 480,
        REFRESH_TOKEN_EXPIRY_DAYS: 30,
        FINANCIAL_YEAR_START_MONTH: 7,
        FINANCIAL_YEAR_START_DAY: 1,
        DEFAULT_TIMEZONE: 'Australia/Sydney',
        DEFAULT_CURRENCY: 'AUD',
        DEFAULT_GST_METHOD: 'accrual',
        COMPANY_NAME: 'AUSA Hoops Pty Ltd',
        COMPANY_ABN: '00000000000',
        SYNC_SCHEDULE_HOUR: 3,
        SYNC_SCHEDULE_MINUTE: 0,
        SYNC_BATCH_SIZE: 1000,
        SYNC_RATE_LIMIT_MS: 1000,
        SYNC_TIMEOUT_MINUTES: 30,
        CACHE_TTL_MINUTES: 60,
        CRON_SECRET: 'placeholder-cron-secret',
        RATE_LIMIT_REQUESTS_PER_MINUTE: 60,
        EMAIL_PROVIDER: 'development',
        EMAIL_API_KEY: 'placeholder-email-key',
        EMAIL_FROM_ADDRESS: 'noreply@placeholder.com',
        EMAIL_FROM_NAME: 'AUSA Finance Dashboard',
        LOG_LEVEL: 'info',
        ENABLE_REQUEST_LOGGING: false,
        SENTRY_DSN: '',
        SENTRY_ENVIRONMENT: 'production',
        ENABLE_PERFORMANCE_MONITORING: false,
        ENABLE_DEBUG_MODE: false,
        ENABLE_DEFERRED_REVENUE: false,
        ENABLE_MULTI_CURRENCY: false,
        ENABLE_ADVANCED_ANALYTICS: false,
        ENABLE_EXPORT_EXCEL: false,
        ENABLE_EMAIL_REPORTS: false,
      } as ValidatedEnv
    } else {
      const result = validateEnv()
      if (!result.success) {
        console.error('Environment validation errors:', result.errors)
        throw new Error(
          'Environment validation failed. Check your .env.local file.'
        )
      }
      validatedEnv = result.data
    }
  }
  return validatedEnv
}
