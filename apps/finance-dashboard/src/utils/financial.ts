// Financial utility functions for AUSA Finance Dashboard

import {
  AUSTRALIAN_FY_START_MONTH,
  AUSTRALIAN_FY_START_DAY,
  DEFAULT_CURRENCY,
  DECIMAL_PLACES,
  TIMEZONE,
} from '@/constants/financial'
import type { FinancialYear, Money, AgingBucket } from '@/types/financial'

/**
 * Get the Australian Financial Year for a given date
 */
export function getFinancialYear(date: Date): FinancialYear {
  const year = date.getFullYear()
  const month = date.getMonth()

  // If before July, we're in the previous FY
  const fyYear = month < AUSTRALIAN_FY_START_MONTH ? year - 1 : year

  const startDate = new Date(
    fyYear,
    AUSTRALIAN_FY_START_MONTH,
    AUSTRALIAN_FY_START_DAY
  )
  const endDate = new Date(fyYear + 1, AUSTRALIAN_FY_START_MONTH - 1, 30) // June 30

  return {
    year: fyYear,
    startDate,
    endDate,
    label: `FY ${fyYear}-${String(fyYear + 1).slice(-2)}`,
  }
}

/**
 * Get the current Australian Financial Year
 */
export function getCurrentFinancialYear(): FinancialYear {
  return getFinancialYear(new Date())
}

/**
 * Get the previous Australian Financial Year
 */
export function getPreviousFinancialYear(): FinancialYear {
  const currentFY = getCurrentFinancialYear()
  const prevDate = new Date(currentFY.startDate)
  prevDate.setFullYear(prevDate.getFullYear() - 1)
  return getFinancialYear(prevDate)
}

/**
 * Calculate the financial year week index (1-based, starting from July 1)
 */
export function getFinancialYearWeekIndex(date: Date): number {
  const fy = getFinancialYear(date)
  const msPerWeek = 7 * 24 * 60 * 60 * 1000
  const weeksSinceStart = Math.floor(
    (date.getTime() - fy.startDate.getTime()) / msPerWeek
  )
  return Math.max(1, weeksSinceStart + 1) // 1-based indexing
}

/**
 * Format currency amount for display
 */
export function formatCurrency(
  amount: number,
  currency: string = DEFAULT_CURRENCY,
  options: Partial<Intl.NumberFormatOptions> = {}
): string {
  const defaultOptions: Intl.NumberFormatOptions = {
    style: 'currency',
    currency,
    minimumFractionDigits: DECIMAL_PLACES.currency,
    maximumFractionDigits: DECIMAL_PLACES.currency,
  }

  return new Intl.NumberFormat('en-AU', {
    ...defaultOptions,
    ...options,
  }).format(amount)
}

/**
 * Format Money object for display
 */
export function formatMoney(
  money: Money,
  options?: Partial<Intl.NumberFormatOptions>
): string {
  return formatCurrency(money.amount, money.currency, options)
}

/**
 * Format percentage for display
 */
export function formatPercentage(
  value: number,
  decimalPlaces: number = DECIMAL_PLACES.percentage
): string {
  return new Intl.NumberFormat('en-AU', {
    style: 'percent',
    minimumFractionDigits: decimalPlaces,
    maximumFractionDigits: decimalPlaces,
  }).format(value / 100)
}

/**
 * Format number for display
 */
export function formatNumber(value: number, decimalPlaces: number = 0): string {
  return new Intl.NumberFormat('en-AU', {
    minimumFractionDigits: decimalPlaces,
    maximumFractionDigits: decimalPlaces,
  }).format(value)
}

/**
 * Calculate days between two dates
 */
export function daysBetween(startDate: Date, endDate: Date): number {
  const msPerDay = 24 * 60 * 60 * 1000
  return Math.floor((endDate.getTime() - startDate.getTime()) / msPerDay)
}

/**
 * Calculate days past due from a due date
 */
export function daysPastDue(
  dueDate: Date,
  asOfDate: Date = new Date()
): number {
  const days = daysBetween(dueDate, asOfDate)
  return Math.max(0, days)
}

/**
 * Calculate aging bucket for a given number of days past due
 */
