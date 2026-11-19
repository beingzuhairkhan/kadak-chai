import type { Metadata } from "next";
import { Geist, Geist_Mono, Noto_Sans_Devanagari } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const devanagari = Noto_Sans_Devanagari({
  variable: "--font-devanagari",
  subsets: ["devanagari"],
});

export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000",
  ),
  title: {
    default: "Every Chai Break Has a Story | Kadak Chai Co.",
    template: "%s | Kadak Chai Co.",
  },
  description:
    "Share a chai break story with Kadak Chai Co. Celebrate everyday moments and join the #MyChaiBreak community.",
  applicationName: "Kadak Chai Co.",
  keywords: [
    "Kadak Chai Co.",
    "#MyChaiBreak",
    "chai stories",
    "chai break",
    "Indian chai",
  ],
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    locale: "en_IN",
    siteName: "Kadak Chai Co.",
    title: "Every Chai Break Has a Story",
    description:
      "Share a chai break story and celebrate the everyday moments that bring us together.",
    url: "/",
    images: [
      {
        url: "/opengraph-image",
        width: 1200,
        height: 630,
        alt: "Kadak Chai Co. — Every Chai Break Has a Story",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Every Chai Break Has a Story | Kadak Chai Co.",
    description:
      "Share a chai break story and join the #MyChaiBreak community.",
    images: ["/opengraph-image"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} ${devanagari.variable} h-full antialiased`}>
      <body className="min-h-full bg-[#f8f1e7] text-[#2b1a12]">{children}</body>
    </html>
  );
}
