'use client'

import { useState, useEffect } from 'react'
import { 
  X, 
  Calendar, 
  Clock, 
  Mail, 
  Plus, 
  Trash2, 
  Loader2, 
  Check,
  AlertCircle,
  CalendarDays,
  CalendarRange
} from 'lucide-react'

type ScheduleType = 'daily' | 'weekly' | 'monthly'
type DateRangeType = 'previous_period' | 'last_7_days' | 'last_30_days' | 'month_to_date'

type ScheduleReportModalProps = {
  isOpen: boolean
  onClose: () => void
  propertyId?: string
  propertyName?: string
  onSuccess?: () => void
}

const DAYS_OF_WEEK = [
  { value: 0, label: 'Sunday' },
  { value: 1, label: 'Monday' },
  { value: 2, label: 'Tuesday' },
  { value: 3, label: 'Wednesday' },
  { value: 4, label: 'Thursday' },
  { value: 5, label: 'Friday' },
  { value: 6, label: 'Saturday' },
]

const HOURS = Array.from({ length: 24 }, (_, i) => ({
  value: i,
  label: `${i === 0 ? 12 : i > 12 ? i - 12 : i}:00 ${i < 12 ? 'AM' : 'PM'} UTC`,
}))

const DATE_RANGE_OPTIONS: { value: DateRangeType; label: string; description: string }[] = [
  { value: 'previous_period', label: 'Previous Period', description: 'Yesterday, last week, or last month' },
  { value: 'last_7_days', label: 'Last 7 Days', description: 'Rolling 7-day window' },
  { value: 'last_30_days', label: 'Last 30 Days', description: 'Rolling 30-day window' },
  { value: 'month_to_date', label: 'Month to Date', description: 'From start of current month' },
]

