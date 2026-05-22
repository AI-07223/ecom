import { NextResponse } from "next/server"
import { z } from "zod"
import {
  OtpRateLimitedError,
  sendOtp,
} from "@/lib/otp"
import { InvalidPhoneError, normalizeIndianPhone } from "@/lib/phone"

export const dynamic = "force-dynamic"

const Body = z.object({
  phone: z.string().min(7).max(20),
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
    return NextResponse.json(
      { error: "phone is required" },
      { status: 400 },
    )
  }

  let phone: string
  try {
    phone = normalizeIndianPhone(parsed.data.phone)
  } catch (err) {
    if (err instanceof InvalidPhoneError) {
      return NextResponse.json(
        { error: "Enter a valid Indian phone number (10 digits)" },
        { status: 400 },
      )
    }
    throw err
  }

  try {
    await sendOtp(phone)
  } catch (err) {
    if (err instanceof OtpRateLimitedError) {
      return NextResponse.json(
        {
          error: err.message,
          retryInSeconds: err.retryInSeconds,
        },
        { status: 429 },
      )
    }
    console.error("[otp/send] failed:", err)
    return NextResponse.json(
      { error: "Couldn't send OTP. Try again in a moment." },
      { status: 500 },
    )
  }

  return NextResponse.json({ ok: true, phone })
}
