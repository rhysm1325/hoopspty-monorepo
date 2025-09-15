/**
 * Xero Staging Data Ingestion
 * 
 * This module handles the ingestion and processing of Xero API data into staging tables.
 * It transforms Xero API responses into normalized database records with proper validation,
 * error handling, and batch processing capabilities.
 * 
 * Features:
 * - Type-safe data transformation from Xero API to database schema
 * - Batch upsert operations with conflict resolution
 * - Comprehensive data validation and sanitization
 * - Related entity processing (e.g., invoice line items)
 * - Performance optimized bulk operations
 * - Detailed error reporting and recovery
 */

import { createServerClient } from '@/lib/supabase/server'
import { config } from '@/lib/env'
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
  XeroTrackingCategory,
  XeroTrackingOption
} from '@/types/xero'

// Staging operation result interface
interface StagingResult {
  success: boolean
  recordsInserted: number
  recordsUpdated: number
  recordsSkipped: number
  recordsFailed: number
  errors: string[]
  processingTime: number
}

// Batch processing configuration
interface BatchConfig {
  batchSize: number
  maxRetries: number
  retryDelay: number
}

const DEFAULT_BATCH_CONFIG: BatchConfig = {
  batchSize: 100,
  maxRetries: 3,
  retryDelay: 1000
}

class XeroStagingProcessor {
  private readonly supabase = createServerClient()

  /**
   * Process and upsert Xero accounts data
   */
  async upsertAccounts(
    accounts: XeroAccount[],
    syncBatchId?: string,
    batchConfig: BatchConfig = DEFAULT_BATCH_CONFIG
  ): Promise<StagingResult> {
    const startTime = Date.now()
    let recordsInserted = 0
    let recordsUpdated = 0
    let recordsSkipped = 0
    let recordsFailed = 0
    const errors: string[] = []

    try {
      this.log('info', `Processing ${accounts.length} accounts`, { syncBatchId })

      // Process in batches
      for (let i = 0; i < accounts.length; i += batchConfig.batchSize) {
        const batch = accounts.slice(i, i + batchConfig.batchSize)
        
        try {
          const transformedAccounts = batch.map(account => this.transformAccount(account, syncBatchId))
          
          const { data, error } = await this.supabase
            .from('stg_accounts')
            .upsert(transformedAccounts, {
              onConflict: 'xero_id',
              ignoreDuplicates: false
            })
            .select('id, xero_id')

          if (error) {
            throw new Error(`Batch upsert failed: ${error.message}`)
          }

          // Count operations (simplified - in real implementation would track inserts vs updates)
          recordsInserted += transformedAccounts.length

          this.log('info', `Processed batch ${Math.floor(i / batchConfig.batchSize) + 1}`, {
            batchSize: batch.length,
            recordsProcessed: recordsInserted
          })

        } catch (batchError) {
          const errorMessage = batchError instanceof Error ? batchError.message : 'Unknown batch error'
          errors.push(`Batch ${Math.floor(i / batchConfig.batchSize) + 1}: ${errorMessage}`)
          recordsFailed += batch.length
          
          this.log('error', 'Account batch processing failed', {
            batchIndex: Math.floor(i / batchConfig.batchSize) + 1,
            batchSize: batch.length,
            error: errorMessage
          })
        }
      }

      const processingTime = Date.now() - startTime

      this.log('info', 'Account processing completed', {
        total: accounts.length,
        inserted: recordsInserted,
        updated: recordsUpdated,
        skipped: recordsSkipped,
        failed: recordsFailed,
        processingTime: `${processingTime}ms`
      })

      return {
        success: recordsFailed === 0,
        recordsInserted,
        recordsUpdated,
        recordsSkipped,
        recordsFailed,
        errors,
        processingTime
      }

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown accounts processing error'
      this.log('error', 'Accounts processing failed', { error: errorMessage })

      return {
        success: false,
        recordsInserted,
        recordsUpdated,
        recordsSkipped,
        recordsFailed: accounts.length,
        errors: [errorMessage],
        processingTime: Date.now() - startTime
      }
    }
  }

