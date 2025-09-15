/**
 * Xero OAuth Disconnect Endpoint
 * 
 * Revokes Xero OAuth tokens and disconnects the integration.
 * Only accessible to authenticated users with Finance or Owner roles.
 */

import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { XeroOAuth } from '@/lib/xero/oauth'

export async function POST(request: NextRequest) {
  try {
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

    // Parse request body
    const body = await request.json()
    const { tenantId } = body

    if (!tenantId) {
      return NextResponse.json(
        { error: 'Tenant ID is required' },
        { status: 400 }
      )
    }

    // Verify user has access to this tenant
    const { data: tokenData, error: tokenError } = await supabase
      .from('xero_oauth_tokens')
      .select('tenant_id, tenant_name, created_by')
      .eq('tenant_id', tenantId)
      .eq('is_active', true)
      .single()

    if (tokenError || !tokenData) {
      return NextResponse.json(
        { error: 'Xero connection not found or already disconnected' },
        { status: 404 }
      )
    }

    // Only allow the user who created the connection (or owner) to disconnect
    if (tokenData.created_by !== user.id && profile.role !== 'owner') {
      return NextResponse.json(
        { error: 'You can only disconnect connections you created' },
        { status: 403 }
      )
    }

    // Revoke the token
    const result = await XeroOAuth.revokeToken(tenantId)

    if (result.success) {
      // Log successful disconnection
      await supabase
        .from('audit_logs')
        .insert({
          user_id: user.id,
          action: 'settings_updated',
          details: {
            action: 'xero_oauth_disconnected',
            tenant_id: tenantId,
            tenant_name: tokenData.tenant_name
          },
          ip_address: request.headers.get('x-forwarded-for') || 
                     request.headers.get('x-real-ip') || 
                     '127.0.0.1',
          user_agent: request.headers.get('user-agent')
        })

      return NextResponse.json({
        success: true,
        message: 'Xero connection disconnected successfully'
      })
    } else {
      return NextResponse.json(
        { 
          error: 'Failed to disconnect Xero',
          details: result.error
        },
        { status: 500 }
      )
    }

  } catch (error) {
    console.error('OAuth disconnect error:', error)
    
    return NextResponse.json(
      { 
        error: 'Failed to disconnect Xero',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}
