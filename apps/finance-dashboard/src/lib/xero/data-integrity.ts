/**
 * Xero Data Integrity Checks
 * 
 * This module provides comprehensive data integrity validation for Xero sync operations.
 * It performs various checks to ensure data consistency, completeness, and accuracy
 * between Xero and our staging tables.
 * 
 * Features:
 * - Cross-reference validation between entities
 * - Data completeness checks
 * - Business rule validation
 * - Reconciliation with Xero reports
 * - Data quality scoring and reporting
 */

import { createServiceRoleClient } from '@/lib/supabase/server'
import { XeroDataValidator } from '@/lib/xero/validation'
import type { 
  XeroAccount,
  XeroContact,
  XeroInvoice,
  XeroPayment,
  XeroItem
} from '@/types/xero'

interface IntegrityCheckResult {
  checkType: string
  status: 'passed' | 'warning' | 'failed'
  message: string
  details?: any
  recordsAffected?: number
  timestamp: Date
}

interface DataIntegrityReport {
  overallScore: number // 0-100
  totalChecks: number
  passedChecks: number
  warningChecks: number
  failedChecks: number
  criticalIssues: string[]
  recommendations: string[]
  checkResults: IntegrityCheckResult[]
  generatedAt: Date
}

export class XeroDataIntegrityChecker {
  private supabase = createServiceRoleClient()
  private validator = new XeroDataValidator()

  /**
   * Run comprehensive data integrity checks
   */
  async runIntegrityChecks(entityTypes?: string[]): Promise<DataIntegrityReport> {
    const checkResults: IntegrityCheckResult[] = []
    const criticalIssues: string[] = []
    const recommendations: string[] = []

    try {
      // 1. Cross-reference integrity checks
      const crossRefResults = await this.checkCrossReferenceIntegrity()
      checkResults.push(...crossRefResults.checks)
      criticalIssues.push(...crossRefResults.criticalIssues)

      // 2. Data completeness checks
      const completenessResults = await this.checkDataCompleteness()
      checkResults.push(...completenessResults.checks)
      criticalIssues.push(...completenessResults.criticalIssues)

      // 3. Business rule validation
      const businessRuleResults = await this.checkBusinessRules()
      checkResults.push(...businessRuleResults.checks)
      criticalIssues.push(...businessRuleResults.criticalIssues)

      // 4. Data consistency checks
      const consistencyResults = await this.checkDataConsistency()
      checkResults.push(...consistencyResults.checks)
      criticalIssues.push(...consistencyResults.criticalIssues)

      // 5. Orphaned record detection
      const orphanResults = await this.checkOrphanedRecords()
      checkResults.push(...orphanResults.checks)
      criticalIssues.push(...orphanResults.criticalIssues)

      // 6. Duplicate detection
      const duplicateResults = await this.checkDuplicateRecords()
      checkResults.push(...duplicateResults.checks)
      recommendations.push(...duplicateResults.recommendations)

      // Calculate overall score
      const totalChecks = checkResults.length
      const passedChecks = checkResults.filter(r => r.status === 'passed').length
      const warningChecks = checkResults.filter(r => r.status === 'warning').length
      const failedChecks = checkResults.filter(r => r.status === 'failed').length

      // Score calculation: passed = 100%, warning = 50%, failed = 0%
      const overallScore = totalChecks > 0 
        ? Math.round(((passedChecks * 100) + (warningChecks * 50)) / totalChecks)
        : 100

      return {
        overallScore,
        totalChecks,
        passedChecks,
        warningChecks,
        failedChecks,
        criticalIssues: [...new Set(criticalIssues)], // Remove duplicates
        recommendations: [...new Set(recommendations)],
        checkResults,
        generatedAt: new Date()
      }

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      checkResults.push({
        checkType: 'system_error',
        status: 'failed',
        message: `Integrity check system error: ${errorMessage}`,
        timestamp: new Date()
      })

      return {
        overallScore: 0,
        totalChecks: 1,
        passedChecks: 0,
        warningChecks: 0,
        failedChecks: 1,
        criticalIssues: [`System error during integrity checks: ${errorMessage}`],
        recommendations: ['Contact system administrator to resolve integrity check issues'],
        checkResults,
        generatedAt: new Date()
      }
    }
  }

