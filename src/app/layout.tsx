import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import GlobalTurnstile from './components/GlobalTurnstile';
import TurnstileScript from './components/TurnstileScript';

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
        {/* Load Cloudflare Turnstile script only if not on localhost */}
        <TurnstileScript />
        <GlobalTurnstile />
        {children}
      </body>
    </html>
  );
}
