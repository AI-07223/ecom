"use client"

import { useState, useTransition } from "react"
import { clearUpiQr, saveUpiConfig, uploadUpiQr } from "@/app/_actions/admin-upi"

interface Initial {
  upiVpa: string | null
  upiDisplayName: string | null
  qrUploaded: boolean
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
    e.target.value = "" // reset input
  }

  async function handleClear(): Promise<void> {
    if (!confirm("Remove the uploaded QR? We'll fall back to generating a QR from the VPA.")) return
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
    <section
      className="rounded-2xl border border-zinc-200 bg-white p-5 space-y-5"
      style={{ borderRadius: "var(--radius)" }}
    >
      <div>
        <h2 className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--color-brand-500)" }}>
          UPI payment
        </h2>
        <p className="text-sm text-zinc-600 mt-1">
          Customer's pay page uses these. If you upload your business QR
          (PhonePe/GPay), we show that. If not, we generate one from your
          UPI ID + the order amount.
        </p>
      </div>

      <form onSubmit={saveText} className="space-y-3">
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-500 mb-1">
            UPI ID (VPA)
          </label>
          <input
            type="text"
            value={vpa}
            onChange={(e) => setVpa(e.target.value.replace(/\s+/g, ""))}
            placeholder="hotbox@upi"
            className="w-full px-3 py-2.5 rounded-lg border border-zinc-300 font-mono"
            style={{ borderRadius: "var(--radius)" }}
            autoCapitalize="off"
            autoCorrect="off"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-500 mb-1">
            Display name (shown to customer)
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value.slice(0, 80))}
            placeholder="Hotbox Foods"
            className="w-full px-3 py-2.5 rounded-lg border border-zinc-300"
            style={{ borderRadius: "var(--radius)" }}
          />
        </div>
        <button
          type="submit"
          disabled={pending}
          className="px-5 py-2.5 rounded-lg text-white font-semibold disabled:opacity-50 text-sm"
          style={{ background: "var(--color-brand-500)", borderRadius: "var(--radius)" }}
        >
          {pending ? "Saving…" : "Save UPI details"}
        </button>
      </form>

      <div className="border-t border-zinc-100 pt-5">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-500 mb-2">
          Static QR image (optional)
        </h3>
        {qrUploaded ? (
          <div className="flex items-start gap-4">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={`/api/restaurant/upi-qr?v=${qrBuster}`}
              alt="Uploaded UPI QR"
              className="w-32 h-32 object-contain rounded-lg border border-zinc-200 bg-white"
            />
            <div className="flex-1 min-w-0">
              <p className="text-sm text-zinc-600">
                Your business QR is uploaded and will be shown to customers.
              </p>
              <button
                type="button"
                onClick={handleClear}
                disabled={pending}
                className="mt-2 text-xs text-red-700 underline underline-offset-4"
              >
                Remove and use auto-generated QR instead
              </button>
            </div>
          </div>
        ) : (
          <>
            <p className="text-sm text-zinc-600 mb-2">
              Upload your PhonePe/GPay/Paytm business QR (PNG/JPEG/WebP,
              ≤ 1 MB). If not uploaded, we generate one from your UPI ID
              + order amount automatically.
            </p>
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={handleUpload}
              disabled={pending}
              className="block text-sm file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-zinc-100 file:text-zinc-700 file:font-medium"
            />
          </>
        )}
      </div>

      {error && (
        <div className="text-sm text-red-700 bg-red-50 rounded-lg px-3 py-2">
          {error}
        </div>
      )}
      {saved && !error && (
        <div className="text-sm text-emerald-700 bg-emerald-50 rounded-lg px-3 py-2">
          Saved.
        </div>
      )}
    </section>
  )
}
