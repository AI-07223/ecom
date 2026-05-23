import { NextResponse } from "next/server"
import { z } from "zod"
import { requestPasswordReset } from "@/lib/auth"

export const dynamic = "force-dynamic"

const Body = z.object({
  email: z.string().min(3).max(254),
})

export async function POST(req: Request): Promise<NextResponse> {
  let json: unknown
  try {
    json = await req.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }
  const parsed = Body.safeParse(json)
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 })
  }

  // Always best-effort. The function silently no-ops for unknown emails.
  await requestPasswordReset(parsed.data.email).catch((err) => {
    console.error("[reset/request] internal failure:", err)
  })

  return NextResponse.json({
    ok: true,
    // Neutral message — DON'T tell the client whether the email exists.
    message: "If that email is registered, we sent a reset link.",
  })
}
