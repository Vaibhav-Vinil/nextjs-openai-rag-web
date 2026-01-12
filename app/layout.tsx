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
  alt: 'Company Logo',
};

export const metadata: Metadata = {
  title: "AI Assistant - Powered by Company",
  description: "Advanced AI assistant - Get instant answers and insights about solar energy and photovoltaics.",
  keywords: ["solar energy", "photovoltaics", "AI assistant", "pv market", "solar power", "renewable energy"],
  authors: [{ name: "Company Name" }],
  metadataBase: new URL('https://example.com'),
  openGraph: {
    title: "AI Assistant - Powered by Company",
    description: "Advanced AI assistant - Get instant answers and insights about solar energy and photovoltaics.",
    url: 'https://example.com',
    siteName: 'AI Assistant - Company',
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
    title: "AI Assistant - Powered by Company",
    description: "Advanced AI assistant - Get instant answers and insights about solar energy and photovoltaics.",
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
