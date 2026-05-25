import Link from "next/link"
import { redirect } from "next/navigation"
import { Logo } from "@/components/brand/Logo"
import { listAddressesForCurrentUser, MAX_ADDRESSES } from "@/lib/addresses"
import { getCurrentUser } from "@/lib/session"
import { AddressActions } from "./AddressActions"

export const dynamic = "force-dynamic"

const cardStyle: React.CSSProperties = {
  background: "var(--color-shell-elev)",
  border: "1px solid var(--color-shell-line)",
  borderRadius: "var(--radius)",
}

export default async function AddressesPage(): Promise<React.ReactElement> {
  const user = await getCurrentUser()
  if (!user) redirect("/login?next=/account/addresses")

  const addresses = await listAddressesForCurrentUser()
  const atMax = addresses.length >= MAX_ADDRESSES

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
            href="/"
            className="text-sm font-medium"
            style={{ color: "var(--color-brand-yellow-300)" }}
          >
            ← Menu
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-md px-5 pt-6 pb-12">
        <h1 className="font-display text-5xl">My addresses</h1>
        <p
          className="mt-1 text-sm"
          style={{ color: "var(--color-charcoal)" }}
        >
          {addresses.length} of {MAX_ADDRESSES} saved
        </p>

        {addresses.length === 0 ? (
          <div
            className="mt-8 text-center"
            style={{ color: "var(--color-charcoal)" }}
          >
            <p>No addresses yet.</p>
          </div>
        ) : (
          <ul className="mt-6 space-y-3">
            {addresses.map((a) => (
              <li key={a.id} className="p-4" style={cardStyle}>
                <div className="flex items-center justify-between mb-2">
                  <span
                    className="text-xs font-semibold tracking-wider uppercase"
                    style={{ color: "var(--color-brand-yellow-300)" }}
                  >
                    {a.label}
                  </span>
                  {a.isDefault && (
                    <span
                      className="text-[10px] uppercase tracking-wider rounded-full px-2 py-0.5"
                      style={{
                        background:
                          "color-mix(in oklab, var(--color-veg) 18%, transparent)",
                        color: "var(--color-veg)",
                      }}
                    >
                      Default
                    </span>
                  )}
                </div>
                <p
                  className="text-sm"
                  style={{ color: "var(--color-shell-fg)" }}
                >
                  {a.fullAddress}
                </p>
                {(a.building || a.floor) && (
                  <p
                    className="text-xs mt-0.5"
                    style={{ color: "var(--color-charcoal-strong)" }}
                  >
                    {[a.building, a.floor].filter(Boolean).join(" · ")}
                  </p>
                )}
                {a.landmark && (
                  <p
                    className="text-xs mt-0.5"
                    style={{ color: "var(--color-charcoal)" }}
                  >
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
          className={`mt-8 block text-center py-3.5 font-bold ${
            atMax ? "opacity-40 pointer-events-none" : ""
          }`}
          style={{
            background: "var(--color-brand-yellow-300)",
            color: "var(--color-shell-bg)",
            borderRadius: "var(--radius)",
          }}
        >
          {atMax ? `Limit reached (${MAX_ADDRESSES})` : "Add a new address"}
        </Link>
      </main>
    </>
  )
}
