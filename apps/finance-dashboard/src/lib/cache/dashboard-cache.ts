// Dashboard data caching strategy for AUSA Finance Dashboard
// Implements Redis-like caching with fallback to database storage

import { createServiceRoleClient } from '@/lib/supabase/server'
import { DASHBOARD_CACHE_TTL_MINUTES } from '@/constants/financial'

export interface CacheEntry<T = any> {
  key: string
  data: T
  expiresAt: Date
  createdAt: Date
  tags: string[]
  version: string
}

export interface CacheStats {
  totalEntries: number
  totalSize: number
  hitRate: number
  missRate: number
  expiredEntries: number
}

export interface DashboardCacheConfig {
  defaultTTL: number // minutes
  maxEntries: number
  enableCompression: boolean
  enableMetrics: boolean
}

/**
 * Dashboard cache implementation with database fallback
 * Provides intelligent caching for dashboard data between sync operations
 */
export class DashboardCache {
  private supabase = createServiceRoleClient()
  private memoryCache = new Map<string, CacheEntry>()
  private config: DashboardCacheConfig
  private stats = {
    hits: 0,
    misses: 0,
    sets: 0,
    evictions: 0,
  }

  constructor(config: Partial<DashboardCacheConfig> = {}) {
    this.config = {
      defaultTTL: config.defaultTTL || DASHBOARD_CACHE_TTL_MINUTES,
      maxEntries: config.maxEntries || 1000,
      enableCompression: config.enableCompression || false,
      enableMetrics: config.enableMetrics || true,
    }

    // Set up periodic cleanup
    setInterval(() => this.cleanup(), 5 * 60 * 1000) // Every 5 minutes
  }

  /**
   * Get data from cache with automatic fallback to database
   */
  async get<T>(key: string): Promise<T | null> {
    // Try memory cache first
    const memoryEntry = this.memoryCache.get(key)
    if (memoryEntry && memoryEntry.expiresAt > new Date()) {
      this.stats.hits++
      return memoryEntry.data as T
    }

    // Try database cache
    const { data: dbEntry, error } = await this.supabase
      .from('cache_entries')
      .select('*')
      .eq('key', key)
      .single()

    if (!error && dbEntry && new Date(dbEntry.expires_at) > new Date()) {
      // Cache hit in database - promote to memory
      const cacheEntry: CacheEntry<T> = {
        key: dbEntry.key,
        data: this.deserializeData(dbEntry.data),
        expiresAt: new Date(dbEntry.expires_at),
        createdAt: new Date(dbEntry.created_at),
        tags: dbEntry.tags || [],
        version: dbEntry.version || '1.0',
      }
      
      this.memoryCache.set(key, cacheEntry)
      this.stats.hits++
      return cacheEntry.data
    }

    this.stats.misses++
    return null
  }

  /**
   * Set data in cache with automatic expiration and tags
   */
  async set<T>(
    key: string, 
    data: T, 
    options: {
      ttlMinutes?: number
      tags?: string[]
      version?: string
    } = {}
  ): Promise<void> {
    const ttl = options.ttlMinutes || this.config.defaultTTL
    const expiresAt = new Date(Date.now() + ttl * 60 * 1000)
    const tags = options.tags || []
    const version = options.version || '1.0'

    const cacheEntry: CacheEntry<T> = {
      key,
      data,
      expiresAt,
      createdAt: new Date(),
      tags,
      version,
    }

    // Store in memory cache
    this.memoryCache.set(key, cacheEntry)
    
    // Enforce memory cache size limit
    if (this.memoryCache.size > this.config.maxEntries) {
      this.evictLRU()
    }

    // Store in database cache for persistence
    const serializedData = this.serializeData(data)
    
    await this.supabase
      .from('cache_entries')
      .upsert({
        key,
        data: serializedData,
        expires_at: expiresAt.toISOString(),
        tags,
        version,
        size_bytes: JSON.stringify(serializedData).length,
      })

    this.stats.sets++
  }

  /**
   * Get or compute data with caching
   */
  async getOrSet<T>(
    key: string,
    computeFn: () => Promise<T>,
    options: {
      ttlMinutes?: number
      tags?: string[]
      version?: string
    } = {}
  ): Promise<T> {
    const cached = await this.get<T>(key)
    if (cached !== null) {
      return cached
    }

    const data = await computeFn()
    await this.set(key, data, options)
    return data
  }

