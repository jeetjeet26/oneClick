import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { createAdminClient } from '@/utils/supabase/admin'
import { GoogleGenerativeAI } from '@google/generative-ai'

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GEMINI_API_KEY || '')

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { brandAssetId, hint } = await req.json()

    if (!brandAssetId) {
      return NextResponse.json({ error: 'brandAssetId required' }, { status: 400 })
    }

    const supabaseAdmin = createAdminClient()

    const { data: brand } = await supabaseAdmin
      .from('property_brand_assets')
      .select('*')
      .eq('id', brandAssetId)
      .single()

    if (!brand || !brand.draft_section) {
      return NextResponse.json({ error: 'No draft section to regenerate' }, { status: 400 })
    }

    const draftSection = brand.draft_section
    const currentData = draftSection.data

    // Build regeneration prompt
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-exp' })
    
    const regenerationPrompt = `
You previously generated this ${draftSection.name} section:
${JSON.stringify(currentData, null, 2)}

${hint ? `User feedback: "${hint}"` : 'Generate a new, different version.'}

Context:
${JSON.stringify(brand.conversation_summary)}

Approved sections:
${JSON.stringify({
  introduction: brand.section_1_introduction,
  positioning: brand.section_2_positioning,
  targetAudience: brand.section_3_target_audience,
  personas: brand.section_4_personas,
  nameStory: brand.section_5_name_story
})}

Generate a NEW version for the ${draftSection.name} section. Make it distinct from the previous version.
Output ONLY valid JSON matching the same structure.
`

    const result = await model.generateContent(regenerationPrompt)
    const responseText = result.response.text()
    
    const jsonMatch = responseText.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      throw new Error('Failed to extract JSON from regeneration')
    }

    const regeneratedData = JSON.parse(jsonMatch[0])

    // Update draft section with new version
    await supabaseAdmin
      .from('property_brand_assets')
      .update({
        draft_section: {
          ...draftSection,
          data: regeneratedData,
          version: (draftSection.version || 1) + 1,
          regenerated_at: new Date().toISOString()
        }
      })
      .eq('id', brandAssetId)

    return NextResponse.json({
      success: true,
      step: draftSection.step,
      sectionName: draftSection.name,
      data: regeneratedData,
      version: (draftSection.version || 1) + 1
    })

  } catch (error) {
    console.error('Regenerate Section Error:', error)
    return NextResponse.json({ 
      error: 'Regeneration failed', 
      details: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 })
  }
}