  /**
   * Check cross-reference integrity between entities
   */
  private async checkCrossReferenceIntegrity(): Promise<{
    checks: IntegrityCheckResult[]
    criticalIssues: string[]
  }> {
    const checks: IntegrityCheckResult[] = []
    const criticalIssues: string[] = []

    try {
      // Check invoices have valid contacts
      const { data: invoicesWithoutContacts } = await this.supabase
        .from('stg_invoices')
        .select('xero_invoice_id, contact_id')
        .not('contact_id', 'in', 
          this.supabase
            .from('stg_contacts')
            .select('xero_contact_id')
        )

      if (invoicesWithoutContacts && invoicesWithoutContacts.length > 0) {
        checks.push({
          checkType: 'invoice_contact_integrity',
          status: 'failed',
          message: `${invoicesWithoutContacts.length} invoices reference non-existent contacts`,
          recordsAffected: invoicesWithoutContacts.length,
          details: { orphanedInvoices: invoicesWithoutContacts.slice(0, 10) },
          timestamp: new Date()
        })
        criticalIssues.push('Invoices with invalid contact references detected')
      } else {
        checks.push({
          checkType: 'invoice_contact_integrity',
          status: 'passed',
          message: 'All invoices have valid contact references',
          timestamp: new Date()
        })
      }

      // Check payments have valid invoices
      const { data: paymentsWithoutInvoices } = await this.supabase
        .from('stg_payments')
        .select('xero_payment_id, invoice_id')
        .not('invoice_id', 'in',
          this.supabase
            .from('stg_invoices')
            .select('xero_invoice_id')
        )

      if (paymentsWithoutInvoices && paymentsWithoutInvoices.length > 0) {
        checks.push({
          checkType: 'payment_invoice_integrity',
          status: 'failed',
          message: `${paymentsWithoutInvoices.length} payments reference non-existent invoices`,
          recordsAffected: paymentsWithoutInvoices.length,
          details: { orphanedPayments: paymentsWithoutInvoices.slice(0, 10) },
          timestamp: new Date()
        })
        criticalIssues.push('Payments with invalid invoice references detected')
      } else {
        checks.push({
          checkType: 'payment_invoice_integrity',
          status: 'passed',
          message: 'All payments have valid invoice references',
          timestamp: new Date()
        })
      }

      // Check invoice line items have valid account codes
      const { data: lineItemsWithoutAccounts } = await this.supabase.rpc(
        'check_invoice_line_items_account_integrity'
      )

      if (lineItemsWithoutAccounts && lineItemsWithoutAccounts.length > 0) {
        checks.push({
          checkType: 'line_item_account_integrity',
          status: 'failed',
          message: `${lineItemsWithoutAccounts.length} invoice line items reference non-existent accounts`,
          recordsAffected: lineItemsWithoutAccounts.length,
          timestamp: new Date()
        })
        criticalIssues.push('Invoice line items with invalid account codes detected')
      } else {
        checks.push({
          checkType: 'line_item_account_integrity',
          status: 'passed',
          message: 'All invoice line items have valid account references',
          timestamp: new Date()
        })
      }

    } catch (error) {
      checks.push({
        checkType: 'cross_reference_check_error',
        status: 'failed',
        message: `Error checking cross-reference integrity: ${error instanceof Error ? error.message : 'Unknown error'}`,
        timestamp: new Date()
      })
    }

    return { checks, criticalIssues }
  }

