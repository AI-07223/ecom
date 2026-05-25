import { existsSync } from "node:fs"
import path from "node:path"
import { Logo } from "@/components/brand/Logo"

export const dynamic = "force-dynamic"

const MANUFACTURERS = [
  {
    name: "Xiaomi / Redmi / Poco (MIUI)",
    tips: [
      "Settings → Apps → Manage Apps → Hot Box Rider",
      "→ Battery saver → No restrictions",
      "→ Autostart → On",
      "→ Other permissions → Display pop-up while running in background → Allow",
    ],
  },
  {
    name: "OPPO / Realme (ColorOS)",
    tips: [
      "Settings → Apps → Hot Box Rider",
      "→ Battery → Allow background activity",
      "→ Battery → Background freeze → Off",
    ],
  },
  {
    name: "Vivo / iQOO (FuntouchOS)",
    tips: [
      "Settings → Battery → High background app limit → Hot Box Rider → Allow",
      "Settings → Apps → Hot Box Rider → Permissions → Background pop-up → Allow",
    ],
  },
  {
    name: "Samsung / OnePlus",
    tips: [
      "Usually works out of the box.",
      "If GPS stops mid-delivery: Settings → Apps → Hot Box Rider → Battery → Unrestricted",
    ],
  },
]

const cardStyle: React.CSSProperties = {
  background: "var(--color-shell-elev)",
  border: "1px solid var(--color-shell-line)",
  borderRadius: "var(--radius)",
}

const labelStyle: React.CSSProperties = {
  color: "var(--color-charcoal)",
}

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
    <main className="mx-auto max-w-md min-h-dvh px-5 pt-8 pb-12">
      <header className="mb-6">
        <Logo variant="full" size="md" />
        <p
          className="mt-5 text-base"
          style={{ color: "var(--color-charcoal-strong)" }}
        >
          Rider app for Android
        </p>
      </header>

      {apkPresent ? (
        <a
          href={apkUrl}
          download
          className="block text-center py-4 font-bold text-lg"
          style={{
            background: "var(--color-brand-yellow-300)",
            color: "var(--color-shell-bg)",
            borderRadius: "var(--radius-lg)",
          }}
        >
          Download Hot Box Rider · v{version}
        </a>
      ) : (
        <div
          className="p-4 text-sm"
          style={{
            background:
              "color-mix(in oklab, var(--color-brand-flame-500) 18%, transparent)",
            border: "1px solid var(--color-brand-flame-700)",
            color: "var(--color-brand-flame-300)",
            borderRadius: "var(--radius)",
          }}
        >
          The APK isn&rsquo;t uploaded yet. Ask the admin to upload v{version}{" "}
          to <code>/public/downloads/</code>.
        </div>
      )}

      <section className="mt-10">
        <h2
          className="text-xs font-semibold uppercase tracking-wider mb-3"
          style={labelStyle}
        >
          3-step install
        </h2>
        <ol className="space-y-4">
          <li className="p-4" style={cardStyle}>
            <p className="font-semibold">
              1. Tap &ldquo;Download Hot Box Rider&rdquo;
            </p>
            <p
              className="text-sm mt-1"
              style={{ color: "var(--color-charcoal-strong)" }}
            >
              The APK file lands in your phone&rsquo;s Downloads folder.
            </p>
          </li>
          <li className="p-4" style={cardStyle}>
            <p className="font-semibold">2. Open it to install</p>
            <p
              className="text-sm mt-1"
              style={{ color: "var(--color-charcoal-strong)" }}
            >
              Android may say &ldquo;Install unknown apps&rdquo; — tap
              &ldquo;Settings&rdquo;, toggle on for your browser, then come
              back and tap install. Safe — the file is signed by Hot Box.
            </p>
          </li>
          <li className="p-4" style={cardStyle}>
            <p className="font-semibold">3. Sign in with your number</p>
            <p
              className="text-sm mt-1"
              style={{ color: "var(--color-charcoal-strong)" }}
            >
              You&rsquo;ll get an OTP. After that, the app shows your next
              delivery whenever the admin assigns one.
            </p>
          </li>
        </ol>
      </section>

      <section className="mt-10">
        <h2
          className="text-xs font-semibold uppercase tracking-wider mb-2"
          style={labelStyle}
        >
          Phone-specific battery tips
        </h2>
        <p
          className="text-sm mb-4"
          style={{ color: "var(--color-charcoal-strong)" }}
        >
          Some phones aggressively kill background apps. Find yours below and
          follow the steps so the GPS keeps running with your screen off.
        </p>
        <div className="space-y-2">
          {MANUFACTURERS.map((m) => (
            <details key={m.name} className="px-4 py-3" style={cardStyle}>
              <summary
                className="font-semibold cursor-pointer"
                style={{ color: "var(--color-shell-fg)" }}
              >
                {m.name}
              </summary>
              <ul
                className="mt-3 text-sm space-y-1 font-mono"
                style={{ color: "var(--color-charcoal-strong)" }}
              >
                {m.tips.map((t, i) => (
                  <li key={i}>{t}</li>
                ))}
              </ul>
            </details>
          ))}
        </div>
      </section>

      <footer
        className="mt-12 text-center text-xs"
        style={{ color: "var(--color-charcoal)" }}
      >
        Hot Box · Cloud Kitchen · Bangalore
      </footer>
    </main>
  )
}
