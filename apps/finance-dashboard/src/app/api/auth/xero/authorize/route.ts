/**
 * Xero OAuth Authorization Endpoint
 * 
 * Initiates the OAuth flow by redirecting users to Xero's authorization server.
 * Only accessible to authenticated users with Finance or Owner roles.
 */

import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    // Skip during build process
    if (process.env.VERCEL_ENV || process.env.CI) {
      return NextResponse.json({ error: 'Service not available during build' }, { status: 503 })
    }

    // Dynamic imports to avoid build-time issues
    const { createServerClient } = await import('@/lib/supabase/server')
    const { XeroOAuth } = await import('@/lib/xero/oauth')

    const supabase = createServerClient()
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    // Check user role permissions
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role, is_active')
      .eq('id', user.id)
      .single()

    if (profileError || !profile) {
      return NextResponse.json(
        { error: 'User profile not found' },
        { status: 404 }
      )
    }

    if (!profile.is_active) {
      return NextResponse.json(
        { error: 'User account is inactive' },
        { status: 403 }
      )
    }

    if (!['owner', 'finance'].includes(profile.role)) {
      return NextResponse.json(
        { error: 'Insufficient permissions. Finance or Owner role required.' },
        { status: 403 }
      )
    }

    // Generate OAuth authorization URL
    const { url, state } = await XeroOAuth.generateAuthUrl(user.id)

    // Store state in session for verification (in production, use secure session storage)
    const response = NextResponse.redirect(url)
    response.cookies.set('xero_oauth_state', state, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 600 // 10 minutes
    })

    return response

  } catch (error) {
    console.error('OAuth authorization error:', error)
    
    return NextResponse.json(
      { 
        error: 'Failed to initiate OAuth flow',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}
