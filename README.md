# HoopsPty Business Monorepo

**🏀 Welcome to the HoopsPty Monorepo!**

This is a **monorepo architecture** containing all HoopsPty business applications and shared packages. Each application can be developed, tested, and deployed independently while sharing common code through shared packages.

## 🚨 Important for New Developers

**This is a MONOREPO** - not a single application. Key things to understand:

1. **Multiple Applications**: Each app in `apps/` is a separate Next.js application
2. **Shared Code**: Common utilities are in `packages/` (currently inlined in apps due to deployment constraints)
3. **Independent Deployment**: Each app deploys separately to its own Vercel project
4. **Single Repository**: All apps share one GitHub repository for easier code sharing and maintenance

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

## 🛠️ Development Guide for New Developers

### Prerequisites
- Node.js 18+ 
- npm 9+
- Git
- VS Code (recommended)

### First-Time Setup
```bash
# 1. Clone the monorepo
git clone https://github.com/rhysm1325/hoopspty-monorepo.git
cd hoopspty-monorepo

# 2. Install all dependencies (this installs for all apps)
npm install

# 3. Set up environment variables for the app you're working on
cd apps/finance-dashboard
cp .env.example .env.local
# Edit .env.local with your values

# 4. Start development server for specific app
npm run dev
```

### Working with the Monorepo

#### Starting Applications
```bash
# Finance Dashboard (most active development)
cd apps/finance-dashboard && npm run dev

# Future apps (when created)
cd apps/website && npm run dev
cd apps/admin-portal && npm run dev
cd apps/tours-booking && npm run dev
```

#### Building and Testing
```bash
# Build specific app
cd apps/finance-dashboard && npm run build

# Test specific app
cd apps/finance-dashboard && npm test

# Run quality checks on specific app
cd apps/finance-dashboard && npm run quality
```

#### Available Scripts (per app)
- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run test` - Run tests
- `npm run lint` - Run ESLint
- `npm run type-check` - Check TypeScript
- `npm run quality` - Run all quality checks

## 🚀 Deployment Strategy

### Monorepo Deployment Architecture

Each application deploys **independently** to its own Vercel project:

| Application | Vercel Project | Live URL | Root Directory |
|-------------|----------------|----------|----------------|
| Finance Dashboard | `ausa-finance-dashboard` | [Live Demo](https://ausa-finance-dashboard-88j3n71j3-rhys-murphys-projects.vercel.app) | `apps/finance-dashboard` |
| Website | `hoopspty-website` | TBD | `apps/website` |
| Admin Portal | `hoopspty-admin` | TBD | `apps/admin-portal` |
| Tours Booking | `hoopspty-booking` | TBD | `apps/tours-booking` |

### How Monorepo Deployment Works

1. **Single GitHub Repository**: All apps live in one repo (`hoopspty-monorepo`)
2. **Multiple Vercel Projects**: Each app has its own Vercel project
3. **Root Directory Configuration**: Each Vercel project is configured to build from its specific `apps/` subdirectory
4. **Independent Releases**: Apps can be deployed separately without affecting others
5. **Shared Codebase**: All apps benefit from shared utilities and components

### Deploying Applications

```bash
# Deploy Finance Dashboard
cd apps/finance-dashboard
npx vercel --prod

# Deploy Website (when ready)
cd apps/website  
npx vercel --prod

# Each app maintains its own vercel.json configuration
```

### Vercel Configuration

Each app has its own `vercel.json` configured for monorepo deployment:

```json
{
  "framework": "nextjs",
  "buildCommand": "cd ../.. && npm run build:finance-dashboard",
  "outputDirectory": ".next",
  "installCommand": "cd ../.. && npm install"
}
```

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

## 👥 For New Developers

**📖 READ THIS FIRST**: [Developer Onboarding Guide](docs/DEVELOPER_ONBOARDING.md)

The onboarding guide contains everything you need to know about:
- Monorepo architecture and benefits
- Setting up your development environment
- Understanding the deployment strategy
- Common development tasks and troubleshooting
- Team collaboration workflows

## 🤝 Contributing

1. **Read the onboarding guide** (see link above)
2. Create feature branches for new work
3. Use commit prefixes: `finance:`, `website:`, `shared:`, etc.
4. Run `npm run quality` before committing
5. Follow conventional commit messages
6. Create PRs for code review

## Environment Setup

Each application has its own environment variables. Copy the respective `.env.example` files:

```bash
# Finance dashboard
cp apps/finance-dashboard/.env.example apps/finance-dashboard/.env.local

# Website (when created)
cp apps/website/.env.example apps/website/.env.local
```
