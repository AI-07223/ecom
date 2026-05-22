import Link from "next/link"

// v1 stub. Section 2 (food-catalog) replaces this with the real category
// grid driven by the seeded menu. This stub only exists so the first
// Coolify deploy succeeds before the real catalog routes land.
export default function HomePage(): React.ReactElement {
  return (
    <main className="mx-auto max-w-md min-h-screen flex flex-col">
      <header className="px-6 pt-12 pb-6">
        <h1
          className="text-5xl font-black tracking-tight"
          style={{ color: "var(--color-brand-500)", fontFamily: "var(--font-display)" }}
        >
          Hotbox
        </h1>
        <p className="mt-2 text-zinc-600">Hot food, delivered fast.</p>
      </header>
      <section className="px-6 flex-1">
        <div
          className="rounded-2xl border border-zinc-200 p-6 bg-zinc-50"
          style={{ borderRadius: "var(--radius)" }}
        >
          <p className="text-zinc-700">
            We&rsquo;re plating up. Catalog goes live in the next deploy.
          </p>
          <p className="text-zinc-500 text-sm mt-3">
            <Link
              href="/api/health"
              className="underline underline-offset-4 hover:opacity-70"
            >
              service status
            </Link>
          </p>
        </div>
      </section>
      <footer className="px-6 py-8 text-xs text-zinc-400">
        Hotbox &middot; Bangalore &middot; Veg only &middot; INR
      </footer>
    </main>
  )
}
