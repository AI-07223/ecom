import { NextResponse } from "next/server"

// Coolify hits this endpoint to determine container health.
// Force dynamic so Next.js doesn't try to pre-render at build time.
export const dynamic = "force-dynamic"

export async function GET(): Promise<NextResponse> {
  return NextResponse.json({
    status: "ok",
    service: "hotbox-web",
    ts: new Date().toISOString(),
  })
}
