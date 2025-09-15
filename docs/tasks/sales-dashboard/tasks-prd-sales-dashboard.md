# Tasks: HoopsPty Sales Dashboard

Based on the PRD for HoopsPty Sales Dashboard with AirCall and ActiveCampaign integration.

## Relevant Files

- `apps/sales-dashboard/package.json` - App package configuration and dependencies
- `apps/sales-dashboard/next.config.ts` - Next.js configuration for the sales dashboard
- `apps/sales-dashboard/src/app/layout.tsx` - Root layout with auth provider
- `apps/sales-dashboard/src/app/page.tsx` - Main dashboard page with real-time metrics
- `apps/sales-dashboard/src/app/(dashboard)/layout.tsx` - Dashboard layout with navigation
- `apps/sales-dashboard/src/app/(dashboard)/reports/page.tsx` - Historical reports and analytics
- `apps/sales-dashboard/src/app/(dashboard)/settings/page.tsx` - Dashboard settings and configuration
- `apps/sales-dashboard/src/app/api/aircall/webhook/route.ts` - AirCall webhook handler for real-time updates
- `apps/sales-dashboard/src/app/api/aircall/sync/route.ts` - Manual AirCall data synchronization
- `apps/sales-dashboard/src/app/api/activecampaign/sync/route.ts` - ActiveCampaign data synchronization
- `apps/sales-dashboard/src/components/dashboard/call-metrics.tsx` - Call volume and performance metrics
- `apps/sales-dashboard/src/components/dashboard/conversion-metrics.tsx` - Conversion rate tracking
- `apps/sales-dashboard/src/components/dashboard/rep-performance.tsx` - Individual sales rep performance
- `apps/sales-dashboard/src/components/dashboard/business-arm-filter.tsx` - Filter between Gameball and AUSA Hoops
- `apps/sales-dashboard/src/components/charts/call-volume-chart.tsx` - Call volume visualization
- `apps/sales-dashboard/src/components/charts/conversion-chart.tsx` - Conversion rate trends
- `apps/sales-dashboard/src/components/charts/revenue-attribution-chart.tsx` - Revenue per call/rep charts
- `apps/sales-dashboard/src/lib/aircall/client.ts` - AirCall API client implementation
- `apps/sales-dashboard/src/lib/aircall/webhook-handler.ts` - Process AirCall webhook events
- `apps/sales-dashboard/src/lib/activecampaign/client.ts` - ActiveCampaign API client
- `apps/sales-dashboard/src/lib/activecampaign/sync.ts` - ActiveCampaign data synchronization
- `apps/sales-dashboard/src/lib/sales/analytics.ts` - Sales performance calculations
- `apps/sales-dashboard/src/lib/sales/classification.ts` - Call type classification logic
- `apps/sales-dashboard/src/types/sales.ts` - Sales dashboard type definitions
- `apps/sales-dashboard/src/types/aircall.ts` - AirCall API type definitions
- `apps/sales-dashboard/src/types/activecampaign.ts` - ActiveCampaign API type definitions
- `apps/sales-dashboard/supabase/migrations/013_sales_dashboard_tables.sql` - Database schema for sales data
- `packages/shared-types/types/sales.ts` - Shared sales type definitions
- `packages/aircall-integration/index.ts` - AirCall integration package entry point
- `packages/aircall-integration/aircall/client.ts` - AirCall API client with rate limiting
- `packages/aircall-integration/aircall/webhook.ts` - AirCall webhook processing utilities
- `packages/aircall-integration/package.json` - AirCall integration package configuration

### Notes

- Unit tests should be placed alongside the code files they are testing (e.g., `client.test.ts` next to `client.ts`)
- Use `npm test` to run all tests or `npm test sales-dashboard` to run tests for the sales dashboard app
- The sales dashboard follows the same authentication patterns as the finance dashboard
- Database migrations extend the existing schema with sales-specific tables
- Shared packages follow the monorepo structure with `@hoops-pty/package-name` imports

--- 

## Detailed Tasks

### Phase 1: Foundation Setup

