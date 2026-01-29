// Database types for Royal React E-Commerce

export type UserRole = "customer" | "wholeseller" | "admin";

export interface Profile {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  phone: string | null;
  address: Address | null;
  saved_addresses?: SavedAddress[];
  gst_number?: string | null;
  is_admin: boolean;
  is_wholeseller: boolean;
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
  is_default?: boolean;
}

export interface Address {
  street?: string;
  city?: string;
  state?: string;
  postal_code?: string;
  country?: string;
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
  length?: number;
  width?: number;
  height?: number;
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
  status: OrderStatus;
  payment_status: PaymentStatus;
  subtotal: number;
  discount_amount: number;
  shipping_amount: number;
  tax_amount: number;
  total: number;
  currency: string;
  coupon_id: string | null;
  shipping_address: Address;
  billing_address: Address | null;
  notes: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
  items?: OrderItem[];
}

export interface OrderItem {
  id: string;
  order_id: string;
  product_id: string;
  product_name: string;
  product_image: string | null;
  quantity: number;
  unit_price: number;
  total_price: number;
  created_at: string;
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

export interface SiteSetting {
  id: string;
  key: string;
  value: unknown;
  created_at: string;
  updated_at: string;
}

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
  created_at: string | { toDate: () => Date } | Date | undefined;
  updated_at: string | { toDate: () => Date } | Date | undefined;
}
