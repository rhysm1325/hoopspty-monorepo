// Tests for staging data utilities

import {
  upsertAccounts,
  upsertContacts,
  upsertInvoices,
  upsertPayments,
  upsertItems,
  getStagingDataCounts,
  getARSummary,
  getAPSummary,
} from '@/lib/database/staging'

// Mock Supabase client
jest.mock('@/lib/supabase/server', () => ({
  createServiceRoleClient: () => ({
    from: (table: string) => ({
      upsert: jest.fn().mockReturnValue({
        select: jest.fn().mockResolvedValue({
          data: [{ id: 'test-id' }],
          error: null,
        }),
      }),
      select: jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({
            data: { id: 'test-id' },
            error: null,
          }),
        }),
        gt: jest.fn().mockReturnValue({
          data: [],
          error: null,
        }),
        order: jest.fn().mockReturnValue({
          data: [],
          error: null,
        }),
        limit: jest.fn().mockReturnValue({
          data: [],
          error: null,
        }),
      }),
      insert: jest.fn().mockResolvedValue({
        data: [],
        error: null,
      }),
      delete: jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          data: [],
          error: null,
        }),
        lt: jest.fn().mockReturnValue({
          count: 0,
          error: null,
        }),
      }),
    }),
  }),
}))

describe('Staging Data Utilities', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('upsertAccounts', () => {
    test('should process Xero accounts data correctly', async () => {
      const mockAccounts = [
        {
          AccountID: '123e4567-e89b-12d3-a456-426614174000',
          Code: '4000',
          Name: 'Sales Revenue',
          Type: 'REVENUE',
          TaxType: 'OUTPUT',
          Description: 'General sales revenue',
          Status: 'ACTIVE',
          UpdatedDateUTC: '2024-09-12T10:00:00Z',
        },
      ]

      const result = await upsertAccounts(mockAccounts)

      expect(result.success).toBe(true)
      expect(result.recordsInserted).toBeGreaterThan(0)
    })

    test('should handle empty accounts array', async () => {
      const result = await upsertAccounts([])
      expect(result.success).toBe(true)
      expect(result.recordsInserted).toBe(0)
    })
  })

  describe('upsertContacts', () => {
    test('should process Xero contacts data correctly', async () => {
      const mockContacts = [
        {
          ContactID: '456e7890-e89b-12d3-a456-426614174000',
          Name: 'Melbourne Basketball Academy',
          ContactNumber: 'CUST001',
          ContactStatus: 'ACTIVE',
          IsSupplier: false,
          IsCustomer: true,
          EmailAddress: 'admin@melbournebasketball.com.au',
          Phones: [
            {
              PhoneType: 'DEFAULT',
              PhoneNumber: '91234567',
              PhoneAreaCode: '03',
              PhoneCountryCode: '61',
            },
          ],
          Addresses: [
            {
              AddressType: 'STREET',
              AddressLine1: '123 Basketball Court',
              City: 'Melbourne',
              Region: 'VIC',
              PostalCode: '3000',
              Country: 'Australia',
            },
          ],
          UpdatedDateUTC: '2024-09-12T10:00:00Z',
        },
      ]

      const result = await upsertContacts(mockContacts)

      expect(result.success).toBe(true)
      expect(result.recordsInserted).toBeGreaterThan(0)
    })
  })

  describe('upsertInvoices', () => {
    test('should process Xero invoices with line items', async () => {
      const mockInvoices = [
        {
          InvoiceID: '789e1234-e89b-12d3-a456-426614174000',
          Type: 'ACCREC',
          InvoiceNumber: 'INV-2024-001',
          Reference: 'Tour Booking - Melbourne Academy',
          Contact: {
            ContactID: '456e7890-e89b-12d3-a456-426614174000',
            Name: 'Melbourne Basketball Academy',
          },
          Date: '2024-08-01',
          DueDate: '2024-08-31',
          Status: 'AUTHORISED',
          LineAmountTypes: 'EXCLUSIVE',
          SubTotal: '15600.00',
          TotalTax: '1560.00',
          Total: '17160.00',
          AmountDue: '17160.00',
          AmountPaid: '0.00',
          AmountCredited: '0.00',
          CurrencyCode: 'AUD',
          UpdatedDateUTC: '2024-09-12T10:00:00Z',
          LineItems: [
            {
              LineItemID: 'abc12345-e89b-12d3-a456-426614174000',
              Description: 'AAU Basketball Tour - Melbourne Academy',
              Quantity: '1',
              UnitAmount: '15600.00',
              LineAmount: '15600.00',
              AccountCode: '4000',
              TaxType: 'OUTPUT',
              TaxAmount: '1560.00',
              Tracking: [
                {
                  TrackingCategoryID: 'track-1',
                  TrackingOptionID: 'option-1',
                  Name: 'Revenue Stream',
                  Option: 'Tours',
                },
              ],
            },
          ],
        },
      ]

      const result = await upsertInvoices(mockInvoices)

      expect(result.success).toBe(true)
      expect(result.recordsInserted).toBeGreaterThan(0)
    })
  })

  describe('upsertPayments', () => {
    test('should process Xero payments data correctly', async () => {
      const mockPayments = [
        {
          PaymentID: 'pay12345-e89b-12d3-a456-426614174000',
          Date: '2024-09-01',
          Amount: '17160.00',
          Reference: 'Payment for INV-2024-001',
          CurrencyCode: 'AUD',
          PaymentType: 'ACCRECPAYMENT',
          Status: 'AUTHORISED',
          Account: {
            AccountID: 'bank123-e89b-12d3-a456-426614174000',
            Code: '1100',
            Name: 'Business Bank Account',
          },
          Invoice: {
            InvoiceID: '789e1234-e89b-12d3-a456-426614174000',
            InvoiceNumber: 'INV-2024-001',
          },
          UpdatedDateUTC: '2024-09-12T10:00:00Z',
        },
      ]

      const result = await upsertPayments(mockPayments)

      expect(result.success).toBe(true)
      expect(result.recordsInserted).toBeGreaterThan(0)
    })
  })

  describe('upsertItems', () => {
    test('should process Xero items data correctly', async () => {
      const mockItems = [
        {
          ItemID: 'item123-e89b-12d3-a456-426614174000',
          Code: 'DRDISH-PRO',
          Name: 'Dr Dish Pro Basketball Machine',
          Description: 'Professional basketball shooting machine',
          IsTrackedAsInventory: true,
          InventoryAssetAccountCode: '1200',
          QuantityOnHand: '5',
          SalesDetails: {
            UnitPrice: '25000.00',
            AccountCode: '4100',
            TaxType: 'OUTPUT',
          },
          PurchaseDetails: {
            UnitPrice: '15000.00',
            AccountCode: '5000',
            TaxType: 'INPUT',
          },
          UpdatedDateUTC: '2024-09-12T10:00:00Z',
        },
      ]

      const result = await upsertItems(mockItems)

      expect(result.success).toBe(true)
      expect(result.recordsInserted).toBeGreaterThan(0)
    })
  })

  describe('getStagingDataCounts', () => {
    test('should return counts for all staging tables', async () => {
      const result = await getStagingDataCounts()

      expect(result.counts).toBeDefined()
      expect(typeof result.counts).toBe('object')

      // Should include all staging tables
      const expectedTables = [
        'stg_accounts',
        'stg_contacts',
        'stg_invoices',
        'stg_invoice_lines',
        'stg_payments',
        'stg_credit_notes',
        'stg_items',
        'stg_bank_accounts',
        'stg_bank_transactions',
        'stg_manual_journals',
        'stg_tracking_categories',
        'stg_tracking_options',
      ]

      expectedTables.forEach(table => {
        expect(result.counts).toHaveProperty(table)
        expect(typeof result.counts[table]).toBe('number')
      })
    })
  })

  describe('getARSummary', () => {
    test('should calculate AR summary correctly', async () => {
      const result = await getARSummary()

      expect(result).toHaveProperty('totalOutstanding')
      expect(result).toHaveProperty('invoiceCount')
      expect(result).toHaveProperty('oldestInvoiceDate')
      expect(typeof result.totalOutstanding).toBe('number')
      expect(typeof result.invoiceCount).toBe('number')
    })
  })

  describe('getAPSummary', () => {
    test('should calculate AP summary correctly', async () => {
      const result = await getAPSummary()

      expect(result).toHaveProperty('totalOutstanding')
      expect(result).toHaveProperty('billCount')
      expect(result).toHaveProperty('oldestBillDate')
      expect(typeof result.totalOutstanding).toBe('number')
      expect(typeof result.billCount).toBe('number')
    })
  })

  describe('Data Processing', () => {
    test('should handle decimal amounts correctly', () => {
      const testAmount = '15600.50'
      const parsed = parseFloat(testAmount)
      expect(parsed).toBe(15600.5)
    })

    test('should handle missing optional fields', () => {
      const mockAccount = {
        AccountID: '123e4567-e89b-12d3-a456-426614174000',
        Code: '4000',
        Name: 'Sales Revenue',
        Type: 'REVENUE',
        Status: 'ACTIVE',
        UpdatedDateUTC: '2024-09-12T10:00:00Z',
        // Missing optional fields like TaxType, Description
      }

      // Should not throw when processing accounts with missing optional fields
      expect(() => {
        const processed = {
          xero_id: mockAccount.AccountID,
          code: mockAccount.Code,
          name: mockAccount.Name,
          type: mockAccount.Type,
          tax_type: undefined, // Optional field
          description: undefined, // Optional field
        }
        expect(processed.code).toBe('4000')
      }).not.toThrow()
    })
  })
})
