import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { GoogleAuth } from 'google-auth-library'
import path from 'path'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// Initialize Google Auth for Vertex AI Imagen
let vertexAuth: GoogleAuth | null = null
const projectId = process.env.GOOGLE_CLOUD_PROJECT_ID

if (process.env.GOOGLE_APPLICATION_CREDENTIALS && projectId) {
  const credentialsPath = path.resolve(process.cwd(), process.env.GOOGLE_APPLICATION_CREDENTIALS)
  vertexAuth = new GoogleAuth({
    keyFile: credentialsPath,
    scopes: ['https://www.googleapis.com/auth/cloud-platform']
  })
}

// Generate image using Vertex AI Imagen 3
async function generateImage(
  prompt: string,
  options: {
    aspectRatio?: string
    negativePrompt?: string
    sampleCount?: number
  } = {}
): Promise<{ base64Data: string; mimeType: string }[]> {
  if (!vertexAuth || !projectId) {
    throw new Error('Vertex AI not configured. Set GOOGLE_CLOUD_PROJECT_ID and GOOGLE_APPLICATION_CREDENTIALS.')
  }

  const client = await vertexAuth.getClient()
  const accessToken = await client.getAccessToken()
  
  if (!accessToken.token) {
    throw new Error('Failed to get access token for Vertex AI')
  }

  const requestBody = {
    instances: [{ prompt }],
    parameters: {
      sampleCount: options.sampleCount || 1,
      aspectRatio: options.aspectRatio || '1:1',
      personGeneration: 'allow_adult',
      negativePrompt: options.negativePrompt
    }
  }

  const location = 'us-central1'
  // Use Imagen 3 Fast for quicker generation, or imagen-3.0-generate-002 for higher quality
  // As of Dec 2025, imagen-3.0-generate-002 is the latest stable version
  const modelId = 'imagen-3.0-generate-002'
  const endpoint = `https://${location}-aiplatform.googleapis.com/v1/projects/${projectId}/locations/${location}/publishers/google/models/${modelId}:predict`

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: { 
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${accessToken.token}`
    },
    body: JSON.stringify(requestBody)
  })

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}))
    throw new Error(errorData.error?.message || `Image generation failed: ${response.status}`)
  }

  const data = await response.json()
  const predictions = data.predictions || []
  
  return predictions
    .filter((p: any) => p.bytesBase64Encoded)
    .map((p: any) => ({
      base64Data: p.bytesBase64Encoded,
      mimeType: p.mimeType || 'image/png'
    }))
}

// Upload image to Supabase storage
async function uploadToStorage(
  base64Data: string,
  mimeType: string,
  filename: string,
  folder: string
): Promise<string> {
  const buffer = Buffer.from(base64Data, 'base64')
  const extension = mimeType.includes('png') ? 'png' : 'jpg'
  const fullPath = `${folder}/${filename}.${extension}`

  const { error } = await supabase.storage
    .from('brand-assets')
    .upload(fullPath, buffer, {
      contentType: mimeType,
      upsert: true
    })

  if (error) {
    console.error('Storage upload error:', error)
    throw new Error('Failed to upload image to storage')
  }

  const { data: { publicUrl } } = supabase.storage
    .from('brand-assets')
    .getPublicUrl(fullPath)

  return publicUrl
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      brandAssetId,
      propertyId,
      type, // 'logo' | 'moodboard' | 'photo_examples'
      brandData // The brand strategy data from conversation
    } = body

    if (!brandAssetId || !propertyId || !type) {
      return NextResponse.json(
        { error: 'Missing required fields: brandAssetId, propertyId, type' },
        { status: 400 }
      )
    }

    const results: { type: string; url: string; prompt: string }[] = []
    const folder = `${propertyId}/brand`

    if (type === 'logo') {
      // Generate logo based on brand data
      // Generate 2 variations at a time to stay within quota
      const logoPrompt = buildLogoPrompt(brandData)
      
      const logoUrls: string[] = []
      
      // Generate in 2 batches of 2 to avoid quota issues
      for (let batch = 0; batch < 2; batch++) {
        try {
          if (batch > 0) {
            // Wait between batches to avoid rate limiting
            await new Promise(resolve => setTimeout(resolve, 2000))
          }
          
          const images = await generateImage(logoPrompt, {
            aspectRatio: '1:1',
            sampleCount: 2, // 2 variations per batch
            negativePrompt: 'text, words, letters, alphabet, typography, font, writing, label, caption, title, name, watermark, signature, low quality, blurry, pixelated, jpeg artifacts, multiple objects, cluttered, busy, complex'
          })

          for (let i = 0; i < images.length; i++) {
            try {
              const url = await uploadToStorage(
                images[i].base64Data,
                images[i].mimeType,
                `logo-${batch * 2 + i}-${Date.now()}`,
                folder
              )
              logoUrls.push(url)
              results.push({ type: 'logo', url, prompt: logoPrompt })
            } catch (err) {
              console.error(`Logo variation ${batch * 2 + i} upload failed:`, err)
            }
          }
        } catch (err: any) {
          console.error(`Logo batch ${batch} failed:`, err?.message || err)
          if (err?.message?.includes('Quota exceeded')) {
            break
          }
        }
      }

      if (logoUrls.length > 0) {
        // Update brand asset with logo URLs (first one as primary)
        await supabase
          .from('property_brand_assets')
          .update({
            section_6_logo: {
              ...brandData.section_6_logo,
              logoUrl: logoUrls[0], // Primary logo
              logoVariations: logoUrls, // All variations
              generatedAt: new Date().toISOString()
            },
            updated_at: new Date().toISOString()
          })
          .eq('id', brandAssetId)
      }
    }

    if (type === 'moodboard') {
      // Generate mood board images - limit to 4 to stay within quota
      const moodPrompts = buildMoodboardPrompts(brandData).slice(0, 4)

      const moodboardUrls: string[] = []

      for (let i = 0; i < moodPrompts.length; i++) {
        try {
          // Add delay between requests to avoid rate limiting (2 seconds)
          if (i > 0) {
            await new Promise(resolve => setTimeout(resolve, 2000))
          }
          
          const images = await generateImage(moodPrompts[i], {
            aspectRatio: '16:9',
            negativePrompt: 'text, words, letters, watermark, signature, low quality, cartoon, anime, illustration, drawing'
          })

          if (images.length > 0) {
            const url = await uploadToStorage(
              images[0].base64Data,
              images[0].mimeType,
              `moodboard-${i}-${Date.now()}`,
              folder
            )
            moodboardUrls.push(url)
            results.push({ type: 'moodboard', url, prompt: moodPrompts[i] })
          }
        } catch (err: any) {
          console.error(`Moodboard image ${i} failed:`, err?.message || err)
          // If quota exceeded, wait longer before next request
          if (err?.message?.includes('Quota exceeded')) {
            await new Promise(resolve => setTimeout(resolve, 10000))
          }
        }
      }

      // Update brand asset with moodboard URLs
      if (moodboardUrls.length > 0) {
        await supabase
          .from('property_brand_assets')
          .update({
            vision_board_url: moodboardUrls[0], // Primary mood board
            section_9_design_elements: {
              ...brandData.section_9_design_elements,
              moodboardUrls,
              generatedAt: new Date().toISOString()
            },
            updated_at: new Date().toISOString()
          })
          .eq('id', brandAssetId)
      }
    }

    if (type === 'photo_examples') {
      // Generate "Yep" photo examples
      const yepPrompts = buildPhotoYepPrompts(brandData)
      const yepUrls: string[] = []

      for (let i = 0; i < yepPrompts.length; i++) {
        try {
          const images = await generateImage(yepPrompts[i], {
            aspectRatio: '4:3',
            negativePrompt: 'text, words, watermark, low quality, artificial, staged, stock photo look'
          })

          if (images.length > 0) {
            const url = await uploadToStorage(
              images[0].base64Data,
              images[0].mimeType,
              `photo-yep-${i}-${Date.now()}`,
              folder
            )
            yepUrls.push(url)
            results.push({ type: 'photo_yep', url, prompt: yepPrompts[i] })
          }
        } catch (err) {
          console.error(`Photo yep ${i} failed:`, err)
        }
      }

      // Update brand asset
      if (yepUrls.length > 0) {
        await supabase
          .from('property_brand_assets')
          .update({
            section_10_photo_yep: {
              ...brandData.section_10_photo_yep,
              generatedPhotos: yepUrls,
              generatedAt: new Date().toISOString()
            },
            updated_at: new Date().toISOString()
          })
          .eq('id', brandAssetId)
      }
    }

    return NextResponse.json({
      success: true,
      generatedCount: results.length,
      results
    })

  } catch (error) {
    console.error('BrandForge image generation error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Image generation failed' },
      { status: 500 }
    )
  }
}

// Build logo prompt from brand data
// Best practice: Generate ICON ONLY, no text (text rendering in AI is unreliable)
function buildLogoPrompt(brandData: any): string {
  const personality = brandData?.conversation_summary?.brandPersonality || 'modern and sophisticated'
  const colors = brandData?.section_8_colors?.primary?.[0]?.name || 'gold and sage green'
  const colorHex = brandData?.section_8_colors?.primary?.[0]?.hex || '#C9A962'
  const logoStyle = brandData?.section_6_logo?.style || 'minimalist'
  const logoConcept = brandData?.section_6_logo?.concept || 'abstract geometric symbol'

  // Extract key visual elements from concept
  const conceptKeywords = logoConcept.toLowerCase()
  let visualDescription = 'abstract geometric symbol'
  
  if (conceptKeywords.includes('mountain')) {
    visualDescription = 'stylized mountain peaks, geometric triangular shapes'
  } else if (conceptKeywords.includes('aurora') || conceptKeywords.includes('glow')) {
    visualDescription = 'flowing curved lines suggesting northern lights or a sunrise glow'
  } else if (conceptKeywords.includes('wave') || conceptKeywords.includes('water')) {
    visualDescription = 'elegant flowing wave forms'
  } else if (conceptKeywords.includes('leaf') || conceptKeywords.includes('nature')) {
    visualDescription = 'organic leaf or nature-inspired shape'
  }

  return `Minimalist logo ICON design, symbol only, absolutely NO TEXT, NO LETTERS, NO WORDS.

Design: ${visualDescription}
Style: ${logoStyle}, ${personality}, premium luxury real estate branding
Colors: ${colors} (${colorHex}) with subtle gradients
Background: Pure white (#FFFFFF)
Format: Clean vector-style, scalable, professional

Requirements:
- ICON/SYMBOL ONLY - no text whatsoever
- Simple, memorable, timeless design
- Suitable for app icon, signage, print
- High contrast, clear silhouette
- Luxury apartment/real estate aesthetic`
}

// Build moodboard prompts from brand data
function buildMoodboardPrompts(brandData: any): string[] {
  const personality = brandData?.conversation_summary?.brandPersonality || 'warm and sophisticated'
  const targetAudience = brandData?.conversation_summary?.targetAudience || 'young professionals'
  const colorMood = brandData?.section_8_colors?.palette || 'warm earth tones'
  const photoMood = brandData?.section_10_photo_yep?.mood || 'aspirational and authentic'

  const baseStyle = `${personality} luxury apartment lifestyle, ${colorMood}, ${photoMood}, professional real estate photography`

  return [
    `Modern luxury apartment lobby interior, ${baseStyle}, natural lighting, welcoming atmosphere, high-end finishes`,
    `Rooftop amenity space with city views, ${baseStyle}, outdoor lounge furniture, sunset lighting, resort-style`,
    `Stylish apartment living room with large windows, ${baseStyle}, contemporary furniture, warm tones, inviting`,
    `Premium fitness center in luxury apartment building, ${baseStyle}, modern equipment, motivating atmosphere`,
    `Residents enjoying community pool area, ${baseStyle}, families and young professionals, authentic joy, lifestyle photography`,
    `Gourmet kitchen in luxury apartment, ${baseStyle}, chef-quality appliances, marble countertops, cooking scene`
  ]
}

// Build photo "Yep" prompts from brand data
function buildPhotoYepPrompts(brandData: any): string[] {
  const examples = brandData?.section_10_photo_yep?.examples || []
  const mood = brandData?.section_10_photo_yep?.mood || 'warm, authentic, aspirational'
  const target = brandData?.section_3_target_audience?.primary || 'young professionals and families'

  const baseStyle = `professional real estate photography, ${mood}, natural lighting, high quality`

  // If we have specific examples from the brand book, use those
  if (examples.length > 0) {
    return examples.slice(0, 4).map((example: string) => 
      `${example}, ${baseStyle}, showing ${target}`
    )
  }

  // Default photo prompts
  return [
    `Happy couple relaxing in modern apartment living room, ${baseStyle}`,
    `Young family cooking together in luxury kitchen, ${baseStyle}`,
    `Friends gathering on rooftop terrace with city skyline, ${baseStyle}`,
    `Person working from home in stylish apartment office nook, ${baseStyle}`
  ]
}

