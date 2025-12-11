// SiteForge: LLM Orchestration Layer
// Handles all Gemini 3 Pro interactions for site generation
// Created: December 11, 2025

import { GoogleGenerativeAI } from '@google/generative-ai'
import type {
  SiteContext,
  SiteArchitecture,
  GeneratedPage,
  PageSection,
  ACFBlockType
} from '@/types/siteforge'

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GEMINI_API_KEY!)

/**
 * Extract JSON from AI response that may be wrapped in markdown code blocks
 * Handles responses like: ```json\n{...}\n``` or ```\n{...}\n```
 */
function extractJsonFromResponse(responseText: string): string {
  // Remove markdown code block wrapper if present
  let cleaned = responseText.trim()
  
  // Handle ```json ... ``` or ``` ... ```
  const codeBlockMatch = cleaned.match(/^```(?:json)?\s*\n?([\s\S]*?)\n?```$/i)
  if (codeBlockMatch) {
    cleaned = codeBlockMatch[1].trim()
  }
  
  // Also handle case where there might be multiple code blocks or text before/after
  // Look for the first { to the last }
  const firstBrace = cleaned.indexOf('{')
  const lastBrace = cleaned.lastIndexOf('}')
  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
    cleaned = cleaned.substring(firstBrace, lastBrace + 1)
  }
  
  return cleaned
}

// ACF Blocks available in Collection theme
const ACF_BLOCKS = [
  { name: 'acf/menu', purpose: 'Section navigation menu', bestFor: ['all'] },
  { name: 'acf/top-slides', purpose: 'Hero carousel with CTA', bestFor: ['home', 'floor-plans'] },
  { name: 'acf/text-section', purpose: 'Text content', bestFor: ['about', 'policies'] },
  { name: 'acf/feature-section', purpose: 'Two-column feature highlight', bestFor: ['home', 'amenities'] },
  { name: 'acf/image', purpose: 'Single large image', bestFor: ['visual breaks'] },
  { name: 'acf/links', purpose: 'CTA buttons', bestFor: ['all'] },
  { name: 'acf/content-grid', purpose: 'Grid of items with icons/images', bestFor: ['amenities', 'features'] },
  { name: 'acf/form', purpose: 'Contact/interest form', bestFor: ['contact', 'schedule-tour'] },
  { name: 'acf/map', purpose: 'Google Maps with directions', bestFor: ['location', 'contact'] },
  { name: 'acf/html-section', purpose: 'Custom HTML', bestFor: ['special features'] },
  { name: 'acf/gallery', purpose: 'Photo gallery', bestFor: ['gallery', 'amenities'] },
  { name: 'acf/accordion-section', purpose: 'FAQ or expandable content', bestFor: ['faq', 'policies'] },
  { name: 'acf/plans-availability', purpose: 'Interactive floorplans', bestFor: ['floor-plans'] },
  { name: 'acf/poi', purpose: 'Points of interest map', bestFor: ['neighborhood'] }
]

/**
 * Plan complete site architecture using Gemini 3 Pro
 */
export async function planSiteArchitecture(context: SiteContext): Promise<SiteArchitecture> {
  const model = genAI.getGenerativeModel({
    model: 'gemini-3-pro-preview',
    generationConfig: {
      temperature: 1.0, // Gemini 3 default - don't change
      responseMimeType: 'application/json'
    }
  })
  
  const prompt = `You are an expert WordPress site architect for multifamily real estate.

CONTEXT:
Property: ${context.property.name}
Location: ${context.property.address.city}, ${context.property.address.state}
Brand Voice: ${context.brand.data.brandVoice || 'professional'}
Target Audience: ${context.brand.data.targetAudience || 'young professionals'}
Key Amenities: ${context.property.amenities.slice(0, 10).join(', ')}
${context.competitors.commonPatterns.length > 0 ? `Competitors emphasize: ${context.competitors.commonPatterns.join(', ')}` : ''}

USER PREFERENCES:
${context.preferences?.style ? `Style: ${context.preferences.style}` : ''}
${context.preferences?.emphasis ? `Emphasis: ${context.preferences.emphasis}` : ''}
${context.preferences?.ctaPriority ? `CTA Priority: ${context.preferences.ctaPriority}` : ''}

AVAILABLE ACF BLOCKS:
${ACF_BLOCKS.map(b => `- ${b.name}: ${b.purpose} (best for: ${b.bestFor.join(', ')})`).join('\n')}

TASK: Plan the complete site structure and page layouts.

REQUIREMENTS:
1. Create 5-8 pages maximum (most users visit 2-3 pages)
2. Every page needs a clear next action/CTA
3. Mobile-first design (60% of traffic)
4. Use only the ACF blocks listed above
5. Match the brand personality in structure
6. Differentiate from competitors where possible

OUTPUT FORMAT (JSON):
{
  "navigation": {
    "structure": "primary" | "mega" | "hamburger",
    "items": [
      { "label": "Home", "slug": "home", "priority": "high" }
    ],
    "cta": { "text": "Schedule Tour", "style": "primary" }
  },
  "pages": [
    {
      "slug": "home",
      "title": "Home",
      "purpose": "Convert prospects to tour bookings",
      "sections": [
        {
          "type": "hero",
          "acfBlock": "acf/top-slides",
          "reasoning": "Strong visual first impression with immediate CTA",
          "order": 1
        }
      ]
    }
  ],
  "designDecisions": {
    "colorStrategy": "Use primary color for CTAs, secondary for accents",
    "imageStrategy": "Lifestyle photography emphasizing community",
    "contentDensity": "balanced",
    "conversionOptimization": ["Above-fold CTA", "Social proof", "Easy contact"]
  }
}

IMPORTANT: Be direct and concise. Plan a site that converts prospects to tours.`

  const result = await model.generateContent({
    contents: [{ role: 'user', parts: [{ text: prompt }] }],
    generationConfig: {
      thinkingConfig: { thinkingLevel: 'high' } // Deep reasoning for architecture
    }
  })
  
  const responseText = result.response.text()
  const cleanedJson = extractJsonFromResponse(responseText)
  
  try {
    return JSON.parse(cleanedJson)
  } catch (parseError) {
    console.error('Failed to parse architecture JSON:', parseError)
    console.error('Raw response:', responseText.substring(0, 500))
    throw new Error('AI returned invalid JSON for site architecture. Please try again.')
  }
}

