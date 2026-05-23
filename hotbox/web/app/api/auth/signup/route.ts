import { cookies } from "next/headers"
import { NextResponse } from "next/server"
import { z } from "zod"
import { AuthError, signUp } from "@/lib/auth"
import { db } from "@/lib/db"

export const dynamic = "force-dynamic"

const CART_COOKIE = "hb_cart"

const Body = z.object({
  email: z.string().min(3).max(254),
  phone: z.string().min(7).max(20),
  name: z.string().max(80).nullish(),
  password: z.string().min(8).max(200),
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
    const result = await signUp(parsed.data)

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
      const status =
        err.code === "DUPLICATE_EMAIL" || err.code === "DUPLICATE_PHONE"
          ? 409
          : 400
      return NextResponse.json({ error: err.message, code: err.code }, { status })
    }
    console.error("[signup] failed:", err)
    return NextResponse.json({ error: "Signup failed" }, { status: 500 })
  }
}
