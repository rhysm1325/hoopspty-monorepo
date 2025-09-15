import * as React from 'react'
import { format } from 'date-fns'
import { Calendar as CalendarIcon, ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

export interface DatePickerProps {
  date?: Date | undefined
  onDateChange?: (date: Date | undefined) => void
  placeholder?: string
  disabled?: boolean
  className?: string
}

// Australian Financial Year utilities
const getAustralianFYDates = () => {
  const now = new Date()
  const currentYear = now.getFullYear()
  const currentMonth = now.getMonth()

  // Australian FY starts July 1
  const fyStartYear = currentMonth >= 6 ? currentYear : currentYear - 1
  const fyEndYear = fyStartYear + 1

  return {
    currentFYStart: new Date(fyStartYear, 6, 1), // July 1
    currentFYEnd: new Date(fyEndYear, 5, 30), // June 30
    lastFYStart: new Date(fyStartYear - 1, 6, 1),
    lastFYEnd: new Date(fyStartYear, 5, 30),
  }
}

const DatePicker = React.forwardRef<HTMLDivElement, DatePickerProps>(
  (
    { date, onDateChange, placeholder = 'Pick a date', disabled, className },
    ref
  ) => {
    const [isOpen, setIsOpen] = React.useState(false)
    const fyDates = getAustralianFYDates()

    const presets = [
      {
        label: 'Today',
        value: new Date(),
      },
      {
        label: 'Yesterday',
        value: new Date(Date.now() - 24 * 60 * 60 * 1000),
      },
      {
        label: 'This Week',
        value: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
      },
      {
        label: 'This Month',
        value: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
      },
      {
        label: 'FY to Date',
        value: fyDates.currentFYStart,
      },
      {
        label: 'Last FY',
        value: fyDates.lastFYStart,
      },
      {
        label: 'Current FY Start',
        value: fyDates.currentFYStart,
      },
      {
        label: 'Current FY End',
        value: fyDates.currentFYEnd,
      },
    ]

    const handlePresetSelect = (presetValue: string) => {
      const preset = presets.find(p => p.label === presetValue)
      if (preset) {
        onDateChange?.(preset.value)
        setIsOpen(false)
      }
    }

    return (
      <div ref={ref} className={cn('grid gap-2', className)}>
        <Popover open={isOpen} onOpenChange={setIsOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className={cn(
                'justify-start text-left font-normal',
                !date && 'text-muted-foreground'
              )}
              disabled={disabled}
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
              {date ? format(date, 'PPP') : placeholder}
              <ChevronDown className="ml-auto h-4 w-4 opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <div className="flex">
              {/* Presets */}
              <div className="space-y-1 border-r p-3">
                <div className="mb-2 text-sm font-medium">Quick Select</div>
                {presets.map(preset => (
                  <Button
                    key={preset.label}
                    variant="ghost"
                    size="sm"
                    className="w-full justify-start font-normal"
                    onClick={() => handlePresetSelect(preset.label)}
                  >
                    {preset.label}
                  </Button>
                ))}

                {/* Financial Year Selector */}
                <div className="border-t pt-2">
                  <div className="mb-2 text-sm font-medium">Financial Year</div>
                  <Select onValueChange={handlePresetSelect}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select FY" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="FY to Date">FY to Date</SelectItem>
                      <SelectItem value="Last FY">Last FY</SelectItem>
                      <SelectItem value="Current FY Start">
                        Current FY Start
                      </SelectItem>
                      <SelectItem value="Current FY End">
                        Current FY End
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Calendar */}
              <div className="p-3">
                <Calendar
                  mode="single"
                  selected={date}
                  onSelect={selectedDate => {
                    onDateChange?.(selectedDate)
                    setIsOpen(false)
                  }}
                  initialFocus
                />
              </div>
            </div>
          </PopoverContent>
        </Popover>
      </div>
    )
  }
)
DatePicker.displayName = 'DatePicker'

export { DatePicker }