  /**
   * Check data completeness
   */
  private async checkDataCompleteness(): Promise<{
    checks: IntegrityCheckResult[]
    criticalIssues: string[]
  }> {
    const checks: IntegrityCheckResult[] = []
    const criticalIssues: string[] = []

    try {
      // Check for missing required fields in invoices
      const { data: incompleteInvoices } = await this.supabase
        .from('stg_invoices')
        .select('xero_invoice_id')
        .or('contact_id.is.null,invoice_number.is.null,total_amount.is.null,status.is.null')

      if (incompleteInvoices && incompleteInvoices.length > 0) {
        checks.push({
          checkType: 'invoice_completeness',
          status: 'warning',
          message: `${incompleteInvoices.length} invoices have missing required fields`,
          recordsAffected: incompleteInvoices.length,
          timestamp: new Date()
        })
      } else {
        checks.push({
          checkType: 'invoice_completeness',
          status: 'passed',
          message: 'All invoices have required fields populated',
          timestamp: new Date()
        })
      }

      // Check for missing contact details
      const { data: incompleteContacts } = await this.supabase
        .from('stg_contacts')
        .select('xero_contact_id')
        .or('name.is.null,contact_status.is.null')

      if (incompleteContacts && incompleteContacts.length > 0) {
        checks.push({
          checkType: 'contact_completeness',
          status: 'warning',
          message: `${incompleteContacts.length} contacts have missing required fields`,
          recordsAffected: incompleteContacts.length,
          timestamp: new Date()
        })
      } else {
        checks.push({
          checkType: 'contact_completeness',
          status: 'passed',
          message: 'All contacts have required fields populated',
          timestamp: new Date()
        })
      }

      // Check sync checkpoint completeness
      const { data: syncCheckpoints } = await this.supabase
        .from('sync_checkpoints')
        .select('entity_type, last_updated_utc')

      const expectedEntities = [
        'accounts', 'contacts', 'invoices', 'payments', 'credit_notes',
        'items', 'bank_accounts', 'bank_transactions', 'manual_journals', 
        'tracking_categories'
      ]

      const missingCheckpoints = expectedEntities.filter(entity => 
        !syncCheckpoints?.some(cp => cp.entity_type === entity)
      )

      if (missingCheckpoints.length > 0) {
        checks.push({
          checkType: 'sync_checkpoint_completeness',
          status: 'warning',
          message: `${missingCheckpoints.length} entity types missing sync checkpoints`,
          details: { missingEntities: missingCheckpoints },
          timestamp: new Date()
        })
      } else {
        checks.push({
          checkType: 'sync_checkpoint_completeness',
          status: 'passed',
          message: 'All expected entity types have sync checkpoints',
          timestamp: new Date()
        })
      }

    } catch (error) {
      checks.push({
        checkType: 'completeness_check_error',
        status: 'failed',
        message: `Error checking data completeness: ${error instanceof Error ? error.message : 'Unknown error'}`,
        timestamp: new Date()
      })
    }

    return { checks, criticalIssues }
  }

  /**
   * Check business rules
   */
  private async checkBusinessRules(): Promise<{
    checks: IntegrityCheckResult[]
    criticalIssues: string[]
  }> {
    const checks: IntegrityCheckResult[] = []
    const criticalIssues: string[] = []

    try {
      // Check for invoices with negative totals
      const { data: negativeInvoices } = await this.supabase
        .from('stg_invoices')
        .select('xero_invoice_id, total_amount')
        .lt('total_amount', 0)

      if (negativeInvoices && negativeInvoices.length > 0) {
        checks.push({
          checkType: 'negative_invoice_amounts',
          status: 'warning',
          message: `${negativeInvoices.length} invoices have negative total amounts`,
          recordsAffected: negativeInvoices.length,
          timestamp: new Date()
        })
      } else {
        checks.push({
          checkType: 'negative_invoice_amounts',
          status: 'passed',
          message: 'No invoices with negative amounts found',
          timestamp: new Date()
        })
      }

      // Check for payments exceeding invoice totals
      const { data: overpayments } = await this.supabase.rpc(
        'check_overpayments'
      )

      if (overpayments && overpayments.length > 0) {
        checks.push({
          checkType: 'overpayment_detection',
          status: 'warning',
          message: `${overpayments.length} invoices have payments exceeding total amount`,
          recordsAffected: overpayments.length,
          timestamp: new Date()
        })
      } else {
        checks.push({
          checkType: 'overpayment_detection',
          status: 'passed',
          message: 'No overpayments detected',
          timestamp: new Date()
        })
      }

      // Check for future-dated transactions
      const { data: futureDatedTxns } = await this.supabase
        .from('stg_invoices')
        .select('xero_invoice_id, invoice_date')
        .gt('invoice_date', new Date().toISOString())

      if (futureDatedTxns && futureDatedTxns.length > 0) {
        checks.push({
          checkType: 'future_dated_transactions',
          status: 'warning',
          message: `${futureDatedTxns.length} transactions are dated in the future`,
          recordsAffected: futureDatedTxns.length,
          timestamp: new Date()
        })
      } else {
        checks.push({
          checkType: 'future_dated_transactions',
          status: 'passed',
          message: 'No future-dated transactions found',
          timestamp: new Date()
        })
      }

    } catch (error) {
      checks.push({
        checkType: 'business_rules_check_error',
        status: 'failed',
        message: `Error checking business rules: ${error instanceof Error ? error.message : 'Unknown error'}`,
        timestamp: new Date()
      })
    }

    return { checks, criticalIssues }
  }

