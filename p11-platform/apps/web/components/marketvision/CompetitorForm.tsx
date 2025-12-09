'use client'

import { useState } from 'react'
import { 
  Building2, 
  X, 
  Plus,
  Trash2,
  DollarSign
} from 'lucide-react'

interface UnitInput {
  unitType: string
  bedrooms: number
  bathrooms: number
  sqftMin: string
  sqftMax: string
  rentMin: string
  rentMax: string
  availableCount: string
}

interface CompetitorFormData {
  name: string
  address: string
  websiteUrl: string
  phone: string
  unitsCount: string
  yearBuilt: string
  propertyType: string
  amenities: string[]
  notes: string
  units: UnitInput[]
}

interface CompetitorFormProps {
  propertyId: string
  initialData?: Partial<CompetitorFormData> & { id?: string }
  onSubmit: (data: CompetitorFormData) => Promise<void>
  onClose: () => void
  isEdit?: boolean
}

const AMENITIES_OPTIONS = [
  'Pool', 'Fitness Center', 'Dog Park', 'Clubhouse', 'Business Center',
  'Package Lockers', 'EV Charging', 'Garage Parking', 'Covered Parking',
  'In-Unit Washer/Dryer', 'Balcony/Patio', 'Walk-In Closets', 'Stainless Appliances',
  'Granite Countertops', 'Hardwood Floors', 'Valet Trash', 'Gated Access',
  'Playground', 'Tennis Courts', 'Volleyball Court', 'Grilling Areas'
]

const UNIT_TYPES = ['Studio', '1BR', '2BR', '3BR', '4BR+']

