import * as React from 'react'
import { format } from 'date-fns'
import { CalendarIcon } from 'lucide-react'
import { type DateRange } from 'react-day-picker'

import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'

interface DatePickerWithRangeProps {
  label?: string
  date?: DateRange | undefined
  onRangeChange?: (range: DateRange | undefined) => void
}

export function DatePickerWithRange({ label, date, onRangeChange }: DatePickerWithRangeProps) {
  // Internal state for the calendar selection
  const [internalRange, setInternalRange] = React.useState<DateRange | undefined>(undefined)

  // Sync with external date prop when it changes (for reset functionality)
  // Compare by timestamp to avoid unnecessary resets from new Date object references
  const dateFromTime = date?.from?.getTime()
  const dateToTime = date?.to?.getTime()

  React.useEffect(() => {
    setInternalRange(date)
  }, [dateFromTime, dateToTime])

  const handleSelect = (range: DateRange | undefined) => {
    setInternalRange(range)
    onRangeChange?.(range)
  }

  return (
    <div className="flex items-center gap-2">
      <span className="text-sm font-medium whitespace-nowrap">{label || 'Date Range'}</span>
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="outline" className="justify-start px-2.5 font-normal w-56">
            <CalendarIcon />
            {internalRange?.from ? (
              internalRange.to ? (
                <>
                  {format(internalRange.from, 'LLL dd, y')} -{' '}
                  {format(internalRange.to, 'LLL dd, y')}
                </>
              ) : (
                format(internalRange.from, 'LLL dd, y')
              )
            ) : (
              <span>Pick a date range</span>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="range"
            defaultMonth={internalRange?.from}
            selected={internalRange}
            onSelect={handleSelect}
            numberOfMonths={2}
            showOutsideDays={true}
          />
        </PopoverContent>
      </Popover>
    </div>
  )
}
