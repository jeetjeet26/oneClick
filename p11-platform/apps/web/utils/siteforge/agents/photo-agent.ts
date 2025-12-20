// SiteForge Photo Agent
// Plans and executes photo strategy based on brand context
// Categorizes uploaded photos, generates missing photos using Google Imagen 3
// Uses Claude Sonnet 4 for photo analysis + Vertex AI Imagen for generation
// Created: December 16, 2025

import { BaseAgent, type VectorSearchResult } from './base-agent'
import type { BrandContext } from './brand-agent'
import type { ArchitectureProposal } from './architecture-agent'
import Anthropic from '@anthropic-ai/sdk'
import { 
  isImagenAvailable, 
  generateAndUploadImage, 
  buildLifestylePhotoPrompt 
} from '../imagen-client'

export interface PhotoStrategy {
  uploadedPhotoUsage: Array<{
    photoId: string
    url: string
    category: 'hero' | 'amenity' | 'lifestyle' | 'gallery' | 'exterior' | 'interior'
    quality: number
    useFor: string
    brandAlignment: number
    reasoning: string
  }>
  
  photosToGenerate: Array<{
    category: 'hero' | 'amenity' | 'lifestyle' | 'gallery'
    scene: string
    prompt: string
    priority: 'high' | 'medium' | 'low'
    reasoning: string
  }>
  
  photoGuidelines: {
    lighting: string
    composition: string
    subjects: string
    mood: string
  }
}

export interface PhotoManifest {
  photos: Photo[]
  byCategory: {
    hero: Photo[]
    amenities: Photo[]
    lifestyle: Photo[]
    gallery: Photo[]
    logos: Photo[]
  }
  assignments: Map<string, string>  // sectionId -> photoId
  stats: {
    uploaded: number
    generated: number
    fromBrandForge: number
    total: number
  }
  // Logo assets from BrandForge (if available)
  logoAssets?: {
    primaryUrl?: string
    variations?: string[]
  }
}

interface Photo {
  id: string
  url: string
  type: 'uploaded' | 'generated' | 'brandforge'
  category: string
  quality: number
  scene?: string
  prompt?: string
}

/**
 * Photo Agent - Handles all photography decisions
 * Categorizes uploaded photos, generates missing photos using Claude analysis
 */
export class PhotoAgent extends BaseAgent {
  
  /**
   * Plan photo strategy
   */
  async planStrategy(
    brandContext: BrandContext,
    architecture: ArchitectureProposal
  ): Promise<PhotoStrategy> {
    
    await this.logAction('photo_strategy_start', { propertyId: this.propertyId })
    
    // 1. Get uploaded photos
    const uploadedPhotos = await this.getUploadedPhotos()
    
    // 2. Analyze uploaded photos with Claude vision
    const analyzedPhotos = await this.analyzePhotos(uploadedPhotos, brandContext)
    
    // 3. Get photo insights from vector search
    const photoInsights = await this.getPhotoInsights()
    
    // 4. Determine what photos are needed based on architecture
    const photoNeeds = this.extractPhotoNeeds(architecture)
    
    // 5. Claude creates strategy
    const strategy = await this.createStrategy({
      brandContext,
      analyzedPhotos,
      photoInsights,
      photoNeeds
    })
    
    await this.logAction('photo_strategy_complete', {
      uploadedCount: strategy.uploadedPhotoUsage.length,
      toGenerateCount: strategy.photosToGenerate.length
    })
    
    return strategy
  }
  
