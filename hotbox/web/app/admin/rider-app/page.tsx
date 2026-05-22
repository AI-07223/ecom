import { existsSync } from "node:fs"
import path from "node:path"
import QRCode from "qrcode"
import { CopyLink } from "./CopyLink"

export const dynamic = "force-dynamic"

export default async function AdminRiderAppPage(): Promise<React.ReactElement> {
  const version = process.env.LATEST_APK_VERSION ?? "0.1.0"
  const baseUrl =
    process.env.PUBLIC_BASE_URL ?? "https://hotbox.networkbase75.site"
  const apkUrl = `${baseUrl}/downloads/rider-v${version}.apk`
  const installUrl = `${baseUrl}/r/install`

  // Check whether the APK file is actually committed to the repo.
  // (We're inside Next.js's standalone output, so resolve relative to cwd.)
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
    color: { dark: "#1a1a1a", light: "#ffffff" },
  })

  const whatsappShareUrl = `https://wa.me/?text=${encodeURIComponent(
    `Install the Hotbox Rider app: ${installUrl}`,
  )}`

  return (
    <>
      <h1 className="text-2xl font-black tracking-tight mb-1">Rider App</h1>
      <p className="text-sm text-zinc-500 mb-6">
        Download, share, or QR-code the rider APK to onboard delivery
        riders.
      </p>

      <section className="rounded-2xl border border-zinc-200 bg-white p-5 mb-6">
        <div className="flex items-baseline justify-between mb-2">
          <span
            className="text-xs font-semibold uppercase tracking-wider"
            style={{ color: "var(--color-brand-500)" }}
          >
            Current version
          </span>
          {!apkPresent && (
            <span className="text-xs text-amber-700 bg-amber-50 rounded-full px-2 py-0.5">
              APK file not uploaded yet
            </span>
          )}
        </div>
        <p className="font-black text-2xl">v{version}</p>
        <p className="text-xs text-zinc-500 mt-1">
          {apkPresent
            ? "Ready to install."
            : "Once the APK is built via EAS, upload it to /public/downloads/."}
        </p>
      </section>

      <section className="rounded-2xl border border-zinc-200 bg-white p-5 mb-6">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-zinc-500 mb-3">
          Quick share
        </h2>
        <div className="flex flex-wrap gap-3">
          <a
            href={apkUrl}
            className={`px-5 py-2.5 rounded-xl text-white font-semibold text-sm ${
              !apkPresent ? "opacity-50 pointer-events-none" : ""
            }`}
            style={{
              background: "var(--color-brand-500)",
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
            className="px-5 py-2.5 rounded-xl bg-emerald-600 text-white font-semibold text-sm"
            style={{ borderRadius: "var(--radius)" }}
          >
            Share via WhatsApp
          </a>
        </div>
        <p className="text-xs text-zinc-500 mt-3 break-all">{installUrl}</p>
      </section>

      <section className="rounded-2xl border border-zinc-200 bg-white p-5">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-zinc-500 mb-3">
          Scan to install
        </h2>
        <p className="text-sm text-zinc-600 mb-3">
          Hand the rider their phone, point them at this QR — they scan with
          the camera app, the browser opens, they install.
        </p>
        <div
          className="inline-block p-4 bg-white rounded-2xl border border-zinc-200"
          dangerouslySetInnerHTML={{ __html: qrSvg }}
        />
      </section>
    </>
  )
}
