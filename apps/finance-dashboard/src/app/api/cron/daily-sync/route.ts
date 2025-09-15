/**
 * Daily Sync Cron Job Endpoint
 * 
 * This endpoint is called by Vercel Cron Jobs daily at 03:30 Australia/Sydney time
 * to perform automated incremental sync of all Xero data.
 * 
 * Security: Protected by CRON_SECRET to prevent unauthorized access
 */

import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    // Skip during build process
    if (process.env.VERCEL_ENV || process.env.CI) {
      return NextResponse.json({ error: 'Service not available during build' }, { status: 503 })
    }

    // Verify cron secret for security
    const authHeader = request.headers.get('authorization')
    const cronSecret = process.env.CRON_SECRET

    if (!authHeader || !cronSecret) {
      return NextResponse.json(
        { error: 'Missing authorization or cron secret not configured' },
        { status: 401 }
      )
    }

    const providedSecret = authHeader.replace('Bearer ', '')
    if (providedSecret !== cronSecret) {
      return NextResponse.json(
        { error: 'Invalid authorization token' },
        { status: 401 }
      )
    }

    console.log('Daily sync cron job started at:', new Date().toISOString())

    // Dynamic imports to avoid build-time issues
    const { createServerClient } = await import('@/lib/supabase/server')
    const { XeroOAuth } = await import('@/lib/xero/oauth')
    const { XeroSync } = await import('@/lib/xero/sync')

    const supabase = createServerClient()
    
    // Get all active Xero connections
    const activeConnections = await XeroOAuth.getActiveConnections()
    
    if (activeConnections.length === 0) {
      console.log('No active Xero connections found for daily sync')
      return NextResponse.json({
        success: true,
        message: 'No active Xero connections to sync',
        results: []
      })
    }

    const syncResults = []
    let totalRecordsProcessed = 0
    let totalErrors = 0

    // Sync each active tenant
    for (const connection of activeConnections) {
      try {
        console.log(`Starting sync for tenant: ${connection.tenantName} (${connection.tenantId})`)

        // Use system user ID for scheduled syncs (first owner user)
        const { data: systemUser } = await supabase
          .from('profiles')
          .select('id')
          .eq('role', 'owner')
          .eq('is_active', true)
          .limit(1)
          .single()

        if (!systemUser) {
          throw new Error('No active owner user found for system sync')
        }

        const result = await XeroSync.performFullSync(
          systemUser.id,
          connection.tenantId,
          'scheduled'
        )

        syncResults.push({
          tenantId: connection.tenantId,
          tenantName: connection.tenantName,
          success: result.success,
          recordsProcessed: result.totalRecordsProcessed,
          entitiesProcessed: result.entitiesProcessed,
          duration: result.totalDuration,
          errors: result.errors
        })

        totalRecordsProcessed += result.totalRecordsProcessed
        if (!result.success) {
          totalErrors += result.errors.length
        }

        // Log the scheduled sync
        await supabase
          .from('audit_logs')
          .insert({
            user_id: systemUser.id,
            action: 'sync_initiated',
            details: {
              action: 'scheduled_sync_completed',
              tenant_id: connection.tenantId,
              tenant_name: connection.tenantName,
              session_id: result.sessionId,
              success: result.success,
              entities_processed: result.entitiesProcessed,
              total_records: result.totalRecordsProcessed,
              duration_seconds: Math.floor(result.totalDuration / 1000),
              error_count: result.errors.length
            },
            ip_address: 'cron-job',
            user_agent: 'Vercel Cron'
          })

        console.log(`Sync completed for ${connection.tenantName}:`, {
          success: result.success,
          recordsProcessed: result.totalRecordsProcessed,
          duration: `${Math.floor(result.totalDuration / 1000)}s`,
          errors: result.errors.length
        })

      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error'
        console.error(`Sync failed for tenant ${connection.tenantId}:`, errorMessage)

        syncResults.push({
          tenantId: connection.tenantId,
          tenantName: connection.tenantName,
          success: false,
          recordsProcessed: 0,
          entitiesProcessed: 0,
          duration: 0,
          errors: [errorMessage]
        })

        totalErrors++
      }
    }

    // Calculate overall success rate
    const successfulSyncs = syncResults.filter(r => r.success).length
    const overallSuccessRate = syncResults.length > 0 ? 
      (successfulSyncs / syncResults.length) * 100 : 0

    const summary = {
      success: totalErrors === 0,
      timestamp: new Date().toISOString(),
      tenantsProcessed: activeConnections.length,
      totalRecordsProcessed,
      totalErrors,
      overallSuccessRate,
      results: syncResults
    }

    console.log('Daily sync cron job completed:', {
      tenantsProcessed: summary.tenantsProcessed,
      totalRecordsProcessed: summary.totalRecordsProcessed,
      totalErrors: summary.totalErrors,
      successRate: `${summary.overallSuccessRate.toFixed(1)}%`
    })

    // Store daily sync performance metrics
    try {
      await supabase.rpc('calculate_sync_performance_metrics', {
        target_date: new Date().toISOString().split('T')[0]
      })
    } catch (metricsError) {
      console.error('Failed to calculate performance metrics:', metricsError)
    }

    return NextResponse.json(summary, { 
      status: summary.success ? 200 : 207 // 207 Multi-Status for partial success
    })

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown cron error'
    console.error('Daily sync cron job failed:', errorMessage)

    return NextResponse.json(
      {
        success: false,
        error: errorMessage,
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    )
  }
}

// Handle GET requests for health checks
export async function GET() {
  return NextResponse.json({
    endpoint: 'daily-sync',
    status: 'ready',
    timestamp: new Date().toISOString(),
    nextRun: '03:30 Australia/Sydney'
  })
}
