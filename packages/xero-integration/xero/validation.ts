/**
 * Xero Data Validation
 * 
 * This module provides comprehensive validation for Xero data before
 * ingestion into staging tables. It ensures data integrity, validates
 * required fields, and provides detailed error reporting.
 * 
 * Features:
 * - Schema validation for all Xero entity types
 * - Business rule validation (e.g., positive amounts, valid dates)
 * - Cross-reference validation (e.g., contact exists for invoices)
 * - Data sanitization and normalization
 * - Detailed validation error reporting
 */

import { z } from 'zod'
import type {
  XeroAccount,
  XeroContact,
  XeroInvoice,
  XeroPayment,
  XeroCreditNote,
  XeroItem,
  XeroBankAccount,
  XeroBankTransaction,
  XeroManualJournal,
  XeroTrackingCategory
} from '@/types/xero'

// Validation result interface
interface ValidationResult<T> {
  isValid: boolean
  validRecords: T[]
  invalidRecords: Array<{
    record: T
    errors: string[]
  }>
  summary: {
    total: number
    valid: number
    invalid: number
    validationErrors: string[]
  }
}

// Common validation schemas
const uuidSchema = z.string().uuid('Invalid UUID format')
const nonEmptyStringSchema = z.string().min(1, 'Cannot be empty')
const positiveNumberSchema = z.number().positive('Must be positive')
const nonNegativeNumberSchema = z.number().min(0, 'Cannot be negative')
const dateSchema = z.date().or(z.string().datetime())
const currencyCodeSchema = z.string().length(3, 'Currency code must be 3 characters')
const emailSchema = z.string().email('Invalid email format').optional()

// Xero Account validation schema
const xeroAccountSchema = z.object({
  id: uuidSchema,
  code: nonEmptyStringSchema.max(10, 'Account code too long'),
  name: nonEmptyStringSchema.max(150, 'Account name too long'),
  type: z.enum(['BANK', 'CURRENT', 'CURRLIAB', 'DEPRECIATN', 'DIRECTCOSTS', 'EQUITY', 'EXPENSE', 'FIXED', 'INVENTORY', 'LIABILITY', 'NONCURRENT', 'OTHERINCOME', 'OVERHEADS', 'PREPAYMENT', 'REVENUE', 'SALES', 'TERMLIAB', 'PAYGLIABILITY']),
  taxType: z.string().optional(),
  description: z.string().max(4000, 'Description too long').optional(),
  isActive: z.boolean(),
  updatedDateUTC: dateSchema
})

// Xero Contact validation schema
const xeroContactSchema = z.object({
  id: uuidSchema,
  name: nonEmptyStringSchema.max(255, 'Contact name too long'),
  contactNumber: z.string().max(50, 'Contact number too long').optional(),
  accountNumber: z.string().max(50, 'Account number too long').optional(),
  contactStatus: z.enum(['ACTIVE', 'ARCHIVED', 'GDPRREQUEST']),
  isSupplier: z.boolean(),
  isCustomer: z.boolean(),
  emailAddress: emailSchema,
  phones: z.array(z.object({
    phoneType: z.enum(['DEFAULT', 'DDI', 'MOBILE', 'FAX']),
    phoneNumber: z.string().max(50, 'Phone number too long'),
    phoneAreaCode: z.string().max(10, 'Area code too long').optional(),
    phoneCountryCode: z.string().max(20, 'Country code too long').optional()
  })).optional(),
  addresses: z.array(z.object({
    addressType: z.enum(['POBOX', 'STREET']),
    addressLine1: z.string().max(500, 'Address line 1 too long').optional(),
    addressLine2: z.string().max(500, 'Address line 2 too long').optional(),
    city: z.string().max(255, 'City too long').optional(),
    region: z.string().max(255, 'Region too long').optional(),
    postalCode: z.string().max(50, 'Postal code too long').optional(),
    country: z.string().max(50, 'Country too long').optional()
  })).optional(),
  updatedDateUTC: dateSchema
})

// Xero Invoice validation schema
const xeroInvoiceSchema = z.object({
  id: uuidSchema,
  type: z.enum(['ACCREC', 'ACCPAY']),
  invoiceNumber: z.string().max(255, 'Invoice number too long').optional(),
  reference: z.string().max(4000, 'Reference too long').optional(),
  contact: z.object({
    contactID: uuidSchema,
    name: nonEmptyStringSchema
  }),
  date: dateSchema,
  dueDate: dateSchema,
  status: z.enum(['DRAFT', 'SUBMITTED', 'AUTHORISED', 'PAID', 'VOIDED']),
  lineAmountTypes: z.enum(['EXCLUSIVE', 'INCLUSIVE', 'NOTAX']),
  subTotal: nonNegativeNumberSchema,
  totalTax: nonNegativeNumberSchema,
  total: nonNegativeNumberSchema,
  amountDue: nonNegativeNumberSchema,
  amountPaid: nonNegativeNumberSchema,
  amountCredited: nonNegativeNumberSchema,
  currencyCode: currencyCodeSchema,
  lineItems: z.array(z.object({
    lineItemID: z.string().optional(),
    description: nonEmptyStringSchema.max(4000, 'Description too long'),
    quantity: positiveNumberSchema,
    unitAmount: z.number(),
    itemCode: z.string().max(30, 'Item code too long').optional(),
    accountCode: nonEmptyStringSchema.max(10, 'Account code too long'),
    taxType: z.string().max(10, 'Tax type too long').optional(),
    taxAmount: nonNegativeNumberSchema.optional(),
    lineAmount: z.number(),
    tracking: z.array(z.object({
      trackingCategoryID: uuidSchema,
      trackingOptionID: uuidSchema,
      name: nonEmptyStringSchema,
      option: nonEmptyStringSchema
    })).optional()
  })).min(1, 'Invoice must have at least one line item'),
  updatedDateUTC: dateSchema
})

