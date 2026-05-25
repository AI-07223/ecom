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

const labelStyle: React.CSSProperties = {
  color: "var(--color-charcoal)",
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
    <form onSubmit={handleSave} className="p-5 space-y-5" style={cardStyle}>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label
            className="block text-xs font-semibold uppercase tracking-wider mb-1"
            style={labelStyle}
          >
            Open
          </label>
          <input
            type="time"
            value={open}
            onChange={(e) => setOpen(e.target.value)}
            className="w-full px-3 py-2.5"
            style={inputStyle}
          />
        </div>
        <div>
          <label
            className="block text-xs font-semibold uppercase tracking-wider mb-1"
            style={labelStyle}
          >
            Close
          </label>
          <input
            type="time"
            value={close}
            onChange={(e) => setClose(e.target.value)}
            className="w-full px-3 py-2.5"
            style={inputStyle}
          />
        </div>
      </div>

      <label className="flex items-start gap-3 text-sm">
        <input
          type="checkbox"
          checked={paused}
          onChange={(e) => setPaused(e.target.checked)}
          className="mt-1 w-5 h-5"
          style={{ accentColor: "var(--color-brand-yellow-300)" }}
        />
        <span>
          <span
            className="font-medium"
            style={{ color: "var(--color-shell-fg)" }}
          >
            Pause new orders
          </span>
          <p className="text-xs" style={labelStyle}>
            Menu stays browseable; checkout is blocked until you toggle off.
          </p>
        </span>
      </label>

      <label className="flex items-start gap-3 text-sm">
        <input
          type="checkbox"
          checked={allowCancel}
          onChange={(e) => setAllowCancel(e.target.checked)}
          className="mt-1 w-5 h-5"
          style={{ accentColor: "var(--color-brand-yellow-300)" }}
        />
        <span>
          <span
            className="font-medium"
            style={{ color: "var(--color-shell-fg)" }}
          >
            Allow cancellation after order accepted
          </span>
          <p className="text-xs" style={labelStyle}>
            Off (default): customer can only cancel BEFORE you accept. On: also
            cancellable while ACCEPTED, until cooking starts.
          </p>
        </span>
      </label>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label
            className="block text-xs font-semibold uppercase tracking-wider mb-1"
            style={labelStyle}
          >
            Delivery fee (₹)
          </label>
          <input
            type="number"
            min={0}
            step={1}
            value={deliveryRupees}
            onChange={(e) => setDeliveryRupees(Number(e.target.value))}
            className="w-full px-3 py-2.5 tabular-nums"
            style={inputStyle}
          />
        </div>
        <div>
          <label
            className="block text-xs font-semibold uppercase tracking-wider mb-1"
            style={labelStyle}
          >
            Packaging fee (₹)
          </label>
          <input
            type="number"
            min={0}
            step={1}
            value={packagingRupees}
            onChange={(e) => setPackagingRupees(Number(e.target.value))}
            className="w-full px-3 py-2.5 tabular-nums"
            style={inputStyle}
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
      {saved && !error && (
        <div
          className="text-sm rounded-lg px-3 py-2"
          style={{
            background: "color-mix(in oklab, var(--color-veg) 14%, transparent)",
            color: "var(--color-veg)",
            border: "1px solid var(--color-veg)",
          }}
        >
          Saved.
        </div>
      )}

      <button
        type="submit"
        disabled={pending}
        className="w-full py-3 font-bold disabled:opacity-50"
        style={{
          background: "var(--color-brand-yellow-300)",
          color: "var(--color-shell-bg)",
          borderRadius: "var(--radius)",
        }}
      >
        {pending ? "Saving…" : "Save changes"}
      </button>
    </form>
  )
}
