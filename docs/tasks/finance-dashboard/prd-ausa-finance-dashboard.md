# Product Requirements Document: AUSA Finance Dashboard

## 1. Introduction/Overview

The AUSA Finance Dashboard is a secure internal web application that integrates with Xero accounting software to provide real-time financial insights for AUSA Hoops Pty Ltd. The system addresses the need for role-based financial reporting across three distinct revenue streams: Tours, Dr Dish distribution, and Marketing revenue (primarily from Rebel Sport).

The application solves the problem of fragmented financial data by creating a centralized dashboard that mirrors key Xero data locally for fast analytics, while maintaining strict role-based access controls and providing Australian financial year reporting aligned with business operations.

**Goal**: Build a comprehensive financial dashboard that enables different stakeholders to access relevant financial insights while maintaining data security and providing actionable business intelligence.

## 2. Goals

1. **Data Integration**: Successfully sync and mirror critical Xero accounting data to local database for fast analytics
2. **Role-Based Access**: Implement secure, role-based dashboards for 5 distinct user types (Owner, Finance, Operations, Sales, Marketing)
3. **Business Intelligence**: Provide key financial insights including AR/AP aging, cash position, YTD vs prior year revenue, and gross margins
4. **Australian Compliance**: Support Australian financial year (July-June), AUD currency, and GST reporting (Accrual/Cash views)
5. **Revenue Stream Analysis**: Enable detailed analysis of Tours (seasonal), Dr Dish distribution (inventory/margins), and Marketing revenue
6. **Performance**: Achieve sub-2-second page load times and maintain data accuracy within $1 AUD of Xero reports

## 3. User Stories

### Owner
- As an Owner, I want to see a comprehensive executive dashboard so that I can monitor overall business performance
- As an Owner, I want full access to all financial data and settings so that I can make strategic decisions
- As an Owner, I want to configure system mappings so that financial data is categorized correctly

### Finance Team
- As a Finance user, I want to run manual data syncs so that I can ensure reports are up-to-date before important meetings
- As a Finance user, I want to manage account mappings so that revenue streams are properly categorized
- As a Finance user, I want to see detailed AR/AP aging so that I can manage cash flow effectively

### Operations Team
- As an Operations user, I want to see Tours dashboard and customer receivables so that I can manage tour bookings and collections
- As an Operations user, I want to identify overdue tour customers so that I can follow up on payments

### Sales Team (Dr Dish)
- As a Sales user, I want to see Dr Dish distribution metrics so that I can track sales performance and inventory levels
- As a Sales user, I want to see machine customer receivables so that I can manage customer relationships

### Marketing Team
- As a Marketing user, I want to see marketing revenue dashboard so that I can track Rebel Sport and other marketing income
- As a Marketing user, I want to monitor invoice status so that I can ensure timely payments

## 4. Functional Requirements

### 4.1 Authentication & User Management
1. The system must support email-based authentication using Supabase Auth or Clerk
2. The system must implement role-based access control with 5 roles: Owner, Finance, Operations, Sales, Marketing
3. The system must support admin invitation workflow for user onboarding via email
4. The system must enforce basic password requirements (minimum 8 characters)
5. The system must maintain an audit log of all sign-ins and settings changes
6. The system must implement row-level security in the database where applicable

### 4.2 Xero Integration & Data Sync
7. The system must integrate with Xero via MCP tool with required scopes: `offline_access accounting.transactions accounting.reports.read accounting.settings openid profile email`
8. The system must perform incremental data synchronization using `If-Modified-Since` headers
9. The system must mirror the following Xero objects: Accounts, Tracking Categories/Options, Contacts, Invoices (AR), Bills (AP), Payments, Credit Notes, Manual Journals, Items/Inventory, Bank Accounts/Transactions
10. The system must store sync checkpoints with `UpdatedDateUTC` timestamps per object type
11. The system must perform automatic daily sync at 03:30 Australia/Sydney time
12. The system must provide manual "Sync Now" functionality for Finance and Owner roles
13. The system must handle sync failures with automatic retry and error logging
14. The system must respect Xero rate limits with automatic backoff
15. The system must pull all available historical data from Xero on initial setup

### 4.3 Configuration & Mappings
16. The system must provide a Settings page for configuring revenue stream mappings
17. The system must allow mapping of Xero account codes to business revenue streams (Tours, Dr Dish, Marketing)
18. The system must allow mapping of Xero item codes to Dr Dish product categories
19. The system must allow selection of COGS accounts for gross margin calculations
20. The system must support GST method selection (Accrual or Cash reporting)
21. The system must allow configuration of deferred revenue rules for Tours
22. The system must store all configuration in a `config_mappings` table

