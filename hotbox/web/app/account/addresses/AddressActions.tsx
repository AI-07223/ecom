"use client"

import { useTransition } from "react"
import { removeAddress, setDefaultAddress } from "@/app/_actions/addresses"

export function AddressActions({
  id,
  isDefault,
}: {
  id: string
  isDefault: boolean
}): React.ReactElement {
  const [pending, startTransition] = useTransition()
  return (
    <div className="mt-3 flex items-center gap-4 text-xs">
      {!isDefault && (
        <button
          type="button"
          disabled={pending}
          onClick={() =>
            startTransition(async () => {
              await setDefaultAddress(id)
            })
          }
          className="underline underline-offset-4"
          style={{ color: "var(--color-brand-yellow-300)" }}
        >
          Set as default
        </button>
      )}
      <button
        type="button"
        disabled={pending}
        onClick={() => {
          if (!confirm("Remove this address?")) return
          startTransition(async () => {
            await removeAddress(id)
          })
        }}
        className="ml-auto underline underline-offset-4"
        style={{ color: "var(--color-brand-flame-400)" }}
      >
        Remove
      </button>
    </div>
  )
}