#### 1.0 Project Setup and Configuration
- [x] 1.0.1 Create new app directory `apps/sales-dashboard/` following monorepo structure
- [x] 1.0.2 Initialize Next.js 14 project with TypeScript and App Router
- [x] 1.0.3 Configure package.json with workspace dependencies and scripts
- [x] 1.0.4 Set up Tailwind CSS configuration extending finance dashboard theme
- [x] 1.0.5 Install and configure shadcn/ui components for sales dashboard
- [x] 1.0.6 Create project structure with proper folder organization
- [x] 1.0.7 Configure environment variables template with AirCall/ActiveCampaign settings
- [x] 1.0.8 Set up TypeScript configuration with strict mode

#### 1.1 Testing Setup and CI/CD Pipeline
- [x] 1.1.1 Configure Jest testing framework with React Testing Library
- [x] 1.1.2 Set up test utilities and mock data helpers
- [x] 1.1.3 Create test setup files and configuration
- [x] 1.1.4 Configure ESLint and Prettier with monorepo standards
- [x] 1.1.5 Set up GitHub Actions for automated testing
- [x] 1.1.6 Configure quality checks script (type-check, lint, test)  
- [x] 1.1.7 Create pre-commit hooks for code quality

#### 1.2 Initial Deployment Configuration
- [x] 1.2.1 Create Vercel project configuration for sales dashboard
- [x] 1.2.2 Configure deployment settings and build commands
- [x] 1.2.3 Set up staging environment for development testing
- [x] 1.2.4 Configure environment variables in Vercel
- [x] 1.2.5 Create initial deployment pipeline
- [x] 1.2.6 Test basic deployment with placeholder content

### Phase 2: Data Layer

#### 2.0 Database Schema and Migrations
- [ ] 2.0.1 Design sales dashboard database schema
- [ ] 2.0.2 Create migration 013_sales_dashboard_tables.sql
- [ ] 2.0.3 Add sales_calls table with call classification fields
- [ ] 2.0.4 Create sales_reps table with performance tracking
- [ ] 2.0.5 Add business_arms enum (gameball, ausa_hoops)
- [ ] 2.0.6 Create call_outcomes table for conversion tracking
- [ ] 2.0.7 Add revenue_attribution table linking calls to CRM opportunities
- [ ] 2.0.8 Create sync_logs table for AirCall/ActiveCampaign operations
- [ ] 2.0.9 Add proper indexes for performance optimization
- [ ] 2.0.10 Create views for common sales analytics queries

#### 2.1 Database Testing and Validation
- [ ] 2.1.1 Create database test fixtures and seed data
- [ ] 2.1.2 Write migration tests for schema validation
- [ ] 2.1.3 Test foreign key constraints and data integrity
- [ ] 2.1.4 Validate indexes and query performance
- [ ] 2.1.5 Test Row Level Security policies for sales data
- [ ] 2.1.6 Create data validation functions and tests

#### 2.2 Migration Testing and Rollback
- [ ] 2.2.1 Test migration deployment on staging database
- [ ] 2.2.2 Create rollback procedures for schema changes
- [ ] 2.2.3 Validate migration with production-like data volumes
- [ ] 2.2.4 Test migration performance and timing
- [ ] 2.2.5 Document migration procedures and troubleshooting

### Phase 3: External Integrations

#### 3.0 AirCall Integration Package
- [ ] 3.0.1 Create new package `packages/aircall-integration/`
- [ ] 3.0.2 Set up package.json with proper dependencies
- [ ] 3.0.3 Implement AirCall API client with authentication
- [ ] 3.0.4 Create rate limiting and error handling utilities
- [ ] 3.0.5 Build call data fetching with pagination support
- [ ] 3.0.6 Implement webhook processing utilities
- [ ] 3.0.7 Add call classification logic (sales vs customer service)
- [ ] 3.0.8 Create TypeScript types for AirCall API responses
- [ ] 3.0.9 Build phone number to business arm mapping logic
- [ ] 3.0.10 Implement incremental sync with call timestamps

#### 3.1 AirCall Integration Testing
- [ ] 3.1.1 Create mock AirCall API server for testing
- [ ] 3.1.2 Write unit tests for API client functions
- [ ] 3.1.3 Test rate limiting and error handling scenarios
- [ ] 3.1.4 Validate webhook processing and data transformation
- [ ] 3.1.5 Test call classification accuracy
- [ ] 3.1.6 Create integration tests with staging AirCall account
- [ ] 3.1.7 Test phone number mapping and business arm detection
- [ ] 3.1.8 Validate data integrity and transformation accuracy

