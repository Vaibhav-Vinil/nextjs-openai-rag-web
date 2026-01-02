import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Security headers configuration
const securityHeaders = (isProduction: boolean) => {
  const headers = [
    {
      key: 'X-Content-Type-Options',
      value: 'nosniff',
    },
    {
      key: 'X-Frame-Options',
      value: 'SAMEORIGIN',
    },
    {
      key: 'X-XSS-Protection',
      value: '1; mode=block',
    },
    {
      key: 'Referrer-Policy',
      value: 'strict-origin-when-cross-origin',
    },
    {
      key: 'Permissions-Policy',
      value: 'camera=(), microphone=(), geolocation=()',
    },
  ];

  // Only add CSP in production or when explicitly enabled for development
  if (isProduction || process.env.ENABLE_STRICT_SECURITY === 'true') {
    const isLocalhost = !isProduction;
    const localhostSources = isLocalhost ? [
      'http://localhost:3000',
      'ws://localhost:3000',
      'http://localhost:3000/_next',
      'ws://localhost:3000/_next',
      'ws://bs-local.com:3000',
      'ws://bs-local.com:3000/_next/webpack-hmr',
      'http://bs-local.com:3000',
      'http://bs-local.com:3000/_next/webpack-hmr'
    ] : [];

    const csp = [
      // Base restrictions
      `default-src 'self' ${isLocalhost ? 'http://localhost:3000' : ''}`,
      
      // Scripts
      `script-src 'self' 'unsafe-inline' 'unsafe-eval' ${[
        ...(isLocalhost ? ['http://localhost:3000'] : []),
        'https://www.googletagmanager.com',
        'https://www.google-analytics.com',
        'https://www.google.com',
        'https://www.gstatic.com',
        '"self"'
      ].join(' ')}`,
      
      // Styles
      `style-src 'self' 'unsafe-inline' https://fonts.googleapis.com ${isLocalhost ? 'http://localhost:3000' : ''}`,
      
      // Media
      `img-src 'self' data: blob: https: ${isLocalhost ? 'http:' : ''}`,
      `media-src 'self' data: blob: ${isLocalhost ? 'http://localhost:3000' : ''}`,
      
      // Fonts
      `font-src 'self' https://fonts.gstatic.com ${isLocalhost ? 'http://localhost:3000' : ''}`,
      
      // Connections
      `connect-src 'self' ${[
        ...(isLocalhost ? [
          'ws://localhost:3000',
          'http://localhost:3000',
          'ws://bs-local.com:3000',
          'http://bs-local.com:3000'
        ] : []),
        'https://*.google-analytics.com',
        'https://*.analytics.google.com',
        'https://*.googletagmanager.com',
        'https://*.pv.market',
        'https://adnizkzzjhrpctohmfih.supabase.co',
        'https://*.supabase.co',
        'wss://*.supabase.co',
        '"self"'
      ].join(' ')}`,
      
      // Frames
      `frame-src 'self' ${isLocalhost ? 'http://localhost:3000' : ''} https://www.google.com https://www.youtube.com https://www.googletagmanager.com`,
      
      // Other security directives
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self'",
      `frame-ancestors 'self' ${isProduction ? 'https://pv.market' : 'http://localhost:3000'}`,
      
      // Only force HTTPS in production
      isProduction ? 'upgrade-insecure-requests' : '',
      
      // Report violations (for monitoring)
      isProduction ? 'report-uri https://your-monitoring-endpoint.com/csp-report' : ''
    ].filter(Boolean).join('; ');

    headers.push({
      key: 'Content-Security-Policy',
      value: csp,
    });
  }

  return headers;
};

export async function middleware(request: NextRequest) {
  const response = NextResponse.next();
  const { pathname } = request.nextUrl;
  const isProduction = process.env.NODE_ENV === 'production';

  // Skip middleware for Next.js internal requests and API routes
  if (pathname.startsWith('/_next') || pathname.includes('.') || pathname.startsWith('/api/')) {
    return response;
  }

  // Apply security headers
  securityHeaders(isProduction).forEach(({ key, value }) => {
    response.headers.set(key, value);
  });

  return response;
}

export const config = {
  // Match all routes except static files and API routes
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|api/).*)',
  ],
};
