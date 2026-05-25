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

const cardStyle: React.CSSProperties = {
  background: "var(--color-shell-elev)",
  border: "1px solid var(--color-shell-line)",
  borderRadius: "var(--radius)",
}

const labelStyle: React.CSSProperties = {
  color: "var(--color-charcoal)",
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
        className="text-sm underline-offset-4 hover:underline"
        style={{ color: "var(--color-brand-yellow-300)" }}
      >
        ← Inbox
      </Link>

      <h1 className="mt-3 font-display text-3xl">
        Verify payment ·{" "}
        <span
          className="font-mono"
          style={{ color: "var(--color-brand-yellow-300)" }}
        >
          {order.publicCode}
        </span>
      </h1>
      <p className="text-sm mt-1" style={labelStyle}>
        Status: {STATE_LABELS[order.state]} · paymentStatus:{" "}
        {order.paymentStatus} · {formatINR(order.totalPaise)}
      </p>

      <section className="mt-6 p-5" style={cardStyle}>
        <h2
          className="text-xs font-semibold uppercase tracking-wider mb-2"
          style={labelStyle}
        >
          Customer&rsquo;s UTR
        </h2>
        {order.paymentProofUtr ? (
          <p className="font-mono text-2xl font-bold tracking-wider tabular-nums">
            {order.paymentProofUtr}
          </p>
        ) : (
          <p className="italic" style={labelStyle}>
            No UTR submitted yet
          </p>
        )}
        {order.paymentProofSubmittedAt && (
          <p className="text-xs mt-1" style={labelStyle}>
            Submitted {order.paymentProofSubmittedAt.toLocaleString("en-IN")}
          </p>
        )}
      </section>

      {order.paymentProofFilename && (
        <section className="mt-4 p-5" style={cardStyle}>
          <div className="flex items-baseline justify-between mb-2">
            <h2
              className="text-xs font-semibold uppercase tracking-wider"
              style={labelStyle}
            >
              Screenshot
            </h2>
            <a
              href={`/api/orders/${order.id}/payment-proof?download=1`}
              className="text-xs font-semibold underline underline-offset-4"
              style={{ color: "var(--color-brand-yellow-300)" }}
              download
            >
              ↓ Download
            </a>
          </div>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={`/api/orders/${order.id}/payment-proof`}
            alt="Payment screenshot"
            className="max-w-full max-h-96 object-contain rounded-lg"
            style={{ border: "1px solid var(--color-shell-line)" }}
          />
          {order.paymentProofExpiresAt && (
            <p className="text-xs mt-2" style={labelStyle}>
              Auto-deletes on{" "}
              {order.paymentProofExpiresAt.toLocaleDateString("en-IN")}
            </p>
          )}
        </section>
      )}

      <section className="mt-4 p-5 text-sm" style={cardStyle}>
        <h2
          className="text-xs font-semibold uppercase tracking-wider mb-2"
          style={labelStyle}
        >
          Customer
        </h2>
        <p>{order.user.name ?? "—"}</p>
        <p style={{ color: "var(--color-charcoal-strong)" }}>
          <a
            href={`tel:${order.user.phone}`}
            className="underline"
            style={{ color: "var(--color-brand-yellow-300)" }}
          >
            {order.user.phone}
          </a>
        </p>
        {order.user.email && (
          <p style={{ color: "var(--color-charcoal-strong)" }}>
            {order.user.email}
          </p>
        )}
        <p
          className="mt-2"
          style={{ color: "var(--color-charcoal-strong)" }}
        >
          {order.address.fullAddress}
        </p>
      </section>

      <section className="mt-4 p-5 text-sm" style={cardStyle}>
        <h2
          className="text-xs font-semibold uppercase tracking-wider mb-2"
          style={labelStyle}
        >
          Items
        </h2>
        <ul className="space-y-1">
          {order.items.map((i) => (
            <li key={i.id}>
              {i.quantity} × {i.itemTitle}
              {i.variantName && (
                <span style={labelStyle}> ({i.variantName})</span>
              )}{" "}
              <span className="tabular-nums" style={labelStyle}>
                {formatINR(i.lineTotalPaise)}
              </span>
            </li>
          ))}
        </ul>
      </section>

      <VerifyActions
        orderId={order.id}
        canVerify={order.paymentStatus !== "PAID"}
        canReject={
          order.paymentStatus === "AWAITING_VERIFICATION" ||
          order.paymentStatus === "PENDING"
        }
      />

      {order.paymentVerifiedNote && (
        <section
          className="mt-4 p-4 text-sm"
          style={{
            background: "var(--color-shell-elev)",
            borderRadius: "var(--radius)",
          }}
        >
          <p
            className="text-xs font-semibold uppercase tracking-wider mb-1"
            style={labelStyle}
          >
            Last verification note
          </p>
          <p>{order.paymentVerifiedNote}</p>
        </section>
      )}
    </>
  )
}
