# 🏀 HoopsPty Monorepo - Developer Onboarding Guide

Welcome to the HoopsPty development team! This guide will help you understand our monorepo architecture and get you productive quickly.

## 🏗️ Monorepo Architecture Overview

### What is a Monorepo?

A monorepo (monolithic repository) is a software development strategy where multiple projects are stored in a single repository. For HoopsPty, this means:

- **All business applications** live in one GitHub repository
- **Shared code** can be easily reused across applications
- **Coordinated releases** and consistent tooling across all projects
- **Simplified dependency management** and version control

### Why We Use a Monorepo

1. **Code Sharing**: Common utilities, UI components, and business logic are shared
2. **Consistency**: Same tools, linting, and coding standards across all apps
3. **Simplified Development**: One repo to clone, one set of dependencies to manage
4. **Atomic Changes**: Cross-app changes can be made in a single commit
5. **Easier Onboarding**: New developers only need to learn one repository structure

## 📁 Repository Structure

```
HoopsPty/
├── apps/                              # 🎯 Individual Applications
│   ├── finance-dashboard/             # ✅ LIVE: Internal financial reporting
│   ├── website/                       # 🚧 PLANNED: Public marketing site
│   ├── admin-portal/                  # 🚧 PLANNED: Cross-system admin
│   └── tours-booking/                 # 🚧 PLANNED: Customer booking system
│
├── packages/                          # 📦 Shared Code (Future)
│   ├── shared-ui/                     # Reusable UI components
│   ├── shared-types/                  # TypeScript definitions
│   ├── shared-auth/                   # Authentication utilities
│   ├── shared-utils/                  # Common utility functions
│   └── xero-integration/              # Xero API integration
│
├── docs/                              # 📚 Documentation
│   ├── tasks/                         # Project requirements and task lists
│   │   ├── finance-dashboard/         # Finance dashboard PRD and tasks
│   │   └── sales-dashboard/           # Sales dashboard PRD and tasks
│   └── DEVELOPER_ONBOARDING.md       # This file
│
├── tools/                             # 🔧 Development Tools
│   └── ai-dev-tasks/                  # AI-powered development automation
│
├── .cursorrules                       # Cursor IDE configuration
├── .gitignore                         # Git ignore rules
└── README.md                          # Main repository documentation
```

## 🚀 Getting Started

### 1. Initial Setup

```bash
# Clone the repository
git clone https://github.com/rhysm1325/hoopspty-monorepo.git
cd hoopspty-monorepo

# Install dependencies for all applications
npm install
```

### 2. Choose Your Application

Navigate to the application you'll be working on:

```bash
# Finance Dashboard (most active)
cd apps/finance-dashboard

# Future applications
cd apps/website
cd apps/admin-portal
cd apps/tours-booking
```

### 3. Environment Setup

Each application has its own environment configuration:

```bash
# Copy environment template
cp .env.example .env.local

# Edit with your values
nano .env.local  # or use your preferred editor
```

### 4. Start Development

```bash
# Start the development server
npm run dev

# Application will be available at http://localhost:3000
```

## 🎯 Application Details

### Finance Dashboard (`apps/finance-dashboard`)

**Status**: ✅ **PRODUCTION READY**  
**Live URL**: https://ausa-finance-dashboard-88j3n71j3-rhys-murphys-projects.vercel.app

**Purpose**: Internal financial reporting and analytics with Xero integration

**Key Features**:
- Real-time financial dashboard with KPIs
- Accounts Receivable/Payable aging analysis
- Revenue stream reporting (Tours, Dr Dish, Marketing)
- Cash flow analysis and projections
- User management with role-based access
- Comprehensive audit logging

**Tech Stack**:
- Next.js 15 with App Router
- TypeScript
- Supabase (Auth + Database)
- Tailwind CSS + shadcn/ui
- Recharts for data visualization
- Xero API integration

**Development Commands**:
```bash
cd apps/finance-dashboard
npm run dev          # Start development server
npm run build        # Build for production
npm run test         # Run tests
npm run lint         # Run ESLint
npm run type-check   # Check TypeScript
npm run quality      # Run all quality checks
```

### Website (`apps/website`)

**Status**: 🚧 **PLANNED**

**Purpose**: Public marketing website for HoopsPty services

### Admin Portal (`apps/admin-portal`)

**Status**: 🚧 **PLANNED**

**Purpose**: Cross-system administration and management

### Tours Booking (`apps/tours-booking`)

**Status**: 🚧 **PLANNED**

**Purpose**: Customer-facing tour booking and payment system

## 🔧 Development Workflow

### Branch Strategy

```bash
# Create feature branch
git checkout -b feature/your-feature-name

# Work on your feature in the appropriate app directory
cd apps/finance-dashboard
# Make your changes...

# Commit with app prefix
git commit -m "finance: add new dashboard component"

# Push and create PR
git push origin feature/your-feature-name
```

### Commit Message Conventions

Use prefixes to indicate which application your changes affect:

