'use client'

import { useState } from 'react'
import {
  format,
  startOfDay,
  endOfDay,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  subDays,
  subWeeks,
  getYear,
} from 'date-fns'
import { vi } from 'date-fns/locale'
import { ChevronDownIcon, CalendarIcon } from 'lucide-react'
import { iconStyles } from '@/lib/icon-theme'
import { type DateRange } from 'react-day-picker'
import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
import { Label } from '@/components/ui/label'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'

interface DatePickerRangeProps {
  range?: DateRange | undefined
  onRangeChange?: (range: DateRange | undefined) => void
  placeholder?: string
  label?: string
  disabled?: boolean
  className?: string
}

export function DatePickerRange({
  range,
  onRangeChange,
  placeholder = 'Chọn khoảng thời gian',
  label,
  disabled = false,
  className = 'w-full max-w-xs space-y-2',
}: DatePickerRangeProps) {
  const [open, setOpen] = useState(false)
  const [quickSelectOpen, setQuickSelectOpen] = useState(false)

  const handleSelect = (selectedRange: DateRange | undefined) => {
    if (onRangeChange) {
      onRangeChange(selectedRange)
    }
  }

  const formatDateRange = (dateRange: DateRange | undefined): string => {
    if (!dateRange?.from) return placeholder
    if (dateRange.from && dateRange.to) {
      return `${format(dateRange.from, 'dd/MM/yyyy', { locale: vi })} - ${format(dateRange.to, 'dd/MM/yyyy', { locale: vi })}`
    }
    return format(dateRange.from, 'dd/MM/yyyy', { locale: vi })
  }

  // Functions to calculate date ranges
  const getTodayRange = (): DateRange => {
    const today = new Date()
    return {
      from: startOfDay(today),
      to: endOfDay(today),
    }
  }

  const getYesterdayRange = (): DateRange => {
    const yesterday = subDays(new Date(), 1)
    return {
      from: startOfDay(yesterday),
      to: endOfDay(yesterday),
    }
  }

  const getThisWeekRange = (): DateRange => {
    const now = new Date()
    return {
      from: startOfWeek(now, { locale: vi }),
      to: endOfWeek(now, { locale: vi }),
    }
  }

  const getLastWeekRange = (): DateRange => {
    const now = new Date()
    const lastWeek = subWeeks(now, 1)
    return {
      from: startOfWeek(lastWeek, { locale: vi }),
      to: endOfWeek(lastWeek, { locale: vi }),
    }
  }

  const getThisMonthRange = (): DateRange => {
    const now = new Date()
    return {
      from: startOfMonth(now),
      to: endOfMonth(now),
    }
  }

  const getMonthRange = (month: number): DateRange => {
    const now = new Date()
    const currentYear = getYear(now)
    const targetDate = new Date(currentYear, month - 1, 1)
    return {
      from: startOfMonth(targetDate),
      to: endOfMonth(targetDate),
    }
  }

  const getQuarterRange = (quarter: number): DateRange => {
    const now = new Date()
    const currentYear = getYear(now)
    const startMonth = (quarter - 1) * 3
    const endMonth = startMonth + 2
    return {
      from: startOfMonth(new Date(currentYear, startMonth, 1)),
      to: endOfMonth(new Date(currentYear, endMonth, 1)),
    }
  }

  const handleQuickSelect = (dateRange: DateRange) => {
    handleSelect(dateRange)
    setQuickSelectOpen(false)
  }

  const monthNames = [
    'Tháng 1',
    'Tháng 2',
    'Tháng 3',
    'Tháng 4',
    'Tháng 5',
    'Tháng 6',
    'Tháng 7',
    'Tháng 8',
    'Tháng 9',
    'Tháng 10',
    'Tháng 11',
    'Tháng 12',
  ]

  const quarterNames = ['Quý 1', 'Quý 2', 'Quý 3', 'Quý 4']

  return (
    <div className={className}>
      {label && (
        <Label htmlFor='date-range-picker' className='px-1'>
          {label}
        </Label>
      )}
      <div className='flex gap-2 items-center w-full min-w-0'>
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button
              variant='outline'
              id='date-range-picker'
              className='flex-1 justify-between font-normal min-w-0'
              disabled={disabled}
            >
              <span className='truncate'>{formatDateRange(range)}</span>
              <ChevronDownIcon className={`${iconStyles.navigationIcon} opacity-50 shrink-0 ml-2`} />
            </Button>
          </PopoverTrigger>
          <PopoverContent className='w-auto overflow-hidden p-0' align='start'>
            <Calendar
              mode='range'
              selected={range}
              onSelect={handleSelect}
              captionLayout='dropdown'
              fromYear={1900}
              toYear={2100}
              locale={vi}
              month={range?.from}
            />
          </PopoverContent>
        </Popover>
        <Popover open={quickSelectOpen} onOpenChange={setQuickSelectOpen}>
          <PopoverTrigger asChild>
            <Button
              variant='outline'
              disabled={disabled}
              className='shrink-0 whitespace-nowrap'
            >
              <CalendarIcon className={`${iconStyles.infoIcon} mr-2 shrink-0`} />
              <span>Chọn nhanh</span>
            </Button>
          </PopoverTrigger>
          <PopoverContent className='w-56 p-0' align='start'>
            <div className='py-1 max-h-96 overflow-y-auto'>
              {/* Quick options */}
              <button
                onClick={() => handleQuickSelect(getTodayRange())}
                className='w-full px-4 py-2 text-left text-sm hover:bg-gray-100 transition-colors'
              >
                Hôm nay
              </button>
              <button
                onClick={() => handleQuickSelect(getYesterdayRange())}
                className='w-full px-4 py-2 text-left text-sm hover:bg-gray-100 transition-colors'
              >
                Hôm qua
              </button>
              <button
                onClick={() => handleQuickSelect(getThisWeekRange())}
                className='w-full px-4 py-2 text-left text-sm hover:bg-gray-100 transition-colors'
              >
                Tuần này
              </button>
              <button
                onClick={() => handleQuickSelect(getLastWeekRange())}
                className='w-full px-4 py-2 text-left text-sm hover:bg-gray-100 transition-colors'
              >
                Tuần trước
              </button>
              <button
                onClick={() => handleQuickSelect(getThisMonthRange())}
                className='w-full px-4 py-2 text-left text-sm hover:bg-gray-100 transition-colors'
              >
                Tháng này
              </button>

              <div className='border-t my-1' />

              {/* By Month */}
              {monthNames.map((month, index) => (
                <button
                  key={index}
                  onClick={() => handleQuickSelect(getMonthRange(index + 1))}
                  className='w-full px-4 py-2 text-left text-sm hover:bg-gray-100 transition-colors'
                >
                  {month}
                </button>
              ))}

              <div className='border-t my-1' />

              {/* By Quarter */}
              {quarterNames.map((quarter, index) => (
                <button
                  key={index}
                  onClick={() => handleQuickSelect(getQuarterRange(index + 1))}
                  className='w-full px-4 py-2 text-left text-sm hover:bg-gray-100 transition-colors'
                >
                  {quarter}
                </button>
              ))}
            </div>
          </PopoverContent>
        </Popover>
      </div>
    </div>
  )
}

export default DatePickerRange

