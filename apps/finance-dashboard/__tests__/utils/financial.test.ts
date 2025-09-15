// Unit tests for financial utility functions

import {
  getFinancialYear,
  getCurrentFinancialYear,
  getPreviousFinancialYear,
  getFinancialYearWeekIndex,
  formatCurrency,
  formatMoney,
  formatPercentage,
  daysBetween,
  daysPastDue,
  calculateDSO,
  calculateDPO,
  calculateGrossMarginPercent,
  calculatePercentageChange,
  addMoney,
  subtractMoney,
  isZeroMoney,
  isPositiveMoney,
  isNegativeMoney,
} from '@/utils/financial'
import { createMockMoney } from '../utils/test-helpers'

describe('Financial Utilities', () => {
  describe('Australian Financial Year Functions', () => {
    test('getFinancialYear should return correct FY for dates in different months', () => {
      // Date in August (FY 2024-25)
      const augustDate = new Date('2024-08-15')
      const augustFY = getFinancialYear(augustDate)

      expect(augustFY.year).toBe(2024)
      expect(augustFY.label).toBe('FY 2024-25')
      expect(augustFY.startDate).toEqual(new Date(2024, 6, 1)) // July 1, 2024
      expect(augustFY.endDate).toEqual(new Date(2025, 5, 30)) // June 30, 2025

      // Date in May (still FY 2023-24)
      const mayDate = new Date('2024-05-15')
      const mayFY = getFinancialYear(mayDate)

      expect(mayFY.year).toBe(2023)
      expect(mayFY.label).toBe('FY 2023-24')
      expect(mayFY.startDate).toEqual(new Date(2023, 6, 1)) // July 1, 2023
    })

    test('getFinancialYearWeekIndex should calculate correct week numbers', () => {
      // First week of FY (July 1-7, 2024)
      const firstWeek = new Date('2024-07-03')
      expect(getFinancialYearWeekIndex(firstWeek)).toBe(1)

      // Second week of FY
      const secondWeek = new Date('2024-07-10')
      expect(getFinancialYearWeekIndex(secondWeek)).toBe(2)

      // Week in September (approximately week 12)
      const septemberWeek = new Date('2024-09-12')
      const weekIndex = getFinancialYearWeekIndex(septemberWeek)
      expect(weekIndex).toBeGreaterThan(10)
      expect(weekIndex).toBeLessThan(15)
    })
  })

  describe('Currency Formatting', () => {
    test('formatCurrency should format AUD correctly', () => {
      expect(formatCurrency(1234.56)).toBe('$1,234.56')
      expect(formatCurrency(0)).toBe('$0.00')
      expect(formatCurrency(-500.75)).toBe('-$500.75')
    })

    test('formatMoney should format Money objects correctly', () => {
      const money = createMockMoney(15600)
      expect(formatMoney(money)).toBe('$15,600.00')
    })

    test('formatPercentage should format percentages correctly', () => {
      expect(formatPercentage(94.1)).toBe('94.1%')
      expect(formatPercentage(0)).toBe('0.0%')
      expect(formatPercentage(-5.5)).toBe('-5.5%')
    })
  })

  describe('Date Calculations', () => {
    test('daysBetween should calculate correct number of days', () => {
      const start = new Date('2024-08-01')
      const end = new Date('2024-08-31')
      expect(daysBetween(start, end)).toBe(30)
    })

    test('daysPastDue should calculate overdue days correctly', () => {
      const dueDate = new Date('2024-08-31')
      const asOfDate = new Date('2024-09-12')
      expect(daysPastDue(dueDate, asOfDate)).toBe(12)

      // Not yet due
      const futureDue = new Date('2024-12-31')
      expect(daysPastDue(futureDue, asOfDate)).toBe(0)
    })
  })

  describe('Financial Calculations', () => {
    test('calculateDSO should compute Days Sales Outstanding correctly', () => {
      const arBalance = 45000
      const trailingRevenue = 365000 // Annual revenue
      const dso = calculateDSO(arBalance, trailingRevenue)
      expect(dso).toBeCloseTo(45, 1) // Approximately 45 days
    })

    test('calculateDPO should compute Days Payable Outstanding correctly', () => {
      const apBalance = 25000
      const trailingPurchases = 182500 // Annual purchases
      const dpo = calculateDPO(apBalance, trailingPurchases)
      expect(dpo).toBeCloseTo(50, 1) // Approximately 50 days
    })

    test('calculateGrossMarginPercent should compute margin correctly', () => {
      expect(calculateGrossMarginPercent(100000, 60000)).toBe(40)
      expect(calculateGrossMarginPercent(100000, 0)).toBe(100)
      expect(calculateGrossMarginPercent(0, 0)).toBe(0)
    })

    test('calculatePercentageChange should compute change correctly', () => {
      expect(calculatePercentageChange(100, 110)).toBe(10)
      expect(calculatePercentageChange(100, 90)).toBe(-10)
      expect(calculatePercentageChange(0, 100)).toBe(100)
      expect(calculatePercentageChange(100, 0)).toBe(-100)
    })
  })

  describe('Money Operations', () => {
    test('addMoney should add amounts with same currency', () => {
      const money1 = createMockMoney(1000)
      const money2 = createMockMoney(500)
      const result = addMoney(money1, money2)

      expect(result.amount).toBe(1500)
      expect(result.currency).toBe('AUD')
    })

    test('addMoney should throw error for different currencies', () => {
      const audMoney = createMockMoney(1000)
      const usdMoney = { amount: 500, currency: 'USD' }

      expect(() => addMoney(audMoney, usdMoney)).toThrow(
        'Cannot add different currencies: AUD and USD'
      )
    })

    test('subtractMoney should subtract amounts correctly', () => {
      const money1 = createMockMoney(1000)
      const money2 = createMockMoney(300)
      const result = subtractMoney(money1, money2)

      expect(result.amount).toBe(700)
      expect(result.currency).toBe('AUD')
    })

    test('money comparison functions should work correctly', () => {
      expect(isZeroMoney(createMockMoney(0))).toBe(true)
      expect(isZeroMoney(createMockMoney(100))).toBe(false)

      expect(isPositiveMoney(createMockMoney(100))).toBe(true)
      expect(isPositiveMoney(createMockMoney(-100))).toBe(false)

      expect(isNegativeMoney(createMockMoney(-100))).toBe(true)
      expect(isNegativeMoney(createMockMoney(100))).toBe(false)
    })
  })

  describe('Edge Cases', () => {
    test('should handle zero values gracefully', () => {
      expect(calculateDSO(0, 1000)).toBe(0)
      expect(calculateDPO(1000, 0)).toBe(0)
      expect(calculateGrossMarginPercent(0, 1000)).toBe(0)
    })

    test('should handle negative values appropriately', () => {
      expect(calculatePercentageChange(-100, -50)).toBe(50)
      expect(formatCurrency(-1234.56)).toBe('-$1,234.56')
    })

    test('should handle large numbers correctly', () => {
      const largeMoney = createMockMoney(1000000)
      expect(formatMoney(largeMoney)).toBe('$1,000,000.00')
    })
  })
})
