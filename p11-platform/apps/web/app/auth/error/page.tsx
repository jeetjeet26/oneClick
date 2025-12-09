'use client'

import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { Suspense } from 'react'

function AuthErrorContent() {
  const searchParams = useSearchParams()
  const error = searchParams.get('error')

  const errorMessages: Record<string, { title: string; description: string }> = {
    auth_callback_error: {
      title: 'Authentication Failed',
      description: 'There was an error processing your sign in. Please try again.',
    },
    access_denied: {
      title: 'Access Denied',
      description: 'You do not have permission to access this resource.',
    },
    default: {
      title: 'Something went wrong',
      description: 'An unexpected error occurred. Please try again.',
    },
  }

  const { title, description } = errorMessages[error || 'default'] || errorMessages.default

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      {/* Decorative elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-red-500/20 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-orange-500/20 rounded-full blur-3xl" />
      </div>

      <div className="relative sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-slate-800/50 backdrop-blur-xl py-12 px-4 shadow-2xl shadow-black/20 sm:rounded-2xl sm:px-10 border border-slate-700/50 text-center">
          <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-red-500/20 border border-red-500/30">
            <svg className="h-8 w-8 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h3 className="mt-6 text-xl font-semibold text-white">{title}</h3>
          <p className="mt-3 text-slate-400">{description}</p>
          <div className="mt-8 space-y-3">
            <Link 
              href="/auth/login"
              className="block w-full px-4 py-3 text-sm font-semibold text-white bg-gradient-to-r from-indigo-500 to-purple-600 rounded-lg hover:from-indigo-600 hover:to-purple-700 transition-all"
            >
              Try again
            </Link>
            <Link 
              href="/"
              className="block text-sm font-medium text-slate-400 hover:text-slate-300 transition-colors"
            >
              Go to homepage
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function AuthErrorPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
        <div className="animate-spin h-8 w-8 border-4 border-indigo-500 border-t-transparent rounded-full"></div>
      </div>
    }>
      <AuthErrorContent />
    </Suspense>
  )
}

