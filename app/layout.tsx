import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";
import { Providers } from "@/components/providers";
import { ErrorBoundary } from "@/components/error-boundary";

const geistSans = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-geist-sans",
  weight: "100 900",
});
const geistMono = localFont({
  src: "./fonts/GeistMonoVF.woff",
  variable: "--font-geist-mono",
  weight: "100 900",
});

// Logo configuration
const logoConfig = {
  url: '/PvChatbot-logo.png',
  width: 512,
  height: 512,
  alt: 'pv.market Logo',
};

export const metadata: Metadata = {
  title: "pvAI - Powered by pvmarket",
  description: "Advanced AI assistant for pv.market - Get instant answers and insights about solar energy and photovoltaics.",
  keywords: ["solar energy", "photovoltaics", "AI assistant", "pv market", "solar power", "renewable energy"],
  authors: [{ name: "pv.market" }],
  metadataBase: new URL('https://pv-ai.pv.market'),
  openGraph: {
    title: "pvAI - Powered by pv.market",
    description: "Advanced AI assistant for pv.market - Get instant answers and insights about solar energy and photovoltaics.",
    url: 'https://pv-ai.pv.market',
    siteName: 'pvAI - pv.market',
    images: [{
      url: logoConfig.url,
      width: logoConfig.width,
      height: logoConfig.height,
      alt: logoConfig.alt,
    }],
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: "pvAI - Powered by pv.market",
    description: "Advanced AI assistant for pv.market - Get instant answers and insights about solar energy and photovoltaics.",
    images: [{
      url: logoConfig.url,
      width: logoConfig.width,
      height: logoConfig.height,
      alt: logoConfig.alt,
    }],
  },
  icons: {
    icon: [
      { url: '/PvChatbot-logo.ico' },
      { 
        url: logoConfig.url, 
        type: 'image/png',
        sizes: `${logoConfig.width}x${logoConfig.height}`,
      },
    ],
    apple: [
      { url: '/apple-icon.png' },
    ],
    other: [
      {
        rel: 'icon',
        type: 'image/png',
        url: '/PvChatbot-logo.png',
        sizes: '512x512',
      },
    ],
  },
};


export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full bg-transparent">
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              // Global chunk loading error handler
              (function() {
                var chunkErrorHandled = false;
                var maxRetries = 2;
                var retryCount = 0;
                
                function handleChunkError(isRetry) {
                  if (chunkErrorHandled) return;
                  
                  var pathname = window.location.pathname;
                  var isRoot = pathname === '/' || pathname === '';
                  
                  if (!isRoot) return;
                  
                  console.error('Chunk loading error detected');
                  
                  // Try to reload the page first (might be a temporary network issue)
                  if (!isRetry && retryCount < maxRetries) {
                    retryCount++;
                    var retryKey = 'chunkErrorRetry_' + retryCount;
                    if (sessionStorage.getItem(retryKey) !== 'true') {
                      sessionStorage.setItem(retryKey, 'true');
                      console.log('Retrying page load... attempt ' + retryCount);
                      setTimeout(function() {
                        window.location.reload();
                      }, 2000);
                      return;
                    }
                  }
                  
                  // If retries failed or max retries reached, redirect to login
                  chunkErrorHandled = true;
                  console.log('Chunk loading failed after retries, redirecting to login');
                  
                  // Clear retry flags
                  for (var i = 1; i <= maxRetries; i++) {
                    sessionStorage.removeItem('chunkErrorRetry_' + i);
                  }
                  
                  // Redirect to login
                  window.location.href = '/login';
                }
                
                // Handle chunk loading errors from script tags
                window.addEventListener('error', function(e) {
                  if (e.target && e.target.tagName === 'SCRIPT') {
                    var src = e.target.src || '';
                    if (src.includes('_next/static/chunks/') || 
                        src.includes('webpack') ||
                        e.message && (
                          e.message.includes('ChunkLoadError') ||
                          e.message.includes('Loading chunk') ||
                          e.message.includes('Failed to fetch dynamically imported module') ||
                          e.message.includes('ERR_NAME_NOT_RESOLVED') ||
                          e.message.includes('net::ERR_NAME_NOT_RESOLVED')
                        )) {
                      handleChunkError(false);
                    }
                  } else if (e.message && (
                    e.message.includes('ChunkLoadError') ||
                    e.message.includes('Loading chunk') ||
                    e.message.includes('Failed to fetch dynamically imported module') ||
                    e.message.includes('ERR_NAME_NOT_RESOLVED') ||
                    e.message.includes('net::ERR_NAME_NOT_RESOLVED')
                  )) {
                    handleChunkError(false);
                  }
                }, true);
                
                // Handle unhandled promise rejections (chunk errors often show up here)
                window.addEventListener('unhandledrejection', function(e) {
                  if (e.reason && (
                    (e.reason.message && (
                      e.reason.message.includes('ChunkLoadError') ||
                      e.reason.message.includes('Loading chunk') ||
                      e.reason.message.includes('Failed to fetch dynamically imported module') ||
                      e.reason.message.includes('ERR_NAME_NOT_RESOLVED')
                    )) ||
                    e.reason.name === 'ChunkLoadError' ||
                    (e.reason.toString && e.reason.toString().includes('ChunkLoadError'))
                  )) {
                    handleChunkError(false);
                  }
                });
                
                // Timeout fallback: if page doesn't load within 10 seconds, check for issues
                setTimeout(function() {
                  if (document.readyState !== 'complete' && 
                      (window.location.pathname === '/' || window.location.pathname === '')) {
                    // Check if React has loaded (basic check)
                    if (typeof window.React === 'undefined' && !window.__NEXT_DATA__) {
                      console.warn('Page seems stuck, checking for chunk errors...');
                      // Don't auto-redirect here, just log - let other handlers deal with it
                    }
                  }
                }, 10000);
              })();
            `,
          }}
        />
      </head>
      <body className={`${geistSans.variable} ${geistMono.variable} font-sans min-h-full bg-transparent`}>
        <ErrorBoundary>
          <Providers>
            <div className="relative z-10 min-h-screen w-full flex flex-col bg-transparent">
              <main className="flex-1 w-full bg-transparent">
                {children}
              </main>
            </div>
          </Providers>
        </ErrorBoundary>
      </body>
    </html>
  );
}
