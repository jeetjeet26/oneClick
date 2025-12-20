'use client'

// SiteForge Section Editor
// Conversational editing interface for blueprint sections
// Created: December 16, 2025

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import type { SiteBlueprint } from '@/utils/siteforge/agents'

interface SectionEditorProps {
  websiteId: string
  sectionId: string
  sectionLabel: string
  onUpdate: (updatedBlueprint: SiteBlueprint) => void
}

/**
 * Section Editor - Conversational editing UI
 * User types intent, LLM generates patches, preview updates instantly
 */
export function SectionEditor({
  websiteId,
  sectionId,
  sectionLabel,
  onUpdate
}: SectionEditorProps) {
  const [open, setOpen] = useState(false)
  const [intent, setIntent] = useState('')
  const [loading, setLoading] = useState(false)
  
  async function handleEdit() {
    if (!intent.trim()) return
    
    setLoading(true)
    
    try {
      const response = await fetch(`/api/siteforge/edit/${websiteId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sectionId,
          userIntent: intent
        })
      })
      
      if (!response.ok) {
        throw new Error('Edit failed')
      }
      
      const { blueprint, patches } = await response.json()
      
      // Show what changed
      console.log(`Applied ${patches.length} change${patches.length > 1 ? 's' : ''}: ${patches[0].reasoning}`)
      
      // Update preview
      onUpdate(blueprint)
      
      // Close dialog
      setOpen(false)
      setIntent('')
      
    } catch (error) {
      console.error('Edit error:', error)
      alert('Failed to edit section')
    } finally {
      setLoading(false)
    }
  }
  
  return (
    <>
      <Button 
        variant="outline" 
        size="sm" 
        className="gap-2"
        onClick={() => setOpen(true)}
      >
        <span>✏️</span>
        Edit Section
      </Button>
      
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-[525px]">
          <DialogHeader>
            <DialogTitle>Edit {sectionLabel}</DialogTitle>
            <DialogDescription>
              Tell the AI how you'd like to change this section
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-4 py-4">
            <Textarea
              value={intent}
              onChange={e => setIntent(e.target.value)}
              placeholder="e.g., 'Make this more luxury and add a photo of the rooftop pool'"
              rows={4}
              className="resize-none"
              disabled={loading}
            />
            
            <div className="text-sm text-gray-500 space-y-1">
              <p className="font-medium">Example edits:</p>
              <ul className="list-disc list-inside space-y-0.5 text-xs">
                <li>"Make the headline more bold and poetic"</li>
                <li>"Add pricing information here"</li>
                <li>"Change to resort-style presentation"</li>
                <li>"Include a virtual tour CTA"</li>
                <li>"Use a lifestyle photo instead"</li>
              </ul>
            </div>
          </div>
          
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button
              onClick={handleEdit}
              disabled={loading || !intent.trim()}
            >
              {loading ? (
                <>
                  <span className="animate-spin mr-2">⚙️</span>
                  Thinking...
                </>
              ) : (
                <>Apply Changes →</>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}






