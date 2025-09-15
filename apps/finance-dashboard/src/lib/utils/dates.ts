// Australian Financial Year date utilities with timezone handling
// Provides comprehensive date functions for AUSA Finance Dashboard

import { 
  AUSTRALIAN_FY_START_MONTH, 
  AUSTRALIAN_FY_START_DAY, 
  TIMEZONE 
} from '@/constants/financial'
import type { FinancialYear } from '@/types/financial'

/**
 * Get the current date in Australia/Sydney timezone
 */
export function getCurrentAustralianDate(): Date {
  return new Date(new Intl.DateTimeFormat('en-AU', {
    timeZone: TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).format(new Date()).replace(/(\d{2})\/(\d{2})\/(\d{4}), (\d{2}):(\d{2}):(\d{2})/, '$3-$2-$1T$4:$5:$6'))
}

/**
 * Convert a date to Australia/Sydney timezone
 */
export function toAustralianTimezone(date: Date): Date {
  const australianTime = new Intl.DateTimeFormat('en-AU', {
    timeZone: TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).format(date)
  
  // Parse the formatted string back to a Date object
  const [datePart, timePart] = australianTime.split(', ')
  const [day, month, year] = datePart.split('/')
  const [hour, minute, second] = timePart.split(':')
  
  return new Date(`${year}-${month}-${day}T${hour}:${minute}:${second}`)
}

/**
 * Get the Australian Financial Year for a given date (timezone-aware)
 */
export function getFinancialYear(date: Date): FinancialYear {
  const australianDate = toAustralianTimezone(date)
  const year = australianDate.getFullYear()
  const month = australianDate.getMonth()

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
 * Get the current Australian Financial Year (timezone-aware)
 */
export function getCurrentFinancialYear(): FinancialYear {
  return getFinancialYear(getCurrentAustralianDate())
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
 * Handles timezone correctly for Australian dates
 */
export function getFinancialYearWeekIndex(date: Date): number {
  const australianDate = toAustralianTimezone(date)
  const fy = getFinancialYear(australianDate)
  
  // Calculate weeks from FY start
  const msPerWeek = 7 * 24 * 60 * 60 * 1000
  const weeksSinceStart = Math.floor(
    (australianDate.getTime() - fy.startDate.getTime()) / msPerWeek
  )
  
  return Math.max(1, weeksSinceStart + 1) // 1-based indexing
}

/**
 * Get the financial year week bounds for a given date
 */
export function getFinancialYearWeekBounds(date: Date): {
  weekIndex: number
  startDate: Date
  endDate: Date
  fyYear: number
  fyLabel: string
} {
  const australianDate = toAustralianTimezone(date)
  const fy = getFinancialYear(australianDate)
  const weekIndex = getFinancialYearWeekIndex(australianDate)
  
  // Calculate week start (Monday) and end (Sunday)
  const daysSinceFYStart = Math.floor(
    (australianDate.getTime() - fy.startDate.getTime()) / (24 * 60 * 60 * 1000)
  )
  
  const weekStartDays = Math.floor(daysSinceFYStart / 7) * 7
  const weekStart = new Date(fy.startDate)
  weekStart.setDate(weekStart.getDate() + weekStartDays)
  
  const weekEnd = new Date(weekStart)
  weekEnd.setDate(weekEnd.getDate() + 6)
  
  return {
    weekIndex,
    startDate: weekStart,
    endDate: weekEnd,
    fyYear: fy.year,
    fyLabel: fy.label,
  }
}

/**
 * Get all weeks in a financial year
 */
export function getFinancialYearWeeks(fyYear: number): Array<{
  weekIndex: number
  startDate: Date
  endDate: Date
  label: string
}> {
  const fyStart = new Date(fyYear, AUSTRALIAN_FY_START_MONTH, AUSTRALIAN_FY_START_DAY)
  const fyEnd = new Date(fyYear + 1, AUSTRALIAN_FY_START_MONTH - 1, 30)
  
  const weeks: Array<{
    weekIndex: number
    startDate: Date
    endDate: Date
    label: string
  }> = []
  
  let currentWeekStart = new Date(fyStart)
  let weekIndex = 1
  
  while (currentWeekStart <= fyEnd) {
    const weekEnd = new Date(currentWeekStart)
    weekEnd.setDate(weekEnd.getDate() + 6)
    
    // Don't go past FY end
    if (weekEnd > fyEnd) {
      weekEnd.setTime(fyEnd.getTime())
    }
    
    weeks.push({
      weekIndex,
      startDate: new Date(currentWeekStart),
      endDate: new Date(weekEnd),
      label: `Week ${weekIndex}`,
    })
    
    currentWeekStart.setDate(currentWeekStart.getDate() + 7)
    weekIndex++
    
    // Safety check to prevent infinite loop
    if (weekIndex > 54) break
  }
  
  return weeks
}

/**
 * Get the same week in the previous financial year
 */
export function getSameWeekPreviousYear(date: Date): {
  currentWeek: ReturnType<typeof getFinancialYearWeekBounds>
  previousYearWeek: ReturnType<typeof getFinancialYearWeekBounds>
} {
  const currentWeek = getFinancialYearWeekBounds(date)
  
  // Get the same week index in the previous FY
  const previousFY = currentWeek.fyYear - 1
  const previousFYStart = new Date(previousFY, AUSTRALIAN_FY_START_MONTH, AUSTRALIAN_FY_START_DAY)
  
  // Calculate the date for the same week in previous year
  const daysToAdd = (currentWeek.weekIndex - 1) * 7
  const previousYearSameWeekDate = new Date(previousFYStart)
  previousYearSameWeekDate.setDate(previousYearSameWeekDate.getDate() + daysToAdd)
  
  const previousYearWeek = getFinancialYearWeekBounds(previousYearSameWeekDate)
  
  return {
    currentWeek,
    previousYearWeek,
  }
}

/**
 * Check if a date is in the current financial year
 */
export function isCurrentFinancialYear(date: Date): boolean {
  const australianDate = toAustralianTimezone(date)
  const currentFY = getCurrentFinancialYear()
  
  return australianDate >= currentFY.startDate && australianDate <= currentFY.endDate
}

/**
 * Check if a date is a weekend (Saturday or Sunday) in Australian timezone
 */
export function isWeekend(date: Date): boolean {
  const australianDate = toAustralianTimezone(date)
  const dayOfWeek = australianDate.getDay()
  return dayOfWeek === 0 || dayOfWeek === 6 // Sunday = 0, Saturday = 6
}

/**
 * Check if a date is an Australian public holiday
 * Note: This is a simplified implementation. In production, you'd want to use a more comprehensive holiday library
 */
export function isAustralianPublicHoliday(date: Date): boolean {
  const australianDate = toAustralianTimezone(date)
  const month = australianDate.getMonth() + 1
  const day = australianDate.getDate()
  
  // Fixed holidays
  const fixedHolidays = [
    { month: 1, day: 1 },   // New Year's Day
    { month: 1, day: 26 },  // Australia Day
    { month: 4, day: 25 },  // ANZAC Day
    { month: 12, day: 25 }, // Christmas Day
    { month: 12, day: 26 }, // Boxing Day
  ]
  
  return fixedHolidays.some(holiday => 
    holiday.month === month && holiday.day === day
  )
}

/**
 * Get business days between two dates (excluding weekends and public holidays)
 */
export function getBusinessDaysBetween(startDate: Date, endDate: Date): number {
  const start = toAustralianTimezone(startDate)
  const end = toAustralianTimezone(endDate)
  
  let businessDays = 0
  const currentDate = new Date(start)
  
  while (currentDate <= end) {
    if (!isWeekend(currentDate) && !isAustralianPublicHoliday(currentDate)) {
      businessDays++
    }
    currentDate.setDate(currentDate.getDate() + 1)
  }
  
  return businessDays
}

/**
 * Add business days to a date (excluding weekends and public holidays)
 */
export function addBusinessDays(date: Date, businessDaysToAdd: number): Date {
  const australianDate = toAustralianTimezone(date)
  const result = new Date(australianDate)
  let addedDays = 0
  
  while (addedDays < businessDaysToAdd) {
    result.setDate(result.getDate() + 1)
    
    if (!isWeekend(result) && !isAustralianPublicHoliday(result)) {
      addedDays++
    }
  }
  
  return result
}

/**
 * Get the end of financial year date for a given FY year
 */
export function getEndOfFinancialYear(fyYear: number): Date {
  return new Date(fyYear + 1, AUSTRALIAN_FY_START_MONTH - 1, 30, 23, 59, 59, 999)
}

/**
 * Get the start of financial year date for a given FY year
 */
export function getStartOfFinancialYear(fyYear: number): Date {
  return new Date(fyYear, AUSTRALIAN_FY_START_MONTH, AUSTRALIAN_FY_START_DAY, 0, 0, 0, 0)
}

/**
 * Format a date for Australian display (DD/MM/YYYY)
 */
export function formatAustralianDate(date: Date): string {
  return new Intl.DateTimeFormat('en-AU', {
    timeZone: TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date)
}

/**
 * Format a date and time for Australian display (DD/MM/YYYY HH:MM)
 */
export function formatAustralianDateTime(date: Date): string {
  return new Intl.DateTimeFormat('en-AU', {
    timeZone: TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(date)
}

/**
 * Parse an Australian date string (DD/MM/YYYY) to Date object
 */
export function parseAustralianDate(dateString: string): Date {
  const [day, month, year] = dateString.split('/')
  return new Date(parseInt(year), parseInt(month) - 1, parseInt(day))
}

/**
 * Get financial year quarters with their date ranges
 */
export function getFinancialYearQuarters(fyYear: number): Array<{
  quarter: number
  label: string
  startDate: Date
  endDate: Date
}> {
  const fyStart = getStartOfFinancialYear(fyYear)
  
  return [
    {
      quarter: 1,
      label: 'Q1',
      startDate: new Date(fyYear, 6, 1), // July 1
      endDate: new Date(fyYear, 8, 30), // September 30
    },
    {
      quarter: 2,
      label: 'Q2',
      startDate: new Date(fyYear, 9, 1), // October 1
      endDate: new Date(fyYear, 11, 31), // December 31
    },
    {
      quarter: 3,
      label: 'Q3',
      startDate: new Date(fyYear + 1, 0, 1), // January 1
      endDate: new Date(fyYear + 1, 2, 31), // March 31
    },
    {
      quarter: 4,
      label: 'Q4',
      startDate: new Date(fyYear + 1, 3, 1), // April 1
      endDate: new Date(fyYear + 1, 5, 30), // June 30
    },
  ]
}

/**
 * Get the financial year quarter for a given date
 */
export function getFinancialYearQuarter(date: Date): {
  quarter: number
  label: string
  fyYear: number
} {
  const australianDate = toAustralianTimezone(date)
  const fy = getFinancialYear(australianDate)
  const month = australianDate.getMonth()
  
  let quarter: number
  if (month >= 6 && month <= 8) { // July, August, September
    quarter = 1
  } else if (month >= 9 && month <= 11) { // October, November, December
    quarter = 2
  } else if (month >= 0 && month <= 2) { // January, February, March
    quarter = 3
  } else { // April, May, June
    quarter = 4
  }
  
  return {
    quarter,
    label: `Q${quarter}`,
    fyYear: fy.year,
  }
}

/**
 * Check if two dates are in the same financial year
 */
export function isSameFinancialYear(date1: Date, date2: Date): boolean {
  const fy1 = getFinancialYear(date1)
  const fy2 = getFinancialYear(date2)
  return fy1.year === fy2.year
}

/**
 * Get date ranges for common financial periods
 */
export function getFinancialPeriodRanges(fyYear?: number) {
  const currentFY = fyYear ? { year: fyYear } : getCurrentFinancialYear()
  const previousFY = { year: currentFY.year - 1 }
  
  return {
    currentFY: {
      startDate: getStartOfFinancialYear(currentFY.year),
      endDate: getEndOfFinancialYear(currentFY.year),
      label: `FY ${currentFY.year}-${String(currentFY.year + 1).slice(-2)}`,
    },
    previousFY: {
      startDate: getStartOfFinancialYear(previousFY.year),
      endDate: getEndOfFinancialYear(previousFY.year),
      label: `FY ${previousFY.year}-${String(previousFY.year + 1).slice(-2)}`,
    },
    ytd: {
      startDate: getStartOfFinancialYear(currentFY.year),
      endDate: getCurrentAustralianDate(),
      label: 'Year to Date',
    },
    previousYearSamePeriod: {
      startDate: getStartOfFinancialYear(previousFY.year),
      endDate: (() => {
        const currentDate = getCurrentAustralianDate()
        const currentFYStart = getStartOfFinancialYear(currentFY.year)
        const daysSinceStart = Math.floor(
          (currentDate.getTime() - currentFYStart.getTime()) / (24 * 60 * 60 * 1000)
        )
        const previousFYStart = getStartOfFinancialYear(previousFY.year)
        const endDate = new Date(previousFYStart)
        endDate.setDate(endDate.getDate() + daysSinceStart)
        return endDate
      })(),
      label: 'Previous Year Same Period',
    },
  }
}
