// Test utilities and mock data for HoopsPty Sales Dashboard

import type {
  SalesCall,
  SalesRep,
  CallMetrics,
  BusinessArm,
  CallType,
  AirCallCall,
  ActiveCampaignContact,
  ActiveCampaignDeal,
} from '@/types'

/**
 * Create a mock sales call for testing
 */
export function createMockSalesCall(
  overrides: Partial<SalesCall> = {}
): SalesCall {
  return {
    id: 'call-123',
    aircall_id: 'aircall-456',
    phone_number: '+61234567890',
    business_arm: 'gameball',
    call_type: 'sales',
    duration: 180, // 3 minutes
    started_at: new Date('2024-09-15T10:30:00Z'),
    ended_at: new Date('2024-09-15T10:33:00Z'),
    rep_id: 'rep-123',
    outcome: 'qualified_lead',
    created_at: new Date('2024-09-15T10:35:00Z'),
    updated_at: new Date('2024-09-15T10:35:00Z'),
    ...overrides,
  }
}

/**
 * Create a mock sales rep for testing
 */
export function createMockSalesRep(
  overrides: Partial<SalesRep> = {}
): SalesRep {
  return {
    id: 'rep-123',
    name: 'John Smith',
    email: 'john.smith@hoopspty.com',
    business_arms: ['gameball', 'ausa_hoops'],
    is_active: true,
    created_at: new Date('2024-01-01T00:00:00Z'),
    updated_at: new Date('2024-01-01T00:00:00Z'),
    ...overrides,
  }
}

/**
 * Create mock call metrics for testing
 */
export function createMockCallMetrics(
  overrides: Partial<CallMetrics> = {}
): CallMetrics {
  return {
    total_calls: 25,
    sales_calls: 18,
    customer_service_calls: 7,
    conversion_rate: 0.22, // 22%
    average_duration: 240, // 4 minutes
    revenue_attributed: 15000,
    ...overrides,
  }
}

/**
 * Create mock AirCall call data
 */
export function createMockAirCallCall(
  overrides: Partial<AirCallCall> = {}
): AirCallCall {
  return {
    id: 456,
    direct_link: 'https://aircall.io/calls/456',
    direction: 'inbound',
    state: 'answered',
    started_at: '2024-09-15T10:30:00.000Z',
    answered_at: '2024-09-15T10:30:05.000Z',
    ended_at: '2024-09-15T10:33:00.000Z',
    duration: 180,
    raw_digits: '+61234567890',
    user: {
      id: 123,
      name: 'John Smith',
      email: 'john.smith@hoopspty.com',
    },
    number: {
      id: 789,
      name: 'Gameball Sales Line',
      digits: '+61234567890',
    },
    contact: {
      id: 101,
      name: 'Melbourne Basketball Academy',
      email: 'admin@melbournebasketball.com.au',
      phone_numbers: [
        {
          id: 202,
          label: 'work',
          value: '+61391234567',
        },
      ],
    },
    ...overrides,
  }
}

/**
 * Create mock ActiveCampaign contact
 */
export function createMockActiveCampaignContact(
  overrides: Partial<ActiveCampaignContact> = {}
): ActiveCampaignContact {
  return {
    id: 'ac-contact-123',
    email: 'admin@melbournebasketball.com.au',
    firstName: 'Melbourne',
    lastName: 'Basketball Academy',
    phone: '+61391234567',
    fieldValues: [
      {
        field: 'business_type',
        value: 'basketball_academy',
      },
      {
        field: 'lead_source',
        value: 'phone_call',
      },
    ],
    ...overrides,
  }
}

/**
 * Create mock ActiveCampaign deal
 */
export function createMockActiveCampaignDeal(
  overrides: Partial<ActiveCampaignDeal> = {}
): ActiveCampaignDeal {
  return {
    id: 'ac-deal-456',
    title: 'Melbourne Academy - Dr Dish Equipment',
    value: 15000,
    currency: 'AUD',
    stage: 'proposal_sent',
    status: 'open',
    contact: 'ac-contact-123',
    account: 'ac-account-789',
    created_timestamp: '2024-09-15T10:35:00.000Z',
    updated_timestamp: '2024-09-15T10:35:00.000Z',
    ...overrides,
  }
}

/**
 * Create mock sales reps for different scenarios
 */
export function createMockSalesReps(): SalesRep[] {
  return [
    createMockSalesRep({
      id: 'rep-1',
      name: 'John Smith',
      email: 'john.smith@hoopspty.com',
      business_arms: ['gameball'],
    }),
    createMockSalesRep({
      id: 'rep-2',
      name: 'Sarah Johnson',
      email: 'sarah.johnson@hoopspty.com',
      business_arms: ['ausa_hoops'],
    }),
    createMockSalesRep({
      id: 'rep-3',
      name: 'Mike Wilson',
      email: 'mike.wilson@hoopspty.com',
      business_arms: ['gameball', 'ausa_hoops'],
    }),
  ]
}

/**
 * Create mock data arrays for testing
 */
