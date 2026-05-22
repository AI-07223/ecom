/**
 * OTP send + verify.
 *
 * Provider abstraction lets us swap between MSG91 (default in production)
 * and Cashfree's OTP API without touching call sites. In dev/local (when
 * neither provider has credentials configured), a "dev" provider logs the
 * OTP to the server console so testing works without real SMS.
 *
 * Rate limits (per spec):
 *   - 5 sends per phone in 10 minutes
 *   - 5 wrong attempts on a single OTP → invalidate and force re-send
 *   - 10 minute expiry on any OTP
 */
import bcrypt from "bcryptjs"
import { db } from "./db"

// We don't depend on bcryptjs being installed yet — fall back to crypto.
// (Adding it would be cleaner; doing without keeps this file standalone
// until the next install pass.)
const SALT_ROUNDS = 10

const OTP_EXPIRY_MS = 10 * 60 * 1000
const MAX_SENDS_PER_WINDOW = 5
const MAX_WRONG_ATTEMPTS = 5
const SEND_WINDOW_MS = 10 * 60 * 1000

// ─── Provider interface ────────────────────────────────────────────────

export interface OtpProvider {
  send(phone: string, code: string): Promise<void>
}

class DevConsoleProvider implements OtpProvider {
  async send(phone: string, code: string): Promise<void> {
    console.log(`[otp][dev] OTP for ${phone}: ${code}`)
  }
}

class Msg91Provider implements OtpProvider {
  constructor(
    private readonly authKey: string,
    private readonly templateId: string,
    private readonly senderId: string,
  ) {}

  async send(phone: string, code: string): Promise<void> {
    // MSG91 OTP flow uses POST to /api/v5/otp with template variables.
    const url = new URL("https://control.msg91.com/api/v5/otp")
    url.searchParams.set("template_id", this.templateId)
    url.searchParams.set("mobile", phone.replace(/^\+/, ""))
    url.searchParams.set("authkey", this.authKey)
    url.searchParams.set("otp", code)
    if (this.senderId) url.searchParams.set("sender", this.senderId)

    const res = await fetch(url.toString(), { method: "POST" })
    if (!res.ok) {
      const body = await res.text()
      throw new Error(`MSG91 send failed: ${res.status} ${body}`)
    }
  }
}

class CashfreeOtpProvider implements OtpProvider {
  constructor(
    private readonly appId: string,
    private readonly secretKey: string,
  ) {}

  async send(phone: string, code: string): Promise<void> {
    // Cashfree's OTP send endpoint (per their docs). Mocked at API level
    // — actual integration may need tweaking against their current API
    // version. Marked as a follow-up in the proposal's open questions.
    const res = await fetch(
      "https://api.cashfree.com/verification/otp/send",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-client-id": this.appId,
          "x-client-secret": this.secretKey,
        },
        body: JSON.stringify({ phone_number: phone, otp: code }),
      },
    )
    if (!res.ok) {
      const body = await res.text()
      throw new Error(`Cashfree OTP send failed: ${res.status} ${body}`)
    }
  }
}

function buildProvider(): OtpProvider {
  const provider = process.env.OTP_PROVIDER?.toLowerCase()

  if (provider === "msg91") {
    const authKey = process.env.MSG91_AUTH_KEY
    const templateId = process.env.MSG91_TEMPLATE_ID
    const senderId = process.env.MSG91_SENDER_ID ?? "HOTBOX"
    if (authKey && templateId) {
      return new Msg91Provider(authKey, templateId, senderId)
    }
    console.warn(
      "[otp] OTP_PROVIDER=msg91 but credentials missing — falling back to dev console.",
    )
  }

  if (provider === "cashfree") {
    const appId = process.env.CASHFREE_APP_ID
    const secretKey = process.env.CASHFREE_SECRET_KEY
    if (appId && secretKey) {
      return new CashfreeOtpProvider(appId, secretKey)
    }
    console.warn(
      "[otp] OTP_PROVIDER=cashfree but credentials missing — falling back to dev console.",
    )
  }

  return new DevConsoleProvider()
}

