"use client"

import { useRouter } from "next/navigation"
import { useState, useTransition } from "react"
import {
  askForNewProof,
  forceMarkPaid,
  rejectPayment,
  verifyPayment,
} from "@/app/_actions/admin-payment"

interface Props {
  orderId: string
  canVerify: boolean
  canReject: boolean
}

const ghostBtn: React.CSSProperties = {
  background: "var(--color-shell-elev)",
  border: "1px solid var(--color-shell-line)",
  color: "var(--color-charcoal-strong)",
  borderRadius: "var(--radius)",
}

const dangerBtn: React.CSSProperties = {
  background:
    "color-mix(in oklab, var(--color-brand-flame-500) 18%, transparent)",
  border: "1px solid var(--color-brand-flame-700)",
  color: "var(--color-brand-flame-300)",
  borderRadius: "var(--radius)",
}

export function VerifyActions({
  orderId,
  canVerify,
  canReject,
}: Props): React.ReactElement {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [showForce, setShowForce] = useState(false)
  const [forceNote, setForceNote] = useState("")
  const [error, setError] = useState<string | null>(null)

  return (
    <section className="mt-6 space-y-3">
      {canVerify && (
        <>
          <button
            type="button"
            disabled={pending}
            onClick={() =>
              startTransition(async () => {
                setError(null)
                const r = await verifyPayment(orderId)
                if (!r.ok) setError(r.error)
                else router.refresh()
              })
            }
            className="w-full py-4 font-bold disabled:opacity-50"
            style={{
              background: "var(--color-brand-yellow-300)",
              color: "var(--color-shell-bg)",
              borderRadius: "var(--radius)",
            }}
          >
            ✓ Verified — mark as PAID
          </button>
          {canReject && (
            <>
              <button
                type="button"
                disabled={pending}
                onClick={() => {
                  const reason = prompt(
                    "Reject reason (will show to customer):",
                  )
                  if (!reason || reason.trim().length < 3) return
                  startTransition(async () => {
                    setError(null)
                    const r = await rejectPayment({ orderId, reason })
                    if (!r.ok) setError(r.error)
                    else router.refresh()
                  })
                }}
                className="w-full py-3 font-medium disabled:opacity-50"
                style={dangerBtn}
              >
                Reject — wrong amount / fake
              </button>
              <button
                type="button"
                disabled={pending}
                onClick={() =>
                  startTransition(async () => {
                    setError(null)
                    const r = await askForNewProof(orderId)
                    if (!r.ok) setError(r.error)
                    else router.refresh()
                  })
                }
                className="w-full py-3 font-medium disabled:opacity-50"
                style={ghostBtn}
              >
                Ask for new proof
              </button>
            </>
          )}
        </>
      )}

      {!showForce && canVerify && (
        <button
          type="button"
          onClick={() => setShowForce(true)}
          className="w-full text-xs underline underline-offset-4 pt-2"
          style={{ color: "var(--color-charcoal)" }}
        >
          + Force-mark PAID (paid via other channel)
        </button>
      )}

      {showForce && (
        <div
          className="p-4 space-y-3"
          style={{
            background: "var(--color-shell-elev)",
            border: "1px solid var(--color-shell-line)",
            borderRadius: "var(--radius)",
          }}
        >
          <p
            className="text-xs font-semibold uppercase tracking-wider"
            style={{ color: "var(--color-charcoal)" }}
          >
            Force mark PAID (admin override)
          </p>
          <textarea
            value={forceNote}
            onChange={(e) => setForceNote(e.target.value.slice(0, 500))}
            placeholder="Why? (e.g. paid cash to owner)"
            rows={2}
            className="w-full px-3 py-2 outline-none focus:ring-2 text-sm"
            style={{
              background: "var(--color-shell-bg)",
              border: "1px solid var(--color-shell-line)",
              color: "var(--color-shell-fg)",
              borderRadius: "var(--radius)",
            }}
          />
          <div className="flex gap-2">
            <button
              type="button"
              disabled={pending || forceNote.trim().length < 5}
              onClick={() =>
                startTransition(async () => {
                  setError(null)
                  const r = await forceMarkPaid({
                    orderId,
                    note: forceNote.trim(),
                  })
                  if (!r.ok) setError(r.error)
                  else router.refresh()
                })
              }
              className="flex-1 py-2.5 font-bold disabled:opacity-50 text-sm"
              style={{
                background: "var(--color-brand-yellow-400)",
                color: "var(--color-shell-bg)",
                borderRadius: "var(--radius)",
              }}
            >
              Confirm force-mark PAID
            </button>
            <button
              type="button"
              onClick={() => {
                setShowForce(false)
                setForceNote("")
              }}
              className="px-4 py-2.5 text-sm"
              style={ghostBtn}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {error && (
        <div
          className="text-sm rounded-lg px-4 py-3"
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
    </section>
  )
}