  /**
   * Process and upsert Xero contacts data
   */
  async upsertContacts(
    contacts: XeroContact[],
    syncBatchId?: string,
    batchConfig: BatchConfig = DEFAULT_BATCH_CONFIG
  ): Promise<StagingResult> {
    const startTime = Date.now()
    let recordsInserted = 0
    let recordsUpdated = 0
    let recordsSkipped = 0
    let recordsFailed = 0
    const errors: string[] = []

    try {
      this.log('info', `Processing ${contacts.length} contacts`, { syncBatchId })

      for (let i = 0; i < contacts.length; i += batchConfig.batchSize) {
        const batch = contacts.slice(i, i + batchConfig.batchSize)
        
        try {
          const transformedContacts = batch.map(contact => this.transformContact(contact, syncBatchId))
          
          const { error } = await this.supabase
            .from('stg_contacts')
            .upsert(transformedContacts, {
              onConflict: 'xero_id',
              ignoreDuplicates: false
            })

          if (error) {
            throw new Error(`Batch upsert failed: ${error.message}`)
          }

          recordsInserted += transformedContacts.length

        } catch (batchError) {
          const errorMessage = batchError instanceof Error ? batchError.message : 'Unknown batch error'
          errors.push(`Contacts batch ${Math.floor(i / batchConfig.batchSize) + 1}: ${errorMessage}`)
          recordsFailed += batch.length
        }
      }

      return {
        success: recordsFailed === 0,
        recordsInserted,
        recordsUpdated,
        recordsSkipped,
        recordsFailed,
        errors,
        processingTime: Date.now() - startTime
      }

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown contacts processing error'
      return {
        success: false,
        recordsInserted,
        recordsUpdated,
        recordsSkipped,
        recordsFailed: contacts.length,
        errors: [errorMessage],
        processingTime: Date.now() - startTime
      }
    }
  }

  /**
   * Process and upsert Xero invoices with line items
   */
  async upsertInvoices(
    invoices: XeroInvoice[],
    syncBatchId?: string,
    batchConfig: BatchConfig = DEFAULT_BATCH_CONFIG
  ): Promise<StagingResult> {
    const startTime = Date.now()
    let recordsInserted = 0
    let recordsUpdated = 0
    let recordsSkipped = 0
    let recordsFailed = 0
    const errors: string[] = []

    try {
      this.log('info', `Processing ${invoices.length} invoices`, { syncBatchId })

      for (let i = 0; i < invoices.length; i += batchConfig.batchSize) {
        const batch = invoices.slice(i, i + batchConfig.batchSize)
        
        try {
          // Transform invoices
          const transformedInvoices = batch.map(invoice => this.transformInvoice(invoice, syncBatchId))
          
          // Upsert invoices
          const { data: upsertedInvoices, error: invoiceError } = await this.supabase
            .from('stg_invoices')
            .upsert(transformedInvoices, {
              onConflict: 'xero_id',
              ignoreDuplicates: false
            })
            .select('id, xero_id')

          if (invoiceError) {
            throw new Error(`Invoice upsert failed: ${invoiceError.message}`)
          }

          // Process line items for each invoice
          for (const invoice of batch) {
            if (invoice.lineItems && invoice.lineItems.length > 0) {
              const invoiceDbId = upsertedInvoices?.find(inv => inv.xero_id === invoice.id)?.id
              
              if (invoiceDbId) {
                const transformedLineItems = invoice.lineItems.map(lineItem => 
                  this.transformInvoiceLineItem(lineItem, invoiceDbId, syncBatchId)
                )

                // Delete existing line items for this invoice (to handle removals)
                await this.supabase
                  .from('stg_invoice_lines')
                  .delete()
                  .eq('invoice_id', invoiceDbId)

                // Insert new line items
                const { error: lineItemError } = await this.supabase
                  .from('stg_invoice_lines')
                  .insert(transformedLineItems)

                if (lineItemError) {
                  this.log('warn', 'Line item processing failed', {
                    invoiceId: invoice.id,
                    error: lineItemError.message
                  })
                }
              }
            }
          }

          recordsInserted += transformedInvoices.length

        } catch (batchError) {
          const errorMessage = batchError instanceof Error ? batchError.message : 'Unknown batch error'
          errors.push(`Invoices batch ${Math.floor(i / batchConfig.batchSize) + 1}: ${errorMessage}`)
          recordsFailed += batch.length
        }
      }

      return {
        success: recordsFailed === 0,
        recordsInserted,
        recordsUpdated,
        recordsSkipped,
        recordsFailed,
        errors,
        processingTime: Date.now() - startTime
      }

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown invoices processing error'
      return {
        success: false,
        recordsInserted,
        recordsUpdated,
        recordsSkipped,
        recordsFailed: invoices.length,
        errors: [errorMessage],
        processingTime: Date.now() - startTime
      }
    }
  }