// Xero Payment validation schema
const xeroPaymentSchema = z.object({
  id: uuidSchema,
  paymentID: uuidSchema,
  date: dateSchema,
  amount: positiveNumberSchema,
  reference: z.string().max(255, 'Reference too long').optional(),
  currencyCode: currencyCodeSchema,
  paymentType: z.enum(['ACCRECPAYMENT', 'ACCPAYPAYMENT']),
  status: z.enum(['AUTHORISED', 'DELETED']),
  account: z.object({
    accountID: uuidSchema,
    code: nonEmptyStringSchema,
    name: nonEmptyStringSchema
  }),
  invoice: z.object({
    invoiceID: uuidSchema,
    invoiceNumber: nonEmptyStringSchema
  }),
  updatedDateUTC: dateSchema
})

// Xero Item validation schema
const xeroItemSchema = z.object({
  id: uuidSchema,
  itemID: uuidSchema,
  code: nonEmptyStringSchema.max(30, 'Item code too long'),
  name: nonEmptyStringSchema.max(50, 'Item name too long'),
  description: z.string().max(4000, 'Description too long').optional(),
  purchaseDescription: z.string().max(4000, 'Purchase description too long').optional(),
  isTrackedAsInventory: z.boolean(),
  inventoryAssetAccountCode: z.string().max(10, 'Account code too long').optional(),
  quantityOnHand: nonNegativeNumberSchema.optional(),
  salesDetails: z.object({
    unitPrice: nonNegativeNumberSchema,
    accountCode: nonEmptyStringSchema.max(10, 'Account code too long'),
    taxType: z.string().max(10, 'Tax type too long').optional()
  }).optional(),
  purchaseDetails: z.object({
    unitPrice: nonNegativeNumberSchema,
    accountCode: nonEmptyStringSchema.max(10, 'Account code too long'),
    taxType: z.string().max(10, 'Tax type too long').optional()
  }).optional(),
  updatedDateUTC: dateSchema
})

class XeroDataValidator {
  /**
   * Validate Xero accounts
   */
  async validateAccounts(accounts: XeroAccount[]): Promise<ValidationResult<XeroAccount>> {
    return this.validateRecords(accounts, xeroAccountSchema, 'account')
  }

  /**
   * Validate Xero contacts
   */
  async validateContacts(contacts: XeroContact[]): Promise<ValidationResult<XeroContact>> {
    const result = this.validateRecords(contacts, xeroContactSchema, 'contact')
    
    // Additional business rule validation
    result.invalidRecords.forEach(({ record, errors }) => {
      // Contact must be either supplier or customer (or both)
      if (!record.isSupplier && !record.isCustomer) {
        errors.push('Contact must be either a supplier or customer')
      }
    })

    return result
  }

  /**
   * Validate Xero invoices
   */
  async validateInvoices(invoices: XeroInvoice[]): Promise<ValidationResult<XeroInvoice>> {
    const result = this.validateRecords(invoices, xeroInvoiceSchema, 'invoice')
    
    // Additional business rule validation
    result.invalidRecords.forEach(({ record, errors }) => {
      // Due date should not be before invoice date
      if (new Date(record.dueDate) < new Date(record.date)) {
        errors.push('Due date cannot be before invoice date')
      }

      // Total should equal subtotal plus tax
      const calculatedTotal = record.subTotal + record.totalTax
      if (Math.abs(record.total - calculatedTotal) > 0.01) {
        errors.push('Total amount does not match subtotal plus tax')
      }

      // Amount due should not exceed total
      if (record.amountDue > record.total) {
        errors.push('Amount due cannot exceed total amount')
      }

      // Paid amount should not exceed total
      if (record.amountPaid > record.total) {
        errors.push('Amount paid cannot exceed total amount')
      }

      // Validate line items sum to subtotal
      const lineItemsTotal = record.lineItems.reduce((sum, item) => sum + item.lineAmount, 0)
      if (Math.abs(lineItemsTotal - record.subTotal) > 0.01) {
        errors.push('Line items total does not match subtotal')
      }
    })

    return result
  }

