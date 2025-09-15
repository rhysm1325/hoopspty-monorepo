// Database utilities for Xero staging data

import { createServiceRoleClient } from '@/lib/supabase/server'
import type { Json } from '@/types/database'

export interface StagingInsertResult {
  success: boolean
  recordsInserted: number
  recordsUpdated: number
  error?: string
}

export interface StagingQueryOptions {
  limit?: number
  offset?: number
  orderBy?: string
  orderDirection?: 'asc' | 'desc'
  filters?: Record<string, any>
}

/**
 * Upsert Xero accounts data
 */
export async function upsertAccounts(
  accounts: any[]
): Promise<StagingInsertResult> {
  try {
    const supabase = createServiceRoleClient()
    const syncBatchId = crypto.randomUUID()

    const stagingData = accounts.map(account => ({
      xero_id: account.AccountID,
      code: account.Code,
      name: account.Name,
      type: account.Type,
      tax_type: account.TaxType,
      description: account.Description,
      is_active: account.Status === 'ACTIVE',
      updated_date_utc: account.UpdatedDateUTC,
      raw_data: account,
      sync_batch_id: syncBatchId,
    }))

    const { data, error } = await supabase
      .from('stg_accounts')
      .upsert(stagingData, {
        onConflict: 'xero_id',
        ignoreDuplicates: false,
      })
      .select('id')

    if (error) {
      return {
        success: false,
        recordsInserted: 0,
        recordsUpdated: 0,
        error: error.message,
      }
    }

    return {
      success: true,
      recordsInserted: data?.length || 0,
      recordsUpdated: 0, // Upsert doesn't distinguish
    }
  } catch (error) {
    return {
      success: false,
      recordsInserted: 0,
      recordsUpdated: 0,
      error:
        error instanceof Error ? error.message : 'Failed to upsert accounts',
    }
  }
}

/**
 * Upsert Xero contacts data
 */
export async function upsertContacts(
  contacts: any[]
): Promise<StagingInsertResult> {
  try {
    const supabase = createServiceRoleClient()
    const syncBatchId = crypto.randomUUID()

    const stagingData = contacts.map(contact => ({
      xero_id: contact.ContactID,
      name: contact.Name,
      contact_number: contact.ContactNumber,
      account_number: contact.AccountNumber,
      contact_status: contact.ContactStatus,
      is_supplier: contact.IsSupplier,
      is_customer: contact.IsCustomer,
      email_address: contact.EmailAddress,
      phone_numbers: contact.Phones || [],
      addresses: contact.Addresses || [],
      updated_date_utc: contact.UpdatedDateUTC,
      raw_data: contact,
      sync_batch_id: syncBatchId,
    }))

    const { data, error } = await supabase
      .from('stg_contacts')
      .upsert(stagingData, {
        onConflict: 'xero_id',
        ignoreDuplicates: false,
      })
      .select('id')

    if (error) {
      return {
        success: false,
        recordsInserted: 0,
        recordsUpdated: 0,
        error: error.message,
      }
    }

    return {
      success: true,
      recordsInserted: data?.length || 0,
      recordsUpdated: 0,
    }
  } catch (error) {
    return {
      success: false,
      recordsInserted: 0,
      recordsUpdated: 0,
      error:
        error instanceof Error ? error.message : 'Failed to upsert contacts',
    }
  }
}

/**
 * Upsert Xero invoices data with line items
 */
