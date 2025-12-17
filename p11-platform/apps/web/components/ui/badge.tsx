import * as React from "react"

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'secondary' | 'destructive' | 'outline' | 'success'
}

export function Badge({ className = '', variant = 'default', ...props }: BadgeProps) {
  const variantClasses = {
    default: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300',
    secondary: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
    destructive: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
    outline: 'border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300',
    success: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300'
  }

  return (
    <div
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold transition-colors ${variantClasses[variant]} ${className}`}
      {...props}
    />
  )
}