### 4.4 Dashboard & Reporting
23. The system must provide an Executive dashboard with cash position, AR/AP totals with aging, YTD revenue vs prior year, and gross margins
24. The system must provide a Tours-specific dashboard with seasonal revenue analysis and tour-related AR
25. The system must provide a Dr Dish distribution dashboard with inventory levels, unit sales, and margins
26. The system must provide a Marketing revenue dashboard focused on Rebel Sport and other marketing clients
27. The system must calculate and display AR aging in buckets: 0-30, 31-60, 61-90, 90+ days
28. The system must calculate and display AP aging in the same buckets
29. The system must calculate DSO (Days Sales Outstanding) and DPO (Days Payable Outstanding)
30. The system must provide YTD vs prior year revenue comparison by financial year week
31. The system must display all monetary values in AUD with proper formatting
32. The system must provide export to CSV functionality for all data tables
33. The system must cache dashboard data until next sync for optimal performance

### 4.5 Financial Year & Australian Settings
34. The system must support Australian financial year (1 July to 30 June)
35. The system must use Australia/Sydney timezone for all date calculations
36. The system must calculate financial year week index starting from 1 July
37. The system must support both Accrual and Cash GST reporting methods
38. The system must handle leap years correctly in YTD comparisons

### 4.6 Data Processing & Analytics
39. The system must tag all transactions with revenue stream dimensions using admin mappings
40. The system must calculate gross margins using mapped COGS accounts
41. The system must compute inventory turns and sell-through rates for Dr Dish
42. The system must identify and highlight overdue customers (>45 days) and suppliers (>60 days)
43. The system must calculate week-over-week revenue variance and flag significant changes (>20%)
44. The system must maintain data accuracy within $1 AUD of equivalent Xero reports

## 5. Non-Goals (Out of Scope)

1. **Data Editing**: The system will not allow editing of Xero data - it is read-only
2. **Complex Revenue Recognition**: Advanced revenue recognition beyond simple Tours deferred revenue rules
3. **Warehouse Management**: Full inventory management system for Dr Dish (basic stock levels only)
4. **Multi-Tenant**: Support for multiple companies/organizations (single Xero org only)
5. **Advanced Budgeting**: Budget vs actual reporting (stretch goal for future)
6. **Mobile App**: Responsive web only, no native mobile application
7. **Real-Time Sync**: Live data streaming (daily sync plus manual refresh sufficient)
8. **Custom Reporting**: Ad-hoc report builder (predefined dashboards only)

## 6. Design Considerations

### UI/UX Requirements
- Use Tailwind CSS with shadcn/ui components for consistent design system
- Implement Recharts for all data visualizations
- Provide date picker presets: FY to date, last FY, custom range
- Use consistent number formatting: AUD currency, thousands separators, 2 decimals for money, 0 decimals for units
- Include tooltips on charts explaining calculation formulas
- Implement filter chips for revenue streams and facilities
- Ensure responsive design for desktop and tablet usage

### Navigation Structure
- Login page
- Executive Dashboard (default landing)
- Tours Dashboard
- Dr Dish Dashboard  
- Marketing Dashboard
- AR Detail page
- AP Detail page
- Settings page (Admin only)
- Data Sync & Logs page

## 7. Technical Considerations

### Technology Stack
- **Framework**: Next.js 14 with TypeScript and App Router
- **Authentication**: Supabase Auth with email-based login
- **Database**: Supabase Postgres with Row Level Security (RLS)
- **UI**: Tailwind CSS, shadcn/ui, Recharts
- **Deployment**: Vercel with environment variables for secrets
- **Scheduling**: Vercel cron jobs for automated sync
- **External Integration**: Xero MCP tool within Cursor

### Database Schema
- Staging tables with `stg_` prefix for raw Xero data
- Analytics tables with `dim_` and `fact_` prefixes for processed data
- Configuration table for mappings and settings
- Audit log table for security tracking
- Sync checkpoints table for incremental updates

### Security Requirements
- All Xero API calls must be server-side only (Server Actions)
- No client-side exposure of API keys or tokens
- Implement proper RLS policies based on user roles
- Store secrets in Vercel environment variables
- Never log sensitive data or tokens

