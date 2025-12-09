import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { createServiceClient } from '@/utils/supabase/admin';

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

    // Get total sessions
    const { count: totalSessions } = await supabase
      .from('widget_sessions')
      .select('*', { count: 'exact', head: true })
      .eq('property_id', propertyId);

    // Get total conversations
    const { count: totalConversations } = await supabase
      .from('conversations')
      .select('*', { count: 'exact', head: true })
      .eq('property_id', propertyId)
      .eq('channel', 'widget');

    // Get leads captured (sessions that converted)
    const { count: leadsCapture } = await supabase
      .from('widget_sessions')
      .select('*', { count: 'exact', head: true })
      .eq('property_id', propertyId)
      .not('lead_id', 'is', null);

    // Get tours booked
    const { count: toursBooked } = await supabase
      .from('tour_bookings')
      .select('*', { count: 'exact', head: true })
      .eq('property_id', propertyId)
      .eq('source', 'lumaleasing');

    // Calculate conversion rate
    const conversionRate = totalSessions && totalSessions > 0 
      ? Math.round(((leadsCapture || 0) / totalSessions) * 100) 
      : 0;

    return NextResponse.json({
      totalSessions: totalSessions || 0,
      totalConversations: totalConversations || 0,
      leadsCapture: leadsCapture || 0,
      toursBooked: toursBooked || 0,
      avgResponseTime: 250, // TODO: Calculate from analytics
      conversionRate,
    });
  } catch (error) {
    console.error('Stats fetch error:', error);
    return NextResponse.json({ error: 'Failed to fetch stats' }, { status: 500 });
  }
}

