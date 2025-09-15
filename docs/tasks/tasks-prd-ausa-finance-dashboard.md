# Task List: AUSA Finance Dashboard

## Relevant Files

### Core Application Files
- `package.json` - Project dependencies and scripts configuration
- `next.config.js` - Next.js configuration for app router and Vercel deployment
- `tailwind.config.ts` - Tailwind CSS configuration with shadcn/ui setup
- `tsconfig.json` - TypeScript configuration for strict mode
- `middleware.ts` - Authentication middleware for route protection
- `.env.local` - Local environment variables for development
- `.env.example` - Template for environment variables

### Authentication & User Management
- `app/(auth)/login/page.tsx` - Login page with Supabase Auth
- `app/(auth)/signup/page.tsx` - User registration page (admin invite only)
- `lib/auth.ts` - Authentication utilities and session management
- `lib/auth.test.ts` - Unit tests for authentication functions
- `types/auth.ts` - TypeScript types for user roles and auth state

### Database & Supabase Configuration
- `lib/supabase/client.ts` - Supabase client configuration
- `lib/supabase/server.ts` - Server-side Supabase client for Server Actions
- `supabase/migrations/001_initial_schema.sql` - Initial database schema
- `supabase/migrations/002_staging_tables.sql` - Xero staging tables
- `supabase/migrations/003_analytics_tables.sql` - Analytics dimension and fact tables
- `supabase/migrations/004_rls_policies.sql` - Row Level Security policies
- `supabase/migrations/009_data_integrity_functions.sql` - Data integrity checking functions
- `supabase/migrations/010_configuration_management.sql` - Configuration tables and functions
- `types/database.ts` - Generated TypeScript types from Supabase schema

### Xero Integration & Sync
- `lib/xero/client.ts` - Xero MCP client wrapper and connection management
- `lib/xero/client.test.ts` - Unit tests for Xero client functions
- `lib/xero/sync.ts` - Data synchronization logic with incremental updates
- `lib/xero/sync.test.ts` - Unit tests for sync functions
- `lib/xero/validation.ts` - Comprehensive data validation using Zod schemas
- `lib/xero/data-integrity.ts` - Data integrity checking and quality scoring
- `lib/xero/types.ts` - TypeScript types for Xero API responses
- `app/api/sync/route.ts` - API route for manual sync operations
- `app/api/cron/daily-sync/route.ts` - Cron endpoint for daily sync

### Data Processing & Analytics
- `lib/analytics/transforms.ts` - Data transformation utilities for staging to analytics
- `lib/analytics/transforms.test.ts` - Unit tests for transformation functions
- `lib/analytics/calculations.ts` - Financial calculations (AR aging, DSO, margins)
- `lib/analytics/calculations.test.ts` - Unit tests for calculation functions
- `lib/analytics/revenue-streams.ts` - Revenue stream tagging and categorization
- `lib/utils/financial.ts` - Financial utility functions (formatting, FY calculations)
- `lib/utils/financial.test.ts` - Unit tests for financial utilities
- `lib/utils/dates.ts` - Australian FY date utilities and timezone handling
- `lib/utils/dates.test.ts` - Unit tests for date utilities

### Dashboard Components
- `components/ui/dashboard-card.tsx` - Reusable dashboard card component
- `components/ui/metric-tile.tsx` - KPI metric tile component
- `components/ui/data-table.tsx` - Enhanced data table with export functionality
- `components/ui/date-picker.tsx` - Date picker with FY presets
- `components/charts/revenue-chart.tsx` - YTD vs prior year revenue chart
- `components/charts/cash-flow-chart.tsx` - Cash flow trend chart
- `components/charts/aging-chart.tsx` - AR/AP aging visualization
- `components/charts/charts.test.tsx` - Unit tests for chart components

### Dashboard Pages
- `app/(dashboard)/layout.tsx` - Dashboard layout with navigation
- `app/(dashboard)/page.tsx` - Executive dashboard (default landing)
- `app/(dashboard)/tours/page.tsx` - Tours revenue dashboard
- `app/(dashboard)/dr-dish/page.tsx` - Dr Dish distribution dashboard
- `app/(dashboard)/marketing/page.tsx` - Marketing revenue dashboard
- `app/(dashboard)/ar/page.tsx` - Accounts Receivable detail page
- `app/(dashboard)/ap/page.tsx` - Accounts Payable detail page
- `app/(dashboard)/settings/page.tsx` - Admin settings and configuration
- `app/(dashboard)/sync/page.tsx` - Data sync status and logs

### Configuration Management
- `lib/config/mappings.ts` - Revenue stream and account mapping utilities
- `lib/config/mappings.test.ts` - Unit tests for mapping functions
- `components/settings/revenue-mapping.tsx` - Revenue stream mapping form
- `components/settings/account-mapping.tsx` - Account code mapping form
- `components/settings/gst-settings.tsx` - GST method configuration form

