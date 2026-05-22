"use client"

import { useState, useTransition } from "react"
import { saveSettings } from "@/app/_actions/admin-settings"

interface Initial {
  openTime: string
  closeTime: string
  isPaused: boolean
  allowCancelAfterAccept: boolean
  deliveryFeePaise: number
  packagingFeePaise: number
}

export function SettingsForm({
  initial,
}: {
  initial: Initial
}): React.ReactElement {
  const [open, setOpen] = useState(initial.openTime)
  const [close, setClose] = useState(initial.closeTime)
  const [paused, setPaused] = useState(initial.isPaused)
  const [allowCancel, setAllowCancel] = useState(initial.allowCancelAfterAccept)
  const [deliveryRupees, setDeliveryRupees] = useState(
    initial.deliveryFeePaise / 100,
  )
  const [packagingRupees, setPackagingRupees] = useState(
    initial.packagingFeePaise / 100,
  )
  const [pending, startTransition] = useTransition()
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function handleSave(e: React.FormEvent): void {
    e.preventDefault()
    setSaved(false)
    setError(null)
    startTransition(async () => {
      const r = await saveSettings({
        openTime: open,
        closeTime: close,
        isPaused: paused,
        allowCancelAfterAccept: allowCancel,
        deliveryFeePaise: Math.round(deliveryRupees * 100),
        packagingFeePaise: Math.round(packagingRupees * 100),
      })
      if (!r.ok) setError(r.error)
      else setSaved(true)
    })
  }

  return (
    <form
      onSubmit={handleSave}
      className="rounded-2xl border border-zinc-200 bg-white p-5 space-y-5"
      style={{ borderRadius: "var(--radius)" }}
    >
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-500 mb-1">
            Open
          </label>
          <input
            type="time"
            value={open}
            onChange={(e) => setOpen(e.target.value)}
            className="w-full px-3 py-2.5 rounded-lg border border-zinc-300"
            style={{ borderRadius: "var(--radius)" }}
          />
        </div>
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-500 mb-1">
            Close
          </label>
          <input
            type="time"
            value={close}
            onChange={(e) => setClose(e.target.value)}
            className="w-full px-3 py-2.5 rounded-lg border border-zinc-300"
            style={{ borderRadius: "var(--radius)" }}
          />
        </div>
      </div>

      <label className="flex items-start gap-3 text-sm">
        <input
          type="checkbox"
          checked={paused}
          onChange={(e) => setPaused(e.target.checked)}
          className="accent-brand-500 mt-1 w-5 h-5"
        />
        <span>
          <span className="font-medium">Pause new orders</span>
          <p className="text-xs text-zinc-500">
            Menu stays browseable; checkout is blocked until you toggle off.
          </p>
        </span>
      </label>

      <label className="flex items-start gap-3 text-sm">
        <input
          type="checkbox"
          checked={allowCancel}
          onChange={(e) => setAllowCancel(e.target.checked)}
          className="accent-brand-500 mt-1 w-5 h-5"
        />
        <span>
          <span className="font-medium">
            Allow cancellation after order accepted
          </span>
          <p className="text-xs text-zinc-500">
            Off (default): customer can only cancel BEFORE you accept. On:
            also cancellable while ACCEPTED, until cooking starts.
          </p>
        </span>
      </label>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-500 mb-1">
            Delivery fee (₹)
          </label>
          <input
            type="number"
            min={0}
            step={1}
            value={deliveryRupees}
            onChange={(e) => setDeliveryRupees(Number(e.target.value))}
            className="w-full px-3 py-2.5 rounded-lg border border-zinc-300 tabular-nums"
            style={{ borderRadius: "var(--radius)" }}
          />
        </div>
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-500 mb-1">
            Packaging fee (₹)
          </label>
          <input
            type="number"
            min={0}
            step={1}
            value={packagingRupees}
            onChange={(e) => setPackagingRupees(Number(e.target.value))}
            className="w-full px-3 py-2.5 rounded-lg border border-zinc-300 tabular-nums"
            style={{ borderRadius: "var(--radius)" }}
          />
        </div>
      </div>

      {error && (
        <div className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">
          {error}
        </div>
      )}
      {saved && !error && (
        <div className="text-sm text-emerald-700 bg-emerald-50 rounded-lg px-3 py-2">
          Saved.
        </div>
      )}

      <button
        type="submit"
        disabled={pending}
        className="w-full py-3 rounded-xl text-white font-semibold disabled:opacity-50"
        style={{
          background: "var(--color-brand-500)",
          borderRadius: "var(--radius)",
        }}
      >
        {pending ? "Saving…" : "Save changes"}
      </button>
    </form>
  )
}
