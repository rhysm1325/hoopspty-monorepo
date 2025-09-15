#!/usr/bin/env node

// Migration management script for AUSA Finance Dashboard

const fs = require('fs')
const path = require('path')
const crypto = require('crypto')

/**
 * Calculate SHA256 checksum of a file
 */
function calculateChecksum(filePath) {
  const fileContent = fs.readFileSync(filePath)
  return crypto.createHash('sha256').update(fileContent).digest('hex')
}

/**
 * Get all migration files
 */
function getMigrationFiles() {
  const migrationsDir = path.join(__dirname, '..', 'supabase', 'migrations')

  if (!fs.existsSync(migrationsDir)) {
    console.error('❌ Migrations directory not found:', migrationsDir)
    return []
  }

  const files = fs
    .readdirSync(migrationsDir)
    .filter(file => file.endsWith('.sql'))
    .sort()

  return files.map(file => {
    const filePath = path.join(migrationsDir, file)
    const checksum = calculateChecksum(filePath)

    return {
      name: file.replace('.sql', ''),
      file: file,
      path: filePath,
      checksum: checksum,
    }
  })
}

/**
 * Validate migration file naming convention
 */
function validateMigrationNaming(migrations) {
  const errors = []

  migrations.forEach((migration, index) => {
    const expectedNumber = String(index + 1).padStart(3, '0')

    if (!migration.file.startsWith(expectedNumber)) {
      errors.push(
        `Migration ${migration.file} should start with ${expectedNumber}`
      )
    }

    if (!migration.file.match(/^\d{3}_[a-z_]+\.sql$/)) {
      errors.push(
        `Migration ${migration.file} doesn't follow naming convention: ###_name.sql`
      )
    }
  })

  return errors
}

/**
 * Generate migration template
 */
function generateMigrationTemplate(name, type = 'schema') {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)
  const migrationNumber = String(getMigrationFiles().length + 1).padStart(
    3,
    '0'
  )
  const fileName = `${migrationNumber}_${name}.sql`

  const template = `-- ${name.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
-- Migration type: ${type}
-- Created: ${new Date().toISOString()}

-- Migration: ${fileName}
-- Description: [Add description here]

-- ============================================================================
-- UP MIGRATION
-- ============================================================================

-- Add your migration SQL here


-- ============================================================================
-- ROLLBACK (for documentation - add to migration_history.rollback_sql)
-- ============================================================================

-- Add rollback SQL here as comments:
-- DROP TABLE IF EXISTS new_table;
-- ALTER TABLE existing_table DROP COLUMN IF EXISTS new_column;

-- ============================================================================
-- VALIDATION
-- ============================================================================

-- Add validation queries to verify migration success:
-- SELECT COUNT(*) FROM new_table; -- Should return 0 for empty table
-- SELECT column_name FROM information_schema.columns WHERE table_name = 'existing_table' AND column_name = 'new_column'; -- Should return new_column

-- ============================================================================
-- PERFORMANCE NOTES
-- ============================================================================

-- Add performance considerations:
-- - This migration affects X tables
-- - Expected execution time: X minutes
-- - Recommended maintenance window: X hours
-- - Index creation may cause locks on large tables

-- ============================================================================
-- DEPENDENCIES
-- ============================================================================

-- List migration dependencies:
-- - Requires: 001_initial_schema.sql
-- - Conflicts with: none
-- - Should run before: [future migrations]
`

  return { fileName, template }
}

/**
 * Main CLI function
 */
function main() {
  const args = process.argv.slice(2)
  const command = args[0]

  console.log('🗄️  AUSA Finance Dashboard - Migration Management')
  console.log('================================================')

  switch (command) {
    case 'list':
      console.log('\n📋 Migration Files:')
      const migrations = getMigrationFiles()

      if (migrations.length === 0) {
        console.log('No migration files found.')
        return
      }

      migrations.forEach((migration, index) => {
        console.log(`${index + 1}. ${migration.file}`)
        console.log(`   Checksum: ${migration.checksum.slice(0, 16)}...`)
      })

      console.log(`\nTotal: ${migrations.length} migration files`)
      break

    case 'validate':
      console.log('\n🔍 Validating Migration Files:')
      const allMigrations = getMigrationFiles()
      const errors = validateMigrationNaming(allMigrations)

      if (errors.length === 0) {
        console.log('✅ All migration files follow naming convention')
      } else {
        console.log('❌ Migration naming errors:')
        errors.forEach(error => console.log(`   - ${error}`))
      }
      break

    case 'create':
      const migrationName = args[1]
      const migrationType = args[2] || 'schema'

      if (!migrationName) {
        console.log('❌ Migration name required')
        console.log('Usage: npm run migrate create <name> [type]')
        console.log(
          'Example: npm run migrate create add_user_preferences schema'
        )
        return
      }

      const { fileName, template } = generateMigrationTemplate(
        migrationName,
        migrationType
      )
      const migrationPath = path.join(
        __dirname,
        '..',
        'supabase',
        'migrations',
        fileName
      )

      if (fs.existsSync(migrationPath)) {
        console.log('❌ Migration file already exists:', fileName)
        return
      }

      fs.writeFileSync(migrationPath, template)
      console.log('✅ Created migration file:', fileName)
      console.log('📝 Edit the file to add your migration SQL')
      break

    case 'status':
      console.log('\n📊 Migration Status:')
      const statusMigrations = getMigrationFiles()
      console.log(`Total migration files: ${statusMigrations.length}`)

      if (statusMigrations.length > 0) {
        const latest = statusMigrations[statusMigrations.length - 1]
        console.log(`Latest migration: ${latest.file}`)
        console.log(`Latest checksum: ${latest.checksum.slice(0, 16)}...`)
      }

      // Note: In a full implementation, this would check against database
      console.log('\n💡 To check database migration status, use Supabase CLI:')
      console.log('   npx supabase migration list')
      break

    case 'help':
    default:
      console.log('\n📖 Available Commands:')
      console.log('  list      - List all migration files with checksums')
      console.log('  validate  - Validate migration file naming convention')
      console.log('  create    - Create new migration file from template')
      console.log('  status    - Show migration status overview')
      console.log('  help      - Show this help message')
      console.log('\n📝 Examples:')
      console.log('  npm run migrate list')
      console.log('  npm run migrate create add_new_feature schema')
      console.log('  npm run migrate validate')
      console.log('\n🔧 Supabase CLI Commands:')
      console.log('  npx supabase migration list    - Check applied migrations')
      console.log('  npx supabase db push          - Apply pending migrations')
      console.log(
        '  npx supabase db reset         - Reset database and reapply all migrations'
      )
      break
  }
}

// Run the CLI
if (require.main === module) {
  main()
}

module.exports = {
  getMigrationFiles,
  validateMigrationNaming,
  generateMigrationTemplate,
  calculateChecksum,
}
