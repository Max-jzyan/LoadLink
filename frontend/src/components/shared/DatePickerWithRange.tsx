'use client'

import * as React from 'react'
import { format } from 'date-fns'
import { CalendarIcon } from 'lucide-react'
import { type DateRange } from 'react-day-picker'

import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'

interface DatePickerWithRangeProps {
  label?: string
  onRangeChange?: (range: DateRange | undefined) => void
}

export function DatePickerWithRange({ label, onRangeChange }: DatePickerWithRangeProps) {
  const [date, setDate] = React.useState<DateRange | undefined>(undefined)

  const handleSelect = (range: DateRange | undefined) => {
    setDate(range)
    onRangeChange?.(range)
  }

  return (
    <div className="flex items-center gap-2">
      <span className="text-sm font-medium whitespace-nowrap">{label || 'Date Range'}</span>
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="outline" className="justify-start px-2.5 font-normal w-56">
            <CalendarIcon />
            {date?.from ? (
              date.to ? (
                <>
                  {format(date.from, 'LLL dd, y')} - {format(date.to, 'LLL dd, y')}
                </>
              ) : (
                format(date.from, 'LLL dd, y')
              )
            ) : (
              <span>Pick a date range</span>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="range"
            defaultMonth={date?.from}
            selected={date}
            onSelect={handleSelect}
            numberOfMonths={2}
          />
        </PopoverContent>
      </Popover>
    </div>
  )
}
