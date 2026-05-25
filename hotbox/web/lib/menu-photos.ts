/**
 * Menu-item photo storage. Operator-uploaded JPEGs land at
 * `/app/uploads/dishes/<itemId>.jpg`, served via the GET
 * /api/menu/items/[id]/photo route. Same sharp compression pipeline as
 * payment proofs (lib/payment-proof.ts), different output dir + filename.
 *
 * No TTL — these are restaurant content, persisted indefinitely until the
 * operator replaces or clears them.
 */
import { mkdir, unlink, writeFile } from "node:fs/promises"
import path from "node:path"

const DISH_DIR = path.join(process.cwd(), "uploads", "dishes")

const MAX_INPUT_BYTES = 5 * 1024 * 1024 // 5 MB upper bound
const MAX_EDGE_PX = 1280
const JPEG_QUALITY = 80

export class MenuPhotoError extends Error {
  constructor(message: string) {
    super(message)
    this.name = "MenuPhotoError"
  }
}

export async function compressAndSaveMenuPhoto(opts: {
  itemId: string
  bytes: Buffer | ArrayBuffer
  declaredMime: string
}): Promise<{ filename: string; sizeBytes: number }> {
  const buf = Buffer.isBuffer(opts.bytes)
    ? opts.bytes
    : Buffer.from(opts.bytes)

  if (buf.length === 0) {
    throw new MenuPhotoError("Empty file")
  }
  if (buf.length > MAX_INPUT_BYTES) {
    throw new MenuPhotoError(
      `Image too large (${(buf.length / 1024 / 1024).toFixed(1)} MB). Max ${MAX_INPUT_BYTES / 1024 / 1024} MB.`,
    )
  }
  if (!/^image\/(jpeg|png|webp|heic|heif)$/.test(opts.declaredMime)) {
    throw new MenuPhotoError("Use a JPEG, PNG, WebP, or HEIC image")
  }

  let processed: Buffer
  try {
    const sharpMod = await import("sharp")
    const sharp = sharpMod.default
    processed = await sharp(buf, { failOn: "truncated" })
      .rotate()
      .resize({
        width: MAX_EDGE_PX,
        height: MAX_EDGE_PX,
        fit: "inside",
        withoutEnlargement: true,
      })
      .jpeg({
        quality: JPEG_QUALITY,
        mozjpeg: true,
        chromaSubsampling: "4:2:0",
      })
      .toBuffer()
  } catch (err) {
    console.error("[menu-photo] sharp failed:", err)
    throw new MenuPhotoError(
      "Couldn't process that image. Try a different file.",
    )
  }

  await mkdir(DISH_DIR, { recursive: true })
  const filename = `${opts.itemId}.jpg`
  await writeFile(path.join(DISH_DIR, filename), processed)
  return { filename, sizeBytes: processed.length }
}

export async function deleteMenuPhoto(filename: string): Promise<void> {
  try {
    await unlink(path.join(DISH_DIR, filename))
  } catch (err) {
    const code = (err as NodeJS.ErrnoException).code
    if (code !== "ENOENT") throw err
  }
}

export function menuPhotoFilePath(filename: string): string {
  return path.join(DISH_DIR, filename)
}
