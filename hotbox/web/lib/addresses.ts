/**
 * Address book server-side helpers. Caller is responsible for
 * authentication — these helpers throw if no user is signed in.
 */
import { db } from "./db"
import { getCurrentUser } from "./session"

const MAX_ADDRESSES = 5

export async function listAddressesForCurrentUser() {
  const user = await getCurrentUser()
  if (!user) throw new Error("Not signed in")
  return db.address.findMany({
    where: { userId: user.id, deletedAt: null },
    orderBy: [{ isDefault: "desc" }, { createdAt: "desc" }],
  })
}

export async function getDefaultAddressForCurrentUser() {
  const user = await getCurrentUser()
  if (!user) return null
  return db.address.findFirst({
    where: { userId: user.id, deletedAt: null },
    orderBy: [{ isDefault: "desc" }, { createdAt: "desc" }],
  })
}

export async function getAddressById(addressId: string) {
  const user = await getCurrentUser()
  if (!user) throw new Error("Not signed in")
  return db.address.findFirst({
    where: { id: addressId, userId: user.id, deletedAt: null },
  })
}

export { MAX_ADDRESSES }
