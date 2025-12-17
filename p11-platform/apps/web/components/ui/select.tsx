import * as React from "react"

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  value?: string
  onValueChange?: (value: string) => void
  children?: React.ReactNode
}

export function Select({ value, onValueChange, children, className = '', ...props }: SelectProps) {
  return (
    <select
      value={value}
      onChange={(e) => onValueChange?.(e.target.value)}
      className={`w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent ${className}`}
      {...props}
    >
      {children}
    </select>
  )
}

export function SelectTrigger({ id, className = '' }: { id?: string; className?: string }) {
  // This is just a placeholder for API compatibility - not actually rendered
  return null
}

export function SelectValue({ placeholder }: { placeholder?: string }) {
  // This is just a placeholder for API compatibility - not actually rendered
  return null
}

export function SelectContent({ children }: { children?: React.ReactNode }) {
  // This passes through the children (option elements)
  return <>{children}</>
}

export function SelectItem({ value, children, ...props }: React.OptionHTMLAttributes<HTMLOptionElement>) {
  return (
    <option value={value} {...props}>
      {children}
    </option>
  )
}








