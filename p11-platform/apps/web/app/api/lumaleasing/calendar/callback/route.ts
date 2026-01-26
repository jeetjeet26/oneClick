/**
 * Google Calendar OAuth Callback
 * Handles redirect from Google after authorization
 */

import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/utils/supabase/admin'

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET
const GOOGLE_REDIRECT_URI = process.env.NEXT_PUBLIC_APP_URL 
  ? `${process.env.NEXT_PUBLIC_APP_URL}/api/lumaleasing/calendar/callback`
  : 'http://localhost:3000/api/lumaleasing/calendar/callback'

const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const code = searchParams.get('code')
    const state = searchParams.get('state')
    const error = searchParams.get('error')

    // Handle user denial
    if (error) {
      console.error('[GoogleCalendar] OAuth error:', error)
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/dashboard/lumaleasing?error=calendar_denied`
      )
    }

    if (!code || !state) {
      return NextResponse.json(
        { error: 'Missing authorization code or state' },
        { status: 400 }
      )
    }

    // Decode state parameter
    const stateData = JSON.parse(Buffer.from(state, 'base64').toString('utf-8'))
    const { propertyId, profileId } = stateData

    if (!propertyId || !profileId) {
      return NextResponse.json(
        { error: 'Invalid state parameter' },
        { status: 400 }
      )
    }

    // Exchange authorization code for tokens
    const tokenResponse = await fetch(GOOGLE_TOKEN_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        code,
        client_id: GOOGLE_CLIENT_ID || '',
        client_secret: GOOGLE_CLIENT_SECRET || '',
        redirect_uri: GOOGLE_REDIRECT_URI,
        grant_type: 'authorization_code',
      }),
    })

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text()
      console.error('[GoogleCalendar] Token exchange failed:', errorText)
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/dashboard/lumaleasing?error=token_exchange_failed`
      )
    }

    const tokens = await tokenResponse.json()
    const { access_token, refresh_token, expires_in } = tokens

    if (!access_token || !refresh_token) {
      console.error('[GoogleCalendar] Missing tokens in response')
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/dashboard/lumaleasing?error=missing_tokens`
      )
    }

    // Get user's email from Google Calendar API
    const calendarResponse = await fetch('https://www.googleapis.com/calendar/v3/users/me/settings/timezone', {
      headers: {
        Authorization: `Bearer ${access_token}`,
      },
    })

    let googleEmail = 'unknown@gmail.com'
    let timezone = 'America/Chicago'

    if (calendarResponse.ok) {
      const calendarData = await calendarResponse.json()
      timezone = calendarData.value || 'America/Chicago'
      
      // Get email from userinfo API
      const userinfoResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
        headers: {
          Authorization: `Bearer ${access_token}`,
        },
      })
      
      if (userinfoResponse.ok) {
        const userinfo = await userinfoResponse.json()
        googleEmail = userinfo.email || googleEmail
      }
    }

    // Calculate token expiration
    const tokenExpiresAt = new Date(Date.now() + expires_in * 1000).toISOString()

    // Store tokens in database
    const supabase = createServiceClient()

    // Check if calendar config already exists
    const { data: existing } = await supabase
      .from('agent_calendars')
      .select('id')
      .eq('property_id', propertyId)
      .eq('profile_id', profileId)
      .single()

    if (existing) {
      // Update existing config
      const { error: updateError } = await supabase
        .from('agent_calendars')
        .update({
          google_email: googleEmail,
          access_token,
          refresh_token,
          token_expires_at: tokenExpiresAt,
          timezone,
          sync_enabled: true,
          token_status: 'healthy',
          last_health_check_at: new Date().toISOString(),
          health_check_error: null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', existing.id)

      if (updateError) {
        console.error('[GoogleCalendar] Failed to update calendar:', updateError)
        return NextResponse.redirect(
          `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/dashboard/lumaleasing?error=database_error`
        )
      }
    } else {
      // Create new config
      const { error: insertError } = await supabase
        .from('agent_calendars')
        .insert({
          profile_id: profileId,
          property_id: propertyId,
          google_email: googleEmail,
          access_token,
          refresh_token,
          token_expires_at: tokenExpiresAt,
          timezone,
          sync_enabled: true,
          token_status: 'healthy',
          last_health_check_at: new Date().toISOString(),
        })

      if (insertError) {
        console.error('[GoogleCalendar] Failed to create calendar:', insertError)
        return NextResponse.redirect(
          `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/dashboard/lumaleasing?error=database_error`
        )
      }
    }

    // Success! Redirect back to dashboard
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/dashboard/lumaleasing?success=calendar_connected&email=${encodeURIComponent(googleEmail)}`
    )

  } catch (error) {
    console.error('[GoogleCalendar] OAuth callback error:', error)
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/dashboard/lumaleasing?error=callback_failed`
    )
  }
}
