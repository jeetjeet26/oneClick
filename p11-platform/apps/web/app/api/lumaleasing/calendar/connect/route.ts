/**
 * Google Calendar OAuth Initiation
 * Redirects property manager to Google consent screen
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID
const GOOGLE_REDIRECT_URI = process.env.NEXT_PUBLIC_APP_URL 
  ? `${process.env.NEXT_PUBLIC_APP_URL}/api/lumaleasing/calendar/callback`
  : 'http://localhost:3000/api/lumaleasing/calendar/callback'

const GOOGLE_AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth'
const SCOPES = [
  'https://www.googleapis.com/auth/calendar',
  'https://www.googleapis.com/auth/calendar.events',
].join(' ')

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const propertyId = searchParams.get('propertyId')

    if (!propertyId) {
      return NextResponse.json(
        { error: 'Property ID required' },
        { status: 400 }
      )
    }

    // Verify user has access to this property
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Verify user belongs to property's organization
    const { data: property } = await supabase
      .from('properties')
      .select('id, org_id')
      .eq('id', propertyId)
      .single()

    if (!property) {
      return NextResponse.json(
        { error: 'Property not found' },
        { status: 404 }
      )
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('id, org_id, role')
      .eq('id', user.id)
      .single()

    if (!profile || profile.org_id !== property.org_id) {
      return NextResponse.json(
        { error: 'You do not have access to this property' },
        { status: 403 }
      )
    }

    // Build OAuth URL with state parameter
    const state = Buffer.from(JSON.stringify({
      propertyId,
      profileId: user.id,
      timestamp: Date.now(),
    })).toString('base64')

    const authUrl = new URL(GOOGLE_AUTH_URL)
    authUrl.searchParams.set('client_id', GOOGLE_CLIENT_ID || '')
    authUrl.searchParams.set('redirect_uri', GOOGLE_REDIRECT_URI)
    authUrl.searchParams.set('response_type', 'code')
    authUrl.searchParams.set('scope', SCOPES)
    authUrl.searchParams.set('access_type', 'offline') // Get refresh token
    authUrl.searchParams.set('prompt', 'consent') // Force consent to get refresh token
    authUrl.searchParams.set('state', state)

    // Redirect to Google OAuth consent screen
    return NextResponse.redirect(authUrl.toString())

  } catch (error) {
    console.error('[GoogleCalendar] OAuth initiation error:', error)
    return NextResponse.json(
      { error: 'Failed to initiate OAuth flow' },
      { status: 500 }
    )
  }
}
