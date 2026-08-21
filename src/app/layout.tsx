import type { Metadata } from "next";
import { GoogleAnalytics } from "@next/third-parties/google";
import { Source_Sans_3, Source_Serif_4 } from "next/font/google";
import Script from "next/script";
import { headers } from "next/headers";
import "./globals.css";
import MicrosoftClarity from "./components/MicrosoftClarity";
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

const gaMeasurementId = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID;
const clarityProjectId = process.env.NEXT_PUBLIC_CLARITY_PROJECT_ID;
const isProduction = process.env.NODE_ENV === "production";
const validGaMeasurementId =
  isProduction && gaMeasurementId && /^G-[A-Z0-9]+$/.test(gaMeasurementId)
    ? gaMeasurementId
    : null;
const validClarityProjectId =
  isProduction && clarityProjectId && /^[a-z0-9]+$/.test(clarityProjectId)
    ? clarityProjectId
    : null;

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

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const nonce = (await headers()).get("x-nonce") ?? undefined;

  return (
    <html lang="en">
      <body
        className={`${sourceSans.variable} ${sourceSerif.variable} antialiased`}
      >
        <Script
          src="https://challenges.cloudflare.com/turnstile/v0/api.js"
          strategy="lazyOnload"
          nonce={nonce}
        />
        <VisitTracker />
        {children}
        {validGaMeasurementId && (
          <GoogleAnalytics gaId={validGaMeasurementId} nonce={nonce} />
        )}
        {validClarityProjectId && (
          <MicrosoftClarity projectId={validClarityProjectId} nonce={nonce} />
        )}
      </body>
    </html>
  );
}
