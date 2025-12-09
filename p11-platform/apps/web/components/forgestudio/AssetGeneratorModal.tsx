'use client'

import { useState } from 'react'
import {
  X,
  Image as ImageIcon,
  Video,
  Wand2,
  Loader2,
  Upload,
  Sparkles,
  Check
} from 'lucide-react'

interface AssetGeneratorModalProps {
  propertyId: string
  onClose: () => void
  onGenerated: () => void
}

const GENERATION_TYPES = [
  { id: 'text-to-image', label: 'Text to Image', icon: ImageIcon, description: 'Generate image from text prompt', disabled: false },
  { id: 'image-to-image', label: 'Image to Image', icon: ImageIcon, description: 'Transform existing image', disabled: false },
  { id: 'text-to-video', label: 'Text to Video', icon: Video, description: 'Generate video from text (Veo)', disabled: false },
  { id: 'image-to-video', label: 'Image to Video', icon: Video, description: 'Animate an image (Veo)', disabled: false },
]

const STYLES = [
  { id: 'natural', label: 'Natural/Realistic' },
  { id: 'luxury', label: 'Luxury/Premium' },
  { id: 'modern', label: 'Modern/Minimalist' },
  { id: 'vibrant', label: 'Vibrant/Colorful' },
  { id: 'cozy', label: 'Cozy/Warm' },
  { id: 'professional', label: 'Professional/Corporate' },
]

const ASPECT_RATIOS = [
  { id: '1:1', label: 'Square (1:1)' },
  { id: '4:5', label: 'Portrait (4:5)' },
  { id: '16:9', label: 'Landscape (16:9)' },
  { id: '9:16', label: 'Stories (9:16)' },
]

