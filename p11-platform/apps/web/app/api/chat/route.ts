import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/utils/supabase/admin';
import { createClient } from '@/utils/supabase/server';
import OpenAI from 'openai';

export async function POST(req: NextRequest) {
  try {
    // Auth check
    const supabaseAuth = await createClient();
    const { data: { user } } = await supabaseAuth.auth.getUser();

    const { messages, propertyId, conversationId, isHumanMessage } = await req.json();
    const lastMessage = messages[messages.length - 1].content;

    // 1. Initialize Clients
    const supabase = createServiceClient();
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    // 2. Get or create conversation
    let activeConversationId = conversationId;
    
    if (!activeConversationId && user) {
      // Check if there's a lead for this user (or create one for demo purposes)
      let leadId: string | null = null;
      
      // For demo, create a temporary lead if user is authenticated
      const { data: existingLead } = await supabase
        .from('leads')
        .select('id')
        .eq('property_id', propertyId)
        .eq('email', user.email)
        .single();
      
      if (existingLead) {
        leadId = existingLead.id;
      } else {
        // Create a demo lead for the authenticated user
        const { data: newLead } = await supabase
          .from('leads')
          .insert({
            property_id: propertyId,
            email: user.email,
            first_name: user.user_metadata?.full_name?.split(' ')[0] || 'User',
            last_name: user.user_metadata?.full_name?.split(' ').slice(1).join(' ') || '',
            source: 'AI Chat',
            status: 'contacted',
          })
          .select('id')
          .single();
        
        leadId = newLead?.id || null;
      }

      // Create new conversation
      const { data: newConversation } = await supabase
        .from('conversations')
        .insert({
          property_id: propertyId,
          lead_id: leadId,
          channel: 'chat',
        })
        .select('id')
        .single();
      
      activeConversationId = newConversation?.id;
    }

    // 3. Save user message to database
    if (activeConversationId) {
      await supabase.from('messages').insert({
        conversation_id: activeConversationId,
        role: isHumanMessage ? 'assistant' : 'user',
        content: lastMessage,
      });
    }

    // 3.5 Check if conversation is in human mode
    if (activeConversationId) {
      const { data: convState } = await supabase
        .from('conversations')
        .select('is_human_mode')
        .eq('id', activeConversationId)
        .single();
      
      // If in human mode and this is from a user (not agent), just save message, no AI response
      if (convState?.is_human_mode && !isHumanMessage) {
        return NextResponse.json({ 
          role: 'assistant', 
          content: null, // No AI response in human mode
          conversationId: activeConversationId,
          isHumanMode: true,
          waitingForHuman: true,
        });
      }
      
      // If this is a human agent message, just save and return
      if (isHumanMessage) {
        return NextResponse.json({
          role: 'assistant',
          content: lastMessage,
          conversationId: activeConversationId,
          isHumanMode: true,
          fromAgent: true,
        });
      }
    }

    // 4. Generate Embedding for User Query
    const embeddingResponse = await openai.embeddings.create({
      model: 'text-embedding-3-small',
      input: lastMessage,
    });
    const embedding = embeddingResponse.data[0].embedding;

    // 5. Search Knowledge Base (Supabase Vector)
    const { data: documents, error: matchError } = await supabase.rpc('match_documents', {
      query_embedding: embedding,
      match_threshold: 0.5,
      match_count: 3,
      filter_property: propertyId
    });

    if (matchError) {
      console.error('Vector search error:', matchError);
      return NextResponse.json({ 
        role: 'assistant', 
        content: "I'm having trouble accessing my knowledge base right now. Please try again.",
        conversationId: activeConversationId,
      });
    }

    // 6. Construct Context for LLM
    const contextText = documents?.map((doc: { content: string }) => doc.content).join('\n---\n') || "No specific documents found.";
    
    const systemPrompt = `You are Luma, a helpful AI leasing agent for this apartment community.
    
    CONTEXT FROM KNOWLEDGE BASE:
    ${contextText}
    
    INSTRUCTIONS:
    - Answer the user's question based ONLY on the context provided.
    - If the answer is not in the context, say "I don't have that information handy, but I can ask a property manager to follow up."
    - Be warm, professional, and concise.
    - Do not make up facts.
    - If asked about scheduling tours, be helpful and suggest common available times.
    - Always offer to help with more questions at the end.
    `;

    // 7. Generate Response (GPT-4o-mini)
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        ...messages.map((m: { role: string; content: string }) => ({ 
          role: m.role as 'user' | 'assistant', 
          content: m.content 
        }))
      ],
      temperature: 0.7,
      max_tokens: 500,
    });

    const reply = completion.choices[0].message.content || "I'm sorry, I couldn't generate a response.";

    // 8. Save assistant message to database
    if (activeConversationId) {
      await supabase.from('messages').insert({
        conversation_id: activeConversationId,
        role: 'assistant',
        content: reply,
      });
    }

    return NextResponse.json({ 
      role: 'assistant', 
      content: reply,
      conversationId: activeConversationId,
    });

  } catch (error) {
    console.error('Chat API Error:', error);
    return NextResponse.json({ 
      role: 'assistant', 
      content: "I'm sorry, I encountered an error processing your request." 
    }, { status: 500 });
  }
}