export function CompetitorForm({ 
  propertyId, 
  initialData, 
  onSubmit, 
  onClose,
  isEdit = false
}: CompetitorFormProps) {
  const [formData, setFormData] = useState<CompetitorFormData>({
    name: initialData?.name || '',
    address: initialData?.address || '',
    websiteUrl: initialData?.websiteUrl || '',
    phone: initialData?.phone || '',
    unitsCount: initialData?.unitsCount?.toString() || '',
    yearBuilt: initialData?.yearBuilt?.toString() || '',
    propertyType: initialData?.propertyType || 'apartment',
    amenities: initialData?.amenities || [],
    notes: initialData?.notes || '',
    units: initialData?.units || []
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showUnits, setShowUnits] = useState(formData.units.length > 0)

  const handleChange = (field: keyof CompetitorFormData, value: string | string[]) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const toggleAmenity = (amenity: string) => {
    const current = formData.amenities
    const updated = current.includes(amenity)
      ? current.filter(a => a !== amenity)
      : [...current, amenity]
    handleChange('amenities', updated)
  }

  const addUnit = () => {
    setFormData(prev => ({
      ...prev,
      units: [...prev.units, {
        unitType: '1BR',
        bedrooms: 1,
        bathrooms: 1,
        sqftMin: '',
        sqftMax: '',
        rentMin: '',
        rentMax: '',
        availableCount: ''
      }]
    }))
    setShowUnits(true)
  }

  const removeUnit = (index: number) => {
    setFormData(prev => ({
      ...prev,
      units: prev.units.filter((_, i) => i !== index)
    }))
  }

  const updateUnit = (index: number, field: keyof UnitInput, value: string | number) => {
    setFormData(prev => ({
      ...prev,
      units: prev.units.map((unit, i) => 
        i === index ? { ...unit, [field]: value } : unit
      )
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.name.trim()) {
      setError('Competitor name is required')
      return
    }

    setLoading(true)
    setError(null)

    try {
      await onSubmit(formData)
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save competitor')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
            <Building2 className="w-5 h-5 text-indigo-500" />
            {isEdit ? 'Edit Competitor' : 'Add Competitor'}
          </h2>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="overflow-y-auto max-h-[calc(90vh-140px)]">
          <div className="p-6 space-y-6">
            {error && (
              <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-600 dark:text-red-400 text-sm">
                {error}
              </div>
            )}

            {/* Basic Info */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Property Name *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => handleChange('name', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-200 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-gray-700"
                  placeholder="e.g., The Residences at Downtown"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Address
                </label>
                <input
                  type="text"
                  value={formData.address}
                  onChange={(e) => handleChange('address', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-200 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-gray-700"
                  placeholder="123 Main St, City, State 12345"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Website
                </label>
                <input
                  type="url"
                  value={formData.websiteUrl}
                  onChange={(e) => handleChange('websiteUrl', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-200 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-gray-700"
                  placeholder="https://..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Phone
                </label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => handleChange('phone', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-200 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-gray-700"
                  placeholder="(555) 123-4567"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Total Units
                </label>
                <input
                  type="number"
                  value={formData.unitsCount}
                  onChange={(e) => handleChange('unitsCount', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-200 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-gray-700"
                  placeholder="e.g., 250"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Year Built
                </label>
                <input
                  type="number"
                  value={formData.yearBuilt}
                  onChange={(e) => handleChange('yearBuilt', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-200 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-gray-700"
                  placeholder="e.g., 2020"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Property Type
                </label>
                <select
                  value={formData.propertyType}
                  onChange={(e) => handleChange('propertyType', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-200 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-gray-700"
                >
                  <option value="apartment">Apartment</option>
                  <option value="townhome">Townhome</option>
                  <option value="mixed">Mixed Use</option>
                </select>
              </div>
            </div>

            {/* Amenities */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Amenities
              </label>
              <div className="flex flex-wrap gap-2">
                {AMENITIES_OPTIONS.map(amenity => (
                  <button
                    key={amenity}
                    type="button"
                    onClick={() => toggleAmenity(amenity)}
                    className={`px-3 py-1.5 text-sm rounded-full border transition-colors ${
                      formData.amenities.includes(amenity)
                        ? 'bg-indigo-100 dark:bg-indigo-900/30 border-indigo-300 dark:border-indigo-600 text-indigo-700 dark:text-indigo-300'
                        : 'bg-gray-50 dark:bg-gray-700 border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-600'
                    }`}
                  >
                    {amenity}
                  </button>
                ))}
              </div>
            </div>

            {/* Unit Pricing */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Unit Pricing
                </label>
                <button
                  type="button"
                  onClick={addUnit}
                  className="flex items-center gap-1 text-sm text-indigo-600 hover:text-indigo-700"
                >
                  <Plus className="w-4 h-4" />
                  Add Unit Type
                </button>
              </div>

              {showUnits && formData.units.length > 0 && (
                <div className="space-y-3">
                  {formData.units.map((unit, index) => (
                    <div 
                      key={index}
                      className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4 space-y-3"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <select
                            value={unit.unitType}
                            onChange={(e) => {
                              updateUnit(index, 'unitType', e.target.value)
                              // Auto-set bedrooms based on type
                              const beds = e.target.value === 'Studio' ? 0 
                                : e.target.value === '4BR+' ? 4 
                                : parseInt(e.target.value)
                              updateUnit(index, 'bedrooms', beds)
                            }}
                            className="px-3 py-1.5 text-sm border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700"
                          >
                            {UNIT_TYPES.map(type => (
                              <option key={type} value={type}>{type}</option>
                            ))}
                          </select>
                        </div>
                        <button
                          type="button"
                          onClick={() => removeUnit(index)}
                          className="p-1 text-gray-400 hover:text-red-500 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>

                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        <div>
                          <label className="block text-xs text-gray-500 mb-1">
                            Rent Min
                          </label>
                          <div className="relative">
                            <DollarSign className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                            <input
                              type="number"
                              value={unit.rentMin}
                              onChange={(e) => updateUnit(index, 'rentMin', e.target.value)}
                              className="w-full pl-7 pr-3 py-1.5 text-sm border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700"
                              placeholder="1200"
                            />
                          </div>
                        </div>
                        <div>
                          <label className="block text-xs text-gray-500 mb-1">
                            Rent Max
                          </label>
                          <div className="relative">
                            <DollarSign className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                            <input
                              type="number"
                              value={unit.rentMax}
                              onChange={(e) => updateUnit(index, 'rentMax', e.target.value)}
                              className="w-full pl-7 pr-3 py-1.5 text-sm border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700"
                              placeholder="1500"
                            />
                          </div>
                        </div>
                        <div>
                          <label className="block text-xs text-gray-500 mb-1">
                            Sq Ft Min
                          </label>
                          <input
                            type="number"
                            value={unit.sqftMin}
                            onChange={(e) => updateUnit(index, 'sqftMin', e.target.value)}
                            className="w-full px-3 py-1.5 text-sm border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700"
                            placeholder="650"
                          />
                        </div>
                        <div>
                          <label className="block text-xs text-gray-500 mb-1">
                            Available
                          </label>
                          <input
                            type="number"
                            value={unit.availableCount}
                            onChange={(e) => updateUnit(index, 'availableCount', e.target.value)}
                            className="w-full px-3 py-1.5 text-sm border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700"
                            placeholder="5"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {!showUnits && (
                <button
                  type="button"
                  onClick={addUnit}
                  className="w-full p-4 border-2 border-dashed border-gray-200 dark:border-gray-600 rounded-lg text-gray-500 hover:text-indigo-600 hover:border-indigo-300 transition-colors text-sm"
                >
                  Click to add unit pricing information
                </button>
              )}
            </div>

            {/* Notes */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Notes
              </label>
              <textarea
                value={formData.notes}
                onChange={(e) => handleChange('notes', e.target.value)}
                rows={3}
                className="w-full px-4 py-2 border border-gray-200 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-gray-700 resize-none"
                placeholder="Any additional notes about this competitor..."
              />
            </div>
          </div>

          {/* Footer */}
          <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors disabled:opacity-50"
            >
              {loading ? 'Saving...' : isEdit ? 'Save Changes' : 'Add Competitor'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

