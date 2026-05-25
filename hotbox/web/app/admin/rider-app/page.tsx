import { existsSync } from "node:fs"
import path from "node:path"
import QRCode from "qrcode"
import { CopyLink } from "./CopyLink"

export const dynamic = "force-dynamic"

const cardStyle: React.CSSProperties = {
  background: "var(--color-shell-elev)",
  border: "1px solid var(--color-shell-line)",
  borderRadius: "var(--radius)",
}

const labelStyle: React.CSSProperties = {
  color: "var(--color-charcoal)",
}

export default async function AdminRiderAppPage(): Promise<React.ReactElement> {
  const version = process.env.LATEST_APK_VERSION ?? "0.1.0"
  const baseUrl =
    process.env.PUBLIC_BASE_URL ?? "https://hotbox.networkbase75.site"
  const apkUrl = `${baseUrl}/downloads/rider-v${version}.apk`
  const installUrl = `${baseUrl}/r/install`

  const apkPath = path.join(
    process.cwd(),
    "public",
    "downloads",
    `rider-v${version}.apk`,
  )
  const apkPresent = existsSync(apkPath)

  const qrSvg = await QRCode.toString(installUrl, {
    type: "svg",
    margin: 0,
    width: 256,
    color: { dark: "#0a0a0a", light: "#ffffff" },
  })

  const whatsappShareUrl = `https://wa.me/?text=${encodeURIComponent(
    `Install the Hot Box Rider app: ${installUrl}`,
  )}`

  return (
    <>
      <h1 className="font-display text-3xl mb-1">Rider App</h1>
      <p className="text-sm mb-6" style={labelStyle}>
        Download, share, or QR-code the rider APK to onboard delivery riders.
      </p>

      <section className="p-5 mb-6" style={cardStyle}>
        <div className="flex items-baseline justify-between mb-2">
          <span
            className="text-xs font-semibold uppercase tracking-wider"
            style={{ color: "var(--color-brand-yellow-300)" }}
          >
            Current version
          </span>
          {!apkPresent && (
            <span
              className="text-xs rounded-full px-2 py-0.5"
              style={{
                background:
                  "color-mix(in oklab, var(--color-brand-flame-500) 18%, transparent)",
                color: "var(--color-brand-flame-300)",
              }}
            >
              APK file not uploaded yet
            </span>
          )}
        </div>
        <p
          className="font-display text-3xl"
          style={{ color: "var(--color-shell-fg)" }}
        >
          v{version}
        </p>
        <p className="text-xs mt-1" style={labelStyle}>
          {apkPresent
            ? "Ready to install."
            : "Once the APK is built via EAS, upload it to /public/downloads/."}
        </p>
      </section>

      <section className="p-5 mb-6" style={cardStyle}>
        <h2
          className="text-xs font-semibold uppercase tracking-wider mb-3"
          style={labelStyle}
        >
          Quick share
        </h2>
        <div className="flex flex-wrap gap-3">
          <a
            href={apkUrl}
            className={`px-5 py-2.5 font-bold text-sm ${
              !apkPresent ? "opacity-50 pointer-events-none" : ""
            }`}
            style={{
              background: "var(--color-brand-yellow-300)",
              color: "var(--color-shell-bg)",
              borderRadius: "var(--radius)",
            }}
            download
          >
            Download APK
          </a>
          <CopyLink url={installUrl} />
          <a
            href={whatsappShareUrl}
            target="_blank"
            rel="noreferrer"
            className="px-5 py-2.5 font-bold text-sm"
            style={{
              background: "var(--color-veg)",
              color: "var(--color-shell-bg)",
              borderRadius: "var(--radius)",
            }}
          >
            Share via WhatsApp
          </a>
        </div>
        <p
          className="text-xs mt-3 break-all font-mono"
          style={labelStyle}
        >
          {installUrl}
        </p>
      </section>

      <section className="p-5" style={cardStyle}>
        <h2
          className="text-xs font-semibold uppercase tracking-wider mb-3"
          style={labelStyle}
        >
          Scan to install
        </h2>
        <p
          className="text-sm mb-3"
          style={{ color: "var(--color-charcoal-strong)" }}
        >
          Hand the rider their phone, point them at this QR — they scan with
          the camera app, the browser opens, they install.
        </p>
        <div
          className="inline-block p-4 rounded-2xl"
          style={{
            background: "#ffffff",
            border: "1px solid var(--color-shell-line)",
          }}
          dangerouslySetInnerHTML={{ __html: qrSvg }}
        />
      </section>
    </>
  )
}
