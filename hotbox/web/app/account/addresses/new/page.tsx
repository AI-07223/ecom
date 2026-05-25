import Link from "next/link"
import { redirect } from "next/navigation"
import { Logo } from "@/components/brand/Logo"
import { getRestaurant } from "@/lib/catalog"
import { getCurrentUser } from "@/lib/session"
import { NewAddressForm } from "./NewAddressForm"

export const dynamic = "force-dynamic"

export default async function NewAddressPage(): Promise<React.ReactElement> {
  const user = await getCurrentUser()
  if (!user) redirect("/login?next=/account/addresses/new")

  const restaurant = await getRestaurant()
  // Default center: the restaurant if seeded, otherwise Bangalore-Indiranagar
  const defaultCenter = restaurant
    ? { latitude: restaurant.latitude, longitude: restaurant.longitude }
    : { latitude: 12.9716, longitude: 77.6411 }

  return (
    <>
      <header
        className="sticky top-0 z-40 backdrop-blur"
        style={{
          background: "color-mix(in oklab, var(--color-shell-bg) 90%, transparent)",
          borderBottom: "1px solid var(--color-shell-line)",
        }}
      >
        <div className="max-w-md mx-auto px-5 py-3 flex items-center justify-between">
          <Link href="/" aria-label="Hot Box home">
            <Logo variant="full" size="sm" />
          </Link>
          <Link
            href="/account/addresses"
            className="text-sm font-medium"
            style={{ color: "var(--color-brand-yellow-300)" }}
          >
            ← My addresses
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-md px-5 pt-6 pb-12">
        <h1 className="font-display text-5xl">Add an address</h1>
        <p
          className="mt-1 text-sm"
          style={{ color: "var(--color-charcoal-strong)" }}
        >
          Drop the pin where the rider should arrive.
        </p>
        <div className="mt-6">
          <NewAddressForm defaultCenter={defaultCenter} />
        </div>
      </main>
    </>
  )
}
