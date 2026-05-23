/**
 * Email + password auth.
 *
 * Login accepts an "identifier" which is either an email (contains @) or
 * an Indian phone (normalized to E.164). Phone is the stable identity
 * key; email is just a login credential plus a contact channel for
 * password resets.
 *
 * Passwords: bcrypt cost 10.
 * Sessions: see lib/session.ts (HS256 JWT in HttpOnly cookie OR Bearer
 *           header for native clients).
 * Reset tokens: 32-byte hex, bcrypt-hashed at rest, 1-hour expiry,
 *               single-use.
 */
import bcrypt from "bcryptjs"
import { randomBytes } from "node:crypto"
import type { UserRole } from "@prisma/client"
import { db } from "./db"
import { InvalidPhoneError, normalizeIndianPhone } from "./phone"
import { createSession, setSessionCookie } from "./session"
import { sendPasswordResetEmail, sendWelcomeEmail } from "./resend"

const BCRYPT_COST = 10
const RESET_TOKEN_TTL_MS = 60 * 60 * 1000 // 1 hour
const MIN_PASSWORD_LEN = 8

// ─── Errors ────────────────────────────────────────────────────────────

export class AuthError extends Error {
  constructor(
    public readonly code:
      | "DUPLICATE_EMAIL"
      | "DUPLICATE_PHONE"
      | "INVALID_PHONE"
      | "INVALID_EMAIL"
      | "WEAK_PASSWORD"
      | "INVALID_CREDENTIALS"
      | "RESET_INVALID"
      | "RESET_EXPIRED"
      | "RESET_USED",
    message: string,
  ) {
    super(message)
    this.name = "AuthError"
  }
}

// ─── Helpers ───────────────────────────────────────────────────────────

function isEmail(v: string): boolean {
  return v.includes("@") && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim())
}

function validatePassword(p: string): void {
  if (typeof p !== "string" || p.length < MIN_PASSWORD_LEN) {
    throw new AuthError(
      "WEAK_PASSWORD",
      `Password must be at least ${MIN_PASSWORD_LEN} characters`,
    )
  }
}

// ─── Sign up ───────────────────────────────────────────────────────────

export interface SignUpInput {
  email: string
  phone: string
  name?: string | null
  password: string
}

export interface AuthResult {
  user: {
    id: string
    phone: string
    email: string | null
    name: string | null
    role: UserRole
  }
  token: string
}

export async function signUp(input: SignUpInput): Promise<AuthResult> {
  const email = input.email.trim().toLowerCase()
  if (!isEmail(email)) {
    throw new AuthError("INVALID_EMAIL", "Enter a valid email address")
  }

  let phone: string
  try {
    phone = normalizeIndianPhone(input.phone)
  } catch (err) {
    if (err instanceof InvalidPhoneError) {
      throw new AuthError("INVALID_PHONE", "Enter a valid Indian phone number")
    }
    throw err
  }

  validatePassword(input.password)

  // Check duplicates BEFORE hashing (cheap; bcrypt is slow)
  const existing = await db.user.findFirst({
    where: { OR: [{ email }, { phone }] },
    select: { email: true, phone: true },
  })
  if (existing?.email === email) {
    throw new AuthError(
      "DUPLICATE_EMAIL",
      "This email is already registered. Try signing in.",
    )
  }
  if (existing?.phone === phone) {
    throw new AuthError(
      "DUPLICATE_PHONE",
      "This phone is already registered. Try signing in.",
    )
  }

  const passwordHash = await bcrypt.hash(input.password, BCRYPT_COST)
  const isAdminPhone = process.env.ADMIN_PHONE && process.env.ADMIN_PHONE === phone
  const role: UserRole = isAdminPhone ? "admin" : "customer"

  const user = await db.user.create({
    data: {
      email,
      phone,
      passwordHash,
      name: input.name?.trim() || null,
      role,
    },
    select: { id: true, phone: true, email: true, name: true, role: true },
  })

  // Fire-and-forget welcome email (no-op if Resend unset)
  void sendWelcomeEmail({ to: email, name: user.name })

  const token = await createSession({
    uid: user.id,
    phone: user.phone,
    role: user.role,
  })
  await setSessionCookie(token)

  return { user, token }
}

// ─── Sign in ───────────────────────────────────────────────────────────

export interface SignInInput {
  identifier: string // email or phone
  password: string
}

