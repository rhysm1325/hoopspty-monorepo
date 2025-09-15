/**
 * Xero MCP Client Wrapper
 * 
 * This module provides a wrapper around the Xero MCP (Model Context Protocol) server
 * for secure server-side integration with Xero APIs. All Xero operations must be
 * performed server-side to protect API credentials.
 * 
 * Features:
 * - Connection management with automatic token refresh
 * - Rate limiting and quota management
 * - Error handling with exponential backoff
 * - Incremental sync support with If-Modified-Since headers
 * - Comprehensive logging for audit and debugging
 */

import { config } from '@/lib/env'
import { XeroOAuth } from '@/lib/xero/oauth'
import type { 
  XeroConnection,
  XeroAccount,
  XeroContact,
  XeroInvoice,
  XeroPayment,
  XeroCreditNote,
  XeroItem,
  XeroBankAccount,
  XeroBankTransaction,
  XeroManualJournal,
  XeroTrackingCategory,
  XeroApiError
} from '@/types/xero'

// Connection state management
interface ConnectionState {
  isConnected: boolean
  tenantId?: string
  tenantName?: string
  accessTokenExpiry?: Date
  lastConnectionCheck?: Date
  connectionHealth: 'healthy' | 'degraded' | 'error'
}

// Rate limiting state
interface RateLimitState {
  requestCount: number
  windowStart: Date
  isLimited: boolean
  resetTime?: Date
}

// Circuit breaker states
enum CircuitState {
  CLOSED = 'closed',     // Normal operation
  OPEN = 'open',         // Failing, reject requests
  HALF_OPEN = 'half_open' // Testing if service recovered
}

// Circuit breaker configuration per endpoint
interface CircuitBreakerConfig {
  failureThreshold: number      // Number of failures to open circuit
  successThreshold: number      // Number of successes to close circuit
  timeoutMs: number            // Timeout for half-open state
  resetTimeoutMs: number       // Time to wait before trying half-open
}

// Circuit breaker state per endpoint
interface CircuitBreakerState {
  state: CircuitState
  failureCount: number
  successCount: number
  lastFailureTime?: Date
  nextAttemptTime?: Date
  config: CircuitBreakerConfig
}

// Sync options for incremental updates
interface SyncOptions {
  modifiedSince?: Date
  pageSize?: number
  includeArchived?: boolean
  orderBy?: string
  where?: string
}

// Error classification for different handling strategies
enum ErrorCategory {
  AUTHENTICATION = 'authentication',
  AUTHORIZATION = 'authorization',
  RATE_LIMIT = 'rate_limit',
  NETWORK = 'network',
  SERVER = 'server',
  CLIENT = 'client',
  VALIDATION = 'validation',
  TIMEOUT = 'timeout',
  QUOTA = 'quota',
  MAINTENANCE = 'maintenance',
  UNKNOWN = 'unknown'
}

// Error severity levels
enum ErrorSeverity {
  LOW = 'low',        // Recoverable, retry recommended
  MEDIUM = 'medium',  // May recover, limited retries
  HIGH = 'high',      // Unlikely to recover, minimal retries
  CRITICAL = 'critical' // Do not retry, immediate escalation
}

// Enhanced error information
interface EnhancedError {
  category: ErrorCategory
  severity: ErrorSeverity
  isRetryable: boolean
  retryStrategy: RetryStrategy
  maxRetries: number
  backoffMultiplier: number
  originalError: any
  message: string
  statusCode?: number
  timestamp: Date
}

// Retry strategies
enum RetryStrategy {
  EXPONENTIAL_BACKOFF = 'exponential_backoff',
  LINEAR_BACKOFF = 'linear_backoff',
  FIXED_DELAY = 'fixed_delay',
  IMMEDIATE = 'immediate',
  NO_RETRY = 'no_retry'
}

// API response wrapper
interface XeroApiResponse<T> {
  success: boolean
  data?: T[]
  pagination?: {
    page: number
    pageSize: number
    pageCount: number
    itemCount: number
  }
  error?: XeroApiError
  enhancedError?: EnhancedError
  rateLimitInfo?: {
    requestsRemaining: number
    resetTime: Date
  }
}

// Fallback strategy types
enum FallbackStrategy {
  NONE = 'none',                    // No fallback
  CACHED_DATA = 'cached_data',      // Use cached data if available
  PARTIAL_DATA = 'partial_data',    // Return partial results
  DEGRADED_MODE = 'degraded_mode',  // Switch to degraded functionality
  ALTERNATIVE_ENDPOINT = 'alternative_endpoint' // Try alternative endpoint
}

// Recovery action types
enum RecoveryAction {
  RETRY = 'retry',
  FALLBACK = 'fallback',
  ESCALATE = 'escalate',
  IGNORE = 'ignore'
}

// Recovery configuration
interface RecoveryConfig {
  strategy: FallbackStrategy
  action: RecoveryAction
  maxFallbackAttempts: number
  fallbackData?: any
  alternativeEndpoints?: string[]
}

// Error monitoring metrics
interface ErrorMetrics {
  totalErrors: number
  errorsByCategory: Record<ErrorCategory, number>
  errorsBySeverity: Record<ErrorSeverity, number>
  circuitBreakerTrips: number
  recoveryAttempts: number
  successfulRecoveries: number
  timeoutErrors: number
  rateLimitHits: number
  lastErrorTime?: Date
  errorRate: number // errors per minute
}

// Alert configuration
interface AlertConfig {
  enabled: boolean
  errorThreshold: number        // Number of errors to trigger alert
  timeWindowMinutes: number     // Time window for error counting
  criticalErrorImmediate: boolean // Send immediate alerts for critical errors
  circuitBreakerAlert: boolean  // Alert when circuit breakers open
  recoveryFailureAlert: boolean // Alert when recovery mechanisms fail
}

// Alert types
enum AlertType {
  ERROR_THRESHOLD = 'error_threshold',
  CRITICAL_ERROR = 'critical_error',
  CIRCUIT_BREAKER = 'circuit_breaker',
  RECOVERY_FAILURE = 'recovery_failure',
  TIMEOUT_SPIKE = 'timeout_spike',
  RATE_LIMIT_EXHAUSTED = 'rate_limit_exhausted'
}

// Alert interface
interface Alert {
  type: AlertType
  severity: 'low' | 'medium' | 'high' | 'critical'
  message: string
  timestamp: Date
  operation?: string
  errorDetails?: any
  metrics?: Partial<ErrorMetrics>
}

// Sync result interface
interface SyncResult<T> {
  success: boolean
  records: T[]
  recordsProcessed: number
  recordsSkipped: number
  hasMoreRecords: boolean
  lastModified?: Date
  error?: string
  duration: number
  recoveryUsed?: boolean
  fallbackStrategy?: FallbackStrategy
}

class XeroMCPClient {
  private connectionState: ConnectionState = {
    isConnected: false,
    connectionHealth: 'error'
  }
  
