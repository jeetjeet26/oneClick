'use client'

import { useState, useCallback } from 'react'
import { usePropertyContext } from '@/components/layout/PropertyContext'
import { 
  ReviewList, 
  ReviewStats, 
  TicketList, 
  ReviewFlowConfig,
  ReviewDetailDrawer,
  ImportReviewsModal
} from '@/components/reviewflow'
import {
  MessageSquare,
  TrendingUp,
  AlertTriangle,
  Settings,
  Sparkles,
  RefreshCw,
  Loader2,
  Star,
  Plus
} from 'lucide-react'

interface Review {
  id: string
  platform: string
  reviewer_name: string | null
  reviewer_avatar_url: string | null
  rating: number | null
  review_text: string
  review_date: string | null
  sentiment: 'positive' | 'neutral' | 'negative' | null
  sentiment_score: number | null
  is_urgent: boolean
  response_status: string
  topics: string[]
  created_at: string
  review_responses?: Array<{
    id: string
    response_text: string
    response_type: string
    status: string
    tone: string
    created_at: string
  }>
  review_tickets?: Array<{
    id: string
    title: string
    priority: string
    status: string
  }>
}

type TabId = 'overview' | 'reviews' | 'tickets' | 'settings'

export default function ReviewFlowPage() {
  const { currentProperty } = usePropertyContext()
  const [activeTab, setActiveTab] = useState<TabId>('overview')
  const [selectedReview, setSelectedReview] = useState<Review | null>(null)
  const [refreshKey, setRefreshKey] = useState(0)
  const [generating, setGenerating] = useState<string | null>(null)
  const [showImportModal, setShowImportModal] = useState(false)

  const handleRefresh = useCallback(() => {
    setRefreshKey(prev => prev + 1)
  }, [])

  const handleGenerateResponse = async (reviewId: string) => {
    setGenerating(reviewId)
    try {
      // First analyze the review if not already analyzed
      await fetch('/api/reviewflow/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reviewId })
      })

      // Then generate a response
      await fetch('/api/reviewflow/respond', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reviewId, tone: 'professional' })
      })

      handleRefresh()
    } catch (error) {
      console.error('Error generating response:', error)
    } finally {
      setGenerating(null)
    }
  }

  const tabs = [
    { id: 'overview' as TabId, label: 'Overview', icon: TrendingUp },
    { id: 'reviews' as TabId, label: 'Reviews', icon: MessageSquare },
    { id: 'tickets' as TabId, label: 'Tickets', icon: AlertTriangle },
    { id: 'settings' as TabId, label: 'Settings', icon: Settings }
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-rose-500 to-pink-600 flex items-center justify-center text-white shadow-lg shadow-rose-500/20">
            <Star className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
              ReviewFlow AI
              <span className="text-xs px-2 py-0.5 bg-gradient-to-r from-rose-500 to-pink-500 text-white rounded-full">
                Beta
              </span>
            </h1>
            <p className="text-slate-500">
              AI-powered review management for {currentProperty.name}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleRefresh}
            className="flex items-center gap-2 px-4 py-2 border border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-300 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            Refresh
          </button>
          <button
            onClick={() => setShowImportModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-rose-500 to-pink-600 text-white rounded-lg hover:from-rose-600 hover:to-pink-700 transition-all shadow-lg shadow-rose-500/25"
          >
            <Plus className="w-4 h-4" />
            Import Reviews
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-slate-200 dark:border-slate-700">
        <nav className="flex gap-6">
          {tabs.map((tab) => {
            const Icon = tab.icon
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 pb-3 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === tab.id
                    ? 'border-rose-500 text-rose-600 dark:text-rose-400'
                    : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                }`}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
              </button>
            )
          })}
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Stats */}
          <ReviewStats 
            key={`stats-${refreshKey}`}
            propertyId={currentProperty.id} 
          />

          {/* Quick Actions Grid */}
          <div className="grid grid-cols-2 gap-6">
            {/* Pending Responses */}
            <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-amber-500" />
                  Pending Responses
                </h3>
                <button
                  onClick={() => setActiveTab('reviews')}
                  className="text-sm text-rose-600 hover:text-rose-700"
                >
                  View all →
                </button>
              </div>
              <ReviewList
                key={`pending-${refreshKey}`}
                propertyId={currentProperty.id}
                onSelectReview={(review) => setSelectedReview(review as Review)}
                onGenerateResponse={handleGenerateResponse}
              />
            </div>

            {/* Open Tickets */}
            <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-red-500" />
                  Open Tickets
                </h3>
                <button
                  onClick={() => setActiveTab('tickets')}
                  className="text-sm text-rose-600 hover:text-rose-700"
                >
                  View all →
                </button>
              </div>
              <TicketList
                key={`tickets-compact-${refreshKey}`}
                propertyId={currentProperty.id}
                compact
                limit={5}
              />
            </div>
          </div>
        </div>
      )}

      {activeTab === 'reviews' && (
        <ReviewList
          key={`reviews-${refreshKey}`}
          propertyId={currentProperty.id}
          onSelectReview={(review) => setSelectedReview(review as Review)}
          onGenerateResponse={handleGenerateResponse}
        />
      )}

      {activeTab === 'tickets' && (
        <TicketList
          key={`tickets-${refreshKey}`}
          propertyId={currentProperty.id}
        />
      )}

      {activeTab === 'settings' && (
        <ReviewFlowConfig propertyId={currentProperty.id} />
      )}

      {/* Review Detail Drawer */}
      {selectedReview && (
        <ReviewDetailDrawer
          review={selectedReview}
          onClose={() => setSelectedReview(null)}
          onUpdate={() => {
            handleRefresh()
            // Re-fetch the selected review to show updated data
          }}
        />
      )}

      {/* Import Reviews Modal */}
      {showImportModal && (
        <ImportReviewsModal
          propertyId={currentProperty.id}
          onClose={() => setShowImportModal(false)}
          onImported={handleRefresh}
        />
      )}
    </div>
  )
}