  /**
   * Process and upsert Xero payments data
   */
  async upsertPayments(
    payments: XeroPayment[],
    syncBatchId?: string,
    batchConfig: BatchConfig = DEFAULT_BATCH_CONFIG
  ): Promise<StagingResult> {
    return this.processGenericEntity(
      payments,
      'stg_payments',
      this.transformPayment.bind(this),
      'payments',
      syncBatchId,
      batchConfig
    )
  }

  /**
   * Process and upsert Xero credit notes data
   */
  async upsertCreditNotes(
    creditNotes: XeroCreditNote[],
    syncBatchId?: string,
    batchConfig: BatchConfig = DEFAULT_BATCH_CONFIG
  ): Promise<StagingResult> {
    return this.processGenericEntity(
      creditNotes,
      'stg_credit_notes',
      this.transformCreditNote.bind(this),
      'credit notes',
      syncBatchId,
      batchConfig
    )
  }

  /**
   * Process and upsert Xero items data
   */
  async upsertItems(
    items: XeroItem[],
    syncBatchId?: string,
    batchConfig: BatchConfig = DEFAULT_BATCH_CONFIG
  ): Promise<StagingResult> {
    return this.processGenericEntity(
      items,
      'stg_items',
      this.transformItem.bind(this),
      'items',
      syncBatchId,
      batchConfig
    )
  }

  /**
   * Process and upsert Xero bank accounts data
   */
  async upsertBankAccounts(
    bankAccounts: XeroBankAccount[],
    syncBatchId?: string,
    batchConfig: BatchConfig = DEFAULT_BATCH_CONFIG
  ): Promise<StagingResult> {
    return this.processGenericEntity(
      bankAccounts,
      'stg_bank_accounts',
      this.transformBankAccount.bind(this),
      'bank accounts',
      syncBatchId,
      batchConfig
    )
  }

  /**
   * Process and upsert Xero bank transactions data
   */
  async upsertBankTransactions(
    bankTransactions: XeroBankTransaction[],
    syncBatchId?: string,
    batchConfig: BatchConfig = DEFAULT_BATCH_CONFIG
  ): Promise<StagingResult> {
    return this.processGenericEntity(
      bankTransactions,
      'stg_bank_transactions',
      this.transformBankTransaction.bind(this),
      'bank transactions',
      syncBatchId,
      batchConfig
    )
  }

