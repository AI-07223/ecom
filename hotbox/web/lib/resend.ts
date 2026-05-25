/**
 * Thin wrapper around the Resend SDK. Transactional emails use the
 * Hot Box brand: dark restaurant background, yellow Hot Box wordmark in
 * cyan ribbon, flame icon. Body type stays Inter for inbox legibility.
 *
 * When RESEND_API_KEY is missing, every send method logs to the console
 * instead of throwing. This lets the demo run end-to-end without a Resend
 * account; the operator pulls reset links from container logs.
 */
import { Resend } from "resend"

const FROM_EMAIL =
  process.env.RESEND_FROM_EMAIL ?? "noreply@hotbox.networkbase75.site"
const APP_NAME = "Hot Box"

function client(): Resend | null {
  const key = process.env.RESEND_API_KEY
  if (!key) return null
  return new Resend(key)
}

// ─── Brand-consistent email shell ─────────────────────────────────────
//
// Tokens picked to match the web shell (globals.css): #0a0a0a bg, #fcd34d
// yellow, #7fcfff cyan ribbon, #f97316 flame. Logo is rendered inline as
// SVG so it survives Gmail's image-stripping and dark-mode flips.

const BRAND_LOGO_SVG = `
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 480 220" width="240" height="110" role="img" aria-label="Hot Box Cloud Kitchen">
    <g fill="none" stroke="#7fcfff" stroke-width="6" stroke-linecap="round" stroke-linejoin="round">
      <path d="M28 110 L60 80 L60 100 L80 100" />
      <path d="M80 100 Q80 60 130 60 L350 60 Q400 60 400 100" />
      <path d="M400 100 L420 100 L420 80 L452 110" />
      <path d="M80 100 Q80 160 130 160 L350 160 Q400 160 400 100" />
    </g>
    <g transform="translate(218 78)">
      <path d="M22 0 C26 12 38 16 38 32 C38 47 28 56 22 56 C16 56 6 47 6 32 C6 24 12 18 14 12 C16 18 20 18 22 18 C22 10 22 6 22 0 Z" fill="#f97316"/>
      <path d="M22 14 C24 22 30 24 30 34 C30 42 26 48 22 48 C18 48 14 42 14 34 C14 28 18 24 20 20 C20 24 22 24 22 24 C22 20 22 18 22 14 Z" fill="#fcd34d"/>
    </g>
    <g fill="#fcd34d" font-family="Impact,'Arial Black',sans-serif" font-weight="700">
      <text x="100" y="135" font-size="68" letter-spacing="2">Hot</text>
      <text x="290" y="135" font-size="68" letter-spacing="2">Box</text>
    </g>
    <text x="240" y="195" fill="#ffffff" font-family="Inter,system-ui,sans-serif" font-size="18" font-weight="500" letter-spacing="4" text-anchor="middle">CLOUD KITCHEN</text>
  </svg>
`

function shell(innerHtml: string): string {
  return `
    <div style="background:#0a0a0a;padding:32px 0;color:#f5f5f4;font-family:Inter,system-ui,sans-serif">
      <div style="max-width:560px;margin:0 auto;padding:0 24px;text-align:center">
        ${BRAND_LOGO_SVG}
      </div>
      <div style="max-width:560px;margin:0 auto;padding:8px 24px 24px;color:#f5f5f4;font-family:Inter,system-ui,sans-serif">
        ${innerHtml}
      </div>
      <div style="max-width:560px;margin:0 auto;padding:0 24px;text-align:center;color:#a1a1aa;font-size:11px;letter-spacing:1px;margin-top:24px">
        HOT BOX · CLOUD KITCHEN · BANGALORE
      </div>
    </div>
  `
}

export interface PasswordResetEmailInput {
  to: string
  resetUrl: string
  expiresInMinutes?: number
}

export async function sendPasswordResetEmail(
  input: PasswordResetEmailInput,
): Promise<void> {
  const minutes = input.expiresInMinutes ?? 60
  const c = client()
  if (!c) {
    console.log(
      `[reset-fallback] (no RESEND_API_KEY) link for ${input.to}: ${input.resetUrl}`,
    )
    return
  }
  try {
    await c.emails.send({
      from: `${APP_NAME} <${FROM_EMAIL}>`,
      to: input.to,
      subject: "Reset your Hot Box password",
      html: shell(`
        <p style="font-size:16px;line-height:1.5;margin-top:32px;color:#f5f5f4">
          Tap the button below to set a new password. The link expires in
          ${minutes} minutes and can only be used once.
        </p>
        <p style="text-align:center;margin:24px 0">
          <a href="${input.resetUrl}"
             style="display:inline-block;background:#fcd34d;color:#0a0a0a;padding:14px 28px;border-radius:12px;text-decoration:none;font-weight:700">
            Set new password
          </a>
        </p>
        <p style="font-size:13px;color:#a1a1aa;margin-top:32px">
          If you didn't request this, ignore this email.
        </p>
        <p style="font-size:11px;color:#71717a;margin-top:24px;word-break:break-all">
          Or copy this URL: <span style="color:#d4d4d8">${input.resetUrl}</span>
        </p>
      `),
    })
  } catch (err) {
    console.error("[resend] sendPasswordResetEmail failed:", err)
    console.log(
      `[reset-fallback] (send failed) link for ${input.to}: ${input.resetUrl}`,
    )
  }
}

export interface WelcomeEmailInput {
  to: string
  name: string | null
}

export async function sendWelcomeEmail(
  input: WelcomeEmailInput,
): Promise<void> {
  const c = client()
  if (!c) return // Welcome email is best-effort
  try {
    await c.emails.send({
      from: `${APP_NAME} <${FROM_EMAIL}>`,
      to: input.to,
      subject: "Welcome to Hot Box",
      html: shell(`
        <p style="font-size:18px;line-height:1.5;margin-top:32px;color:#f5f5f4">
          ${input.name ? `Hi ${input.name},` : "Hi,"} thanks for signing up.
        </p>
        <p style="font-size:14px;color:#d4d4d8;line-height:1.5;margin-top:8px">
          Hot, 100% vegetarian food, delivered to your door in 30 minutes.
        </p>
        <p style="font-size:11px;color:#a1a1aa;letter-spacing:1px;margin-top:24px">
          BULK · PARTY · FARMHOUSE · CORPORATE — ALL WELCOME
        </p>
      `),
    })
  } catch (err) {
    console.warn("[resend] welcome email failed (non-fatal):", err)
  }
}
