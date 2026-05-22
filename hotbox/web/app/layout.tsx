import "./globals.css"
import type { Metadata, Viewport } from "next"
import { Bebas_Neue, Inter } from "next/font/google"

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-sans-loaded",
})

const bebas = Bebas_Neue({
  weight: "400",
  subsets: ["latin"],
  display: "swap",
  variable: "--font-display-loaded",
})

export const metadata: Metadata = {
  title: "Hotbox — Vegetarian fast food, hot to your door",
  description:
    "Hotbox: cafe-style fast food (sandwiches, burgers, pizza, pasta, momos, biryani, paneer specials) delivered hot in 30 minutes.",
  applicationName: "Hotbox",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Hotbox",
  },
}

export const viewport: Viewport = {
  themeColor: "#cf3a1f",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className={`${inter.variable} ${bebas.variable}`}>
      <body>{children}</body>
    </html>
  )
}
