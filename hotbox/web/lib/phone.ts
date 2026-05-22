/**
 * Phone-number normalization to E.164 for India.
 */
export class InvalidPhoneError extends Error {
  constructor(input: string) {
    super(`Not a valid Indian phone number: ${input}`)
    this.name = "InvalidPhoneError"
  }
}

/**
 * Normalizes various Indian phone-number inputs to E.164 (+91XXXXXXXXXX).
 *
 *   "9876543210"       → "+919876543210"
 *   "919876543210"     → "+919876543210"
 *   "+919876543210"    → "+919876543210"
 *   "+91 98765 43210"  → "+919876543210"
 *   "098765 43210"     → "+919876543210"
 */
export function normalizeIndianPhone(input: string): string {
  const trimmed = input.replace(/\D/g, "") // strip everything non-digit

  let digits = trimmed

  // Strip leading 0 if 11-digit "0xxxxxxxxxx"
  if (digits.length === 11 && digits.startsWith("0")) {
    digits = digits.slice(1)
  }

  // Strip leading 91 if 12-digit "91xxxxxxxxxx"
  if (digits.length === 12 && digits.startsWith("91")) {
    digits = digits.slice(2)
  }

  if (digits.length !== 10) {
    throw new InvalidPhoneError(input)
  }

  // Indian mobile numbers always start with 6, 7, 8, or 9
  if (!/^[6-9]/.test(digits)) {
    throw new InvalidPhoneError(input)
  }

  return `+91${digits}`
}

/**
 * Format an E.164 +91 number for display.
 *
 *   "+919876543210" → "+91 98765 43210"
 */
export function formatIndianPhone(e164: string): string {
  const match = e164.match(/^\+91(\d{5})(\d{5})$/)
  if (!match) return e164
  return `+91 ${match[1]} ${match[2]}`
}
