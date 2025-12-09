'use client'

import { Building, Building2, Globe, Star } from 'lucide-react'

interface PlatformIconProps {
  platform: string
  size?: number
  className?: string
}

export function PlatformIcon({ platform, size = 18, className = '' }: PlatformIconProps) {
  // Platform-specific colors and icons
  const platformConfig: Record<string, { icon: React.ElementType; color: string; bgColor: string }> = {
    google: {
      icon: () => (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
          <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
          <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
          <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
          <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
        </svg>
      ),
      color: 'text-blue-600',
      bgColor: 'bg-blue-50 dark:bg-blue-900/20'
    },
    yelp: {
      icon: () => (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="#D32323">
          <path d="M20.16 12.594l-4.995 1.433c-.96.276-1.74-.8-1.176-1.63l2.904-4.29c.564-.83 1.868-.53 1.968.46l.515 5.037c.1.99-.92 1.66-1.93 1.39l.715.6zM12.56 15.58l-1.2 4.937c-.232.96-1.543 1.01-1.96.075L6.94 14.8c-.416-.934.4-1.87 1.23-1.41l4.29 2.357c.83.456.836 1.7.1 1.833zm-1.41-6.893l-5.037.515c-.99.1-1.59-1.068-.91-1.763l4.29-4.29c.68-.68 1.85-.08 1.763.91l-.516 5.037c-.1.99-.88 1.585-1.63 1.59h.04zm8.98 1.206l-4.29-2.904c-.83-.564-.53-1.868.46-1.968l5.037-.515c.99-.1 1.59 1.068.91 1.763l-4.29 4.29c-.68.68-1.85.08-1.763-.91l.936.244zm-8.51 6.79L6.59 18.9c-.834.564-1.868-.53-1.39-1.39l2.77-4.995c.477-.862 1.81-.6 1.93.38l.515 5.037c.1.98-.68 1.58-1.31 1.75l.935-.002z"/>
        </svg>
      ),
      color: 'text-red-600',
      bgColor: 'bg-red-50 dark:bg-red-900/20'
    },
    apartments_com: {
      icon: Building,
      color: 'text-teal-600',
      bgColor: 'bg-teal-50 dark:bg-teal-900/20'
    },
    facebook: {
      icon: () => (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="#1877F2">
          <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
        </svg>
      ),
      color: 'text-blue-600',
      bgColor: 'bg-blue-50 dark:bg-blue-900/20'
    },
    other: {
      icon: Globe,
      color: 'text-slate-600',
      bgColor: 'bg-slate-100 dark:bg-slate-700'
    }
  }

  const config = platformConfig[platform] || platformConfig.other
  const Icon = config.icon

  return (
    <div className={`inline-flex items-center justify-center w-8 h-8 rounded-lg ${config.bgColor} ${className}`}>
      <Icon size={size} className={config.color} />
    </div>
  )
}

export function PlatformName({ platform }: { platform: string }) {
  const names: Record<string, string> = {
    google: 'Google',
    yelp: 'Yelp',
    apartments_com: 'Apartments.com',
    facebook: 'Facebook',
    other: 'Other'
  }
  return <span>{names[platform] || platform}</span>
}

