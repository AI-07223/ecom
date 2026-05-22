/**
 * Order data access helpers.
 */
import { db } from "./db"
import { getCurrentUser } from "./session"

export async function getOrderForCurrentUser(orderId: string) {
  const user = await getCurrentUser()
  if (!user) return null
  return db.order.findFirst({
    where: { id: orderId, userId: user.id },
    include: {
      items: { orderBy: { createdAt: "asc" } },
      events: { orderBy: { createdAt: "asc" } },
      address: true,
      rider: true,
    },
  })
}

export async function listOrdersForCurrentUser() {
  const user = await getCurrentUser()
  if (!user) return []
  return db.order.findMany({
    where: { userId: user.id },
    orderBy: { placedAt: "desc" },
    take: 50,
    include: {
      items: true,
    },
  })
}

/**
 * Mint a short, human-friendly order code (e.g. HB-A8F2K).
 * Collisions are vanishingly rare for demo scale; we still try a few times.
 */
export function mintPublicCode(): string {
  const ALPHA = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789" // no 0,1,I,O for legibility
  let s = ""
  for (let i = 0; i < 5; i++)
    s += ALPHA[Math.floor(Math.random() * ALPHA.length)]
  return `HB-${s}`
}
