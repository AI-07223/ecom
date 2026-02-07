import { z } from 'zod'

export const phoneRegex = /^[6-9]\d{9}$/
export const postalRegex = /^\d{6}$/
export const gstRegex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/

export const AddressSchema = z.object({
  full_name: z.string().min(2, 'Full name is required'),
  phone: z.string().regex(phoneRegex, 'Invalid phone number'),
  street: z.string().min(3, 'Address is required'),
  city: z.string().min(2, 'City is required'),
  state: z.string().min(2, 'State is required'),
  postal_code: z.string().regex(postalRegex, 'Invalid postal code'),
  country: z.string().min(2, 'Country is required'),
})

export const CheckoutSchema = z.object({
  shipping_address: AddressSchema,
  gst_number: z.string().optional().nullable().refine(val => !val || gstRegex.test(val), {
    message: 'Invalid GST number',
  }),
})

export type Address = z.infer<typeof AddressSchema>
export type CheckoutData = z.infer<typeof CheckoutSchema>
