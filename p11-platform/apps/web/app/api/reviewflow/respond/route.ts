import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import OpenAI from 'openai'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
})

type ResponseTone = 'professional' | 'empathetic' | 'friendly' | 'apologetic'

interface GenerateResponseParams {
  reviewText: string
  rating: number | null
  sentiment: string
  topics: string[]
  propertyName?: string
  propertyPersonality?: string
  tone: ResponseTone
  reviewerName?: string
}

async function generateResponse(params: GenerateResponseParams): Promise<string> {
  const { reviewText, rating, sentiment, topics, propertyName, propertyPersonality, tone, reviewerName } = params

  const toneInstructions: Record<ResponseTone, string> = {
    professional: 'Be professional, courteous, and business-like.',
    empathetic: 'Show genuine empathy and understanding. Acknowledge their feelings.',
    friendly: 'Be warm, conversational, and personable.',
    apologetic: 'Express sincere apology for any issues. Show accountability.'
  }

  const systemPrompt = `You are responding to an online review for ${propertyName || 'our apartment community'}.
${propertyPersonality ? `Property personality: ${propertyPersonality}` : ''}

Guidelines:
- ${toneInstructions[tone]}
- Keep the response between 50-150 words
- ${sentiment === 'negative' ? 'Address their concerns and offer to make it right' : 'Thank them for their kind words'}
- ${sentiment === 'negative' ? 'Never be defensive or dismissive' : 'Mention specific things they appreciated if possible'}
- Include a call to action when appropriate (visit again, contact us, etc.)
- Do NOT use clichéd phrases like "We appreciate your feedback"
- Make it feel personal and genuine, not templated
- ${reviewerName ? `Address them by name: ${reviewerName}` : 'Do not assume their name'}
${topics.length > 0 ? `- Reference these specific topics mentioned: ${topics.join(', ')}` : ''}

Original Review Rating: ${rating || 'N/A'}/5
Detected Sentiment: ${sentiment}`

  const completion = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: `Please write a response to this review:\n\n"${reviewText}"` }
    ],
    temperature: 0.7,
    max_tokens: 300
  })

  return completion.choices[0].message.content || 'Thank you for your review. We value your feedback.'
}

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const body = await request.json()
  
  const { reviewId, tone = 'professional', customPrompt } = body

  if (!reviewId) {
    return NextResponse.json({ error: 'reviewId is required' }, { status: 400 })
  }

  // Fetch the review with property info
  const { data: review, error: reviewError } = await supabase
    .from('reviews')
    .select(`
      *,
      properties (
        name,
        settings
      )
    `)
    .eq('id', reviewId)
    .single()

  if (reviewError || !review) {
    return NextResponse.json({ error: 'Review not found' }, { status: 404 })
  }

  // Fetch ReviewFlow config for property personality
  const { data: config } = await supabase
    .from('reviewflow_config')
    .select('property_personality, default_tone')
    .eq('property_id', review.property_id)
    .single()

  // Generate the response
  const responseText = await generateResponse({
    reviewText: review.review_text,
    rating: review.rating,
    sentiment: review.sentiment || 'neutral',
    topics: review.topics || [],
    propertyName: review.properties?.name,
    propertyPersonality: config?.property_personality,
    tone: tone || config?.default_tone || 'professional',
    reviewerName: review.reviewer_name
  })

  // Save the generated response
  const { data: savedResponse, error: saveError } = await supabase
    .from('review_responses')
    .insert({
      review_id: reviewId,
      response_text: responseText,
      response_type: 'ai_generated',
      status: 'draft',
      tone,
      ai_model: 'gpt-4o-mini',
      generation_prompt: customPrompt || null
    })
    .select()
    .single()

  if (saveError) {
    console.error('Error saving response:', saveError)
    return NextResponse.json({ error: saveError.message }, { status: 500 })
  }

  // Update review status
  await supabase
    .from('reviews')
    .update({ 
      response_status: 'draft_ready',
      updated_at: new Date().toISOString()
    })
    .eq('id', reviewId)

  return NextResponse.json({ 
    response: savedResponse,
    responseText 
  })
}

// Approve and optionally post a response
export async function PATCH(request: NextRequest) {
  const supabase = await createClient()
  const body = await request.json()
  
  const { responseId, action, editedText } = body

  if (!responseId || !action) {
    return NextResponse.json({ error: 'responseId and action are required' }, { status: 400 })
  }

  // Get current user
  const { data: { user } } = await supabase.auth.getUser()

  if (action === 'approve') {
    const { data, error } = await supabase
      .from('review_responses')
      .update({
        status: 'approved',
        response_text: editedText || undefined,
        approved_by: user?.id,
        approved_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', responseId)
      .select('review_id')
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Update review status
    if (data) {
      await supabase
        .from('reviews')
        .update({ 
          response_status: 'approved',
          updated_at: new Date().toISOString()
        })
        .eq('id', data.review_id)
    }

    return NextResponse.json({ success: true, status: 'approved' })
  }

  if (action === 'reject') {
    const { data, error } = await supabase
      .from('review_responses')
      .update({
        status: 'rejected',
        rejected_reason: body.reason,
        updated_at: new Date().toISOString()
      })
      .eq('id', responseId)
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, status: 'rejected' })
  }

  if (action === 'post') {
    // Mark as posted (actual platform posting would be implemented separately)
    const { data, error } = await supabase
      .from('review_responses')
      .update({
        status: 'posted',
        posted_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', responseId)
      .select('review_id')
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Update review status
    if (data) {
      await supabase
        .from('reviews')
        .update({ 
          response_status: 'posted',
          updated_at: new Date().toISOString()
        })
        .eq('id', data.review_id)
    }

    return NextResponse.json({ success: true, status: 'posted' })
  }

  return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
}

