'use client'

import { useState, useEffect } from 'react'
import {
  X,
  Building2,
  MapPin,
  Phone,
  ExternalLink,
  Calendar,
  Home,
  DollarSign,
  TrendingUp,
  TrendingDown,
  Edit2,
  RefreshCw
} from 'lucide-react'

interface CompetitorUnit {
  id: string
  unitType: string
  bedrooms: number
  bathrooms: number
  sqftMin: number | null
  sqftMax: number | null
  rentMin: number | null
  rentMax: number | null
  availableCount: number
  moveInSpecials: string | null
  lastUpdatedAt: string
}

interface Competitor {
  id: string
  name: string
  address: string | null
  websiteUrl: string | null
  phone: string | null
  unitsCount: number | null
  yearBuilt: number | null
  propertyType: string
  amenities: string[]
  photos: string[]
  notes: string | null
  isActive: boolean
  lastScrapedAt: string | null
  units?: CompetitorUnit[]
}

interface CompetitorDetailDrawerProps {
  competitor: Competitor | null
  onClose: () => void
  onEdit: (competitor: Competitor) => void
}

export function CompetitorDetailDrawer({ 
  competitor, 
  onClose,
  onEdit
}: CompetitorDetailDrawerProps) {
  const [units, setUnits] = useState<CompetitorUnit[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (competitor) {
      if (competitor.units) {
        setUnits(competitor.units)
      } else {
        fetchUnits()
      }
    }
  }, [competitor?.id])

  const fetchUnits = async () => {
    if (!competitor) return

    setLoading(true)
    try {
      const res = await fetch(`/api/marketvision/units?competitorId=${competitor.id}`)
      const data = await res.json()

      if (res.ok) {
        setUnits(data.units || [])
      }
    } catch (err) {
      console.error('Error fetching units:', err)
    } finally {
      setLoading(false)
    }
  }

  if (!competitor) return null

  // Calculate stats
  const avgRent = units.length > 0
    ? Math.round(units.filter(u => u.rentMin).map(u => u.rentMin!).reduce((a, b) => a + b, 0) / units.filter(u => u.rentMin).length)
    : null

  const totalAvailable = units.reduce((sum, u) => sum + u.availableCount, 0)

  return (
    <div className="fixed inset-y-0 right-0 w-[480px] bg-white dark:bg-gray-800 shadow-2xl border-l border-gray-200 dark:border-gray-700 z-50 flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-start justify-between">
        <div className="flex items-start gap-3">
          <div className="p-2 bg-indigo-100 dark:bg-indigo-900/30 rounded-lg">
            <Building2 className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
          </div>
          <div>
            <h2 className="font-semibold text-gray-900 dark:text-white text-lg">
              {competitor.name}
            </h2>
            {competitor.address && (
              <p className="text-sm text-gray-500 flex items-center gap-1 mt-1">
                <MapPin className="w-3.5 h-3.5" />
                {competitor.address}
              </p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => onEdit(competitor)}
            className="p-2 text-gray-400 hover:text-indigo-600 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            <Edit2 className="w-5 h-5" />
          </button>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {/* Quick Stats */}
        <div className="grid grid-cols-3 gap-4 p-4 bg-gray-50 dark:bg-gray-700/30">
          <div className="text-center">
            <p className="text-2xl font-bold text-gray-900 dark:text-white">
              {avgRent ? `$${avgRent.toLocaleString()}` : '-'}
            </p>
            <p className="text-xs text-gray-500">Avg Rent</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-gray-900 dark:text-white">
              {units.length}
            </p>
            <p className="text-xs text-gray-500">Unit Types</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-gray-900 dark:text-white">
              {totalAvailable}
            </p>
            <p className="text-xs text-gray-500">Available</p>
          </div>
        </div>

        {/* Property Info */}
        <div className="p-4 border-b border-gray-100 dark:border-gray-700">
          <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
            Property Details
          </h3>
          <div className="grid grid-cols-2 gap-4 text-sm">
            {competitor.unitsCount && (
              <div>
                <p className="text-gray-500">Total Units</p>
                <p className="font-medium text-gray-900 dark:text-white">
                  {competitor.unitsCount}
                </p>
              </div>
            )}
            {competitor.yearBuilt && (
              <div>
                <p className="text-gray-500">Year Built</p>
                <p className="font-medium text-gray-900 dark:text-white">
                  {competitor.yearBuilt}
                </p>
              </div>
            )}
            <div>
              <p className="text-gray-500">Property Type</p>
              <p className="font-medium text-gray-900 dark:text-white capitalize">
                {competitor.propertyType}
              </p>
            </div>
            {competitor.lastScrapedAt && (
              <div>
                <p className="text-gray-500">Last Updated</p>
                <p className="font-medium text-gray-900 dark:text-white">
                  {new Date(competitor.lastScrapedAt).toLocaleDateString()}
                </p>
              </div>
            )}
          </div>

          {/* Contact Links */}
          <div className="flex items-center gap-3 mt-4">
            {competitor.websiteUrl && (
              <a
                href={competitor.websiteUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 rounded-lg hover:bg-indigo-100 dark:hover:bg-indigo-900/30 transition-colors"
              >
                <ExternalLink className="w-4 h-4" />
                Website
              </a>
            )}
            {competitor.phone && (
              <a
                href={`tel:${competitor.phone}`}
                className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 rounded-lg hover:bg-green-100 dark:hover:bg-green-900/30 transition-colors"
              >
                <Phone className="w-4 h-4" />
                Call
              </a>
            )}
          </div>
        </div>

        {/* Amenities */}
        {competitor.amenities.length > 0 && (
          <div className="p-4 border-b border-gray-100 dark:border-gray-700">
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
              Amenities
            </h3>
            <div className="flex flex-wrap gap-2">
              {competitor.amenities.map((amenity, i) => (
                <span
                  key={i}
                  className="px-2.5 py-1 text-xs bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded-full"
                >
                  {amenity}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Unit Pricing */}
        <div className="p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
              Unit Pricing
            </h3>
            <button
              onClick={fetchUnits}
              className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>

          {loading ? (
            <div className="py-8 text-center">
              <RefreshCw className="w-6 h-6 animate-spin text-indigo-500 mx-auto" />
            </div>
          ) : units.length === 0 ? (
            <div className="py-8 text-center">
              <Home className="w-8 h-8 text-gray-300 mx-auto mb-2" />
              <p className="text-sm text-gray-500">No unit data available</p>
            </div>
          ) : (
            <div className="space-y-3">
              {units
                .sort((a, b) => a.bedrooms - b.bedrooms)
                .map((unit) => (
                  <div
                    key={unit.id}
                    className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-gray-900 dark:text-white">
                          {unit.unitType}
                        </span>
                        {unit.availableCount > 0 && (
                          <span className="px-2 py-0.5 text-xs bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded-full">
                            {unit.availableCount} available
                          </span>
                        )}
                      </div>
                      <div className="text-right">
                        {unit.rentMin ? (
                          <p className="font-semibold text-gray-900 dark:text-white">
                            ${unit.rentMin.toLocaleString()}
                            {unit.rentMax && unit.rentMax !== unit.rentMin && (
                              <span className="text-gray-500 font-normal">
                                {' '}- ${unit.rentMax.toLocaleString()}
                              </span>
                            )}
                          </p>
                        ) : (
                          <p className="text-gray-400">No pricing</p>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-4 text-xs text-gray-500">
                      <span>
                        {unit.bedrooms} bed • {unit.bathrooms} bath
                      </span>
                      {unit.sqftMin && (
                        <span>
                          {unit.sqftMin.toLocaleString()}
                          {unit.sqftMax && unit.sqftMax !== unit.sqftMin && (
                            <> - {unit.sqftMax.toLocaleString()}</>
                          )} sq ft
                        </span>
                      )}
                      {unit.rentMin && unit.sqftMin && (
                        <span className="text-indigo-600 dark:text-indigo-400">
                          ${(unit.rentMin / unit.sqftMin).toFixed(2)}/sq ft
                        </span>
                      )}
                    </div>

                    {unit.moveInSpecials && (
                      <div className="mt-2 px-2 py-1 bg-amber-50 dark:bg-amber-900/20 rounded text-xs text-amber-700 dark:text-amber-300">
                        🎁 {unit.moveInSpecials}
                      </div>
                    )}
                  </div>
                ))}
            </div>
          )}
        </div>

        {/* Notes */}
        {competitor.notes && (
          <div className="p-4 border-t border-gray-100 dark:border-gray-700">
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
              Notes
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 whitespace-pre-wrap">
              {competitor.notes}
            </p>
          </div>
        )}
      </div>
    </div>
  )
}

