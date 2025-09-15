# AUSA Finance Dashboard - Project Structure

This document outlines the organization and architecture of the AUSA Finance Dashboard codebase.

## 📁 Directory Structure

```
ausa-finance-dashboard/
├── docs/                           # Documentation
│   └── PROJECT_STRUCTURE.md        # This file
├── scripts/                        # Build and utility scripts
├── supabase/                       # Database configuration
│   └── migrations/                 # SQL migration files
├── __tests__/                      # Test files
│   ├── components/                 # Component tests
│   ├── lib/                        # Library function tests
│   ├── utils/                      # Utility function tests
│   └── integration/                # Integration tests
├── src/                            # Source code
│   ├── app/                        # Next.js App Router
│   │   ├── (auth)/                 # Authentication routes (route group)
│   │   │   ├── login/              # Login page
│   │   │   ├── signup/             # User registration
│   │   │   └── invite/             # User invitation handling
│   │   ├── (dashboard)/            # Dashboard routes (route group)
│   │   │   ├── tours/              # Tours revenue dashboard
│   │   │   ├── dr-dish/            # Dr Dish distribution dashboard
│   │   │   ├── marketing/          # Marketing revenue dashboard
│   │   │   ├── ar/                 # Accounts Receivable details
│   │   │   ├── ap/                 # Accounts Payable details
│   │   │   ├── settings/           # Admin settings
│   │   │   └── sync/               # Data sync status and logs
│   │   ├── actions/                # Server Actions
│   │   │   ├── sync/               # Data synchronization actions
│   │   │   ├── config/             # Configuration management actions
│   │   │   ├── dashboard/          # Dashboard data actions
│   │   │   └── export/             # Data export actions
│   │   ├── api/                    # API routes
│   │   │   ├── sync/               # Manual sync endpoints
│   │   │   ├── config/             # Configuration endpoints
│   │   │   ├── dashboard/          # Dashboard data endpoints
│   │   │   └── export/             # Data export endpoints
│   │   ├── globals.css             # Global styles
│   │   ├── layout.tsx              # Root layout
│   │   └── page.tsx                # Home page (Executive Dashboard)
│   ├── components/                 # React components
│   │   ├── ui/                     # Base UI components (shadcn/ui)
│   │   ├── charts/                 # Chart components (Recharts)
│   │   ├── dashboard/              # Dashboard-specific components
│   │   ├── forms/                  # Form components
│   │   ├── layout/                 # Layout components
│   │   └── settings/               # Settings page components
│   ├── lib/                        # Library code and utilities
│   │   ├── auth/                   # Authentication utilities
│   │   ├── database/               # Database utilities and queries
│   │   ├── xero/                   # Xero API integration
│   │   ├── analytics/              # Data processing and analytics
│   │   ├── validation/             # Input validation schemas
│   │   └── utils.ts                # General utilities (shadcn/ui)
│   ├── types/                      # TypeScript type definitions
│   │   ├── auth.ts                 # Authentication types
│   │   ├── financial.ts            # Financial data types
│   │   ├── xero.ts                 # Xero API types
│   │   └── index.ts                # Type exports
│   ├── constants/                  # Application constants
│   │   └── financial.ts            # Financial constants
│   ├── utils/                      # Utility functions
│   │   └── financial.ts            # Financial calculations
│   ├── hooks/                      # Custom React hooks
│   ├── contexts/                   # React contexts
│   ├── providers/                  # Context providers
│   └── stores/                     # State management (if needed)
├── .vscode/                        # VS Code configuration
│   ├── settings.json               # Editor settings
│   └── extensions.json             # Recommended extensions
├── .env.example                    # Environment variables template
├── .env.local                      # Local environment variables
├── .prettierrc                     # Prettier configuration
├── .prettierignore                 # Prettier ignore rules
├── eslint.config.mjs               # ESLint configuration
├── tsconfig.json                   # TypeScript configuration
├── tailwind.config.ts              # Tailwind CSS configuration
├── components.json                 # shadcn/ui configuration
├── next.config.ts                  # Next.js configuration
├── package.json                    # Dependencies and scripts
└── README.md                       # Project README
```

