import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";
import { Providers } from "@/components/providers";

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
      <body className={`${geistSans.variable} ${geistMono.variable} font-sans min-h-full bg-transparent`}>
        <Providers>
          <div className="relative z-10 min-h-screen w-full flex flex-col bg-transparent">
            <main className="flex-1 w-full bg-transparent">
              {children}
            </main>
          </div>
        </Providers>
      </body>
    </html>
  );
}