  /**
   * Check data consistency
   */
  private async checkDataConsistency(): Promise<{
    checks: IntegrityCheckResult[]
    criticalIssues: string[]
  }> {
    const checks: IntegrityCheckResult[] = []
    const criticalIssues: string[] = []

    try {
      // Check invoice amount calculations
      const { data: inconsistentInvoices } = await this.supabase.rpc(
        'check_invoice_amount_consistency'
      )

      if (inconsistentInvoices && inconsistentInvoices.length > 0) {
        checks.push({
          checkType: 'invoice_amount_consistency',
          status: 'failed',
          message: `${inconsistentInvoices.length} invoices have inconsistent amount calculations`,
          recordsAffected: inconsistentInvoices.length,
          timestamp: new Date()
        })
        criticalIssues.push('Invoice amount calculation inconsistencies detected')
      } else {
        checks.push({
          checkType: 'invoice_amount_consistency',
          status: 'passed',
          message: 'All invoice amounts are consistent',
          timestamp: new Date()
        })
      }

      // Check currency consistency
      const { data: currencyInconsistencies } = await this.supabase.rpc(
        'check_currency_consistency'
      )

      if (currencyInconsistencies && currencyInconsistencies.length > 0) {
        checks.push({
          checkType: 'currency_consistency',
          status: 'warning',
          message: `${currencyInconsistencies.length} records have currency inconsistencies`,
          recordsAffected: currencyInconsistencies.length,
          timestamp: new Date()
        })
      } else {
        checks.push({
          checkType: 'currency_consistency',
          status: 'passed',
          message: 'Currency codes are consistent across records',
          timestamp: new Date()
        })
      }

    } catch (error) {
      checks.push({
        checkType: 'consistency_check_error',
        status: 'failed',
        message: `Error checking data consistency: ${error instanceof Error ? error.message : 'Unknown error'}`,
        timestamp: new Date()
      })
    }

    return { checks, criticalIssues }
  }

  /**
   * Check for orphaned records
   */
  private async checkOrphanedRecords(): Promise<{
    checks: IntegrityCheckResult[]
    criticalIssues: string[]
  }> {
    const checks: IntegrityCheckResult[] = []
    const criticalIssues: string[] = []

    try {
      // Check for orphaned payments (payments without invoices)
      const { data: orphanedPayments } = await this.supabase
        .from('stg_payments')
        .select('xero_payment_id')
        .not('invoice_id', 'in',
          this.supabase
            .from('stg_invoices')
            .select('xero_invoice_id')
        )

      if (orphanedPayments && orphanedPayments.length > 0) {
        checks.push({
          checkType: 'orphaned_payments',
          status: 'warning',
          message: `${orphanedPayments.length} payments have no corresponding invoice`,
          recordsAffected: orphanedPayments.length,
          timestamp: new Date()
        })
      } else {
        checks.push({
          checkType: 'orphaned_payments',
          status: 'passed',
          message: 'No orphaned payments found',
          timestamp: new Date()
        })
      }

      // Check for orphaned credit note allocations
      const { data: orphanedAllocations } = await this.supabase
        .from('stg_credit_note_allocations')
        .select('id')
        .not('invoice_id', 'in',
          this.supabase
            .from('stg_invoices')
            .select('xero_invoice_id')
        )

      if (orphanedAllocations && orphanedAllocations.length > 0) {
        checks.push({
          checkType: 'orphaned_credit_allocations',
          status: 'warning',
          message: `${orphanedAllocations.length} credit note allocations have no corresponding invoice`,
          recordsAffected: orphanedAllocations.length,
          timestamp: new Date()
        })
      } else {
        checks.push({
          checkType: 'orphaned_credit_allocations',
          status: 'passed',
          message: 'No orphaned credit note allocations found',
          timestamp: new Date()
        })
      }

    } catch (error) {
      checks.push({
        checkType: 'orphaned_records_check_error',
        status: 'failed',
        message: `Error checking orphaned records: ${error instanceof Error ? error.message : 'Unknown error'}`,
        timestamp: new Date()
      })
    }

    return { checks, criticalIssues }
  }

