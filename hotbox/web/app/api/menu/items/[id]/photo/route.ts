/**
 * Serves the operator-uploaded menu-item photo (compressed JPEG) from
 * /app/uploads/dishes/<photoFilename>. Public, cacheable.
 *
 * Returns 404 when no photo is set or the file is missing — DishPhoto
 * then falls through to the bundled PDF crop or the flame-tile.
 */
import { readFile } from "node:fs/promises"
import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { menuPhotoFilePath } from "@/lib/menu-photos"

export const dynamic = "force-dynamic"

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<Response> {
  const { id } = await params

  const item = await db.menuItem.findUnique({
    where: { id },
    select: { photoFilename: true },
  })
  if (!item || !item.photoFilename) {
    return new NextResponse("Not found", { status: 404 })
  }

  try {
    const buf = await readFile(menuPhotoFilePath(item.photoFilename))
    return new NextResponse(buf, {
      status: 200,
      headers: {
        "Content-Type": "image/jpeg",
        "Content-Length": buf.length.toString(),
        // Short browser cache + longer CDN cache; admin upload triggers
        // revalidatePath on / and /item/* so customers see new photos
        // within a few seconds after a refresh.
        "Cache-Control": "public, max-age=300, s-maxage=86400",
      },
    })
  } catch (err) {
    const code = (err as NodeJS.ErrnoException).code
    if (code === "ENOENT") {
      return new NextResponse("Not found", { status: 404 })
    }
    console.error("[menu-photo] read failed:", err)
    return new NextResponse("Read error", { status: 500 })
  }
}
