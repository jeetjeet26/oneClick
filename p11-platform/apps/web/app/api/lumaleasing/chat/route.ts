import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/utils/supabase/admin';
import OpenAI from 'openai';

// CORS headers for cross-origin widget requests
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, X-API-Key, X-Visitor-ID',
};

// Handle CORS preflight
export async function OPTIONS() {
  return new NextResponse(null, { headers: corsHeaders });
}

export async function POST(req: NextRequest) {
  try {
    const apiKey = req.headers.get('X-API-Key');
    const visitorId = req.headers.get('X-Visitor-ID');

    if (!apiKey) {
      return NextResponse.json(
        { error: 'API key required' },
        { status: 401, headers: corsHeaders }
      );
    }

    const { 
      messages, 
      sessionId,
      leadInfo, // { first_name, last_name, email, phone }
    } = await req.json();

    const lastMessage = messages[messages.length - 1]?.content;
    if (!lastMessage) {
      return NextResponse.json(
        { error: 'Message required' },
        { status: 400, headers: corsHeaders }
      );
    }

    const supabase = createServiceClient();
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    // 1. Validate API key and get config
    const { data: config, error: configError } = await supabase
      .from('lumaleasing_config')
      .select('*, properties!inner(id, name, settings)')
      .eq('api_key', apiKey)
      .eq('is_active', true)
      .single();

    if (configError || !config) {
      return NextResponse.json(
        { error: 'Invalid or inactive API key' },
        { status: 401, headers: corsHeaders }
      );
    }

    const propertyId = config.property_id;
    const propertyName = config.properties?.name || 'our community';

    // 2. Get or create widget session
    let activeSessionId = sessionId;
    let widgetSession = null;

    if (activeSessionId) {
      const { data: existingSession } = await supabase
        .from('widget_sessions')
        .select('*')
        .eq('id', activeSessionId)
        .single();
      
      widgetSession = existingSession;
    }

    if (!widgetSession && visitorId) {
      // Create new session
      const { data: newSession } = await supabase
        .from('widget_sessions')
        .insert({
          property_id: propertyId,
          visitor_id: visitorId,
          user_agent: req.headers.get('user-agent'),
          referrer_url: req.headers.get('referer'),
        })
        .select()
        .single();
      
      widgetSession = newSession;
      activeSessionId = newSession?.id;
    }

    // 3. Handle lead capture if info provided
    let leadId = widgetSession?.lead_id;

    if (leadInfo && !leadId) {
      // Check if lead already exists with this email
      if (leadInfo.email) {
        const { data: existingLead } = await supabase
          .from('leads')
          .select('id')
          .eq('property_id', propertyId)
          .eq('email', leadInfo.email)
          .single();

        if (existingLead) {
          leadId = existingLead.id;
        }
      }

      // Create new lead if not found
      if (!leadId) {
        const { data: newLead } = await supabase
          .from('leads')
          .insert({
            property_id: propertyId,
            first_name: leadInfo.first_name || '',
            last_name: leadInfo.last_name || '',
            email: leadInfo.email || '',
            phone: leadInfo.phone || '',
            source: 'LumaLeasing Widget',
            status: 'new',
          })
          .select('id')
          .single();

        leadId = newLead?.id;
      }

      // Update session with lead
      if (widgetSession && leadId) {
        await supabase
          .from('widget_sessions')
          .update({ lead_id: leadId, converted_at: new Date().toISOString() })
          .eq('id', activeSessionId);
      }
    }

    // 4. Get or create conversation
    let conversationId = null;

    if (widgetSession) {
      // Check for existing conversation
      const { data: existingConv } = await supabase
        .from('conversations')
        .select('id, is_human_mode')
        .eq('widget_session_id', activeSessionId)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (existingConv) {
        conversationId = existingConv.id;

        // If in human mode, save message but don't generate AI response
        if (existingConv.is_human_mode) {
          await supabase.from('messages').insert({
            conversation_id: conversationId,
            role: 'user',
            content: lastMessage,
          });

          // Update session activity
          await supabase
            .from('widget_sessions')
            .update({ 
              last_activity_at: new Date().toISOString(),
              message_count: (widgetSession.message_count || 0) + 1
            })
            .eq('id', activeSessionId);

          return NextResponse.json({
            content: null,
            sessionId: activeSessionId,
            conversationId,
            isHumanMode: true,
            waitingForHuman: true,
          }, { headers: corsHeaders });
        }
      } else {
        // Create new conversation
        const { data: newConv } = await supabase
          .from('conversations')
          .insert({
            property_id: propertyId,
            lead_id: leadId,
            widget_session_id: activeSessionId,
            channel: 'widget',
          })
          .select('id')
          .single();

        conversationId = newConv?.id;
      }
    }

    // 5. Save user message
    if (conversationId) {
      await supabase.from('messages').insert({
        conversation_id: conversationId,
        role: 'user',
        content: lastMessage,
      });
    }

    // 6. Generate embedding for RAG search
    const embeddingResponse = await openai.embeddings.create({
      model: 'text-embedding-3-small',
      input: lastMessage,
    });
    const embedding = embeddingResponse.data[0].embedding;

    // 7. Search knowledge base
    const { data: documents } = await supabase.rpc('match_documents', {
      query_embedding: embedding,
      match_threshold: 0.5,
      match_count: 5,
      filter_property: propertyId,
    });

    const contextText = documents?.map((doc: { content: string }) => doc.content).join('\n---\n') || '';

    // 8. Detect intent for tour booking
    const tourKeywords = ['tour', 'visit', 'see', 'showing', 'appointment', 'schedule', 'book', 'come by', 'stop by', 'check out'];
    const wantsTour = tourKeywords.some(kw => lastMessage.toLowerCase().includes(kw));

    // 9. Build system prompt
    const systemPrompt = `You are ${config.widget_name || 'Luma'}, a friendly AI leasing assistant for ${propertyName}.

PERSONALITY:
- Warm, helpful, and professional
- Conversational but concise
- Enthusiastic about the property without being pushy
- Use emoji sparingly (1-2 max per response)

KNOWLEDGE BASE:
${contextText || 'No specific documents loaded yet.'}

FORMATTING RULES (CRITICAL):
1. NEVER use markdown formatting (**, *, -, #) in your responses
2. Present information in clean, natural sentences or simple paragraphs
3. When listing floor plans/pricing, use simple text like:
   "We have Studios starting at $2,915, 1-bedrooms from $3,060, and 2-bedrooms from $4,208"
4. For multiple items, use natural language: "We offer A, B, and C" instead of bullet lists
5. Keep numbers clean: "$2,915" not "**$2,915**"
6. Your response should read like a text message, not a formatted document

CUSTOMER SERVICE EXCELLENCE:
- Listen carefully and answer the specific question asked
- Anticipate follow-up questions and offer relevant next steps
- Be empathetic and acknowledge their needs/concerns
- Build rapport through personalized, conversational responses
- If they express urgency, prioritize their request
- Always end with an invitation for more questions or action (tour, call, etc.)

RESPONSE GUIDELINES:
1. Answer questions based ONLY on the knowledge base above
2. If info isn't available, say "I don't have that specific information, but I'd be happy to have someone from our team follow up with you!"
3. Keep responses under 150 words unless detailed info is requested
4. Be proactive: suggest tours, mention specials, highlight unique features
5. Match their energy: formal inquiry → professional tone, casual chat → friendly tone

${wantsTour ? `
TOUR BOOKING:
The user seems interested in scheduling a tour! Be enthusiastic and ask:
- What day/time works best for them
- If they have any specific things they'd like to see
Let them know you can help them book a tour.
` : ''}

${leadId ? '' : `
LEAD CAPTURE:
If this conversation is going well (3+ exchanges) and you haven't captured their info yet, naturally ask for their name and email/phone so the team can follow up with more details.
`}

Remember: You represent ${propertyName}. Provide exceptional customer service with clean, human-friendly responses!`;

    // 10. Generate AI response
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        ...messages.slice(-10).map((m: { role: string; content: string }) => ({
          role: m.role as 'user' | 'assistant',
          content: m.content,
        })),
      ],
      temperature: 0.7,
      max_tokens: 400,
    });

    const reply = completion.choices[0].message.content || "I'm sorry, I couldn't generate a response. Please try again!";

    // 11. Save AI response
    if (conversationId) {
      await supabase.from('messages').insert({
        conversation_id: conversationId,
        role: 'assistant',
        content: reply,
      });
    }

    // 12. Update session activity
    if (activeSessionId) {
      await supabase
        .from('widget_sessions')
        .update({ 
          last_activity_at: new Date().toISOString(),
          message_count: (widgetSession?.message_count || 0) + 1
        })
        .eq('id', activeSessionId);
    }

    // 13. Check if we should prompt for lead capture
    const shouldPromptLeadCapture = !leadId && 
      config.collect_email && 
      (widgetSession?.message_count || 0) >= 2;

    return NextResponse.json({
      content: reply,
      sessionId: activeSessionId,
      conversationId,
      shouldPromptLeadCapture,
      leadCapturePrompt: shouldPromptLeadCapture ? config.lead_capture_prompt : null,
      wantsTour,
    }, { headers: corsHeaders });

  } catch (error) {
    console.error('LumaLeasing Chat Error:', error);
    return NextResponse.json(
      { error: 'Failed to process message' },
      { status: 500, headers: corsHeaders }
    );
  }
}