### Server Actions
- `app/actions/sync-actions.ts` - Server actions for data synchronization
- `app/actions/config-actions.ts` - Server actions for configuration management
- `app/actions/dashboard-actions.ts` - Server actions for dashboard data fetching
- `app/actions/export-actions.ts` - Server actions for CSV export functionality

### Testing & Quality
- `__tests__/setup.ts` - Jest test setup and configuration
- `__tests__/utils/test-helpers.ts` - Test utilities and mock data
- `scripts/reconciliation.ts` - Data reconciliation script for Xero comparison
- `scripts/reconciliation.test.ts` - Unit tests for reconciliation script

### Configuration Files
- `jest.config.js` - Jest testing framework configuration
- `components.json` - shadcn/ui components configuration
- `vercel.json` - Vercel deployment and cron job configuration

### Notes

- Unit tests should be placed alongside the code files they are testing
- Use `npm test` to run all tests, or `npm test -- --testPathPattern=filename` for specific files
- Server Actions provide secure server-side operations without exposing API keys to client
- All Xero API calls must be server-side only through MCP integration
- RLS policies enforce role-based access at the database level

## Tasks

- [x] 1.0 Project Foundation & Setup
  - [x] 1.1 Initialize Next.js 14 project with TypeScript and App Router
  - [x] 1.2 Install and configure Tailwind CSS with custom Australian business theme
  - [x] 1.3 Set up shadcn/ui component library with dashboard-specific components
  - [x] 1.4 Configure ESLint, Prettier, and TypeScript strict mode
  - [x] 1.5 Create project structure with proper folder organization
  - [x] 1.6 Set up Jest testing framework with React Testing Library
  - [x] 1.7 Configure environment variables template and validation

- [x] 2.0 Authentication & User Management System
  - [x] 2.1 Set up Supabase Auth with email-based authentication
  - [x] 2.2 Create user roles enum and TypeScript types (Owner, Finance, Operations, Sales, Marketing)
  - [x] 2.3 Implement login and signup pages with role assignment
  - [x] 2.4 Create authentication middleware for route protection
  - [x] 2.5 Build admin invitation workflow with email templates
  - [x] 2.6 Implement session management and role-based navigation
  - [x] 2.7 Create audit logging system for authentication events
  - [x] 2.8 Add basic password requirements validation

- [x] 3.0 Database Schema & Supabase Configuration
  - [x] 3.1 Design and create initial database schema with user profiles and roles
  - [x] 3.2 Create staging tables for raw Xero data with proper indexing
  - [x] 3.3 Design analytics tables (dim_* and fact_*) for processed data
  - [x] 3.4 Create configuration tables for mappings and settings
  - [x] 3.5 Implement sync checkpoints table for incremental updates
  - [x] 3.6 Set up audit log table with proper retention policies
  - [x] 3.7 Create database migration system and version control
  - [x] 3.8 Generate TypeScript types from Supabase schema

- [x] 4.0 Xero Integration & Data Synchronization
  - [x] 4.1 Create Xero MCP client wrapper with connection management
  - [x] 4.2 Implement OAuth flow and token management through MCP
  - [x] 4.3 Build incremental sync system using If-Modified-Since headers
  - [x] 4.4 Create staging data ingestion for all required Xero objects
  - [x] 4.5 Implement error handling and retry logic with exponential backoff
  - [x] 4.6 Add rate limiting and Xero API quota management
  - [x] 4.7 Create manual sync functionality for Finance and Owner roles
  - [x] 4.8 Build sync status monitoring and logging system
  - [x] 4.9 Implement data validation and integrity checks

- [x] 5.0 Data Processing & Analytics Layer
  - [x] 5.1 Create data transformation pipeline from staging to analytics tables
  - [x] 5.2 Implement revenue stream tagging using admin-configured mappings
  - [x] 5.3 Build financial calculations engine (AR aging, DSO, DPO, margins)
  - [x] 5.4 Create Australian financial year utilities with timezone handling
  - [x] 5.5 Implement YTD vs prior year comparison with week-based alignment
  - [x] 5.6 Build inventory calculations for Dr Dish (turns, sell-through)
  - [x] 5.7 Create materialized views for performance optimization
  - [x] 5.8 Implement data caching strategy between syncs
  - [x] 5.9 Add data quality monitoring and variance detection

- [ ] 6.0 Configuration Management System
  - [x] 6.1 Create Settings page layout with role-based access controls
  - [x] 6.2 Build revenue stream mapping interface for account codes
  - [x] 6.3 Implement item code mapping for Dr Dish product categorization
  - [x] 6.4 Create COGS account selection for gross margin calculations
  - [x] 6.5 Add GST method configuration (Accrual vs Cash reporting)
  - [x] 6.6 Implement deferred revenue rules configuration for Tours
  - [ ] 6.7 Create sync schedule configuration and timezone settings
  - [x] 6.8 Build configuration validation and testing utilities
  - [ ] 6.9 Add configuration backup and restore functionality

