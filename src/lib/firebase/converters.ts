import { Product } from "@/types/database.types";
import { timestampToString } from "./utils";

export function convertProductData(docId: string, data: Record<string, unknown>): Product {
  return {
    id: docId,
    name: data.name as string,
    slug: data.slug as string,
    description: (data.description as string | null) ?? null,
    short_description: (data.short_description as string | null) ?? null,
    price: data.price as number,
    wholeseller_price: (data.wholeseller_price as number | null) ?? null,
    compare_at_price: (data.compare_at_price as number | null) ?? null,
    cost_price: (data.cost_price as number | null) ?? null,
    sku: (data.sku as string | null) ?? null,
    barcode: (data.barcode as string | null) ?? null,
    quantity: data.quantity as number,
    track_inventory: data.track_inventory as boolean,
    allow_backorder: data.allow_backorder as boolean,
    category_id: (data.category_id as string | null) ?? null,
    images: (data.images as string[]) ?? [],
    thumbnail: (data.thumbnail as string | null) ?? null,
    weight: (data.weight as number | null) ?? null,
    dimensions: (data.dimensions as Product["dimensions"]) ?? null,
    tags: (data.tags as string[]) ?? [],
    is_active: data.is_active as boolean,
    is_featured: data.is_featured as boolean,
    metadata: (data.metadata as Record<string, unknown>) ?? {},
    created_at: timestampToString(data.created_at as Parameters<typeof timestampToString>[0]),
    updated_at: timestampToString(data.updated_at as Parameters<typeof timestampToString>[0]),
  };
}
