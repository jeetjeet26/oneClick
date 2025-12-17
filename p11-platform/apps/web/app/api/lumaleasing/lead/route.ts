import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/utils/supabase/admin';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, X-API-Key, X-Visitor-ID',
};

export async function OPTIONS() {
  return new NextResponse(null, { headers: corsHeaders });
}

// POST - Capture lead information
export async function POST(req: NextRequest) {
  try {
    const apiKey = req.headers.get('X-API-Key');

    if (!apiKey) {
      return NextResponse.json(
        { error: 'API key required' },
        { status: 401, headers: corsHeaders }
      );
    }

    const body = await req.json();
    
    // Support both direct fields and leadInfo wrapper
    const leadInfo = body.leadInfo || body;
    const sessionId = body.sessionId;
    const conversationId = body.conversationId;
    
    const firstName = leadInfo.first_name || leadInfo.firstName || '';
    const lastName = leadInfo.last_name || leadInfo.lastName || '';
    const email = leadInfo.email || '';
    const phone = leadInfo.phone || '';
    const moveInDate = leadInfo.moveInDate;
    const bedroomPreference = leadInfo.bedroomPreference;
    const notes = leadInfo.notes;

    if (!email && !phone) {
      return NextResponse.json(
        { error: 'Email or phone is required' },
        { status: 400, headers: corsHeaders }
      );
    }

    const supabase = createServiceClient();

    // Validate API key
    const { data: config } = await supabase
      .from('lumaleasing_config')
      .select('property_id')
      .eq('api_key', apiKey)
      .eq('is_active', true)
      .single();

    if (!config) {
      return NextResponse.json(
        { error: 'Invalid API key' },
        { status: 401, headers: corsHeaders }
      );
    }

    // Check if lead already exists
    let leadId: string | null = null;

    if (email) {
      const { data: existingLead } = await supabase
        .from('leads')
        .select('id')
        .eq('property_id', config.property_id)
        .eq('email', email)
        .single();

      if (existingLead) {
        leadId = existingLead.id;
        // Update existing lead
        await supabase
          .from('leads')
          .update({
            first_name: firstName || undefined,
            last_name: lastName || undefined,
            phone: phone || undefined,
          })
          .eq('id', leadId);
      }
    }

    // Create new lead if not found
    if (!leadId) {
      const { data: newLead, error } = await supabase
        .from('leads')
        .insert({
          property_id: config.property_id,
          first_name: firstName || '',
          last_name: lastName || '',
          email: email || '',
          phone: phone || '',
          source: 'LumaLeasing Widget',
          status: 'new',
        })
        .select('id')
        .single();

      if (error) {
        console.error('Lead creation error:', error);
        return NextResponse.json(
          { error: 'Failed to save information' },
          { status: 500, headers: corsHeaders }
        );
      }

      leadId = newLead?.id;
    }

    // Add notes as activity if provided
    if (leadId && (notes || moveInDate || bedroomPreference)) {
      const details = [];
      if (moveInDate) details.push(`Move-in: ${moveInDate}`);
      if (bedroomPreference) details.push(`Bedrooms: ${bedroomPreference}`);
      if (notes) details.push(`Notes: ${notes}`);

      await supabase
        .from('lead_activities')
        .insert({
          lead_id: leadId,
          type: 'note',
          description: `Widget Lead Capture: ${details.join(', ')}`,
          metadata: { moveInDate, bedroomPreference, notes },
        });
    }

    // Update session with lead
    if (sessionId && leadId) {
      await supabase
        .from('widget_sessions')
        .update({ 
          lead_id: leadId, 
          converted_at: new Date().toISOString() 
        })
        .eq('id', sessionId);

      // Also update any conversations linked to this session
      await supabase
        .from('conversations')
        .update({ lead_id: leadId })
        .eq('widget_session_id', sessionId);
    }

    // Update specific conversation if provided
    if (conversationId && leadId) {
      await supabase
        .from('conversations')
        .update({ lead_id: leadId })
        .eq('id', conversationId);
    }

    return NextResponse.json({
      success: true,
      leadId,
      message: `Thanks${firstName ? `, ${firstName}` : ''}! We've saved your information and will be in touch soon.`,
    }, { headers: corsHeaders });

  } catch (error) {
    console.error('Lead capture error:', error);
    return NextResponse.json(
      { error: 'Failed to save lead information' },
      { status: 500, headers: corsHeaders }
    );
  }
}

