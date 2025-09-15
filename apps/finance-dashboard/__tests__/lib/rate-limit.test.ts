// Tests for rate limiting functionality

import {
  checkRateLimit,
  checkLoginRateLimit,
  checkApiRateLimit,
  checkInviteRateLimit,
  getClientIP,
  createRateLimitHeaders,
  cleanupExpiredEntries,
} from '@/lib/auth/rate-limit'

// Mock Date.now for consistent testing
const mockNow = 1234567890000
const originalDateNow = Date.now
Date.now = jest.fn(() => mockNow)

describe('Rate Limiting', () => {
  beforeEach(() => {
    // Clean up rate limit store before each test
    cleanupExpiredEntries()
  })

  describe('checkRateLimit', () => {
    test('should allow requests within limit', () => {
      const config = { windowMs: 60000, maxRequests: 5 }

      // First request should be allowed
      const result1 = checkRateLimit('test-key', config)
      expect(result1.isAllowed).toBe(true)
      expect(result1.remaining).toBe(4)

      // Second request should be allowed
      const result2 = checkRateLimit('test-key', config)
      expect(result2.isAllowed).toBe(true)
      expect(result2.remaining).toBe(3)
    })

    test('should block requests when limit exceeded', () => {
      const config = { windowMs: 60000, maxRequests: 2 }

      // Use up the limit
      checkRateLimit('test-key-2', config)
      checkRateLimit('test-key-2', config)

      // Next request should be blocked
      const result = checkRateLimit('test-key-2', config)
      expect(result.isAllowed).toBe(false)
      expect(result.remaining).toBe(0)
    })

    test('should reset after time window', () => {
      const config = { windowMs: 1000, maxRequests: 1 }

      // Use up the limit
      const result1 = checkRateLimit('test-key-3', config)
      expect(result1.isAllowed).toBe(true)

      // Should be blocked
      const result2 = checkRateLimit('test-key-3', config)
      expect(result2.isAllowed).toBe(false)

      // Mock time passing
      Date.now = jest.fn(() => mockNow + 2000)

      // Should be allowed again after window expires
      const result3 = checkRateLimit('test-key-3', config)
      expect(result3.isAllowed).toBe(true)
    })
  })

  describe('checkLoginRateLimit', () => {
    test('should allow normal login attempts', () => {
      const result = checkLoginRateLimit('192.168.1.1')
      expect(result.isAllowed).toBe(true)
      expect(result.remaining).toBe(4) // 5 attempts - 1
    })

    test('should block after 5 attempts', () => {
      const ip = '192.168.1.2'

      // Use up all 5 attempts
      for (let i = 0; i < 5; i++) {
        checkLoginRateLimit(ip)
      }

      // 6th attempt should be blocked
      const result = checkLoginRateLimit(ip)
      expect(result.isAllowed).toBe(false)
    })
  })

  describe('checkApiRateLimit', () => {
    test('should allow normal API usage', () => {
      const result = checkApiRateLimit('user-123')
      expect(result.isAllowed).toBe(true)
      expect(result.remaining).toBe(99) // 100 requests - 1
    })

    test('should block after 100 requests per minute', () => {
      const userId = 'user-456'

      // Use up all 100 requests
      for (let i = 0; i < 100; i++) {
        checkApiRateLimit(userId)
      }

      // 101st request should be blocked
      const result = checkApiRateLimit(userId)
      expect(result.isAllowed).toBe(false)
    })
  })

  describe('checkInviteRateLimit', () => {
    test('should allow normal invitation usage', () => {
      const result = checkInviteRateLimit('admin-123')
      expect(result.isAllowed).toBe(true)
      expect(result.remaining).toBe(9) // 10 invites - 1
    })

    test('should block after 10 invitations per hour', () => {
      const adminId = 'admin-456'

      // Use up all 10 invitations
      for (let i = 0; i < 10; i++) {
        checkInviteRateLimit(adminId)
      }

      // 11th invitation should be blocked
      const result = checkInviteRateLimit(adminId)
      expect(result.isAllowed).toBe(false)
    })
  })

  describe('getClientIP', () => {
    test('should extract IP from x-forwarded-for header', () => {
      const mockRequest = {
        headers: {
          get: jest.fn((header: string) => {
            if (header === 'x-forwarded-for') return '192.168.1.1, 10.0.0.1'
            return null
          }),
        },
      } as any

      const ip = getClientIP(mockRequest)
      expect(ip).toBe('192.168.1.1')
    })

    test('should extract IP from x-real-ip header', () => {
      const mockRequest = {
        headers: {
          get: jest.fn((header: string) => {
            if (header === 'x-real-ip') return '192.168.1.2'
            return null
          }),
        },
      } as any

      const ip = getClientIP(mockRequest)
      expect(ip).toBe('192.168.1.2')
    })

    test('should return unknown for missing headers', () => {
      const mockRequest = {
        headers: {
          get: jest.fn(() => null),
        },
      } as any

      const ip = getClientIP(mockRequest)
      expect(ip).toBe('unknown')
    })
  })

  describe('createRateLimitHeaders', () => {
    test('should create correct rate limit headers', () => {
      const headers = createRateLimitHeaders(45, 1234567890, 100)

      expect(headers['X-RateLimit-Limit']).toBe('100')
      expect(headers['X-RateLimit-Remaining']).toBe('45')
      expect(headers['X-RateLimit-Reset']).toBe('1234568') // Rounded up
    })
  })

  describe('cleanupExpiredEntries', () => {
    test('should remove expired entries', () => {
      // Create some entries
      checkRateLimit('expired-key', { windowMs: 1000, maxRequests: 5 })
      checkRateLimit('valid-key', { windowMs: 60000, maxRequests: 5 })

      // Mock time passing beyond first entry's window
      Date.now = jest.fn(() => mockNow + 2000)

      // Cleanup should remove expired entries
      cleanupExpiredEntries()

      // Expired key should start fresh
      const result = checkRateLimit('expired-key', {
        windowMs: 60000,
        maxRequests: 5,
      })
      expect(result.remaining).toBe(4) // Fresh start
    })
  })
})
