# AUSA Finance Dashboard

A secure internal web application for AUSA Hoops Pty Ltd that integrates with Xero accounting data to provide real-time financial insights and analytics.

## 🏀 About AUSA Hoops

AUSA Hoops Pty Ltd operates three revenue streams:
- **Tours**: Basketball tours and experiences (seasonal: Sep-Nov)
- **Dr Dish Distribution**: Basketball training equipment sales
- **Marketing**: Rebel Sport partnerships and marketing services

## 🎯 Project Overview

The AUSA Finance Dashboard provides role-based financial insights with:
- **Real-time Xero integration** for live financial data
- **Australian Financial Year** calculations (July-June)
- **Role-based dashboards** for 5 user types
- **Comprehensive audit logging** with 7-year retention
- **Enterprise-grade security** with Row Level Security (RLS)

## 🚀 Tech Stack

- **Frontend**: Next.js 14, TypeScript, Tailwind CSS, shadcn/ui
- **Backend**: Supabase (Auth + Postgres), Vercel cron jobs
- **Integration**: Xero MCP for secure API access
- **Analytics**: Recharts for data visualization
- **Testing**: Jest, React Testing Library
- **Deployment**: Vercel

## 🏗️ Architecture

### Database Schema (25+ Tables)
- **User Management**: Profiles, roles, audit logs
- **Xero Staging**: 12+ tables for raw Xero data
- **Analytics**: Dimensional model with fact/dimension tables
- **Configuration**: Business rules, mappings, alerts
- **Sync Management**: Checkpoints, sessions, performance tracking

### User Roles & Permissions
1. **Owner**: Full system access
2. **Finance**: Financial data and reporting
3. **Operations**: Tours-focused analytics
4. **Sales**: Dr Dish distribution insights  
5. **Marketing**: Marketing revenue and partnerships

## 🔐 Security Features

- **Supabase Auth**: Email-based authentication
- **Row Level Security**: Database-level access control
- **Rate Limiting**: Login attempts and API requests
- **Audit Logging**: Comprehensive activity tracking
- **Session Management**: Secure token handling
- **CSRF Protection**: Request validation

## 📊 Key Features

### Dashboard Insights
- **Accounts Receivable/Payable**: Aging analysis with 30/60/90 day buckets
- **YTD Revenue vs Last Year**: Week-aligned comparisons
- **Cash Position**: Real-time bank account balances
- **Gross Margin**: Revenue stream profitability
- **Inventory Tracking**: Dr Dish stock levels
- **Unit Economics**: Per-tour and per-product metrics

### Australian Business Compliance
- **Financial Year**: July 1 - June 30 calculations
- **GST Support**: Tax-inclusive/exclusive handling
- **Currency**: AUD formatting and calculations
- **Seasonal Analysis**: Tourism peak season tracking

## 🛠️ Development

### Prerequisites
- Node.js 18+
- npm or yarn
- Supabase CLI
- Git

### Installation
```bash
# Clone the repository
git clone https://github.com/rhysm1325/ausahoops-finance-dashboard.git
cd ausahoops-finance-dashboard

# Install dependencies
npm install

# Set up environment variables
npm run setup:env
# Edit .env.local with your actual values

# Set up database (requires Supabase project)
npm run db:push

# Generate TypeScript types
npm run types:generate

# Start development server
npm run dev
```

### Environment Variables
Copy `env.example` to `.env.local` and configure:

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Xero Integration
XERO_CLIENT_ID=your_xero_client_id
XERO_CLIENT_SECRET=your_xero_client_secret
XERO_REDIRECT_URI=your_redirect_uri

# Email Service (Resend)
RESEND_API_KEY=your_resend_api_key
EMAIL_FROM=noreply@yourdomain.com

# Business Configuration
BUSINESS_NAME="AUSA Hoops Pty Ltd"
BUSINESS_ABN=your_abn_number
PRIMARY_REVENUE_STREAM=tours
```

### Available Scripts

```bash
# Development
npm run dev              # Start development server
npm run build           # Build for production
npm run start           # Start production server

# Code Quality
npm run lint            # Run ESLint
npm run lint:fix        # Fix ESLint issues
npm run format          # Format with Prettier
npm run type-check      # TypeScript checking

# Testing
npm test                # Run Jest tests
npm run test:watch      # Run tests in watch mode
npm run test:coverage   # Generate coverage report

# Database
npm run db:push         # Push schema to Supabase
npm run db:reset        # Reset database
npm run migrate:list    # List migrations
npm run migrate:create  # Create new migration
npm run types:generate  # Generate TypeScript types
```

## 📁 Project Structure

```
src/
├── app/                    # Next.js 14 App Router
│   ├── (auth)/            # Authentication pages
│   ├── (dashboard)/       # Protected dashboard pages
│   └── api/               # API routes
├── components/            # React components
│   ├── ui/                # shadcn/ui components
│   ├── layout/            # Layout components
│   └── settings/          # Admin components
├── lib/                   # Utility libraries
│   ├── auth/              # Authentication utilities
│   ├── database/          # Database operations
│   ├── email/             # Email templates
│   └── supabase/          # Supabase clients
├── types/                 # TypeScript definitions
├── utils/                 # Utility functions
└── constants/             # Application constants

supabase/
├── migrations/            # Database migrations
└── config.toml           # Supabase configuration

__tests__/                # Test files
scripts/                  # Build and utility scripts
```

## 🔄 Data Flow

1. **Xero Integration**: Secure MCP connection pulls financial data
2. **Staging Layer**: Raw Xero data stored in staging tables
3. **Analytics Processing**: Transform to dimensional model
4. **Dashboard Rendering**: Role-based data presentation
5. **Audit Logging**: All actions tracked for compliance

## 📈 Performance Features

- **Materialized Views**: Pre-computed analytics
- **Strategic Indexing**: 100+ optimized database indexes
- **Incremental Sync**: If-Modified-Since headers for efficiency
- **Caching**: Dashboard data cached between syncs
- **Rate Limiting**: Xero API quota management

## 🧪 Testing

Comprehensive test coverage includes:
- **Unit Tests**: Utility functions, business logic
- **Component Tests**: React component behavior
- **Integration Tests**: Database operations
- **Financial Calculations**: Australian FY, currency formatting

```bash
# Run all tests
npm test

# Run with coverage
npm run test:coverage

# Run specific test file
npm test -- financial.test.ts
```

## 🚀 Deployment

### Vercel Deployment
1. Connect GitHub repository to Vercel
2. Configure environment variables
3. Set up Supabase database
4. Deploy with automatic CI/CD

### Database Setup
1. Create Supabase project
2. Run migrations: `npm run db:push`
3. Configure Row Level Security policies
4. Set up cron jobs for data sync

## 📋 Development Roadmap

### ✅ Completed (Tasks 1.0-3.0)
- [x] Project foundation and setup
- [x] Authentication and user management
- [x] Database schema and configuration

### 🚧 In Progress (Task 4.0)
- [ ] Xero integration and data synchronization
- [ ] Dashboard components and analytics
- [ ] Role-based UI implementation
- [ ] Testing and deployment

## 🤝 Contributing

This is a private project for AUSA Hoops Pty Ltd. Development follows:

1. **Feature branches** for new functionality
2. **Pull request reviews** for code quality
3. **Automated testing** before deployment
4. **Migration-first** database changes

## 📄 License

Private and confidential - AUSA Hoops Pty Ltd

## 🆘 Support

For technical support or questions:
- Check the documentation in `/docs`
- Review test files for usage examples
- Contact the development team

---

**Built with ❤️ for Australian basketball**