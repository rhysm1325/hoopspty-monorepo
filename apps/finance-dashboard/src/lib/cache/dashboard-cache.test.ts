// Unit tests for dashboard cache implementation

import { DashboardCache, CacheTags, CacheKeys } from './dashboard-cache'
import { createServiceRoleClient } from '@/lib/supabase/server'

// Mock Supabase client
jest.mock('@/lib/supabase/server', () => ({
  createServiceRoleClient: jest.fn(),
}))

const mockSupabase = {
  from: jest.fn().mockReturnThis(),
  select: jest.fn().mockReturnThis(),
  eq: jest.fn().mockReturnThis(),
  single: jest.fn().mockReturnThis(),
  upsert: jest.fn().mockReturnThis(),
  delete: jest.fn().mockReturnThis(),
  like: jest.fn().mockReturnThis(),
  neq: jest.fn().mockReturnThis(),
  overlaps: jest.fn().mockReturnThis(),
  lt: jest.fn().mockReturnThis(),
  order: jest.fn().mockReturnThis(),
  limit: jest.fn().mockReturnThis(),
}

beforeEach(() => {
  jest.clearAllMocks()
  jest.useFakeTimers()
  ;(createServiceRoleClient as jest.Mock).mockReturnValue(mockSupabase)
})

afterEach(() => {
  jest.useRealTimers()
})

