/**
 * Auth-gated file serving for payment proof screenshots.
 * - Order's customer can fetch their own.
 * - Admins can fetch any.
 * - Everyone else gets 404 (we don't leak that the order exists).
 */
import { readFile } from "node:fs/promises"
import path from "node:path"
import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { getCurrentUser } from "@/lib/session"

export const dynamic = "force-dynamic"

const UPLOAD_DIR = path.join(process.cwd(), "uploads")

interface RouteParams {
  params: Promise<{ id: string }>
}

const MIME_BY_EXT: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
}

export async function GET(
  _req: Request,
  { params }: RouteParams,
): Promise<NextResponse | Response> {
  const user = await getCurrentUser()
  if (!user) return new NextResponse("Not found", { status: 404 })

  const { id } = await params
  const order = await db.order.findUnique({
    where: { id },
    select: { userId: true, paymentProofFilename: true },
  })
  if (!order || !order.paymentProofFilename) {
    return new NextResponse("Not found", { status: 404 })
  }
  if (user.role !== "admin" && order.userId !== user.id) {
    return new NextResponse("Not found", { status: 404 })
  }

  try {
    const buf = await readFile(path.join(UPLOAD_DIR, order.paymentProofFilename))
    const ext = order.paymentProofFilename.split(".").pop()?.toLowerCase() ?? ""
    const mime = MIME_BY_EXT[ext] ?? "application/octet-stream"
    const arr = new Uint8Array(buf.buffer, buf.byteOffset, buf.byteLength)
    return new Response(arr as BodyInit, {
      headers: {
        "Content-Type": mime,
        "Cache-Control": "private, no-store",
      },
    })
  } catch {
    return new NextResponse("Not found", { status: 404 })
  }
}
