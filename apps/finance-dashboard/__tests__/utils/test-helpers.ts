// Test utilities and mock data for AUSA Finance Dashboard

import type {
  User,
  UserRole,
  ARRecord,
  APRecord,
  Money,
  RevenueData,
  XeroInvoice,
  XeroContact,
} from '@/types'

/**
 * Create a mock user for testing
 */
export function createMockUser(overrides: Partial<User> = {}): User {
  return {
    id: 'user-123',
    email: 'test@example.com',
    firstName: 'Test',
    lastName: 'User',
    role: 'finance',
    isActive: true,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
    ...overrides,
  }
}

/**
 * Create mock users for each role
 */
export function createMockUsers(): Record<UserRole, User> {
  return {
    owner: createMockUser({
      id: 'owner-1',
      email: 'owner@ausa.com.au',
      firstName: 'Owner',
      role: 'owner',
    }),
    finance: createMockUser({
      id: 'finance-1',
      email: 'finance@ausa.com.au',
      firstName: 'Finance',
      role: 'finance',
    }),
    operations: createMockUser({
      id: 'ops-1',
      email: 'ops@ausa.com.au',
      firstName: 'Operations',
      role: 'operations',
    }),
    sales: createMockUser({
      id: 'sales-1',
      email: 'sales@ausa.com.au',
      firstName: 'Sales',
      role: 'sales',
    }),
    marketing: createMockUser({
      id: 'marketing-1',
      email: 'marketing@ausa.com.au',
      firstName: 'Marketing',
      role: 'marketing',
    }),
  }
}

/**
 * Create a mock Money object
 */
export function createMockMoney(amount: number = 1000): Money {
  return {
    amount,
    currency: 'AUD',
  }
}

/**
 * Create a mock AR record
 */
export function createMockARRecord(
  overrides: Partial<ARRecord> = {}
): ARRecord {
  return {
    id: 'ar-123',
    customerId: 'customer-123',
    customerName: 'Melbourne Basketball Academy',
    invoiceNumber: 'INV-2024-001',
    invoiceDate: new Date('2024-08-01'),
    dueDate: new Date('2024-08-31'),
    originalAmount: createMockMoney(15600),
    paidAmount: createMockMoney(0),
    outstandingAmount: createMockMoney(15600),
    daysPastDue: 12,
    status: 'overdue',
    revenueStream: 'tours',
    contact: {
      name: 'Melbourne Basketball Academy',
      email: 'admin@melbournebasketball.com.au',
      phone: '+61 3 9123 4567',
    },
    ...overrides,
  }
}

/**
 * Create a mock AP record
 */
export function createMockAPRecord(
  overrides: Partial<APRecord> = {}
): APRecord {
  return {
    id: 'ap-123',
    supplierId: 'supplier-123',
    supplierName: 'Flight Centre Business Travel',
    billNumber: 'BILL-2024-001',
    billDate: new Date('2024-08-01'),
    dueDate: new Date('2024-08-31'),
    originalAmount: createMockMoney(8500),
    paidAmount: createMockMoney(0),
    outstandingAmount: createMockMoney(8500),
    daysPastDue: 5,
    status: 'current',
    contact: {
      name: 'Flight Centre Business Travel',
      email: 'corporate@flightcentre.com.au',
      phone: '+61 2 8234 5678',
    },
    ...overrides,
  }
}

/**
 * Create mock revenue data
 */
export function createMockRevenueData(
  overrides: Partial<RevenueData> = {}
): RevenueData {
  return {
    period: {
      startDate: new Date('2024-07-01'),
      endDate: new Date('2024-09-12'),
    },
    revenueStream: 'tours',
    grossRevenue: createMockMoney(266963),
    netRevenue: createMockMoney(266963),
    cogs: createMockMoney(0),
    grossMargin: createMockMoney(266963),
    grossMarginPercent: 100,
    ...overrides,
  }
}

/**
 * Create mock Xero invoice
 */
export function createMockXeroInvoice(
  overrides: Partial<XeroInvoice> = {}
): XeroInvoice {
  return {
    id: 'xero-invoice-123',
    updatedDateUTC: new Date('2024-09-12'),
    type: 'ACCREC',
    invoiceNumber: 'INV-2024-001',
    reference: 'Tour Booking - Melbourne Academy',
    contact: {
      contactID: 'contact-123',
      name: 'Melbourne Basketball Academy',
    },
    date: new Date('2024-08-01'),
    dueDate: new Date('2024-08-31'),
    status: 'AUTHORISED',
    lineAmountTypes: 'EXCLUSIVE',
    subTotal: 15600,
    totalTax: 1560,
    total: 17160,
    amountDue: 17160,
    amountPaid: 0,
    amountCredited: 0,
    currencyCode: 'AUD',
    lineItems: [
      {
        description: 'AAU Basketball Tour - Melbourne Academy',
        quantity: 1,
        unitAmount: 15600,
        accountCode: '4000',
        taxType: 'OUTPUT',
        taxAmount: 1560,
        lineAmount: 15600,
        tracking: [
          {
            trackingCategoryID: 'track-1',
            trackingOptionID: 'option-1',
            name: 'Revenue Stream',
            option: 'Tours',
          },
        ],
      },
    ],
    ...overrides,
  }
}

