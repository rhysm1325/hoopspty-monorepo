# HoopsPty Business Monorepo

This monorepo contains all HoopsPty business applications and shared packages.

## Project Structure

```
HoopsPty/
├── apps/                          # Applications
│   ├── finance-dashboard/         # AUSA Finance Dashboard (Xero integration)
│   ├── website/                   # Public marketing website
│   ├── admin-portal/              # Business admin portal
│   └── tours-booking/             # Customer booking system
├── packages/                      # Shared packages
│   ├── shared-ui/                 # Reusable UI components
│   ├── shared-types/              # TypeScript type definitions
│   ├── shared-auth/               # Authentication utilities
│   ├── shared-utils/              # Utility functions
│   └── xero-integration/          # Xero API integration
├── tools/                         # Development tools
│   └── ai-dev-tasks/              # AI-powered development automation
└── docs/                          # Documentation and requirements
    └── tasks/                     # Project requirements and task lists
```

## Applications

### Finance Dashboard (`apps/finance-dashboard`)
- **URL**: `finance.hoopspty.com` (production)
- **Purpose**: Internal financial reporting and Xero integration
- **Users**: Finance team, Operations, Owner
- **Tech**: Next.js 14, Supabase, Xero API

### Website (`apps/website`)
- **URL**: `www.hoopspty.com` (production)
- **Purpose**: Public marketing website
- **Users**: Public visitors, potential customers
- **Tech**: Next.js 14, Tailwind CSS

### Admin Portal (`apps/admin-portal`)
- **URL**: `admin.hoopspty.com` (production)
- **Purpose**: Cross-system administration
- **Users**: Owner, Admin users
- **Tech**: Next.js 14, shared packages

### Tours Booking (`apps/tours-booking`)
- **URL**: `booking.hoopspty.com` (production)
- **Purpose**: Customer tour booking system
- **Users**: Customers, Operations team
- **Tech**: Next.js 14, Stripe, shared packages

## Development

### Quick Start
```bash
# Install all dependencies
npm install

# Start finance dashboard
npm run dev:finance

# Start website
npm run dev:website

# Run all tests
npm test

# Check code quality across all apps
npm run quality
```

### Available Scripts
- `npm run dev:finance` - Start finance dashboard
- `npm run dev:website` - Start marketing website  
- `npm run dev:admin` - Start admin portal
- `npm run build` - Build all applications
- `npm run test` - Run all tests
- `npm run quality` - Run quality checks (lint, type-check, test)

## Deployment

Each application deploys independently to Vercel:
- Finance Dashboard → `finance-dashboard-prod` Vercel project
- Website → `website-prod` Vercel project
- Admin Portal → `admin-portal-prod` Vercel project

All deployments are from this single GitHub repository with different root directories configured in Vercel.

## Shared Packages

### @hoops-pty/shared-ui
Reusable UI components built with Radix UI and Tailwind CSS.

### @hoops-pty/shared-types
TypeScript type definitions used across applications.

### @hoops-pty/shared-auth
Supabase authentication utilities and role management.

### @hoops-pty/shared-utils
Common utility functions for dates, formatting, and calculations.

### @hoops-pty/xero-integration
Xero API integration utilities and data synchronization.

## Contributing

1. Create feature branches for new work
2. Run `npm run quality` before committing
3. Follow conventional commit messages
4. Create PRs for code review

## Environment Setup

Each application has its own environment variables. Copy the respective `.env.example` files:

```bash
# Finance dashboard
cp apps/finance-dashboard/.env.example apps/finance-dashboard/.env.local

# Website (when created)
cp apps/website/.env.example apps/website/.env.local
```
