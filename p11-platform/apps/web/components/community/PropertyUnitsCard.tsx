'use client'

import { DollarSign, Home, Maximize2 } from 'lucide-react'

type PropertyUnit = {
  id: string
  unit_type: string
  bedrooms: number
  bathrooms: number
  sqft_min: number | null
  sqft_max: number | null
  rent_min: number | null
  rent_max: number | null
  available_count: number
  move_in_specials: string | null
  last_updated_at: string
}

type Props = {
  units: PropertyUnit[]
  propertyId: string
}

export function PropertyUnitsCard({ units, propertyId }: Props) {
  const formatCurrency = (amount: number | null) => {
    if (!amount) return 'N/A'
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0
    }).format(amount)
  }

  const formatSqft = (min: number | null, max: number | null) => {
    if (!min && !max) return 'N/A'
    if (min === max || !max) return `${min?.toLocaleString()} sq ft`
    return `${min?.toLocaleString()} - ${max?.toLocaleString()} sq ft`
  }

  if (units.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <h3 className="font-semibold text-slate-900 mb-4 flex items-center gap-2">
          <Home className="h-5 w-5 text-slate-400" />
          Floor Plans & Pricing
        </h3>
        <p className="text-sm text-slate-500 text-center py-8">
          No floor plan data available. Click "Scrape Pricing" to fetch from your website.
        </p>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-6">
      <h3 className="font-semibold text-slate-900 mb-4 flex items-center gap-2">
        <Home className="h-5 w-5 text-slate-400" />
        Floor Plans & Pricing
      </h3>
      
      <div className="space-y-3">
        {units.map((unit) => (
          <div
            key={unit.id}
            className="border border-slate-200 rounded-lg p-4 hover:border-indigo-300 transition-colors"
          >
            <div className="flex items-start justify-between mb-2">
              <div>
                <h4 className="font-medium text-slate-900">{unit.unit_type}</h4>
                <p className="text-sm text-slate-500">
                  {unit.bedrooms} bed • {unit.bathrooms} bath
                </p>
              </div>
              {unit.available_count > 0 && (
                <span className="px-2 py-1 bg-emerald-50 text-emerald-700 text-xs font-medium rounded">
                  {unit.available_count} available
                </span>
              )}
            </div>
            
            <div className="grid grid-cols-2 gap-4 mt-3">
              <div className="flex items-center gap-2 text-sm">
                <DollarSign className="h-4 w-4 text-amber-500" />
                <span className="text-slate-600">
                  {formatCurrency(unit.rent_min)}
                  {unit.rent_max && unit.rent_max !== unit.rent_min && ` - ${formatCurrency(unit.rent_max)}`}
                </span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Maximize2 className="h-4 w-4 text-blue-500" />
                <span className="text-slate-600">
                  {formatSqft(unit.sqft_min, unit.sqft_max)}
                </span>
              </div>
            </div>
            
            {unit.move_in_specials && (
              <div className="mt-3 p-2 bg-purple-50 rounded text-xs text-purple-700">
                🎉 {unit.move_in_specials}
              </div>
            )}
          </div>
        ))}
      </div>
      
      <p className="text-xs text-slate-400 mt-4 text-center">
        Last updated: {new Date(units[0]?.last_updated_at).toLocaleDateString()}
      </p>
    </div>
  )
}

