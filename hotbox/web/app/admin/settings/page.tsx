import { db } from "@/lib/db"
import { SettingsForm } from "./SettingsForm"

export const dynamic = "force-dynamic"

export default async function AdminSettingsPage(): Promise<React.ReactElement> {
  const restaurant = await db.restaurant.findFirst({
    where: { slug: "hotbox" },
  })
  if (!restaurant) {
    return (
      <p className="text-sm text-zinc-500">
        Restaurant not seeded yet — re-run the seed.
      </p>
    )
  }

  return (
    <>
      <h1 className="text-2xl font-black tracking-tight mb-1">Settings</h1>
      <p className="text-sm text-zinc-500 mb-6">
        Hours, pause, fees, and cancellation policy.
      </p>
      <SettingsForm
        initial={{
          openTime: restaurant.openTime,
          closeTime: restaurant.closeTime,
          isPaused: restaurant.isPaused,
          allowCancelAfterAccept: restaurant.allowCancelAfterAccept,
          deliveryFeePaise: restaurant.deliveryFeePaise,
          packagingFeePaise: restaurant.packagingFeePaise,
        }}
      />
    </>
  )
}
