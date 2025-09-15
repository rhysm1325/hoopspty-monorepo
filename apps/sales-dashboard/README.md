# HoopsPty Sales Dashboard

A comprehensive sales performance tracking dashboard integrating AirCall and ActiveCampaign for real-time sales analytics across HoopsPty's business arms.

## Overview

The Sales Dashboard provides transparent visibility into sales performance for executives, managers, and sales representatives. It tracks call volume, conversion rates, and revenue attribution across Gameball (Dr Dish distribution) and AUSA Hoops (touring) business units.

## Features

- **Real-time Call Tracking**: Live integration with AirCall for immediate call data
- **Conversion Analytics**: Track conversion rates from calls to qualified leads
- **Revenue Attribution**: Link sales calls to CRM opportunities and revenue
- **Business Arm Separation**: Clear differentiation between Gameball and AUSA Hoops
- **Performance Comparisons**: Individual rep performance vs team averages
- **Historical Analytics**: Complete historical data with trend analysis

## Tech Stack

- **Framework**: Next.js 14 with App Router
- **Language**: TypeScript (strict mode)
- **Database**: Supabase PostgreSQL
- **Styling**: Tailwind CSS with shadcn/ui
- **Testing**: Jest with React Testing Library
- **Deployment**: Vercel

## Integrations

- **AirCall**: Phone system integration for call data
- **ActiveCampaign**: CRM integration for conversion tracking
- **Shared Packages**: Leverages HoopsPty monorepo shared components

## Quick Start

### Prerequisites

- Node.js 18+ and npm
- Access to HoopsPty monorepo
- AirCall API credentials
- ActiveCampaign API credentials
- Supabase project access

### Development Setup

1. **Install Dependencies**
   ```bash
   cd apps/sales-dashboard
   npm install
   ```

2. **Environment Setup**
   ```bash
   cp env.example .env.local
   # Fill in your API credentials and configuration
   ```

3. **Database Setup**
   ```bash
   npm run db:push
   npm run migrate
   ```

4. **Start Development Server**
   ```bash
   npm run dev
   ```

   The dashboard will be available at `http://localhost:3001`

## Scripts

- `npm run dev` - Start development server on port 3001
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run test` - Run test suite
- `npm run test:watch` - Run tests in watch mode
- `npm run test:coverage` - Generate coverage report
- `npm run quality` - Run all quality checks
- `npm run lint` - Run ESLint with auto-fix
- `npm run format` - Format code with Prettier
- `npm run type-check` - TypeScript type checking

## Project Structure

```
apps/sales-dashboard/
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── (auth)/            # Authentication pages
│   │   ├── (dashboard)/       # Dashboard pages
│   │   ├── api/               # API routes
│   │   └── actions/           # Server actions
│   ├── components/            # React components
│   │   ├── dashboard/         # Dashboard-specific components
│   │   ├── charts/           # Chart components
│   │   └── ui/               # Shared UI components
│   ├── lib/                  # Utility libraries
│   │   ├── aircall/          # AirCall integration
│   │   ├── activecampaign/   # ActiveCampaign integration
│   │   └── sales/            # Sales analytics logic
│   └── types/                # TypeScript definitions
├── __tests__/                # Test files
├── supabase/                 # Database migrations
└── public/                   # Static assets
```

## Environment Variables

Key environment variables (see `env.example` for complete list):

- `AIRCALL_API_ID` - AirCall API credentials
- `AIRCALL_API_TOKEN` - AirCall API token
- `ACTIVECAMPAIGN_BASE_URL` - ActiveCampaign API base URL
- `ACTIVECAMPAIGN_API_TOKEN` - ActiveCampaign API token
- `NEXT_PUBLIC_SUPABASE_URL` - Supabase project URL
- `SUPABASE_SERVICE_ROLE_KEY` - Supabase service role key

## Deployment

### Vercel Deployment

1. **Create Vercel Project**
   - Root Directory: `apps/sales-dashboard`
   - Framework: Next.js
   - Build Command: `npm run build`

2. **Configure Environment Variables**
   - Add all required environment variables in Vercel dashboard
   - Ensure production values are set correctly

3. **Cron Jobs**
   - AirCall sync: Every 15 minutes during business hours
   - ActiveCampaign sync: Every 6 hours

### Custom Domain

Configure custom domain in Vercel:
- Production: `sales.hoopspty.com`
- Staging: `sales-staging.hoopspty.com`

## Testing

### Test Coverage Requirements

- **Global**: 80% minimum coverage
- **Critical Sales Logic**: 95% minimum coverage
- **Integration Functions**: 90% minimum coverage

### Running Tests

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Generate coverage report
npm run test:coverage

# Run specific test file
npm test -- sales-analytics.test.ts
```

## API Integration

### AirCall Integration

- **Webhook Endpoint**: `/api/aircall/webhook`
- **Manual Sync**: `/api/aircall/sync`
- **Rate Limiting**: Implemented per AirCall API limits
- **Call Classification**: Automatic sales vs customer service detection

### ActiveCampaign Integration

- **Sync Endpoint**: `/api/activecampaign/sync`
- **Revenue Attribution**: Links calls to CRM opportunities
- **Pipeline Tracking**: Monitors deal progression

## Monitoring

- **Error Tracking**: Integrated with Vercel
- **Performance Monitoring**: Real-time dashboard metrics
- **Sync Status**: Comprehensive logging for all integrations
- **Health Checks**: Automated monitoring of critical functions

## Support

For development support:
- Review monorepo documentation in `/docs`
- Check shared package documentation
- Follow established patterns from finance dashboard

## License

Internal HoopsPty application - All rights reserved.
