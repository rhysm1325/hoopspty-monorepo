// Tests for environment variable validation

import { validateEnv, validateEnvForStage } from '@/lib/validation/env'

// Store original env
const originalEnv = process.env

describe('Environment Validation', () => {
  beforeEach(() => {
    // Reset process.env for each test
    jest.resetModules()
    process.env = { ...originalEnv }
  })

  afterAll(() => {
    // Restore original env
    process.env = originalEnv
  })

  describe('validateEnv', () => {
    test('should pass with valid environment variables', () => {
      process.env = {
        ...process.env,
        NODE_ENV: 'development',
        NEXT_PUBLIC_SUPABASE_URL: 'https://test.supabase.co',
        NEXT_PUBLIC_SUPABASE_ANON_KEY: 'test-anon-key',
        SUPABASE_SERVICE_ROLE_KEY: 'test-service-role-key',
        XERO_CLIENT_ID: 'test-client-id',
        XERO_CLIENT_SECRET: 'test-client-secret',
        NEXTAUTH_SECRET: 'test-secret-key-that-is-long-enough-for-security',
        CRON_SECRET: 'test-cron-secret-key',
      }

      const result = validateEnv()
      expect(result.success).toBe(true)
      expect(result.data).toBeDefined()
      expect(result.errors).toHaveLength(0)
    })

    test('should fail with missing required variables', () => {
      process.env = {
        NODE_ENV: 'development',
        // Missing required Supabase and Xero variables
      }

      const result = validateEnv()
      expect(result.success).toBe(false)
      expect(result.errors.length).toBeGreaterThan(0)

      // Check that specific required fields are flagged
      const errorFields = result.errors.map(e => e.field)
      expect(errorFields).toContain('NEXT_PUBLIC_SUPABASE_URL')
      expect(errorFields).toContain('XERO_CLIENT_ID')
      expect(errorFields).toContain('NEXTAUTH_SECRET')
    })

    test('should fail with invalid URL formats', () => {
      process.env = {
        ...process.env,
        NEXT_PUBLIC_SUPABASE_URL: 'not-a-valid-url',
        NEXTAUTH_URL: 'also-not-valid',
      }

      const result = validateEnv()
      expect(result.success).toBe(false)

      const urlErrors = result.errors.filter(
        e => e.message.includes('Invalid') && e.message.includes('URL')
      )
      expect(urlErrors.length).toBeGreaterThan(0)
    })

    test('should apply default values correctly', () => {
      process.env = {
        ...process.env,
        NODE_ENV: 'development',
        NEXT_PUBLIC_SUPABASE_URL: 'https://test.supabase.co',
        NEXT_PUBLIC_SUPABASE_ANON_KEY: 'test-anon-key',
        SUPABASE_SERVICE_ROLE_KEY: 'test-service-role-key',
        XERO_CLIENT_ID: 'test-client-id',
        XERO_CLIENT_SECRET: 'test-client-secret',
        NEXTAUTH_SECRET: 'test-secret-key-that-is-long-enough-for-security',
        CRON_SECRET: 'test-cron-secret-key',
        // Don't set optional values to test defaults
      }

      const result = validateEnv()
      expect(result.success).toBe(true)

      if (result.data) {
        expect(result.data.DEFAULT_CURRENCY).toBe('AUD')
        expect(result.data.DEFAULT_TIMEZONE).toBe('Australia/Sydney')
        expect(result.data.FINANCIAL_YEAR_START_MONTH).toBe(7)
        expect(result.data.DEFAULT_GST_METHOD).toBe('accrual')
        expect(result.data.SYNC_SCHEDULE_HOUR).toBe(3)
        expect(result.data.SYNC_SCHEDULE_MINUTE).toBe(30)
      }
    })
  })

  describe('validateEnvForStage', () => {
    beforeEach(() => {
      // Set up valid base environment
      process.env = {
        ...process.env,
        NODE_ENV: 'development',
        NEXT_PUBLIC_SUPABASE_URL: 'https://test.supabase.co',
        NEXT_PUBLIC_SUPABASE_ANON_KEY: 'test-anon-key',
        SUPABASE_SERVICE_ROLE_KEY: 'test-service-role-key',
        XERO_CLIENT_ID: 'test-client-id',
        XERO_CLIENT_SECRET: 'test-client-secret',
        NEXTAUTH_SECRET: 'test-secret-key-that-is-long-enough-for-security',
        CRON_SECRET: 'test-cron-secret-key',
      }
    })

    test('should enforce production security requirements', () => {
      process.env.NODE_ENV = 'production'
      process.env.ENABLE_DEBUG_MODE = 'true'
      process.env.LOG_LEVEL = 'debug'

      const result = validateEnvForStage('production')
      expect(result.success).toBe(false)

      const securityErrors = result.errors.filter(
        e =>
          e.code === 'production_security' ||
          e.code === 'production_performance'
      )
      expect(securityErrors.length).toBeGreaterThan(0)
    })

    test('should pass production validation with proper config', () => {
      process.env.NODE_ENV = 'production'
      process.env.ENABLE_DEBUG_MODE = 'false'
      process.env.LOG_LEVEL = 'info'
      process.env.SENTRY_DSN = 'https://sentry.io/test'

      const result = validateEnvForStage('production')
      expect(result.success).toBe(true)
    })

    test('should allow debug mode in development', () => {
      process.env.NODE_ENV = 'development'
      process.env.ENABLE_DEBUG_MODE = 'true'
      process.env.LOG_LEVEL = 'debug'

      const result = validateEnvForStage('development')
      expect(result.success).toBe(true)
    })
  })

  describe('Business Configuration Validation', () => {
    test('should validate Australian financial year settings', () => {
      process.env = {
        ...process.env,
        FINANCIAL_YEAR_START_MONTH: '13', // Invalid month
        FINANCIAL_YEAR_START_DAY: '32', // Invalid day
      }

      const result = validateEnv()
      expect(result.success).toBe(false)

      const fyErrors = result.errors.filter(e =>
        e.field.includes('FINANCIAL_YEAR')
      )
      expect(fyErrors.length).toBeGreaterThan(0)
    })

    test('should validate sync schedule settings', () => {
      process.env = {
        ...process.env,
        SYNC_SCHEDULE_HOUR: '25', // Invalid hour
        SYNC_SCHEDULE_MINUTE: '70', // Invalid minute
        SYNC_BATCH_SIZE: '5', // Too small
      }

      const result = validateEnv()
      expect(result.success).toBe(false)

      const syncErrors = result.errors.filter(e => e.field.includes('SYNC_'))
      expect(syncErrors.length).toBeGreaterThan(0)
    })

    test('should validate currency and GST settings', () => {
      process.env = {
        ...process.env,
        DEFAULT_CURRENCY: 'INVALID', // Should be 3 characters
        DEFAULT_GST_METHOD: 'invalid', // Should be 'accrual' or 'cash'
      }

      const result = validateEnv()
      expect(result.success).toBe(false)

      const businessErrors = result.errors.filter(
        e =>
          e.field.includes('DEFAULT_CURRENCY') ||
          e.field.includes('DEFAULT_GST_METHOD')
      )
      expect(businessErrors.length).toBeGreaterThan(0)
    })
  })
})
