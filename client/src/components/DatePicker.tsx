import React, { useState } from "react";
import { format } from "date-fns";
import { vi } from "date-fns/locale";
import { CalendarIcon, Clock } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Input } from "@/components/ui/input";

// Types
interface DatePickerProps {
  date: Date | null;
  onDateChange: (date: Date | undefined) => void;
  placeholder?: string;
  disabled?: boolean;
}

interface DateTimePickerProps {
  date: Date | null;
  onDateChange: (date: Date | undefined) => void;
  placeholder?: string;
}

// Component DatePicker (dd/MM/yyyy)
export function DatePicker({
  date,
  onDateChange,
  placeholder = "Chọn ngày",
  disabled = false,
}: DatePickerProps) {
  const [open, setOpen] = useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className="w-full justify-between text-left font-normal"
          disabled={disabled}
        >
          {date ? format(date, "dd/MM/yyyy", { locale: vi }) : placeholder}
          <CalendarIcon className="ml-2 h-4 w-4" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={date || undefined}
          onSelect={(selectedDate) => {
            onDateChange(selectedDate);
            setOpen(false);
          }}
          captionLayout="dropdown"
          fromYear={1900}
          toYear={2100}
        />
      </PopoverContent>
    </Popover>
  );
}

// Component DateTimePicker (hh:mm dd/MM/yyyy)
export function DateTimePicker({
  date,
  onDateChange,
  placeholder = "Chọn ngày và giờ",
}: DateTimePickerProps) {
  const [timeValue, setTimeValue] = useState<string>(
    date ? format(date, "HH:mm") : "00:00"
  );

  // Sync timeValue when date prop changes (e.g., when editing a record)
  // Only update if the formatted time is different to prevent unnecessary state updates
  React.useEffect(() => {
    if (date) {
      const formattedTime = format(date, "HH:mm");
      if (formattedTime !== timeValue) {
        setTimeValue(formattedTime);
      }
    }
  }, [date, timeValue]);

  const handleDateSelect = (selectedDate: Date | undefined) => {
    if (selectedDate) {
      const [hours, minutes] = timeValue.split(":");
      selectedDate.setHours(parseInt(hours), parseInt(minutes));
      onDateChange(selectedDate);
    }
  };

  const handleTimeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newTime = e.target.value;
    setTimeValue(newTime);

    if (date) {
      const [hours, minutes] = newTime.split(":");
      const newDate = new Date(date);
      newDate.setHours(parseInt(hours), parseInt(minutes));
      onDateChange(newDate);
    }
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className="w-full justify-between font-normal"
        >
          {date
            ? format(date, "HH:mm dd/MM/yyyy", { locale: vi })
            : placeholder}
          <Clock className="mr-2 h-4 w-4 " />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <div className="p-3 space-y-3">
          <div className="border-b pb-3">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Chọn giờ
            </label>
            <Input
              type="time"
              value={timeValue}
              onChange={handleTimeChange}
              className="w-full"
            />
          </div>
          <Calendar
            mode="single"
            selected={date || undefined}
            onSelect={handleDateSelect}
            initialFocus
            captionLayout="dropdown"
            fromYear={1900}
            toYear={2100}
          />
        </div>
      </PopoverContent>
    </Popover>
  );
}
