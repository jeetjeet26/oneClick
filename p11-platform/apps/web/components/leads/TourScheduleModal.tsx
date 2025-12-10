'use client'

import { useState, useEffect } from 'react'
import {
  Calendar,
  Clock,
  X,
  Video,
  MapPin,
  Key,
  Send,
  Check,
  Loader2,
  AlertCircle,
  CalendarCheck
} from 'lucide-react'
import { format, addDays, setHours, setMinutes, startOfDay, isAfter, isBefore } from 'date-fns'

type TourType = 'in_person' | 'virtual' | 'self_guided'

type Tour = {
  id: string
  tour_date: string
  tour_time: string
  tour_type: TourType
  status: string
  notes?: string
}

type Lead = {
  id: string
  first_name: string
  last_name: string
  email?: string
  phone?: string
  property_id: string
}

interface TourScheduleModalProps {
  isOpen: boolean
  onClose: () => void
  lead: Lead
  existingTour?: Tour | null
  onScheduled: () => void
}

const TOUR_TYPES = [
  {
    value: 'in_person' as TourType,
    label: 'In-Person',
    description: 'Traditional guided tour',
    icon: MapPin,
    color: 'indigo'
  },
  {
    value: 'virtual' as TourType,
    label: 'Virtual',
    description: 'Video call tour',
    icon: Video,
    color: 'purple'
  },
  {
    value: 'self_guided' as TourType,
    label: 'Self-Guided',
    description: 'Independent viewing',
    icon: Key,
    color: 'emerald'
  }
]

// Generate time slots from 9 AM to 6 PM in 30-minute increments
const TIME_SLOTS = Array.from({ length: 19 }, (_, i) => {
  const hour = Math.floor(i / 2) + 9
  const minutes = (i % 2) * 30
  const time = `${hour.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`
  const label = format(setMinutes(setHours(new Date(), hour), minutes), 'h:mm a')
  return { value: time, label }
})