export async function signIn(input: SignInInput): Promise<AuthResult> {
  const raw = input.identifier.trim()
  let where: { email: string } | { phone: string }

  if (isEmail(raw)) {
    where = { email: raw.toLowerCase() }
  } else {
    try {
      where = { phone: normalizeIndianPhone(raw) }
    } catch {
      // Neither valid email nor valid phone
      throw new AuthError(
        "INVALID_CREDENTIALS",
        "Email or password is wrong",
      )
    }
  }

  const user = await db.user.findUnique({
    where,
    select: {
      id: true,
      phone: true,
      email: true,
      passwordHash: true,
      name: true,
      role: true,
    },
  })
  if (!user || !user.passwordHash) {
    throw new AuthError("INVALID_CREDENTIALS", "Email or password is wrong")
  }

  const ok = await bcrypt.compare(input.password, user.passwordHash)
  if (!ok) {
    throw new AuthError("INVALID_CREDENTIALS", "Email or password is wrong")
  }

  // Self-heal: if this account's phone matches ADMIN_PHONE but the role
  // drifted (e.g. operator accidentally added admin as a rider), restore
  // admin on sign-in. This keeps the demo's superuser path recoverable
  // without requiring DB surgery.
  let effectiveRole: UserRole = user.role
  if (
    process.env.ADMIN_PHONE &&
    process.env.ADMIN_PHONE === user.phone &&
    user.role !== "admin"
  ) {
    await db.user.update({
      where: { id: user.id },
      data: { role: "admin" },
    })
    effectiveRole = "admin"
  }

  const token = await createSession({
    uid: user.id,
    phone: user.phone,
    role: effectiveRole,
  })
  await setSessionCookie(token)

  return {
    user: {
      id: user.id,
      phone: user.phone,
      email: user.email,
      name: user.name,
      role: effectiveRole,
    },
    token,
  }
}

// ─── Password reset ────────────────────────────────────────────────────

/**
 * Generates a reset token, stores its hash, sends the URL via Resend (or
 * logs to console). ALWAYS resolves successfully — the caller's UI must
 * show the same neutral "if that email exists, we sent a link" message
 * to avoid account enumeration.
 */
export async function requestPasswordReset(rawEmail: string): Promise<void> {
  const email = rawEmail.trim().toLowerCase()
  if (!isEmail(email)) return // Silently no-op

  const user = await db.user.findUnique({
    where: { email },
    select: { id: true, email: true },
  })
  if (!user || !user.email) return // Silently no-op (no user = no email sent)

  const rawToken = randomBytes(32).toString("hex")
  const tokenHash = await bcrypt.hash(rawToken, BCRYPT_COST)
  await db.passwordResetToken.create({
    data: {
      userId: user.id,
      tokenHash,
      expiresAt: new Date(Date.now() + RESET_TOKEN_TTL_MS),
    },
  })

  const baseUrl =
    process.env.PUBLIC_BASE_URL ?? "https://hotbox.networkbase75.site"
  const resetUrl = `${baseUrl}/reset/${rawToken}`

  await sendPasswordResetEmail({
    to: user.email,
    resetUrl,
    expiresInMinutes: 60,
  })
}

/**
 * Verifies a raw reset token (from the URL) against the stored bcrypt
 * hashes for any user. Returns the matching unconsumed unexpired token
 * row, or null.
 *
 * NOTE: This loops through all unexpired tokens because bcrypt is a
 * one-way hash — we can't query by raw token. For demo scale (≤ a few
 * hundred unexpired tokens) this is fine. At higher scale, switch to
 * a fast hash (HMAC-SHA256 of the raw token with JWT_SECRET) instead of
 * bcrypt for tokens.
 */
async function findActiveTokenByRaw(rawToken: string) {
  if (typeof rawToken !== "string" || rawToken.length !== 64) return null
  const candidates = await db.passwordResetToken.findMany({
    where: {
      consumedAt: null,
      expiresAt: { gt: new Date() },
    },
    orderBy: { createdAt: "desc" },
    take: 100,
    include: { user: { select: { id: true, email: true } } },
  })
  for (const row of candidates) {
    if (await bcrypt.compare(rawToken, row.tokenHash)) {
      return row
    }
  }
  return null
}

export async function inspectResetToken(rawToken: string): Promise<{
  ok: boolean
  reason?: "INVALID" | "EXPIRED" | "USED"
}> {
  if (typeof rawToken !== "string" || rawToken.length !== 64)
    return { ok: false, reason: "INVALID" }
  const active = await findActiveTokenByRaw(rawToken)
  if (active) return { ok: true }
  // Could not find an active one. Distinguishing "expired" from "used"
  // would require another DB lookup with relaxed filters; for v1, both
  // collapse to "INVALID" from the user's perspective (the form just
  // tells them to start over).
  return { ok: false, reason: "INVALID" }
}

export async function confirmPasswordReset(
  rawToken: string,
  newPassword: string,
): Promise<AuthResult> {
  validatePassword(newPassword)
  const token = await findActiveTokenByRaw(rawToken)
  if (!token) {
    throw new AuthError("RESET_INVALID", "This link is invalid or expired")
  }

  const passwordHash = await bcrypt.hash(newPassword, BCRYPT_COST)
  await db.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: token.userId },
      data: { passwordHash },
    })
    await tx.passwordResetToken.update({
      where: { id: token.id },
      data: { consumedAt: new Date() },
    })
  })

  const user = await db.user.findUniqueOrThrow({
    where: { id: token.userId },
    select: { id: true, phone: true, email: true, name: true, role: true },
  })
  const sessionToken = await createSession({
    uid: user.id,
    phone: user.phone,
    role: user.role,
  })
  await setSessionCookie(sessionToken)

  return { user, token: sessionToken }
}
