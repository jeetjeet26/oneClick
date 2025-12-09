'use client'

import { CheckCircle2, Sparkles, Rocket } from 'lucide-react'

export function CompleteStep() {
  return (
    <div className="animate-in fade-in zoom-in-95 duration-500 text-center py-12">
      <div className="relative inline-block mb-8">
        <div className="absolute inset-0 animate-ping">
          <div className="inline-flex items-center justify-center w-24 h-24 rounded-full bg-emerald-400/20" />
        </div>
        <div className="relative inline-flex items-center justify-center w-24 h-24 rounded-full bg-gradient-to-br from-emerald-400 to-green-500 shadow-xl shadow-emerald-500/30">
          <CheckCircle2 className="w-12 h-12 text-white" />
        </div>
      </div>

      <h1 className="text-4xl font-bold text-white mb-4">
        You&apos;re all set! 🎉
      </h1>
      <p className="text-slate-400 text-xl mb-8 max-w-md mx-auto">
        Your community is being set up. Taking you to your dashboard...
      </p>

      <div className="flex justify-center gap-6 mb-8">
        <div className="flex items-center gap-2 text-emerald-400">
          <CheckCircle2 size={18} />
          <span className="text-sm">Organization created</span>
        </div>
        <div className="flex items-center gap-2 text-emerald-400">
          <CheckCircle2 size={18} />
          <span className="text-sm">Community configured</span>
        </div>
        <div className="flex items-center gap-2 text-emerald-400">
          <Rocket size={18} />
          <span className="text-sm">AI training started</span>
        </div>
      </div>

      <div className="flex justify-center">
        <div className="flex items-center gap-3 px-6 py-3 bg-slate-800/50 rounded-xl">
          <div className="w-6 h-6 border-3 border-emerald-500 border-t-transparent rounded-full animate-spin" />
          <span className="text-slate-400">Redirecting to dashboard</span>
          <Sparkles className="w-5 h-5 text-amber-400" />
        </div>
      </div>
    </div>
  )
}

