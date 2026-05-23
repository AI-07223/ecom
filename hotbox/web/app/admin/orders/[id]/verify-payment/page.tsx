import Link from "next/link"
import { notFound } from "next/navigation"
import { db } from "@/lib/db"
import { formatINR } from "@/lib/pricing"
import { STATE_LABELS } from "@/lib/order-state"
import { VerifyActions } from "./VerifyActions"

export const dynamic = "force-dynamic"

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function VerifyPaymentPage({
  params,
}: PageProps): Promise<React.ReactElement> {
  const { id } = await params

  const order = await db.order.findUnique({
    where: { id },
    include: {
      user: { select: { name: true, phone: true, email: true } },
      address: true,
      items: { orderBy: { createdAt: "asc" } },
    },
  })
  if (!order) notFound()

  return (
    <>
      <Link
        href="/admin"
        className="text-sm text-zinc-500 hover:underline underline-offset-4"
      >
        ← Inbox
      </Link>

      <h1 className="mt-3 text-2xl font-black tracking-tight">
        Verify payment · {order.publicCode}
      </h1>
      <p className="text-sm text-zinc-500 mt-1">
        Status: {STATE_LABELS[order.state]} · paymentStatus: {order.paymentStatus} · {formatINR(order.totalPaise)}
      </p>

      <section className="mt-6 rounded-2xl border border-zinc-200 bg-white p-5">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-zinc-500 mb-2">
          Customer's UTR
        </h2>
        {order.paymentProofUtr ? (
          <p className="font-mono text-2xl font-bold tracking-wider tabular-nums">
            {order.paymentProofUtr}
          </p>
        ) : (
          <p className="text-zinc-500 italic">No UTR submitted yet</p>
        )}
        {order.paymentProofSubmittedAt && (
          <p className="text-xs text-zinc-500 mt-1">
            Submitted {order.paymentProofSubmittedAt.toLocaleString("en-IN")}
          </p>
        )}
      </section>

      {order.paymentProofFilename && (
        <section className="mt-4 rounded-2xl border border-zinc-200 bg-white p-5">
          <div className="flex items-baseline justify-between mb-2">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
              Screenshot
            </h2>
            <a
              href={`/api/orders/${order.id}/payment-proof?download=1`}
              className="text-xs font-semibold underline underline-offset-4"
              style={{ color: "var(--color-brand-500)" }}
              download
            >
              ↓ Download
            </a>
          </div>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={`/api/orders/${order.id}/payment-proof`}
            alt="Payment screenshot"
            className="max-w-full max-h-96 object-contain rounded-lg border border-zinc-200"
          />
          {order.paymentProofExpiresAt && (
            <p className="text-xs text-zinc-500 mt-2">
              Auto-deletes on {order.paymentProofExpiresAt.toLocaleDateString("en-IN")}
            </p>
          )}
        </section>
      )}

      <section className="mt-4 rounded-2xl border border-zinc-200 bg-white p-5 text-sm">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-zinc-500 mb-2">
          Customer
        </h2>
        <p>{order.user.name ?? "—"}</p>
        <p className="text-zinc-600">
          <a href={`tel:${order.user.phone}`} className="underline">
            {order.user.phone}
          </a>
        </p>
        {order.user.email && (
          <p className="text-zinc-600">{order.user.email}</p>
        )}
        <p className="text-zinc-600 mt-2">{order.address.fullAddress}</p>
      </section>

      <section className="mt-4 rounded-2xl border border-zinc-200 bg-white p-5 text-sm">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-zinc-500 mb-2">
          Items
        </h2>
        <ul className="space-y-1">
          {order.items.map((i) => (
            <li key={i.id}>
              {i.quantity} × {i.itemTitle}
              {i.variantName && (
                <span className="text-zinc-500"> ({i.variantName})</span>
              )}{" "}
              <span className="text-zinc-500 tabular-nums">{formatINR(i.lineTotalPaise)}</span>
            </li>
          ))}
        </ul>
      </section>

      <VerifyActions
        orderId={order.id}
        canVerify={order.paymentStatus !== "PAID"}
        canReject={order.paymentStatus === "AWAITING_VERIFICATION" || order.paymentStatus === "PENDING"}
      />

      {order.paymentVerifiedNote && (
        <section className="mt-4 rounded-2xl bg-zinc-50 p-4 text-sm">
          <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500 mb-1">
            Last verification note
          </p>
          <p>{order.paymentVerifiedNote}</p>
        </section>
      )}
    </>
  )
}
