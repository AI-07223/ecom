/**
 * Session helpers.
 *
 * Hotbox uses a phone-OTP login → signed JWT cookie pattern. JWTs are
 * signed with HS256 using the `JWT_SECRET` env var. The cookie is
 * HttpOnly, Secure (in production), SameSite=Lax, and lives for 30 days.
 */
import { jwtVerify, SignJWT } from "jose"
import { cookies } from "next/headers"
import type { UserRole } from "@prisma/client"
import { db } from "./db"

const COOKIE_NAME = "hb_session"
const ONE_DAY_S = 60 * 60 * 24
const SESSION_TTL_S = 30 * ONE_DAY_S

export interface SessionPayload {
  /** User row id */
  uid: string
  /** Phone (E.164) */
  phone: string
  /** Role at sign-in time. Re-verified on every getCurrentUser() against DB. */
  role: UserRole
}

function getSecret(): Uint8Array {
  const secret = process.env.JWT_SECRET
  if (!secret || secret.length < 32) {
    throw new Error(
      "JWT_SECRET is missing or too short. Set it to a 64-byte hex string.",
    )
  }
  return new TextEncoder().encode(secret)
}

export async function createSession(payload: SessionPayload): Promise<string> {
  const token = await new SignJWT({
    uid: payload.uid,
    phone: payload.phone,
    role: payload.role,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_TTL_S}s`)
    .sign(getSecret())
  return token
}

export async function setSessionCookie(token: string): Promise<void> {
  const jar = await cookies()
  jar.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_TTL_S,
  })
}

export async function clearSessionCookie(): Promise<void> {
  const jar = await cookies()
  jar.delete(COOKIE_NAME)
}

export async function readSessionToken(): Promise<string | null> {
  const jar = await cookies()
  return jar.get(COOKIE_NAME)?.value ?? null
}

/**
 * Returns the live user from the DB if a valid session cookie exists.
 * Re-fetches the role on every call so a demoted user can't keep admin
 * access via a stale token.
 */
export async function getCurrentUser(): Promise<{
  id: string
  phone: string
  name: string | null
  role: UserRole
} | null> {
  const token = await readSessionToken()
  if (!token) return null

  try {
    const { payload } = await jwtVerify<SessionPayload>(token, getSecret())
    if (!payload.uid) return null

    const user = await db.user.findUnique({
      where: { id: payload.uid },
      select: { id: true, phone: true, name: true, role: true },
    })
    return user ?? null
  } catch {
    // Invalid or expired token
    return null
  }
}

/**
 * Throws if the caller isn't an admin. Use in admin server actions.
 */
export async function requireAdmin(): Promise<{
  id: string
  phone: string
  name: string | null
  role: UserRole
}> {
  const user = await getCurrentUser()
  if (!user || user.role !== "admin") {
    throw new Error("Not authorized")
  }
  return user
}

/**
 * Throws if the caller isn't a rider. Use in rider server actions.
 */
export async function requireRider(): Promise<{
  id: string
  phone: string
  name: string | null
  role: UserRole
}> {
  const user = await getCurrentUser()
  if (!user || user.role !== "rider") {
    throw new Error("Not authorized")
  }
  return user
}