/**
 * Generate content for ALL pages in a single API call
 * This approach:
 * - Uses only 1 API request (avoids rate limits)
 * - AI sees the whole site context for consistent messaging
 * - Sections can reference each other cohesively
 */
export async function generateAllPageContent(
  architecture: SiteArchitecture,
  context: SiteContext
): Promise<GeneratedPage[]> {
  const model = genAI.getGenerativeModel({
    model: 'gemini-3-pro-preview',
    generationConfig: {
      temperature: 1.0,
      responseMimeType: 'application/json'
    }
  })
  
  // Build a comprehensive prompt for ALL content
  const prompt = buildFullSiteContentPrompt(architecture, context)
  
  console.log('Generating all page content in single API call...')
  
  const result = await model.generateContent({
    contents: [{ role: 'user', parts: [{ text: prompt }] }],
    generationConfig: {
      thinkingConfig: { thinkingLevel: 'medium' } // Balance quality and speed
    }
  })
  
  const responseText = result.response.text()
  const cleanedJson = extractJsonFromResponse(responseText)
  
  try {
    const generatedContent = JSON.parse(cleanedJson)
    
    // Merge generated content back into architecture pages
    return architecture.pages.map(page => {
      const pageContent = generatedContent.pages?.find((p: any) => p.slug === page.slug)
      
      if (!pageContent) {
        console.warn(`No content generated for page: ${page.slug}`)
        return page
      }
      
      return {
        ...page,
        sections: page.sections.map((section, idx) => {
          const sectionContent = pageContent.sections?.[idx]?.content
          return {
            ...section,
            content: sectionContent || {}
          }
        })
      }
    })
  } catch (parseError) {
    console.error('Failed to parse full site content JSON:', parseError)
    console.error('Raw response (first 1000 chars):', responseText.substring(0, 1000))
    throw new Error('AI returned invalid JSON for site content. Please try again.')
  }
}

/**
 * Build comprehensive prompt for generating ALL site content at once
 */
