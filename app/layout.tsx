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

export const metadata: Metadata = {
  title: "pvAI - Powered by pvmarket",
  description: "Starter app for the OpenAI Responses API",
  icons: {
    icon: "/PvChatbot-logo.png",
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