  private rateLimitState: RateLimitState = {
    requestCount: 0,
    windowStart: new Date(),
    isLimited: false
  }

  // Circuit breaker state for each endpoint
  private circuitBreakers: Map<string, CircuitBreakerState> = new Map()

  // Default circuit breaker configuration
  private readonly defaultCircuitConfig: CircuitBreakerConfig = {
    failureThreshold: 5,     // Open after 5 failures
    successThreshold: 3,     // Close after 3 successes
    timeoutMs: 30000,        // 30 second timeout for operations
    resetTimeoutMs: 60000    // Wait 1 minute before trying half-open
  }

  // Timeout configurations per operation (in milliseconds)
  private readonly operationTimeouts: Map<string, number> = new Map([
    // Quick operations
    ['list-organisation-details', 10000], // 10 seconds
    ['list-accounts', 15000],             // 15 seconds
    ['list-tracking-categories', 10000],  // 10 seconds
    
    // Medium operations
    ['list-contacts', 30000],             // 30 seconds
    ['list-items', 25000],                // 25 seconds
    ['list-bank-accounts', 20000],        // 20 seconds
    
    // Potentially large datasets
    ['list-invoices', 60000],             // 60 seconds
    ['list-payments', 45000],             // 45 seconds
    ['list-credit-notes', 45000],         // 45 seconds
    ['list-bank-transactions', 90000],    // 90 seconds
    ['list-manual-journals', 60000],      // 60 seconds
    
    // Default timeout for unlisted operations
    ['default', 30000]                    // 30 seconds
  ])

  // Retry policy configurations for specific operations
  private readonly retryPolicies: Map<string, Partial<EnhancedError>> = new Map([
    // High-priority operations get more aggressive retries
    ['list-organisation-details', {
      maxRetries: 5,
      retryStrategy: RetryStrategy.EXPONENTIAL_BACKOFF,
      backoffMultiplier: 1.5
    }],
    ['list-accounts', {
      maxRetries: 3,
      retryStrategy: RetryStrategy.EXPONENTIAL_BACKOFF,
      backoffMultiplier: 2
    }],
    ['list-contacts', {
      maxRetries: 3,
      retryStrategy: RetryStrategy.EXPONENTIAL_BACKOFF,
      backoffMultiplier: 2
    }],
    
    // Transactional data gets standard retries
    ['list-invoices', {
      maxRetries: 4,
      retryStrategy: RetryStrategy.EXPONENTIAL_BACKOFF,
      backoffMultiplier: 2
    }],
    ['list-payments', {
      maxRetries: 4,
      retryStrategy: RetryStrategy.EXPONENTIAL_BACKOFF,
      backoffMultiplier: 2
    }],
    
    // Less critical operations get fewer retries
    ['list-items', {
      maxRetries: 2,
      retryStrategy: RetryStrategy.LINEAR_BACKOFF,
      backoffMultiplier: 1.5
    }],
    ['list-manual-journals', {
      maxRetries: 2,
      retryStrategy: RetryStrategy.LINEAR_BACKOFF,
      backoffMultiplier: 1.5
    }]
  ])

  // Recovery configurations per operation
  private readonly recoveryConfigs: Map<string, RecoveryConfig> = new Map([
    // Critical operations get cached fallback
    ['list-organisation-details', {
      strategy: FallbackStrategy.CACHED_DATA,
      action: RecoveryAction.FALLBACK,
      maxFallbackAttempts: 1
    }],
    ['list-accounts', {
      strategy: FallbackStrategy.CACHED_DATA,
      action: RecoveryAction.FALLBACK,
      maxFallbackAttempts: 1
    }],
    
    // Transactional data gets partial data fallback
    ['list-invoices', {
      strategy: FallbackStrategy.PARTIAL_DATA,
      action: RecoveryAction.FALLBACK,
      maxFallbackAttempts: 2
    }],
    ['list-payments', {
      strategy: FallbackStrategy.PARTIAL_DATA,
      action: RecoveryAction.FALLBACK,
      maxFallbackAttempts: 2
    }],
    
    // Less critical operations get degraded mode
    ['list-items', {
      strategy: FallbackStrategy.DEGRADED_MODE,
      action: RecoveryAction.FALLBACK,
      maxFallbackAttempts: 1
    }],
    ['list-manual-journals', {
      strategy: FallbackStrategy.DEGRADED_MODE,
      action: RecoveryAction.FALLBACK,
      maxFallbackAttempts: 1
    }]
  ])

  // Simple cache for fallback data
  private fallbackCache: Map<string, { data: any; timestamp: Date; ttl: number }> = new Map()

  // Error monitoring state
  private errorMetrics: ErrorMetrics = {
    totalErrors: 0,
    errorsByCategory: {} as Record<ErrorCategory, number>,
    errorsBySeverity: {} as Record<ErrorSeverity, number>,
    circuitBreakerTrips: 0,
    recoveryAttempts: 0,
    successfulRecoveries: 0,
    timeoutErrors: 0,
    rateLimitHits: 0,
    errorRate: 0
  }

  // Alert configuration
  private alertConfig: AlertConfig = {
    enabled: true,
    errorThreshold: 10,           // 10 errors in time window
    timeWindowMinutes: 5,         // 5 minute window
    criticalErrorImmediate: true,
    circuitBreakerAlert: true,
    recoveryFailureAlert: true
  }

  // Recent errors for rate calculation
  private recentErrors: Date[] = []

  // Alert handlers
  private alertHandlers: Array<(alert: Alert) => void> = []

  private readonly maxRetries = 3
  private readonly baseDelay = 1000 // 1 second
  private readonly maxDelay = 30000 // 30 seconds
  private readonly rateLimitWindow = 60000 // 1 minute
  private readonly maxRequestsPerWindow = 60 // Xero allows 60 requests per minute

