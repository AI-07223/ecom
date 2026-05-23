/**
 * Payment proof storage helpers.
 *
 * - Compresses uploaded screenshots via sharp (JPEG, q=80, max 1280×1280)
 *   to keep disk usage low and the admin view fast.
 * - 30-day TTL — files older than that are purged by the cron registered
 *   in instrumentation.ts.
 */
import { mkdir, readdir, stat, unlink, writeFile } from "node:fs/promises"
import path from "node:path"
import { db } from "./db"

// sharp loaded lazily because it's a native binding that Turbopack tries
// to analyze for Edge bundling at build time. Lazy-load keeps it out of
// the Edge runtime path.

const UPLOAD_DIR = path.join(process.cwd(), "uploads")

const TTL_DAYS = 30
const TTL_MS = TTL_DAYS * 24 * 60 * 60 * 1000

const MAX_INPUT_BYTES = 8 * 1024 * 1024 // accept up to 8 MB raw; compress aggressively
const MAX_EDGE_PX = 1280
const JPEG_QUALITY = 80

export const SCREENSHOT_TTL_DAYS = TTL_DAYS

export class ScreenshotError extends Error {
  constructor(message: string) {
    super(message)
    this.name = "ScreenshotError"
  }
}

/**
 * Accepts a raw upload and saves a compressed JPEG to `/app/uploads/<orderId>-payment.jpg`.
 * Returns the filename + final byte size. Caller persists the filename on the order row.
 */
export async function compressAndSaveScreenshot(opts: {
  orderId: string
  bytes: Buffer | ArrayBuffer
  declaredMime: string
}): Promise<{ filename: string; sizeBytes: number; expiresAt: Date }> {
  const buf = Buffer.isBuffer(opts.bytes)
    ? opts.bytes
    : Buffer.from(opts.bytes)

  if (buf.length === 0) {
    throw new ScreenshotError("Empty file")
  }
  if (buf.length > MAX_INPUT_BYTES) {
    throw new ScreenshotError(
      `Image too large (${(buf.length / 1024 / 1024).toFixed(1)} MB). Max ${MAX_INPUT_BYTES / 1024 / 1024} MB.`,
    )
  }
  if (!/^image\/(jpeg|png|webp|heic|heif)$/.test(opts.declaredMime)) {
    throw new ScreenshotError("Use a JPEG, PNG, WebP, or HEIC image")
  }

  let processed: Buffer
  try {
    const sharpMod = await import("sharp")
    const sharp = sharpMod.default
    processed = await sharp(buf, { failOn: "truncated" })
      .rotate()                         // auto-orient via EXIF
      .resize({
        width: MAX_EDGE_PX,
        height: MAX_EDGE_PX,
        fit: "inside",
        withoutEnlargement: true,
      })
      .jpeg({
        quality: JPEG_QUALITY,
        mozjpeg: true,                  // tighter than libjpeg-turbo
        chromaSubsampling: "4:2:0",
      })
      .toBuffer()
  } catch (err) {
    console.error("[screenshot] sharp processing failed:", err)
    throw new ScreenshotError("Couldn't process that image. Try a different file.")
  }

  await mkdir(UPLOAD_DIR, { recursive: true })
  const filename = `${opts.orderId}-payment.jpg`
  await writeFile(path.join(UPLOAD_DIR, filename), processed)

  return {
    filename,
    sizeBytes: processed.length,
    expiresAt: new Date(Date.now() + TTL_MS),
  }
}

/**
 * Delete payment-proof files whose `paymentProofExpiresAt` has passed.
 * Also clears the DB columns so the file URL doesn't 404 on the customer
 * side after deletion.
 *
 * Returns counts so the cron handler can log.
 */
export async function purgeExpiredPaymentProofs(): Promise<{
  rowsScanned: number
  filesDeleted: number
  errors: number
}> {
  const expired = await db.order.findMany({
    where: {
      paymentProofFilename: { not: null },
      paymentProofExpiresAt: { lt: new Date() },
    },
    select: { id: true, paymentProofFilename: true },
    take: 500, // safety cap per run
  })

  let deleted = 0
  let errors = 0
  for (const row of expired) {
    if (!row.paymentProofFilename) continue
    try {
      await unlink(path.join(UPLOAD_DIR, row.paymentProofFilename))
      deleted++
    } catch (err) {
      // File already gone is fine; other errors count as failed.
      const code = (err as NodeJS.ErrnoException).code
      if (code !== "ENOENT") {
        console.warn(`[purge] failed to delete ${row.paymentProofFilename}:`, err)
        errors++
        continue
      }
      deleted++
    }
    await db.order.update({
      where: { id: row.id },
      data: { paymentProofFilename: null, paymentProofExpiresAt: null },
    })
  }

  return { rowsScanned: expired.length, filesDeleted: deleted, errors }
}

/**
 * Optional belt-and-suspenders: scan the uploads dir and delete any file
 * older than TTL even if no DB row points at it. Catches abandoned files
 * from failed submissions.
 */
export async function purgeOrphanedFiles(): Promise<number> {
  let deleted = 0
  try {
    const files = await readdir(UPLOAD_DIR)
    const cutoff = Date.now() - TTL_MS
    for (const f of files) {
      // Don't touch admin's UPI QR or other restaurant-config files.
      if (!f.endsWith("-payment.jpg")) continue
      const full = path.join(UPLOAD_DIR, f)
      try {
        const s = await stat(full)
        if (s.mtimeMs < cutoff) {
          await unlink(full)
          deleted++
        }
      } catch {
        /* ignore individual file errors */
      }
    }
  } catch {
    /* uploads dir doesn't exist yet — fine */
  }
  return deleted
}
