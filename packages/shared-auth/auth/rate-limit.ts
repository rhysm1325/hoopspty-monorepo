// Rate limiting utilities for authentication and API protection

interface RateLimitConfig {
  windowMs: number // Time window in milliseconds
  maxRequests: number // Maximum requests per window
  keyGenerator?: (request: Request) => string // Custom key generator
}

interface RateLimitStore {
  [key: string]: {
    count: number
    resetTime: number
  }
}

// In-memory store for rate limiting (in production, use Redis)
const rateLimitStore: RateLimitStore = {}

/**
 * Check if a request should be rate limited
 */
export function checkRateLimit(
  identifier: string,
  config: RateLimitConfig
): { isAllowed: boolean; resetTime: number; remaining: number } {
  const now = Date.now()
  const key = identifier

  // Clean up expired entries
  if (rateLimitStore[key] && rateLimitStore[key].resetTime < now) {
    delete rateLimitStore[key]
  }

  // Initialize or get existing entry
  if (!rateLimitStore[key]) {
    rateLimitStore[key] = {
      count: 0,
      resetTime: now + config.windowMs,
    }
  }

  const entry = rateLimitStore[key]

  // Check if limit exceeded
  if (entry.count >= config.maxRequests) {
    return {
      isAllowed: false,
      resetTime: entry.resetTime,
      remaining: 0,
    }
  }

  // Increment counter
  entry.count++

  return {
    isAllowed: true,
    resetTime: entry.resetTime,
    remaining: config.maxRequests - entry.count,
  }
}

/**
 * Rate limit for login attempts (per IP)
 */
export function checkLoginRateLimit(ip: string) {
  return checkRateLimit(ip, {
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: 5, // 5 attempts per 15 minutes
  })
}

/**
 * Rate limit for API requests (per user)
 */
export function checkApiRateLimit(userId: string) {
  return checkRateLimit(userId, {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 100, // 100 requests per minute
  })
}

/**
 * Rate limit for invitation requests (per user)
 */
export function checkInviteRateLimit(userId: string) {
  return checkRateLimit(userId, {
    windowMs: 60 * 60 * 1000, // 1 hour
    maxRequests: 10, // 10 invitations per hour
  })
}

/**
 * Get client IP address from request
 */
export function getClientIP(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for')
  const realIP = request.headers.get('x-real-ip')
  const remoteAddress = request.headers.get('remote-addr')

  if (forwarded) {
    return forwarded.split(',')[0].trim()
  }

  return realIP || remoteAddress || 'unknown'
}

/**
 * Create rate limit headers for response
 */
export function createRateLimitHeaders(
  remaining: number,
  resetTime: number,
  limit: number
): Record<string, string> {
  return {
    'X-RateLimit-Limit': limit.toString(),
    'X-RateLimit-Remaining': remaining.toString(),
    'X-RateLimit-Reset': Math.ceil(resetTime / 1000).toString(),
  }
}

/**
 * Clean up expired rate limit entries (call periodically)
 */
export function cleanupExpiredEntries(): void {
  const now = Date.now()

  for (const key in rateLimitStore) {
    if (rateLimitStore[key].resetTime < now) {
      delete rateLimitStore[key]
    }
  }
}
