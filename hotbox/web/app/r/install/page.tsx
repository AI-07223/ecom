import { existsSync } from "node:fs"
import path from "node:path"

export const dynamic = "force-dynamic"

const MANUFACTURERS = [
  {
    name: "Xiaomi / Redmi / Poco (MIUI)",
    tips: [
      "Settings → Apps → Manage Apps → Hotbox Rider",
      "→ Battery saver → No restrictions",
      "→ Autostart → On",
      "→ Other permissions → Display pop-up while running in background → Allow",
    ],
  },
  {
    name: "OPPO / Realme (ColorOS)",
    tips: [
      "Settings → Apps → Hotbox Rider",
      "→ Battery → Allow background activity",
      "→ Battery → Background freeze → Off",
    ],
  },
  {
    name: "Vivo / iQOO (FuntouchOS)",
    tips: [
      "Settings → Battery → High background app limit → Hotbox Rider → Allow",
      "Settings → Apps → Hotbox Rider → Permissions → Background pop-up → Allow",
    ],
  },
  {
    name: "Samsung / OnePlus",
    tips: [
      "Usually works out of the box.",
      "If GPS stops mid-delivery: Settings → Apps → Hotbox Rider → Battery → Unrestricted",
    ],
  },
]

export default function InstallGuidePage(): React.ReactElement {
  const version = process.env.LATEST_APK_VERSION ?? "0.1.0"
  const baseUrl =
    process.env.PUBLIC_BASE_URL ?? "https://hotbox.networkbase75.site"
  const apkUrl = `${baseUrl}/downloads/rider-v${version}.apk`

  const apkPath = path.join(
    process.cwd(),
    "public",
    "downloads",
    `rider-v${version}.apk`,
  )
  const apkPresent = existsSync(apkPath)

  return (
    <main className="mx-auto max-w-md min-h-screen px-5 pt-8 pb-12">
      <header className="mb-6">
        <h1
          className="font-display text-6xl leading-none"
          style={{ color: "var(--color-brand-500)" }}
        >
          HOTBOX
        </h1>
        <p className="text-zinc-700 mt-1">Rider app for Android</p>
      </header>

      {apkPresent ? (
        <a
          href={apkUrl}
          download
          className="block text-center py-4 rounded-2xl text-white font-bold text-lg"
          style={{
            background: "var(--color-brand-500)",
            borderRadius: "var(--radius)",
          }}
        >
          Download Hotbox Rider · v{version}
        </a>
      ) : (
        <div className="rounded-2xl bg-amber-50 text-amber-900 p-4 text-sm">
          The APK isn&rsquo;t uploaded yet. Ask the admin to upload v
          {version} to <code>/public/downloads/</code>.
        </div>
      )}

      <section className="mt-10">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-zinc-500 mb-3">
          3-step install
        </h2>
        <ol className="space-y-4">
          <li className="rounded-2xl bg-white border border-zinc-200 p-4">
            <p className="font-semibold">1. Tap &ldquo;Download Hotbox Rider&rdquo;</p>
            <p className="text-sm text-zinc-600 mt-1">
              The APK file lands in your phone&rsquo;s Downloads folder.
            </p>
          </li>
          <li className="rounded-2xl bg-white border border-zinc-200 p-4">
            <p className="font-semibold">2. Open it to install</p>
            <p className="text-sm text-zinc-600 mt-1">
              Android may say &ldquo;Install unknown apps&rdquo; — tap
              &ldquo;Settings&rdquo;, toggle on for your browser, then come
              back and tap install. Safe — the file is signed by Hotbox.
            </p>
          </li>
          <li className="rounded-2xl bg-white border border-zinc-200 p-4">
            <p className="font-semibold">3. Sign in with your number</p>
            <p className="text-sm text-zinc-600 mt-1">
              You&rsquo;ll get an OTP. After that, the app shows your next
              delivery whenever the admin assigns one.
            </p>
          </li>
        </ol>
      </section>

      <section className="mt-10">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-zinc-500 mb-2">
          Phone-specific battery tips
        </h2>
        <p className="text-sm text-zinc-600 mb-4">
          Some phones aggressively kill background apps. Find yours below and
          follow the steps so the GPS keeps running with your screen off.
        </p>
        <div className="space-y-2">
          {MANUFACTURERS.map((m) => (
            <details
              key={m.name}
              className="rounded-2xl bg-white border border-zinc-200 px-4 py-3"
              style={{ borderRadius: "var(--radius)" }}
            >
              <summary className="font-semibold cursor-pointer">
                {m.name}
              </summary>
              <ul className="mt-3 text-sm text-zinc-700 space-y-1 font-mono">
                {m.tips.map((t, i) => (
                  <li key={i}>{t}</li>
                ))}
              </ul>
            </details>
          ))}
        </div>
      </section>

      <footer className="mt-12 text-center text-xs text-zinc-400">
        Hotbox &middot; Bangalore
      </footer>
    </main>
  )
}
