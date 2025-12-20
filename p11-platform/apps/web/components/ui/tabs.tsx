import * as React from "react"

export interface TabsProps {
  value?: string
  onValueChange?: (value: string) => void
  className?: string
  children?: React.ReactNode
}

export function Tabs({ value, onValueChange, className = '', children }: TabsProps) {
  return (
    <div className={className}>
      {React.Children.map(children, child => {
        if (React.isValidElement(child)) {
          // Pass onValueChange only to TabsList (for triggers), currentValue to both
          if (child.type === TabsList) {
            return React.cloneElement(child as any, { currentValue: value, onValueChange })
          }
          if (child.type === TabsContent) {
            return React.cloneElement(child as any, { currentValue: value })
          }
        }
        return child
      })}
    </div>
  )
}

export interface TabsListProps extends React.HTMLAttributes<HTMLDivElement> {
  currentValue?: string
  onValueChange?: (value: string) => void
}

export function TabsList({ className = '', children, currentValue, onValueChange, ...props }: TabsListProps) {
  return (
    <div
      className={`inline-flex h-10 items-center justify-center rounded-lg bg-gray-100 dark:bg-gray-800 p-1 text-gray-500 ${className}`}
      {...props}
    >
      {React.Children.map(children, child => {
        if (React.isValidElement(child) && child.type === TabsTrigger) {
          return React.cloneElement(child as any, { currentValue, onValueChange })
        }
        return child
      })}
    </div>
  )
}

export interface TabsTriggerProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  value: string
  currentValue?: string
  onValueChange?: (value: string) => void
}

export function TabsTrigger({ 
  value, 
  currentValue, 
  onValueChange, 
  className = '', 
  children, 
  ...props 
}: TabsTriggerProps) {
  const isActive = value === currentValue

  return (
    <button
      onClick={() => onValueChange?.(value)}
      className={`inline-flex items-center justify-center whitespace-nowrap rounded-md px-3 py-1.5 text-sm font-medium transition-all focus:outline-none disabled:pointer-events-none disabled:opacity-50 ${
        isActive
          ? 'bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 shadow-sm'
          : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100'
      } ${className}`}
      {...props}
    >
      {children}
    </button>
  )
}

export interface TabsContentProps extends React.HTMLAttributes<HTMLDivElement> {
  value: string
  currentValue?: string
  onValueChange?: (value: string) => void // Accept but ignore (for cloneElement compatibility)
}

export function TabsContent({ 
  value, 
  currentValue, 
  onValueChange: _onValueChange, // Destructure to prevent spreading to div
  className = '', 
  children, 
  ...props 
}: TabsContentProps) {
  if (value !== currentValue) return null

  return (
    <div
      className={`mt-4 focus:outline-none ${className}`}
      {...props}
    >
      {children}
    </div>
  )
}














