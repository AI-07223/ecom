import type { Metadata } from "next"
import Link from "next/link"
import { themeTokensToCss } from "@platform/tenancy"
import { getTenant } from "@/lib/getTenant"
import { CartIndicator } from "@/components/CartIndicator"
import "./globals.css"

export async function generateMetadata(): Promise<Metadata> {
  const tenant = await getTenant()
  return {
    title: tenant.theme_tokens["--site-title"] ?? tenant.slug,
    description: `${tenant.slug} storefront`,
  }
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  const tenant = await getTenant()
  const css = themeTokensToCss(tenant.theme_tokens)

  return (
    <html lang="en" data-tenant={tenant.slug} className="h-full antialiased">
      <head>
        <style data-tenant-theme={tenant.slug}>{css}</style>
      </head>
      <body className="min-h-full flex flex-col">
        <header className="mx-auto w-full max-w-6xl px-6 py-4 flex items-center justify-between">
          <Link
            href="/"
            className="text-lg font-semibold"
            style={{ fontFamily: "var(--font-display)" }}
          >
            {tenant.theme_tokens["--site-title"]?.split("—")[0]?.trim() ??
              tenant.slug}
          </Link>
          <CartIndicator />
        </header>
        <div className="flex-1">{children}</div>
      </body>
    </html>
  )
}
