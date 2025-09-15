'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { DataTable } from '@/components/ui/data-table'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Users,
  AlertTriangle,
  Phone,
  Mail,
  MessageSquare,
  Eye,
  Download,
  RefreshCw,
  MoreHorizontal,
  Calendar,
  DollarSign,
  Clock,
  Send,
  FileText,
  Building,
  MapPin,
} from 'lucide-react'
import { formatCurrency, formatAustralianDate } from '@/utils/financial'
import type { RevenueStream } from '@/types'

interface OverdueCustomer {
  id: string
  name: string
  contactNumber?: string
  email?: string
  phone?: string
  totalOutstanding: number
  oldestInvoiceDays: number
  invoiceCount: number
  revenueStream: RevenueStream
  riskLevel: 'low' | 'medium' | 'high'
  lastContactDate?: Date
  lastPaymentDate?: Date
  paymentTerms: string
  creditLimit?: number
  address?: {
    line1?: string
    city?: string
    state?: string
    postcode?: string
  }
  invoices: Array<{
    id: string
    number: string
    date: Date
    dueDate: Date
    amount: number
    outstanding: number
    daysPastDue: number
    status: string
  }>
  contactHistory: Array<{
    id: string
    date: Date
    type: 'email' | 'phone' | 'letter' | 'meeting'
    subject: string
    notes?: string
    followUpRequired: boolean
    followUpDate?: Date
  }>
}

interface OverdueCustomersTableProps {
  maxRows?: number
  showContactActions?: boolean
  className?: string
}

