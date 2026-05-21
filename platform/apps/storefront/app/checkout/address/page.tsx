import { redirect } from "next/navigation"
import { getCurrentCart } from "@/lib/get-current-cart"
import { submitAddressAction } from "@/lib/cart"

interface FieldProps {
  name: string
  label: string
  required?: boolean
  type?: string
  defaultValue?: string
}

function Field({ name, label, required, type = "text", defaultValue = "" }: FieldProps) {
  return (
    <label className="flex flex-col gap-1 text-sm">
      <span className="font-medium">
        {label}
        {required ? " *" : ""}
      </span>
      <input
        type={type}
        name={name}
        required={required}
        defaultValue={defaultValue}
        className="rounded border border-black/15 px-3 py-2"
        style={{ borderRadius: "var(--radius)" }}
      />
    </label>
  )
}

export default async function AddressPage() {
  const cart = await getCurrentCart()
  if (!cart || (cart.items?.length ?? 0) === 0) {
    redirect("/cart")
  }
  const sa = cart!.shipping_address ?? null

  return (
    <main className="mx-auto w-full max-w-2xl px-6 py-12">
      <ol className="mb-6 flex gap-2 text-xs uppercase tracking-wide opacity-70">
        <li className="font-semibold">Address</li>
        <li>›</li>
        <li>Shipping</li>
        <li>›</li>
        <li>Review</li>
      </ol>
      <h1
        className="text-3xl font-semibold"
        style={{ fontFamily: "var(--font-display)" }}
      >
        Shipping address
      </h1>

      <form action={submitAddressAction} className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field name="email" label="Email" type="email" required defaultValue={cart!.email ?? ""} />
        <Field name="phone" label="Phone" type="tel" defaultValue={sa?.phone ?? ""} />
        <Field name="first_name" label="First name" required defaultValue={sa?.first_name ?? ""} />
        <Field name="last_name" label="Last name" required defaultValue={sa?.last_name ?? ""} />
        <div className="sm:col-span-2">
          <Field name="address_1" label="Address" required defaultValue={sa?.address_1 ?? ""} />
        </div>
        <Field name="city" label="City" required defaultValue={sa?.city ?? ""} />
        <Field name="province" label="State / Province" defaultValue={sa?.province ?? ""} />
        <Field name="postal_code" label="PIN code" required defaultValue={sa?.postal_code ?? ""} />
        <Field name="country_code" label="Country (2-letter)" required defaultValue={sa?.country_code ?? "in"} />

        <div className="sm:col-span-2 mt-4 flex justify-end">
          <button
            type="submit"
            style={{
              background: "var(--brand-primary)",
              color: "var(--brand-on-primary)",
              borderRadius: "var(--radius)",
            }}
            className="inline-flex items-center px-6 py-3 text-sm font-medium hover:opacity-90"
          >
            Continue to shipping →
          </button>
        </div>
      </form>
    </main>
  )
}
