import * as React from 'react'
import { cn } from '@/lib/utils'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Search, Download, Filter } from 'lucide-react'

export interface Column {
  key: string
  title: string
  sortable?: boolean
  type?: 'text' | 'currency' | 'number' | 'date' | 'badge' | 'status'
  align?: 'left' | 'center' | 'right'
  width?: string
}

export interface DataTableProps<T = Record<string, unknown>> {
  columns: Column[]
  data: T[]
  loading?: boolean
  searchable?: boolean
  exportable?: boolean
  filterable?: boolean
  onRowClick?: (row: T) => void
  onExport?: () => void
  className?: string
}

const DataTable = React.forwardRef<HTMLDivElement, DataTableProps>(
  (
    {
      columns,
      data,
      loading = false,
      searchable = true,
      exportable = true,
      filterable = false,
      onRowClick,
      onExport,
      className,
    },
    ref
  ) => {
    const [searchTerm, setSearchTerm] = React.useState('')
    const [sortConfig, setSortConfig] = React.useState<{
      key: string
      direction: 'asc' | 'desc'
    } | null>(null)

    // Filter data based on search term
    const filteredData = React.useMemo(() => {
      if (!searchTerm) return data

      return data.filter(row =>
        Object.values(row).some(value =>
          String(value).toLowerCase().includes(searchTerm.toLowerCase())
        )
      )
    }, [data, searchTerm])

    // Sort data based on sort config
    const sortedData = React.useMemo(() => {
      if (!sortConfig) return filteredData

      return [...filteredData].sort((a, b) => {
        const aValue = a[sortConfig.key]
        const bValue = b[sortConfig.key]

        // Handle comparison for unknown types
        const aStr = String(aValue ?? '')
        const bStr = String(bValue ?? '')

        if (aStr < bStr) {
          return sortConfig.direction === 'asc' ? -1 : 1
        }
        if (aStr > bStr) {
          return sortConfig.direction === 'asc' ? 1 : -1
        }
        return 0
      })
    }, [filteredData, sortConfig])

    const handleSort = (key: string) => {
      const column = columns.find(col => col.key === key)
      if (!column?.sortable) return

      setSortConfig(current => {
        if (current?.key === key) {
          return current.direction === 'asc' ? { key, direction: 'desc' } : null
        }
        return { key, direction: 'asc' }
      })
    }

    const formatCellValue = (value: unknown, type: Column['type']) => {
      if (value === null || value === undefined) return '-'

      switch (type) {
        case 'currency':
          return new Intl.NumberFormat('en-AU', {
            style: 'currency',
            currency: 'AUD',
          }).format(Number(value) || 0)

        case 'number':
          return new Intl.NumberFormat('en-AU').format(Number(value) || 0)

        case 'date':
          try {
            return new Date(String(value)).toLocaleDateString('en-AU')
          } catch {
            return String(value)
          }

        case 'badge':
          const badgeValue = value as
            | { variant?: string; label?: string }
            | string
          if (typeof badgeValue === 'object' && badgeValue !== null) {
            return (
              <Badge
                variant={(badgeValue.variant as 'secondary') || 'secondary'}
              >
                {badgeValue.label || String(badgeValue)}
              </Badge>
            )
          }
          return <Badge variant="secondary">{String(badgeValue)}</Badge>

        case 'status':
          const statusColors: Record<string, string> = {
            overdue: 'destructive',
            due: 'secondary',
            paid: 'default',
            draft: 'outline',
          }
          const statusVariant = statusColors[String(value).toLowerCase()] as
            | 'destructive'
            | 'secondary'
            | 'default'
            | 'outline'
            | undefined
          return (
            <Badge variant={statusVariant || 'secondary'}>
              {String(value)}
            </Badge>
          )

        default:
          return String(value)
      }
    }

    const getSortIcon = (key: string) => {
      if (sortConfig?.key !== key) return ''
      return sortConfig.direction === 'asc' ? ' ↑' : ' ↓'
    }

    if (loading) {
      return (
        <div ref={ref} className={cn('space-y-4', className)}>
          <div className="animate-pulse">
            <div className="mb-4 h-10 rounded bg-gray-200"></div>
            <div className="space-y-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="h-12 rounded bg-gray-200"></div>
              ))}
            </div>
          </div>
        </div>
      )
    }

    return (
      <div ref={ref} className={cn('space-y-4', className)}>
        {/* Controls */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            {searchable && (
              <div className="relative">
                <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 transform text-gray-400" />
                <Input
                  placeholder="Search..."
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  className="w-64 pl-9"
                />
              </div>
            )}
            {filterable && (
              <Button variant="outline" size="sm">
                <Filter className="mr-2 h-4 w-4" />
                Filters
              </Button>
            )}
          </div>

          {exportable && (
            <Button variant="outline" size="sm" onClick={onExport}>
              <Download className="mr-2 h-4 w-4" />
              Export
            </Button>
          )}
        </div>

        {/* Table */}
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                {columns.map(column => (
                  <TableHead
                    key={column.key}
                    className={cn(
                      column.sortable && 'hover:bg-muted/50 cursor-pointer',
                      column.align === 'center' && 'text-center',
                      column.align === 'right' && 'text-right'
                    )}
                    style={{ width: column.width }}
                    onClick={() => handleSort(column.key)}
                  >
                    {column.title}
                    {getSortIcon(column.key)}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedData.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={columns.length}
                    className="text-muted-foreground h-24 text-center"
                  >
                    No results found.
                  </TableCell>
                </TableRow>
              ) : (
                sortedData.map((row, index) => (
                  <TableRow
                    key={index}
                    className={cn(
                      onRowClick && 'hover:bg-muted/50 cursor-pointer'
                    )}
                    onClick={() => onRowClick?.(row)}
                  >
                    {columns.map(column => (
                      <TableCell
                        key={column.key}
                        className={cn(
                          column.align === 'center' && 'text-center',
                          column.align === 'right' && 'text-right'
                        )}
                      >
                        {formatCellValue(row[column.key], column.type)}
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {/* Footer */}
        <div className="text-muted-foreground text-sm">
          Showing {sortedData.length} of {data.length} results
        </div>
      </div>
    )
  }
)
DataTable.displayName = 'DataTable'

export { DataTable }
