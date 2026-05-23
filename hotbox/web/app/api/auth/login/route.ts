import { cookies } from "next/headers"
import { NextResponse } from "next/server"
import { z } from "zod"
import { AuthError, signIn } from "@/lib/auth"
import { db } from "@/lib/db"

export const dynamic = "force-dynamic"

const CART_COOKIE = "hb_cart"

const Body = z.object({
  identifier: z.string().min(3).max(254),
  password: z.string().min(1).max(200),
  requestToken: z.boolean().optional(),
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
    const result = await signIn(parsed.data)

    // Claim anonymous cart if any
    const jar = await cookies()
    const cartCookie = jar.get(CART_COOKIE)?.value
    if (cartCookie) {
      const cart = await db.cart.findUnique({
        where: { sessionId: cartCookie },
      })
      if (cart && cart.userId !== result.user.id) {
        await db.cart.update({
          where: { id: cart.id },
          data: { userId: result.user.id },
        })
      }
    }

    return NextResponse.json({
      ok: true,
      user: result.user,
      ...(parsed.data.requestToken ? { token: result.token } : {}),
    })
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json(
        { error: err.message, code: err.code },
        { status: 401 },
      )
    }
    console.error("[login] failed:", err)
    return NextResponse.json({ error: "Login failed" }, { status: 500 })
  }
}
