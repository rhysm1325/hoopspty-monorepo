#!/usr/bin/env node

// Script to set up environment variables for development

const fs = require('fs')
const path = require('path')

const envLocalPath = path.join(__dirname, '..', '.env.local')
const envExamplePath = path.join(__dirname, '..', 'env.example')

// Development environment template
const developmentEnv = `# AUSA Finance Dashboard - Development Environment Variables
# This file is for local development only

NODE_ENV=development
NEXT_PUBLIC_APP_NAME="AUSA Finance Dashboard"
NEXT_PUBLIC_APP_VERSION="1.0.0"

# Supabase (development instance)
NEXT_PUBLIC_SUPABASE_URL=https://placeholder.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=placeholder-anon-key
SUPABASE_SERVICE_ROLE_KEY=placeholder-service-role-key

# Xero Integration (using existing MCP configuration)
XERO_CLIENT_ID=27FB7C680A014D8DB561A93C785BF232
XERO_CLIENT_SECRET=U4dKuE8ojlhaKGiLij_4QL22wGCCZHZ9C5USAje5EqIGc93u
XERO_REDIRECT_URI=http://localhost:3000/api/auth/xero/callback
XERO_SCOPES=offline_access accounting.transactions accounting.reports.read accounting.settings openid profile email

# Australian Business Settings
FINANCIAL_YEAR_START_MONTH=7
FINANCIAL_YEAR_START_DAY=1
DEFAULT_TIMEZONE=Australia/Sydney
DEFAULT_CURRENCY=AUD
DEFAULT_GST_METHOD=accrual
COMPANY_NAME="AUSA Hoops Pty Ltd"

# Sync Settings
SYNC_SCHEDULE_HOUR=3
SYNC_SCHEDULE_MINUTE=30
SYNC_BATCH_SIZE=100
CACHE_TTL_MINUTES=60

# Security (development)
NEXTAUTH_SECRET=development-secret-key-change-in-production-min-32-chars
NEXTAUTH_URL=http://localhost:3000
CRON_SECRET=development-cron-secret-change-in-production

# Development flags
ENABLE_DEBUG_MODE=true
USE_MOCK_XERO_DATA=false
LOG_LEVEL=debug
`

function setupEnvironment() {
  console.log('🔧 Setting up environment variables for development...')

  // Check if .env.local already exists
  if (fs.existsSync(envLocalPath)) {
    console.log('ℹ️  .env.local already exists. Skipping creation.')
    console.log('💡 To reset, delete .env.local and run this script again.')
    return
  }

  try {
    // Create .env.local from template
    fs.writeFileSync(envLocalPath, developmentEnv)
    console.log('✅ Created .env.local with development defaults')

    console.log('\n📋 Next steps:')
    console.log('1. Update Supabase URLs and keys in .env.local')
    console.log('2. Verify Xero credentials are correct')
    console.log('3. Generate a secure NEXTAUTH_SECRET for production')
    console.log('4. Run: npm run dev')

    console.log('\n⚠️  Important:')
    console.log('- Never commit .env.local to version control')
    console.log('- Use Vercel environment variables for production')
    console.log('- Rotate secrets regularly')
  } catch (error) {
    console.error('❌ Error creating .env.local:', error.message)
    process.exit(1)
  }
}

// Run the setup
if (require.main === module) {
  setupEnvironment()
}

module.exports = { setupEnvironment }
