/**
 * Thin wrapper around the Resend SDK.
 *
 * When RESEND_API_KEY is missing, every send method logs to the console
 * instead of throwing. This lets the demo run end-to-end without a Resend
 * account; the operator pulls reset links from container logs.
 */
import { Resend } from "resend"

const FROM_EMAIL =
  process.env.RESEND_FROM_EMAIL ?? "noreply@hotbox.networkbase75.site"
const APP_NAME = "Hotbox"

function client(): Resend | null {
  const key = process.env.RESEND_API_KEY
  if (!key) return null
  return new Resend(key)
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
      subject: "Reset your Hotbox password",
      html: `
        <div style="font-family:Inter,system-ui,sans-serif;max-width:560px;margin:0 auto;padding:24px;color:#1a1a1a">
          <h1 style="color:#cf3a1f;font-size:48px;letter-spacing:2px;font-weight:900;margin:0">HOTBOX</h1>
          <p style="font-size:16px;line-height:1.5;margin-top:32px">
            Tap the button below to set a new password. The link expires in
            ${minutes} minutes and can only be used once.
          </p>
          <a href="${input.resetUrl}"
             style="display:inline-block;background:#cf3a1f;color:white;padding:14px 28px;border-radius:12px;text-decoration:none;font-weight:700;margin-top:16px">
            Set new password
          </a>
          <p style="font-size:13px;color:#71717a;margin-top:32px">
            If you didn't request this, ignore this email.
          </p>
          <p style="font-size:11px;color:#a1a1aa;margin-top:24px">
            Or copy this URL: ${input.resetUrl}
          </p>
        </div>
      `,
    })
  } catch (err) {
    console.error("[resend] sendPasswordResetEmail failed:", err)
    // Always log the URL as a fallback so the user can still proceed.
    console.log(`[reset-fallback] (send failed) link for ${input.to}: ${input.resetUrl}`)
  }
}

export interface WelcomeEmailInput {
  to: string
  name: string | null
}

export async function sendWelcomeEmail(input: WelcomeEmailInput): Promise<void> {
  const c = client()
  if (!c) return // Welcome email is best-effort
  try {
    await c.emails.send({
      from: `${APP_NAME} <${FROM_EMAIL}>`,
      to: input.to,
      subject: "Welcome to Hotbox",
      html: `
        <div style="font-family:Inter,system-ui,sans-serif;max-width:560px;margin:0 auto;padding:24px;color:#1a1a1a">
          <h1 style="color:#cf3a1f;font-size:48px;letter-spacing:2px;font-weight:900;margin:0">HOTBOX</h1>
          <p style="font-size:16px;line-height:1.5;margin-top:32px">
            ${input.name ? `Hi ${input.name},` : "Hi,"} thanks for signing up.
          </p>
          <p style="font-size:14px;color:#52525b;line-height:1.5">
            Hot, vegetarian food, delivered to your door.
          </p>
        </div>
      `,
    })
  } catch (err) {
    console.warn("[resend] welcome email failed (non-fatal):", err)
  }
}