export function ScheduleReportModal({ 
  isOpen, 
  onClose, 
  propertyId, 
  propertyName,
  onSuccess 
}: ScheduleReportModalProps) {
  const [name, setName] = useState('')
  const [scheduleType, setScheduleType] = useState<ScheduleType>('weekly')
  const [dayOfWeek, setDayOfWeek] = useState(1) // Monday
  const [dayOfMonth, setDayOfMonth] = useState(1)
  const [hourUtc, setHourUtc] = useState(9) // 9 AM UTC
  const [recipients, setRecipients] = useState<string[]>([''])
  const [dateRangeType, setDateRangeType] = useState<DateRangeType>('previous_period')
  const [includeComparison, setIncludeComparison] = useState(true)
  const [includeCampaigns, setIncludeCampaigns] = useState(true)
  
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      setName(propertyName ? `${propertyName} Weekly Report` : 'Weekly Performance Report')
      setScheduleType('weekly')
      setDayOfWeek(1)
      setDayOfMonth(1)
      setHourUtc(9)
      setRecipients([''])
      setDateRangeType('previous_period')
      setIncludeComparison(true)
      setIncludeCampaigns(true)
      setError(null)
      setSuccess(false)
    }
  }, [isOpen, propertyName])

  const addRecipient = () => {
    setRecipients([...recipients, ''])
  }

  const removeRecipient = (index: number) => {
    if (recipients.length > 1) {
      setRecipients(recipients.filter((_, i) => i !== index))
    }
  }

  const updateRecipient = (index: number, value: string) => {
    const updated = [...recipients]
    updated[index] = value
    setRecipients(updated)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    setError(null)

    // Filter out empty recipients
    const validRecipients = recipients.filter(r => r.trim())
    
    if (validRecipients.length === 0) {
      setError('At least one recipient email is required')
      setSubmitting(false)
      return
    }

    try {
      const response = await fetch('/api/reports/scheduled', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          property_id: propertyId || null,
          schedule_type: scheduleType,
          day_of_week: scheduleType === 'weekly' ? dayOfWeek : null,
          day_of_month: scheduleType === 'monthly' ? dayOfMonth : null,
          hour_utc: hourUtc,
          recipients: validRecipients,
          date_range_type: dateRangeType,
          include_comparison: includeComparison,
          include_campaigns: includeCampaigns,
          report_type: 'performance',
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create scheduled report')
      }

      setSuccess(true)
      setTimeout(() => {
        onSuccess?.()
        onClose()
      }, 1500)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to schedule report')
    } finally {
      setSubmitting(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-700">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-100 dark:bg-indigo-900/30 rounded-lg">
              <Calendar size={20} className="text-indigo-600 dark:text-indigo-400" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Schedule Report</h2>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                {propertyName ? `For ${propertyName}` : 'Create automated email report'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Success State */}
        {success ? (
          <div className="p-12 text-center">
            <div className="h-16 w-16 bg-emerald-100 dark:bg-emerald-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
              <Check size={32} className="text-emerald-600 dark:text-emerald-400" />
            </div>
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">Report Scheduled!</h3>
            <p className="text-slate-500 dark:text-slate-400">
              You'll receive your first report at the scheduled time.
            </p>
          </div>
        ) : (
          /* Form */
          <form onSubmit={handleSubmit} className="overflow-y-auto max-h-[calc(90vh-140px)]">
            <div className="p-6 space-y-5">
              {/* Error */}
              {error && (
                <div className="flex items-start gap-3 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                  <AlertCircle size={18} className="text-red-500 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-red-700 dark:text-red-400">{error}</p>
                </div>
              )}

              {/* Report Name */}
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                  Report Name
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-500"
                  placeholder="Weekly Performance Report"
                />
              </div>

              {/* Schedule Type */}
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Schedule Frequency
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {(['daily', 'weekly', 'monthly'] as ScheduleType[]).map((type) => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => setScheduleType(type)}
                      className={`px-4 py-2.5 rounded-lg border text-sm font-medium transition-all ${
                        scheduleType === type
                          ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300'
                          : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
                      }`}
                    >
                      {type.charAt(0).toUpperCase() + type.slice(1)}
                    </button>
                  ))}
                </div>
              </div>

              {/* Day Selection (for weekly/monthly) */}
              {scheduleType === 'weekly' && (
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                    <CalendarDays size={14} className="inline mr-1" />
                    Day of Week
                  </label>
                  <select
                    value={dayOfWeek}
                    onChange={(e) => setDayOfWeek(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
                  >
                    {DAYS_OF_WEEK.map((day) => (
                      <option key={day.value} value={day.value}>{day.label}</option>
                    ))}
                  </select>
                </div>
              )}

              {scheduleType === 'monthly' && (
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                    <CalendarRange size={14} className="inline mr-1" />
                    Day of Month
                  </label>
                  <select
                    value={dayOfMonth}
                    onChange={(e) => setDayOfMonth(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
                  >
                    {Array.from({ length: 28 }, (_, i) => i + 1).map((day) => (
                      <option key={day} value={day}>{day}{day === 1 ? 'st' : day === 2 ? 'nd' : day === 3 ? 'rd' : 'th'}</option>
                    ))}
                  </select>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                    Limited to 28 to ensure consistency across all months
                  </p>
                </div>
              )}

              {/* Time */}
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                  <Clock size={14} className="inline mr-1" />
                  Send Time (UTC)
                </label>
                <select
                  value={hourUtc}
                  onChange={(e) => setHourUtc(Number(e.target.value))}
                  className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
                >
                  {HOURS.map((hour) => (
                    <option key={hour.value} value={hour.value}>{hour.label}</option>
                  ))}
                </select>
              </div>

              {/* Date Range Type */}
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Report Date Range
                </label>
                <div className="space-y-2">
                  {DATE_RANGE_OPTIONS.map((option) => (
                    <label
                      key={option.value}
                      className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-all ${
                        dateRangeType === option.value
                          ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20'
                          : 'border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800'
                      }`}
                    >
                      <input
                        type="radio"
                        name="dateRange"
                        value={option.value}
                        checked={dateRangeType === option.value}
                        onChange={(e) => setDateRangeType(e.target.value as DateRangeType)}
                        className="mt-1 text-indigo-600"
                      />
                      <div>
                        <p className={`text-sm font-medium ${
                          dateRangeType === option.value 
                            ? 'text-indigo-700 dark:text-indigo-300' 
                            : 'text-slate-700 dark:text-slate-300'
                        }`}>
                          {option.label}
                        </p>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          {option.description}
                        </p>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              {/* Recipients */}
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                  <Mail size={14} className="inline mr-1" />
                  Recipients
                </label>
                <div className="space-y-2">
                  {recipients.map((email, index) => (
                    <div key={index} className="flex gap-2">
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => updateRecipient(index, e.target.value)}
                        className="flex-1 px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
                        placeholder="email@example.com"
                      />
                      {recipients.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeRecipient(index)}
                          className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                        >
                          <Trash2 size={18} />
                        </button>
                      )}
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={addRecipient}
                    className="flex items-center gap-2 text-sm text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 font-medium"
                  >
                    <Plus size={16} />
                    Add recipient
                  </button>
                </div>
              </div>

              {/* Options */}
              <div className="space-y-3 pt-2">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={includeComparison}
                    onChange={(e) => setIncludeComparison(e.target.checked)}
                    className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                  />
                  <span className="text-sm text-slate-700 dark:text-slate-300">
                    Include period-over-period comparison
                  </span>
                </label>
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={includeCampaigns}
                    onChange={(e) => setIncludeCampaigns(e.target.checked)}
                    className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                  />
                  <span className="text-sm text-slate-700 dark:text-slate-300">
                    Include campaign breakdown
                  </span>
                </label>
              </div>
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 flex justify-end gap-3">
              <button
                type="button"
                onClick={onClose}
                disabled={submitting}
                className="px-4 py-2 text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors font-medium disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-medium flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submitting ? (
                  <>
                    <Loader2 size={18} className="animate-spin" />
                    Scheduling...
                  </>
                ) : (
                  <>
                    <Calendar size={18} />
                    Schedule Report
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}

