'use client'

// SiteForge: Generation Wizard Component
// Modal that handles website generation with progress tracking
// Created: December 11, 2025

import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import type { GenerationPreferences, GenerationStatus } from '@/types/siteforge'

interface GenerationWizardProps {
  propertyId: string
  propertyName: string
  open: boolean
  onClose: () => void
  onComplete: (websiteId: string) => void
}

export function GenerationWizard({
  propertyId,
  propertyName,
  open,
  onClose,
  onComplete
}: GenerationWizardProps) {
  const [step, setStep] = useState<'preferences' | 'generating' | 'complete' | 'error'>('preferences')
  const [preferences, setPreferences] = useState<GenerationPreferences>({})
  const [websiteId, setWebsiteId] = useState<string | null>(null)
  const [status, setStatus] = useState<GenerationStatus>('queued')
  const [progress, setProgress] = useState(0)
  const [currentStepText, setCurrentStepText] = useState('')
  const [error, setError] = useState<string | null>(null)

  // Poll for status updates during generation
  useEffect(() => {
    if (step !== 'generating' || !websiteId) return

    const pollInterval = setInterval(async () => {
      try {
        const response = await fetch(`/api/siteforge/status/${websiteId}`)
        const data = await response.json()

        setStatus(data.status)
        setProgress(data.progress)
        setCurrentStepText(data.currentStep || '')

        if (data.status === 'complete' || data.status === 'ready_for_preview') {
          setStep('complete')
          clearInterval(pollInterval)
        } else if (data.status === 'failed') {
          setError(data.errorMessage || 'Generation failed')
          setStep('error')
          clearInterval(pollInterval)
        }
      } catch (err) {
        console.error('Error polling status:', err)
      }
    }, 2000) // Poll every 2 seconds

    return () => clearInterval(pollInterval)
  }, [step, websiteId])

  const handleGenerate = async () => {
    setStep('generating')
    setError(null)

    try {
      const response = await fetch('/api/siteforge/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          propertyId,
          preferences
        })
      })

      if (!response.ok) {
        throw new Error('Failed to start generation')
      }

      const data = await response.json()
      setWebsiteId(data.websiteId)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start generation')
      setStep('error')
    }
  }

  const handleComplete = () => {
    if (websiteId) {
      onComplete(websiteId)
    }
    onClose()
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            {step === 'preferences' && '🎨 Generate Website'}
            {step === 'generating' && '⚙️ Generating Website...'}
            {step === 'complete' && '✅ Website Ready!'}
            {step === 'error' && '❌ Generation Failed'}
          </DialogTitle>
          <DialogDescription>
            {step === 'preferences' && `Create a new website for ${propertyName}`}
            {step === 'generating' && 'Please wait while we create your website'}
            {step === 'complete' && 'Your website has been generated successfully'}
            {step === 'error' && 'Something went wrong during generation'}
          </DialogDescription>
        </DialogHeader>

        {/* Preferences Step */}
        {step === 'preferences' && (
          <div className="space-y-6 py-4">
            <div className="space-y-2">
              <Label htmlFor="style">Style Preference (Optional)</Label>
              <Select
                id="style"
                value={preferences.style || 'modern'}
                onValueChange={(value: any) => setPreferences({ ...preferences, style: value })}
              >
                <SelectItem value="modern">Modern</SelectItem>
                <SelectItem value="luxury">Luxury</SelectItem>
                <SelectItem value="cozy">Cozy</SelectItem>
                <SelectItem value="vibrant">Vibrant</SelectItem>
                <SelectItem value="professional">Professional</SelectItem>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="emphasis">Content Emphasis (Optional)</Label>
              <Select
                id="emphasis"
                value={preferences.emphasis || 'amenities'}
                onValueChange={(value: any) => setPreferences({ ...preferences, emphasis: value })}
              >
                <SelectItem value="amenities">Amenities</SelectItem>
                <SelectItem value="location">Location</SelectItem>
                <SelectItem value="lifestyle">Lifestyle</SelectItem>
                <SelectItem value="value">Value</SelectItem>
                <SelectItem value="community">Community</SelectItem>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="cta">Call-to-Action Priority (Optional)</Label>
              <Select
                id="cta"
                value={preferences.ctaPriority || 'tours'}
                onValueChange={(value: any) => setPreferences({ ...preferences, ctaPriority: value })}
              >
                <SelectItem value="tours">Schedule Tours</SelectItem>
                <SelectItem value="applications">Apply Online</SelectItem>
                <SelectItem value="contact">Contact Us</SelectItem>
                <SelectItem value="calls">Call Now</SelectItem>
              </Select>
            </div>

            <div className="flex justify-end space-x-3 pt-4">
              <Button variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button onClick={handleGenerate}>
                Generate Website →
              </Button>
            </div>
          </div>
        )}

        {/* Generating Step */}
        {step === 'generating' && (
          <div className="space-y-6 py-6">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600 dark:text-gray-400">{currentStepText}</span>
                <span className="font-medium text-gray-900 dark:text-white">{progress}%</span>
              </div>
              <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                <div
                  className="h-full bg-indigo-600 transition-all duration-500"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>

            <div className="space-y-3 text-sm text-gray-600 dark:text-gray-400">
              <div className="flex items-center space-x-2">
                <div className={`w-2 h-2 rounded-full ${progress >= 10 ? 'bg-green-500' : 'bg-gray-300'}`} />
                <span>Analyzing brand assets</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className={`w-2 h-2 rounded-full ${progress >= 30 ? 'bg-green-500' : 'bg-gray-300'}`} />
                <span>Planning site architecture</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className={`w-2 h-2 rounded-full ${progress >= 50 ? 'bg-green-500' : 'bg-gray-300'}`} />
                <span>Generating page content</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className={`w-2 h-2 rounded-full ${progress >= 70 ? 'bg-green-500' : 'bg-gray-300'}`} />
                <span>Preparing images and assets</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className={`w-2 h-2 rounded-full ${progress >= 85 ? 'bg-green-500' : 'bg-gray-300'}`} />
                <span>Finalizing preview</span>
              </div>
            </div>

            <p className="text-xs text-gray-500 dark:text-gray-400 text-center pt-4">
              This typically takes 2-3 minutes. Please don't close this window.
            </p>
          </div>
        )}

        {/* Complete Step */}
        {step === 'complete' && (
          <div className="space-y-6 py-6 text-center">
            <div className="text-6xl">🎉</div>
            <div className="space-y-2">
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white">Website Generated Successfully!</h3>
              <p className="text-gray-600 dark:text-gray-400">
                Your website is ready to preview. Review the content, then deploy to WordPress when ready.
              </p>
            </div>

            <div className="flex justify-center space-x-3 pt-4">
              <Button variant="outline" onClick={onClose}>
                Close
              </Button>
              <Button onClick={handleComplete}>
                Preview & Deploy →
              </Button>
            </div>
          </div>
        )}

        {/* Error Step */}
        {step === 'error' && (
          <div className="space-y-6 py-6">
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
              <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
            </div>

            <div className="flex justify-end space-x-3">
              <Button variant="outline" onClick={onClose}>
                Close
              </Button>
              <Button onClick={() => setStep('preferences')}>
                Try Again
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