export function TourScheduleModal({
  isOpen,
  onClose,
  lead,
  existingTour,
  onScheduled
}: TourScheduleModalProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  
  // Form state
  const [tourDate, setTourDate] = useState('')
  const [tourTime, setTourTime] = useState('10:00')
  const [tourType, setTourType] = useState<TourType>('in_person')
  const [notes, setNotes] = useState('')
  const [sendConfirmation, setSendConfirmation] = useState(true)

  // Set initial values if editing
  useEffect(() => {
    if (existingTour) {
      setTourDate(existingTour.tour_date)
      setTourTime(existingTour.tour_time.slice(0, 5)) // HH:MM format
      setTourType(existingTour.tour_type)
      setNotes(existingTour.notes || '')
    } else {
      // Default to tomorrow
      setTourDate(format(addDays(new Date(), 1), 'yyyy-MM-dd'))
      setTourTime('10:00')
      setTourType('in_person')
      setNotes('')
    }
  }, [existingTour, isOpen])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const endpoint = `/api/leads/${lead.id}/tours`
      const method = existingTour ? 'PATCH' : 'POST'
      
      const body = existingTour
        ? {
            tourId: existingTour.id,
            tourDate,
            tourTime,
            tourType,
            notes: notes || null,
            sendNotification: sendConfirmation
          }
        : {
            tourDate,
            tourTime,
            tourType,
            notes: notes || null,
            sendConfirmation
          }

      const response = await fetch(endpoint, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to schedule tour')
      }

      setSuccess(true)
      setTimeout(() => {
        onScheduled()
        onClose()
        setSuccess(false)
      }, 1500)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to schedule tour')
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen) return null

  const isEditing = !!existingTour
  const minDate = format(new Date(), 'yyyy-MM-dd')
  const maxDate = format(addDays(new Date(), 90), 'yyyy-MM-dd')
  const canSendConfirmation = !!(lead.phone || lead.email)

  return (
    <>
      <div 
        className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[60]"
        onClick={onClose}
      />
      <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
        <div className="modal-light-mode bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto animate-in fade-in zoom-in-95 duration-200">
          {/* Header */}
          <div className="sticky top-0 bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between rounded-t-2xl">
            <div>
              <h2 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
                <CalendarCheck className="text-purple-600" size={20} />
                {isEditing ? 'Reschedule Tour' : 'Schedule Tour'}
              </h2>
              <p className="text-sm text-slate-500 mt-0.5">
                for {lead.first_name} {lead.last_name}
              </p>
            </div>
            <button 
              onClick={onClose}
              className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
            >
              <X size={20} className="text-slate-500" />
            </button>
          </div>

          {success ? (
            <div className="p-10 text-center">
              <div className="h-16 w-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4 animate-in zoom-in duration-300">
                <Check size={32} className="text-emerald-600" />
              </div>
              <h3 className="text-xl font-semibold text-slate-900 mb-2">
                Tour {isEditing ? 'Rescheduled' : 'Scheduled'}!
              </h3>
              <p className="text-slate-500">
                {sendConfirmation && canSendConfirmation
                  ? 'Confirmation has been sent to the lead.'
                  : 'The tour has been added to their profile.'}
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="p-6 space-y-5">
              {/* Tour Type Selection */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Tour Type
                </label>
                <div className="grid grid-cols-3 gap-3">
                  {TOUR_TYPES.map(type => {
                    const Icon = type.icon
                    const isSelected = tourType === type.value
                    const colorClasses = {
                      indigo: isSelected 
                        ? 'border-indigo-500 bg-indigo-50 text-indigo-700' 
                        : 'border-slate-200 hover:bg-slate-50',
                      purple: isSelected 
                        ? 'border-purple-500 bg-purple-50 text-purple-700' 
                        : 'border-slate-200 hover:bg-slate-50',
                      emerald: isSelected 
                        ? 'border-emerald-500 bg-emerald-50 text-emerald-700' 
                        : 'border-slate-200 hover:bg-slate-50',
                    }

                    return (
                      <button
                        key={type.value}
                        type="button"
                        onClick={() => setTourType(type.value)}
                        className={`p-3 rounded-xl border-2 text-center transition-all ${
                          colorClasses[type.color as keyof typeof colorClasses]
                        }`}
                      >
                        <Icon 
                          size={20} 
                          className={`mx-auto mb-1 ${isSelected ? '' : 'text-slate-400'}`}
                        />
                        <p className={`text-sm font-medium ${isSelected ? '' : 'text-slate-700'}`}>
                          {type.label}
                        </p>
                        <p className={`text-xs mt-0.5 ${isSelected ? 'opacity-80' : 'text-slate-400'}`}>
                          {type.description}
                        </p>
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Date and Time */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">
                    Date *
                  </label>
                  <div className="relative">
                    <Calendar size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="date"
                      required
                      value={tourDate}
                      onChange={e => setTourDate(e.target.value)}
                      min={minDate}
                      max={maxDate}
                      className="w-full pl-10 pr-3 py-2.5 border border-slate-300 rounded-lg bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">
                    Time *
                  </label>
                  <div className="relative">
                    <Clock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <select
                      required
                      value={tourTime}
                      onChange={e => setTourTime(e.target.value)}
                      className="w-full pl-10 pr-3 py-2.5 border border-slate-300 rounded-lg bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 appearance-none"
                    >
                      {TIME_SLOTS.map(slot => (
                        <option key={slot.value} value={slot.value}>
                          {slot.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Quick Date Buttons */}
              <div className="flex gap-2">
                {[
                  { label: 'Tomorrow', days: 1 },
                  { label: 'In 2 days', days: 2 },
                  { label: 'Next week', days: 7 }
                ].map(preset => (
                  <button
                    key={preset.days}
                    type="button"
                    onClick={() => setTourDate(format(addDays(new Date(), preset.days), 'yyyy-MM-dd'))}
                    className={`px-3 py-1.5 text-xs font-medium rounded-full transition-colors ${
                      tourDate === format(addDays(new Date(), preset.days), 'yyyy-MM-dd')
                        ? 'bg-purple-100 text-purple-700'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {preset.label}
                  </button>
                ))}
              </div>

              {/* Notes */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  Notes (optional)
                </label>
                <textarea
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  rows={2}
                  placeholder="Special requests, accessibility needs, etc."
                  className="w-full px-3 py-2.5 border border-slate-300 rounded-lg bg-white text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 resize-none"
                />
              </div>

              {/* Send Confirmation Toggle */}
              <div className={`flex items-center justify-between py-3 px-4 rounded-lg ${
                canSendConfirmation ? 'bg-purple-50' : 'bg-slate-50'
              }`}>
                <div className="flex items-center gap-3">
                  <Send size={18} className={canSendConfirmation ? 'text-purple-600' : 'text-slate-400'} />
                  <div>
                    <p className={`text-sm font-medium ${canSendConfirmation ? 'text-purple-900' : 'text-slate-500'}`}>
                      Send confirmation
                    </p>
                    <p className={`text-xs ${canSendConfirmation ? 'text-purple-600' : 'text-slate-400'}`}>
                      {canSendConfirmation 
                        ? `via ${lead.phone ? 'SMS' : ''}${lead.phone && lead.email ? ' & ' : ''}${lead.email ? 'Email' : ''}`
                        : 'No contact info available'
                      }
                    </p>
                  </div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input 
                    type="checkbox" 
                    checked={sendConfirmation && canSendConfirmation}
                    onChange={e => setSendConfirmation(e.target.checked)}
                    disabled={!canSendConfirmation}
                    className="sr-only peer" 
                  />
                  <div className={`w-11 h-6 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all ${
                    canSendConfirmation 
                      ? 'bg-slate-200 peer-focus:ring-2 peer-focus:ring-purple-500/40 peer-checked:bg-purple-600'
                      : 'bg-slate-200 cursor-not-allowed'
                  }`} />
                </label>
              </div>

              {/* Error Message */}
              {error && (
                <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
                  <AlertCircle size={16} className="text-red-500 flex-shrink-0" />
                  <p className="text-sm text-red-700">{error}</p>
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  disabled={loading}
                  className="flex-1 px-4 py-2.5 border border-slate-200 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors font-medium disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading || !tourDate || !tourTime}
                  className="flex-1 px-4 py-2.5 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg shadow-purple-500/20"
                >
                  {loading ? (
                    <>
                      <Loader2 size={18} className="animate-spin" />
                      {isEditing ? 'Updating...' : 'Scheduling...'}
                    </>
                  ) : (
                    <>
                      <CalendarCheck size={18} />
                      {isEditing ? 'Update Tour' : 'Schedule Tour'}
                    </>
                  )}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </>
  )
}