  /**
   * Invalidate cache entries by key pattern or tags
   */
  async invalidate(pattern: string | { tags?: string[]; keyPrefix?: string }): Promise<number> {
    let deletedCount = 0

    if (typeof pattern === 'string') {
      // Invalidate by key pattern
      const keysToDelete = Array.from(this.memoryCache.keys()).filter(key => 
        key.includes(pattern) || key.match(new RegExp(pattern))
      )
      
      keysToDelete.forEach(key => this.memoryCache.delete(key))
      deletedCount += keysToDelete.length

      // Delete from database
      const { count } = await this.supabase
        .from('cache_entries')
        .delete()
        .like('key', `%${pattern}%`)

      deletedCount += count || 0
    } else {
      // Invalidate by tags or key prefix
      if (pattern.tags && pattern.tags.length > 0) {
        // Memory cache invalidation by tags
        const keysToDelete = Array.from(this.memoryCache.entries())
          .filter(([_, entry]) => 
            entry.tags.some(tag => pattern.tags!.includes(tag))
          )
          .map(([key]) => key)
        
        keysToDelete.forEach(key => this.memoryCache.delete(key))
        deletedCount += keysToDelete.length

        // Database invalidation by tags
        const { count } = await this.supabase
          .from('cache_entries')
          .delete()
          .overlaps('tags', pattern.tags)

        deletedCount += count || 0
      }

      if (pattern.keyPrefix) {
        // Invalidate by key prefix
        const keysToDelete = Array.from(this.memoryCache.keys()).filter(key => 
          key.startsWith(pattern.keyPrefix!)
        )
        
        keysToDelete.forEach(key => this.memoryCache.delete(key))
        deletedCount += keysToDelete.length

        // Delete from database
        const { count } = await this.supabase
          .from('cache_entries')
          .delete()
          .like('key', `${pattern.keyPrefix}%`)

        deletedCount += count || 0
      }
    }

    return deletedCount
  }

  /**
   * Clear all cache entries
   */
  async clear(): Promise<void> {
    this.memoryCache.clear()
    
    await this.supabase
      .from('cache_entries')
      .delete()
      .neq('key', '') // Delete all entries
  }

  /**
   * Get cache statistics
   */
  async getStats(): Promise<CacheStats> {
    const memoryEntries = this.memoryCache.size
    const memorySize = Array.from(this.memoryCache.values())
      .reduce((total, entry) => total + JSON.stringify(entry.data).length, 0)

    const { data: dbStats } = await this.supabase
      .from('cache_entries')
      .select('key, size_bytes, expires_at')

    const dbEntries = dbStats?.length || 0
    const dbSize = dbStats?.reduce((total, entry) => total + (entry.size_bytes || 0), 0) || 0
    const expiredEntries = dbStats?.filter(entry => new Date(entry.expires_at) < new Date()).length || 0

    const totalRequests = this.stats.hits + this.stats.misses
    const hitRate = totalRequests > 0 ? (this.stats.hits / totalRequests) * 100 : 0
    const missRate = 100 - hitRate

    return {
      totalEntries: memoryEntries + dbEntries,
      totalSize: memorySize + dbSize,
      hitRate,
      missRate,
      expiredEntries,
    }
  }

  /**
   * Preload frequently accessed dashboard data
   */
  async preloadDashboardData(): Promise<void> {
    const preloadTasks = [
      this.preloadExecutiveSummary(),
      this.preloadRevenueStreamData(),
      this.preloadInventoryMetrics(),
      this.preloadCashFlowData(),
    ]

    await Promise.allSettled(preloadTasks)
  }

  /**
   * Create cache keys with consistent naming
   */
  static createKey(type: string, params: Record<string, any> = {}): string {
    const paramString = Object.keys(params)
      .sort()
      .map(key => `${key}:${params[key]}`)
      .join('|')
    
    return paramString ? `${type}:${paramString}` : type
  }

  /**
   * Get cache entry metadata
   */
  async getMetadata(key: string): Promise<{
    exists: boolean
    expiresAt?: Date
    createdAt?: Date
    tags?: string[]
    version?: string
    sizeBytes?: number
  }> {
    const memoryEntry = this.memoryCache.get(key)
    if (memoryEntry) {
      return {
        exists: true,
        expiresAt: memoryEntry.expiresAt,
        createdAt: memoryEntry.createdAt,
        tags: memoryEntry.tags,
        version: memoryEntry.version,
        sizeBytes: JSON.stringify(memoryEntry.data).length,
      }
    }

    const { data: dbEntry } = await this.supabase
      .from('cache_entries')
      .select('expires_at, created_at, tags, version, size_bytes')
      .eq('key', key)
      .single()

    if (dbEntry) {
      return {
        exists: true,
        expiresAt: new Date(dbEntry.expires_at),
        createdAt: new Date(dbEntry.created_at),
        tags: dbEntry.tags || [],
        version: dbEntry.version || '1.0',
        sizeBytes: dbEntry.size_bytes || 0,
      }
    }

    return { exists: false }
  }

