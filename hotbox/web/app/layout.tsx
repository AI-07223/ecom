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
  title: "Hot Box · Cloud Kitchen — Pure veg, hot to your door",
  description:
    "Hot Box Cloud Kitchen: sandwiches, burgers, pizza, momos, pasta, paneer specials. 100% vegetarian, delivered hot in 30 minutes.",
  applicationName: "Hot Box",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Hot Box",
  },
}

export const viewport: Viewport = {
  themeColor: "#0a0a0a",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}): React.ReactElement {
  return (
    <html lang="en" className={`${inter.variable} ${bebas.variable}`}>
      <body className="min-h-dvh">{children}</body>
    </html>
  )
}
