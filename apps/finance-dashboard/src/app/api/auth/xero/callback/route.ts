/**
 * Xero OAuth Callback Endpoint
 * 
 * Handles the OAuth callback from Xero after user authorization.
 * Exchanges the authorization code for access tokens and stores them securely.
 */

import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { XeroOAuth } from '@/lib/xero/oauth'

export async function GET(request: NextRequest) {
  try {
    const supabase = createServerClient()
    const url = new URL(request.url)
    
    // Extract OAuth parameters
    const code = url.searchParams.get('code')
    const state = url.searchParams.get('state')
    const error = url.searchParams.get('error')
    const errorDescription = url.searchParams.get('error_description')

    // Handle OAuth errors
    if (error) {
      console.error('OAuth error:', { error, errorDescription })
      
      const errorUrl = new URL('/settings?error=oauth_error', request.url)
      errorUrl.searchParams.set('message', errorDescription || error)
      
      return NextResponse.redirect(errorUrl)
    }

    // Validate required parameters
    if (!code || !state) {
      const errorUrl = new URL('/settings?error=invalid_callback', request.url)
      errorUrl.searchParams.set('message', 'Missing authorization code or state parameter')
      
      return NextResponse.redirect(errorUrl)
    }

    // Verify state parameter from cookie
    const storedState = request.cookies.get('xero_oauth_state')?.value
    if (!storedState || storedState !== state) {
      const errorUrl = new URL('/settings?error=invalid_state', request.url)
      errorUrl.searchParams.set('message', 'Invalid state parameter - possible security issue')
      
      return NextResponse.redirect(errorUrl)
    }

    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      const errorUrl = new URL('/login?error=authentication_required', request.url)
      return NextResponse.redirect(errorUrl)
    }

    // Exchange code for tokens
    const result = await XeroOAuth.exchangeCodeForTokens(code, state, user.id)

    // Create response with cleared state cookie
    let redirectUrl: URL
    
    if (result.success) {
      // Success - redirect to settings with success message
      redirectUrl = new URL('/settings?success=xero_connected', request.url)
      if (result.tenantName) {
        redirectUrl.searchParams.set('tenant', result.tenantName)
      }
      
      // Log successful connection
      await supabase
        .from('audit_logs')
        .insert({
          user_id: user.id,
          action: 'settings_updated',
          details: {
            action: 'xero_oauth_connected',
            tenant_id: result.tenantId,
            tenant_name: result.tenantName
          },
          ip_address: request.headers.get('x-forwarded-for') || 
                     request.headers.get('x-real-ip') || 
                     '127.0.0.1',
          user_agent: request.headers.get('user-agent')
        })
    } else {
      // Failure - redirect to settings with error
      redirectUrl = new URL('/settings?error=oauth_failed', request.url)
      redirectUrl.searchParams.set('message', result.error || 'Unknown OAuth error')
      
      // Log failed connection attempt
      await supabase
        .from('audit_logs')
        .insert({
          user_id: user.id,
          action: 'settings_updated',
          details: {
            action: 'xero_oauth_failed',
            error: result.error
          },
          ip_address: request.headers.get('x-forwarded-for') || 
                     request.headers.get('x-real-ip') || 
                     '127.0.0.1',
          user_agent: request.headers.get('user-agent')
        })
    }

    const response = NextResponse.redirect(redirectUrl)
    
    // Clear the state cookie
    response.cookies.delete('xero_oauth_state')
    
    return response

  } catch (error) {
    console.error('OAuth callback error:', error)
    
    // Clear state cookie and redirect to error page
    const errorUrl = new URL('/settings?error=callback_error', request.url)
    errorUrl.searchParams.set('message', 'OAuth callback processing failed')
    
    const response = NextResponse.redirect(errorUrl)
    response.cookies.delete('xero_oauth_state')
    
    return response
  }
}
