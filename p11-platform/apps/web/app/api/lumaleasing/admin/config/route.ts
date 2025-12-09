import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { createServiceClient } from '@/utils/supabase/admin';

// GET - Fetch config for property (authenticated)
export async function GET(req: NextRequest) {
  try {
    const supabaseAuth = await createClient();
    const { data: { user } } = await supabaseAuth.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const propertyId = searchParams.get('propertyId');

    if (!propertyId) {
      return NextResponse.json({ error: 'Property ID required' }, { status: 400 });
    }

    const supabase = createServiceClient();

    // Check if config exists
    let { data: config } = await supabase
      .from('lumaleasing_config')
      .select('*')
      .eq('property_id', propertyId)
      .single();

    // Create default config if doesn't exist
    if (!config) {
      const { data: newConfig, error } = await supabase
        .from('lumaleasing_config')
        .insert({ property_id: propertyId })
        .select()
        .single();

      if (error) {
        console.error('Failed to create config:', error);
        return NextResponse.json({ error: 'Failed to create config' }, { status: 500 });
      }

      config = newConfig;
    }

    return NextResponse.json({ config });
  } catch (error) {
    console.error('Config fetch error:', error);
    return NextResponse.json({ error: 'Failed to fetch config' }, { status: 500 });
  }
}

// PUT - Update config (authenticated)
export async function PUT(req: NextRequest) {
  try {
    const supabaseAuth = await createClient();
    const { data: { user } } = await supabaseAuth.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { propertyId, config } = await req.json();

    if (!propertyId || !config) {
      return NextResponse.json({ error: 'Property ID and config required' }, { status: 400 });
    }

    const supabase = createServiceClient();

    // Update config (excluding api_key which shouldn't be changed this way)
    const { error } = await supabase
      .from('lumaleasing_config')
      .update({
        widget_name: config.widget_name,
        primary_color: config.primary_color,
        secondary_color: config.secondary_color,
        logo_url: config.logo_url,
        welcome_message: config.welcome_message,
        offline_message: config.offline_message,
        auto_popup_delay_seconds: config.auto_popup_delay_seconds,
        require_email_before_chat: config.require_email_before_chat,
        collect_name: config.collect_name,
        collect_email: config.collect_email,
        collect_phone: config.collect_phone,
        lead_capture_prompt: config.lead_capture_prompt,
        tours_enabled: config.tours_enabled,
        tour_duration_minutes: config.tour_duration_minutes,
        tour_buffer_minutes: config.tour_buffer_minutes,
        business_hours: config.business_hours,
        timezone: config.timezone,
        is_active: config.is_active,
        updated_at: new Date().toISOString(),
      })
      .eq('property_id', propertyId);

    if (error) {
      console.error('Config update error:', error);
      return NextResponse.json({ error: 'Failed to update config' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Config update error:', error);
    return NextResponse.json({ error: 'Failed to update config' }, { status: 500 });
  }
}

