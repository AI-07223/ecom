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
        className="rounded-2xl border border-zinc-200 bg-white p-4 mb-6 space-y-3"
        style={{ borderRadius: "var(--radius)" }}
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <input
            placeholder="Rider name"
            value={newName}
            onChange={(e) => setNewName(e.target.value.slice(0, 60))}
            className="px-4 py-3 rounded-lg border border-zinc-300 outline-none focus:ring-2 focus:ring-brand-500 text-sm"
            style={{ borderRadius: "var(--radius)" }}
            required
          />
          <div className="flex items-stretch rounded-lg border border-zinc-300 overflow-hidden">
            <span className="px-3 py-3 bg-zinc-50 text-zinc-600 text-sm border-r border-zinc-200">
              +91
            </span>
            <input
              type="tel"
              inputMode="numeric"
              placeholder="10-digit mobile"
              value={newPhone}
              onChange={(e) => setNewPhone(e.target.value.replace(/\D/g, "").slice(0, 14))}
              className="flex-1 px-3 py-3 outline-none text-sm"
              required
            />
          </div>
        </div>
        {error && (
          <div className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">
            {error}
          </div>
        )}
        <button
          type="submit"
          disabled={!newName.trim() || newPhone.length < 10}
          className="px-5 py-2.5 rounded-lg text-white font-semibold disabled:opacity-50"
          style={{
            background: "var(--color-brand-500)",
            borderRadius: "var(--radius)",
          }}
        >
          Add rider
        </button>
      </form>

      {riders.length === 0 ? (
        <p className="text-sm text-zinc-500 text-center mt-6">No riders yet.</p>
      ) : (
        <ul className="space-y-2">
          {riders.map((r) => (
            <li
              key={r.id}
              className="rounded-2xl border border-zinc-200 bg-white p-4 flex items-center justify-between gap-3"
              style={{ borderRadius: "var(--radius)" }}
            >
              <div className="min-w-0">
                <p className="font-semibold truncate">{r.name}</p>
                <p className="text-xs text-zinc-500">{r.phone}</p>
                <p className="text-xs mt-0.5">
                  {r.onDelivery ? (
                    <span className="text-amber-700">On delivery</span>
                  ) : r.isActive ? (
                    <span className="text-emerald-700">Available</span>
                  ) : (
                    <span className="text-zinc-500">Inactive</span>
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
                  className="px-3 py-1.5 rounded-lg border border-zinc-200"
                  style={{ borderRadius: "var(--radius)" }}
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
                  className="px-3 py-1.5 rounded-lg border border-red-200 text-red-700 bg-red-50 disabled:opacity-40"
                  style={{ borderRadius: "var(--radius)" }}
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