function buildFullSiteContentPrompt(
  architecture: SiteArchitecture,
  context: SiteContext
): string {
  // Build the page structure for the prompt
  const pagesStructure = architecture.pages.map(page => ({
    slug: page.slug,
    title: page.title,
    purpose: page.purpose,
    sections: page.sections.map(section => ({
      type: section.type,
      acfBlock: section.acfBlock,
      reasoning: section.reasoning,
      order: section.order,
      schema: getACFBlockSchema(section.acfBlock)
    }))
  }))
  
  return `You are an expert copywriter for multifamily real estate websites.
Generate compelling, conversion-focused content for an ENTIRE website in one response.

=== PROPERTY CONTEXT ===
Property Name: ${context.property.name}
Location: ${context.property.address.city}, ${context.property.address.state}
${context.property.unitCount ? `Units: ${context.property.unitCount}` : ''}
${context.property.yearBuilt ? `Year Built: ${context.property.yearBuilt}` : ''}

=== BRAND GUIDELINES ===
Brand Voice: ${context.brand.data.brandVoice || 'professional and welcoming'}
Target Audience: ${context.brand.data.targetAudience || 'young professionals'}
Brand Personality: ${context.brand.data.brandPersonality?.join(', ') || 'modern, approachable, trustworthy'}
${context.brand.data.tagline ? `Tagline: ${context.brand.data.tagline}` : ''}
${context.brand.data.positioning ? `Positioning: ${context.brand.data.positioning}` : ''}

=== AMENITIES ===
${context.property.amenities.slice(0, 15).map((a, i) => `${i + 1}. ${a}`).join('\n')}

=== AVAILABLE PHOTOS ===
${context.property.photos.slice(0, 10).map((p, i) => `${i}. ${p.alt || p.category || 'Property photo'}`).join('\n')}

=== DESIGN STRATEGY ===
${architecture.designDecisions?.colorStrategy || 'Use primary brand colors for CTAs'}
${architecture.designDecisions?.imageStrategy || 'Lifestyle photography emphasizing community'}
Conversion Goals: ${architecture.designDecisions?.conversionOptimization?.join(', ') || 'Tour bookings, contact form submissions'}

=== SITE STRUCTURE ===
${JSON.stringify(pagesStructure, null, 2)}

=== YOUR TASK ===
Generate content for EVERY section on EVERY page. Ensure:
1. Consistent brand voice across all pages
2. CTAs that guide users toward conversion (tours, applications, contact)
3. Each page has a clear purpose and next action
4. Content references property-specific details (amenities, location, etc.)
5. Headlines are compelling and benefit-focused (not generic)
6. Copy is scannable with short paragraphs
7. Cross-page coherence (don't repeat the same phrases, but maintain theme)

=== OUTPUT FORMAT ===
Return JSON with this exact structure:
{
  "pages": [
    {
      "slug": "home",
      "sections": [
        {
          "order": 1,
          "content": { /* content matching the ACF block schema */ }
        }
      ]
    }
  ]
}

Each section's "content" must match the schema provided in the site structure above.
Generate real, specific content - not placeholder text.
Make it compelling enough to convert a prospect into a tour booking.`
}

/**
 * Get ACF block schema for content generation
 */
function getACFBlockSchema(blockType: ACFBlockType): string {
  const schemas: Record<ACFBlockType, string> = {
    'acf/top-slides': `{
  "slides": [
    {
      "image_index": 0,
      "headline": "Compelling headline (5-8 words)",
      "subheadline": "Supporting text (10-15 words)",
      "cta_text": "Schedule Tour",
      "cta_link": "/contact"
    }
  ]
}`,
    'acf/text-section': `{
  "headline": "Section headline",
  "content": "<p>Paragraph text with HTML tags</p>",
  "layout": "center" | "left" | "right",
  "background": "white" | "light" | "dark"
}`,
    'acf/content-grid': `{
  "columns": 3,
  "items": [
    {
      "headline": "Feature name",
      "description": "Benefit-focused description (20-30 words)",
      "icon": "fa-swimming-pool",
      "image_index": null
    }
  ]
}`,
    'acf/feature-section': `{
  "image_index": 0,
  "headline": "Feature headline",
  "content": "<p>Feature description</p>",
  "layout": "image-left" | "image-right",
  "cta_text": "Learn More",
  "cta_link": "/amenities"
}`,
    'acf/gallery': `{
  "layout": "grid" | "carousel",
  "image_indices": [0, 1, 2, 3, 4, 5]
}`,
    'acf/form': `{
  "heading": "Schedule Your Tour",
  "subheading": "We'll get back to you within 24 hours",
  "form_type": "contact",
  "redirect_url": "/thank-you"
}`,
    'acf/map': `{
  "show_directions": true,
  "zoom_level": 15
}`,
    'acf/links': `{
  "links": [
    {
      "text": "CTA text",
      "url": "/page",
      "style": "primary" | "secondary"
    }
  ]
}`,
    'acf/accordion-section': `{
  "items": [
    {
      "title": "Question or section title",
      "content": "<p>Answer or content</p>"
    }
  ]
}`,
    'acf/image': `{
  "image_index": 0,
  "caption": "Image caption",
  "size": "full" | "large" | "medium"
}`,
    'acf/html-section': `{
  "html_content": "<div>Custom HTML content</div>"
}`,
    'acf/menu': `{
  "menu_items": ["Home", "Amenities", "Floor Plans", "Gallery", "Contact"]
}`,
    'acf/plans-availability': `{
  "data_source": "yardi"
}`,
    'acf/poi': `{
  "categories": ["restaurants", "shopping", "entertainment", "transit"],
  "radius_miles": 2,
  "intro_text": "Explore everything nearby"
}`
  }
  
  return schemas[blockType] || '{}'
}

/**
 * Refine site based on user feedback
 */
export async function refineSite(
  architecture: SiteArchitecture,
  context: SiteContext,
  refinements: {
    tone?: string
    emphasis?: string
    cta?: string
  }
): Promise<SiteArchitecture> {
  // TODO: Implement refinement logic
  // This will regenerate specific aspects based on user feedback
  console.log('TODO: Implement site refinement')
  return architecture
}