export async function upsertInvoices(
  invoices: any[]
): Promise<StagingInsertResult> {
  try {
    const supabase = createServiceRoleClient()
    const syncBatchId = crypto.randomUUID()

    let totalRecords = 0

    for (const invoice of invoices) {
      // Insert/update invoice header
      const invoiceData = {
        xero_id: invoice.InvoiceID,
        type: invoice.Type,
        invoice_number: invoice.InvoiceNumber,
        reference: invoice.Reference,
        contact_id: invoice.Contact?.ContactID,
        contact_name: invoice.Contact?.Name,
        date: invoice.Date,
        due_date: invoice.DueDate,
        status: invoice.Status,
        line_amount_types: invoice.LineAmountTypes,
        sub_total: parseFloat(invoice.SubTotal || '0'),
        total_tax: parseFloat(invoice.TotalTax || '0'),
        total: parseFloat(invoice.Total || '0'),
        amount_due: parseFloat(invoice.AmountDue || '0'),
        amount_paid: parseFloat(invoice.AmountPaid || '0'),
        amount_credited: parseFloat(invoice.AmountCredited || '0'),
        currency_code: invoice.CurrencyCode || 'AUD',
        updated_date_utc: invoice.UpdatedDateUTC,
        raw_data: invoice,
        sync_batch_id: syncBatchId,
      }

      const { data: invoiceResult, error: invoiceError } = await supabase
        .from('stg_invoices')
        .upsert(invoiceData, {
          onConflict: 'xero_id',
          ignoreDuplicates: false,
        })
        .select('id')
        .single()

      if (invoiceError) {
        throw new Error(
          `Failed to upsert invoice ${invoice.InvoiceNumber}: ${invoiceError.message}`
        )
      }

      totalRecords++

      // Insert/update line items
      if (invoice.LineItems && invoice.LineItems.length > 0) {
        // Delete existing line items for this invoice
        await supabase
          .from('stg_invoice_lines')
          .delete()
          .eq('invoice_id', invoiceResult.id)

        const lineItemsData = invoice.LineItems.map((line: any) => ({
          xero_line_id: line.LineItemID,
          invoice_id: invoiceResult.id,
          description: line.Description,
          quantity: parseFloat(line.Quantity || '1'),
          unit_amount: parseFloat(line.UnitAmount || '0'),
          line_amount: parseFloat(line.LineAmount || '0'),
          item_code: line.ItemCode,
          account_code: line.AccountCode,
          tax_type: line.TaxType,
          tax_amount: parseFloat(line.TaxAmount || '0'),
          tracking: line.Tracking || [],
          raw_data: line,
        }))

        const { error: linesError } = await supabase
          .from('stg_invoice_lines')
          .insert(lineItemsData)

        if (linesError) {
          console.error(
            `Failed to insert line items for invoice ${invoice.InvoiceNumber}:`,
            linesError
          )
        }
      }
    }

    return {
      success: true,
      recordsInserted: totalRecords,
      recordsUpdated: 0,
    }
  } catch (error) {
    return {
      success: false,
      recordsInserted: 0,
      recordsUpdated: 0,
      error:
        error instanceof Error ? error.message : 'Failed to upsert invoices',
    }
  }
}

/**
 * Upsert Xero payments data
 */
export async function upsertPayments(
  payments: any[]
): Promise<StagingInsertResult> {
  try {
    const supabase = createServiceRoleClient()
    const syncBatchId = crypto.randomUUID()

    const stagingData = payments.map(payment => ({
      xero_id: payment.PaymentID,
      date: payment.Date,
      amount: parseFloat(payment.Amount || '0'),
      reference: payment.Reference,
      currency_code: payment.CurrencyCode || 'AUD',
      payment_type: payment.PaymentType,
      status: payment.Status,
      account_id: payment.Account?.AccountID,
      account_code: payment.Account?.Code,
      account_name: payment.Account?.Name,
      invoice_id: payment.Invoice?.InvoiceID,
      invoice_number: payment.Invoice?.InvoiceNumber,
      updated_date_utc: payment.UpdatedDateUTC,
      raw_data: payment,
      sync_batch_id: syncBatchId,
    }))

    const { data, error } = await supabase
      .from('stg_payments')
      .upsert(stagingData, {
        onConflict: 'xero_id',
        ignoreDuplicates: false,
      })
      .select('id')

    if (error) {
      return {
        success: false,
        recordsInserted: 0,
        recordsUpdated: 0,
        error: error.message,
      }
    }

    return {
      success: true,
      recordsInserted: data?.length || 0,
      recordsUpdated: 0,
    }
  } catch (error) {
    return {
      success: false,
      recordsInserted: 0,
      recordsUpdated: 0,
      error:
        error instanceof Error ? error.message : 'Failed to upsert payments',
    }
  }
}

/**
 * Upsert Xero items data
 */
