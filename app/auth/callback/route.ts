import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const requestUrl = new URL(request.url)
  const token_hash = requestUrl.searchParams.get('token_hash')
  const type = requestUrl.searchParams.get('type')
  const error = requestUrl.searchParams.get('error')
  const errorDescription = requestUrl.searchParams.get('error_description')
  const origin = requestUrl.origin
  
  // If there's an error, redirect to login with error details
  if (error) {
    console.error('Auth error:', { error, errorDescription })
    return NextResponse.redirect(
      `${origin}/login?error=${encodeURIComponent(error)}&message=${encodeURIComponent(errorDescription || 'Authentication error')}`
    )
  }

  // Handle email verification
  if (type === 'signup' && token_hash) {
    try {
      const supabase = createClient()
      const { error: verifyError } = await supabase.auth.verifyOtp({
        token_hash,
        type: 'signup',
      })

      if (verifyError) {
        console.error('Verification error:', verifyError.message)
        return NextResponse.redirect(
          `${origin}/login?error=verification_failed&message=${encodeURIComponent(verifyError.message)}`
        )
      }

      // Redirect to success page after successful verification
      return NextResponse.redirect(`${origin}/verification/success`)
    } catch (error) {
      console.error('Error during verification:', error)
      return NextResponse.redirect(
        `${origin}/login?error=verification_error&message=${encodeURIComponent('An error occurred during verification')}`
      )
    }
  }

  // Handle OAuth callbacks
  if (type === 'oauth') {
    const supabase = createClient()
    const { data, error: oauthError } = await supabase.auth.getSession()
    
    if (oauthError) {
      console.error('OAuth callback error:', oauthError.message)
      return NextResponse.redirect(
        `${origin}/login?error=oauth_error&message=${encodeURIComponent(oauthError.message)}`
      )
    }

    if (data.session) {
      return NextResponse.redirect(origin + '/')
    }
  }

  // Default redirect to login
  return NextResponse.redirect(origin + '/login')
}