export function getAgingBucket(
  daysPastDue: number,
  buckets: readonly { label: string; minDays: number; maxDays?: number }[]
): string {
  for (const bucket of buckets) {
    if (
      daysPastDue >= bucket.minDays &&
      (bucket.maxDays === undefined || daysPastDue <= bucket.maxDays)
    ) {
      return bucket.label
    }
  }
  return buckets[buckets.length - 1]?.label || 'Unknown'
}

/**
 * Calculate DSO (Days Sales Outstanding)
 */
export function calculateDSO(
  arBalance: number,
  trailingRevenue: number
): number {
  if (trailingRevenue === 0) return 0
  return (arBalance / trailingRevenue) * 365
}

/**
 * Calculate DPO (Days Payable Outstanding)
 */
export function calculateDPO(
  apBalance: number,
  trailingPurchases: number
): number {
  if (trailingPurchases === 0) return 0
  return (apBalance / trailingPurchases) * 365
}

/**
 * Calculate gross margin percentage
 */
export function calculateGrossMarginPercent(
  revenue: number,
  cogs: number
): number {
  if (revenue === 0) return 0
  return ((revenue - cogs) / revenue) * 100
}

/**
 * Calculate inventory turnover
 */
export function calculateInventoryTurnover(
  cogs: number,
  averageInventory: number
): number {
  if (averageInventory === 0) return 0
  return cogs / averageInventory
}

/**
 * Calculate days of inventory on hand
 */
export function calculateDaysOfInventory(
  averageInventory: number,
  cogs: number
): number {
  if (cogs === 0) return 0
  return (averageInventory / cogs) * 365
}

/**
 * Calculate percentage change between two values
 */
export function calculatePercentageChange(
  oldValue: number,
  newValue: number
): number {
  if (oldValue === 0) return newValue === 0 ? 0 : 100
  return ((newValue - oldValue) / Math.abs(oldValue)) * 100
}

/**
 * Determine if a percentage change is significant
 */
export function isSignificantChange(
  percentageChange: number,
  threshold: number = 20
): boolean {
  return Math.abs(percentageChange) >= threshold
}

/**
 * Create a Money object
 */
export function createMoney(
  amount: number,
  currency: string = DEFAULT_CURRENCY
): Money {
  return { amount, currency }
}

/**
 * Add two Money objects (must be same currency)
 */
export function addMoney(a: Money, b: Money): Money {
  if (a.currency !== b.currency) {
    throw new Error(
      `Cannot add different currencies: ${a.currency} and ${b.currency}`
    )
  }
  return { amount: a.amount + b.amount, currency: a.currency }
}

/**
 * Subtract two Money objects (must be same currency)
 */
export function subtractMoney(a: Money, b: Money): Money {
  if (a.currency !== b.currency) {
    throw new Error(
      `Cannot subtract different currencies: ${a.currency} and ${b.currency}`
    )
  }
  return { amount: a.amount - b.amount, currency: a.currency }
}

/**
 * Check if a Money amount is zero
 */
export function isZeroMoney(money: Money): boolean {
  return money.amount === 0
}

/**
 * Check if a Money amount is positive
 */
export function isPositiveMoney(money: Money): boolean {
  return money.amount > 0
}

/**
 * Check if a Money amount is negative
 */
export function isNegativeMoney(money: Money): boolean {
  return money.amount < 0
}

/**
 * Get the absolute value of a Money object
 */
export function absoluteMoney(money: Money): Money {
  return { amount: Math.abs(money.amount), currency: money.currency }
}

/**
 * Format a date in Australian format
 */
export function formatAustralianDate(date: Date): string {
  try {
    // Validate date
    if (!date || isNaN(date.getTime())) {
      return new Date().toLocaleDateString('en-AU')
    }
    
    return new Intl.DateTimeFormat('en-AU', {
      timeZone: TIMEZONE,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(date)
  } catch (error) {
    // Fallback for build-time issues
    return date.toLocaleDateString('en-AU')
  }
}

/**
 * Format a date and time in Australian format
 */
export function formatAustralianDateTime(date: Date): string {
  try {
    // Validate date
    if (!date || isNaN(date.getTime())) {
      return new Date().toLocaleString('en-AU')
    }
    
    return new Intl.DateTimeFormat('en-AU', {
      timeZone: TIMEZONE,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }).format(date)
  } catch (error) {
    // Fallback for build-time issues
    return date.toLocaleString('en-AU')
  }
}