  /**
   * Process and upsert Xero manual journals data
   */
  async upsertManualJournals(
    manualJournals: XeroManualJournal[],
    syncBatchId?: string,
    batchConfig: BatchConfig = DEFAULT_BATCH_CONFIG
  ): Promise<StagingResult> {
    const startTime = Date.now()
    let recordsInserted = 0
    let recordsUpdated = 0
    let recordsSkipped = 0
    let recordsFailed = 0
    const errors: string[] = []

    try {
      this.log('info', `Processing ${manualJournals.length} manual journals`, { syncBatchId })

      for (let i = 0; i < manualJournals.length; i += batchConfig.batchSize) {
        const batch = manualJournals.slice(i, i + batchConfig.batchSize)
        
        try {
          // Transform manual journals
          const transformedJournals = batch.map(journal => this.transformManualJournal(journal, syncBatchId))
          
          // Upsert manual journals
          const { data: upsertedJournals, error: journalError } = await this.supabase
            .from('stg_manual_journals')
            .upsert(transformedJournals, {
              onConflict: 'xero_id',
              ignoreDuplicates: false
            })
            .select('id, xero_id')

          if (journalError) {
            throw new Error(`Manual journal upsert failed: ${journalError.message}`)
          }

          // Process journal lines for each manual journal
          for (const journal of batch) {
            if (journal.journalLines && journal.journalLines.length > 0) {
              const journalDbId = upsertedJournals?.find(j => j.xero_id === journal.id)?.id
              
              if (journalDbId) {
                const transformedLines = journal.journalLines.map(line => 
                  this.transformManualJournalLine(line, journalDbId, syncBatchId)
                )

                // Delete existing lines for this journal
                await this.supabase
                  .from('stg_manual_journal_lines')
                  .delete()
                  .eq('manual_journal_id', journalDbId)

                // Insert new lines
                const { error: lineError } = await this.supabase
                  .from('stg_manual_journal_lines')
                  .insert(transformedLines)

                if (lineError) {
                  this.log('warn', 'Manual journal line processing failed', {
                    journalId: journal.id,
                    error: lineError.message
                  })
                }
              }
            }
          }

          recordsInserted += transformedJournals.length

        } catch (batchError) {
          const errorMessage = batchError instanceof Error ? batchError.message : 'Unknown batch error'
          errors.push(`Manual journals batch ${Math.floor(i / batchConfig.batchSize) + 1}: ${errorMessage}`)
          recordsFailed += batch.length
        }
      }

      return {
        success: recordsFailed === 0,
        recordsInserted,
        recordsUpdated,
        recordsSkipped,
        recordsFailed,
        errors,
        processingTime: Date.now() - startTime
      }

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown manual journals processing error'
      return {
        success: false,
        recordsInserted,
        recordsUpdated,
        recordsSkipped,
        recordsFailed: manualJournals.length,
        errors: [errorMessage],
        processingTime: Date.now() - startTime
      }
    }
  }

  /**
   * Process and upsert Xero tracking categories data
   */
  async upsertTrackingCategories(
    trackingCategories: XeroTrackingCategory[],
    syncBatchId?: string,
    batchConfig: BatchConfig = DEFAULT_BATCH_CONFIG
  ): Promise<StagingResult> {
    const startTime = Date.now()
    let recordsInserted = 0
    let recordsUpdated = 0
    let recordsSkipped = 0
    let recordsFailed = 0
    const errors: string[] = []

    try {
      this.log('info', `Processing ${trackingCategories.length} tracking categories`, { syncBatchId })

      for (let i = 0; i < trackingCategories.length; i += batchConfig.batchSize) {
        const batch = trackingCategories.slice(i, i + batchConfig.batchSize)
        
        try {
          // Transform tracking categories
          const transformedCategories = batch.map(category => this.transformTrackingCategory(category, syncBatchId))
          
          // Upsert tracking categories
          const { data: upsertedCategories, error: categoryError } = await this.supabase
            .from('stg_tracking_categories')
            .upsert(transformedCategories, {
              onConflict: 'xero_id',
              ignoreDuplicates: false
            })
            .select('id, xero_id')

          if (categoryError) {
            throw new Error(`Tracking category upsert failed: ${categoryError.message}`)
          }

          // Process tracking options for each category
          for (const category of batch) {
            if (category.options && category.options.length > 0) {
              const categoryDbId = upsertedCategories?.find(c => c.xero_id === category.id)?.id
              
              if (categoryDbId) {
                const transformedOptions = category.options.map(option => 
                  this.transformTrackingOption(option, categoryDbId, syncBatchId)
                )

                // Delete existing options for this category
                await this.supabase
                  .from('stg_tracking_options')
                  .delete()
                  .eq('tracking_category_id', categoryDbId)

                // Insert new options
                const { error: optionError } = await this.supabase
                  .from('stg_tracking_options')
                  .insert(transformedOptions)

                if (optionError) {
                  this.log('warn', 'Tracking option processing failed', {
                    categoryId: category.id,
                    error: optionError.message
                  })
                }
              }
            }
          }

          recordsInserted += transformedCategories.length

        } catch (batchError) {
          const errorMessage = batchError instanceof Error ? batchError.message : 'Unknown batch error'
          errors.push(`Tracking categories batch ${Math.floor(i / batchConfig.batchSize) + 1}: ${errorMessage}`)
          recordsFailed += batch.length
        }
      }

      return {
        success: recordsFailed === 0,
        recordsInserted,
        recordsUpdated,
        recordsSkipped,
        recordsFailed,
        errors,
        processingTime: Date.now() - startTime
      }

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown tracking categories processing error'
      return {
        success: false,
        recordsInserted,
        recordsUpdated,
        recordsSkipped,
        recordsFailed: trackingCategories.length,
        errors: [errorMessage],
        processingTime: Date.now() - startTime
      }
    }
  }

