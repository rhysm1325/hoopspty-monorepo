# Product Requirements Document: HoopsPty Sales Dashboard

## 1. Introduction/Overview

The HoopsPty Sales Dashboard is a comprehensive internal web application that integrates with AirCall and ActiveCampaign CRM to provide real-time sales performance insights across HoopsPty's two primary business arms: Gameball (Dr Dish distribution) and AUSA Hoops (touring). The system addresses the critical need for sales visibility, performance tracking, and data-driven coaching decisions.

The application solves the problem of fragmented sales data by creating a centralized dashboard that tracks call volume, conversion rates, and revenue generation while differentiating between sales and customer service activities. This enables better sales management, performance coaching, and strategic decision-making.

**Goal**: Build a transparent sales performance dashboard that enables executives, sales managers, and sales representatives to monitor call activity, track conversion rates, and measure revenue impact across both business divisions.

## 2. Goals

1. **Multi-Platform Integration**: Successfully integrate AirCall phone system data with ActiveCampaign CRM for comprehensive sales tracking
2. **Business Arm Differentiation**: Clearly separate and track performance between Gameball (Dr Dish) and AUSA Hoops (touring) business units
3. **Call Type Classification**: Distinguish between sales calls and customer service calls for accurate performance measurement
4. **Performance Visibility**: Provide transparent access to sales metrics for all team members (executives, managers, and reps)
5. **Historical Analytics**: Maintain complete historical data since implementation for trend analysis and performance coaching
6. **Real-Time Monitoring**: Enable real-time tracking of daily activity alongside historical performance analysis

## 3. User Stories

### Executive Team
- As an Executive, I want to see overall sales performance across both business arms so that I can make strategic decisions
- As an Executive, I want to monitor team productivity and conversion rates so that I can identify areas for improvement
- As an Executive, I want to track revenue generation from sales calls so that I can measure ROI on sales activities

### Sales Managers
- As a Sales Manager, I want to see individual rep performance vs team averages so that I can provide targeted coaching
- As a Sales Manager, I want to monitor daily call volume and conversion rates so that I can ensure targets are being met
- As a Sales Manager, I want to access historical performance data so that I can identify trends and improvement opportunities

### Sales Representatives
- As a Sales Rep, I want to see my own performance metrics so that I can track my progress against targets
- As a Sales Rep, I want to compare my performance to team averages so that I can identify areas for improvement
- As a Sales Rep, I want to see my conversion rates and revenue generation so that I can focus on high-impact activities

## 4. Functional Requirements

### 4.1 Data Integration & Synchronization
1. The system must integrate with AirCall API to retrieve call data in real-time
2. The system must integrate with ActiveCampaign CRM to track lead conversion and revenue attribution
3. The system must differentiate calls by phone number to separate Gameball vs AUSA Hoops business arms
4. The system must identify customer service calls vs sales calls based on phone line routing
5. The system must perform automatic data synchronization every 15 minutes during business hours
6. The system must maintain all historical call data since implementation with no data retention limits

### 4.2 Business Logic & Classification
7. The system must categorize calls into four distinct types:
   - Gameball (Dr Dish) Sales Calls
   - Gameball (Dr Dish) Customer Service Calls  
   - AUSA Hoops Sales Calls
   - AUSA Hoops Customer Service Calls
8. The system must track call outcomes and link them to CRM opportunities when possible
9. The system must calculate conversion rates based on calls that result in qualified leads or sales
10. The system must attribute revenue to original sales calls through CRM integration

### 4.3 Dashboard Views & Analytics
11. The system must provide a real-time dashboard showing today's call activity
12. The system must offer daily, weekly, and monthly summary views
13. The system must display individual sales rep performance metrics
14. The system must show team average comparisons for benchmarking
15. The system must provide historical trending analysis over time
16. The system must calculate and display key metrics:
    - Call volume per rep per day/week/month
    - Conversion rate (calls to qualified leads/sales)
    - Revenue generated per call/rep
    - Average call duration
    - Call outcome distribution

### 4.4 Access Control & Transparency
17. The system must provide single dashboard access to all users (executives, managers, sales reps)
18. The system must implement role-based authentication using the existing HoopsPty auth system
19. The system must maintain transparency culture by showing all performance data to all users
20. The system must not require separate views or restricted access based on user roles

### 4.5 Performance & Reliability
21. The system must achieve sub-3-second page load times for dashboard views
22. The system must handle concurrent access from up to 50 users
23. The system must maintain 99% uptime during business hours (9 AM - 6 PM AEST)
24. The system must provide graceful error handling when external APIs are unavailable

## 5. Non-Goals (Out of Scope)

1. **Email Notifications**: No automated alerts or email notifications in initial version
2. **Data Export**: No export functionality for reports or raw data
3. **Business Arm Comparison**: No direct comparative analysis tools between Gameball and AUSA Hoops
4. **Finance Dashboard Integration**: No real-time integration with finance dashboard (may be considered for future phases)
5. **Call Recording**: No integration with call recording or playback features
6. **Advanced CRM Features**: No lead management or opportunity creation within the dashboard
7. **Mobile App**: Web-only interface, no native mobile applications
8. **Advanced Analytics**: No predictive analytics or AI-powered insights

## 6. Technical Considerations

### 6.1 Architecture
- Build as a new app in `apps/sales-dashboard/` following monorepo structure
- Utilize shared packages: `@hoops-pty/shared-ui`, `@hoops-pty/shared-auth`, `@hoops-pty/shared-types`
- Create new integration package: `@hoops-pty/aircall-integration`

### 6.2 API Integration
- Implement AirCall API client with proper rate limiting and error handling
- Create ActiveCampaign integration for CRM data correlation
- Follow similar patterns established in the Xero integration for consistency

### 6.3 Data Storage
- Extend existing Supabase database with sales-specific tables
- Implement proper data synchronization and caching strategies
- Maintain data integrity between AirCall and CRM systems

## 7. Success Metrics

### 7.1 Primary Success Indicators
1. **Better Sales Visibility**: 100% of sales team actively using dashboard within 30 days of launch
2. **Improved Performance Coaching**: Sales managers report improved coaching conversations within 60 days
3. **Increased Productivity**: 10% improvement in calls per rep per day within 90 days
4. **Enhanced Conversion Tracking**: 95% accuracy in conversion rate calculations within 30 days

### 7.2 Secondary Success Indicators
5. **User Engagement**: Average 5+ dashboard views per user per day
6. **Data Accuracy**: <1% discrepancy between dashboard metrics and source systems
7. **System Performance**: Consistent sub-3-second load times
8. **Business Impact**: Measurable improvement in overall sales conversion rates within 6 months

## 8. Open Questions

1. **CRM Integration Depth**: How detailed should the ActiveCampaign integration be? Should we sync all opportunity data or focus on conversion tracking?

2. **Call Outcome Tracking**: Do sales reps currently log call outcomes in AirCall or ActiveCampaign? How should we capture conversion data?

3. **Revenue Attribution**: What's the typical sales cycle length for both business arms? How should we attribute revenue to original sales calls?

4. **Historical Data**: How far back does existing AirCall data go? Should we import all historical data or start fresh?

5. **Performance Targets**: What are the current call volume and conversion rate targets for sales reps? Should these be configurable in the system?

6. **Business Hours**: What are the standard business hours for call tracking? Should weekend/after-hours calls be tracked differently?

---

**File Location**: `docs/tasks/sales-dashboard/prd-sales-dashboard.md`
**Created**: Based on requirements gathering session
**Next Steps**: Review and approve PRD, then proceed to technical task breakdown