### Performance Considerations
- Use materialized views for complex calculations (e.g., `fact_revenue_by_week`)
- Implement proper database indexing for common queries
- Cache dashboard data between syncs
- Optimize for 5,000-15,000 annual transactions volume

## 8. Success Metrics

### Data Accuracy
- AR and AP totals match Xero reports within $1 AUD for sample periods
- Revenue YTD and prior year comparisons match Xero P&L when using same account filters
- Dr Dish unit sales exactly match Xero invoice item counts for mapped item codes
- Inventory on hand equals Xero tracked inventory or clearly labeled as approximation

### Performance Metrics
- All dashboard pages load in under 2 seconds after initial data sync
- Daily sync completes within 15 minutes for typical data volumes
- System maintains 99.5% uptime during business hours

### User Adoption
- All 5 user roles successfully onboarded and using appropriate dashboards within 2 weeks
- Finance team uses manual sync feature regularly
- Operations team identifies and follows up on overdue accounts using AR aging data

### Business Impact
- Reduction in time spent manually reconciling Xero reports
- Improved visibility into revenue stream performance
- Faster identification of overdue accounts and cash flow issues

## 9. Open Questions

1. **Tour Delivery Tracking**: How will the system know when a tour is actually delivered for deferred revenue recognition? Manual entry or integration with tour scheduling?

2. **Inventory Valuation**: If Xero tracked inventory is not available for all Dr Dish items, what method should be used for COGS calculation? FIFO approximation from purchase records?

3. **Multi-Currency**: Are there any foreign currency transactions that need special handling, or is everything in AUD?

4. **Backup Strategy**: What backup and disaster recovery requirements exist for the local database?

5. **Data Retention**: How long should historical sync data and audit logs be retained?

6. **Integration Testing**: Should there be a staging/test environment that connects to Xero Demo Company for testing?

7. **Notification System**: Beyond audit logs, are there requirements for email alerts on sync failures or overdue accounts?

8. **Custom Fields**: Are there any Xero custom fields that need to be captured for Tours or Dr Dish categorization?

## 10. Implementation Phases

### Phase 1: Foundation (Weeks 1-2)
- Set up Next.js 14 project with TypeScript, Tailwind, shadcn/ui
- Implement Supabase authentication and user roles
- Create basic database schema with RLS policies
- Build Settings page with configuration forms

### Phase 2: Xero Integration (Weeks 3-4)
- Implement Xero MCP connection flow
- Build staging tables and sync infrastructure
- Create Server Actions for data synchronization
- Implement incremental sync with checkpoints

### Phase 3: Data Processing (Weeks 5-6)
- Build analytics transformation layer
- Create dimension and fact tables
- Implement revenue stream tagging logic
- Build materialized views for performance

### Phase 4: Dashboards (Weeks 7-9)
- Build Executive dashboard with key tiles and charts
- Implement Tours dashboard with seasonal analysis
- Create Dr Dish dashboard with inventory metrics
- Build Marketing dashboard for Rebel Sport tracking

### Phase 5: Detail Pages & Polish (Weeks 10-11)
- Build AR and AP detail pages with filtering
- Implement data export functionality
- Add sync logging and manual sync features
- Performance optimization and testing

### Phase 6: Testing & Deployment (Week 12)
- Build reconciliation testing scripts
- User acceptance testing with each role
- Production deployment and monitoring setup
- Documentation and training materials

## 11. Acceptance Criteria Summary

- [ ] All 5 user roles can successfully log in and access appropriate dashboards
- [ ] Daily automated sync runs successfully at 03:30 Sydney time
- [ ] Manual sync functionality works for Finance and Owner roles
- [ ] Executive dashboard shows accurate cash, AR/AP aging, and YTD revenue
- [ ] Tours dashboard displays seasonal revenue patterns and tour-specific AR
- [ ] Dr Dish dashboard shows accurate inventory levels and unit sales
- [ ] Marketing dashboard correctly displays Rebel Sport invoices and status
- [ ] All monetary values display in proper AUD format
- [ ] Data accuracy matches Xero reports within $1 AUD tolerance
- [ ] All pages load within 2-second performance requirement
- [ ] Row-level security prevents unauthorized data access
- [ ] Audit log captures all administrative actions
- [ ] CSV export functionality works for all data tables
- [ ] System handles sync failures gracefully with proper error logging

---

*This PRD serves as the comprehensive specification for building the AUSA Finance Dashboard. All requirements should be implemented according to the specified technical stack and security considerations.*
