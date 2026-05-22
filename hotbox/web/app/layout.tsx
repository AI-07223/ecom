import "./globals.css"
import type { Metadata, Viewport } from "next"

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
  themeColor: "#d24a2a",
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
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
