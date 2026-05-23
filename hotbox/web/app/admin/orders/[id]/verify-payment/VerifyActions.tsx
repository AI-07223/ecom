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
            className="w-full py-4 rounded-xl text-white font-semibold disabled:opacity-50"
            style={{
              background: "var(--color-brand-500)",
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
                  const reason = prompt("Reject reason (will show to customer):")
                  if (!reason || reason.trim().length < 3) return
                  startTransition(async () => {
                    setError(null)
                    const r = await rejectPayment({ orderId, reason })
                    if (!r.ok) setError(r.error)
                    else router.refresh()
                  })
                }}
                className="w-full py-3 rounded-xl border border-red-200 text-red-700 bg-red-50 font-medium disabled:opacity-50"
                style={{ borderRadius: "var(--radius)" }}
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
                className="w-full py-3 rounded-xl border border-zinc-200 font-medium disabled:opacity-50"
                style={{ borderRadius: "var(--radius)" }}
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
          className="w-full text-xs text-zinc-500 underline underline-offset-4 pt-2"
        >
          + Force-mark PAID (paid via other channel)
        </button>
      )}

      {showForce && (
        <div className="rounded-2xl bg-zinc-50 p-4 space-y-3">
          <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
            Force mark PAID (admin override)
          </p>
          <textarea
            value={forceNote}
            onChange={(e) => setForceNote(e.target.value.slice(0, 500))}
            placeholder="Why? (e.g. paid cash to owner)"
            rows={2}
            className="w-full px-3 py-2 rounded-lg border border-zinc-300 outline-none focus:ring-2 focus:ring-brand-500 text-sm"
            style={{ borderRadius: "var(--radius)" }}
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
              className="flex-1 py-2.5 rounded-lg text-white font-semibold disabled:opacity-50 text-sm"
              style={{
                background: "var(--color-brand-700)",
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
              className="px-4 py-2.5 rounded-lg border border-zinc-200 text-sm"
              style={{ borderRadius: "var(--radius)" }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {error && (
        <div className="text-sm text-red-700 bg-red-50 rounded-lg px-4 py-3">
          {error}
        </div>
      )}
    </section>
  )
}