describe('DashboardCache', () => {
  let cache: DashboardCache

  beforeEach(() => {
    cache = new DashboardCache({
      defaultTTL: 60,
      maxEntries: 100,
      enableCompression: false,
      enableMetrics: true,
    })
  })

  describe('get and set operations', () => {
    it('should store and retrieve data from memory cache', async () => {
      const testData = { revenue: 100000, invoices: 50 }
      
      await cache.set('test:key', testData, { ttlMinutes: 30 })
      const retrieved = await cache.get<typeof testData>('test:key')
      
      expect(retrieved).toEqual(testData)
      expect(mockSupabase.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          key: 'test:key',
          data: testData,
        })
      )
    })

    it('should return null for non-existent keys', async () => {
      mockSupabase.single.mockReturnValue({ data: null, error: { message: 'Not found' } })
      
      const result = await cache.get('non:existent:key')
      
      expect(result).toBeNull()
    })

    it('should retrieve data from database when not in memory', async () => {
      const testData = { customers: 25, revenue: 75000 }
      const futureDate = new Date(Date.now() + 60 * 60 * 1000) // 1 hour from now
      
      mockSupabase.single.mockReturnValue({
        data: {
          key: 'db:key',
          data: testData,
          expires_at: futureDate.toISOString(),
          created_at: new Date().toISOString(),
          tags: ['test'],
          version: '1.0',
        },
        error: null,
      })
      
      const result = await cache.get<typeof testData>('db:key')
      
      expect(result).toEqual(testData)
    })

    it('should not return expired data from database', async () => {
      const pastDate = new Date(Date.now() - 60 * 60 * 1000) // 1 hour ago
      
      mockSupabase.single.mockReturnValue({
        data: {
          key: 'expired:key',
          data: { test: 'data' },
          expires_at: pastDate.toISOString(),
          created_at: new Date().toISOString(),
        },
        error: null,
      })
      
      const result = await cache.get('expired:key')
      
      expect(result).toBeNull()
    })
  })

  describe('getOrSet operation', () => {
    it('should return cached data if available', async () => {
      const testData = { value: 'cached' }
      const computeFn = jest.fn().mockResolvedValue({ value: 'computed' })
      
      await cache.set('test:key', testData)
      const result = await cache.getOrSet('test:key', computeFn)
      
      expect(result).toEqual(testData)
      expect(computeFn).not.toHaveBeenCalled()
    })

    it('should compute and cache data if not available', async () => {
      const computedData = { value: 'computed' }
      const computeFn = jest.fn().mockResolvedValue(computedData)
      
      mockSupabase.single.mockReturnValue({ data: null, error: { message: 'Not found' } })
      
      const result = await cache.getOrSet('new:key', computeFn, { ttlMinutes: 30 })
      
      expect(result).toEqual(computedData)
      expect(computeFn).toHaveBeenCalledTimes(1)
      expect(mockSupabase.upsert).toHaveBeenCalled()
    })
  })

  describe('cache invalidation', () => {
    it('should invalidate cache entries by key pattern', async () => {
      // Set up memory cache entries
      await cache.set('revenue:2024', { value: 1 })
      await cache.set('revenue:2023', { value: 2 })
      await cache.set('inventory:summary', { value: 3 })
      
      mockSupabase.delete.mockReturnValue({ count: 2 })
      
      const deletedCount = await cache.invalidate('revenue')
      
      expect(deletedCount).toBe(4) // 2 from memory + 2 from database
      expect(mockSupabase.like).toHaveBeenCalledWith('key', '%revenue%')
    })

    it('should invalidate cache entries by tags', async () => {
      await cache.set('key1', { value: 1 }, { tags: ['revenue', 'current'] })
      await cache.set('key2', { value: 2 }, { tags: ['inventory'] })
      await cache.set('key3', { value: 3 }, { tags: ['revenue', 'historical'] })
      
      mockSupabase.delete.mockReturnValue({ count: 2 })
      
      const deletedCount = await cache.invalidate({ tags: ['revenue'] })
      
      expect(deletedCount).toBe(4) // 2 from memory + 2 from database
      expect(mockSupabase.overlaps).toHaveBeenCalledWith('tags', ['revenue'])
    })

    it('should invalidate cache entries by key prefix', async () => {
      await cache.set('dashboard:executive', { value: 1 })
      await cache.set('dashboard:tours', { value: 2 })
      await cache.set('inventory:summary', { value: 3 })
      
      mockSupabase.delete.mockReturnValue({ count: 2 })
      
      const deletedCount = await cache.invalidate({ keyPrefix: 'dashboard:' })
      
      expect(deletedCount).toBe(4) // 2 from memory + 2 from database
      expect(mockSupabase.like).toHaveBeenCalledWith('key', 'dashboard:%')
    })
  })

  describe('cache statistics', () => {
    it('should return accurate cache statistics', async () => {
      // Mock database stats
      mockSupabase.select.mockReturnValue({
        data: [
          { key: 'key1', size_bytes: 1000, expires_at: new Date(Date.now() + 60000).toISOString() },
          { key: 'key2', size_bytes: 2000, expires_at: new Date(Date.now() - 60000).toISOString() }, // Expired
          { key: 'key3', size_bytes: 1500, expires_at: new Date(Date.now() + 120000).toISOString() },
        ]
      })
      
      // Add some memory cache entries
      await cache.set('memory1', { data: 'test1' })
      await cache.set('memory2', { data: 'test2' })
      
      const stats = await cache.getStats()
      
      expect(stats.totalEntries).toBe(5) // 2 memory + 3 database
      expect(stats.expiredEntries).toBe(1)
      expect(stats.hitRate).toBeGreaterThanOrEqual(0)
      expect(stats.missRate).toBeGreaterThanOrEqual(0)
    })
  })

  describe('cache metadata', () => {
    it('should return metadata for existing memory cache entry', async () => {
      const testData = { value: 'test' }
      await cache.set('test:key', testData, { 
        ttlMinutes: 60, 
        tags: ['test'], 
        version: '2.0' 
      })
      
      const metadata = await cache.getMetadata('test:key')
      
      expect(metadata.exists).toBe(true)
      expect(metadata.tags).toEqual(['test'])
      expect(metadata.version).toBe('2.0')
      expect(metadata.sizeBytes).toBeGreaterThan(0)
    })

    it('should return metadata for database cache entry', async () => {
      mockSupabase.single.mockReturnValue({
        data: {
          expires_at: new Date(Date.now() + 60000).toISOString(),
          created_at: new Date().toISOString(),
          tags: ['db-test'],
          version: '1.5',
          size_bytes: 500,
        },
        error: null,
      })
      
      const metadata = await cache.getMetadata('db:key')
      
      expect(metadata.exists).toBe(true)
      expect(metadata.tags).toEqual(['db-test'])
      expect(metadata.version).toBe('1.5')
      expect(metadata.sizeBytes).toBe(500)
    })

    it('should return not exists for non-existent key', async () => {
      mockSupabase.single.mockReturnValue({ data: null, error: { message: 'Not found' } })
      
      const metadata = await cache.getMetadata('non:existent')
      
      expect(metadata.exists).toBe(false)
    })
  })

  describe('cache key creation', () => {
    it('should create consistent cache keys', () => {
      const key1 = DashboardCache.createKey('revenue', { fyYear: 2024, stream: 'tours' })
      const key2 = DashboardCache.createKey('revenue', { stream: 'tours', fyYear: 2024 })
      
      expect(key1).toBe(key2) // Should be same regardless of parameter order
      expect(key1).toBe('revenue:fyYear:2024|stream:tours')
    })

    it('should create keys without parameters', () => {
      const key = DashboardCache.createKey('summary')
      expect(key).toBe('summary')
    })
  })

  describe('predefined cache keys', () => {
    it('should generate executive summary key', () => {
      const key = CacheKeys.executiveSummary()
      expect(key).toBe('executive:summary')
    })

    it('should generate revenue by week key with parameters', () => {
      const key = CacheKeys.revenueByWeek(2024)
      expect(key).toBe('revenue:weekly:fyYear:2024')
    })

    it('should generate customer performance key with segment', () => {
      const key = CacheKeys.customerPerformance('tours')
      expect(key).toBe('customers:performance:segment:tours')
    })
  })

  describe('cache cleanup and eviction', () => {
    it('should evict LRU entries when max capacity is reached', async () => {
      const smallCache = new DashboardCache({ maxEntries: 3 })
      
      // Fill cache to capacity
      await smallCache.set('key1', { value: 1 })
      await smallCache.set('key2', { value: 2 })
      await smallCache.set('key3', { value: 3 })
      
      // Add one more to trigger eviction
      await smallCache.set('key4', { value: 4 })
      
      // Oldest entry should be evicted
      const result = await smallCache.get('key1')
      expect(result).toBeNull()
      
      // Newer entries should still exist
      const result4 = await smallCache.get('key4')
      expect(result4).toEqual({ value: 4 })
    })

    it('should clean up expired entries during periodic cleanup', () => {
      // Set up expired entry
      const expiredEntry = {
        key: 'expired:key',
        data: { value: 'expired' },
        expiresAt: new Date(Date.now() - 60000), // 1 minute ago
        createdAt: new Date(),
        tags: [],
        version: '1.0',
      }
      
      // Manually add expired entry to memory cache for testing
      ;(cache as any).memoryCache.set('expired:key', expiredEntry)
      
      // Trigger cleanup by advancing time and calling cleanup
      jest.advanceTimersByTime(5 * 60 * 1000) // 5 minutes
      
      // Cleanup should have removed expired entry
      expect((cache as any).memoryCache.has('expired:key')).toBe(false)
    })
  })

  describe('preload functionality', () => {
    it('should preload dashboard data without errors', async () => {
      // Mock successful responses for all preload queries
      mockSupabase.single.mockReturnValue({ data: { summary: 'data' }, error: null })
      mockSupabase.limit.mockReturnValue({ data: [{ weekly: 'data' }], error: null })
      mockSupabase.select.mockReturnValue({ data: [{ inventory: 'data' }], error: null })
      
      await expect(cache.preloadDashboardData()).resolves.not.toThrow()
      
      // Verify that data was cached
      expect(mockSupabase.upsert).toHaveBeenCalledTimes(4) // 4 preload operations
    })

    it('should handle preload failures gracefully', async () => {
      // Mock failed responses
      mockSupabase.single.mockReturnValue({ data: null, error: { message: 'Failed' } })
      mockSupabase.limit.mockReturnValue({ data: null, error: { message: 'Failed' } })
      mockSupabase.select.mockReturnValue({ data: null, error: { message: 'Failed' } })
      
      // Should not throw even if preload fails
      await expect(cache.preloadDashboardData()).resolves.not.toThrow()
    })
  })

  describe('cache tags', () => {
    it('should have all required cache tags defined', () => {
      expect(CacheTags.EXECUTIVE).toBe('executive')
      expect(CacheTags.REVENUE).toBe('revenue')
      expect(CacheTags.INVENTORY).toBe('inventory')
      expect(CacheTags.DR_DISH).toBe('dr-dish')
      expect(CacheTags.TOURS).toBe('tours')
      expect(CacheTags.MARKETING).toBe('marketing')
    })
  })
})
