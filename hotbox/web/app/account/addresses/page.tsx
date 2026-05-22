import Link from "next/link"
import { redirect } from "next/navigation"
import { listAddressesForCurrentUser, MAX_ADDRESSES } from "@/lib/addresses"
import { getCurrentUser } from "@/lib/session"
import { AddressActions } from "./AddressActions"

export const dynamic = "force-dynamic"

export default async function AddressesPage(): Promise<React.ReactElement> {
  const user = await getCurrentUser()
  if (!user) redirect("/login?next=/account/addresses")

  const addresses = await listAddressesForCurrentUser()
  const atMax = addresses.length >= MAX_ADDRESSES

  return (
    <main className="mx-auto max-w-md min-h-screen px-5 pt-8 pb-12">
      <Link
        href="/"
        className="text-sm text-zinc-500 hover:underline underline-offset-4"
      >
        ← Menu
      </Link>
      <h1 className="mt-3 text-3xl font-black tracking-tight">My addresses</h1>
      <p className="mt-1 text-sm text-zinc-500">
        {addresses.length} of {MAX_ADDRESSES} saved
      </p>

      {addresses.length === 0 ? (
        <div className="mt-8 text-center text-zinc-500">
          <p>No addresses yet.</p>
        </div>
      ) : (
        <ul className="mt-6 space-y-3">
          {addresses.map((a) => (
            <li
              key={a.id}
              className="rounded-2xl border border-zinc-200 p-4"
              style={{ borderRadius: "var(--radius)" }}
            >
              <div className="flex items-center justify-between mb-2">
                <span
                  className="text-xs font-semibold tracking-wider uppercase"
                  style={{ color: "var(--color-brand-500)" }}
                >
                  {a.label}
                </span>
                {a.isDefault && (
                  <span className="text-[10px] uppercase tracking-wider rounded-full bg-zinc-100 px-2 py-0.5 text-zinc-700">
                    Default
                  </span>
                )}
              </div>
              <p className="text-sm text-zinc-900">{a.fullAddress}</p>
              {(a.building || a.floor) && (
                <p className="text-xs text-zinc-600 mt-0.5">
                  {[a.building, a.floor].filter(Boolean).join(" · ")}
                </p>
              )}
              {a.landmark && (
                <p className="text-xs text-zinc-500 mt-0.5">
                  Landmark: {a.landmark}
                </p>
              )}
              <AddressActions id={a.id} isDefault={a.isDefault} />
            </li>
          ))}
        </ul>
      )}

      <Link
        href={atMax ? "#" : "/account/addresses/new"}
        aria-disabled={atMax}
        className={`mt-8 block text-center py-3.5 rounded-xl font-semibold text-white ${
          atMax ? "opacity-40 pointer-events-none" : ""
        }`}
        style={{
          background: "var(--color-brand-500)",
          borderRadius: "var(--radius)",
        }}
      >
        {atMax ? `Limit reached (${MAX_ADDRESSES})` : "Add a new address"}
      </Link>
    </main>
  )
}