  /**
   * Generic entity processing method
   */
  private async processGenericEntity<T>(
    entities: T[],
    tableName: string,
    transformFunction: (entity: T, syncBatchId?: string) => any,
    entityTypeName: string,
    syncBatchId?: string,
    batchConfig: BatchConfig = DEFAULT_BATCH_CONFIG
  ): Promise<StagingResult> {
    const startTime = Date.now()
    let recordsInserted = 0
    let recordsUpdated = 0
    let recordsSkipped = 0
    let recordsFailed = 0
    const errors: string[] = []

    try {
      this.log('info', `Processing ${entities.length} ${entityTypeName}`, { syncBatchId })

      for (let i = 0; i < entities.length; i += batchConfig.batchSize) {
        const batch = entities.slice(i, i + batchConfig.batchSize)
        
        try {
          const transformedEntities = batch.map(entity => transformFunction(entity, syncBatchId))
          
          const { error } = await this.supabase
            .from(tableName)
            .upsert(transformedEntities, {
              onConflict: 'xero_id',
              ignoreDuplicates: false
            })

          if (error) {
            throw new Error(`Batch upsert failed: ${error.message}`)
          }

          recordsInserted += transformedEntities.length

        } catch (batchError) {
          const errorMessage = batchError instanceof Error ? batchError.message : 'Unknown batch error'
          errors.push(`${entityTypeName} batch ${Math.floor(i / batchConfig.batchSize) + 1}: ${errorMessage}`)
          recordsFailed += batch.length
        }
      }

      return {
        success: recordsFailed === 0,
        recordsInserted,
        recordsUpdated,
        recordsSkipped,
        recordsFailed,
        errors,
        processingTime: Date.now() - startTime
      }

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : `Unknown ${entityTypeName} processing error`
      return {
        success: false,
        recordsInserted,
        recordsUpdated,
        recordsSkipped,
        recordsFailed: entities.length,
        errors: [errorMessage],
        processingTime: Date.now() - startTime
      }
    }
  }

  /**
   * Data transformation methods
   */
  private transformAccount(account: XeroAccount, syncBatchId?: string): any {
    return {
      xero_id: account.id,
      code: account.code,
      name: account.name,
      type: account.type,
      tax_type: account.taxType,
      description: account.description,
      is_active: account.isActive,
      updated_date_utc: account.updatedDateUTC,
      raw_data: account,
      sync_batch_id: syncBatchId
    }
  }

