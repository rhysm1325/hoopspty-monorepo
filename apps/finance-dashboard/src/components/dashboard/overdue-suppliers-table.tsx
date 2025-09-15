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
  Building2,
  AlertTriangle,
  Phone,
  Mail,
  Eye,
  Download,
  RefreshCw,
  MoreHorizontal,
  Calendar,
  DollarSign,
  Clock,
  CreditCard,
  FileText,
  MapPin,
  Star,
  Zap,
  CheckCircle,
  XCircle,
} from 'lucide-react'
import { formatCurrency, formatAustralianDate } from '@/utils/financial'

interface OverdueSupplier {
  id: string
  name: string
  contactNumber?: string
  email?: string
  phone?: string
  totalOutstanding: number
  oldestBillDays: number
  billCount: number
  category: string
  priority: 'low' | 'medium' | 'high' | 'critical'
  paymentTerms: string
  discountTerms?: string
  relationship: 'strategic' | 'preferred' | 'standard' | 'poor'
  lastPaymentDate?: Date
  averagePaymentDays: number
  creditRating?: string
  address?: {
    line1?: string
    city?: string
    state?: string
    postcode?: string
  }
  bills: Array<{
    id: string
    number: string
    date: Date
    dueDate: Date
    amount: number
    outstanding: number
    daysPastDue: number
    status: string
    hasEarlyPaymentDiscount: boolean
    discountAmount?: number
    discountDate?: Date
  }>
  paymentHistory: Array<{
    id: string
    date: Date
    amount: number
    method: string
    reference?: string
    daysToPayment: number
  }>
  notes?: string
}

interface OverdueSuppliersTableProps {
  maxRows?: number
  showPaymentActions?: boolean
  className?: string
}

