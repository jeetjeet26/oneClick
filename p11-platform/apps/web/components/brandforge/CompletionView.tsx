'use client'

import { CheckCircle, Download, Eye } from 'lucide-react'

interface CompletionViewProps {
  brandAssetId: string
}

export function CompletionView({ brandAssetId }: CompletionViewProps) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-8 text-center">
      <div className="mb-6">
        <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <CheckCircle className="w-12 h-12 text-green-600" />
        </div>
        <h2 className="text-2xl font-bold text-slate-900 mb-2">
          Brand Book Complete!
        </h2>
        <p className="text-slate-600">
          Your comprehensive brand book has been generated and saved to your knowledge base.
        </p>
      </div>

      <div className="flex gap-4 justify-center">
        <a
          href={`/dashboard/brandforge/${brandAssetId}`}
          className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 flex items-center gap-2"
        >
          <Eye className="w-4 h-4" />
          View Brand Book
        </a>
        <button
          onClick={() => window.location.reload()}
          className="px-6 py-2 border border-slate-300 rounded-lg hover:bg-slate-50 flex items-center gap-2"
        >
          <Download className="w-4 h-4" />
          Download PDF
        </button>
      </div>
    </div>
  )
}