  /**
   * Check for duplicate records
   */
  private async checkDuplicateRecords(): Promise<{
    checks: IntegrityCheckResult[]
    recommendations: string[]
  }> {
    const checks: IntegrityCheckResult[] = []
    const recommendations: string[] = []

    try {
      // Check for duplicate contacts (same name and email)
      const { data: duplicateContacts } = await this.supabase.rpc(
        'find_duplicate_contacts'
      )

      if (duplicateContacts && duplicateContacts.length > 0) {
        checks.push({
          checkType: 'duplicate_contacts',
          status: 'warning',
          message: `${duplicateContacts.length} potential duplicate contacts found`,
          recordsAffected: duplicateContacts.length,
          timestamp: new Date()
        })
        recommendations.push('Review and merge duplicate contact records')
      } else {
        checks.push({
          checkType: 'duplicate_contacts',
          status: 'passed',
          message: 'No duplicate contacts found',
          timestamp: new Date()
        })
      }

      // Check for duplicate invoice numbers
      const { data: duplicateInvoices } = await this.supabase
        .from('stg_invoices')
        .select('invoice_number, count(*)')
        .not('invoice_number', 'is', null)
        .group('invoice_number')
        .having('count(*)', 'gt', 1)

      if (duplicateInvoices && duplicateInvoices.length > 0) {
        checks.push({
          checkType: 'duplicate_invoice_numbers',
          status: 'warning',
          message: `${duplicateInvoices.length} invoice numbers appear multiple times`,
          recordsAffected: duplicateInvoices.length,
          timestamp: new Date()
        })
        recommendations.push('Investigate duplicate invoice numbers for data quality')
      } else {
        checks.push({
          checkType: 'duplicate_invoice_numbers',
          status: 'passed',
          message: 'No duplicate invoice numbers found',
          timestamp: new Date()
        })
      }

    } catch (error) {
      checks.push({
        checkType: 'duplicate_check_error',
        status: 'failed',
        message: `Error checking duplicates: ${error instanceof Error ? error.message : 'Unknown error'}`,
        timestamp: new Date()
      })
    }

    return { checks, recommendations }
  }

  /**
   * Generate data quality recommendations
   */
  async generateDataQualityRecommendations(report: DataIntegrityReport): Promise<string[]> {
    const recommendations: string[] = [...report.recommendations]

    // Add score-based recommendations
    if (report.overallScore < 70) {
      recommendations.push('Overall data quality is below acceptable threshold - immediate attention required')
    } else if (report.overallScore < 90) {
      recommendations.push('Data quality is acceptable but has room for improvement')
    }

    // Add check-specific recommendations
    const failedChecks = report.checkResults.filter(c => c.status === 'failed')
    if (failedChecks.length > 0) {
      recommendations.push(`${failedChecks.length} critical checks failed - resolve these issues immediately`)
    }

    const warningChecks = report.checkResults.filter(c => c.status === 'warning')
    if (warningChecks.length > 3) {
      recommendations.push('Multiple data quality warnings detected - schedule data cleanup activities')
    }

    return [...new Set(recommendations)] // Remove duplicates
  }

  /**
   * Save integrity report to database
   */
  async saveIntegrityReport(report: DataIntegrityReport): Promise<{
    success: boolean
    reportId?: string
    error?: string
  }> {
    try {
      const { data, error } = await this.supabase
        .from('data_integrity_reports')
        .insert({
          overall_score: report.overallScore,
          total_checks: report.totalChecks,
          passed_checks: report.passedChecks,
          warning_checks: report.warningChecks,
          failed_checks: report.failedChecks,
          critical_issues: report.criticalIssues,
          recommendations: report.recommendations,
          check_results: report.checkResults,
          generated_at: report.generatedAt.toISOString()
        })
        .select('id')
        .single()

      if (error) {
        return { success: false, error: error.message }
      }

      return { success: true, reportId: data.id }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to save integrity report'
      }
    }
  }
}

// Export singleton instance
export const DataIntegrityChecker = new XeroDataIntegrityChecker()

// Export types
export type {
  IntegrityCheckResult,
  DataIntegrityReport
}