#### 3.2 ActiveCampaign Integration
- [ ] 3.2.1 Create ActiveCampaign API client in sales dashboard
- [ ] 3.2.2 Implement CRM data fetching for opportunities and deals
- [ ] 3.2.3 Build contact and lead synchronization
- [ ] 3.2.4 Create revenue attribution logic linking calls to deals
- [ ] 3.2.5 Implement conversion tracking from calls to qualified leads
- [ ] 3.2.6 Add pipeline stage tracking for sales progression
- [ ] 3.2.7 Create TypeScript types for ActiveCampaign API
- [ ] 3.2.8 Build data transformation utilities

#### 3.3 ActiveCampaign Integration Testing
- [ ] 3.3.1 Create mock ActiveCampaign API for testing
- [ ] 3.3.2 Write unit tests for CRM client functions
- [ ] 3.3.3 Test revenue attribution logic accuracy
- [ ] 3.3.4 Validate conversion tracking calculations
- [ ] 3.3.5 Test data synchronization and transformation
- [ ] 3.3.6 Create integration tests with staging CRM account

#### 3.4 Integration Testing and Deployment
- [ ] 3.4.1 Test AirCall to ActiveCampaign data correlation
- [ ] 3.4.2 Validate end-to-end call to revenue attribution
- [ ] 3.4.3 Test webhook processing in production-like environment
- [ ] 3.4.4 Deploy AirCall integration package to staging
- [ ] 3.4.5 Validate integration performance and reliability
- [ ] 3.4.6 Test error handling and recovery scenarios
- [ ] 3.4.7 Create monitoring and alerting for integrations

### Phase 4: Core Application

#### 4.0 Sales Dashboard App Structure
- [ ] 4.0.1 Create app layout with navigation structure
- [ ] 4.0.2 Set up dashboard routing and page structure
- [ ] 4.0.3 Create main dashboard page with real-time metrics
- [ ] 4.0.4 Build reports page for historical analytics
- [ ] 4.0.5 Create settings page for dashboard configuration
- [ ] 4.0.6 Implement responsive design for mobile access
- [ ] 4.0.7 Add loading states and error boundaries
- [ ] 4.0.8 Create shared components and utilities

#### 4.1 Authentication and Access Control
- [ ] 4.1.1 Integrate with existing HoopsPty auth system
- [ ] 4.1.2 Configure role-based access for sales dashboard
- [ ] 4.1.3 Create middleware for route protection
- [ ] 4.1.4 Implement transparent access (all users see all data)
- [ ] 4.1.5 Add audit logging for dashboard access
- [ ] 4.1.6 Create session management for sales users
- [ ] 4.1.7 Test authentication flows and security

#### 4.2 Call Classification and Business Logic
- [ ] 4.2.1 Implement call type classification engine
- [ ] 4.2.2 Create business arm detection logic (Gameball vs AUSA Hoops)
- [ ] 4.2.3 Build sales vs customer service call identification
- [ ] 4.2.4 Implement conversion rate calculation logic
- [ ] 4.2.5 Create revenue per call/rep calculation utilities
- [ ] 4.2.6 Build performance benchmarking calculations
- [ ] 4.2.7 Add call outcome tracking and categorization
- [ ] 4.2.8 Create team average calculations for comparisons

#### 4.3 Core Logic Testing and Deployment
- [ ] 4.3.1 Write unit tests for call classification logic
- [ ] 4.3.2 Test business arm detection accuracy
- [ ] 4.3.3 Validate conversion rate calculations
- [ ] 4.3.4 Test performance calculation accuracy
- [ ] 4.3.5 Create integration tests for core business logic
- [ ] 4.3.6 Deploy core app structure to staging
- [ ] 4.3.7 Test authentication and access control
- [ ] 4.3.8 Validate app performance and responsiveness

### Phase 5: Dashboard Features