  /**
   * Execute photo strategy - generate missing photos
   * Pulls logos from BrandForge and uses Imagen for photo generation
   */
  async execute(
    strategy: PhotoStrategy,
    pages: any[],
    brandContext?: BrandContext
  ): Promise<PhotoManifest> {
    
    await this.logAction('photo_execution_start', {
      toGenerate: strategy.photosToGenerate.length,
      hasImagenAvailable: isImagenAvailable(),
      hasBrandForgeLogo: !!brandContext?.logoAssets?.primaryUrl
    })
    
    // Generate missing photos (use Imagen if available, otherwise placeholder)
    const generatedPhotos: Photo[] = []
    
    for (const spec of strategy.photosToGenerate) {
      const photo = await this.generatePhoto(spec, brandContext)
      generatedPhotos.push(photo)
      
      // Add delay between generations to avoid rate limiting
      if (isImagenAvailable() && strategy.photosToGenerate.indexOf(spec) < strategy.photosToGenerate.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 2000))
      }
    }
    
    // Combine with uploaded
    const allPhotos: Photo[] = [
      ...strategy.uploadedPhotoUsage.map(u => ({
        id: u.photoId,
        url: u.url,
        type: 'uploaded' as const,
        category: u.category,
        quality: u.quality
      })),
      ...generatedPhotos
    ]
    
    // Add BrandForge logos if available
    const logoPhotos: Photo[] = []
    let logoAssets: PhotoManifest['logoAssets'] = undefined
    
    if (brandContext?.logoAssets?.primaryUrl) {
      console.log('🖼️ Adding BrandForge logos to photo manifest')
      
      logoAssets = {
        primaryUrl: brandContext.logoAssets.primaryUrl,
        variations: brandContext.logoAssets.variations || []
      }
      
      // Add primary logo
      logoPhotos.push({
        id: `logo-primary-${Date.now()}`,
        url: brandContext.logoAssets.primaryUrl,
        type: 'brandforge',
        category: 'logo',
        quality: 10
      })
      
      // Add logo variations
      for (const variationUrl of (brandContext.logoAssets.variations || [])) {
        logoPhotos.push({
          id: `logo-variation-${Date.now()}-${Math.random().toString(36).substring(7)}`,
          url: variationUrl,
          type: 'brandforge',
          category: 'logo',
          quality: 10
        })
      }
      
      allPhotos.push(...logoPhotos)
    }
    
    // Organize by category
    const byCategory = {
      hero: allPhotos.filter(p => p.category === 'hero'),
      amenities: allPhotos.filter(p => p.category === 'amenity'),
      lifestyle: allPhotos.filter(p => p.category === 'lifestyle'),
      gallery: allPhotos.filter(p => p.category === 'gallery'),
      logos: logoPhotos
    }
    
    // Assign photos to sections
    const assignments = await this.assignPhotosToSections(allPhotos, pages)
    
    await this.logAction('photo_execution_complete', {
      totalPhotos: allPhotos.length,
      generated: generatedPhotos.length,
      fromBrandForge: logoPhotos.length
    })
    
    return {
      photos: allPhotos,
      byCategory,
      assignments,
      stats: {
        uploaded: strategy.uploadedPhotoUsage.length,
        generated: generatedPhotos.length,
        fromBrandForge: logoPhotos.length,
        total: allPhotos.length
      },
      logoAssets
    }
  }
  
  /**
   * Get uploaded photos from property KB
   */
  private async getUploadedPhotos(): Promise<Array<{ id: string; url: string; filename: string }>> {
    const { data } = await this.supabase
      .from('documents')
      .select('id, file_url, file_name')
      .eq('property_id', this.propertyId)
      .in('metadata->type', ['photo', 'image'])
    
    return (data || []).map(d => ({
      id: d.id,
      url: d.file_url,
      filename: d.file_name
    }))
  }
  
  /**
   * Analyze photos using Claude vision
   */
  private async analyzePhotos(
    photos: Array<{ id: string; url: string; filename: string }>,
    brandContext: BrandContext
  ): Promise<any[]> {
    
    // Analyze each photo in parallel (limit concurrency)
    const batchSize = 5
    const analyzed = []
    
    for (let i = 0; i < photos.length; i += batchSize) {
      const batch = photos.slice(i, i + batchSize)
      const batchResults = await Promise.all(
        batch.map(photo => this.analyzePhoto(photo, brandContext))
      )
      analyzed.push(...batchResults)
    }
    
    return analyzed
  }
  
  /**
   * Analyze single photo with Claude vision
   */
  private async analyzePhoto(
    photo: { id: string; url: string; filename: string },
    brandContext: BrandContext
  ): Promise<any> {
    
    try {
      const message = await this.anthropic.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1024,
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'image',
                source: {
                  type: 'url',
                  url: photo.url
                }
              },
              {
                type: 'text',
                text: `Analyze this property photo.

Brand Context: ${JSON.stringify(brandContext.visualIdentity.photoStyle)}

Categorize as:
- hero (wide, impressive, could be main image)
- amenity (specific amenity feature)
- lifestyle (people enjoying amenities)
- exterior (building, landscaping)
- interior (unit interiors)
- gallery (other quality photos)

Also rate:
- quality (1-10)
- brand_alignment (1-10, how well it matches brand photo style)
- mood (luxury, family-friendly, urban, etc.)
- scene (describe what's happening)
- has_people (true/false)

Output JSON only.`
              }
            ]
          }
        ]
      })
      
      const textContent = message.content.find(c => c.type === 'text')
      if (!textContent || textContent.type !== 'text') {
        throw new Error('No text response')
      }
      
      // Use shared robust JSON parser
      const analysis = this.parseJSON<any>(textContent.text, 'PhotoAgent.analyzePhoto')
      
      return {
        photoId: photo.id,
        url: photo.url,
        ...analysis
      }
    } catch (e) {
      console.error('Failed to analyze photo:', photo.id, e)
      return {
        photoId: photo.id,
        url: photo.url,
        category: 'gallery',
        quality: 5,
        brand_alignment: 5,
        mood: 'unknown',
        scene: 'unknown',
        has_people: false
      }
    }
  }
  
  /**
   * Get photo insights from vector search
   */
  private async getPhotoInsights() {
    const [amenityFocus, lifestyleMoments, visualDiff] = await Promise.all([
      this.vectorSearch("What amenities should be photographed and showcased prominently?"),
      this.vectorSearch("What lifestyle activities and moments are important to residents?"),
      this.vectorSearch("What visual features make this property stand out?")
    ])
    
    return { amenityFocus, lifestyleMoments, visualDiff }
  }
  
  /**
   * Extract photo needs from architecture
   */
  private extractPhotoNeeds(architecture: ArchitectureProposal): any[] {
    const needs: any[] = []
    
    for (const page of architecture.pages) {
      for (const section of page.sections) {
        if (section.photoRequirement) {
          needs.push({
            sectionId: section.id,
            ...section.photoRequirement
          })
        }
      }
    }
    
    return needs
  }
  
  /**
   * Create photo strategy using Claude
   */
  private async createStrategy(data: any): Promise<PhotoStrategy> {
    
    const systemPrompt = `You are a real estate photography director. You plan photo strategies that:
1. Use uploaded photos when they match brand quality
2. Generate missing photos following brand guidelines
3. Ensure lifestyle focus (people enjoying amenities)
4. Match Cadence Creek quality: professional, warm, lifestyle-focused`
    
    const prompt = `
Plan the photo strategy for this website.

# BRAND CONTEXT:
${JSON.stringify(data.brandContext.visualIdentity, null, 2)}

# ANALYZED UPLOADED PHOTOS:
${JSON.stringify(data.analyzedPhotos, null, 2)}

# PHOTO INSIGHTS (Vector search):
Amenity Focus: ${data.photoInsights.amenityFocus.map((d: any) => d.content).join('\n')}
Lifestyle Moments: ${data.photoInsights.lifestyleMoments.map((d: any) => d.content).join('\n')}
Visual Differentiators: ${data.photoInsights.visualDiff.map((d: any) => d.content).join('\n')}

# PHOTO NEEDS (From architecture):
${JSON.stringify(data.photoNeeds, null, 2)}

# YOUR TASK:

1. Assign uploaded photos to categories (use if quality ≥7 and brand_alignment ≥7)
2. Identify gaps (needed photos that uploaded don't cover)
3. Create generation prompts that follow brand.photoStyle exactly

# OUTPUT (JSON):

{
  "uploadedPhotoUsage": [
    {
      "photoId": "uuid",
      "url": "url",
      "category": "hero|amenity|lifestyle|gallery",
      "quality": 8,
      "useFor": "hero section - rooftop pool at sunset",
      "brandAlignment": 9,
      "reasoning": "High quality, matches brand sophisticated-relaxed mood"
    }
  ],
  
  "photosToGenerate": [
    {
      "category": "lifestyle",
      "scene": "residents enjoying rooftop pool at golden hour",
      "prompt": "Professional lifestyle photography for luxury apartment community, diverse active adult residents (55+) naturally enjoying resort-style rooftop pool, candid authentic moments, warm golden hour lighting, sophisticated-relaxed atmosphere, magazine-quality real estate photography, 4K resolution, natural interactions, professional color grading",
      "priority": "high",
      "reasoning": "Hero needs lifestyle shot, no uploaded photos match quality/brand"
    }
  ],
  
  "photoGuidelines": {
    "lighting": "From brand.photoStyle.lighting",
    "composition": "From brand.photoStyle.composition",
    "subjects": "From brand.photoStyle.subjects",
    "mood": "From brand.photoStyle.mood"
  }
}

# CRITICAL RULES:

1. Use uploaded if quality ≥7 AND brand_alignment ≥7
2. Generate prompts MUST include: subject, mood, lighting, composition from brand.photoStyle
3. For lifestyle shots: specify demographics from targetAudience
4. For amenity shots: specify which amenity from amenityFocus insights
5. Priority: high for hero/above-fold, medium for amenities, low for gallery
6. Cadence Creek style: 60%+ lifestyle ratio, warm lighting, people in photos
`
    
    const response = await this.callClaude(prompt, {
      systemPrompt,
      temperature: 1.0,
      maxTokens: 30000,
      jsonMode: true
    })
    
    // Use shared robust JSON parser
    return this.parseJSON<PhotoStrategy>(response, 'PhotoAgent')
  }
  
  /**
   * Generate photo using Google Imagen 3 (or placeholder if unavailable)
   */
  private async generatePhoto(spec: any, brandContext?: BrandContext): Promise<Photo> {
    
    await this.logAction('photo_generation', {
      category: spec.category,
      scene: spec.scene,
      imagenAvailable: isImagenAvailable()
    })
    
    // Try to use Imagen if available
    if (isImagenAvailable()) {
      try {
        console.log(`🎨 Generating photo with Imagen: ${spec.scene}`)
        
        // Build prompt using brand context for better results
        const prompt = spec.prompt || buildLifestylePhotoPrompt(spec.scene, {
          photoStyle: brandContext?.visualIdentity?.photoStyle,
          targetAudience: brandContext?.targetAudience
        })
        
        // Determine aspect ratio based on category
        const aspectRatio = spec.category === 'hero' ? '16:9' : 
                           spec.category === 'gallery' ? '4:3' : '16:9'
        
        const url = await generateAndUploadImage(prompt, {
          aspectRatio,
          negativePrompt: 'text, words, letters, watermark, signature, low quality, blurry, artificial, stock photo look, cartoon, anime, illustration',
          filename: `siteforge-${spec.category}-${Date.now()}`,
          folder: `${this.propertyId}/siteforge`
        })
        
        if (url) {
          console.log(`✅ Generated photo: ${url}`)
          return {
            id: crypto.randomUUID(),
            url,
            type: 'generated',
            category: spec.category,
            quality: 9,
            scene: spec.scene,
            prompt
          }
        }
      } catch (error) {
        console.error('❌ Imagen generation failed:', error)
        // Fall through to placeholder
      }
    }
    
    // Fallback: Return placeholder if Imagen unavailable or failed
    console.log(`⚠️ Using placeholder for ${spec.category} (Imagen not available or failed)`)
    return {
      id: crypto.randomUUID(),
      url: `https://placehold.co/1920x1080/2C3E50/FFFFFF?text=${encodeURIComponent(spec.scene || spec.category)}`,
      type: 'generated',
      category: spec.category,
      quality: 5, // Lower quality for placeholders
      scene: spec.scene,
      prompt: spec.prompt
    }
  }
  
  /**
   * Assign photos to sections
   */
  private async assignPhotosToSections(
    photos: Photo[],
    pages: any[]
  ): Promise<Map<string, string>> {
    
    const assignments = new Map<string, string>()
    
    // For each section that needs photos
    for (const page of pages) {
      for (const section of page.sections || []) {
        if (section.photoRequirement) {
          // Find best matching photo
          const matches = photos.filter(p => 
            p.category === section.photoRequirement.category
          )
          
          if (matches.length > 0) {
            // Pick highest quality
            const best = matches.sort((a, b) => b.quality - a.quality)[0]
            assignments.set(section.id, best.id)
          }
        }
      }
    }
    
    return assignments
  }
}