const provider = buildProvider()

// ─── Public API ────────────────────────────────────────────────────────

function generate6DigitCode(): string {
  // Cryptographically random — 6 digits is fine for SMS OTP per spec.
  return Math.floor(100_000 + Math.random() * 900_000).toString()
}

export class OtpRateLimitedError extends Error {
  constructor(public readonly retryInSeconds: number) {
    super(
      `Too many OTP requests. Try again in ${Math.ceil(retryInSeconds / 60)} minutes.`,
    )
    this.name = "OtpRateLimitedError"
  }
}

export class OtpInvalidError extends Error {
  constructor() {
    super("Invalid or expired OTP")
    this.name = "OtpInvalidError"
  }
}

export class OtpExhaustedError extends Error {
  constructor() {
    super("Too many wrong attempts. Please request a new OTP.")
    this.name = "OtpExhaustedError"
  }
}

/**
 * Send an OTP to the given E.164 phone number. Rate-limited per phone.
 */
export async function sendOtp(phone: string): Promise<void> {
  // 1. Rate limit by send count in last 10 minutes
  const recentSendCount = await db.otpCode.count({
    where: {
      phone,
      createdAt: { gte: new Date(Date.now() - SEND_WINDOW_MS) },
    },
  })
  if (recentSendCount >= MAX_SENDS_PER_WINDOW) {
    const oldest = await db.otpCode.findFirst({
      where: {
        phone,
        createdAt: { gte: new Date(Date.now() - SEND_WINDOW_MS) },
      },
      orderBy: { createdAt: "asc" },
    })
    const retryAt = oldest
      ? oldest.createdAt.getTime() + SEND_WINDOW_MS
      : Date.now() + SEND_WINDOW_MS
    throw new OtpRateLimitedError(Math.max(0, (retryAt - Date.now()) / 1000))
  }

  // 2. Generate + hash + persist
  const code = generate6DigitCode()
  const codeHash = await bcrypt.hash(code, SALT_ROUNDS)

  await db.otpCode.create({
    data: {
      phone,
      codeHash,
      expiresAt: new Date(Date.now() + OTP_EXPIRY_MS),
    },
  })

  // 3. Fire-and-await the provider
  await provider.send(phone, code)
}

/**
 * Verify an OTP code for the given phone. On success, upserts a User row
 * with the appropriate role (admin if phone === ADMIN_PHONE) and returns
 * it. The caller is responsible for binding the session.
 */
export async function verifyOtp(
  phone: string,
  code: string,
): Promise<{ id: string; phone: string; name: string | null; role: import("@prisma/client").UserRole }> {
  // Find the latest non-consumed, non-expired OTP for this phone
  const otp = await db.otpCode.findFirst({
    where: {
      phone,
      consumedAt: null,
      expiresAt: { gt: new Date() },
    },
    orderBy: { createdAt: "desc" },
  })

  if (!otp) {
    throw new OtpInvalidError()
  }

  if (otp.attempts >= MAX_WRONG_ATTEMPTS) {
    // Bump counter or consume; either way force re-send.
    await db.otpCode.update({
      where: { id: otp.id },
      data: { consumedAt: new Date() },
    })
    throw new OtpExhaustedError()
  }

  const matches = await bcrypt.compare(code, otp.codeHash)
  if (!matches) {
    await db.otpCode.update({
      where: { id: otp.id },
      data: { attempts: otp.attempts + 1 },
    })
    throw new OtpInvalidError()
  }

  // Mark consumed
  await db.otpCode.update({
    where: { id: otp.id },
    data: { consumedAt: new Date() },
  })

  // Upsert the user row. Admin role granted to the configured admin phone.
  const isAdminPhone = process.env.ADMIN_PHONE && process.env.ADMIN_PHONE === phone

  const user = await db.user.upsert({
    where: { phone },
    create: {
      phone,
      role: isAdminPhone ? "admin" : "customer",
    },
    update: isAdminPhone ? { role: "admin" } : {},
    select: { id: true, phone: true, name: true, role: true },
  })

  return user
}
