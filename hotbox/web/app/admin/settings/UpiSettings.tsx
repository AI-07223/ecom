"use client"

import { useState, useTransition } from "react"
import { clearUpiQr, saveUpiConfig, uploadUpiQr } from "@/app/_actions/admin-upi"

interface Initial {
  upiVpa: string | null
  upiDisplayName: string | null
  qrUploaded: boolean
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

export function UpiSettings({
  initial,
}: {
  initial: Initial
}): React.ReactElement {
  const [vpa, setVpa] = useState(initial.upiVpa ?? "")
  const [name, setName] = useState(initial.upiDisplayName ?? "")
  const [qrUploaded, setQrUploaded] = useState(initial.qrUploaded)
  const [pending, startTransition] = useTransition()
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [qrBuster, setQrBuster] = useState(0)

  async function saveText(e: React.FormEvent): Promise<void> {
    e.preventDefault()
    setSaved(false)
    setError(null)
    startTransition(async () => {
      const r = await saveUpiConfig({ upiVpa: vpa, upiDisplayName: name })
      if (!r.ok) setError(r.error)
      else setSaved(true)
    })
  }

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>): Promise<void> {
    const file = e.target.files?.[0]
    if (!file) return
    setError(null)
    setSaved(false)
    const fd = new FormData()
    fd.append("qr", file)
    startTransition(async () => {
      const r = await uploadUpiQr(fd)
      if (!r.ok) {
        setError(r.error)
        return
      }
      setQrUploaded(true)
      setQrBuster((n) => n + 1)
    })
    e.target.value = ""
  }

  async function handleClear(): Promise<void> {
    if (
      !confirm(
        "Remove the uploaded QR? We'll fall back to generating a QR from the VPA.",
      )
    )
      return
    setError(null)
    startTransition(async () => {
      const r = await clearUpiQr()
      if (!r.ok) {
        setError(r.error)
        return
      }
      setQrUploaded(false)
    })
  }

  return (
    <section className="p-5 space-y-5" style={cardStyle}>
      <div>
        <h2
          className="text-xs font-semibold uppercase tracking-wider"
          style={{ color: "var(--color-brand-yellow-300)" }}
        >
          UPI payment
        </h2>
        <p
          className="text-sm mt-1"
          style={{ color: "var(--color-charcoal-strong)" }}
        >
          Customer&rsquo;s pay page uses these. If you upload your business QR
          (PhonePe/GPay), we show that. If not, we generate one from your UPI
          ID + the order amount.
        </p>
      </div>

      <form onSubmit={saveText} className="space-y-3">
        <div>
          <label
            className="block text-xs font-semibold uppercase tracking-wider mb-1"
            style={labelStyle}
          >
            UPI ID (VPA)
          </label>
          <input
            type="text"
            value={vpa}
            onChange={(e) => setVpa(e.target.value.replace(/\s+/g, ""))}
            placeholder="hotbox@upi"
            className="w-full px-3 py-2.5 font-mono"
            style={inputStyle}
            autoCapitalize="off"
            autoCorrect="off"
          />
        </div>
        <div>
          <label
            className="block text-xs font-semibold uppercase tracking-wider mb-1"
            style={labelStyle}
          >
            Display name (shown to customer)
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value.slice(0, 80))}
            placeholder="Hot Box Cloud Kitchen"
            className="w-full px-3 py-2.5"
            style={inputStyle}
          />
        </div>
        <button
          type="submit"
          disabled={pending}
          className="px-5 py-2.5 font-bold disabled:opacity-50 text-sm"
          style={{
            background: "var(--color-brand-yellow-300)",
            color: "var(--color-shell-bg)",
            borderRadius: "var(--radius)",
          }}
        >
          {pending ? "Saving…" : "Save UPI details"}
        </button>
      </form>

      <div
        className="pt-5 border-t"
        style={{ borderColor: "var(--color-shell-line)" }}
      >
        <h3
          className="text-xs font-semibold uppercase tracking-wider mb-2"
          style={labelStyle}
        >
          Static QR image (optional)
        </h3>
        {qrUploaded ? (
          <div className="flex items-start gap-4">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={`/api/restaurant/upi-qr?v=${qrBuster}`}
              alt="Uploaded UPI QR"
              className="w-32 h-32 object-contain rounded-lg"
              style={{
                background: "#ffffff",
                border: "1px solid var(--color-shell-line)",
              }}
            />
            <div className="flex-1 min-w-0">
              <p
                className="text-sm"
                style={{ color: "var(--color-charcoal-strong)" }}
              >
                Your business QR is uploaded and will be shown to customers.
              </p>
              <button
                type="button"
                onClick={handleClear}
                disabled={pending}
                className="mt-2 text-xs underline underline-offset-4"
                style={{ color: "var(--color-brand-flame-400)" }}
              >
                Remove and use auto-generated QR instead
              </button>
            </div>
          </div>
        ) : (
          <>
            <p
              className="text-sm mb-2"
              style={{ color: "var(--color-charcoal-strong)" }}
            >
              Upload your PhonePe/GPay/Paytm business QR (PNG/JPEG/WebP, ≤
              1 MB). If not uploaded, we generate one from your UPI ID + order
              amount automatically.
            </p>
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={handleUpload}
              disabled={pending}
              className="block text-sm file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:font-medium"
              style={{ color: "var(--color-shell-fg)" }}
            />
          </>
        )}
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
    </section>
  )
}
