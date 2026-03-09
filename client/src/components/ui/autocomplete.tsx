import * as React from "react"
import { useState, useRef, useEffect } from "react"
import { cn } from "@/lib/utils"
import { Input } from "./input"
import { ChevronDown, X } from "lucide-react"

export interface AutocompleteOption {
  value: string
  label: string
}

export interface AutocompleteProps {
  options: AutocompleteOption[]
  value?: string
  onChange?: (value: string) => void
  placeholder?: string
  className?: string
  disabled?: boolean
  id?: string
  /** Explicit display fallback when value doesn't match any option (e.g., legacy vehicle plate number) */
  displayValue?: string
}

export function Autocomplete({
  options,
  value,
  onChange,
  placeholder = "Chọn hoặc nhập...",
  className,
  disabled,
  id,
  displayValue,
}: AutocompleteProps) {
  const [open, setOpen] = useState(false)
  const [inputValue, setInputValue] = useState("")
  const [isCleared, setIsCleared] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Sync input value with selected value
  useEffect(() => {
    // Skip if user just cleared the input - prevents race condition
    if (isCleared) return

    if (value) {
      const selected = options.find(opt => opt.value === value)
      if (selected) {
        setInputValue(selected.label)
      } else if (displayValue) {
        // Use explicit fallback (e.g., plate number for legacy vehicles)
        setInputValue(displayValue)
      } else {
        // Last resort: show raw value
        setInputValue(value)
      }
    } else {
      setInputValue("")
    }
  }, [value, options, displayValue, isCleared])

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  // Filter options based on input
  const filteredOptions = options
    .filter(option =>
      option.label.toLowerCase().includes(inputValue.toLowerCase())
    )

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setIsCleared(false)  // Reset flag when user types
    const newValue = e.target.value
    setInputValue(newValue)
    if (!open) setOpen(true)
  }

  const handleSelect = (option: AutocompleteOption) => {
    setIsCleared(false)  // Reset flag when user selects new option
    setInputValue(option.label)
    onChange?.(option.value)
    setOpen(false)
  }

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation()
    e.preventDefault()
    setIsCleared(true)  // Prevent useEffect from resetting value
    setInputValue("")
    onChange?.("")
    // Don't open dropdown after clearing - prevents accidental clicks
    setOpen(false)
    inputRef.current?.focus()
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      setOpen(false)
    }
    if (e.key === "Enter") {
      setOpen(false)
    }
  }

  return (
    <div ref={containerRef} className={cn("relative", className)}>
      <Input
        ref={inputRef}
        id={id}
        value={inputValue}
        onChange={handleInputChange}
        onKeyDown={handleKeyDown}
        onFocus={() => setOpen(true)}
        onClick={() => setOpen(true)}
        placeholder={placeholder}
        disabled={disabled}
        className="pr-16"
        autoComplete="off"
      />
      <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
        {inputValue && !disabled && (
          <button
            type="button"
            onClick={handleClear}
            className="p-1 hover:bg-gray-100 rounded text-gray-400 hover:text-gray-600"
          >
            <X className="h-4 w-4" />
          </button>
        )}
        <button
          type="button"
          onClick={() => {
            setOpen(!open)
            inputRef.current?.focus()
          }}
          className="p-1 hover:bg-gray-100 rounded text-gray-400 hover:text-gray-600"
        >
          <ChevronDown className={cn("h-4 w-4 transition-transform", open && "rotate-180")} />
        </button>
      </div>
      
      {open && (
        <div
          className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-60 overflow-y-auto"
          onClick={(e) => e.stopPropagation()}
        >
          {filteredOptions.length === 0 ? (
            <div className="py-3 px-4 text-sm text-gray-500">
              Không tìm thấy kết quả
            </div>
          ) : (
            filteredOptions.map((option) => (
              <div
                key={option.value}
                onClick={(e) => {
                  e.stopPropagation()
                  handleSelect(option)
                }}
                className={cn(
                  "px-4 py-2 text-sm cursor-pointer hover:bg-blue-50",
                  value === option.value && "bg-blue-100 font-medium"
                )}
              >
                {option.label}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  )
}
