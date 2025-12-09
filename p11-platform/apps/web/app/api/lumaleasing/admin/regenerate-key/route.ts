import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { createServiceClient } from '@/utils/supabase/admin';
import crypto from 'crypto';

export async function POST(req: NextRequest) {
  try {
    const supabaseAuth = await createClient();
    const { data: { user } } = await supabaseAuth.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { propertyId } = await req.json();

    if (!propertyId) {
      return NextResponse.json({ error: 'Property ID required' }, { status: 400 });
    }

    const supabase = createServiceClient();
    const newApiKey = crypto.randomBytes(32).toString('hex');

    const { error } = await supabase
      .from('lumaleasing_config')
      .update({ 
        api_key: newApiKey,
        updated_at: new Date().toISOString(),
      })
      .eq('property_id', propertyId);

    if (error) {
      console.error('Key regeneration error:', error);
      return NextResponse.json({ error: 'Failed to regenerate key' }, { status: 500 });
    }

    return NextResponse.json({ apiKey: newApiKey });
  } catch (error) {
    console.error('Key regeneration error:', error);
    return NextResponse.json({ error: 'Failed to regenerate key' }, { status: 500 });
  }
}

