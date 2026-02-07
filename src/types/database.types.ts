// Database types for Royal React E-Commerce

import { Timestamp } from "firebase/firestore";

export type UserRole = "customer" | "wholeseller" | "admin";

export interface Profile {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  phone: string | null;
  address: Address | null;
  saved_addresses: SavedAddress[];
  gst_number: string | null;
  role: UserRole;
  created_at: string;
  updated_at: string;
}

export interface SavedAddress {
  id: string;
  label: string; // e.g., "Home", "Office", "Warehouse"
  full_name: string;
  phone: string;
  street: string;
  city: string;
  state: string;
  postal_code: string;
  country: string;
  is_default: boolean;
}

export interface Address {
  street: string;
  city: string;
  state: string;
  postal_code: string;
  country: string;
}

export interface ShippingAddress extends Address {
  full_name: string;
  phone: string;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  image_url: string | null;
  parent_id: string | null;
  is_active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface Product {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  short_description: string | null;
  price: number;
  wholeseller_price: number | null;
  compare_at_price: number | null;
  cost_price: number | null;
  sku: string | null;
  barcode: string | null;
  quantity: number;
  track_inventory: boolean;
  allow_backorder: boolean;
  category_id: string | null;
  category?: Category;
  images: string[];
  thumbnail: string | null;
  weight: number | null;
  dimensions: ProductDimensions | null;
  tags: string[];
  is_active: boolean;
  is_featured: boolean;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface ProductDimensions {
  length: number;
  width: number;
  height: number;
}

export interface CartItem {
  id: string;
  user_id: string;
  product_id: string;
  product?: Product;
  quantity: number;
  created_at: string;
  updated_at: string;
}

export interface WishlistItem {
  id: string;
  user_id: string;
  product_id: string;
  product?: Product;
  created_at: string;
  updated_at: string;
}

export type OrderStatus =
  | "pending"
  | "confirmed"
  | "processing"
  | "shipped"
  | "delivered"
  | "cancelled"
  | "refunded";

export type PaymentStatus = "pending" | "paid" | "failed" | "refunded";

export interface Order {
  id: string;
  order_number: string;
  user_id: string;
  user_email?: string;
  user_phone?: string;
  status: OrderStatus;
  payment_status: PaymentStatus;
  payment_method: "cod" | "online";
  subtotal: number;
  discount: number;
  shipping: number;
  tax_amount: number;
  total: number;
  currency: string;
  coupon_code: string | null;
  shipping_address: ShippingAddress;
  billing_address: ShippingAddress | null;
  gst_number: string | null;
  notes: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
  items: OrderItem[];
}

export interface OrderItem {
  product_id: string;
  product_name: string;
  product_image: string | null;
  quantity: number;
  price: number;
  total: number;
}

export type DiscountType = "percentage" | "fixed";

export interface Coupon {
  id: string;
  code: string;
  description: string | null;
  discount_type: DiscountType;
  discount_value: number;
  min_order_amount: number;
  max_discount_amount: number | null;
  usage_limit: number | null;
  used_count: number;
  is_active: boolean;
  starts_at: string | null;
  expires_at: string | null;
  created_at: string;
  updated_at: string;
}

// SiteSettings - single structured document
// Stored as key-value pairs in Firestore for flexibility
export interface SiteSettings {
  site_name: string;
  site_description: string;
  logo_url: string;
  favicon_url: string;
  primary_color: string;
  secondary_color: string;
  accent_color: string;
  footer_text: string;
  social_links: {
    facebook?: string;
    instagram?: string;
    twitter?: string;
  };
  contact_email: string;
  contact_phone: string;
  currency: string;
  currency_symbol: string;
  // Business details for invoices
  business_name: string;
  business_address: string;
  business_city: string;
  business_state: string;
  business_postal_code: string;
  business_country: string;
  business_gst_number: string;
  business_pan_number: string;
  business_phone: string;
  business_email: string;
}

// Item Request from Wholesellers
export type ItemRequestStatus =
  | "pending"
  | "approved"
  | "rejected"
  | "fulfilled";

export interface ItemRequest {
  id: string;
  user_id: string;
  user_email: string;
  user_name: string;
  item_name: string;
  item_description: string | null;
  requested_price: number | null;
  quantity_needed: number | null;
  images: string[];
  status: ItemRequestStatus;
  admin_notes: string | null;
  created_at: string;
  updated_at: string;
}

// Helper type for Firestore data conversion
export interface FirestoreTimestamp {
  seconds: number;
  nanoseconds: number;
  toDate(): Date;
}

// Utility type to convert Firestore Timestamps to strings
export type WithStringDates<T> = {
  [K in keyof T]: T[K] extends Timestamp
    ? string
    : T[K] extends Timestamp | null
      ? string | null
      : T[K];
};