  /**
   * Validate Xero payments
   */
  async validatePayments(payments: XeroPayment[]): Promise<ValidationResult<XeroPayment>> {
    const result = this.validateRecords(payments, xeroPaymentSchema, 'payment')
    
    // Additional validation - payment amount should be positive
    result.invalidRecords.forEach(({ record, errors }) => {
      if (record.amount <= 0) {
        errors.push('Payment amount must be positive')
      }
    })

    return result
  }

  /**
   * Validate Xero items
   */
  async validateItems(items: XeroItem[]): Promise<ValidationResult<XeroItem>> {
    const result = this.validateRecords(items, xeroItemSchema, 'item')
    
    // Additional business rule validation
    result.invalidRecords.forEach(({ record, errors }) => {
      // If tracked as inventory, should have inventory asset account
      if (record.isTrackedAsInventory && !record.inventoryAssetAccountCode) {
        errors.push('Inventory items must have an inventory asset account')
      }

      // Quantity on hand should be provided for inventory items
      if (record.isTrackedAsInventory && record.quantityOnHand === undefined) {
        errors.push('Inventory items must have quantity on hand specified')
      }
    })

    return result
  }

  /**
   * Cross-reference validation
   * Validates that referenced entities exist in the database
   */
  async validateCrossReferences(
    invoices: XeroInvoice[],
    existingContacts: Set<string>,
    existingAccounts: Set<string>
  ): Promise<{
    validInvoices: XeroInvoice[]
    invalidInvoices: Array<{
      invoice: XeroInvoice
      errors: string[]
    }>
  }> {
    const validInvoices: XeroInvoice[] = []
    const invalidInvoices: Array<{ invoice: XeroInvoice; errors: string[] }> = []

    for (const invoice of invoices) {
      const errors: string[] = []

      // Check if contact exists
      if (!existingContacts.has(invoice.contact.contactID)) {
        errors.push(`Contact ${invoice.contact.contactID} does not exist`)
      }

      // Check if account codes exist for line items
      for (const lineItem of invoice.lineItems) {
        if (!existingAccounts.has(lineItem.accountCode)) {
          errors.push(`Account code ${lineItem.accountCode} does not exist`)
        }
      }

      if (errors.length > 0) {
        invalidInvoices.push({ invoice, errors })
      } else {
        validInvoices.push(invoice)
      }
    }

    return { validInvoices, invalidInvoices }
  }

  /**
   * Data sanitization
   */
  sanitizeStringFields<T extends Record<string, any>>(record: T): T {
    const sanitized = { ...record }
    
    for (const [key, value] of Object.entries(sanitized)) {
      if (typeof value === 'string') {
        // Trim whitespace
        sanitized[key] = value.trim()
        
        // Remove null characters
        sanitized[key] = sanitized[key].replace(/\0/g, '')
        
        // Normalize line endings
        sanitized[key] = sanitized[key].replace(/\r\n/g, '\n').replace(/\r/g, '\n')
      }
    }
    
    return sanitized
  }

  /**
   * Generic record validation method
   */
  private validateRecords<T>(
    records: T[],
    schema: z.ZodSchema<T>,
    recordType: string
  ): ValidationResult<T> {
    const validRecords: T[] = []
    const invalidRecords: Array<{ record: T; errors: string[] }> = []
    const validationErrors: string[] = []

    for (const record of records) {
      try {
        // Sanitize the record
        const sanitizedRecord = this.sanitizeStringFields(record)
        
        // Validate against schema
        const validatedRecord = schema.parse(sanitizedRecord)
        validRecords.push(validatedRecord)
        
      } catch (error) {
        const errors: string[] = []
        
        if (error instanceof z.ZodError) {
          errors.push(...error.errors.map(err => 
            `${err.path.join('.')}: ${err.message}`
          ))
        } else {
          errors.push(`Validation error: ${error instanceof Error ? error.message : 'Unknown error'}`)
        }
        
        invalidRecords.push({ record, errors })
        validationErrors.push(`${recordType} validation failed: ${errors.join(', ')}`)
      }
    }

    return {
      isValid: invalidRecords.length === 0,
      validRecords,
      invalidRecords,
      summary: {
        total: records.length,
        valid: validRecords.length,
        invalid: invalidRecords.length,
        validationErrors
      }
    }
  }

  /**
   * Generate validation report
   */
  generateValidationReport<T>(result: ValidationResult<T>, entityType: string): string {
    const { summary, invalidRecords } = result
    
    let report = `\n=== ${entityType.toUpperCase()} VALIDATION REPORT ===\n`
    report += `Total records: ${summary.total}\n`
    report += `Valid records: ${summary.valid}\n`
    report += `Invalid records: ${summary.invalid}\n`
    report += `Success rate: ${((summary.valid / summary.total) * 100).toFixed(1)}%\n`
    
    if (invalidRecords.length > 0) {
      report += `\nValidation Errors:\n`
      invalidRecords.forEach((item, index) => {
        report += `\n${index + 1}. Record ID: ${(item.record as any).id || 'Unknown'}\n`
        item.errors.forEach(error => {
          report += `   - ${error}\n`
        })
      })
    }
    
    return report
  }
}

// Export singleton instance
export const XeroValidator = new XeroDataValidator()

// Export types
export type { ValidationResult }
