import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const requestUrl = new URL(request.url)
  const token_hash = requestUrl.searchParams.get('token_hash')
  const type = requestUrl.searchParams.get('type')
  const code = requestUrl.searchParams.get('code')
  const next = requestUrl.searchParams.get('next') ?? '/'
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
      const supabase = await createClient()
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

  // Handle OAuth Code Exchange (PKCE)
  if (code) {
    const supabase = await createClient()
    const { error: sessionError } = await supabase.auth.exchangeCodeForSession(code)

    if (!sessionError) {
      const forwardedHost = request.headers.get('x-forwarded-host') // original origin before load balancer
      const isLocalEnv = process.env.NODE_ENV === 'development'

      if (isLocalEnv) {
        // we can be sure that there is no load balancer in between, so no need to watch for X-Forwarded-Host
        return NextResponse.redirect(`${origin}${next}`)
      } else if (forwardedHost) {
        return NextResponse.redirect(`https://${forwardedHost}${next}`)
      } else {
        return NextResponse.redirect(`${origin}${next}`)
      }
    }

    console.error('OAuth code exchange error:', sessionError?.message)
    return NextResponse.redirect(
      `${origin}/login?error=oauth_error&message=${encodeURIComponent(sessionError?.message || 'Failed to exchange code')}`
    )
  }

  // Handle legacy/implicit OAuth callbacks (if any)
  if (type === 'oauth') {
    const supabase = await createClient()
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