export function AssetGeneratorModal({ propertyId, onClose, onGenerated }: AssetGeneratorModalProps) {
  const [generationType, setGenerationType] = useState('text-to-image')
  const [prompt, setPrompt] = useState('')
  const [negativePrompt, setNegativePrompt] = useState('')
  const [style, setStyle] = useState('natural')
  const [aspectRatio, setAspectRatio] = useState('1:1')
  const [quality, setQuality] = useState<'standard' | 'high'>('high')
  const [sourceImageUrl, setSourceImageUrl] = useState('')
  const [saveName, setSaveName] = useState('')
  const [tags, setTags] = useState('')
  
  const [generating, setGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [generatedUrl, setGeneratedUrl] = useState<string | null>(null)

  const needsSourceImage = generationType === 'image-to-image' || generationType === 'image-to-video'

  const handleGenerate = async () => {
    if (!prompt) {
      setError('Please enter a prompt')
      return
    }

    if (needsSourceImage && !sourceImageUrl) {
      setError('Please provide a source image URL')
      return
    }

    setGenerating(true)
    setError(null)
    setGeneratedUrl(null)

    try {
      const res = await fetch('/api/forgestudio/assets/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          propertyId,
          generationType,
          prompt,
          negativePrompt: negativePrompt || undefined,
          sourceImageUrl: needsSourceImage ? sourceImageUrl : undefined,
          style,
          quality,
          aspectRatio,
          saveName: saveName || undefined,
          tags: tags ? tags.split(',').map(t => t.trim()) : ['ai-generated']
        })
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Generation failed')
      }

      setGeneratedUrl(data.url)
      
      if (data.saved) {
        // Show success briefly then close
        setTimeout(() => {
          onGenerated()
        }, 2000)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Generation failed')
    } finally {
      setGenerating(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white dark:bg-slate-800 rounded-2xl w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-200 dark:border-slate-700">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center">
              <Wand2 className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
                AI Asset Generator
              </h2>
              <p className="text-sm text-slate-500">Powered by Google Gemini</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg"
          >
            <X className="w-5 h-5 text-slate-400" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Generation Type */}
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-3">
              Generation Type
            </label>
            <div className="grid grid-cols-2 gap-3">
              {GENERATION_TYPES.map((type) => {
                const Icon = type.icon
                return (
                  <button
                    key={type.id}
                    onClick={() => !type.disabled && setGenerationType(type.id)}
                    disabled={type.disabled}
                    className={`flex items-center gap-3 p-4 rounded-xl border-2 transition-all text-left ${
                      type.disabled
                        ? 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 opacity-60 cursor-not-allowed'
                        : generationType === type.id
                        ? 'border-amber-500 bg-amber-50 dark:bg-amber-500/10'
                        : 'border-slate-200 dark:border-slate-600 hover:border-slate-300'
                    }`}
                  >
                    <Icon className={`w-6 h-6 ${type.disabled ? 'text-slate-300' : generationType === type.id ? 'text-amber-600' : 'text-slate-400'}`} />
                    <div>
                      <div className={`font-medium text-sm ${type.disabled ? 'text-slate-400' : 'text-slate-900 dark:text-white'}`}>
                        {type.label}
                      </div>
                      <div className={`text-xs ${type.disabled ? 'text-slate-400' : 'text-slate-500'}`}>{type.description}</div>
                    </div>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Source Image (for image-to-* types) */}
          {needsSourceImage && (
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                Source Image URL <span className="text-red-500">*</span>
              </label>
              <input
                type="url"
                value={sourceImageUrl}
                onChange={(e) => setSourceImageUrl(e.target.value)}
                className="w-full px-4 py-2 border border-slate-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
                placeholder="https://example.com/image.jpg"
              />
              {sourceImageUrl && (
                <div className="mt-2 rounded-lg overflow-hidden w-32 h-32">
                  <img src={sourceImageUrl} alt="Source" className="w-full h-full object-cover" />
                </div>
              )}
            </div>
          )}

          {/* Prompt */}
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              Prompt <span className="text-red-500">*</span>
            </label>
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              rows={3}
              className="w-full px-4 py-2 border border-slate-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white resize-none"
              placeholder="Describe what you want to generate..."
            />
          </div>

          {/* Negative Prompt */}
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              Negative Prompt (Optional)
            </label>
            <input
              type="text"
              value={negativePrompt}
              onChange={(e) => setNegativePrompt(e.target.value)}
              className="w-full px-4 py-2 border border-slate-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
              placeholder="What to avoid in the generation..."
            />
          </div>

          {/* Style & Options Row */}
          <div className="grid grid-cols-2 gap-4">
            {/* Style */}
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                Style
              </label>
              <select
                value={style}
                onChange={(e) => setStyle(e.target.value)}
                className="w-full px-4 py-2 border border-slate-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
              >
                {STYLES.map((s) => (
                  <option key={s.id} value={s.id}>{s.label}</option>
                ))}
              </select>
            </div>

            {/* Aspect Ratio */}
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                Aspect Ratio
              </label>
              <select
                value={aspectRatio}
                onChange={(e) => setAspectRatio(e.target.value)}
                className="w-full px-4 py-2 border border-slate-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
              >
                {ASPECT_RATIOS.map((ar) => (
                  <option key={ar.id} value={ar.id}>{ar.label}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Quality */}
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              Quality
            </label>
            <div className="flex gap-3">
              <button
                onClick={() => setQuality('standard')}
                className={`flex-1 py-2 rounded-lg border-2 transition-all ${
                  quality === 'standard'
                    ? 'border-amber-500 bg-amber-50 dark:bg-amber-500/10 text-amber-700'
                    : 'border-slate-200 dark:border-slate-600'
                }`}
              >
                Standard
              </button>
              <button
                onClick={() => setQuality('high')}
                className={`flex-1 py-2 rounded-lg border-2 transition-all ${
                  quality === 'high'
                    ? 'border-amber-500 bg-amber-50 dark:bg-amber-500/10 text-amber-700'
                    : 'border-slate-200 dark:border-slate-600'
                }`}
              >
                High Quality
              </button>
            </div>
          </div>

          {/* Save Options */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                Save As (Optional)
              </label>
              <input
                type="text"
                value={saveName}
                onChange={(e) => setSaveName(e.target.value)}
                className="w-full px-4 py-2 border border-slate-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
                placeholder="Asset name"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                Tags (Optional)
              </label>
              <input
                type="text"
                value={tags}
                onChange={(e) => setTags(e.target.value)}
                className="w-full px-4 py-2 border border-slate-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
                placeholder="tag1, tag2, tag3"
              />
            </div>
          </div>

          {/* Error */}
          {error && (
            <div className="p-4 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 rounded-xl text-red-600 dark:text-red-400 text-sm">
              {error}
            </div>
          )}

          {/* Generated Result */}
          {generatedUrl && (
            <div className="p-4 bg-green-50 dark:bg-green-500/10 border border-green-200 dark:border-green-500/20 rounded-xl">
              <div className="flex items-center gap-2 text-green-600 dark:text-green-400 mb-3">
                <Check className="w-5 h-5" />
                <span className="font-medium">Asset generated and saved!</span>
              </div>
              <div className="rounded-xl overflow-hidden">
                {generationType.includes('video') ? (
                  <video src={generatedUrl} controls className="w-full" />
                ) : (
                  <img src={generatedUrl} alt="Generated" className="w-full" />
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-6 border-t border-slate-200 dark:border-slate-700">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-300 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700"
          >
            {generatedUrl ? 'Done' : 'Cancel'}
          </button>
          {!generatedUrl && (
            <button
              onClick={handleGenerate}
              disabled={generating || !prompt}
              className="flex items-center gap-2 px-6 py-2 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-amber-500/25"
            >
              {generating ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Sparkles className="w-5 h-5" />
                  Generate
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