export const mockDataArrays = {
  salesCalls: [
    createMockSalesCall(),
    createMockSalesCall({
      id: 'call-124',
      aircall_id: 'aircall-457',
      phone_number: '+61234567891',
      business_arm: 'ausa_hoops',
      call_type: 'sales',
      duration: 420, // 7 minutes
      outcome: 'converted',
    }),
    createMockSalesCall({
      id: 'call-125',
      aircall_id: 'aircall-458',
      phone_number: '+61234567892',
      business_arm: 'gameball',
      call_type: 'customer_service',
      duration: 300, // 5 minutes
      outcome: 'resolved',
    }),
  ],

  salesReps: createMockSalesReps(),

  airCallCalls: [
    createMockAirCallCall(),
    createMockAirCallCall({
      id: 457,
      direction: 'outbound',
      duration: 420,
      user: {
        id: 124,
        name: 'Sarah Johnson',
        email: 'sarah.johnson@hoopspty.com',
      },
      number: {
        id: 790,
        name: 'AUSA Hoops Sales Line',
        digits: '+61234567891',
      },
    }),
  ],

  activeCampaignContacts: [
    createMockActiveCampaignContact(),
    createMockActiveCampaignContact({
      id: 'ac-contact-124',
      email: 'coach@sydneybasketball.com.au',
      firstName: 'Sydney',
      lastName: 'Basketball Club',
      phone: '+61291234567',
    }),
  ],

  activeCampaignDeals: [
    createMockActiveCampaignDeal(),
    createMockActiveCampaignDeal({
      id: 'ac-deal-457',
      title: 'Sydney Club - AUSA Tour Package',
      value: 25000,
      stage: 'negotiation',
      contact: 'ac-contact-124',
    }),
  ],
}

/**
 * Mock dashboard KPI data for sales
 */
export const mockSalesKPIData = {
  todayCalls: {
    label: "Today's Calls",
    value: 18,
    target: 20,
    change: {
      amount: '+12.5%',
      percentage: 12.5,
      direction: 'up' as const,
    },
    format: 'number' as const,
  },
  conversionRate: {
    label: 'Conversion Rate',
    value: '22.4%',
    target: '15.0%',
    change: {
      amount: '+7.4%',
      percentage: 7.4,
      direction: 'up' as const,
    },
    format: 'percentage' as const,
  },
  revenueAttributed: {
    label: 'Revenue Attributed',
    value: 45000,
    target: 35000,
    change: {
      amount: '+28.6%',
      percentage: 28.6,
      direction: 'up' as const,
    },
    format: 'currency' as const,
    currency: 'AUD' as const,
  },
  averageCallDuration: {
    label: 'Avg Call Duration',
    value: '4m 12s',
    target: '3m 30s',
    change: {
      amount: '+20%',
      percentage: 20,
      direction: 'up' as const,
    },
    format: 'duration' as const,
  },
}

/**
 * Test scenarios for different business states
 */
export const testScenarios = {
  // High performing team
  highPerformance: {
    totalCalls: 45,
    salesCalls: 32,
    customerServiceCalls: 13,
    conversionRate: 0.28,
    averageDuration: 280,
    revenueAttributed: 85000,
  },

  // Underperforming team
  underPerformance: {
    totalCalls: 12,
    salesCalls: 8,
    customerServiceCalls: 4,
    conversionRate: 0.08,
    averageDuration: 120,
    revenueAttributed: 5000,
  },

  // Balanced performance
  balanced: {
    totalCalls: 25,
    salesCalls: 18,
    customerServiceCalls: 7,
    conversionRate: 0.22,
    averageDuration: 240,
    revenueAttributed: 35000,
  },
}

/**
 * Mock phone number mappings for business arms
 */
export const mockPhoneNumberMappings = {
  gameball: ['+61234567890', '+61234567891'],
  ausa_hoops: ['+61234567892', '+61234567893'],
}

/**
 * Utility function to create test wrapper with providers
 */
export function createTestWrapper({ children }: { children: React.ReactNode }) {
  // Simple test wrapper - will be enhanced when providers are added
  return children
}

/**
 * Mock async function that resolves after a delay
 */
export function mockAsyncFunction<T>(
  returnValue: T,
  delay: number = 100
): jest.MockedFunction<() => Promise<T>> {
  return jest.fn().mockImplementation(
    () =>
      new Promise(resolve => {
        setTimeout(() => resolve(returnValue), delay)
      })
  )
}

/**
 * Mock async function that rejects with an error
 */
export function mockAsyncError(
  error: Error,
  delay: number = 100
): jest.MockedFunction<() => Promise<never>> {
  return jest.fn().mockImplementation(
    () =>
      new Promise((_, reject) => {
        setTimeout(() => reject(error), delay)
      })
  )
}

/**
 * Create mock form event
 */
export function createMockFormEvent(value: string = '') {
  return {
    target: { value },
    preventDefault: jest.fn(),
    stopPropagation: jest.fn(),
  } as any
}

/**
 * Mock webhook payload generators
 */
export const mockWebhookPayloads = {
  airCallCallAnswered: {
    event: 'call.answered',
    resource: 'call',
    data: createMockAirCallCall({ state: 'answered' }),
    timestamp: '2024-09-15T10:30:05.000Z',
  },
  airCallCallEnded: {
    event: 'call.ended',
    resource: 'call',
    data: createMockAirCallCall({ state: 'hungup' }),
    timestamp: '2024-09-15T10:33:00.000Z',
  },
}

/**
 * Mock time periods for testing
 */
export const mockTimePeriods = {
  today: {
    start: new Date('2024-09-15T00:00:00Z'),
    end: new Date('2024-09-15T23:59:59Z'),
    label: 'Today',
  },
  thisWeek: {
    start: new Date('2024-09-09T00:00:00Z'),
    end: new Date('2024-09-15T23:59:59Z'),
    label: 'This Week',
  },
  thisMonth: {
    start: new Date('2024-09-01T00:00:00Z'),
    end: new Date('2024-09-30T23:59:59Z'),
    label: 'September 2024',
  },
}
