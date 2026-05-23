import Link from "next/link"
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
    <main className="mx-auto max-w-md min-h-screen flex flex-col px-6 pt-16 pb-12">
      <header className="mb-10">
        <h1
          className="font-display text-7xl leading-none"
          style={{ color: "var(--color-brand-500)" }}
        >
          HOTBOX
        </h1>
        <p className="mt-3 text-zinc-700">Set a new password</p>
      </header>

      {status.ok ? (
        <ResetForm token={token} />
      ) : (
        <div className="space-y-4">
          <div className="rounded-2xl bg-amber-50 text-amber-900 px-5 py-4">
            <p className="font-semibold">This link doesn&rsquo;t work</p>
            <p className="text-sm mt-1">
              It may have expired or already been used. Reset links are
              valid for 1 hour and can be used only once.
            </p>
          </div>
          <Link
            href="/reset-request"
            className="block text-center py-3.5 rounded-xl text-white font-semibold"
            style={{ background: "var(--color-brand-500)", borderRadius: "var(--radius)" }}
          >
            Request a new link
          </Link>
        </div>
      )}
    </main>
  )
}
