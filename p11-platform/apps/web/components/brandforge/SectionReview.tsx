'use client'

import { useState, useEffect } from 'react'
import { Loader2, Edit, Sparkles, Check, AlertCircle } from 'lucide-react'

interface SectionReviewProps {
  brandAssetId: string
  onSectionChange: (section: number) => void
  onComplete: (brandAsset: any) => void
}

export function SectionReview({ brandAssetId, onSectionChange, onComplete }: SectionReviewProps) {
  const [isGenerating, setIsGenerating] = useState(false)
  const [draftSection, setDraftSection] = useState<any>(null)
  const [currentStep, setCurrentStep] = useState(1)
  const [isEditing, setIsEditing] = useState(false)
  const [editedData, setEditedData] = useState<any>({})
  const [showRegenerateModal, setShowRegenerateModal] = useState(false)
  const [regenerateHint, setRegenerateHint] = useState('')

  useEffect(() => {
    onSectionChange(currentStep)
  }, [currentStep])

  useEffect(() => {
    // Generate first section on mount
    if (!draftSection && currentStep <= 12) {
      generateNextSection()
    }
  }, [])

  async function generateNextSection() {
    setIsGenerating(true)
    setIsEditing(false)
    setEditedData({})

    try {
      const res = await fetch('/api/brandforge/generate-next-section', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ brandAssetId })
      })

      if (!res.ok) throw new Error('Generation failed')

      const data = await res.json()
      setDraftSection(data)
      setCurrentStep(data.step)
    } catch (err) {
      console.error('Failed to generate section:', err)
    } finally {
      setIsGenerating(false)
    }
  }

  async function handleRegenerate() {
    setIsGenerating(true)
    setShowRegenerateModal(false)

    try {
      const res = await fetch('/api/brandforge/regenerate-section', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          brandAssetId, 
          hint: regenerateHint || undefined 
        })
      })

      if (!res.ok) throw new Error('Regeneration failed')

      const data = await res.json()
      setDraftSection(data)
      setRegenerateHint('')
    } catch (err) {
      console.error('Failed to regenerate:', err)
    } finally {
      setIsGenerating(false)
    }
  }

  async function handleEdit() {
    if (!isEditing) {
      setIsEditing(true)
      setEditedData(draftSection.data)
      return
    }

    // Save edits
    try {
      const res = await fetch('/api/brandforge/edit-section', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          brandAssetId, 
          updates: editedData 
        })
      })

      if (!res.ok) throw new Error('Edit failed')

      const data = await res.json()
      setDraftSection(data)
      setIsEditing(false)
    } catch (err) {
      console.error('Failed to save edit:', err)
    }
  }

  async function handleApprove() {
    try {
      const res = await fetch('/api/brandforge/approve-section', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ brandAssetId })
      })

      if (!res.ok) throw new Error('Approval failed')

      const data = await res.json()

      if (data.isComplete) {
        // All sections complete - generate PDF
        const pdfRes = await fetch('/api/brandforge/generate-pdf', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ brandAssetId })
        })

        const pdfData = await pdfRes.json()
        onComplete(pdfData)
      } else {
        // Move to next section
        setDraftSection(null)
        setCurrentStep(data.nextStep)
        generateNextSection()
      }
    } catch (err) {
      console.error('Failed to approve:', err)
    }
  }

  const sectionTitles: Record<string, string> = {
    introduction: 'Introduction & Market Context',
    positioning: 'Positioning Statement',
    target_audience: 'Target Audience',
    personas: 'Resident Personas',
    name_story: 'Brand Name & Story',
    logo: 'Logo Design',
    typography: 'Typography System',
    colors: 'Color Palette',
    design_elements: 'Design Elements',
    photo_yep: 'Photo Guidelines - Yep',
    photo_nope: 'Photo Guidelines - Nope',
    implementation: 'Implementation Examples'
  }

  if (isGenerating && !draftSection) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 p-8 text-center">
        <Loader2 className="w-12 h-12 text-indigo-600 animate-spin mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-slate-900 mb-2">
          Generating Section {currentStep}/12
        </h3>
        <p className="text-slate-600">
          {sectionTitles[draftSection?.sectionName] || 'Creating brand content...'}
        </p>
      </div>
    )
  }

  if (!draftSection) return null

  return (
    <div className="space-y-6">
      {/* Section header */}
      <div className="bg-gradient-to-r from-indigo-50 to-purple-50 rounded-xl p-6 border border-indigo-100">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm font-medium text-indigo-600 mb-1">
              Step {currentStep} of 12
            </div>
            <h2 className="text-2xl font-bold text-slate-900">
              {sectionTitles[draftSection.sectionName]}
            </h2>
          </div>
          <div className="text-right text-sm text-slate-600">
            Version {draftSection.version || 1}
          </div>
        </div>
      </div>

      {/* Section content */}
      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <RenderSectionContent 
          section={draftSection}
          isEditing={isEditing}
          editedData={editedData}
          onEdit={setEditedData}
        />
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between">
        <div className="flex gap-2">
          <button
            onClick={handleEdit}
            className="px-4 py-2 border border-slate-300 rounded-lg hover:bg-slate-50 flex items-center gap-2"
          >
            <Edit className="w-4 h-4" />
            {isEditing ? 'Save Edits' : 'Edit'}
          </button>
          <button
            onClick={() => setShowRegenerateModal(true)}
            disabled={isGenerating}
            className="px-4 py-2 border border-slate-300 rounded-lg hover:bg-slate-50 flex items-center gap-2 disabled:opacity-50"
          >
            <Sparkles className="w-4 h-4" />
            Regenerate
          </button>
        </div>
        <button
          onClick={handleApprove}
          disabled={isEditing}
          className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 flex items-center gap-2"
        >
          <Check className="w-4 h-4" />
          Approve & Continue
        </button>
      </div>

      {/* Regenerate modal */}
      {showRegenerateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 max-w-md w-full">
            <h3 className="text-lg font-semibold mb-4">Regenerate Section</h3>
            <p className="text-sm text-slate-600 mb-4">
              Optionally provide feedback to guide the regeneration:
            </p>
            <textarea
              value={regenerateHint}
              onChange={(e) => setRegenerateHint(e.target.value)}
              placeholder="e.g., 'Make it more casual' or 'Use warmer colors'"
              rows={3}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg mb-4"
            />
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setShowRegenerateModal(false)}
                className="px-4 py-2 border border-slate-300 rounded-lg hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                onClick={handleRegenerate}
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
              >
                Regenerate
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function RenderSectionContent({ section, isEditing, editedData, onEdit }: any) {
  const data = isEditing ? editedData : section.data

  // Simple text renderer - can be expanded for each section type
  return (
    <div className="space-y-4">
      {Object.entries(data).map(([key, value]) => (
        <div key={key}>
          <label className="block text-sm font-medium text-slate-700 mb-1 capitalize">
            {key.replace(/_/g, ' ')}
          </label>
          {isEditing && typeof value === 'string' ? (
            <textarea
              value={value as string}
              onChange={(e) => onEdit({ ...editedData, [key]: e.target.value })}
              rows={4}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg"
            />
          ) : (
            <div className="text-slate-900 whitespace-pre-wrap">
              {typeof value === 'object' ? JSON.stringify(value, null, 2) : String(value)}
            </div>
          )}
        </div>
      ))}
    </div>
  )
}














