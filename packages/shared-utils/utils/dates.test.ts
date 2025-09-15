// Unit tests for Australian Financial Year date utilities

import {
  getCurrentAustralianDate,
  toAustralianTimezone,
  getFinancialYear,
  getCurrentFinancialYear,
  getPreviousFinancialYear,
  getFinancialYearWeekIndex,
  getFinancialYearWeekBounds,
  getFinancialYearWeeks,
  getSameWeekPreviousYear,
  isCurrentFinancialYear,
  isWeekend,
  isAustralianPublicHoliday,
  getBusinessDaysBetween,
  addBusinessDays,
  getEndOfFinancialYear,
  getStartOfFinancialYear,
  formatAustralianDate,
  formatAustralianDateTime,
  parseAustralianDate,
  getFinancialYearQuarters,
  getFinancialYearQuarter,
  isSameFinancialYear,
  getFinancialPeriodRanges,
} from './dates'

// Mock current date for consistent testing
const mockCurrentDate = new Date('2024-08-15T10:30:00Z') // August 15, 2024 (FY 2024-25)

beforeAll(() => {
  jest.useFakeTimers()
  jest.setSystemTime(mockCurrentDate)
})

afterAll(() => {
  jest.useRealTimers()
})

describe('Australian Financial Year Date Utilities', () => {
  describe('getFinancialYear', () => {
    it('should return correct FY for dates in different months', () => {
      // Date in August (FY 2024-25)
      const augustDate = new Date('2024-08-15')
      const augustFY = getFinancialYear(augustDate)

      expect(augustFY.year).toBe(2024)
      expect(augustFY.label).toBe('FY 2024-25')
      expect(augustFY.startDate.getFullYear()).toBe(2024)
      expect(augustFY.startDate.getMonth()).toBe(6) // July (0-indexed)
      expect(augustFY.startDate.getDate()).toBe(1)

      // Date in May (still FY 2023-24)
      const mayDate = new Date('2024-05-15')
      const mayFY = getFinancialYear(mayDate)

      expect(mayFY.year).toBe(2023)
      expect(mayFY.label).toBe('FY 2023-24')
    })

    it('should handle FY boundary dates correctly', () => {
      // July 1 - start of FY
      const fyStart = new Date('2024-07-01')
      const fyStartResult = getFinancialYear(fyStart)
      expect(fyStartResult.year).toBe(2024)

      // June 30 - end of FY
      const fyEnd = new Date('2024-06-30')
      const fyEndResult = getFinancialYear(fyEnd)
      expect(fyEndResult.year).toBe(2023)
    })
  })

  describe('getFinancialYearWeekIndex', () => {
    it('should calculate correct week numbers', () => {
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

    it('should handle year boundary correctly', () => {
      // Date in January (middle of FY 2023-24)
      const januaryDate = new Date('2024-01-15')
      const weekIndex = getFinancialYearWeekIndex(januaryDate)
      expect(weekIndex).toBeGreaterThan(25) // Should be around week 28-30
    })
  })

  describe('getFinancialYearWeekBounds', () => {
    it('should return correct week boundaries', () => {
      const testDate = new Date('2024-08-15')
      const bounds = getFinancialYearWeekBounds(testDate)

      expect(bounds.fyYear).toBe(2024)
      expect(bounds.fyLabel).toBe('FY 2024-25')
      expect(bounds.weekIndex).toBeGreaterThan(0)
      expect(bounds.startDate).toBeInstanceOf(Date)
      expect(bounds.endDate).toBeInstanceOf(Date)
      expect(bounds.endDate.getTime()).toBeGreaterThan(bounds.startDate.getTime())
    })
  })

  describe('getFinancialYearWeeks', () => {
    it('should return all weeks for a financial year', () => {
      const weeks = getFinancialYearWeeks(2024)

      expect(weeks.length).toBeGreaterThan(50) // Should be 52-53 weeks
      expect(weeks.length).toBeLessThan(55)
      expect(weeks[0].weekIndex).toBe(1)
      expect(weeks[0].startDate.getMonth()).toBe(6) // July
      expect(weeks[0].startDate.getDate()).toBe(1)
    })

    it('should have consecutive weeks with no gaps', () => {
      const weeks = getFinancialYearWeeks(2024)

      for (let i = 1; i < weeks.length; i++) {
        const prevWeekEnd = weeks[i - 1].endDate
        const currentWeekStart = weeks[i].startDate
        
        // Next week should start the day after previous week ends
        const expectedStart = new Date(prevWeekEnd)
        expectedStart.setDate(expectedStart.getDate() + 1)
        
        expect(currentWeekStart.getDate()).toBe(expectedStart.getDate())
      }
    })
  })

  describe('getSameWeekPreviousYear', () => {
    it('should find corresponding week in previous FY', () => {
      const currentDate = new Date('2024-08-15')
      const result = getSameWeekPreviousYear(currentDate)

      expect(result.currentWeek.fyYear).toBe(2024)
      expect(result.previousYearWeek.fyYear).toBe(2023)
      expect(result.currentWeek.weekIndex).toBe(result.previousYearWeek.weekIndex)
    })
  })

  describe('isCurrentFinancialYear', () => {
    it('should correctly identify dates in current FY', () => {
      // Current date (August 2024) should be in current FY
      expect(isCurrentFinancialYear(new Date('2024-08-15'))).toBe(true)
      
      // Date in previous FY should be false
      expect(isCurrentFinancialYear(new Date('2024-05-15'))).toBe(false)
      
      // Date in next FY should be false
      expect(isCurrentFinancialYear(new Date('2025-08-15'))).toBe(false)
    })
  })

  describe('isWeekend', () => {
    it('should identify weekends correctly', () => {
      // Saturday
      expect(isWeekend(new Date('2024-08-17'))).toBe(true)
      
      // Sunday
      expect(isWeekend(new Date('2024-08-18'))).toBe(true)
      
      // Monday
      expect(isWeekend(new Date('2024-08-19'))).toBe(false)
      
      // Friday
      expect(isWeekend(new Date('2024-08-16'))).toBe(false)
    })
  })

  describe('isAustralianPublicHoliday', () => {
    it('should identify major Australian public holidays', () => {
      // New Year's Day
      expect(isAustralianPublicHoliday(new Date('2024-01-01'))).toBe(true)
      
      // Australia Day
      expect(isAustralianPublicHoliday(new Date('2024-01-26'))).toBe(true)
      
      // ANZAC Day
      expect(isAustralianPublicHoliday(new Date('2024-04-25'))).toBe(true)
      
      // Christmas Day
      expect(isAustralianPublicHoliday(new Date('2024-12-25'))).toBe(true)
      
      // Boxing Day
      expect(isAustralianPublicHoliday(new Date('2024-12-26'))).toBe(true)
      
      // Regular day should be false
      expect(isAustralianPublicHoliday(new Date('2024-08-15'))).toBe(false)
    })
  })

  describe('getBusinessDaysBetween', () => {
    it('should count business days correctly', () => {
      // Monday to Friday (same week) = 5 business days
      const monday = new Date('2024-08-12')
      const friday = new Date('2024-08-16')
      expect(getBusinessDaysBetween(monday, friday)).toBe(5)
      
      // Friday to Monday (weekend in between) = 2 business days
      const fridayBefore = new Date('2024-08-16')
      const mondayAfter = new Date('2024-08-19')
      expect(getBusinessDaysBetween(fridayBefore, mondayAfter)).toBe(2)
    })

    it('should exclude public holidays', () => {
      // Period including Christmas Day
      const beforeChristmas = new Date('2024-12-24')
      const afterChristmas = new Date('2024-12-26')
      const businessDays = getBusinessDaysBetween(beforeChristmas, afterChristmas)
      
      // Should be less than 3 due to holidays
      expect(businessDays).toBeLessThan(3)
    })
  })

  describe('addBusinessDays', () => {
    it('should add business days correctly', () => {
      // Add 5 business days to a Monday
      const monday = new Date('2024-08-12')
      const result = addBusinessDays(monday, 5)
      
      // Should land on the following Monday (skipping weekend)
      expect(result.getDay()).toBe(1) // Monday
      expect(result.getDate()).toBeGreaterThan(monday.getDate() + 5)
    })

    it('should skip weekends and holidays', () => {
      // Add business days over a weekend
      const friday = new Date('2024-08-16')
      const result = addBusinessDays(friday, 1)
      
      // Should be the following Monday
      expect(result.getDay()).toBe(1) // Monday
      expect(result.getDate()).toBe(19)
    })
  })

  describe('formatAustralianDate', () => {
    it('should format dates in DD/MM/YYYY format', () => {
      const date = new Date('2024-08-15')
      const formatted = formatAustralianDate(date)
      
      expect(formatted).toMatch(/^\d{2}\/\d{2}\/\d{4}$/)
      expect(formatted).toContain('2024')
    })
  })

  describe('formatAustralianDateTime', () => {
    it('should format date and time in DD/MM/YYYY HH:MM format', () => {
      const date = new Date('2024-08-15T14:30:00')
      const formatted = formatAustralianDateTime(date)
      
      expect(formatted).toMatch(/^\d{2}\/\d{2}\/\d{4} \d{2}:\d{2}$/)
      expect(formatted).toContain('2024')
    })
  })

  describe('parseAustralianDate', () => {
    it('should parse DD/MM/YYYY format correctly', () => {
      const dateString = '15/08/2024'
      const parsed = parseAustralianDate(dateString)
      
      expect(parsed.getFullYear()).toBe(2024)
      expect(parsed.getMonth()).toBe(7) // August (0-indexed)
      expect(parsed.getDate()).toBe(15)
    })
  })

  describe('getFinancialYearQuarters', () => {
    it('should return 4 quarters with correct date ranges', () => {
      const quarters = getFinancialYearQuarters(2024)
      
      expect(quarters).toHaveLength(4)
      expect(quarters[0].quarter).toBe(1)
      expect(quarters[0].startDate.getMonth()).toBe(6) // July
      expect(quarters[3].quarter).toBe(4)
      expect(quarters[3].endDate.getMonth()).toBe(5) // June
    })

    it('should have consecutive quarters with no gaps', () => {
      const quarters = getFinancialYearQuarters(2024)
      
      for (let i = 1; i < quarters.length; i++) {
        const prevQuarterEnd = quarters[i - 1].endDate
        const currentQuarterStart = quarters[i].startDate
        
        // Next quarter should start the day after previous quarter ends
        const expectedStart = new Date(prevQuarterEnd)
        expectedStart.setDate(expectedStart.getDate() + 1)
        
        expect(currentQuarterStart.getDate()).toBe(expectedStart.getDate())
      }
    })
  })

  describe('getFinancialYearQuarter', () => {
    it('should identify quarters correctly', () => {
      // Q1: July-September
      expect(getFinancialYearQuarter(new Date('2024-08-15')).quarter).toBe(1)
      
      // Q2: October-December
      expect(getFinancialYearQuarter(new Date('2024-11-15')).quarter).toBe(2)
      
      // Q3: January-March
      expect(getFinancialYearQuarter(new Date('2025-02-15')).quarter).toBe(3)
      
      // Q4: April-June
      expect(getFinancialYearQuarter(new Date('2025-05-15')).quarter).toBe(4)
    })

    it('should return correct FY year for each quarter', () => {
      // August 2024 should be Q1 of FY 2024-25
      const q1Result = getFinancialYearQuarter(new Date('2024-08-15'))
      expect(q1Result.quarter).toBe(1)
      expect(q1Result.fyYear).toBe(2024)
      
      // February 2025 should be Q3 of FY 2024-25
      const q3Result = getFinancialYearQuarter(new Date('2025-02-15'))
      expect(q3Result.quarter).toBe(3)
      expect(q3Result.fyYear).toBe(2024)
    })
  })

  describe('isSameFinancialYear', () => {
    it('should correctly identify dates in same FY', () => {
      const date1 = new Date('2024-08-15') // FY 2024-25
      const date2 = new Date('2025-03-15') // FY 2024-25
      const date3 = new Date('2024-05-15') // FY 2023-24
      
      expect(isSameFinancialYear(date1, date2)).toBe(true)
      expect(isSameFinancialYear(date1, date3)).toBe(false)
    })
  })

  describe('getFinancialPeriodRanges', () => {
    it('should return correct period ranges', () => {
      const ranges = getFinancialPeriodRanges()
      
      expect(ranges.currentFY.label).toBe('FY 2024-25')
      expect(ranges.previousFY.label).toBe('FY 2023-24')
      expect(ranges.ytd.label).toBe('Year to Date')
      expect(ranges.previousYearSamePeriod.label).toBe('Previous Year Same Period')
      
      // YTD should start from July 1
      expect(ranges.ytd.startDate.getMonth()).toBe(6) // July
      expect(ranges.ytd.startDate.getDate()).toBe(1)
      
      // YTD end should be current date
      expect(ranges.ytd.endDate.getDate()).toBe(mockCurrentDate.getDate())
    })

    it('should handle custom FY year', () => {
      const ranges = getFinancialPeriodRanges(2023)
      
      expect(ranges.currentFY.label).toBe('FY 2023-24')
      expect(ranges.previousFY.label).toBe('FY 2022-23')
    })
  })

  describe('getStartOfFinancialYear and getEndOfFinancialYear', () => {
    it('should return correct FY start and end dates', () => {
      const fyStart = getStartOfFinancialYear(2024)
      const fyEnd = getEndOfFinancialYear(2024)
      
      expect(fyStart.getFullYear()).toBe(2024)
      expect(fyStart.getMonth()).toBe(6) // July
      expect(fyStart.getDate()).toBe(1)
      expect(fyStart.getHours()).toBe(0)
      
      expect(fyEnd.getFullYear()).toBe(2025)
      expect(fyEnd.getMonth()).toBe(5) // June
      expect(fyEnd.getDate()).toBe(30)
      expect(fyEnd.getHours()).toBe(23)
    })
  })

  describe('timezone handling', () => {
    it('should handle timezone conversion correctly', () => {
      const utcDate = new Date('2024-08-15T14:30:00Z')
      const australianDate = toAustralianTimezone(utcDate)
      
      // Australian time should be different from UTC (AEST/AEDT)
      expect(australianDate.getTime()).not.toBe(utcDate.getTime())
      
      // Should maintain the date integrity for business logic
      expect(australianDate).toBeInstanceOf(Date)
    })

    it('should get current Australian date', () => {
      const australianDate = getCurrentAustralianDate()
      
      expect(australianDate).toBeInstanceOf(Date)
      // Should be a valid date
      expect(australianDate.getTime()).not.toBeNaN()
    })
  })
})