  /**
   * Private methods
   */
  private cleanup(): void {
    const now = new Date()
    const expiredKeys = Array.from(this.memoryCache.entries())
      .filter(([_, entry]) => entry.expiresAt < now)
      .map(([key]) => key)

    expiredKeys.forEach(key => this.memoryCache.delete(key))

    // Clean up database entries (run periodically)
    this.supabase
      .from('cache_entries')
      .delete()
      .lt('expires_at', now.toISOString())
      .then(() => {
        console.log(`Cleaned up ${expiredKeys.length} expired cache entries`)
      })
  }

  private evictLRU(): void {
    // Simple LRU eviction - remove oldest entries
    const entries = Array.from(this.memoryCache.entries())
      .sort(([, a], [, b]) => a.createdAt.getTime() - b.createdAt.getTime())

    const toEvict = Math.floor(this.config.maxEntries * 0.1) // Evict 10%
    for (let i = 0; i < toEvict && entries.length > 0; i++) {
      this.memoryCache.delete(entries[i][0])
      this.stats.evictions++
    }
  }

  private serializeData(data: any): any {
    if (this.config.enableCompression) {
      // In a real implementation, you might use compression here
      return JSON.parse(JSON.stringify(data))
    }
    return data
  }

  private deserializeData(data: any): any {
    if (this.config.enableCompression) {
      // In a real implementation, you might decompress here
      return data
    }
    return data
  }

  private async preloadExecutiveSummary(): Promise<void> {
    try {
      const { data } = await this.supabase
        .from('fact_executive_summary')
        .select('*')
        .single()

      if (data) {
        await this.set('executive:summary', data, {
          ttlMinutes: 30,
          tags: ['executive', 'summary'],
        })
      }
    } catch (error) {
      console.warn('Failed to preload executive summary:', error)
    }
  }

  private async preloadRevenueStreamData(): Promise<void> {
    try {
      const { data } = await this.supabase
        .from('fact_revenue_by_week')
        .select('*')
        .order('fy_year', { ascending: false })
        .order('fy_week', { ascending: false })
        .limit(52) // Last 52 weeks

      if (data) {
        await this.set('revenue:weekly:recent', data, {
          ttlMinutes: 60,
          tags: ['revenue', 'weekly'],
        })
      }
    } catch (error) {
      console.warn('Failed to preload revenue stream data:', error)
    }
  }

  private async preloadInventoryMetrics(): Promise<void> {
    try {
      const { data } = await this.supabase
        .from('fact_inventory_summary')
        .select('*')

      if (data) {
        await this.set('inventory:summary', data, {
          ttlMinutes: 120, // Inventory changes less frequently
          tags: ['inventory', 'dr-dish'],
        })
      }
    } catch (error) {
      console.warn('Failed to preload inventory metrics:', error)
    }
  }

  private async preloadCashFlowData(): Promise<void> {
    try {
      const { data } = await this.supabase
        .from('fact_cash_flow_trends')
        .select('*')
        .order('date_key', { ascending: false })
        .limit(13) // Last 13 weeks

      if (data) {
        await this.set('cashflow:trends:13w', data, {
          ttlMinutes: 60,
          tags: ['cashflow', 'trends'],
        })
      }
    } catch (error) {
      console.warn('Failed to preload cash flow data:', error)
    }
  }
}

/**
 * Cache invalidation tags for different data types
 */
export const CacheTags = {
  EXECUTIVE: 'executive',
  REVENUE: 'revenue',
  INVENTORY: 'inventory',
  CASHFLOW: 'cashflow',
  CUSTOMERS: 'customers',
  SUPPLIERS: 'suppliers',
  DR_DISH: 'dr-dish',
  TOURS: 'tours',
  MARKETING: 'marketing',
  AGING: 'aging',
  PAYMENTS: 'payments',
} as const

/**
 * Pre-defined cache key patterns
 */
export const CacheKeys = {
  executiveSummary: () => 'executive:summary',
  revenueByWeek: (fyYear?: number) => 
    DashboardCache.createKey('revenue:weekly', fyYear ? { fyYear } : {}),
  revenueByQuarter: (fyYear?: number) => 
    DashboardCache.createKey('revenue:quarterly', fyYear ? { fyYear } : {}),
  inventorySummary: () => 'inventory:summary',
  customerPerformance: (segment?: string) => 
    DashboardCache.createKey('customers:performance', segment ? { segment } : {}),
  supplierPerformance: (category?: string) => 
    DashboardCache.createKey('suppliers:performance', category ? { category } : {}),
  cashFlowTrends: (weeks: number = 13) => 
    DashboardCache.createKey('cashflow:trends', { weeks }),
  agingAnalysis: (type: 'ar' | 'ap') => 
    DashboardCache.createKey('aging:analysis', { type }),
} as const

// Export singleton instance
export const dashboardCache = new DashboardCache()