## 🏗️ Architecture Overview

### Next.js App Router Structure

- **Route Groups**: `(auth)` and `(dashboard)` for organizing related routes
- **Server Actions**: Located in `src/app/actions/` for secure server-side operations
- **API Routes**: RESTful endpoints in `src/app/api/` for external integrations

### Component Organization

- **UI Components**: Base components from shadcn/ui in `src/components/ui/`
- **Business Components**: Domain-specific components organized by feature
- **Layout Components**: Shared layout elements and navigation

### Data Layer

- **Types**: Comprehensive TypeScript definitions for all data structures
- **Constants**: Application-wide constants and configuration
- **Utilities**: Pure functions for calculations and data manipulation
- **Lib**: Business logic modules for different domains

## 📋 Key Design Principles

### 1. Separation of Concerns

- **Presentation**: React components handle UI rendering
- **Business Logic**: Utility functions and lib modules handle calculations
- **Data Access**: Server Actions and API routes handle data operations
- **Types**: Comprehensive type safety throughout the application

### 2. Australian Financial Year Focus

- All date utilities account for July 1 - June 30 financial year
- Timezone handling for Australia/Sydney
- Currency formatting for AUD

### 3. Role-Based Architecture

- User permissions defined in types and constants
- Component-level access control
- Database-level Row Level Security (RLS)

### 4. Performance Optimization

- Server-side data fetching with Server Actions
- Caching strategies for dashboard data
- Incremental data synchronization with Xero

### 5. Type Safety

- Strict TypeScript configuration
- Comprehensive type definitions
- Runtime validation for external data

## 🔧 Development Workflow

### File Naming Conventions

- **Components**: PascalCase (e.g., `MetricTile.tsx`)
- **Utilities**: camelCase (e.g., `financial.ts`)
- **Types**: camelCase with descriptive names (e.g., `financial.ts`)
- **Constants**: UPPER_SNAKE_CASE for values, camelCase for files

### Import Organization

```typescript
// External libraries
import React from 'react'
import { NextResponse } from 'next/server'

// Internal utilities and types
import { formatCurrency } from '@/utils/financial'
import type { UserRole, ARRecord } from '@/types'

// Components
import { MetricTile } from '@/components/ui/metric-tile'
import { DashboardCard } from '@/components/ui/dashboard-card'
```

### Code Quality Standards

- **ESLint**: Enforces code quality and consistency
- **Prettier**: Automatic code formatting
- **TypeScript**: Strict mode enabled with additional checks
- **Testing**: Unit tests for utilities, integration tests for components

## 🗄️ Database Organization

### Supabase Schema

- **Staging Tables**: Raw Xero data with `stg_` prefix
- **Analytics Tables**: Processed data with `dim_` and `fact_` prefixes
- **Configuration**: Application settings and mappings
- **Audit Logs**: User actions and system events

### Migration Strategy

- Incremental migrations in `supabase/migrations/`
- Version-controlled schema changes
- Rollback procedures for production deployments

## 🔐 Security Considerations

### Authentication & Authorization

- Supabase Auth for user management
- Role-based permissions at multiple levels
- Row Level Security (RLS) policies
- Audit logging for administrative actions

### Data Protection

- Server-side API calls only (no client-side Xero access)
- Environment variables for sensitive configuration
- Input validation and sanitization
- Rate limiting and error handling

## 📊 Business Logic Organization

### Revenue Stream Processing

- Tours: Seasonal analysis, deferred revenue handling
- Dr Dish: Inventory management, unit economics
- Marketing: Client-specific revenue tracking (Rebel Sport)

### Financial Calculations

- AR/AP aging with Australian business rules
- DSO/DPO calculations
- Gross margin analysis
- YTD vs prior year comparisons

### Data Synchronization

- Incremental sync with Xero using timestamps
- Error handling and retry logic
- Data validation and integrity checks
- Performance monitoring and logging

This structure supports the development of a robust, maintainable financial dashboard that meets the specific needs of AUSA Hoops' Australian business operations.