#### 5.0 Dashboard UI Components
- [ ] 5.0.1 Create call metrics dashboard tiles
- [ ] 5.0.2 Build conversion rate tracking components
- [ ] 5.0.3 Implement sales rep performance comparison tiles
- [ ] 5.0.4 Create business arm filter and switcher
- [ ] 5.0.5 Build call volume visualization charts
- [ ] 5.0.6 Implement conversion trend charts
- [ ] 5.0.7 Create revenue attribution charts
- [ ] 5.0.8 Add real-time activity feed
- [ ] 5.0.9 Build team leaderboard components
- [ ] 5.0.10 Create historical performance comparison views

#### 5.1 Real-time Data Synchronization
- [ ] 5.1.1 Implement AirCall webhook endpoints
- [ ] 5.1.2 Create real-time data processing pipeline
- [ ] 5.1.3 Build 15-minute scheduled sync jobs
- [ ] 5.1.4 Implement WebSocket connections for live updates
- [ ] 5.1.5 Create data caching strategy for performance
- [ ] 5.1.6 Add sync status monitoring and logging
- [ ] 5.1.7 Implement error handling and retry logic
- [ ] 5.1.8 Create manual sync functionality for admins

#### 5.2 UI Testing and Component Library
- [ ] 5.2.1 Write component tests for all dashboard tiles
- [ ] 5.2.2 Test chart components with various data scenarios
- [ ] 5.2.3 Create visual regression tests for UI consistency
- [ ] 5.2.4 Test responsive design across device sizes
- [ ] 5.2.5 Validate accessibility compliance
- [ ] 5.2.6 Test real-time update functionality
- [ ] 5.2.7 Create component documentation and examples

#### 5.3 Feature Testing and Deployment
- [ ] 5.3.1 Test complete dashboard functionality end-to-end
- [ ] 5.3.2 Validate real-time synchronization accuracy
- [ ] 5.3.3 Test performance with production-like data volumes
- [ ] 5.3.4 Deploy dashboard features to staging environment
- [ ] 5.3.5 Conduct user acceptance testing with sales team
- [ ] 5.3.6 Test concurrent user access and performance
- [ ] 5.3.7 Validate mobile responsiveness and usability

### Phase 6: Analytics and Reporting

#### 6.0 Performance Analytics and Reporting
- [ ] 6.0.1 Create historical trend analysis views
- [ ] 6.0.2 Build daily/weekly/monthly summary reports
- [ ] 6.0.3 Implement individual vs team performance comparisons
- [ ] 6.0.4 Create call outcome distribution analytics
- [ ] 6.0.5 Build revenue attribution reporting
- [ ] 6.0.6 Implement performance coaching insights
- [ ] 6.0.7 Create call duration and timing analysis
- [ ] 6.0.8 Build conversion funnel visualization
- [ ] 6.0.9 Add performance target tracking
- [ ] 6.0.10 Create executive summary dashboards

#### 6.1 Analytics Testing and Validation
- [ ] 6.1.1 Validate analytics calculation accuracy
- [ ] 6.1.2 Test historical data processing performance
- [ ] 6.1.3 Verify conversion tracking accuracy vs CRM
- [ ] 6.1.4 Test report generation with large datasets
- [ ] 6.1.5 Validate performance comparison algorithms
- [ ] 6.1.6 Test data aggregation and summary accuracy
- [ ] 6.1.7 Create reconciliation scripts vs source systems

#### 6.2 Final Integration Testing
- [ ] 6.2.1 Test complete end-to-end data flow
- [ ] 6.2.2 Validate AirCall to dashboard data accuracy
- [ ] 6.2.3 Test ActiveCampaign conversion attribution
- [ ] 6.2.4 Verify real-time updates and synchronization
- [ ] 6.2.5 Test system performance under full load
- [ ] 6.2.6 Validate security and access control
- [ ] 6.2.7 Conduct comprehensive user acceptance testing

#### 6.3 Production Deployment and Monitoring
- [ ] 6.3.1 Deploy sales dashboard to production environment
- [ ] 6.3.2 Configure production monitoring and alerting
- [ ] 6.3.3 Set up error tracking and logging
- [ ] 6.3.4 Create production support procedures
- [ ] 6.3.5 Implement backup and disaster recovery
- [ ] 6.3.6 Configure performance monitoring dashboards
- [ ] 6.3.7 Create user training documentation
- [ ] 6.3.8 Set up automated health checks
- [ ] 6.3.9 Monitor initial production usage and performance
- [ ] 6.3.10 Create maintenance and update procedures
