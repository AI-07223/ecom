import Link from "next/link"
import { notFound } from "next/navigation"
import { getCurrentUser } from "@/lib/session"
import { AdminNav } from "./AdminNav"

export const dynamic = "force-dynamic"

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const user = await getCurrentUser()
  // Per spec: non-admins get 404 (we don't leak that the route exists).
  if (!user || user.role !== "admin") notFound()

  return (
    <div className="min-h-screen bg-zinc-50">
      <header className="bg-white border-b border-zinc-200 sticky top-0 z-30">
        <div className="max-w-2xl mx-auto px-5 py-3 flex items-center justify-between">
          <Link href="/admin" className="font-black tracking-tight text-xl">
            Hotbox · Admin
          </Link>
          <span className="text-xs text-zinc-500">{user.phone}</span>
        </div>
        <AdminNav />
      </header>
      <main className="max-w-2xl mx-auto px-5 py-6 pb-20">{children}</main>
    </div>
  )
}
