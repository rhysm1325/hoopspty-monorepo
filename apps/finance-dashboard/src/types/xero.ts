// Xero API types and interfaces

export interface XeroConnection {
  tenantId: string
  tenantName: string
  isConnected: boolean
  lastSyncDate?: Date
  accessTokenExpiry?: Date
}

// Base Xero entity
export interface XeroEntity {
  id: string
  updatedDateUTC: Date
}

// Xero Account
export interface XeroAccount extends XeroEntity {
  code: string
  name: string
  type: string
  taxType?: string
  description?: string
  isActive: boolean
}

// Xero Contact
export interface XeroContact extends XeroEntity {
  name: string
  contactNumber?: string
  accountNumber?: string
  contactStatus: 'ACTIVE' | 'ARCHIVED' | 'GDPRREQUEST'
  isSupplier: boolean
  isCustomer: boolean
  emailAddress?: string
  phones?: XeroPhone[]
  addresses?: XeroAddress[]
}

export interface XeroPhone {
  phoneType: 'DEFAULT' | 'DDI' | 'MOBILE' | 'FAX'
  phoneNumber: string
  phoneAreaCode?: string
  phoneCountryCode?: string
}

export interface XeroAddress {
  addressType: 'POBOX' | 'STREET'
  addressLine1?: string
  addressLine2?: string
  city?: string
  region?: string
  postalCode?: string
  country?: string
}

// Xero Invoice/Bill
export interface XeroInvoice extends XeroEntity {
  type: 'ACCREC' | 'ACCPAY' // ACCREC = Sales Invoice, ACCPAY = Bill
  invoiceNumber?: string
  reference?: string
  contact: {
    contactID: string
    name: string
  }
  date: Date
  dueDate: Date
  status: 'DRAFT' | 'SUBMITTED' | 'AUTHORISED' | 'PAID' | 'VOIDED'
  lineAmountTypes: 'EXCLUSIVE' | 'INCLUSIVE' | 'NOTAX'
  subTotal: number
  totalTax: number
  total: number
  amountDue: number
  amountPaid: number
  amountCredited: number
  currencyCode: 'AUD'
  lineItems: XeroLineItem[]
  payments?: XeroPayment[]
}

export interface XeroLineItem {
  lineItemID?: string
  description: string
  quantity: number
  unitAmount: number
  itemCode?: string
  accountCode: string
  taxType?: string
  taxAmount?: number
  lineAmount: number
  tracking?: XeroTracking[]
}

export interface XeroTracking {
  trackingCategoryID: string
  trackingOptionID: string
  name: string
  option: string
}

// Xero Payment
export interface XeroPayment extends XeroEntity {
  paymentID: string
  date: Date
  amount: number
  reference?: string
  currencyCode: 'AUD'
  paymentType: 'ACCRECPAYMENT' | 'ACCPAYPAYMENT'
  status: 'AUTHORISED' | 'DELETED'
  account: {
    accountID: string
    code: string
    name: string
  }
  invoice: {
    invoiceID: string
    invoiceNumber: string
  }
}

// Xero Credit Note
export interface XeroCreditNote extends XeroEntity {
  creditNoteID: string
  creditNoteNumber?: string
  type: 'ACCRECCREDIT' | 'ACCPAYCREDIT'
  reference?: string
  contact: {
    contactID: string
    name: string
  }
  date: Date
  status: 'DRAFT' | 'SUBMITTED' | 'AUTHORISED' | 'PAID' | 'VOIDED'
  subTotal: number
  totalTax: number
  total: number
  remainingCredit: number
  currencyCode: 'AUD'
  lineItems: XeroLineItem[]
}

// Xero Item
export interface XeroItem extends XeroEntity {
  itemID: string
  code: string
  name: string
  description?: string
  purchaseDescription?: string
  isTrackedAsInventory: boolean
  inventoryAssetAccountCode?: string
  quantityOnHand?: number
  salesDetails?: {
    unitPrice: number
    accountCode: string
    taxType?: string
  }
  purchaseDetails?: {
    unitPrice: number
    accountCode: string
    taxType?: string
  }
}

// Xero Bank Account
export interface XeroBankAccount extends XeroEntity {
  accountID: string
  code: string
  name: string
  type: string
  bankAccountNumber?: string
  status: 'ACTIVE' | 'ARCHIVED'
  currencyCode: 'AUD'
}

// Xero Bank Transaction
export interface XeroBankTransaction extends XeroEntity {
  bankTransactionID: string
  type: 'RECEIVE' | 'SPEND'
  contact: {
    contactID: string
    name: string
  }
  bankAccount: {
    accountID: string
    code: string
    name: string
  }
  date: Date
  reference?: string
  status: 'AUTHORISED' | 'DELETED'
  subTotal: number
  totalTax: number
  total: number
  currencyCode: 'AUD'
  lineItems: XeroLineItem[]
}

// Xero Manual Journal
export interface XeroManualJournal extends XeroEntity {
  manualJournalID: string
  narration: string
  date: Date
  status: 'DRAFT' | 'POSTED' | 'DELETED' | 'VOIDED'
  url?: string
  showOnCashBasisReports?: boolean
  journalLines: XeroJournalLine[]
}

export interface XeroJournalLine {
  journalLineID?: string
  accountCode: string
  accountID?: string
  description?: string
  taxType?: string
  grossAmount: number
  taxAmount?: number
  netAmount: number
  tracking?: XeroTracking[]
}

// Xero Tracking Categories
export interface XeroTrackingCategory extends XeroEntity {
  trackingCategoryID: string
  name: string
  status: 'ACTIVE' | 'ARCHIVED'
  options?: XeroTrackingOption[]
}

export interface XeroTrackingOption extends XeroEntity {
  trackingOptionID: string
  name: string
  status: 'ACTIVE' | 'ARCHIVED'
}

// Xero Reports
export interface XeroReportResponse {
  reportID: string
  reportName: string
  reportType: string
  reportTitles: string[]
  reportDate: string
  updatedDateUTC: Date
  rows: XeroReportRow[]
}

export interface XeroReportRow {
  rowType: 'Header' | 'Section' | 'Row' | 'SummaryRow'
  title?: string
  cells: XeroReportCell[]
  rows?: XeroReportRow[]
}

export interface XeroReportCell {
  value: string
  attributes?: XeroReportCellAttribute[]
}

export interface XeroReportCellAttribute {
  value: string
  id: string
}

// Sync checkpoint tracking
export interface XeroSyncCheckpoint {
  entityType: string
  lastUpdatedUTC: Date
  recordsProcessed: number
  hasMoreRecords: boolean
}

// API Error responses
export interface XeroApiError {
  type: string
  title: string
  status: number
  detail: string
  instance?: string
  elements?: XeroValidationError[]
}

export interface XeroValidationError {
  message: string
  element: string
}