export async function upsertItems(items: any[]): Promise<StagingInsertResult> {
  try {
    const supabase = createServiceRoleClient()
    const syncBatchId = crypto.randomUUID()

    const stagingData = items.map(item => ({
      xero_id: item.ItemID,
      code: item.Code,
      name: item.Name,
      description: item.Description,
      purchase_description: item.PurchaseDescription,
      is_tracked_as_inventory: item.IsTrackedAsInventory || false,
      inventory_asset_account_code: item.InventoryAssetAccountCode,
      quantity_on_hand: parseFloat(item.QuantityOnHand || '0'),
      sales_unit_price: parseFloat(item.SalesDetails?.UnitPrice || '0'),
      sales_account_code: item.SalesDetails?.AccountCode,
      sales_tax_type: item.SalesDetails?.TaxType,
      purchase_unit_price: parseFloat(item.PurchaseDetails?.UnitPrice || '0'),
      purchase_account_code: item.PurchaseDetails?.AccountCode,
      purchase_tax_type: item.PurchaseDetails?.TaxType,
      updated_date_utc: item.UpdatedDateUTC,
      raw_data: item,
      sync_batch_id: syncBatchId,
    }))

    const { data, error } = await supabase
      .from('stg_items')
      .upsert(stagingData, {
        onConflict: 'xero_id',
        ignoreDuplicates: false,
      })
      .select('id')

    if (error) {
      return {
        success: false,
        recordsInserted: 0,
        recordsUpdated: 0,
        error: error.message,
      }
    }

    return {
      success: true,
      recordsInserted: data?.length || 0,
      recordsUpdated: 0,
    }
  } catch (error) {
    return {
      success: false,
      recordsInserted: 0,
      recordsUpdated: 0,
      error: error instanceof Error ? error.message : 'Failed to upsert items',
    }
  }
}

/**
 * Get staging data count by table
 */
