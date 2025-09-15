/**
 * Initialize Sync Checkpoints Script
 * 
 * This script initializes sync checkpoints for all Xero entity types
 * in the database. Run this once after setting up the database to
 * prepare for incremental sync operations.
 * 
 * Usage: node scripts/init-sync-checkpoints.js
 */

const { createClient } = require('@supabase/supabase-js')

// Entity types that support incremental sync
const SYNC_ENTITIES = [
  'accounts',
  'contacts', 
  'invoices',
  'payments',
  'credit_notes',
  'items',
  'bank_accounts',
  'bank_transactions',
  'manual_journals',
  'tracking_categories'
]

async function initializeSyncCheckpoints() {
  try {
    console.log('🚀 Initializing Xero sync checkpoints...')

    // Get Supabase configuration
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Missing Supabase configuration. Check your environment variables.')
    }

    // Create Supabase client
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    let successCount = 0
    let errorCount = 0
    const errors = []

    // Initialize checkpoint for each entity type
    for (const entityType of SYNC_ENTITIES) {
      try {
        console.log(`  📝 Initializing checkpoint for: ${entityType}`)

        const { error } = await supabase
          .from('sync_checkpoints')
          .upsert({
            entity_type: entityType,
            last_updated_utc: new Date('1900-01-01').toISOString(),
            records_processed: 0,
            has_more_records: false,
            sync_status: 'idle',
            total_sync_count: 0,
            error_count: 0,
            rate_limit_hits: 0,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          }, {
            onConflict: 'entity_type',
            ignoreDuplicates: true
          })

        if (error) {
          throw new Error(`Failed to initialize ${entityType}: ${error.message}`)
        }

        console.log(`  ✅ ${entityType} checkpoint initialized`)
        successCount++

      } catch (entityError) {
        console.error(`  ❌ Failed to initialize ${entityType}:`, entityError.message)
        errors.push(`${entityType}: ${entityError.message}`)
        errorCount++
      }
    }

    // Summary
    console.log('\n📊 Initialization Summary:')
    console.log(`  ✅ Successfully initialized: ${successCount} entities`)
    console.log(`  ❌ Failed to initialize: ${errorCount} entities`)

    if (errors.length > 0) {
      console.log('\n🚨 Errors encountered:')
      errors.forEach(error => console.log(`  - ${error}`))
    }

    if (errorCount === 0) {
      console.log('\n🎉 All sync checkpoints initialized successfully!')
      console.log('The system is now ready for incremental sync operations.')
    } else {
      console.log('\n⚠️  Some checkpoints failed to initialize. Please check the errors above.')
      process.exit(1)
    }

  } catch (error) {
    console.error('💥 Script failed:', error.message)
    process.exit(1)
  }
}

// Run the script
if (require.main === module) {
  initializeSyncCheckpoints()
}

module.exports = { initializeSyncCheckpoints }