- [ ] 7.0 Executive Dashboard Implementation
  - [ ] 7.1 Create executive dashboard layout with responsive grid system
  - [ ] 7.2 Build cash position tile with real-time bank account balances
  - [ ] 7.3 Implement AR/AP aging tiles with visual aging buckets
  - [ ] 7.4 Create YTD revenue vs prior year chart with week-based comparison
  - [ ] 7.5 Build gross margin and net profit tiles with trend indicators
  - [ ] 7.6 Implement DSO and DPO calculation tiles
  - [ ] 7.7 Create cash flow trend chart for 13-week rolling period
  - [ ] 7.8 Build overdue customers table with contact management integration
  - [ ] 7.9 Add overdue suppliers table with payment prioritization
  - [ ] 7.10 Implement insight callouts for significant variances and alerts

- [ ] 8.0 Revenue Stream Dashboards (Tours, Dr Dish, Marketing)
  - [ ] 8.1 Create Tours dashboard with seasonal revenue analysis
  - [ ] 8.2 Build Tours deferred revenue tracking and recognition views
  - [ ] 8.3 Implement Tours AR table with customer contact integration
  - [ ] 8.4 Create Dr Dish distribution dashboard with inventory focus
  - [ ] 8.5 Build Dr Dish unit sales tracking and ASP analysis
  - [ ] 8.6 Implement Dr Dish gross margin analysis by product model
  - [ ] 8.7 Create Dr Dish inventory management with turns and stock levels
  - [ ] 8.8 Build Marketing revenue dashboard for Rebel Sport tracking
  - [ ] 8.9 Implement Marketing invoice status and payment tracking
  - [ ] 8.10 Add revenue stream filtering and drill-down capabilities

- [ ] 9.0 Detail Pages & Data Export
  - [ ] 9.1 Create AR detail page with advanced filtering and search
  - [ ] 9.2 Build AP detail page with supplier management features
  - [ ] 9.3 Implement customer drill-down with contact information and history
  - [ ] 9.4 Create supplier drill-down with payment history and terms
  - [ ] 9.5 Build CSV export functionality for all data tables
  - [ ] 9.6 Implement Excel export with formatted financial reports
  - [ ] 9.7 Add email functionality for sharing reports with stakeholders
  - [ ] 9.8 Create printable report formats with company branding
  - [ ] 9.9 Build data filtering system with saved filter presets

- [ ] 10.0 Scheduling & Background Jobs
  - [x] 10.1 Set up Vercel cron jobs for automated daily sync at 03:30 Sydney time
  - [x] 10.2 Create background job monitoring and failure alerting
  - [ ] 10.3 Implement job queue system for large data processing tasks
  - [x] 10.4 Build sync status dashboard with real-time progress tracking
  - [ ] 10.5 Create automated backup scheduling for critical configuration data
  - [ ] 10.6 Implement data retention policies for staging and log tables
  - [ ] 10.7 Add performance monitoring for sync operations
  - [ ] 10.8 Create automated health checks and system monitoring

- [ ] 11.0 Security Implementation & RLS
  - [x] 11.1 Implement Row Level Security policies for all user roles
  - [x] 11.2 Create role-based access control middleware
  - [x] 11.3 Build audit logging for all administrative actions
  - [x] 11.4 Implement secure Server Actions for all Xero API calls
  - [ ] 11.5 Add input validation and sanitization for all user inputs
  - [ ] 11.6 Create session security with proper token management
  - [ ] 11.7 Implement CSRF protection and security headers
  - [ ] 11.8 Add rate limiting for API endpoints and user actions
  - [ ] 11.9 Create security monitoring and intrusion detection

- [ ] 12.0 Testing & Quality Assurance
  - [ ] 12.1 Create unit tests for all utility functions and calculations
  - [ ] 12.2 Build integration tests for Xero sync and data processing
  - [ ] 12.3 Implement component tests for all dashboard elements
  - [ ] 12.4 Create end-to-end tests for critical user workflows
  - [ ] 12.5 Build data reconciliation script comparing app data to Xero reports
  - [ ] 12.6 Implement performance testing for dashboard load times
  - [ ] 12.7 Create security testing for authentication and authorization
  - [ ] 12.8 Build automated testing pipeline with CI/CD integration
  - [ ] 12.9 Create user acceptance testing scenarios for all roles

- [ ] 13.0 Deployment & Production Setup
  - [ ] 13.1 Configure Vercel deployment with environment variables
  - [ ] 13.2 Set up production Supabase instance with proper security
  - [ ] 13.3 Configure domain and SSL certificates
  - [ ] 13.4 Implement monitoring and logging with error tracking
  - [ ] 13.5 Create backup and disaster recovery procedures
  - [ ] 13.6 Set up performance monitoring and alerting
  - [ ] 13.7 Configure automated deployment pipeline with staging environment
  - [ ] 13.8 Create production data migration and seeding scripts
  - [ ] 13.9 Build user documentation and training materials
  - [ ] 13.10 Implement production support procedures and runbooks
