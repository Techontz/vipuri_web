import type { Metadata } from "next";
import { Inter, Geist_Mono } from "next/font/google";
import Script from "next/script";
import "./globals.css";

/* ===============================
   🧩 Google Fonts (NOON-STYLE)
   =============================== */
const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

/* ===============================
   🌍 Helper for proper image path
   =============================== */
const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "";

/* ===============================
   🌍 SEO + Metadata
   =============================== */
export const metadata: Metadata = {
  title: "Vipuri",
  description: "Shop smart, fast, and direct from Kariakoo vendors.",
  icons: {
    icon: [
      { url: `${basePath}/favicon.ico`, sizes: "any" },
      { url: `${basePath}/logo.png`, type: "image/png" },
    ],
    apple: `${basePath}/logo.png`,
  },
};

/* ===============================
   🏗️ Root Layout (Global)
   =============================== */
export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        {/* ✅ Favicons */}
        <link rel="icon" href={`${basePath}/favicon.ico`} sizes="any" />
        <link rel="icon" type="image/png" href={`${basePath}/logo.png`} />
        <link rel="apple-touch-icon" href={`${basePath}/logo.png`} />

        {/* ✅ Google Maps */}
        <Script
          src={`https://maps.googleapis.com/maps/api/js?key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}&libraries=places`}
          strategy="afterInteractive"
          async
        />
      </head>

      <body
        className={`${inter.variable} ${geistMono.variable} antialiased bg-white overflow-x-hidden`}
      >
        {children}
      </body>
    </html>
  );
}
