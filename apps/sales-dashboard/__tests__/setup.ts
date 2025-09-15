// Jest setup file for HoopsPty Sales Dashboard

import '@testing-library/jest-dom'

// Mock Next.js router
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    refresh: jest.fn(),
    back: jest.fn(),
    forward: jest.fn(),
    prefetch: jest.fn(),
  }),
  usePathname: () => '/',
  useSearchParams: () => new URLSearchParams(),
}))

// Mock Next.js image component
jest.mock('next/image', () => ({
  __esModule: true,
  default: 'img',
}))

// Mock environment variables
process.env.NODE_ENV = 'test'
process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co'
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-anon-key'
process.env.AIRCALL_API_ID = 'test-aircall-id'
process.env.AIRCALL_API_TOKEN = 'test-aircall-token'
process.env.ACTIVECAMPAIGN_BASE_URL = 'https://test.api-us1.com'
process.env.ACTIVECAMPAIGN_API_TOKEN = 'test-activecampaign-token'

// Mock Supabase client
jest.mock('@/lib/supabase/client', () => ({
  createClient: () => ({
    auth: {
      getSession: jest.fn(),
      signInWithPassword: jest.fn(),
      signOut: jest.fn(),
      onAuthStateChange: jest.fn(),
    },
    from: jest.fn(() => ({
      select: jest.fn(() => ({
        eq: jest.fn(() => ({
          single: jest.fn(),
          data: [],
          error: null,
        })),
        data: [],
        error: null,
      })),
      insert: jest.fn(() => ({
        data: [],
        error: null,
      })),
      update: jest.fn(() => ({
        eq: jest.fn(() => ({
          data: [],
          error: null,
        })),
      })),
      delete: jest.fn(() => ({
        eq: jest.fn(() => ({
          data: [],
          error: null,
        })),
      })),
    })),
  }),
}))

// Mock AirCall client
jest.mock('@/lib/aircall/client', () => ({
  AirCallClient: {
    connect: jest.fn(),
    getCalls: jest.fn(),
    getUsers: jest.fn(),
    processWebhook: jest.fn(),
  },
}))

// Mock ActiveCampaign client
jest.mock('@/lib/activecampaign/client', () => ({
  ActiveCampaignClient: {
    connect: jest.fn(),
    getContacts: jest.fn(),
    getDeals: jest.fn(),
    getOpportunities: jest.fn(),
  },
}))

// Mock shared packages (will be implemented in later phases)
// Note: Shared packages will be mocked when they exist

// Mock date functions to ensure consistent test results
const mockDate = new Date('2024-09-15T00:00:00.000Z')
jest.spyOn(global, 'Date').mockImplementation(() => mockDate)

// Mock Intl.NumberFormat for consistent currency formatting in tests
const mockNumberFormat = {
  format: jest.fn((number: number) => `A$${number.toFixed(2)}`),
}
jest
  .spyOn(Intl, 'NumberFormat')
  .mockImplementation(() => mockNumberFormat as any)

// Mock Intl.DateTimeFormat for consistent date formatting in tests
const mockDateTimeFormat = {
  format: jest.fn((date: Date) => '15/09/2024'),
}
jest
  .spyOn(Intl, 'DateTimeFormat')
  .mockImplementation(() => mockDateTimeFormat as any)

// Global test utilities
global.ResizeObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
}))

// Mock window.matchMedia for responsive components
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(), // deprecated
    removeListener: jest.fn(), // deprecated
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
})

// Mock IntersectionObserver
global.IntersectionObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
}))

// Mock WebSocket for real-time updates
global.WebSocket = jest.fn().mockImplementation(() => ({
  addEventListener: jest.fn(),
  removeEventListener: jest.fn(),
  send: jest.fn(),
  close: jest.fn(),
  readyState: 1, // OPEN
}))

// Mock fetch for API calls
global.fetch = jest.fn(() =>
  Promise.resolve({
    ok: true,
    status: 200,
    json: () => Promise.resolve({}),
    text: () => Promise.resolve(''),
  } as Response)
)

// Console suppression for cleaner test output
const originalError = console.error
beforeAll(() => {
  console.error = (...args: any[]) => {
    if (
      typeof args[0] === 'string' &&
      args[0].includes('Warning: ReactDOM.render is no longer supported')
    ) {
      return
    }
    originalError.call(console, ...args)
  }
})

afterAll(() => {
  console.error = originalError
})

// Clean up after each test
afterEach(() => {
  jest.clearAllMocks()
})