- `finance: add new KPI widget` - Finance dashboard changes
- `website: update hero section` - Website changes
- `admin: add user management` - Admin portal changes
- `booking: implement payment flow` - Tours booking changes
- `shared: update auth utilities` - Shared package changes
- `monorepo: update build configuration` - Repository-wide changes

### Code Quality Standards

All applications must pass:
- ✅ TypeScript compilation with no errors
- ✅ ESLint with no errors  
- ✅ All tests passing
- ✅ 95%+ test coverage for financial calculations

```bash
# Run quality checks before committing
cd apps/finance-dashboard
npm run quality
```

## 🚀 Deployment Guide

### Understanding Monorepo Deployment

**Key Concept**: Each application deploys **independently** to its own Vercel project, even though they share the same GitHub repository.

### Current Deployments

| Application | Vercel Project | Status | Live URL |
|-------------|----------------|--------|----------|
| Finance Dashboard | `ausa-finance-dashboard` | ✅ LIVE | https://ausa-finance-dashboard-88j3n71j3-rhys-murphys-projects.vercel.app |
| Website | `hoopspty-website` | 🚧 Planned | TBD |
| Admin Portal | `hoopspty-admin` | 🚧 Planned | TBD |
| Tours Booking | `hoopspty-booking` | 🚧 Planned | TBD |

### How to Deploy

```bash
# 1. Navigate to the specific application
cd apps/finance-dashboard

# 2. Deploy to Vercel
npx vercel --prod

# 3. Vercel automatically detects the app and deploys from the subdirectory
```

### Vercel Configuration

Each app has its own `vercel.json` optimized for monorepo deployment:

```json
{
  "framework": "nextjs",
  "functions": {
    "src/app/api/cron/daily-sync/route.ts": {
      "maxDuration": 300
    }
  },
  "crons": [
    {
      "path": "/api/cron/daily-sync", 
      "schedule": "30 3 * * *"
    }
  ]
}
```

## 🤝 Team Collaboration

### Working on Different Apps

Multiple developers can work on different applications simultaneously without conflicts:

```bash
# Developer 1 working on finance dashboard
cd apps/finance-dashboard
git checkout -b finance/new-kpi-widget

# Developer 2 working on website
cd apps/website
git checkout -b website/landing-page-redesign

# No conflicts - each app is independent!
```

### Sharing Code Between Apps

When you need to share code between applications:

1. **Immediate Solution**: Copy shared utilities into each app's `src/lib/` directory
2. **Future Solution**: Extract to shared packages in `packages/` directory

Currently, we're using approach #1 for deployment simplicity.

## 🔍 Common Tasks

### Adding a New Component

```bash
# Navigate to the app
cd apps/finance-dashboard

# Create component
mkdir -p src/components/dashboard
touch src/components/dashboard/my-new-widget.tsx

# Add tests
touch src/components/dashboard/my-new-widget.test.tsx

# Export from index if needed
```

### Adding a New Page

```bash
# Navigate to the app
cd apps/finance-dashboard

# Create page in app directory
mkdir -p src/app/(dashboard)/my-new-page
touch src/app/(dashboard)/my-new-page/page.tsx

# Add to navigation if needed
# Edit src/components/layout/navigation.tsx
```

### Adding Database Changes

```bash
# Navigate to the app
cd apps/finance-dashboard

# Create migration
npm run migrate:create add_new_feature

# Edit the migration file
# Run migration
npm run db:push
```

## 🐛 Troubleshooting

### Common Issues

#### "Module not found" errors
- **Cause**: Importing from wrong app or missing dependency
- **Solution**: Check you're in the right app directory and imports are correct

#### Build failures
- **Cause**: Environment validation during build time
- **Solution**: Use dynamic imports for server-side modules in API routes

#### Deployment issues
- **Cause**: Vercel trying to build from wrong directory
- **Solution**: Ensure you're running `vercel` from the correct app directory

### Getting Help

1. **Check the app's README**: Each app has specific documentation
2. **Review recent commits**: See how similar features were implemented
3. **Check the task lists**: `docs/tasks/[app-name]/tasks-*.md`
4. **Ask the team**: Use the development Slack channel

## 📚 Additional Resources

- [Next.js 15 Documentation](https://nextjs.org/docs)
- [Supabase Documentation](https://supabase.com/docs)
- [Tailwind CSS Documentation](https://tailwindcss.com/docs)
- [shadcn/ui Components](https://ui.shadcn.com/)
- [Vercel Deployment Guide](https://vercel.com/docs)

## 🎯 Current Development Priorities

### Finance Dashboard
- ✅ Section 7.0: Executive Dashboard Implementation (COMPLETED)
- 🚧 Section 8.0: Revenue Stream Dashboards (NEXT)
- 🚧 Section 9.0: Detail Pages & Export
- 🚧 Section 10.0: Testing & Documentation

### Future Applications
- Website: Marketing site with tour information
- Admin Portal: Cross-system user and data management
- Tours Booking: Customer booking and payment system

---

**Welcome to the team! 🏀 Let's build amazing software together.**

For questions or help, reach out to the development team or check the project documentation in the `docs/` directory.
