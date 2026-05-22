import Link from "next/link"
import { redirect } from "next/navigation"
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
    <main className="mx-auto max-w-md min-h-screen px-5 pt-8 pb-12">
      <Link
        href="/account/addresses"
        className="text-sm text-zinc-500 hover:underline underline-offset-4"
      >
        ← My addresses
      </Link>
      <h1 className="mt-3 text-3xl font-black tracking-tight">
        Add an address
      </h1>
      <p className="mt-1 text-sm text-zinc-500">
        Drop the pin where the rider should arrive.
      </p>
      <div className="mt-6">
        <NewAddressForm defaultCenter={defaultCenter} />
      </div>
    </main>
  )
}