export function OverdueSuppliersTable({ 
  maxRows = 50, 
  showPaymentActions = true,
  className 
}: OverdueSuppliersTableProps) {
  const [suppliers, setSuppliers] = useState<OverdueSupplier[]>([])
  const [filteredSuppliers, setFilteredSuppliers] = useState<OverdueSupplier[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedSupplier, setSelectedSupplier] = useState<OverdueSupplier | null>(null)
  const [isDetailDialogOpen, setIsDetailDialogOpen] = useState(false)
  
  // Filters
  const [searchTerm, setSearchTerm] = useState('')
  const [priorityFilter, setPriorityFilter] = useState<'all' | 'low' | 'medium' | 'high' | 'critical'>('all')
  const [categoryFilter, setCategoryFilter] = useState<'all' | 'flights' | 'accommodation' | 'equipment' | 'services'>('all')
  const [relationshipFilter, setRelationshipFilter] = useState<'all' | 'strategic' | 'preferred' | 'standard' | 'poor'>('all')

  useEffect(() => {
    loadOverdueSuppliers()
  }, [])

  useEffect(() => {
    applyFilters()
  }, [suppliers, searchTerm, priorityFilter, categoryFilter, relationshipFilter])

  const loadOverdueSuppliers = async () => {
    setIsLoading(true)
    setError(null)

    try {
      // In real implementation, this would call the overdue suppliers server action
      // For now, simulate with sample data
      await new Promise(resolve => setTimeout(resolve, 800))

      const sampleSuppliers: OverdueSupplier[] = [
        {
          id: 'supp1',
          name: 'Flight Centre Business',
          contactNumber: 'SUPP001',
          email: 'accounts@flightcentre.com.au',
          phone: '+61 7 3333 4444',
          totalOutstanding: 12500,
          oldestBillDays: 78,
          billCount: 2,
          category: 'flights',
          priority: 'critical',
          paymentTerms: 'Net 30',
          discountTerms: '2/10 Net 30',
          relationship: 'strategic',
          lastPaymentDate: new Date(Date.now() - 45 * 24 * 60 * 60 * 1000),
          averagePaymentDays: 35,
          creditRating: 'A+',
          address: {
            line1: '123 Flight Street',
            city: 'Brisbane',
            state: 'QLD',
            postcode: '4000',
          },
          bills: [
            {
              id: 'bill1',
              number: 'FC-2024-001',
              date: new Date('2024-07-01'),
              dueDate: new Date('2024-07-31'),
              amount: 8500,
              outstanding: 8500,
              daysPastDue: 78,
              status: 'AUTHORISED',
              hasEarlyPaymentDiscount: true,
              discountAmount: 170,
              discountDate: new Date('2024-07-11'),
            },
            {
              id: 'bill2',
              number: 'FC-2024-015',
              date: new Date('2024-08-15'),
              dueDate: new Date('2024-09-14'),
              amount: 4000,
              outstanding: 4000,
              daysPastDue: 37,
              status: 'AUTHORISED',
              hasEarlyPaymentDiscount: false,
            },
          ],
          paymentHistory: [
            {
              id: 'pay1',
              date: new Date(Date.now() - 45 * 24 * 60 * 60 * 1000),
              amount: 7200,
              method: 'Bank Transfer',
              reference: 'FC-2024-PAY-001',
              daysToPayment: 28,
            },
          ],
          notes: 'Strategic supplier for international flights. Maintain good relationship.',
        },
        {
          id: 'supp2',
          name: 'Equipment Supplier Ltd',
          contactNumber: 'SUPP002',
          email: 'billing@equipmentsupplier.com.au',
          phone: '+61 2 8888 9999',
          totalOutstanding: 8400,
          oldestBillDays: 65,
          billCount: 1,
          category: 'equipment',
          priority: 'high',
          paymentTerms: 'Net 30',
          relationship: 'preferred',
          lastPaymentDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
          averagePaymentDays: 32,
          creditRating: 'A',
          address: {
            line1: '456 Equipment Road',
            city: 'Sydney',
            state: 'NSW',
            postcode: '2001',
          },
          bills: [
            {
              id: 'bill3',
              number: 'ES-2024-008',
              date: new Date('2024-07-15'),
              dueDate: new Date('2024-08-14'),
              amount: 8400,
              outstanding: 8400,
              daysPastDue: 65,
              status: 'AUTHORISED',
              hasEarlyPaymentDiscount: false,
            },
          ],
          paymentHistory: [
            {
              id: 'pay2',
              date: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
              amount: 5600,
              method: 'Credit Card',
              reference: 'ES-2024-PAY-001',
              daysToPayment: 25,
            },
          ],
          notes: 'Reliable supplier for Dr Dish equipment. Good payment history.',
        },
        {
          id: 'supp3',
          name: 'Melbourne Accommodation Services',
          contactNumber: 'SUPP003',
          email: 'accounts@melbourneaccommodation.com.au',
          phone: '+61 3 7777 8888',
          totalOutstanding: 6200,
          oldestBillDays: 42,
          billCount: 1,
          category: 'accommodation',
          priority: 'medium',
          paymentTerms: 'Net 30',
          discountTerms: '1/10 Net 30',
          relationship: 'standard',
          lastPaymentDate: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000),
          averagePaymentDays: 28,
          creditRating: 'B+',
          bills: [
            {
              id: 'bill4',
              number: 'MAS-2024-003',
              date: new Date('2024-08-08'),
              dueDate: new Date('2024-09-07'),
              amount: 6200,
              outstanding: 6200,
              daysPastDue: 42,
              status: 'AUTHORISED',
              hasEarlyPaymentDiscount: true,
              discountAmount: 62,
              discountDate: new Date('2024-08-18'),
            },
          ],
          paymentHistory: [],
          notes: 'Standard accommodation provider for tours.',
        },
      ]

      setSuppliers(sampleSuppliers)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load overdue suppliers')
    } finally {
      setIsLoading(false)
    }
  }

  const applyFilters = () => {
    let filtered = suppliers

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(supplier =>
        supplier.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        supplier.contactNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        supplier.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        supplier.category.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }

    // Priority filter
    if (priorityFilter !== 'all') {
      filtered = filtered.filter(supplier => supplier.priority === priorityFilter)
    }

    // Category filter
    if (categoryFilter !== 'all') {
      filtered = filtered.filter(supplier => supplier.category === categoryFilter)
    }

    // Relationship filter
    if (relationshipFilter !== 'all') {
      filtered = filtered.filter(supplier => supplier.relationship === relationshipFilter)
    }

    // Sort by priority and days overdue
    filtered.sort((a, b) => {
      const priorityOrder = { critical: 4, high: 3, medium: 2, low: 1 }
      const priorityDiff = priorityOrder[b.priority] - priorityOrder[a.priority]
      if (priorityDiff !== 0) return priorityDiff
      
      return b.oldestBillDays - a.oldestBillDays
    })

    setFilteredSuppliers(filtered)
  }

  const handleRefresh = () => {
    loadOverdueSuppliers()
  }

  const handlePaySupplier = (supplier: OverdueSupplier) => {
    // In real implementation, would integrate with payment systems
    console.log('Initiate payment for:', supplier.name)
  }

  const handleSchedulePayment = (supplier: OverdueSupplier) => {
    // In real implementation, would schedule payment
    console.log('Schedule payment for:', supplier.name)
  }

  const getPriorityBadgeColor = (priority: 'low' | 'medium' | 'high' | 'critical') => {
    switch (priority) {
      case 'critical': return 'destructive'
      case 'high': return 'secondary'
      case 'medium': return 'outline'
      case 'low': return 'outline'
      default: return 'outline'
    }
  }

  const getRelationshipIcon = (relationship: 'strategic' | 'preferred' | 'standard' | 'poor') => {
    switch (relationship) {
      case 'strategic': return <Star className="h-4 w-4 text-yellow-500" />
      case 'preferred': return <CheckCircle className="h-4 w-4 text-green-500" />
      case 'standard': return <Clock className="h-4 w-4 text-gray-500" />
      case 'poor': return <XCircle className="h-4 w-4 text-red-500" />
      default: return <Clock className="h-4 w-4 text-gray-500" />
    }
  }

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'flights': return 'bg-blue-100 text-blue-800'
      case 'accommodation': return 'bg-purple-100 text-purple-800'
      case 'equipment': return 'bg-green-100 text-green-800'
      case 'services': return 'bg-amber-100 text-amber-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  // Column definitions for overdue suppliers table
  const columns = [
    {
      key: 'name',
      title: 'Supplier',
      sortable: true,
      type: 'text' as const,
      cell: (row: OverdueSupplier) => (
        <div>
          <div className="flex items-center gap-2">
            <span className="font-medium">{row.name}</span>
            {getRelationshipIcon(row.relationship)}
          </div>
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
      key: 'oldestBillDays',
      title: 'Days Overdue',
      sortable: true,
      type: 'number' as const,
      align: 'right' as const,
      cell: (row: OverdueSupplier) => (
        <div className="text-right">
          <span className={`font-medium ${
            row.oldestBillDays > 90 ? 'text-red-600' :
            row.oldestBillDays > 60 ? 'text-amber-600' :
            row.oldestBillDays > 30 ? 'text-yellow-600' : 'text-gray-600'
          }`}>
            {row.oldestBillDays}
          </span>
          <div className="text-xs text-gray-500">{row.billCount} bills</div>
        </div>
      ),
    },
    {
      key: 'category',
      title: 'Category',
      type: 'text' as const,
      cell: (row: OverdueSupplier) => (
        <Badge className={`text-xs ${getCategoryColor(row.category)}`}>
          {row.category}
        </Badge>
      ),
    },
    {
      key: 'priority',
      title: 'Priority',
      sortable: true,
      type: 'status' as const,
      cell: (row: OverdueSupplier) => (
        <div className="flex items-center gap-2">
          <Badge variant={getPriorityBadgeColor(row.priority)} className="text-xs">
            {row.priority}
          </Badge>
          {row.priority === 'critical' && <Zap className="h-4 w-4 text-red-600" />}
        </div>
      ),
    },
    {
      key: 'paymentTerms',
      title: 'Terms',
      type: 'text' as const,
      cell: (row: OverdueSupplier) => (
        <div className="text-sm">
          <div>{row.paymentTerms}</div>
          {row.discountTerms && (
            <div className="text-xs text-green-600">{row.discountTerms}</div>
          )}
        </div>
      ),
    },
    {
      id: 'actions',
      title: 'Actions',
      cell: (row: OverdueSupplier) => (
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setSelectedSupplier(row)
              setIsDetailDialogOpen(true)
            }}
          >
            <Eye className="h-4 w-4" />
          </Button>
          
          {showPaymentActions && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem onClick={() => handlePaySupplier(row)}>
                  <CreditCard className="mr-2 h-4 w-4" />
                  Pay Now
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleSchedulePayment(row)}>
                  <Calendar className="mr-2 h-4 w-4" />
                  Schedule Payment
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <Mail className="mr-2 h-4 w-4" />
                  Contact Supplier
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <FileText className="mr-2 h-4 w-4" />
                  Request Statement
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      ),
    },
  ]

  const handleRowClick = (supplier: OverdueSupplier) => {
    setSelectedSupplier(supplier)
    setIsDetailDialogOpen(true)
  }

  const handleExport = () => {
    // In real implementation, would export filtered suppliers to CSV
    console.log('Export overdue suppliers:', filteredSuppliers)
  }

  const calculatePaymentPriority = (supplier: OverdueSupplier) => {
    let score = 0
    
    // Days overdue factor
    score += supplier.oldestBillDays * 0.5
    
    // Amount factor
    score += (supplier.totalOutstanding / 1000) * 0.3
    
    // Relationship factor
    const relationshipMultiplier = {
      strategic: 2.0,
      preferred: 1.5,
      standard: 1.0,
      poor: 0.8,
    }
    score *= relationshipMultiplier[supplier.relationship]
    
    // Discount opportunity factor
    const hasActiveDiscount = supplier.bills.some(bill => 
      bill.hasEarlyPaymentDiscount && 
      bill.discountDate && 
      bill.discountDate > new Date()
    )
    if (hasActiveDiscount) score += 20
    
    return Math.round(score)
  }

  return (
    <div className={className}>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center">
                <Building2 className="mr-2 h-5 w-5" />
                Overdue Suppliers
              </CardTitle>
              <CardDescription>
                Suppliers requiring payment prioritization
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-xs">
                {filteredSuppliers.length} overdue
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
                placeholder="Supplier name, category..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            <div>
              <Label htmlFor="priority-filter">Priority</Label>
              <Select value={priorityFilter} onValueChange={(value) => setPriorityFilter(value as any)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Priorities</SelectItem>
                  <SelectItem value="critical">Critical</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="low">Low</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="category-filter">Category</Label>
              <Select value={categoryFilter} onValueChange={(value) => setCategoryFilter(value as any)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  <SelectItem value="flights">Flights</SelectItem>
                  <SelectItem value="accommodation">Accommodation</SelectItem>
                  <SelectItem value="equipment">Equipment</SelectItem>
                  <SelectItem value="services">Services</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="relationship-filter">Relationship</Label>
              <Select value={relationshipFilter} onValueChange={(value) => setRelationshipFilter(value as any)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Relationships</SelectItem>
                  <SelectItem value="strategic">Strategic</SelectItem>
                  <SelectItem value="preferred">Preferred</SelectItem>
                  <SelectItem value="standard">Standard</SelectItem>
                  <SelectItem value="poor">Poor</SelectItem>
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
                {formatCurrency(filteredSuppliers.reduce((sum, s) => sum + s.totalOutstanding, 0))}
              </p>
            </div>

            <div className="rounded-lg border p-3">
              <div className="flex items-center gap-2">
                <Building2 className="h-4 w-4 text-gray-600" />
                <span className="text-sm font-medium">Suppliers</span>
              </div>
              <p className="mt-1 text-lg font-bold">
                {filteredSuppliers.length}
              </p>
            </div>

            <div className="rounded-lg border p-3">
              <div className="flex items-center gap-2">
                <Zap className="h-4 w-4 text-red-600" />
                <span className="text-sm font-medium">Critical</span>
              </div>
              <p className="mt-1 text-lg font-bold text-red-900">
                {filteredSuppliers.filter(s => s.priority === 'critical').length}
              </p>
            </div>

            <div className="rounded-lg border p-3">
              <div className="flex items-center gap-2">
                <Star className="h-4 w-4 text-yellow-500" />
                <span className="text-sm font-medium">Strategic</span>
              </div>
              <p className="mt-1 text-lg font-bold">
                {filteredSuppliers.filter(s => s.relationship === 'strategic').length}
              </p>
            </div>
          </div>

          {/* Priority Payment Recommendations */}
          {filteredSuppliers.length > 0 && (
            <div className="rounded-lg bg-blue-50 p-4">
              <h5 className="mb-2 text-sm font-medium text-blue-800">Payment Priority Recommendations</h5>
              <div className="space-y-2">
                {filteredSuppliers
                  .slice(0, 3)
                  .map((supplier, index) => {
                    const priorityScore = calculatePaymentPriority(supplier)
                    const hasDiscount = supplier.bills.some(b => b.hasEarlyPaymentDiscount && b.discountDate && b.discountDate > new Date())
                    
                    return (
                      <div key={supplier.id} className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-xs">
                            #{index + 1}
                          </Badge>
                          <span className="font-medium">{supplier.name}</span>
                          {hasDiscount && (
                            <Badge variant="default" className="text-xs bg-green-100 text-green-800">
                              Discount Available
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-blue-700">Score: {priorityScore}</span>
                          <Button size="sm" onClick={() => handlePaySupplier(supplier)}>
                            Pay Now
                          </Button>
                        </div>
                      </div>
                    )
                  })}
              </div>
            </div>
          )}

          {/* Suppliers Table */}
          <DataTable
            columns={columns}
            data={filteredSuppliers}
            searchable={false} // We have custom search
            exportable={false} // We have custom export
            onRowClick={handleRowClick}
            maxRows={maxRows}
          />
        </CardContent>
      </Card>

      {/* Supplier Detail Dialog */}
      <Dialog open={isDetailDialogOpen} onOpenChange={setIsDetailDialogOpen}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              Supplier Details: {selectedSupplier?.name}
              {selectedSupplier && getRelationshipIcon(selectedSupplier.relationship)}
            </DialogTitle>
            <DialogDescription>
              Payment information and outstanding bill details
            </DialogDescription>
          </DialogHeader>
          
          {selectedSupplier && (
            <div className="space-y-6">
              {/* Supplier Information */}
              <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                <div>
                  <h4 className="mb-3 text-sm font-medium">Contact Information</h4>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Building2 className="h-4 w-4 text-gray-500" />
                      <span className="text-sm">{selectedSupplier.name}</span>
                    </div>
                    {selectedSupplier.email && (
                      <div className="flex items-center gap-2">
                        <Mail className="h-4 w-4 text-gray-500" />
                        <span className="text-sm">{selectedSupplier.email}</span>
                      </div>
                    )}
                    {selectedSupplier.phone && (
                      <div className="flex items-center gap-2">
                        <Phone className="h-4 w-4 text-gray-500" />
                        <span className="text-sm">{selectedSupplier.phone}</span>
                      </div>
                    )}
                    {selectedSupplier.address && (
                      <div className="flex items-start gap-2">
                        <MapPin className="h-4 w-4 text-gray-500 mt-0.5" />
                        <div className="text-sm">
                          <div>{selectedSupplier.address.line1}</div>
                          <div>{selectedSupplier.address.city}, {selectedSupplier.address.state} {selectedSupplier.address.postcode}</div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <div>
                  <h4 className="mb-3 text-sm font-medium">Payment Information</h4>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-500">Payment Terms</span>
                      <span className="text-sm font-medium">{selectedSupplier.paymentTerms}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-500">Discount Terms</span>
                      <span className="text-sm font-medium">
                        {selectedSupplier.discountTerms || 'None'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-500">Relationship</span>
                      <div className="flex items-center gap-1">
                        {getRelationshipIcon(selectedSupplier.relationship)}
                        <span className="text-sm font-medium capitalize">{selectedSupplier.relationship}</span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-500">Credit Rating</span>
                      <span className="text-sm font-medium">{selectedSupplier.creditRating || 'Not rated'}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-500">Avg Payment Days</span>
                      <span className="text-sm font-medium">{selectedSupplier.averagePaymentDays} days</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Outstanding Bills */}
              <div>
                <h4 className="mb-3 text-sm font-medium">Outstanding Bills</h4>
                <div className="space-y-2">
                  {selectedSupplier.bills.map((bill) => (
                    <div key={bill.id} className="flex items-center justify-between rounded-lg border p-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{bill.number}</span>
                          {bill.hasEarlyPaymentDiscount && bill.discountDate && bill.discountDate > new Date() && (
                            <Badge variant="default" className="text-xs bg-green-100 text-green-800">
                              Discount: {formatCurrency(bill.discountAmount || 0)}
                            </Badge>
                          )}
                        </div>
                        <div className="text-sm text-gray-500">
                          Due: {formatAustralianDate(bill.dueDate)} • {bill.daysPastDue} days overdue
                          {bill.hasEarlyPaymentDiscount && bill.discountDate && (
                            <span className="ml-2 text-green-600">
                              • Discount until {formatAustralianDate(bill.discountDate)}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-medium">{formatCurrency(bill.outstanding)}</div>
                        <div className="text-sm text-gray-500">of {formatCurrency(bill.amount)}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Payment History */}
              {selectedSupplier.paymentHistory.length > 0 && (
                <div>
                  <h4 className="mb-3 text-sm font-medium">Recent Payment History</h4>
                  <div className="space-y-2">
                    {selectedSupplier.paymentHistory.map((payment) => (
                      <div key={payment.id} className="flex items-center justify-between rounded-lg border p-3">
                        <div>
                          <div className="font-medium">{formatAustralianDate(payment.date)}</div>
                          <div className="text-sm text-gray-500">
                            {payment.method} • {payment.daysToPayment} days to pay
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-medium">{formatCurrency(payment.amount)}</div>
                          <div className="text-sm text-gray-500">{payment.reference}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Notes */}
              {selectedSupplier.notes && (
                <div>
                  <h4 className="mb-2 text-sm font-medium">Notes</h4>
                  <p className="text-sm text-gray-600 rounded-lg bg-gray-50 p-3">
                    {selectedSupplier.notes}
                  </p>
                </div>
              )}

              {/* Payment Actions */}
              <div className="flex items-center gap-2 pt-4 border-t">
                <Button onClick={() => handlePaySupplier(selectedSupplier)}>
                  <CreditCard className="mr-2 h-4 w-4" />
                  Pay All Outstanding
                </Button>
                <Button variant="outline" onClick={() => handleSchedulePayment(selectedSupplier)}>
                  <Calendar className="mr-2 h-4 w-4" />
                  Schedule Payment
                </Button>
                <Button variant="outline">
                  <Mail className="mr-2 h-4 w-4" />
                  Contact Supplier
                </Button>
                <Button variant="outline">
                  <FileText className="mr-2 h-4 w-4" />
                  Request Statement
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
