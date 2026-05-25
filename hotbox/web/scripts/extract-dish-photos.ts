/**
 * Crops dish photographs from the Hot Box menu PDF into JPEGs that ship
 * under public/dishes/seed/<slug>.jpg. One-time tooling — developers run
 * it locally with the PDF in hand; outputs are committed to git so the
 * build is hermetic.
 *
 *   npx tsx scripts/extract-dish-photos.ts "<path-to-pdf>"
 *
 * Dependencies (already in the project):
 *   - pymupdf (Python) for PDF rasterization
 *   - sharp (Node) for crop + compress
 *
 * The crop map below is hand-curated against the PDF spread; each entry
 * maps a logical dish slug to a rectangle on a specific page (1-indexed).
 * Coordinates are normalized [0..1] so the script works regardless of the
 * page DPI it rasterizes at.
 */
import { spawnSync } from "node:child_process"
import { mkdirSync, existsSync, statSync } from "node:fs"
import path from "node:path"
import sharp from "sharp"

interface Crop {
  slug: string
  page: number
  x: number // left edge (0..1)
  y: number // top edge (0..1)
  w: number // width (0..1)
  h: number // height (0..1)
}

// Hand-curated against Hot Box Menu.pdf (7-page operator menu).
// Adjust these as the PDF revisions; running the script regenerates all.
const CROPS: Crop[] = [
  // Page 2 — Beverages, Sandwich, Maggi
  { slug: "cold-coffee", page: 2, x: 0.68, y: 0.05, w: 0.30, h: 0.30 },
  { slug: "raw-sandwich", page: 2, x: 0.45, y: 0.40, w: 0.20, h: 0.20 },
  { slug: "masala-maggi", page: 2, x: 0.68, y: 0.65, w: 0.30, h: 0.30 },
  // Page 3 — Wraps, Burger, Pizza
  { slug: "veg-burger", page: 3, x: 0.05, y: 0.30, w: 0.28, h: 0.25 },
  { slug: "margherita-pizza", page: 3, x: 0.05, y: 0.65, w: 0.30, h: 0.30 },
  // Page 4 — Momos, Snacks, Starters
  { slug: "steam-momos", page: 4, x: 0.05, y: 0.05, w: 0.30, h: 0.30 },
  { slug: "french-fries", page: 4, x: 0.05, y: 0.40, w: 0.30, h: 0.25 },
  { slug: "honey-chilli-potato", page: 4, x: 0.65, y: 0.40, w: 0.30, h: 0.30 },
  // Page 5 — Fry & Tadka, Curry, Noodles
  { slug: "dal-fry", page: 5, x: 0.05, y: 0.05, w: 0.30, h: 0.30 },
  { slug: "veg-chowmein", page: 5, x: 0.65, y: 0.05, w: 0.30, h: 0.25 },
  // Page 6 — Paneer
  { slug: "paneer-butter-masala", page: 6, x: 0.05, y: 0.30, w: 0.30, h: 0.30 },
  { slug: "shahi-paneer", page: 6, x: 0.65, y: 0.30, w: 0.30, h: 0.30 },
  // Page 7 — Rice, Breads, Ice Cream
  { slug: "jeera-rice", page: 7, x: 0.05, y: 0.05, w: 0.30, h: 0.25 },
  { slug: "veg-biryani", page: 7, x: 0.65, y: 0.05, w: 0.30, h: 0.30 },
  { slug: "lachha-paratha", page: 7, x: 0.05, y: 0.40, w: 0.30, h: 0.25 },
  { slug: "vanilla-ice-cream", page: 7, x: 0.65, y: 0.70, w: 0.30, h: 0.25 },
]

const OUT_DIR = path.resolve(__dirname, "..", "public", "dishes", "seed")
const TMP_DIR = path.resolve(__dirname, "..", ".scratch", "dish-pages")

async function rasterizePages(pdfPath: string, pageCount: number): Promise<void> {
  mkdirSync(TMP_DIR, { recursive: true })
  const py = `
import fitz
doc = fitz.open(r'${pdfPath}')
for i in range(min(${pageCount}, len(doc))):
    page = doc[i]
    pix = page.get_pixmap(matrix=fitz.Matrix(3, 3))  # ~300dpi
    pix.save(r'${TMP_DIR.replace(/\\/g, "/")}/page-' + str(i+1).zfill(2) + '.png')
    print('page', i+1, pix.width, 'x', pix.height)
doc.close()
print('done')
`
  const res = spawnSync("python", ["-c", py], { encoding: "utf8" })
  if (res.status !== 0) {
    console.error(res.stderr)
    throw new Error("PyMuPDF rasterize failed")
  }
  console.log(res.stdout)
}

async function cropAndCompress(crop: Crop): Promise<void> {
  const src = path.join(TMP_DIR, `page-${String(crop.page).padStart(2, "0")}.png`)
  if (!existsSync(src)) {
    console.warn(`! skip ${crop.slug}: page raster missing (${src})`)
    return
  }
  const meta = await sharp(src).metadata()
  const W = meta.width ?? 0
  const H = meta.height ?? 0
  const left = Math.round(W * crop.x)
  const top = Math.round(H * crop.y)
  const width = Math.round(W * crop.w)
  const height = Math.round(H * crop.h)
  const out = path.join(OUT_DIR, `${crop.slug}.jpg`)
  await sharp(src)
    .extract({ left, top, width, height })
    .resize({ width: 800, height: 800, fit: "inside", withoutEnlargement: true })
    .jpeg({ quality: 78, mozjpeg: true, chromaSubsampling: "4:2:0" })
    .toFile(out)
  const bytes = statSync(out).size
  console.log(`  ${crop.slug}: ${bytes.toLocaleString()} bytes`)
}

async function main(): Promise<void> {
  const pdf = process.argv[2]
  if (!pdf) {
    console.error("usage: tsx scripts/extract-dish-photos.ts <pdf-path>")
    process.exit(2)
  }
  if (!existsSync(pdf)) {
    console.error(`PDF not found: ${pdf}`)
    process.exit(2)
  }
  mkdirSync(OUT_DIR, { recursive: true })
  console.log("[1/2] rasterizing pages at 300dpi…")
  await rasterizePages(pdf, 7)
  console.log("[2/2] cropping and compressing dish photos…")
  for (const c of CROPS) {
    await cropAndCompress(c)
  }
  console.log(`\nDone. ${CROPS.length} crops → ${OUT_DIR}`)
  console.log("(.scratch/dish-pages can be safely deleted.)")
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
