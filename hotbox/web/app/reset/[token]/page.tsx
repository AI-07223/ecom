import Link from "next/link"
import { Logo } from "@/components/brand/Logo"
import { inspectResetToken } from "@/lib/auth"
import { ResetForm } from "./ResetForm"

export const dynamic = "force-dynamic"

interface PageProps {
  params: Promise<{ token: string }>
}

export default async function ResetPage({
  params,
}: PageProps): Promise<React.ReactElement> {
  const { token } = await params
  const status = await inspectResetToken(token)

  return (
    <main className="mx-auto max-w-md min-h-dvh flex flex-col px-6 pt-12 pb-12">
      <header className="mb-8">
        <Logo variant="full" size="md" />
        <p
          className="mt-5 text-base"
          style={{ color: "var(--color-charcoal-strong)" }}
        >
          Set a new password
        </p>
      </header>

      {status.ok ? (
        <ResetForm token={token} />
      ) : (
        <div className="space-y-4">
          <div
            className="rounded-2xl px-5 py-4"
            style={{
              background: "color-mix(in oklab, var(--color-brand-flame-500) 18%, transparent)",
              border: "1px solid var(--color-brand-flame-700)",
              color: "var(--color-brand-flame-300)",
            }}
          >
            <p className="font-semibold">This link doesn&rsquo;t work</p>
            <p
              className="text-sm mt-1"
              style={{ color: "var(--color-shell-fg)" }}
            >
              It may have expired or already been used. Reset links are valid
              for 1 hour and can be used only once.
            </p>
          </div>
          <Link
            href="/reset-request"
            className="block text-center py-3.5 font-bold"
            style={{
              background: "var(--color-brand-yellow-300)",
              color: "var(--color-shell-bg)",
              borderRadius: "var(--radius)",
            }}
          >
            Request a new link
          </Link>
        </div>
      )}
    </main>
  )
}
