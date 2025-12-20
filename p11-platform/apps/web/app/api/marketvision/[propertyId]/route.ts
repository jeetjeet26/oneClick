import { createClient } from '@/utils/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

/**
 * GET /api/marketvision/[propertyId]
 * 
 * Fetch marketing performance data for a specific property.
 * Can pull from historical data (fact_marketing_performance) 
 * or trigger real-time MCP sync.
 * 
 * Query params:
 * - dateRange: "7d" | "30d" | "90d" | custom
 * - channels: "google_ads,meta_ads" (comma-separated)
 * - realtime: "true" to trigger MCP sync
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { propertyId: string } }
) {
  const supabase = createClient();
  const { propertyId } = params;
  
  const searchParams = request.nextUrl.searchParams;
  const dateRange = searchParams.get('dateRange') || '30d';
  const channels = searchParams.get('channels')?.split(',') || ['google_ads', 'meta_ads'];
  const realtime = searchParams.get('realtime') === 'true';
  
  try {
    // Calculate date filter
    const daysAgo = parseInt(dateRange.replace('d', '')) || 30;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - daysAgo);
    
    // Get property info and ad account connections (using EXISTING schema)
    const { data: property, error: propError } = await supabase
      .from('properties')
      .select(`
        id,
        name,
        ad_account_connections!inner (
          platform,
          account_id,
          is_active
        )
      `)
      .eq('id', propertyId)
      .single();
    
    if (propError || !property) {
      return NextResponse.json(
        { error: 'Property not found' },
        { status: 404 }
      );
    }
    
    // If realtime requested, trigger sync job
    if (realtime) {
      // Trigger background sync (implement this next)
      await fetch(`${process.env.DATA_ENGINE_URL}/sync-marketing-data`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.DATA_ENGINE_API_KEY}`,
        },
        body: JSON.stringify({
          property_id: propertyId,
          channels,
          date_range: dateRange,
        }),
      });
    }
    
    // Get account IDs by platform
    const googleAccount = property.ad_account_connections?.find(
      (c: any) => c.platform === 'google_ads' && c.is_active
    );
    const metaAccount = property.ad_account_connections?.find(
      (c: any) => c.platform === 'meta_ads' && c.is_active
    );
    
    // Fetch historical data from fact_marketing_performance
    const { data: performance, error: perfError } = await supabase
      .from('fact_marketing_performance')
      .select('*')
      .eq('property_id', propertyId)
      .in('channel_id', channels)
      .gte('date', startDate.toISOString().split('T')[0])
      .order('date', { ascending: false });
    
    if (perfError) {
      return NextResponse.json(
        { error: 'Failed to fetch performance data' },
        { status: 500 }
      );
    }
    
    // Aggregate data by channel and campaign
    const aggregated = aggregatePerformance(performance || []);
    
    // Log for debugging
    console.log('MarketVision API:', {
      property: property.name,
      performanceRows: performance?.length || 0,
      channels: aggregated.by_channel.length,
      campaigns: aggregated.by_campaign.length,
      totalSpend: aggregated.totals.spend,
    });
    
    return NextResponse.json({
      property: {
        id: property.id,
        name: property.name,
        google_ads_account: googleAccount?.account_id,
        meta_ads_account: metaAccount?.account_id,
      },
      date_range: {
        start: startDate.toISOString().split('T')[0],
        end: new Date().toISOString().split('T')[0],
        days: daysAgo,
      },
      channels: aggregated.by_channel,
      campaigns: aggregated.by_campaign,
      totals: aggregated.totals,
      raw_data: performance,
      debug: {
        has_data: performance && performance.length > 0,
        row_count: performance?.length || 0,
        channel_count: aggregated.by_channel.length,
      }
    });
    
  } catch (error) {
    console.error('MarketVision API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * Aggregate performance data for dashboard display
 */
function aggregatePerformance(data: any[]) {
  const by_channel: Record<string, any> = {};
  const by_campaign: Record<string, any> = {};
  
  let totals = {
    spend: 0,
    clicks: 0,
    impressions: 0,
    conversions: 0,
  };
  
  data.forEach(row => {
    // By channel (using channel_id from existing schema)
    const channel = row.channel_id || row.channel || 'unknown';
    if (!by_channel[channel]) {
      by_channel[channel] = {
        channel: channel,
        spend: 0,
        clicks: 0,
        impressions: 0,
        conversions: 0,
        campaigns: new Set(),
      };
    }
    by_channel[channel].spend += row.spend || 0;
    by_channel[channel].clicks += row.clicks || 0;
    by_channel[channel].impressions += row.impressions || 0;
    by_channel[channel].conversions += row.conversions || 0;
    by_channel[channel].campaigns.add(row.campaign_id);
    
    // By campaign
    const campaignKey = `${channel}_${row.campaign_id}`;
    if (!by_campaign[campaignKey]) {
      by_campaign[campaignKey] = {
        campaign_id: row.campaign_id,
        campaign_name: row.campaign_name,
        channel: channel,
        spend: 0,
        clicks: 0,
        impressions: 0,
        conversions: 0,
      };
    }
    by_campaign[campaignKey].spend += row.spend || 0;
    by_campaign[campaignKey].clicks += row.clicks || 0;
    by_campaign[campaignKey].impressions += row.impressions || 0;
    by_campaign[campaignKey].conversions += row.conversions || 0;
    
    // Totals
    totals.spend += row.spend || 0;
    totals.clicks += row.clicks || 0;
    totals.impressions += row.impressions || 0;
    totals.conversions += row.conversions || 0;
  });
  
  // Convert Sets to counts
  Object.values(by_channel).forEach((ch: any) => {
    ch.campaign_count = ch.campaigns.size;
    delete ch.campaigns;
  });
  
  return {
    by_channel: Object.values(by_channel),
    by_campaign: Object.values(by_campaign),
    totals,
  };
}

