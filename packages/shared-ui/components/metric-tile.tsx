import * as React from 'react'
import { cn } from '@/lib/utils'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

export interface MetricTileProps extends React.HTMLAttributes<HTMLDivElement> {
  title: string
  value: string | number
  change?: {
    value: string | number
    type: 'positive' | 'negative' | 'neutral'
    label?: string
  }
  currency?: boolean
  loading?: boolean
}

const MetricTile = React.forwardRef<HTMLDivElement, MetricTileProps>(
  (
    {
      className,
      title,
      value,
      change,
      currency = false,
      loading = false,
      ...props
    },
    ref
  ) => {
    const formatValue = (val: string | number) => {
      if (typeof val === 'number') {
        if (currency) {
          return new Intl.NumberFormat('en-AU', {
            style: 'currency',
            currency: 'AUD',
            minimumFractionDigits: 0,
            maximumFractionDigits: 0,
          }).format(val)
        }
        return new Intl.NumberFormat('en-AU').format(val)
      }
      return val
    }

    const getChangeColor = (type: 'positive' | 'negative' | 'neutral') => {
      switch (type) {
        case 'positive':
          return 'text-green-600 bg-green-50'
        case 'negative':
          return 'text-red-600 bg-red-50'
        case 'neutral':
          return 'text-gray-600 bg-gray-50'
        default:
          return 'text-gray-600 bg-gray-50'
      }
    }

    const getChangeIcon = (type: 'positive' | 'negative' | 'neutral') => {
      switch (type) {
        case 'positive':
          return '↗'
        case 'negative':
          return '↘'
        case 'neutral':
          return '→'
        default:
          return ''
      }
    }

    if (loading) {
      return (
        <Card ref={ref} className={cn('animate-pulse', className)} {...props}>
          <CardHeader className="pb-2">
            <div className="h-4 w-3/4 rounded bg-gray-200"></div>
          </CardHeader>
          <CardContent>
            <div className="mb-2 h-8 w-1/2 rounded bg-gray-200"></div>
            <div className="h-4 w-1/3 rounded bg-gray-200"></div>
          </CardContent>
        </Card>
      )
    }

    return (
      <Card
        ref={ref}
        className={cn('transition-all hover:shadow-md', className)}
        {...props}
      >
        <CardHeader className="pb-2">
          <h3 className="text-muted-foreground text-sm font-medium">{title}</h3>
        </CardHeader>
        <CardContent>
          <div className="flex items-baseline justify-between">
            <p className="text-2xl font-bold tracking-tight">
              {formatValue(value)}
            </p>
          </div>
          {change && (
            <div className="mt-2">
              <Badge
                variant="secondary"
                className={cn(
                  'text-xs font-medium',
                  getChangeColor(change.type)
                )}
              >
                {getChangeIcon(change.type)} {change.value}
                {change.label && ` ${change.label}`}
              </Badge>
            </div>
          )}
        </CardContent>
      </Card>
    )
  }
)
MetricTile.displayName = 'MetricTile'

export { MetricTile }