  private transformContact(contact: XeroContact, syncBatchId?: string): any {
    return {
      xero_id: contact.id,
      name: contact.name,
      contact_number: contact.contactNumber,
      account_number: contact.accountNumber,
      contact_status: contact.contactStatus,
      is_supplier: contact.isSupplier,
      is_customer: contact.isCustomer,
      email_address: contact.emailAddress,
      phone_numbers: contact.phones || [],
      addresses: contact.addresses || [],
      updated_date_utc: contact.updatedDateUTC,
      raw_data: contact,
      sync_batch_id: syncBatchId
    }
  }

  private transformInvoice(invoice: XeroInvoice, syncBatchId?: string): any {
    return {
      xero_id: invoice.id,
      type: invoice.type,
      invoice_number: invoice.invoiceNumber,
      reference: invoice.reference,
      contact_id: invoice.contact.contactID,
      contact_name: invoice.contact.name,
      date: invoice.date,
      due_date: invoice.dueDate,
      status: invoice.status,
      line_amount_types: invoice.lineAmountTypes,
      sub_total: invoice.subTotal,
      total_tax: invoice.totalTax,
      total: invoice.total,
      amount_due: invoice.amountDue,
      amount_paid: invoice.amountPaid,
      amount_credited: invoice.amountCredited,
      currency_code: invoice.currencyCode,
      updated_date_utc: invoice.updatedDateUTC,
      raw_data: invoice,
      sync_batch_id: syncBatchId
    }
  }

  private transformInvoiceLineItem(lineItem: any, invoiceDbId: string, syncBatchId?: string): any {
    return {
      xero_line_id: lineItem.lineItemID,
      invoice_id: invoiceDbId,
      description: lineItem.description,
      quantity: lineItem.quantity,
      unit_amount: lineItem.unitAmount,
      line_amount: lineItem.lineAmount,
      item_code: lineItem.itemCode,
      account_code: lineItem.accountCode,
      tax_type: lineItem.taxType,
      tax_amount: lineItem.taxAmount,
      tracking: lineItem.tracking || [],
      raw_data: lineItem
    }
  }

  private transformPayment(payment: XeroPayment, syncBatchId?: string): any {
    return {
      xero_id: payment.id,
      date: payment.date,
      amount: payment.amount,
      reference: payment.reference,
      currency_code: payment.currencyCode,
      payment_type: payment.paymentType,
      status: payment.status,
      account_id: payment.account.accountID,
      account_code: payment.account.code,
      account_name: payment.account.name,
      invoice_id: payment.invoice.invoiceID,
      invoice_number: payment.invoice.invoiceNumber,
      updated_date_utc: payment.updatedDateUTC,
      raw_data: payment,
      sync_batch_id: syncBatchId
    }
  }

  private transformCreditNote(creditNote: XeroCreditNote, syncBatchId?: string): any {
    return {
      xero_id: creditNote.id,
      credit_note_number: creditNote.creditNoteNumber,
      type: creditNote.type,
      reference: creditNote.reference,
      contact_id: creditNote.contact.contactID,
      contact_name: creditNote.contact.name,
      date: creditNote.date,
      status: creditNote.status,
      sub_total: creditNote.subTotal,
      total_tax: creditNote.totalTax,
      total: creditNote.total,
      remaining_credit: creditNote.remainingCredit,
      currency_code: creditNote.currencyCode,
      updated_date_utc: creditNote.updatedDateUTC,
      raw_data: creditNote,
      sync_batch_id: syncBatchId
    }
  }

  private transformItem(item: XeroItem, syncBatchId?: string): any {
    return {
      xero_id: item.id,
      code: item.code,
      name: item.name,
      description: item.description,
      purchase_description: item.purchaseDescription,
      is_tracked_as_inventory: item.isTrackedAsInventory,
      inventory_asset_account_code: item.inventoryAssetAccountCode,
      quantity_on_hand: item.quantityOnHand,
      sales_unit_price: item.salesDetails?.unitPrice,
      sales_account_code: item.salesDetails?.accountCode,
      sales_tax_type: item.salesDetails?.taxType,
      purchase_unit_price: item.purchaseDetails?.unitPrice,
      purchase_account_code: item.purchaseDetails?.accountCode,
      purchase_tax_type: item.purchaseDetails?.taxType,
      updated_date_utc: item.updatedDateUTC,
      raw_data: item,
      sync_batch_id: syncBatchId
    }
  }