export async function getStagingDataCounts(): Promise<{
  counts: Record<string, number>
  error?: string
}> {
  try {
    const supabase = createServiceRoleClient()

    const tables = [
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

    const counts: Record<string, number> = {}

    for (const table of tables) {
      const { count, error } = await supabase
        .from(table)
        .select('*', { count: 'exact', head: true })

      if (error) {
        console.error(`Error counting ${table}:`, error)
        counts[table] = 0
      } else {
        counts[table] = count || 0
      }
    }

    return { counts }
  } catch (error) {
    return {
      counts: {},
      error:
        error instanceof Error ? error.message : 'Failed to get staging counts',
    }
  }
}

/**
 * Clean up old staging data (for performance)
 */
export async function cleanupOldStagingData(
  retentionDays: number = 30
): Promise<{
  success: boolean
  deletedCounts: Record<string, number>
  error?: string
}> {
  try {
    const supabase = createServiceRoleClient()
    const cutoffDate = new Date()
    cutoffDate.setDate(cutoffDate.getDate() - retentionDays)

    const tables = [
      'stg_accounts',
      'stg_contacts',
      'stg_invoices', // This will cascade to invoice_lines
      'stg_payments',
      'stg_credit_notes',
      'stg_items',
      'stg_bank_accounts',
      'stg_bank_transactions',
      'stg_manual_journals', // This will cascade to journal_lines
      'stg_tracking_categories', // This will cascade to tracking_options
    ]

    const deletedCounts: Record<string, number> = {}

    for (const table of tables) {
      const { count, error } = await supabase
        .from(table)
        .delete()
        .lt('created_at', cutoffDate.toISOString())

      if (error) {
        console.error(`Error cleaning up ${table}:`, error)
        deletedCounts[table] = 0
      } else {
        deletedCounts[table] = count || 0
      }
    }

    return { success: true, deletedCounts }
  } catch (error) {
    return {
      success: false,
      deletedCounts: {},
      error:
        error instanceof Error
          ? error.message
          : 'Failed to cleanup staging data',
    }
  }
}

/**
 * Get AR (Accounts Receivable) summary from staging
 */
export async function getARSummary(): Promise<{
  totalOutstanding: number
  invoiceCount: number
  oldestInvoiceDate: Date | null
  error?: string
}> {
  try {
    const supabase = createServiceRoleClient()

    const { data, error } = await supabase
      .from('stg_ar_invoices')
      .select('amount_due, date')
      .gt('amount_due', 0)

    if (error) {
      return {
        totalOutstanding: 0,
        invoiceCount: 0,
        oldestInvoiceDate: null,
        error: error.message,
      }
    }

    const totalOutstanding =
      data?.reduce(
        (sum, inv) => sum + parseFloat(inv.amount_due.toString()),
        0
      ) || 0
    const invoiceCount = data?.length || 0
    const oldestInvoiceDate =
      data?.length > 0
        ? new Date(Math.min(...data.map(inv => new Date(inv.date).getTime())))
        : null

    return { totalOutstanding, invoiceCount, oldestInvoiceDate }
  } catch (error) {
    return {
      totalOutstanding: 0,
      invoiceCount: 0,
      oldestInvoiceDate: null,
      error:
        error instanceof Error ? error.message : 'Failed to get AR summary',
    }
  }
}

/**
 * Get AP (Accounts Payable) summary from staging
 */
export async function getAPSummary(): Promise<{
  totalOutstanding: number
  billCount: number
  oldestBillDate: Date | null
  error?: string
}> {
  try {
    const supabase = createServiceRoleClient()

    const { data, error } = await supabase
      .from('stg_ap_bills')
      .select('amount_due, date')
      .gt('amount_due', 0)

    if (error) {
      return {
        totalOutstanding: 0,
        billCount: 0,
        oldestBillDate: null,
        error: error.message,
      }
    }

    const totalOutstanding =
      data?.reduce(
        (sum, bill) => sum + parseFloat(bill.amount_due.toString()),
        0
      ) || 0
    const billCount = data?.length || 0
    const oldestBillDate =
      data?.length > 0
        ? new Date(Math.min(...data.map(bill => new Date(bill.date).getTime())))
        : null

    return { totalOutstanding, billCount, oldestBillDate }
  } catch (error) {
    return {
      totalOutstanding: 0,
      billCount: 0,
      oldestBillDate: null,
      error:
        error instanceof Error ? error.message : 'Failed to get AP summary',
    }
  }
}

/**
 * Get revenue by account code from staging
 */
export async function getRevenueByAccount(
  startDate?: Date,
  endDate?: Date
): Promise<{
  revenue: Array<{
    accountCode: string
    accountName: string
    totalAmount: number
    lineCount: number
  }>
  error?: string
}> {
  try {
    const supabase = createServiceRoleClient()

    let query = supabase
      .from('stg_revenue_by_account')
      .select('*')
      .order('total_amount', { ascending: false })

    if (startDate) {
      query = query.gte('earliest_date', startDate.toISOString().split('T')[0])
    }

    if (endDate) {
      query = query.lte('latest_date', endDate.toISOString().split('T')[0])
    }

    const { data, error } = await query

    if (error) {
      return { revenue: [], error: error.message }
    }

    const revenue = (data || []).map(row => ({
      accountCode: row.account_code,
      accountName: row.account_name,
      totalAmount: parseFloat(row.total_amount.toString()),
      lineCount: row.line_count,
    }))

    return { revenue }
  } catch (error) {
    return {
      revenue: [],
      error:
        error instanceof Error
          ? error.message
          : 'Failed to get revenue by account',
    }
  }
}

/**
 * Get sync batch information
 */
export async function getSyncBatchInfo(batchId: string): Promise<{
  info: {
    batchId: string
    recordCount: number
    tables: string[]
    createdAt: Date
  } | null
  error?: string
}> {
  try {
    const supabase = createServiceRoleClient()

    // This is a simplified version - in a full implementation,
    // you'd query multiple staging tables to get complete batch info
    const { data, error } = await supabase
      .from('stg_invoices')
      .select('created_at')
      .eq('sync_batch_id', batchId)
      .limit(1)

    if (error || !data || data.length === 0) {
      return { info: null, error: error?.message || 'Batch not found' }
    }

    // Simplified batch info
    return {
      info: {
        batchId,
        recordCount: 1, // Would be calculated across all tables
        tables: ['invoices'], // Would be determined by querying all staging tables
        createdAt: new Date(data[0].created_at),
      },
    }
  } catch (error) {
    return {
      info: null,
      error:
        error instanceof Error
          ? error.message
          : 'Failed to get sync batch info',
    }
  }
}
