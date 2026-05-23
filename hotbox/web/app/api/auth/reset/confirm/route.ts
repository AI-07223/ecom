import { NextResponse } from "next/server"
import { z } from "zod"
import { AuthError, confirmPasswordReset } from "@/lib/auth"

export const dynamic = "force-dynamic"

const Body = z.object({
  token: z.string().length(64),
  password: z.string().min(8).max(200),
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

  try {
    const result = await confirmPasswordReset(parsed.data.token, parsed.data.password)
    return NextResponse.json({ ok: true, user: result.user })
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message, code: err.code }, { status: 400 })
    }
    console.error("[reset/confirm] failed:", err)
    return NextResponse.json({ error: "Reset failed" }, { status: 500 })
  }
}
