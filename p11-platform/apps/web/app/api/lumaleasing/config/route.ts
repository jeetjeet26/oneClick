import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/utils/supabase/admin';

// CORS headers for cross-origin widget requests
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, X-API-Key',
};

export async function OPTIONS() {
  return new NextResponse(null, { headers: corsHeaders });
}

// Public endpoint - returns widget configuration (no sensitive data)
export async function GET(req: NextRequest) {
  try {
    const apiKey = req.headers.get('X-API-Key');

    if (!apiKey) {
      return NextResponse.json(
        { error: 'API key required' },
        { status: 401, headers: corsHeaders }
      );
    }

    const supabase = createServiceClient();

    const { data: config, error } = await supabase
      .from('lumaleasing_config')
      .select(`
        widget_name,
        primary_color,
        secondary_color,
        logo_url,
        welcome_message,
        offline_message,
        auto_popup_delay_seconds,
        require_email_before_chat,
        collect_name,
        collect_email,
        collect_phone,
        lead_capture_prompt,
        tours_enabled,
        business_hours,
        timezone,
        is_active,
        properties!inner(id, name)
      `)
      .eq('api_key', apiKey)
      .single();

    if (error || !config) {
      return NextResponse.json(
        { error: 'Invalid API key or config not found' },
        { status: 404, headers: corsHeaders }
      );
    }

    if (!config.is_active) {
      return NextResponse.json(
        { error: 'Widget is not active' },
        { status: 403, headers: corsHeaders }
      );
    }

    // Check if currently within business hours
    const isWithinBusinessHours = checkBusinessHours(
      config.business_hours,
      config.timezone
    );

    return NextResponse.json({
      config: {
        widgetName: config.widget_name,
        primaryColor: config.primary_color,
        secondaryColor: config.secondary_color,
        logoUrl: config.logo_url,
        welcomeMessage: config.welcome_message,
        offlineMessage: config.offline_message,
        autoPopupDelay: config.auto_popup_delay_seconds,
        requireEmailBeforeChat: config.require_email_before_chat,
        collectName: config.collect_name,
        collectEmail: config.collect_email,
        collectPhone: config.collect_phone,
        leadCapturePrompt: config.lead_capture_prompt,
        toursEnabled: config.tours_enabled,
        propertyName: config.properties?.name,
      },
      isOnline: isWithinBusinessHours,
      businessHours: config.business_hours,
      timezone: config.timezone,
    }, { headers: corsHeaders });

  } catch (error) {
    console.error('Config fetch error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch config' },
      { status: 500, headers: corsHeaders }
    );
  }
}

function checkBusinessHours(businessHours: Record<string, { start: string; end: string } | null>, timezone: string): boolean {
  try {
    const now = new Date();
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      weekday: 'long',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });

    const parts = formatter.formatToParts(now);
    const weekday = parts.find(p => p.type === 'weekday')?.value?.toLowerCase();
    const hour = parts.find(p => p.type === 'hour')?.value;
    const minute = parts.find(p => p.type === 'minute')?.value;

    if (!weekday || !hour || !minute) return true; // Default to online

    const todayHours = businessHours[weekday];
    if (!todayHours) return false; // Closed today

    const currentTime = `${hour}:${minute}`;
    return currentTime >= todayHours.start && currentTime <= todayHours.end;
  } catch {
    return true; // Default to online if timezone parsing fails
  }
}