/**
 * Create mock Xero contact
 */
export function createMockXeroContact(
  overrides: Partial<XeroContact> = {}
): XeroContact {
  return {
    id: 'contact-123',
    updatedDateUTC: new Date('2024-09-12'),
    name: 'Melbourne Basketball Academy',
    contactStatus: 'ACTIVE',
    isSupplier: false,
    isCustomer: true,
    emailAddress: 'admin@melbournebasketball.com.au',
    phones: [
      {
        phoneType: 'DEFAULT',
        phoneNumber: '91234567',
        phoneAreaCode: '03',
        phoneCountryCode: '61',
      },
    ],
    addresses: [
      {
        addressType: 'STREET',
        addressLine1: '123 Basketball Court',
        city: 'Melbourne',
        region: 'VIC',
        postalCode: '3000',
        country: 'Australia',
      },
    ],
    ...overrides,
  }
}

/**
 * Create mock data arrays for testing
 */
export const mockDataArrays = {
  arRecords: [
    createMockARRecord(),
    createMockARRecord({
      id: 'ar-124',
      customerName: 'Sydney Sports Tours',
      invoiceNumber: 'INV-2024-002',
      originalAmount: createMockMoney(28950),
      outstandingAmount: createMockMoney(28950),
      status: 'current',
      daysPastDue: 0,
    }),
    createMockARRecord({
      id: 'ar-125',
      customerName: 'Adelaide Basketball Club',
      invoiceNumber: 'INV-2024-003',
      originalAmount: createMockMoney(8750),
      outstandingAmount: createMockMoney(0),
      status: 'current',
      daysPastDue: 0,
    }),
  ],

  apRecords: [
    createMockAPRecord(),
    createMockAPRecord({
      id: 'ap-124',
      supplierName: 'Hotel Accommodation Services',
      billNumber: 'BILL-2024-002',
      originalAmount: createMockMoney(12500),
      outstandingAmount: createMockMoney(12500),
      daysPastDue: 25,
    }),
  ],
}

/**
 * Mock Australian Financial Year dates for testing
 */
export const mockFinancialYearDates = {
  currentFY: {
    startDate: new Date('2024-07-01'),
    endDate: new Date('2025-06-30'),
    year: 2024,
    label: 'FY 2024-25',
  },
  previousFY: {
    startDate: new Date('2023-07-01'),
    endDate: new Date('2024-06-30'),
    year: 2023,
    label: 'FY 2023-24',
  },
}

/**
 * Mock dashboard KPI data
 */
export const mockKPIData = {
  cashPosition: {
    label: 'Cash Position',
    value: 284295,
    change: {
      amount: '+15.2%',
      percentage: 15.2,
      direction: 'up' as const,
    },
    format: 'currency' as const,
    currency: 'AUD' as const,
  },
  ytdRevenue: {
    label: 'YTD Revenue',
    value: 302053,
    previousValue: 278450,
    change: {
      amount: '+8.4%',
      percentage: 8.4,
      direction: 'up' as const,
    },
    format: 'currency' as const,
    currency: 'AUD' as const,
  },
  grossMargin: {
    label: 'Gross Margin',
    value: '94.1%',
    previousValue: '91.8%',
    change: {
      amount: '+2.3%',
      percentage: 2.3,
      direction: 'up' as const,
    },
    format: 'percentage' as const,
  },
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
 * Test data generators for different scenarios
 */
export const testScenarios = {
  // Healthy business scenario
  healthy: {
    cash: 284295,
    arTotal: 45280,
    apTotal: 28500,
    ytdRevenue: 302053,
    grossMargin: 94.1,
    overdueCustomers: 0,
    overdueSuppliers: 0,
  },

  // Cash flow concern scenario
  cashFlowConcern: {
    cash: 15000,
    arTotal: 125000,
    apTotal: 85000,
    ytdRevenue: 302053,
    grossMargin: 94.1,
    overdueCustomers: 8,
    overdueSuppliers: 3,
  },

  // High growth scenario
  highGrowth: {
    cash: 450000,
    arTotal: 78000,
    apTotal: 35000,
    ytdRevenue: 485000,
    grossMargin: 96.2,
    overdueCustomers: 1,
    overdueSuppliers: 0,
  },
}
