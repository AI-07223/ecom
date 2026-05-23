/**
 * Serves the admin-uploaded static UPI QR image. Public route (anyone
 * who lands on /orders/<id>/pay can see this QR — it's the customer's
 * means to pay).
 */
import { readFile } from "node:fs/promises"
import path from "node:path"
import { NextResponse } from "next/server"
import { db } from "@/lib/db"

export const dynamic = "force-dynamic"

const UPLOAD_DIR = path.join(process.cwd(), "uploads")

const MIME_BY_EXT: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
}

export async function GET(): Promise<NextResponse | Response> {
  const r = await db.restaurant.findFirst({
    where: { slug: "hotbox" },
    select: { upiQrFilename: true },
  })
  if (!r || !r.upiQrFilename) {
    return new NextResponse("Not found", { status: 404 })
  }
  try {
    const buf = await readFile(path.join(UPLOAD_DIR, r.upiQrFilename))
    const ext = r.upiQrFilename.split(".").pop()?.toLowerCase() ?? ""
    const mime = MIME_BY_EXT[ext] ?? "application/octet-stream"
    const arr = new Uint8Array(buf.buffer, buf.byteOffset, buf.byteLength)
    return new Response(arr as BodyInit, {
      headers: {
        "Content-Type": mime,
        "Cache-Control": "public, max-age=60",
      },
    })
  } catch {
    return new NextResponse("Not found", { status: 404 })
  }
}
