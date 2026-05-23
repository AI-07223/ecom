/**
 * Daily cron endpoint — purges payment-proof screenshots older than 30
 * days. Triggered by a Coolify scheduled task with a Bearer token.
 *
 * Authorization: the request must include `Authorization: Bearer <token>`
 * where <token> matches the `CRON_SECRET` env var. Coolify's scheduled
 * task is configured to send this header.
 */
import { NextResponse } from "next/server"
import {
  purgeExpiredPaymentProofs,
  purgeOrphanedFiles,
} from "@/lib/payment-proof"

export const dynamic = "force-dynamic"

export async function POST(req: Request): Promise<NextResponse> {
  const auth = req.headers.get("authorization") ?? ""
  const expected = process.env.CRON_SECRET ?? ""

  if (!expected) {
    return NextResponse.json(
      { error: "Cron not configured — set CRON_SECRET env var" },
      { status: 503 },
    )
  }
  if (auth !== `Bearer ${expected}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const started = Date.now()
  try {
    const result = await purgeExpiredPaymentProofs()
    const orphans = await purgeOrphanedFiles()
    const durationMs = Date.now() - started
    console.log(
      `[purge] OK rows=${result.rowsScanned} deleted=${result.filesDeleted} orphans=${orphans} errors=${result.errors} in ${durationMs}ms`,
    )
    return NextResponse.json({
      ok: true,
      ...result,
      orphansDeleted: orphans,
      durationMs,
    })
  } catch (err) {
    console.error("[purge] FAILED:", err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Purge failed" },
      { status: 500 },
    )
  }
}

// Allow GET for convenience (Coolify's task curls without method spec
// sometimes); same auth + same handler.
export async function GET(req: Request): Promise<NextResponse> {
  return POST(req)
}
