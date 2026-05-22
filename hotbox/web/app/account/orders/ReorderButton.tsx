"use client"

import { useRouter } from "next/navigation"
import { useTransition } from "react"
import { reorderFromOrder } from "@/app/_actions/reorder"

export function ReorderButton({
  orderId,
}: {
  orderId: string
}): React.ReactElement {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  return (
    <button
      type="button"
      disabled={pending}
      onClick={() =>
        startTransition(async () => {
          const r = await reorderFromOrder(orderId)
          if (r.ok) router.push("/cart")
        })
      }
      className="underline underline-offset-4 text-zinc-700 hover:text-zinc-900 ml-auto"
    >
      {pending ? "Adding…" : "Re-order"}
    </button>
  )
}
