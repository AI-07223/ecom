import { NextResponse } from "next/server"
import { z } from "zod"
import {
  OtpExhaustedError,
  OtpInvalidError,
  verifyOtp,
} from "@/lib/otp"
import { InvalidPhoneError, normalizeIndianPhone } from "@/lib/phone"
import { createSession, setSessionCookie } from "@/lib/session"
import { db } from "@/lib/db"
import { cookies } from "next/headers"

export const dynamic = "force-dynamic"

const Body = z.object({
  phone: z.string().min(7).max(20),
  code: z.string().regex(/^\d{6}$/, "OTP must be exactly 6 digits"),
  /** When true (e.g., from the Expo APK), the response includes the raw
   *  JWT in `token` so the native client can store it in SecureStore. The
   *  HttpOnly cookie is still set for web clients that send cookies. */
  requestToken: z.boolean().optional(),
})

const CART_COOKIE = "hb_cart"

export async function POST(req: Request): Promise<NextResponse> {
  let json: unknown
  try {
    json = await req.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }

  const parsed = Body.safeParse(json)
  if (!parsed.success) {
    return NextResponse.json(
      { error: "phone and 6-digit code are required" },
      { status: 400 },
    )
  }

  let phone: string
  try {
    phone = normalizeIndianPhone(parsed.data.phone)
  } catch (err) {
    if (err instanceof InvalidPhoneError) {
      return NextResponse.json(
        { error: "Invalid phone number" },
        { status: 400 },
      )
    }
    throw err
  }

  try {
    const user = await verifyOtp(phone, parsed.data.code)

    // Bind the anonymous cart (if any) to this user, in the same logical
    // boundary as the session establishment.
    const jar = await cookies()
    const cartCookie = jar.get(CART_COOKIE)?.value
    if (cartCookie) {
      const cart = await db.cart.findUnique({ where: { sessionId: cartCookie } })
      if (cart && cart.userId !== user.id) {
        await db.cart.update({
          where: { id: cart.id },
          data: { userId: user.id },
        })
      }
    }

    const token = await createSession({
      uid: user.id,
      phone: user.phone,
      role: user.role,
    })
    await setSessionCookie(token)

    return NextResponse.json({
      ok: true,
      user: { id: user.id, phone: user.phone, role: user.role },
      // Native clients (Expo) need the raw token to send as a bearer header.
      ...(parsed.data.requestToken ? { token } : {}),
    })
  } catch (err) {
    if (err instanceof OtpInvalidError) {
      return NextResponse.json(
        { error: "Wrong code. Try again." },
        { status: 400 },
      )
    }
    if (err instanceof OtpExhaustedError) {
      return NextResponse.json(
        { error: err.message },
        { status: 410 },
      )
    }
    console.error("[otp/verify] failed:", err)
    return NextResponse.json(
      { error: "Couldn't verify. Try again." },
      { status: 500 },
    )
  }
}
