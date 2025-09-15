# AUSA Finance Dashboard - Deployment Guide

## Prerequisites

1. **Supabase Project**: Set up a Supabase project with the required database schema
2. **Xero Application**: Register a Xero application for OAuth integration
3. **Vercel Account**: Account with deployment permissions

## Environment Variables Required for Vercel

Set the following environment variables in your Vercel project settings:

### Required Variables
```bash
# Application
NODE_ENV=production
NEXT_PUBLIC_APP_NAME="AUSA Finance Dashboard"
NEXT_PUBLIC_APP_VERSION="1.0.0"

# Supabase (Required)
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key

# Xero Integration (Required)
XERO_CLIENT_ID=your-xero-client-id
XERO_CLIENT_SECRET=your-xero-client-secret
XERO_REDIRECT_URI=https://your-domain.vercel.app/api/auth/xero/callback
XERO_SCOPES=offline_access accounting.transactions accounting.reports.read accounting.settings openid profile email

# Authentication (Required)
NEXTAUTH_SECRET=your-32-character-secret-key
NEXTAUTH_URL=https://your-domain.vercel.app

# Security (Required)
CRON_SECRET=your-cron-secret-key

# Business Settings (Optional - will use defaults)
FINANCIAL_YEAR_START_MONTH=7
FINANCIAL_YEAR_START_DAY=1
DEFAULT_TIMEZONE=Australia/Sydney
DEFAULT_CURRENCY=AUD
DEFAULT_GST_METHOD=accrual
COMPANY_NAME="AUSA Hoops Pty Ltd"

# Performance Settings (Optional - will use defaults)
SYNC_SCHEDULE_HOUR=3
SYNC_SCHEDULE_MINUTE=30
SYNC_BATCH_SIZE=100
CACHE_TTL_MINUTES=60
ENABLE_DEBUG_MODE=false
```

## Deployment Steps

1. **Push to GitHub**: Ensure your code is pushed to a GitHub repository
2. **Connect to Vercel**: Import your repository in Vercel
3. **Set Environment Variables**: Add all required environment variables in Vercel project settings
4. **Deploy**: Vercel will automatically deploy your application

## Build Configuration

The project includes:
- `vercel.json` with proper configuration for Next.js 15
- Build optimizations for Australian timezone (Sydney region)
- Cron jobs for automated data sync
- Proper middleware for authentication and security

## Post-Deployment

1. **Database Setup**: Run Supabase migrations if needed
2. **Xero Configuration**: Update Xero app with actual redirect URI
3. **User Management**: Create initial admin users through Supabase
4. **Test Authentication**: Verify login and user roles work correctly

## Troubleshooting

- **Build Errors**: The project uses `ignoreBuildErrors: true` for TypeScript and ESLint
- **Environment Validation**: Skipped during build process to prevent deployment failures
- **Suspense Boundaries**: Already implemented for client-side routing
- **Viewport Metadata**: Properly configured for Next.js 15

## Security Features

- Rate limiting for login attempts and API calls
- Content Security Policy headers
- Role-based access control
- Secure session management
- Australian financial compliance ready
