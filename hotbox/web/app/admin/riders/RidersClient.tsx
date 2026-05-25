"use client"

import { useState, useTransition } from "react"
import {
  addRider,
  removeRider,
  setRiderActive,
} from "@/app/_actions/admin-riders"

interface RiderRow {
  id: string
  name: string
  phone: string
  isActive: boolean
  onDelivery: boolean
  lastPingAt: string | null
}

const cardStyle: React.CSSProperties = {
  background: "var(--color-shell-elev)",
  border: "1px solid var(--color-shell-line)",
  borderRadius: "var(--radius)",
}

const inputStyle: React.CSSProperties = {
  background: "var(--color-shell-bg)",
  border: "1px solid var(--color-shell-line)",
  borderRadius: "var(--radius)",
  color: "var(--color-shell-fg)",
}

const ghostBtn: React.CSSProperties = {
  background: "var(--color-shell-bg)",
  border: "1px solid var(--color-shell-line)",
  color: "var(--color-charcoal-strong)",
  borderRadius: "var(--radius)",
}

const dangerBtn: React.CSSProperties = {
  background: "color-mix(in oklab, var(--color-brand-flame-500) 18%, transparent)",
  border: "1px solid var(--color-brand-flame-700)",
  color: "var(--color-brand-flame-300)",
  borderRadius: "var(--radius)",
}

export function RidersClient({
  riders,
}: {
  riders: RiderRow[]
}): React.ReactElement {
  const [, startTransition] = useTransition()
  const [newName, setNewName] = useState("")
  const [newPhone, setNewPhone] = useState("")
  const [error, setError] = useState<string | null>(null)

  async function handleAdd(e: React.FormEvent): Promise<void> {
    e.preventDefault()
    setError(null)
    const r = await addRider({ name: newName.trim(), phone: newPhone.trim() })
    if (!r.ok) {
      setError(r.error)
      return
    }
    setNewName("")
    setNewPhone("")
    window.location.reload()
  }

  return (
    <>
      <form
        onSubmit={handleAdd}
        className="p-4 mb-6 space-y-3"
        style={cardStyle}
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <input
            placeholder="Rider name"
            value={newName}
            onChange={(e) => setNewName(e.target.value.slice(0, 60))}
            className="px-4 py-3 outline-none focus:ring-2 text-sm"
            style={inputStyle}
            required
          />
          <div
            className="flex items-stretch overflow-hidden"
            style={inputStyle}
          >
            <span
              className="px-3 py-3 text-sm border-r"
              style={{
                background: "var(--color-shell-elev)",
                color: "var(--color-charcoal-strong)",
                borderColor: "var(--color-shell-line)",
              }}
            >
              +91
            </span>
            <input
              type="tel"
              inputMode="numeric"
              placeholder="10-digit mobile"
              value={newPhone}
              onChange={(e) =>
                setNewPhone(e.target.value.replace(/\D/g, "").slice(0, 14))
              }
              className="flex-1 px-3 py-3 outline-none text-sm bg-transparent"
              style={{ color: "var(--color-shell-fg)" }}
              required
            />
          </div>
        </div>
        {error && (
          <div
            className="text-sm rounded-lg px-3 py-2"
            style={{
              background:
                "color-mix(in oklab, var(--color-brand-flame-500) 18%, transparent)",
              color: "var(--color-brand-flame-300)",
              border: "1px solid var(--color-brand-flame-700)",
            }}
          >
            {error}
          </div>
        )}
        <button
          type="submit"
          disabled={!newName.trim() || newPhone.length < 10}
          className="px-5 py-2.5 font-bold disabled:opacity-50"
          style={{
            background: "var(--color-brand-yellow-300)",
            color: "var(--color-shell-bg)",
            borderRadius: "var(--radius)",
          }}
        >
          Add rider
        </button>
      </form>

      {riders.length === 0 ? (
        <p
          className="text-sm text-center mt-6"
          style={{ color: "var(--color-charcoal)" }}
        >
          No riders yet.
        </p>
      ) : (
        <ul className="space-y-2">
          {riders.map((r) => (
            <li
              key={r.id}
              className="p-4 flex items-center justify-between gap-3"
              style={cardStyle}
            >
              <div className="min-w-0">
                <p
                  className="font-semibold truncate"
                  style={{ color: "var(--color-shell-fg)" }}
                >
                  {r.name}
                </p>
                <p
                  className="text-xs font-mono"
                  style={{ color: "var(--color-charcoal)" }}
                >
                  {r.phone}
                </p>
                <p className="text-xs mt-0.5">
                  {r.onDelivery ? (
                    <span style={{ color: "var(--color-brand-yellow-300)" }}>
                      On delivery
                    </span>
                  ) : r.isActive ? (
                    <span style={{ color: "var(--color-veg)" }}>
                      Available
                    </span>
                  ) : (
                    <span style={{ color: "var(--color-charcoal)" }}>
                      Inactive
                    </span>
                  )}
                </p>
              </div>
              <div className="flex items-center gap-2 text-xs">
                <button
                  type="button"
                  onClick={() =>
                    startTransition(async () => {
                      await setRiderActive(r.id, !r.isActive)
                      window.location.reload()
                    })
                  }
                  className="px-3 py-1.5"
                  style={ghostBtn}
                >
                  {r.isActive ? "Deactivate" : "Activate"}
                </button>
                <button
                  type="button"
                  disabled={r.onDelivery}
                  onClick={() => {
                    if (!confirm(`Remove rider ${r.name}?`)) return
                    startTransition(async () => {
                      const res = await removeRider(r.id)
                      if (!res.ok) alert(res.error)
                      window.location.reload()
                    })
                  }}
                  className="px-3 py-1.5 disabled:opacity-40"
                  style={dangerBtn}
                >
                  Remove
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </>
  )
}
