// Tests for enhanced password validation

import {
  validatePassword,
  validatePasswordBasic,
  generateSecurePassword,
} from '@/lib/auth/auth'

describe('Password Validation', () => {
  describe('validatePassword (enhanced)', () => {
    test('should validate strong passwords correctly', () => {
      const strongPassword = 'MySecure123!Password'
      const result = validatePassword(strongPassword)

      expect(result.isValid).toBe(true)
      expect(result.errors).toHaveLength(0)
      expect(result.strength).toBe('strong')
      expect(result.score).toBeGreaterThan(80)
    })

    test('should identify weak passwords', () => {
      const weakPassword = 'abc123'
      const result = validatePassword(weakPassword)

      expect(result.isValid).toBe(false)
      expect(result.errors.length).toBeGreaterThan(0)
      expect(result.strength).toBe('weak')
      expect(result.score).toBeLessThan(50)
    })

    test('should provide warnings for improvable passwords', () => {
      const okPassword = 'Password123' // Missing special chars, could be longer
      const result = validatePassword(okPassword)

      expect(result.isValid).toBe(true) // Meets basic requirements
      expect(result.warnings.length).toBeGreaterThan(0)
      expect(result.strength).toBe('fair')
    })

    test('should reject passwords that are only numbers', () => {
      const numberOnlyPassword = '12345678'
      const result = validatePassword(numberOnlyPassword)

      expect(result.isValid).toBe(false)
      expect(result.errors).toContain('Password cannot be only numbers')
    })

    test('should warn about common patterns', () => {
      const commonPassword = 'Password123'
      const result = validatePassword(commonPassword)

      expect(result.warnings.some(w => w.includes('common patterns'))).toBe(
        true
      )
    })

    test('should warn about repeating characters', () => {
      const repeatingPassword = 'Passsword123'
      const result = validatePassword(repeatingPassword)

      expect(
        result.warnings.some(w => w.includes('repeating characters'))
      ).toBe(true)
    })

    test('should score passwords appropriately', () => {
      const passwords = [
        { password: 'abc', expectedScore: 0 },
        { password: 'Abc123', expectedRange: [35, 65] },
        { password: 'SecurePass123', expectedRange: [65, 85] },
        { password: 'VerySecure123!@#', expectedRange: [85, 100] },
      ]

      passwords.forEach(({ password, expectedScore, expectedRange }) => {
        const result = validatePassword(password)

        if (expectedScore !== undefined) {
          expect(result.score).toBe(expectedScore)
        } else if (expectedRange) {
          expect(result.score).toBeGreaterThanOrEqual(expectedRange[0])
          expect(result.score).toBeLessThanOrEqual(expectedRange[1])
        }
      })
    })
  })

  describe('validatePasswordBasic (backward compatibility)', () => {
    test('should maintain backward compatibility', () => {
      const password = 'ValidPass123'
      const result = validatePasswordBasic(password)

      expect(result).toHaveProperty('isValid')
      expect(result).toHaveProperty('errors')
      expect(typeof result.isValid).toBe('boolean')
      expect(Array.isArray(result.errors)).toBe(true)
    })

    test('should return same validation result as enhanced function', () => {
      const password = 'TestPassword123'
      const basicResult = validatePasswordBasic(password)
      const enhancedResult = validatePassword(password)

      expect(basicResult.isValid).toBe(enhancedResult.isValid)
      expect(basicResult.errors).toEqual(enhancedResult.errors)
    })
  })

  describe('generateSecurePassword', () => {
    test('should generate passwords of correct length', () => {
      const password8 = generateSecurePassword(8)
      const password16 = generateSecurePassword(16)
      const passwordDefault = generateSecurePassword()

      expect(password8).toHaveLength(8)
      expect(password16).toHaveLength(16)
      expect(passwordDefault).toHaveLength(12) // Default length
    })

    test('should generate passwords that meet validation requirements', () => {
      const password = generateSecurePassword(12)
      const result = validatePassword(password)

      expect(result.isValid).toBe(true)
      expect(result.strength).toMatch(/good|strong/)
      expect(result.score).toBeGreaterThan(65)
    })

    test('should generate unique passwords', () => {
      const passwords = Array.from({ length: 10 }, () =>
        generateSecurePassword()
      )
      const uniquePasswords = new Set(passwords)

      expect(uniquePasswords.size).toBe(passwords.length) // All should be unique
    })

    test('should include required character types', () => {
      const password = generateSecurePassword(16)

      expect(/[A-Z]/.test(password)).toBe(true) // Uppercase
      expect(/[a-z]/.test(password)).toBe(true) // Lowercase
      expect(/[0-9]/.test(password)).toBe(true) // Numbers
      // Special characters are included in charset, should appear in longer passwords
    })
  })

  describe('Password Security Rules', () => {
    test('should enforce minimum length requirement', () => {
      const shortPasswords = [
        'a',
        'ab',
        'abc',
        'abcd',
        'abcde',
        'abcdef',
        'abcdefg',
      ]

      shortPasswords.forEach(password => {
        const result = validatePassword(password)
        expect(result.isValid).toBe(false)
        expect(result.errors.some(e => e.includes('8 characters'))).toBe(true)
      })
    })

    test('should require mixed case', () => {
      const result1 = validatePassword('alllowercase123')
      expect(result1.errors.some(e => e.includes('uppercase'))).toBe(true)

      const result2 = validatePassword('ALLUPPERCASE123')
      expect(result2.errors.some(e => e.includes('lowercase'))).toBe(true)
    })

    test('should require numbers', () => {
      const result = validatePassword('NoNumbersHere')
      expect(result.errors.some(e => e.includes('number'))).toBe(true)
    })

    test('should provide helpful warnings for better security', () => {
      const result = validatePassword('GoodPass123') // Valid but could be better

      expect(result.isValid).toBe(true)
      expect(result.warnings.length).toBeGreaterThan(0)
    })
  })

  describe('Financial Application Security', () => {
    test('should enforce strong passwords for financial data access', () => {
      // Financial applications should encourage strong passwords
      const financialPassword = 'FinanceSecure2024!'
      const result = validatePassword(financialPassword)

      expect(result.isValid).toBe(true)
      expect(result.strength).toMatch(/good|strong/)
      expect(result.score).toBeGreaterThan(70)
    })

    test('should reject obviously weak passwords', () => {
      const weakPasswords = [
        'password',
        '12345678',
        'admin123',
        'qwerty123',
        'Password',
      ]

      weakPasswords.forEach(password => {
        const result = validatePassword(password)
        expect(result.isValid).toBe(false)
      })
    })
  })
})
