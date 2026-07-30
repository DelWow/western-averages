import type { Metadata } from "next";
import { Source_Sans_3, Source_Serif_4 } from "next/font/google";
import Script from "next/script";
import "./globals.css";
import GlobalTurnstile from './components/GlobalTurnstile';
import VisitTracker from './components/VisitTracker';

const sourceSans = Source_Sans_3({
  variable: "--font-source-sans",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
});

const sourceSerif = Source_Serif_4({
  variable: "--font-source-serif",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "Western University Course Averages",
  description: "Browse course averages at Western University",
  openGraph: {
    title: "Western University Course Averages",
    description: "Browse course averages at Western University",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Western University Course Averages",
    description: "Browse course averages at Western University",
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
        className={`${sourceSans.variable} ${sourceSerif.variable} antialiased`}
      >
        <Script
          src="https://challenges.cloudflare.com/turnstile/v0/api.js"
          strategy="lazyOnload"
        />
        <GlobalTurnstile />
        <VisitTracker />
        {children}
      </body>
    </html>
  );
}