export function OverdueCustomersTable({ 
  maxRows = 50, 
  showContactActions = true,
  className 
}: OverdueCustomersTableProps) {
  const [customers, setCustomers] = useState<OverdueCustomer[]>([])
  const [filteredCustomers, setFilteredCustomers] = useState<OverdueCustomer[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedCustomer, setSelectedCustomer] = useState<OverdueCustomer | null>(null)
  const [isContactDialogOpen, setIsContactDialogOpen] = useState(false)
  
  // Filters
  const [searchTerm, setSearchTerm] = useState('')
  const [riskFilter, setRiskFilter] = useState<'all' | 'low' | 'medium' | 'high'>('all')
  const [streamFilter, setStreamFilter] = useState<RevenueStream | 'all'>('all')
  const [daysPastDueFilter, setDaysPastDueFilter] = useState<'all' | '30' | '60' | '90'>('all')

  useEffect(() => {
    loadOverdueCustomers()
  }, [])

  useEffect(() => {
    applyFilters()
  }, [customers, searchTerm, riskFilter, streamFilter, daysPastDueFilter])

  const loadOverdueCustomers = async () => {
    setIsLoading(true)
    setError(null)

    try {
      // In real implementation, this would call the overdue customers server action
      // For now, simulate with sample data
      await new Promise(resolve => setTimeout(resolve, 800))

      const sampleCustomers: OverdueCustomer[] = [
        {
          id: 'cust1',
          name: 'Melbourne Basketball Academy',
          contactNumber: 'CUST001',
          email: 'accounts@melbournebasketball.com.au',
          phone: '+61 3 9876 5432',
          totalOutstanding: 15600,
          oldestInvoiceDays: 67,
          invoiceCount: 3,
          revenueStream: 'tours',
          riskLevel: 'high',
          lastContactDate: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000), // 2 weeks ago
          lastPaymentDate: new Date(Date.now() - 45 * 24 * 60 * 60 * 1000), // 45 days ago
          paymentTerms: 'Net 30',
          creditLimit: 25000,
          address: {
            line1: '123 Basketball Court',
            city: 'Melbourne',
            state: 'VIC',
            postcode: '3000',
          },
          invoices: [
            {
              id: 'inv1',
              number: 'INV-2024-001',
              date: new Date('2024-07-15'),
              dueDate: new Date('2024-08-14'),
              amount: 5200,
              outstanding: 5200,
              daysPastDue: 67,
              status: 'AUTHORISED',
            },
            {
              id: 'inv2',
              number: 'INV-2024-015',
              date: new Date('2024-08-01'),
              dueDate: new Date('2024-08-31'),
              amount: 6800,
              outstanding: 6800,
              daysPastDue: 51,
              status: 'AUTHORISED',
            },
            {
              id: 'inv3',
              number: 'INV-2024-028',
              date: new Date('2024-08-15'),
              dueDate: new Date('2024-09-14'),
              amount: 3600,
              outstanding: 3600,
              daysPastDue: 37,
              status: 'AUTHORISED',
            },
          ],
          contactHistory: [
            {
              id: 'contact1',
              date: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000),
              type: 'email',
              subject: 'Payment Reminder - Overdue Invoices',
              notes: 'Sent payment reminder for invoices INV-2024-001 and INV-2024-015',
              followUpRequired: true,
              followUpDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
            },
          ],
        },
        {
          id: 'cust2',
          name: 'Sydney Sports Tours',
          contactNumber: 'CUST002',
          email: 'finance@sydneysports.com.au',
          phone: '+61 2 8765 4321',
          totalOutstanding: 8950,
          oldestInvoiceDays: 45,
          invoiceCount: 2,
          revenueStream: 'tours',
          riskLevel: 'medium',
          lastContactDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
          lastPaymentDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
          paymentTerms: 'Net 30',
          creditLimit: 15000,
          address: {
            line1: '456 Sports Avenue',
            city: 'Sydney',
            state: 'NSW',
            postcode: '2000',
          },
          invoices: [
            {
              id: 'inv4',
              number: 'INV-2024-012',
              date: new Date('2024-08-05'),
              dueDate: new Date('2024-09-04'),
              amount: 4950,
              outstanding: 4950,
              daysPastDue: 45,
              status: 'AUTHORISED',
            },
            {
              id: 'inv5',
              number: 'INV-2024-020',
              date: new Date('2024-08-20'),
              dueDate: new Date('2024-09-19'),
              amount: 4000,
              outstanding: 4000,
              daysPastDue: 30,
              status: 'AUTHORISED',
            },
          ],
          contactHistory: [
            {
              id: 'contact2',
              date: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
              type: 'phone',
              subject: 'Payment Follow-up Call',
              notes: 'Spoke with accounts manager, payment promised by end of week',
              followUpRequired: true,
              followUpDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
            },
          ],
        },
        {
          id: 'cust3',
          name: 'Adelaide Basketball Club',
          contactNumber: 'CUST003',
          email: 'admin@adelaidebasketball.org.au',
          phone: '+61 8 7654 3210',
          totalOutstanding: 12300,
          oldestInvoiceDays: 52,
          invoiceCount: 1,
          revenueStream: 'dr-dish',
          riskLevel: 'medium',
          lastContactDate: new Date(Date.now() - 21 * 24 * 60 * 60 * 1000),
          lastPaymentDate: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000),
          paymentTerms: 'Net 30',
          creditLimit: 20000,
          address: {
            line1: '789 Club Street',
            city: 'Adelaide',
            state: 'SA',
            postcode: '5000',
          },
          invoices: [
            {
              id: 'inv6',
              number: 'INV-2024-008',
              date: new Date('2024-07-28'),
              dueDate: new Date('2024-08-27'),
              amount: 12300,
              outstanding: 12300,
              daysPastDue: 52,
              status: 'AUTHORISED',
            },
          ],
          contactHistory: [
            {
              id: 'contact3',
              date: new Date(Date.now() - 21 * 24 * 60 * 60 * 1000),
              type: 'email',
              subject: 'Invoice Overdue Notice',
              notes: 'Sent overdue notice for INV-2024-008',
              followUpRequired: true,
              followUpDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // Overdue follow-up
            },
          ],
        },
      ]

      setCustomers(sampleCustomers)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load overdue customers')
    } finally {
      setIsLoading(false)
    }
  }

  const applyFilters = () => {
    let filtered = customers

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(customer =>
        customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        customer.contactNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        customer.email?.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }

    // Risk level filter
    if (riskFilter !== 'all') {
      filtered = filtered.filter(customer => customer.riskLevel === riskFilter)
    }

    // Revenue stream filter
    if (streamFilter !== 'all') {
      filtered = filtered.filter(customer => customer.revenueStream === streamFilter)
    }

    // Days past due filter
    if (daysPastDueFilter !== 'all') {
      const daysThreshold = parseInt(daysPastDueFilter)
      filtered = filtered.filter(customer => customer.oldestInvoiceDays >= daysThreshold)
    }

    setFilteredCustomers(filtered)
  }

  const handleRefresh = () => {
    loadOverdueCustomers()
  }

  const handleContactCustomer = (customer: OverdueCustomer, method: 'email' | 'phone' | 'letter') => {
    setSelectedCustomer(customer)
    setIsContactDialogOpen(true)
    
    // In real implementation, would integrate with email/phone systems
    console.log(`Contact ${customer.name} via ${method}`)
  }

  const getRiskBadgeColor = (riskLevel: 'low' | 'medium' | 'high') => {
    switch (riskLevel) {
      case 'high': return 'destructive'
      case 'medium': return 'secondary'
      case 'low': return 'outline'
      default: return 'outline'
    }
  }

  const getStreamBadgeColor = (stream: RevenueStream) => {
    switch (stream) {
      case 'tours': return 'bg-green-100 text-green-800'
      case 'dr-dish': return 'bg-blue-100 text-blue-800'
      case 'marketing': return 'bg-amber-100 text-amber-800'
      case 'other': return 'bg-gray-100 text-gray-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  // Column definitions for overdue customers table
  const columns = [
    {
      key: 'name',
      title: 'Customer',
      sortable: true,
      type: 'text' as const,
      cell: (row: OverdueCustomer) => (
        <div>
          <div className="font-medium">{row.name}</div>
          <div className="text-sm text-gray-500">{row.contactNumber}</div>
        </div>
      ),
    },
    {
      key: 'totalOutstanding',
      title: 'Outstanding',
      sortable: true,
      type: 'currency' as const,
      align: 'right' as const,
    },
    {
      key: 'oldestInvoiceDays',
      title: 'Days Overdue',
      sortable: true,
      type: 'number' as const,
      align: 'right' as const,
      cell: (row: OverdueCustomer) => (
        <div className="text-right">
          <span className={`font-medium ${
            row.oldestInvoiceDays > 90 ? 'text-red-600' :
            row.oldestInvoiceDays > 60 ? 'text-amber-600' :
            row.oldestInvoiceDays > 30 ? 'text-yellow-600' : 'text-gray-600'
          }`}>
            {row.oldestInvoiceDays}
          </span>
          <div className="text-xs text-gray-500">{row.invoiceCount} invoices</div>
        </div>
      ),
    },
    {
      key: 'revenueStream',
      title: 'Stream',
      type: 'text' as const,
      cell: (row: OverdueCustomer) => (
        <Badge className={`text-xs ${getStreamBadgeColor(row.revenueStream)}`}>
          {row.revenueStream.replace('-', ' ')}
        </Badge>
      ),
    },
    {
      key: 'riskLevel',
      title: 'Risk',
      type: 'status' as const,
      cell: (row: OverdueCustomer) => (
        <Badge variant={getRiskBadgeColor(row.riskLevel)} className="text-xs">
          {row.riskLevel}
        </Badge>
      ),
    },
    {
      key: 'lastContactDate',
      title: 'Last Contact',
      sortable: true,
      type: 'date' as const,
      cell: (row: OverdueCustomer) => (
        <div className="text-sm">
          {row.lastContactDate ? formatAustralianDate(row.lastContactDate) : 'Never'}
          {row.contactHistory.some(c => c.followUpRequired && c.followUpDate && c.followUpDate < new Date()) && (
            <div className="text-xs text-red-600">Follow-up overdue</div>
          )}
        </div>
      ),
    },
    {
      id: 'actions',
      title: 'Actions',
      cell: (row: OverdueCustomer) => (
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setSelectedCustomer(row)
              setIsContactDialogOpen(true)
            }}
          >
            <Eye className="h-4 w-4" />
          </Button>
          
          {showContactActions && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem onClick={() => handleContactCustomer(row, 'email')}>
                  <Mail className="mr-2 h-4 w-4" />
                  Send Email
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleContactCustomer(row, 'phone')}>
                  <Phone className="mr-2 h-4 w-4" />
                  Call Customer
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleContactCustomer(row, 'letter')}>
                  <FileText className="mr-2 h-4 w-4" />
                  Send Letter
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      ),
    },
  ]

  const handleRowClick = (customer: OverdueCustomer) => {
    setSelectedCustomer(customer)
    setIsContactDialogOpen(true)
  }

  const handleExport = () => {
    // In real implementation, would export filtered customers to CSV
    console.log('Export overdue customers:', filteredCustomers)
  }

  return (
    <div className={className}>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center">
                <Users className="mr-2 h-5 w-5" />
                Overdue Customers
              </CardTitle>
              <CardDescription>
                Customers requiring immediate collection attention
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="destructive" className="text-xs">
                {filteredCustomers.length} overdue
              </Badge>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleRefresh}
                disabled={isLoading}
              >
                <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
              </Button>
              <Button variant="outline" size="sm" onClick={handleExport}>
                <Download className="mr-2 h-4 w-4" />
                Export
              </Button>
            </div>
          </div>
        </CardHeader>
        
        <CardContent className="space-y-4">
          {/* Filters */}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
            <div>
              <Label htmlFor="search">Search</Label>
              <Input
                id="search"
                placeholder="Customer name, email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            <div>
              <Label htmlFor="risk-filter">Risk Level</Label>
              <Select value={riskFilter} onValueChange={(value) => setRiskFilter(value as any)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Risk Levels</SelectItem>
                  <SelectItem value="high">High Risk</SelectItem>
                  <SelectItem value="medium">Medium Risk</SelectItem>
                  <SelectItem value="low">Low Risk</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="stream-filter">Revenue Stream</Label>
              <Select value={streamFilter} onValueChange={(value) => setStreamFilter(value as any)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Streams</SelectItem>
                  <SelectItem value="tours">Tours</SelectItem>
                  <SelectItem value="dr-dish">Dr Dish</SelectItem>
                  <SelectItem value="marketing">Marketing</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="days-filter">Days Past Due</Label>
              <Select value={daysPastDueFilter} onValueChange={(value) => setDaysPastDueFilter(value as any)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Overdue</SelectItem>
                  <SelectItem value="30">30+ Days</SelectItem>
                  <SelectItem value="60">60+ Days</SelectItem>
                  <SelectItem value="90">90+ Days</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Summary Stats */}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
            <div className="rounded-lg border p-3">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-red-600" />
                <span className="text-sm font-medium">Total Overdue</span>
              </div>
              <p className="mt-1 text-lg font-bold text-red-900">
                {formatCurrency(filteredCustomers.reduce((sum, c) => sum + c.totalOutstanding, 0))}
              </p>
            </div>

            <div className="rounded-lg border p-3">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-gray-600" />
                <span className="text-sm font-medium">Customers</span>
              </div>
              <p className="mt-1 text-lg font-bold">
                {filteredCustomers.length}
              </p>
            </div>

            <div className="rounded-lg border p-3">
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-gray-600" />
                <span className="text-sm font-medium">Invoices</span>
              </div>
              <p className="mt-1 text-lg font-bold">
                {filteredCustomers.reduce((sum, c) => sum + c.invoiceCount, 0)}
              </p>
            </div>

            <div className="rounded-lg border p-3">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-gray-600" />
                <span className="text-sm font-medium">Avg Days</span>
              </div>
              <p className="mt-1 text-lg font-bold">
                {filteredCustomers.length > 0 
                  ? Math.round(filteredCustomers.reduce((sum, c) => sum + c.oldestInvoiceDays, 0) / filteredCustomers.length)
                  : 0
                }
              </p>
            </div>
          </div>

          {/* Customers Table */}
          <DataTable
            columns={columns}
            data={filteredCustomers}
            searchable={false} // We have custom search
            exportable={false} // We have custom export
            onRowClick={handleRowClick}
            maxRows={maxRows}
          />
        </CardContent>
      </Card>

      {/* Customer Detail Dialog */}
      <Dialog open={isContactDialogOpen} onOpenChange={setIsContactDialogOpen}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Customer Details: {selectedCustomer?.name}</DialogTitle>
            <DialogDescription>
              Contact information and outstanding invoice details
            </DialogDescription>
          </DialogHeader>
          
          {selectedCustomer && (
            <div className="space-y-6">
              {/* Customer Information */}
              <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                <div>
                  <h4 className="mb-3 text-sm font-medium">Contact Information</h4>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Building className="h-4 w-4 text-gray-500" />
                      <span className="text-sm">{selectedCustomer.name}</span>
                    </div>
                    {selectedCustomer.email && (
                      <div className="flex items-center gap-2">
                        <Mail className="h-4 w-4 text-gray-500" />
                        <span className="text-sm">{selectedCustomer.email}</span>
                        <Button variant="ghost" size="sm" onClick={() => handleContactCustomer(selectedCustomer, 'email')}>
                          <Send className="h-3 w-3" />
                        </Button>
                      </div>
                    )}
                    {selectedCustomer.phone && (
                      <div className="flex items-center gap-2">
                        <Phone className="h-4 w-4 text-gray-500" />
                        <span className="text-sm">{selectedCustomer.phone}</span>
                        <Button variant="ghost" size="sm" onClick={() => handleContactCustomer(selectedCustomer, 'phone')}>
                          <Phone className="h-3 w-3" />
                        </Button>
                      </div>
                    )}
                    {selectedCustomer.address && (
                      <div className="flex items-start gap-2">
                        <MapPin className="h-4 w-4 text-gray-500 mt-0.5" />
                        <div className="text-sm">
                          <div>{selectedCustomer.address.line1}</div>
                          <div>{selectedCustomer.address.city}, {selectedCustomer.address.state} {selectedCustomer.address.postcode}</div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <div>
                  <h4 className="mb-3 text-sm font-medium">Account Information</h4>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-500">Payment Terms</span>
                      <span className="text-sm font-medium">{selectedCustomer.paymentTerms}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-500">Credit Limit</span>
                      <span className="text-sm font-medium">
                        {selectedCustomer.creditLimit ? formatCurrency(selectedCustomer.creditLimit) : 'Not set'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-500">Revenue Stream</span>
                      <Badge className={`text-xs ${getStreamBadgeColor(selectedCustomer.revenueStream)}`}>
                        {selectedCustomer.revenueStream.replace('-', ' ')}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-500">Risk Level</span>
                      <Badge variant={getRiskBadgeColor(selectedCustomer.riskLevel)} className="text-xs">
                        {selectedCustomer.riskLevel}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-500">Last Payment</span>
                      <span className="text-sm">
                        {selectedCustomer.lastPaymentDate ? formatAustralianDate(selectedCustomer.lastPaymentDate) : 'Never'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Outstanding Invoices */}
              <div>
                <h4 className="mb-3 text-sm font-medium">Outstanding Invoices</h4>
                <div className="space-y-2">
                  {selectedCustomer.invoices.map((invoice) => (
                    <div key={invoice.id} className="flex items-center justify-between rounded-lg border p-3">
                      <div>
                        <div className="font-medium">{invoice.number}</div>
                        <div className="text-sm text-gray-500">
                          Due: {formatAustralianDate(invoice.dueDate)} • {invoice.daysPastDue} days overdue
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-medium">{formatCurrency(invoice.outstanding)}</div>
                        <div className="text-sm text-gray-500">of {formatCurrency(invoice.amount)}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Contact History */}
              <div>
                <h4 className="mb-3 text-sm font-medium">Recent Contact History</h4>
                <div className="space-y-2">
                  {selectedCustomer.contactHistory.map((contact) => (
                    <div key={contact.id} className="rounded-lg border p-3">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          {contact.type === 'email' ? <Mail className="h-4 w-4" /> :
                           contact.type === 'phone' ? <Phone className="h-4 w-4" /> :
                           contact.type === 'letter' ? <FileText className="h-4 w-4" /> :
                           <MessageSquare className="h-4 w-4" />}
                          <span className="font-medium">{contact.subject}</span>
                        </div>
                        <span className="text-sm text-gray-500">
                          {formatAustralianDate(contact.date)}
                        </span>
                      </div>
                      {contact.notes && (
                        <p className="text-sm text-gray-600 mb-2">{contact.notes}</p>
                      )}
                      {contact.followUpRequired && (
                        <div className={`rounded p-2 text-xs ${
                          contact.followUpDate && contact.followUpDate < new Date() 
                            ? 'bg-red-50 text-red-700' 
                            : 'bg-amber-50 text-amber-700'
                        }`}>
                          Follow-up {contact.followUpDate && contact.followUpDate < new Date() ? 'overdue' : 'required'}: {' '}
                          {contact.followUpDate ? formatAustralianDate(contact.followUpDate) : 'ASAP'}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Quick Actions */}
              <div className="flex items-center gap-2">
                <Button onClick={() => handleContactCustomer(selectedCustomer, 'email')}>
                  <Mail className="mr-2 h-4 w-4" />
                  Send Payment Reminder
                </Button>
                <Button variant="outline" onClick={() => handleContactCustomer(selectedCustomer, 'phone')}>
                  <Phone className="mr-2 h-4 w-4" />
                  Call Customer
                </Button>
                <Button variant="outline">
                  <Calendar className="mr-2 h-4 w-4" />
                  Schedule Follow-up
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