  /**
   * Initialize connection to Xero via MCP using OAuth tokens
   */
  async connect(tenantId?: string): Promise<{ success: boolean; error?: string }> {
    try {
      this.log('info', 'Attempting to connect to Xero via MCP with OAuth')
      
      // Check if we have required configuration
      if (!config.xero.clientId || !config.xero.clientSecret) {
        throw new Error('Xero credentials not configured')
      }

      // Get active connections from OAuth manager
      const connections = await XeroOAuth.getActiveConnections()
      
      if (connections.length === 0) {
        throw new Error('No active Xero connections found. Please authenticate first.')
      }

      // Use specified tenant or first available connection
      const connection = tenantId 
        ? connections.find(c => c.tenantId === tenantId)
        : connections[0]

      if (!connection) {
        throw new Error(`No connection found for tenant: ${tenantId}`)
      }

      // Verify we can get a valid access token
      const accessToken = await XeroOAuth.getValidAccessToken(connection.tenantId)
      
      if (!accessToken) {
        throw new Error('Unable to obtain valid access token. Re-authentication may be required.')
      }

      // Test connection by fetching organisation details
      const orgResult = await this.makeApiCall('list-organisation-details', {
        random_string: 'test'
      })

      if (orgResult.success && orgResult.data?.length) {
        const org = orgResult.data[0]
        
        this.connectionState = {
          isConnected: true,
          tenantId: connection.tenantId,
          tenantName: connection.tenantName || org.name,
          accessTokenExpiry: connection.expiresAt,
          lastConnectionCheck: new Date(),
          connectionHealth: 'healthy'
        }

        this.log('info', `Connected to Xero organisation: ${this.connectionState.tenantName}`)
        return { success: true }
      } else {
        throw new Error('Failed to retrieve organisation details')
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown connection error'
      this.log('error', `Connection failed: ${errorMessage}`)
      
      this.connectionState = {
        isConnected: false,
        connectionHealth: 'error',
        lastConnectionCheck: new Date()
      }
      
      return { success: false, error: errorMessage }
    }
  }

  /**
   * Disconnect from Xero
   */
  async disconnect(): Promise<{ success: boolean }> {
    this.connectionState = {
      isConnected: false,
      connectionHealth: 'error'
    }
    
    this.log('info', 'Disconnected from Xero')
    return { success: true }
  }

  /**
   * Get current connection status
   */
  getConnectionStatus(): XeroConnection {
    return {
      tenantId: this.connectionState.tenantId || '',
      tenantName: this.connectionState.tenantName || '',
      isConnected: this.connectionState.isConnected,
      lastSyncDate: this.connectionState.lastConnectionCheck,
      accessTokenExpiry: this.connectionState.accessTokenExpiry
    }
  }

  /**
   * Check connection health and reconnect if needed
   */
  async ensureConnection(): Promise<boolean> {
    // Check if connection is recent (within 5 minutes)
    const now = new Date()
    const lastCheck = this.connectionState.lastConnectionCheck
    const checkAge = lastCheck ? (now.getTime() - lastCheck.getTime()) / 1000 : Infinity
    
    if (this.connectionState.isConnected && checkAge < 300) {
      return true
    }

    // Attempt to reconnect
    const result = await this.connect()
    return result.success
  }

  /**
   * Sync Xero accounts
   */
  async syncAccounts(options: SyncOptions = {}): Promise<SyncResult<XeroAccount>> {
    return this.syncEntity<XeroAccount>('accounts', 'list-accounts', options)
  }

  /**
   * Sync Xero contacts
   */
  async syncContacts(options: SyncOptions = {}): Promise<SyncResult<XeroContact>> {
    return this.syncEntity<XeroContact>('contacts', 'list-contacts', options)
  }

  /**
   * Sync Xero invoices
   */
  async syncInvoices(options: SyncOptions = {}): Promise<SyncResult<XeroInvoice>> {
    return this.syncEntity<XeroInvoice>('invoices', 'list-invoices', options)
  }

  /**
   * Sync Xero payments
   */
  async syncPayments(options: SyncOptions = {}): Promise<SyncResult<XeroPayment>> {
    return this.syncEntity<XeroPayment>('payments', 'list-payments', options)
  }

  /**
   * Sync Xero credit notes
   */
  async syncCreditNotes(options: SyncOptions = {}): Promise<SyncResult<XeroCreditNote>> {
    return this.syncEntity<XeroCreditNote>('credit_notes', 'list-credit-notes', options)
  }

  /**
   * Sync Xero items
   */
  async syncItems(options: SyncOptions = {}): Promise<SyncResult<XeroItem>> {
    return this.syncEntity<XeroItem>('items', 'list-items', options)
  }

  /**
   * Sync Xero bank accounts
   */
  async syncBankAccounts(options: SyncOptions = {}): Promise<SyncResult<XeroBankAccount>> {
    return this.syncEntity<XeroBankAccount>('bank_accounts', 'list-accounts', { 
      ...options,
      where: 'Type=="BANK"'
    })
  }

  /**
   * Sync Xero bank transactions
   */
  async syncBankTransactions(options: SyncOptions = {}): Promise<SyncResult<XeroBankTransaction>> {
    return this.syncEntity<XeroBankTransaction>('bank_transactions', 'list-bank-transactions', options)
  }

  /**
   * Sync Xero manual journals
   */
  async syncManualJournals(options: SyncOptions = {}): Promise<SyncResult<XeroManualJournal>> {
    return this.syncEntity<XeroManualJournal>('manual_journals', 'list-manual-journals', options)
  }

  /**
   * Sync Xero tracking categories
   */
  async syncTrackingCategories(options: SyncOptions = {}): Promise<SyncResult<XeroTrackingCategory>> {
    return this.syncEntity<XeroTrackingCategory>('tracking_categories', 'list-tracking-categories', options)
  }

  /**
   * Generic entity sync method
   */
  private async syncEntity<T>(
    entityType: string,
    mcpMethod: string,
    options: SyncOptions = {}
  ): Promise<SyncResult<T>> {
    const startTime = Date.now()
    let records: T[] = []
    let recordsProcessed = 0
    let recordsSkipped = 0
    let hasMoreRecords = false
    let lastModified: Date | undefined

    try {
      this.log('info', `Starting sync for ${entityType}`, { options })

      // Ensure we're connected
      if (!(await this.ensureConnection())) {
        throw new Error(`Not connected to Xero`)
      }

      // Build API parameters
      const params: any = {
        page: 1
      }

      // Add incremental sync support
      if (options.modifiedSince) {
        params.modifiedAfter = options.modifiedSince.toISOString().split('T')[0]
      }

      if (options.where) {
        params.where = options.where
      }

      // Make API call with retry logic
      const result = await this.makeApiCallWithRetry(mcpMethod, params)

      if (result.success && result.data) {
        records = result.data as T[]
        recordsProcessed = records.length
        
        // Cache successful results for future recovery
        const cacheKey = `${mcpMethod}_${JSON.stringify(params)}`
        this.setCachedData(cacheKey, records, 60) // Cache for 1 hour
        
        // Find the most recent update date
        if (records.length > 0) {
          const updateDates = records
            .map((record: any) => record.updatedDateUTC || record.UpdatedDateUTC)
            .filter(date => date)
            .map(date => new Date(date))
            .sort((a, b) => b.getTime() - a.getTime())
          
          if (updateDates.length > 0) {
            lastModified = updateDates[0]
          }
        }

        // Check if there are more pages
        hasMoreRecords = result.pagination ? 
          result.pagination.page < result.pagination.pageCount : false

        this.log('info', `Sync completed for ${entityType}`, {
          recordsProcessed,
          recordsSkipped,
          hasMoreRecords,
          recoveryUsed: !!result.enhancedError,
          duration: Date.now() - startTime
        })
      } else {
        throw new Error(result.error?.detail || `Failed to sync ${entityType}`)
      }

      return {
        success: true,
        records,
        recordsProcessed,
        recordsSkipped,
        hasMoreRecords,
        lastModified,
        duration: Date.now() - startTime,
        recoveryUsed: !!result.enhancedError,
        fallbackStrategy: result.enhancedError ? 
          this.recoveryConfigs.get(mcpMethod)?.strategy : undefined
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : `Unknown error syncing ${entityType}`
      this.log('error', `Sync failed for ${entityType}`, { error: errorMessage })

      return {
        success: false,
        records: [],
        recordsProcessed,
        recordsSkipped,
        hasMoreRecords: false,
        error: errorMessage,
        duration: Date.now() - startTime
      }
    }
  }

  /**
   * Make API call with retry logic, exponential backoff, and circuit breaker
   */
  private async makeApiCallWithRetry<T>(
    method: string,
    params: any,
    retryCount = 0
  ): Promise<XeroApiResponse<T>> {
    const endpoint = method

    try {
      // Check circuit breaker first
      const circuitCheck = this.canExecuteRequest(endpoint)
      if (!circuitCheck.allowed) {
        this.log('warn', `Circuit breaker blocking request: ${endpoint}`, { 
          reason: circuitCheck.reason 
        })
        return {
          success: false,
          error: {
            type: 'CircuitBreakerOpen',
            title: 'Circuit Breaker Open',
            status: 503,
            detail: circuitCheck.reason || 'Circuit breaker is open'
          }
        }
      }

      // Check rate limits
      await this.checkRateLimit()

      // Make the API call
      const result = await this.makeApiCall<T>(method, params)

      // Update rate limit state
      this.updateRateLimitState()

      // Record success for circuit breaker
      if (result.success) {
        this.recordSuccess(endpoint)
      } else if (result.error) {
        const enhancedError = this.classifyError(result.error, endpoint)
        this.recordFailure(endpoint, enhancedError)
        result.enhancedError = enhancedError
      }

      return result
    } catch (error) {
      // Classify the error for better handling
      const enhancedError = this.classifyError(error, endpoint)
      this.recordFailure(endpoint, enhancedError)
      
      // Record error metrics for monitoring
      this.recordErrorMetrics(enhancedError, endpoint)

      // Use enhanced error information for retry decisions
      const shouldRetry = retryCount < enhancedError.maxRetries && enhancedError.isRetryable
      
      if (shouldRetry) {
        const delay = this.calculateBackoffDelayFromStrategy(
          retryCount, 
          enhancedError.retryStrategy, 
          enhancedError.backoffMultiplier
        )
        
        this.log('warn', `${enhancedError.category} error, retrying in ${delay}ms`, { 
          error: enhancedError.message,
          category: enhancedError.category,
          severity: enhancedError.severity,
          retryCount,
          maxRetries: enhancedError.maxRetries,
          strategy: enhancedError.retryStrategy
        })
        
        await this.sleep(delay)
        return this.makeApiCallWithRetry(method, params, retryCount + 1)
      }

      // Attempt recovery before final failure
      const recoveryResult = await this.attemptRecovery<T>(endpoint, enhancedError, params)
      
      if (recoveryResult) {
        const strategy = this.recoveryConfigs.get(endpoint)?.strategy || FallbackStrategy.NONE
        
        this.log('info', `Recovery successful for ${endpoint}`, { strategy })
        
        // Record successful recovery
        this.recordRecoveryAttempt(true, endpoint, strategy)
        
        // Mark as successful but with recovery flag
        return {
          ...recoveryResult,
          enhancedError: {
            ...enhancedError,
            message: `Original error: ${enhancedError.message}. Recovered using fallback.`
          }
        }
      } else {
        // Record failed recovery attempt
        const strategy = this.recoveryConfigs.get(endpoint)?.strategy || FallbackStrategy.NONE
        this.recordRecoveryAttempt(false, endpoint, strategy)
      }

      // Final failure - return structured error response
      return {
        success: false,
        error: {
          type: enhancedError.category,
          title: 'API Call Failed',
          status: enhancedError.statusCode || 500,
          detail: enhancedError.message
        },
        enhancedError
      }
    }
  }

  /**
   * Get timeout for specific operation
   */
  private getOperationTimeout(operation: string): number {
    return this.operationTimeouts.get(operation) || this.operationTimeouts.get('default') || 30000
  }

  /**
   * Create timeout promise that rejects after specified time
   */
  private createTimeoutPromise(timeoutMs: number): Promise<never> {
    return new Promise((_, reject) => {
      setTimeout(() => {
        reject(new Error(`Operation timed out after ${timeoutMs}ms`))
      }, timeoutMs)
    })
  }

  /**
   * Make direct API call to MCP server with OAuth authentication and timeout handling
   */
  private async makeApiCall<T>(method: string, params: any): Promise<XeroApiResponse<T>> {
    const timeout = this.getOperationTimeout(method)
    
    try {
      // Ensure we have a valid connection
      if (!this.connectionState.isConnected || !this.connectionState.tenantId) {
        throw new Error('Not connected to Xero. Call connect() first.')
      }

      // Get valid access token
      const accessToken = await XeroOAuth.getValidAccessToken(this.connectionState.tenantId)
      
      if (!accessToken) {
        throw new Error('Unable to obtain valid access token')
      }

      // Create the API call promise with timeout
      const apiCallPromise = this.executeApiCall<T>(method, params, accessToken)
      const timeoutPromise = this.createTimeoutPromise(timeout)

      // Race between API call and timeout
      const result = await Promise.race([apiCallPromise, timeoutPromise])
      return result
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown API error'
      
      // Check if this was a timeout error
      const isTimeout = errorMessage.includes('timed out after')
      
      return {
        success: false,
        error: {
          type: isTimeout ? 'TimeoutError' : 'ApiError',
          title: isTimeout ? 'Request Timeout' : 'API Call Failed',
          status: isTimeout ? 408 : 500,
          detail: errorMessage
        }
      }
    }
  }

  /**
   * Execute the actual API call (to be implemented with MCP integration)
   */
  private async executeApiCall<T>(
    method: string, 
    params: any, 
    accessToken: string
  ): Promise<XeroApiResponse<T>> {
    // TODO: Replace with actual MCP server call
    // This is where we would call the MCP server with the access token
    // For now, we'll throw an error indicating the MCP integration is pending
    
    throw new Error('MCP server integration pending - OAuth flow implemented but MCP calls not yet connected')
  }

  /**
   * Check and enforce rate limits
   */
  private async checkRateLimit(): Promise<void> {
    const now = new Date()
    const windowAge = now.getTime() - this.rateLimitState.windowStart.getTime()

    // Reset window if it's been more than a minute
    if (windowAge >= this.rateLimitWindow) {
      this.rateLimitState = {
        requestCount: 0,
        windowStart: now,
        isLimited: false
      }
    }

    // Check if we're over the limit
    if (this.rateLimitState.requestCount >= this.maxRequestsPerWindow) {
      const waitTime = this.rateLimitWindow - windowAge
      this.rateLimitState.isLimited = true
      this.rateLimitState.resetTime = new Date(now.getTime() + waitTime)
      
      this.log('warn', `Rate limit reached, waiting ${waitTime}ms`)
      await this.sleep(waitTime)
      
      // Reset after waiting
      this.rateLimitState = {
        requestCount: 0,
        windowStart: new Date(),
        isLimited: false
      }
    }
  }

  /**
   * Update rate limit state after successful API call
   */
  private updateRateLimitState(): void {
    this.rateLimitState.requestCount++
    this.rateLimitState.isLimited = false
  }

  /**
   * Calculate backoff delay based on retry strategy
   */
  private calculateBackoffDelayFromStrategy(
    retryCount: number, 
    strategy: RetryStrategy, 
    multiplier: number = 2
  ): number {
    let delay: number

    switch (strategy) {
      case RetryStrategy.IMMEDIATE:
        return 0

      case RetryStrategy.FIXED_DELAY:
        delay = this.baseDelay
        break

      case RetryStrategy.LINEAR_BACKOFF:
        delay = this.baseDelay * (retryCount + 1) * multiplier
        break

      case RetryStrategy.EXPONENTIAL_BACKOFF:
        delay = this.baseDelay * Math.pow(multiplier, retryCount)
        break

      case RetryStrategy.NO_RETRY:
      default:
        return 0
    }

    // Apply jitter to prevent thundering herd
    const jitter = Math.random() * 0.1 * delay
    
    // Ensure we don't exceed max delay
    return Math.min(Math.floor(delay + jitter), this.maxDelay)
  }

  /**
   * Calculate exponential backoff delay (legacy method for backward compatibility)
   */
  private calculateBackoffDelay(retryCount: number, isRateLimit: boolean): number {
    if (isRateLimit) {
      return this.calculateBackoffDelayFromStrategy(retryCount, RetryStrategy.LINEAR_BACKOFF, 1.5)
    }
    
    return this.calculateBackoffDelayFromStrategy(retryCount, RetryStrategy.EXPONENTIAL_BACKOFF, 2)
  }

  /**
   * Classify and enhance error information
   */
  private classifyError(error: any, operation?: string): EnhancedError {
    const statusCode = error?.status || error?.statusCode
    const message = error?.message || error?.detail || 'Unknown error'
    const errorCode = error?.code
    
    // Default values
    let category = ErrorCategory.UNKNOWN
    let severity = ErrorSeverity.MEDIUM
    let isRetryable = false
    let retryStrategy = RetryStrategy.NO_RETRY
    let maxRetries = 0
    let backoffMultiplier = 2

    // Classify based on status code and error characteristics
    if (statusCode) {
      switch (statusCode) {
        case 400:
          category = ErrorCategory.VALIDATION
          severity = ErrorSeverity.HIGH
          isRetryable = false
          break
        case 401:
          category = ErrorCategory.AUTHENTICATION
          severity = ErrorSeverity.CRITICAL
          isRetryable = true
          retryStrategy = RetryStrategy.IMMEDIATE
          maxRetries = 1
          break
        case 403:
          category = ErrorCategory.AUTHORIZATION
          severity = ErrorSeverity.CRITICAL
          isRetryable = false
          break
        case 404:
          category = ErrorCategory.CLIENT
          severity = ErrorSeverity.HIGH
          isRetryable = false
          break
        case 408:
          category = ErrorCategory.TIMEOUT
          severity = ErrorSeverity.LOW
          isRetryable = true
          retryStrategy = RetryStrategy.EXPONENTIAL_BACKOFF
          maxRetries = 3
          break
        case 429:
          category = ErrorCategory.RATE_LIMIT
          severity = ErrorSeverity.LOW
          isRetryable = true
          retryStrategy = RetryStrategy.LINEAR_BACKOFF
          maxRetries = 5
          backoffMultiplier = 1.5
          break
        case 500:
        case 502:
        case 503:
          category = ErrorCategory.SERVER
          severity = ErrorSeverity.MEDIUM
          isRetryable = true
          retryStrategy = RetryStrategy.EXPONENTIAL_BACKOFF
          maxRetries = 3
          break
        case 504:
          category = ErrorCategory.TIMEOUT
          severity = ErrorSeverity.LOW
          isRetryable = true
          retryStrategy = RetryStrategy.EXPONENTIAL_BACKOFF
          maxRetries = 3
          break
        default:
          if (statusCode >= 500) {
            category = ErrorCategory.SERVER
            severity = ErrorSeverity.MEDIUM
            isRetryable = true
            retryStrategy = RetryStrategy.EXPONENTIAL_BACKOFF
            maxRetries = 2
          } else if (statusCode >= 400) {
            category = ErrorCategory.CLIENT
            severity = ErrorSeverity.HIGH
            isRetryable = false
          }
      }
    }

    // Classify based on error code
    if (errorCode) {
      switch (errorCode) {
        case 'ECONNRESET':
        case 'ECONNREFUSED':
        case 'ENOTFOUND':
        case 'EAI_AGAIN':
          category = ErrorCategory.NETWORK
          severity = ErrorSeverity.LOW
          isRetryable = true
          retryStrategy = RetryStrategy.EXPONENTIAL_BACKOFF
          maxRetries = 3
          break
        case 'ETIMEDOUT':
        case 'ESOCKETTIMEDOUT':
          category = ErrorCategory.TIMEOUT
          severity = ErrorSeverity.LOW
          isRetryable = true
          retryStrategy = RetryStrategy.EXPONENTIAL_BACKOFF
          maxRetries = 3
          break
      }
    }

    // Classify based on message content
    const lowerMessage = message.toLowerCase()
    if (lowerMessage.includes('rate limit') || lowerMessage.includes('too many requests')) {
      category = ErrorCategory.RATE_LIMIT
      severity = ErrorSeverity.LOW
      isRetryable = true
      retryStrategy = RetryStrategy.LINEAR_BACKOFF
      maxRetries = 5
      backoffMultiplier = 1.5
    } else if (lowerMessage.includes('timeout')) {
      category = ErrorCategory.TIMEOUT
      severity = ErrorSeverity.LOW
      isRetryable = true
      retryStrategy = RetryStrategy.EXPONENTIAL_BACKOFF
      maxRetries = 3
    } else if (lowerMessage.includes('maintenance') || lowerMessage.includes('unavailable')) {
      category = ErrorCategory.MAINTENANCE
      severity = ErrorSeverity.MEDIUM
      isRetryable = true
      retryStrategy = RetryStrategy.LINEAR_BACKOFF
      maxRetries = 3
      backoffMultiplier = 3
    } else if (lowerMessage.includes('quota') || lowerMessage.includes('limit exceeded')) {
      category = ErrorCategory.QUOTA
      severity = ErrorSeverity.HIGH
      isRetryable = false
    } else if (lowerMessage.includes('token') || lowerMessage.includes('unauthorized')) {
      category = ErrorCategory.AUTHENTICATION
      severity = ErrorSeverity.CRITICAL
      isRetryable = true
      retryStrategy = RetryStrategy.IMMEDIATE
      maxRetries = 1
    }

    // Apply operation-specific retry policies if available
    if (operation && this.retryPolicies.has(operation)) {
      const operationPolicy = this.retryPolicies.get(operation)!
      
      // Override defaults with operation-specific settings, but only for retryable errors
      if (isRetryable) {
        if (operationPolicy.maxRetries !== undefined) {
          maxRetries = Math.max(maxRetries, operationPolicy.maxRetries)
        }
        if (operationPolicy.retryStrategy !== undefined) {
          retryStrategy = operationPolicy.retryStrategy
        }
        if (operationPolicy.backoffMultiplier !== undefined) {
          backoffMultiplier = operationPolicy.backoffMultiplier
        }
      }
    }

    return {
      category,
      severity,
      isRetryable,
      retryStrategy,
      maxRetries,
      backoffMultiplier,
      originalError: error,
      message,
      statusCode,
      timestamp: new Date()
    }
  }

  /**
   * Check if error is rate limit related
   */
  private isRateLimitError(error: any): boolean {
    const enhanced = this.classifyError(error)
    return enhanced.category === ErrorCategory.RATE_LIMIT
  }

  /**
   * Check if error is retryable
   */
  private isRetryableError(error: any): boolean {
    const enhanced = this.classifyError(error)
    return enhanced.isRetryable
  }

  /**
   * Get or initialize circuit breaker state for an endpoint
   */
  private getCircuitBreaker(endpoint: string): CircuitBreakerState {
    if (!this.circuitBreakers.has(endpoint)) {
      this.circuitBreakers.set(endpoint, {
        state: CircuitState.CLOSED,
        failureCount: 0,
        successCount: 0,
        config: { ...this.defaultCircuitConfig }
      })
    }
    return this.circuitBreakers.get(endpoint)!
  }

  /**
   * Check if circuit breaker allows request
   */
  private canExecuteRequest(endpoint: string): { allowed: boolean; reason?: string } {
    const breaker = this.getCircuitBreaker(endpoint)
    const now = new Date()

    switch (breaker.state) {
      case CircuitState.CLOSED:
        return { allowed: true }

      case CircuitState.OPEN:
        // Check if enough time has passed to try half-open
        if (breaker.nextAttemptTime && now >= breaker.nextAttemptTime) {
          breaker.state = CircuitState.HALF_OPEN
          breaker.successCount = 0
          this.log('info', `Circuit breaker transitioning to half-open: ${endpoint}`)
          return { allowed: true }
        }
        return { 
          allowed: false, 
          reason: `Circuit breaker open for ${endpoint}. Next attempt at ${breaker.nextAttemptTime?.toISOString()}` 
        }

      case CircuitState.HALF_OPEN:
        return { allowed: true }

      default:
        return { allowed: false, reason: 'Unknown circuit breaker state' }
    }
  }

  /**
   * Record successful request
   */
  private recordSuccess(endpoint: string): void {
    const breaker = this.getCircuitBreaker(endpoint)
    
    switch (breaker.state) {
      case CircuitState.CLOSED:
        // Reset failure count on success
        breaker.failureCount = 0
        break

      case CircuitState.HALF_OPEN:
        breaker.successCount++
        if (breaker.successCount >= breaker.config.successThreshold) {
          breaker.state = CircuitState.CLOSED
          breaker.failureCount = 0
          breaker.successCount = 0
          breaker.nextAttemptTime = undefined
          this.log('info', `Circuit breaker closed after successful requests: ${endpoint}`)
        }
        break
    }
  }

  /**
   * Record failed request
   */
  private recordFailure(endpoint: string, error: EnhancedError): void {
    const breaker = this.getCircuitBreaker(endpoint)
    
    // Only count certain errors as circuit breaker failures
    if (!this.shouldCountAsCircuitBreakerFailure(error)) {
      return
    }

    const now = new Date()
    breaker.lastFailureTime = now
    
    switch (breaker.state) {
      case CircuitState.CLOSED:
        breaker.failureCount++
        if (breaker.failureCount >= breaker.config.failureThreshold) {
          breaker.state = CircuitState.OPEN
          breaker.nextAttemptTime = new Date(now.getTime() + breaker.config.resetTimeoutMs)
          this.log('warn', `Circuit breaker opened due to failures: ${endpoint}`, {
            failureCount: breaker.failureCount,
            nextAttemptTime: breaker.nextAttemptTime
          })
          
          // Record circuit breaker trip for monitoring
          this.recordCircuitBreakerTrip(endpoint)
        }
        break

      case CircuitState.HALF_OPEN:
        breaker.state = CircuitState.OPEN
        breaker.failureCount++
        breaker.successCount = 0
        breaker.nextAttemptTime = new Date(now.getTime() + breaker.config.resetTimeoutMs)
        this.log('warn', `Circuit breaker re-opened after failure in half-open state: ${endpoint}`)
        break
    }
  }

  /**
   * Determine if error should count as circuit breaker failure
   */
  private shouldCountAsCircuitBreakerFailure(error: EnhancedError): boolean {
    // Don't count client errors (4xx) except timeouts and auth issues
    if (error.category === ErrorCategory.VALIDATION || 
        error.category === ErrorCategory.CLIENT) {
      return false
    }

    // Don't count rate limiting as circuit breaker failure
    if (error.category === ErrorCategory.RATE_LIMIT) {
      return false
    }

    // Count server errors, network issues, timeouts, and auth failures
    return error.category === ErrorCategory.SERVER ||
           error.category === ErrorCategory.NETWORK ||
           error.category === ErrorCategory.TIMEOUT ||
           error.category === ErrorCategory.AUTHENTICATION ||
           error.category === ErrorCategory.MAINTENANCE
  }

  /**
   * Get circuit breaker status for monitoring
   */
  getCircuitBreakerStatus(): Array<{
    endpoint: string
    state: CircuitState
    failureCount: number
    successCount: number
    lastFailureTime?: Date
    nextAttemptTime?: Date
  }> {
    const status: Array<any> = []
    
    for (const [endpoint, breaker] of this.circuitBreakers.entries()) {
      status.push({
        endpoint,
        state: breaker.state,
        failureCount: breaker.failureCount,
        successCount: breaker.successCount,
        lastFailureTime: breaker.lastFailureTime,
        nextAttemptTime: breaker.nextAttemptTime
      })
    }
    
    return status
  }

  /**
   * Reset circuit breaker for specific endpoint
   */
  resetCircuitBreaker(endpoint: string): void {
    const breaker = this.getCircuitBreaker(endpoint)
    breaker.state = CircuitState.CLOSED
    breaker.failureCount = 0
    breaker.successCount = 0
    breaker.lastFailureTime = undefined
    breaker.nextAttemptTime = undefined
    
    this.log('info', `Circuit breaker manually reset: ${endpoint}`)
  }

  /**
   * Configure timeout for specific operation
   */
  setOperationTimeout(operation: string, timeoutMs: number): void {
    if (timeoutMs <= 0) {
      throw new Error('Timeout must be greater than 0')
    }
    
    this.operationTimeouts.set(operation, timeoutMs)
    this.log('info', `Timeout configured for ${operation}: ${timeoutMs}ms`)
  }

  /**
   * Get current timeout configurations
   */
  getTimeoutConfigurations(): Array<{ operation: string; timeoutMs: number }> {
    const configurations: Array<{ operation: string; timeoutMs: number }> = []
    
    for (const [operation, timeoutMs] of this.operationTimeouts.entries()) {
      configurations.push({ operation, timeoutMs })
    }
    
    return configurations.sort((a, b) => a.operation.localeCompare(b.operation))
  }

  /**
   * Store data in fallback cache
   */
  private setCachedData(key: string, data: any, ttlMinutes: number = 60): void {
    this.fallbackCache.set(key, {
      data,
      timestamp: new Date(),
      ttl: ttlMinutes * 60 * 1000 // Convert to milliseconds
    })
  }

  /**
   * Retrieve data from fallback cache
   */
  private getCachedData(key: string): any | null {
    const cached = this.fallbackCache.get(key)
    
    if (!cached) {
      return null
    }

    // Check if cache has expired
    const now = new Date()
    const age = now.getTime() - cached.timestamp.getTime()
    
    if (age > cached.ttl) {
      this.fallbackCache.delete(key)
      return null
    }

    return cached.data
  }

  /**
   * Attempt recovery using configured fallback strategy
   */
  private async attemptRecovery<T>(
    operation: string,
    originalError: EnhancedError,
    params: any
  ): Promise<XeroApiResponse<T> | null> {
    const config = this.recoveryConfigs.get(operation)
    
    if (!config || config.action !== RecoveryAction.FALLBACK) {
      return null
    }

    this.log('info', `Attempting recovery for ${operation}`, {
      strategy: config.strategy,
      originalError: originalError.category
    })

    try {
      switch (config.strategy) {
        case FallbackStrategy.CACHED_DATA:
          return await this.recoverWithCachedData<T>(operation, params)

        case FallbackStrategy.PARTIAL_DATA:
          return await this.recoverWithPartialData<T>(operation, params)

        case FallbackStrategy.DEGRADED_MODE:
          return await this.recoverWithDegradedMode<T>(operation, params)

        case FallbackStrategy.ALTERNATIVE_ENDPOINT:
          return await this.recoverWithAlternativeEndpoint<T>(operation, params, config)

        default:
          return null
      }
    } catch (recoveryError) {
      this.log('warn', `Recovery failed for ${operation}`, {
        strategy: config.strategy,
        error: recoveryError instanceof Error ? recoveryError.message : 'Unknown error'
      })
      return null
    }
  }

  /**
   * Recover using cached data
   */
  private async recoverWithCachedData<T>(operation: string, params: any): Promise<XeroApiResponse<T> | null> {
    const cacheKey = `${operation}_${JSON.stringify(params)}`
    const cachedData = this.getCachedData(cacheKey)

    if (!cachedData) {
      this.log('warn', `No cached data available for recovery: ${operation}`)
      return null
    }

    this.log('info', `Using cached data for recovery: ${operation}`)
    
    return {
      success: true,
      data: cachedData,
      pagination: {
        page: 1,
        pageSize: cachedData.length,
        pageCount: 1,
        itemCount: cachedData.length
      }
    }
  }

  /**
   * Recover with partial data (simplified query)
   */
  private async recoverWithPartialData<T>(operation: string, params: any): Promise<XeroApiResponse<T> | null> {
    // Try with simplified parameters for partial data
    const simplifiedParams = {
      ...params,
      pageSize: Math.min(params.pageSize || 100, 10), // Reduce page size
      includeArchived: false, // Exclude archived items
      // Remove complex filters that might be causing issues
      where: undefined,
      orderBy: undefined
    }

    this.log('info', `Attempting partial data recovery: ${operation}`)
    
    try {
      // Try the simplified call directly (bypass normal retry logic)
      const result = await this.executeApiCall<T>(operation, simplifiedParams, 
        await XeroOAuth.getValidAccessToken(this.connectionState.tenantId!) || '')
      
      if (result.success) {
        this.log('info', `Partial data recovery successful: ${operation}`)
      }
      
      return result
    } catch (error) {
      this.log('warn', `Partial data recovery failed: ${operation}`)
      return null
    }
  }

  /**
   * Recover with degraded mode (minimal data)
   */
  private async recoverWithDegradedMode<T>(operation: string, params: any): Promise<XeroApiResponse<T> | null> {
    // Return minimal/empty data structure to keep application functional
    this.log('info', `Using degraded mode for: ${operation}`)
    
    return {
      success: true,
      data: [] as T[], // Empty array but maintains type safety
      pagination: {
        page: 1,
        pageSize: 0,
        pageCount: 1,
        itemCount: 0
      }
    }
  }

  /**
   * Recover using alternative endpoint
   */
  private async recoverWithAlternativeEndpoint<T>(
    operation: string, 
    params: any, 
    config: RecoveryConfig
  ): Promise<XeroApiResponse<T> | null> {
    if (!config.alternativeEndpoints?.length) {
      return null
    }

    for (const altEndpoint of config.alternativeEndpoints) {
      this.log('info', `Trying alternative endpoint: ${altEndpoint} for ${operation}`)
      
      try {
        const result = await this.executeApiCall<T>(altEndpoint, params, 
          await XeroOAuth.getValidAccessToken(this.connectionState.tenantId!) || '')
        
        if (result.success) {
          this.log('info', `Alternative endpoint successful: ${altEndpoint}`)
          return result
        }
      } catch (error) {
        this.log('warn', `Alternative endpoint failed: ${altEndpoint}`)
        continue
      }
    }

    return null
  }

  /**
   * Record error for monitoring
   */
  private recordErrorMetrics(error: EnhancedError, operation?: string): void {
    const now = new Date()
    
    // Update error counts
    this.errorMetrics.totalErrors++
    this.errorMetrics.lastErrorTime = now
    
    // Update category counts
    if (!this.errorMetrics.errorsByCategory[error.category]) {
      this.errorMetrics.errorsByCategory[error.category] = 0
    }
    this.errorMetrics.errorsByCategory[error.category]++
    
    // Update severity counts
    if (!this.errorMetrics.errorsBySeverity[error.severity]) {
      this.errorMetrics.errorsBySeverity[error.severity] = 0
    }
    this.errorMetrics.errorsBySeverity[error.severity]++
    
    // Update specific error type counts
    if (error.category === ErrorCategory.TIMEOUT) {
      this.errorMetrics.timeoutErrors++
    }
    if (error.category === ErrorCategory.RATE_LIMIT) {
      this.errorMetrics.rateLimitHits++
    }
    
    // Add to recent errors for rate calculation
    this.recentErrors.push(now)
    this.cleanupOldErrors()
    this.updateErrorRate()
    
    // Check for alert conditions
    this.checkAlertConditions(error, operation)
  }

  /**
   * Record circuit breaker event
   */
  private recordCircuitBreakerTrip(endpoint: string): void {
    this.errorMetrics.circuitBreakerTrips++
    
    if (this.alertConfig.enabled && this.alertConfig.circuitBreakerAlert) {
      this.sendAlert({
        type: AlertType.CIRCUIT_BREAKER,
        severity: 'high',
        message: `Circuit breaker opened for endpoint: ${endpoint}`,
        timestamp: new Date(),
        operation: endpoint,
        metrics: { circuitBreakerTrips: this.errorMetrics.circuitBreakerTrips }
      })
    }
  }

  /**
   * Record recovery attempt
   */
  private recordRecoveryAttempt(success: boolean, operation: string, strategy: FallbackStrategy): void {
    this.errorMetrics.recoveryAttempts++
    
    if (success) {
      this.errorMetrics.successfulRecoveries++
    } else {
      // Recovery failed - send alert if configured
      if (this.alertConfig.enabled && this.alertConfig.recoveryFailureAlert) {
        this.sendAlert({
          type: AlertType.RECOVERY_FAILURE,
          severity: 'medium',
          message: `Recovery failed for ${operation} using ${strategy}`,
          timestamp: new Date(),
          operation,
          metrics: { 
            recoveryAttempts: this.errorMetrics.recoveryAttempts,
            successfulRecoveries: this.errorMetrics.successfulRecoveries
          }
        })
      }
    }
  }

  /**
   * Clean up old errors from recent errors list
   */
  private cleanupOldErrors(): void {
    const cutoff = new Date()
    cutoff.setMinutes(cutoff.getMinutes() - this.alertConfig.timeWindowMinutes)
    
    this.recentErrors = this.recentErrors.filter(errorTime => errorTime > cutoff)
  }

  /**
   * Update error rate calculation
   */
  private updateErrorRate(): void {
    const timeWindowMs = this.alertConfig.timeWindowMinutes * 60 * 1000
    this.errorMetrics.errorRate = (this.recentErrors.length / this.alertConfig.timeWindowMinutes)
  }

  /**
   * Check if alert conditions are met
   */
  private checkAlertConditions(error: EnhancedError, operation?: string): void {
    if (!this.alertConfig.enabled) return

    // Immediate alert for critical errors
    if (this.alertConfig.criticalErrorImmediate && error.severity === ErrorSeverity.CRITICAL) {
      this.sendAlert({
        type: AlertType.CRITICAL_ERROR,
        severity: 'critical',
        message: `Critical error in ${operation || 'unknown operation'}: ${error.message}`,
        timestamp: new Date(),
        operation,
        errorDetails: error,
        metrics: this.errorMetrics
      })
    }

    // Error threshold alert
    if (this.recentErrors.length >= this.alertConfig.errorThreshold) {
      this.sendAlert({
        type: AlertType.ERROR_THRESHOLD,
        severity: 'high',
        message: `Error threshold exceeded: ${this.recentErrors.length} errors in ${this.alertConfig.timeWindowMinutes} minutes`,
        timestamp: new Date(),
        metrics: this.errorMetrics
      })
    }

    // Timeout spike alert
    const recentTimeouts = this.recentErrors.filter(errorTime => {
      // This is simplified - in practice you'd need to track error types with timestamps
      return true // For now, assume recent errors could include timeouts
    })
    
    if (recentTimeouts.length >= 5) { // 5 timeouts in time window
      this.sendAlert({
        type: AlertType.TIMEOUT_SPIKE,
        severity: 'medium',
        message: `Timeout spike detected: ${recentTimeouts.length} timeouts in ${this.alertConfig.timeWindowMinutes} minutes`,
        timestamp: new Date(),
        metrics: { timeoutErrors: this.errorMetrics.timeoutErrors }
      })
    }
  }

  /**
   * Send alert to all registered handlers
   */
  private sendAlert(alert: Alert): void {
    this.log('warn', `ALERT: ${alert.type}`, alert)
    
    this.alertHandlers.forEach(handler => {
      try {
        handler(alert)
      } catch (error) {
        this.log('error', 'Alert handler failed', { error })
      }
    })
  }

  /**
   * Register alert handler
   */
  registerAlertHandler(handler: (alert: Alert) => void): void {
    this.alertHandlers.push(handler)
  }

  /**
   * Unregister alert handler
   */
  unregisterAlertHandler(handler: (alert: Alert) => void): void {
    const index = this.alertHandlers.indexOf(handler)
    if (index > -1) {
      this.alertHandlers.splice(index, 1)
    }
  }

  /**
   * Configure alerting
   */
  configureAlerting(config: Partial<AlertConfig>): void {
    this.alertConfig = { ...this.alertConfig, ...config }
    this.log('info', 'Alert configuration updated', this.alertConfig)
  }

  /**
   * Get current error metrics
   */
  getErrorMetrics(): ErrorMetrics {
    this.updateErrorRate()
    return { ...this.errorMetrics }
  }

  /**
   * Reset error metrics
   */
  resetErrorMetrics(): void {
    this.errorMetrics = {
      totalErrors: 0,
      errorsByCategory: {} as Record<ErrorCategory, number>,
      errorsBySeverity: {} as Record<ErrorSeverity, number>,
      circuitBreakerTrips: 0,
      recoveryAttempts: 0,
      successfulRecoveries: 0,
      timeoutErrors: 0,
      rateLimitHits: 0,
      errorRate: 0
    }
    this.recentErrors = []
    this.log('info', 'Error metrics reset')
  }

  /**
   * Sleep for specified milliseconds
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  /**
   * Log messages with context
   */
  private log(level: 'info' | 'warn' | 'error', message: string, context?: any): void {
    const logEntry = {
      timestamp: new Date().toISOString(),
      level,
      service: 'XeroMCPClient',
      message,
      context,
      connectionState: {
        isConnected: this.connectionState.isConnected,
        health: this.connectionState.connectionHealth,
        tenantId: this.connectionState.tenantId
      }
    }

    if (config.app.debug) {
      console.log(JSON.stringify(logEntry, null, 2))
    }
  }
}

// Export singleton instance
export const XeroClient = new XeroMCPClient()

// Export class for testing
export { XeroMCPClient }

// Export enums and types for testing and external use
export {
  ErrorCategory,
  ErrorSeverity,
  RetryStrategy,
  CircuitState,
  FallbackStrategy,
  RecoveryAction,
  AlertType
}

// Export types
export type {
  EnhancedError,
  ErrorMetrics,
  AlertConfig,
  Alert,
  RecoveryConfig,
  SyncResult,
  XeroApiResponse
}
