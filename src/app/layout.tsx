import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Script from "next/script";
import "./globals.css";
import GlobalTurnstile from './components/GlobalTurnstile';

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Western University - Class Averages Tracker",
  description: "Track and manage your class averages at Western University",
  openGraph: {
    title: "Western University - Class Averages Tracker",
    description: "Track and manage your class averages at Western University",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Western University - Class Averages Tracker",
    description: "Track and manage your class averages at Western University",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {/* Load Cloudflare Turnstile script using Next.js Script component for better compatibility with corporate networks */}
        <Script
          src="https://challenges.cloudflare.com/turnstile/v0/api.js"
          strategy="lazyOnload"
        />
        <GlobalTurnstile />
        {children}
      </body>
    </html>
  );
}