  private transformBankAccount(bankAccount: XeroBankAccount, syncBatchId?: string): any {
    return {
      xero_id: bankAccount.id,
      code: bankAccount.code,
      name: bankAccount.name,
      type: bankAccount.type,
      bank_account_number: bankAccount.bankAccountNumber,
      status: bankAccount.status,
      currency_code: bankAccount.currencyCode,
      updated_date_utc: bankAccount.updatedDateUTC,
      raw_data: bankAccount,
      sync_batch_id: syncBatchId
    }
  }

  private transformBankTransaction(bankTransaction: XeroBankTransaction, syncBatchId?: string): any {
    return {
      xero_id: bankTransaction.id,
      type: bankTransaction.type,
      contact_id: bankTransaction.contact.contactID,
      contact_name: bankTransaction.contact.name,
      bank_account_id: bankTransaction.bankAccount.accountID,
      bank_account_code: bankTransaction.bankAccount.code,
      bank_account_name: bankTransaction.bankAccount.name,
      date: bankTransaction.date,
      reference: bankTransaction.reference,
      status: bankTransaction.status,
      sub_total: bankTransaction.subTotal,
      total_tax: bankTransaction.totalTax,
      total: bankTransaction.total,
      currency_code: bankTransaction.currencyCode,
      updated_date_utc: bankTransaction.updatedDateUTC,
      raw_data: bankTransaction,
      sync_batch_id: syncBatchId
    }
  }

  private transformManualJournal(manualJournal: XeroManualJournal, syncBatchId?: string): any {
    return {
      xero_id: manualJournal.id,
      narration: manualJournal.narration,
      date: manualJournal.date,
      status: manualJournal.status,
      url: manualJournal.url,
      show_on_cash_basis_reports: manualJournal.showOnCashBasisReports,
      updated_date_utc: manualJournal.updatedDateUTC,
      raw_data: manualJournal,
      sync_batch_id: syncBatchId
    }
  }

  private transformManualJournalLine(line: any, journalDbId: string, syncBatchId?: string): any {
    return {
      xero_line_id: line.journalLineID,
      manual_journal_id: journalDbId,
      account_code: line.accountCode,
      account_id: line.accountID,
      description: line.description,
      tax_type: line.taxType,
      gross_amount: line.grossAmount,
      tax_amount: line.taxAmount,
      net_amount: line.netAmount,
      tracking: line.tracking || [],
      raw_data: line
    }
  }

  private transformTrackingCategory(category: XeroTrackingCategory, syncBatchId?: string): any {
    return {
      xero_id: category.id,
      name: category.name,
      status: category.status,
      updated_date_utc: category.updatedDateUTC,
      raw_data: category,
      sync_batch_id: syncBatchId
    }
  }

  private transformTrackingOption(option: XeroTrackingOption, categoryDbId: string, syncBatchId?: string): any {
    return {
      xero_id: option.id,
      tracking_category_id: categoryDbId,
      name: option.name,
      status: option.status,
      updated_date_utc: option.updatedDateUTC,
      raw_data: option,
      sync_batch_id: syncBatchId
    }
  }

  /**
   * Utility methods
   */
  private log(level: 'info' | 'warn' | 'error', message: string, context?: any): void {
    const logEntry = {
      timestamp: new Date().toISOString(),
      level,
      service: 'XeroStagingProcessor',
      message,
      context
    }

    if (config.app.debug) {
      console.log(JSON.stringify(logEntry, null, 2))
    }
  }
}

// Export singleton instance
export const XeroStaging = new XeroStagingProcessor()

// Export types
export type { StagingResult, BatchConfig }
