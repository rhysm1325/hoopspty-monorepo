import * as React from 'react'
import { cn } from '@/lib/utils'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export interface DashboardCardProps
  extends React.HTMLAttributes<HTMLDivElement> {
  title?: string
  description?: string
  action?: React.ReactNode
  loading?: boolean
}

const DashboardCard = React.forwardRef<HTMLDivElement, DashboardCardProps>(
  (
    {
      className,
      title,
      description,
      action,
      loading = false,
      children,
      ...props
    },
    ref
  ) => {
    if (loading) {
      return (
        <Card ref={ref} className={cn('animate-pulse', className)} {...props}>
          <CardHeader>
            <div className="mb-2 h-6 w-1/3 rounded bg-gray-200"></div>
            <div className="h-4 w-2/3 rounded bg-gray-200"></div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="h-4 rounded bg-gray-200"></div>
              <div className="h-4 rounded bg-gray-200"></div>
              <div className="h-4 w-5/6 rounded bg-gray-200"></div>
            </div>
          </CardContent>
        </Card>
      )
    }

    return (
      <Card ref={ref} className={cn('', className)} {...props}>
        {(title || description || action) && (
          <CardHeader className={cn(title || description ? 'pb-4' : 'pb-2')}>
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                {title && (
                  <CardTitle className="text-lg font-semibold">
                    {title}
                  </CardTitle>
                )}
                {description && (
                  <p className="text-muted-foreground text-sm">{description}</p>
                )}
              </div>
              {action && <div className="flex-shrink-0">{action}</div>}
            </div>
          </CardHeader>
        )}
        <CardContent
          className={cn(title || description || action ? 'pt-0' : '')}
        >
          {children}
        </CardContent>
      </Card>
    )
  }
)
DashboardCard.displayName = 'DashboardCard'

export { DashboardCard }
