import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import OpenAI from 'openai'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

/**
 * Embed brand book content into knowledge base for RAG
 * This makes brand assets searchable by other products (SiteForge, LumaLeasing, etc.)
 */
export async function POST(request: NextRequest) {
  try {
    const { brandAssetId, propertyId } = await request.json()

    if (!brandAssetId || !propertyId) {
      return NextResponse.json(
        { error: 'brandAssetId and propertyId required' },
        { status: 400 }
      )
    }

    // Fetch the brand asset
    const { data: brand, error: fetchError } = await supabase
      .from('property_brand_assets')
      .select('*')
      .eq('id', brandAssetId)
      .single()

    if (fetchError || !brand) {
      return NextResponse.json({ error: 'Brand asset not found' }, { status: 404 })
    }

    // Build content chunks from brand book sections
    const chunks: { content: string; metadata: Record<string, any> }[] = []

    // Section 1: Introduction
    if (brand.section_1_introduction) {
      const intro = brand.section_1_introduction
      chunks.push({
        content: `Brand Introduction: ${intro.title || 'Brand'}. Tagline: "${intro.tagline || ''}". ${intro.story || ''} Brand Essence: ${intro.brandEssence || ''}`,
        metadata: { section: 'introduction', type: 'brand_book' }
      })
    }

    // Section 2: Positioning
    if (brand.section_2_positioning) {
      const pos = brand.section_2_positioning
      chunks.push({
        content: `Brand Positioning: ${pos.statement || ''}. Differentiators: ${pos.differentiators?.join(', ') || ''}. Competitive Advantage: ${pos.competitiveAdvantage || ''}`,
        metadata: { section: 'positioning', type: 'brand_book' }
      })
    }

    // Section 3: Target Audience
    if (brand.section_3_target_audience) {
      const audience = brand.section_3_target_audience
      chunks.push({
        content: `Target Audience: ${audience.primary || ''}. Demographics: Age ${audience.demographics?.age || 'N/A'}, Income ${audience.demographics?.income || 'N/A'}. Psychographics: ${audience.psychographics || ''}`,
        metadata: { section: 'target_audience', type: 'brand_book' }
      })
    }

    // Section 4: Personas
    if (brand.section_4_personas?.personas) {
      const personas = brand.section_4_personas.personas
        .map((p: any) => `${p.name}: ${p.description} (Needs: ${p.needs})`)
        .join(' | ')
      chunks.push({
        content: `Brand Personas: ${personas}`,
        metadata: { section: 'personas', type: 'brand_book' }
      })
    }

    // Section 5: Name & Story
    if (brand.section_5_name_story) {
      const name = brand.section_5_name_story
      chunks.push({
        content: `Brand Name: "${name.name || ''}". Meaning: ${name.meaning || ''}. Origin Story: ${name.story || ''}`,
        metadata: { section: 'name_story', type: 'brand_book' }
      })
    }

    // Section 6: Logo
    if (brand.section_6_logo) {
      const logo = brand.section_6_logo
      chunks.push({
        content: `Logo Design: Concept - ${logo.concept || ''}. Style: ${logo.style || ''}. Variations: ${logo.variations?.join(', ') || ''}. Logo URL: ${logo.logoUrl || 'Not generated'}`,
        metadata: { 
          section: 'logo', 
          type: 'brand_book',
          logo_url: logo.logoUrl || null,
          has_generated_logo: !!logo.logoUrl
        }
      })
    }

    // Section 7: Typography
    if (brand.section_7_typography) {
      const typo = brand.section_7_typography
      chunks.push({
        content: `Typography: Primary Font - ${typo.primaryFont?.name || ''} (${typo.primaryFont?.usage || ''}). Secondary Font - ${typo.secondaryFont?.name || ''} (${typo.secondaryFont?.usage || ''}). Hierarchy: ${typo.hierarchy || ''}`,
        metadata: { 
          section: 'typography', 
          type: 'brand_book',
          primary_font: typo.primaryFont?.name,
          secondary_font: typo.secondaryFont?.name
        }
      })
    }

    // Section 8: Colors
    if (brand.section_8_colors) {
      const colors = brand.section_8_colors
      const primaryColors = colors.primary?.map((c: any) => `${c.name} (${c.hex})`).join(', ') || ''
      const secondaryColors = colors.secondary?.map((c: any) => `${c.name} (${c.hex})`).join(', ') || ''
      chunks.push({
        content: `Color Palette: ${colors.palette || ''}. Primary Colors: ${primaryColors}. Secondary Colors: ${secondaryColors}`,
        metadata: { 
          section: 'colors', 
          type: 'brand_book',
          primary_colors: colors.primary?.map((c: any) => c.hex) || [],
          secondary_colors: colors.secondary?.map((c: any) => c.hex) || []
        }
      })
    }

    // Section 9: Design Elements
    if (brand.section_9_design_elements) {
      const design = brand.section_9_design_elements
      chunks.push({
        content: `Design Elements: Patterns - ${design.patterns || ''}. Textures - ${design.textures || ''}. Iconography - ${design.iconography || ''}. Photography Style - ${design.photography || ''}`,
        metadata: { 
          section: 'design_elements', 
          type: 'brand_book',
          moodboard_urls: design.moodboardUrls || []
        }
      })
    }

    // Section 10: Photo Yep
    if (brand.section_10_photo_yep) {
      const yep = brand.section_10_photo_yep
      chunks.push({
        content: `Photo Guidelines (Approved): ${yep.description || ''}. Mood: ${yep.mood || ''}. Examples: ${yep.examples?.join(', ') || ''}`,
        metadata: { 
          section: 'photo_yep', 
          type: 'brand_book',
          photo_urls: yep.generatedPhotos || []
        }
      })
    }

    // Section 11: Photo Nope
    if (brand.section_11_photo_nope) {
      const nope = brand.section_11_photo_nope
      chunks.push({
        content: `Photo Guidelines (Avoid): ${nope.description || ''}. Reasoning: ${nope.reasoning || ''}. Photos to avoid: ${nope.examples?.join(', ') || ''}`,
        metadata: { section: 'photo_nope', type: 'brand_book' }
      })
    }

    // Section 12: Implementation
    if (brand.section_12_implementation) {
      const impl = brand.section_12_implementation
      chunks.push({
        content: `Brand Implementation: Signage - ${impl.signage || ''}. Collateral - ${impl.collateral || ''}. Digital - ${impl.digital || ''}. Environment - ${impl.environment || ''}`,
        metadata: { section: 'implementation', type: 'brand_book' }
      })
    }

    // Conversation Summary (master reference)
    if (brand.conversation_summary) {
      const summary = brand.conversation_summary
      chunks.push({
        content: `Brand Strategy Summary: Brand Name - ${summary.brandName || ''}. Tagline - "${summary.tagline || ''}". Target Audience - ${summary.targetAudience || ''}. Brand Personality - ${summary.brandPersonality || ''}. Color Direction - ${summary.colorDirection || ''}. Positioning - ${summary.positioning || ''}`,
        metadata: { 
          section: 'summary', 
          type: 'brand_book',
          brand_name: summary.brandName,
          tagline: summary.tagline
        }
      })
    }

    // Delete any existing brand book embeddings for this property
    await supabase
      .from('documents')
      .delete()
      .eq('property_id', propertyId)
      .eq('metadata->>type', 'brand_book')

    // Generate embeddings and insert
    let embeddedCount = 0
    for (const chunk of chunks) {
      try {
        const embeddingResponse = await openai.embeddings.create({
          model: 'text-embedding-3-small',
          input: chunk.content
        })

        const embedding = embeddingResponse.data[0].embedding

        const { error: insertError } = await supabase
          .from('documents')
          .insert({
            property_id: propertyId,
            content: chunk.content,
            metadata: {
              ...chunk.metadata,
              brand_asset_id: brandAssetId,
              embedded_at: new Date().toISOString()
            },
            embedding
          })

        if (insertError) {
          console.error('Error inserting embedding:', insertError)
        } else {
          embeddedCount++
        }
      } catch (err) {
        console.error('Error generating embedding for chunk:', err)
      }
    }

    // Update brand asset to mark as embedded
    await supabase
      .from('property_brand_assets')
      .update({
        updated_at: new Date().toISOString()
      })
      .eq('id', brandAssetId)

    return NextResponse.json({
      success: true,
      embeddedChunks: embeddedCount,
      totalChunks: chunks.length,
      message: `Brand book embedded into knowledge base (${embeddedCount}/${chunks.length} chunks)`
    })

  } catch (error) {
    console.error('Brand book embedding error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Embedding failed' },
      { status: 500 }
    )
  }
}












