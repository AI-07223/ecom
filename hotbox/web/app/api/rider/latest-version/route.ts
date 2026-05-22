/**
 * Lets the Expo APK check for updates. Reads `LATEST_APK_VERSION` env var
 * (set in Coolify) so we can bump the version without redeploying — just
 * upload a new APK file to `public/downloads/`, update the env var, and
 * trigger a restart.
 */
import { NextResponse } from "next/server"

export const dynamic = "force-dynamic"

export async function GET(): Promise<NextResponse> {
  const version = process.env.LATEST_APK_VERSION ?? "0.1.0"
  const baseUrl =
    process.env.PUBLIC_BASE_URL ?? "https://hotbox.networkbase75.site"
  return NextResponse.json({
    version,
    apk_url: `${baseUrl}/downloads/rider-v${version}.apk`,
  })
}
