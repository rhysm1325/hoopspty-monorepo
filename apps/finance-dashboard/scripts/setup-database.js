#!/usr/bin/env node

/**
 * Database Setup Script for AUSA Finance Dashboard
 * 
 * This script helps set up the Supabase database with the required schema
 * and creates an initial admin user for testing.
 * 
 * Usage: node scripts/setup-database.js
 */

const { createClient } = require('@supabase/supabase-js')

async function setupDatabase() {
  console.log('🚀 AUSA Finance Dashboard - Database Setup')
  console.log('==========================================')

  // Get Supabase configuration from environment
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !supabaseServiceKey) {
    console.error('❌ Missing Supabase configuration')
    console.log('Please ensure these environment variables are set:')
    console.log('  - NEXT_PUBLIC_SUPABASE_URL')
    console.log('  - SUPABASE_SERVICE_ROLE_KEY')
    console.log('')
    console.log('You can get these from your Supabase project settings.')
    process.exit(1)
  }

  if (supabaseUrl.includes('placeholder') || supabaseServiceKey.includes('placeholder')) {
    console.error('❌ Supabase configuration contains placeholder values')
    console.log('Please update your environment variables with real Supabase credentials.')
    process.exit(1)
  }

  console.log('🔗 Connecting to Supabase...')
  console.log(`   URL: ${supabaseUrl}`)

  // Create Supabase client
  const supabase = createClient(supabaseUrl, supabaseServiceKey)

  try {
    // Test connection
    console.log('🧪 Testing database connection...')
    const { data: connectionTest, error: connectionError } = await supabase
      .from('profiles')
      .select('count')
      .limit(1)

    if (connectionError) {
      if (connectionError.message.includes('relation "profiles" does not exist')) {
        console.log('📋 Database schema not found. You need to run migrations first.')
        console.log('')
        console.log('To set up the database schema:')
        console.log('1. Install Supabase CLI: npm install -g supabase')
        console.log('2. Link to your project: npx supabase link --project-ref YOUR_PROJECT_REF')
        console.log('3. Push migrations: npx supabase db push')
        console.log('')
        console.log('Or manually run the SQL files in supabase/migrations/ in your Supabase dashboard.')
        process.exit(1)
      } else {
        throw connectionError
      }
    }

    console.log('✅ Database connection successful')

    // Check if any users exist
    console.log('👥 Checking existing users...')
    const { data: existingUsers, error: userError } = await supabase
      .from('profiles')
      .select('email, role, is_active')
      .limit(10)

    if (userError) {
      throw userError
    }

    if (existingUsers && existingUsers.length > 0) {
      console.log(`📊 Found ${existingUsers.length} existing users:`)
      existingUsers.forEach(user => {
        console.log(`   - ${user.email} (${user.role}) ${user.is_active ? '✅' : '❌'}`)
      })
      console.log('')
      console.log('🎉 Database is set up and has users!')
      console.log('You can log in with any of the existing accounts.')
    } else {
      console.log('👤 No users found. Creating initial admin user...')
      
      // Create initial admin user
      const adminEmail = 'admin@ausa.com.au'
      const adminPassword = 'AdminPassword123!'
      
      console.log(`   Email: ${adminEmail}`)
      console.log(`   Password: ${adminPassword}`)
      console.log('   Role: owner')
      
      // Create user in Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.admin.createUser({
        email: adminEmail,
        password: adminPassword,
        email_confirm: true,
        user_metadata: {
          first_name: 'Admin',
          last_name: 'User',
          role: 'owner'
        }
      })

      if (authError) {
        throw authError
      }

      if (!authData.user) {
        throw new Error('Failed to create user')
      }

      // Create profile record
      const { error: profileError } = await supabase
        .from('profiles')
        .insert({
          id: authData.user.id,
          email: adminEmail,
          first_name: 'Admin',
          last_name: 'User',
          role: 'owner',
          is_active: true,
          email_verified: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })

      if (profileError) {
        throw profileError
      }

      console.log('✅ Initial admin user created successfully!')
      console.log('')
      console.log('🔑 Login Credentials:')
      console.log(`   Email: ${adminEmail}`)
      console.log(`   Password: ${adminPassword}`)
      console.log('   Role: Owner (full access)')
      console.log('')
      console.log('⚠️  IMPORTANT: Change this password after first login!')
    }

    console.log('')
    console.log('🎯 Next Steps:')
    console.log('1. Go to your application login page')
    console.log('2. Sign in with the credentials shown above')
    console.log('3. You should be redirected to the Executive Dashboard')
    console.log('4. Change the default password in Settings')
    console.log('5. Create additional users as needed')
    console.log('')
    console.log('🚀 Your AUSA Finance Dashboard is ready to use!')

  } catch (error) {
    console.error('💥 Setup failed:', error.message)
    console.log('')
    console.log('🔧 Troubleshooting:')
    console.log('1. Verify your Supabase project is active')
    console.log('2. Check that environment variables are correct')
    console.log('3. Ensure the service role key has admin permissions')
    console.log('4. Run database migrations if schema is missing')
    process.exit(1)
  }
}

// Run the setup
if (require.main === module) {
  setupDatabase()
}

module.exports = { setupDatabase }
