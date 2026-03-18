"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import {
  collection,
  getDocs,
  query,
  where,
  orderBy,
  limit,
  startAfter,
  DocumentSnapshot,
} from "firebase/firestore";
import { db } from "@/lib/firebase/config";
import { Product, Category } from "@/types/database.types";
import { useInfiniteScroll } from "./useInfiniteScroll";

export const PRODUCTS_PER_PAGE = 12;

export interface ProductFilters {
  selectedCategory: string;
  showFeatured: boolean;
  sortBy: string;
  debouncedSearch: string;
  minPrice: string;
  maxPrice: string;
  showOnSale: boolean;
}

interface FetchResult {
  docs: Product[];
  lastDoc: DocumentSnapshot | null;
  hasMore: boolean;
}

function buildQueryConstraints(
  filters: Pick<ProductFilters, "selectedCategory" | "showFeatured" | "sortBy">,
): Parameters<typeof query>[1][] {
  const constraints: Parameters<typeof query>[1][] = [where("is_active", "==", true)];
  if (filters.selectedCategory && filters.selectedCategory !== "all") {
    constraints.push(where("category_id", "==", filters.selectedCategory));
  }
  if (filters.showFeatured) {
    constraints.push(where("is_featured", "==", true));
  }
  switch (filters.sortBy) {
    case "price_asc": constraints.push(orderBy("price", "asc")); break;
    case "price_desc": constraints.push(orderBy("price", "desc")); break;
    case "name": constraints.push(orderBy("name", "asc")); break;
    case "newest": default: constraints.push(orderBy("created_at", "desc"));
  }
  return constraints;
}

function applyClientFilters(
  products: Product[],
  filters: Pick<ProductFilters, "debouncedSearch" | "minPrice" | "maxPrice" | "showOnSale">,
): Product[] {
  let result = products;
  if (filters.debouncedSearch) {
    const lower = filters.debouncedSearch.toLowerCase();
    result = result.filter(
      (p) => p.name.toLowerCase().includes(lower) || p.description?.toLowerCase().includes(lower),
    );
  }
  if (filters.minPrice) result = result.filter((p) => p.price >= parseFloat(filters.minPrice));
  if (filters.maxPrice) result = result.filter((p) => p.price <= parseFloat(filters.maxPrice));
  if (filters.showOnSale) result = result.filter((p) => p.compare_at_price !== null);
  return result;
}

function clientSort(products: Product[], sortBy: string): Product[] {
  return [...products].sort((a, b) => {
    switch (sortBy) {
      case "price_asc": return a.price - b.price;
      case "price_desc": return b.price - a.price;
      case "name": return a.name.localeCompare(b.name);
      case "newest": default:
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    }
  });
}

function isIndexError(error: unknown): boolean {
  const msg = error instanceof Error ? error.message : String(error);
  const code = (error as { code?: string })?.code;
  return msg.includes("index") || code === "failed-precondition";
}

async function fetchProductsWithFallback(
  filters: ProductFilters,
  cursor?: DocumentSnapshot,
): Promise<FetchResult> {
  const constraints = buildQueryConstraints(filters);
  const q = cursor
    ? query(collection(db, "products"), ...constraints, startAfter(cursor), limit(PRODUCTS_PER_PAGE))
    : query(collection(db, "products"), ...constraints, limit(PRODUCTS_PER_PAGE));

  try {
    const snap = await getDocs(q);
    const rawDocs = snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Product);
    const lastVisible = snap.docs.length > 0 ? snap.docs[snap.docs.length - 1] : null;
    return {
      docs: applyClientFilters(rawDocs, filters),
      lastDoc: lastVisible,
      hasMore: snap.docs.length === PRODUCTS_PER_PAGE,
    };
  } catch (err) {
    if (!isIndexError(err)) throw err;
    console.warn("Missing Firestore index, falling back to client-side sort.");
  }

  // Fallback 1: remove orderBy, keep filters
  const simpleConstraints: Parameters<typeof query>[1][] = [where("is_active", "==", true)];
  if (filters.selectedCategory && filters.selectedCategory !== "all") {
    simpleConstraints.push(where("category_id", "==", filters.selectedCategory));
  }
  if (filters.showFeatured) {
    simpleConstraints.push(where("is_featured", "==", true));
  }
  try {
    const snap = await getDocs(
      query(collection(db, "products"), ...simpleConstraints, limit(PRODUCTS_PER_PAGE * 3)),
    );
    const rawDocs = snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Product);
    const sorted = clientSort(rawDocs, filters.sortBy);
    const filtered = applyClientFilters(sorted, filters);
    return { docs: filtered.slice(0, PRODUCTS_PER_PAGE), lastDoc: null, hasMore: false };
  } catch (err2) {
    console.error("Fallback fetch failed:", err2);
  }

  // Fallback 2: no filters
  const snap = await getDocs(query(collection(db, "products"), limit(PRODUCTS_PER_PAGE * 5)));
  let rawDocs = snap.docs
    .map((d) => ({ id: d.id, ...d.data() }) as Product)
    .filter((p) => p.is_active !== false);
  if (filters.selectedCategory && filters.selectedCategory !== "all") {
    rawDocs = rawDocs.filter((p) => p.category_id === filters.selectedCategory);
  }
  if (filters.showFeatured) rawDocs = rawDocs.filter((p) => p.is_featured);
  const sorted = clientSort(rawDocs, filters.sortBy);
  const filtered = applyClientFilters(sorted, filters);
  return { docs: filtered.slice(0, PRODUCTS_PER_PAGE), lastDoc: null, hasMore: false };
}

export function useProductQuery(filters: ProductFilters) {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [lastDoc, setLastDoc] = useState<DocumentSnapshot | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const filtersRef = useRef(filters);
  filtersRef.current = filters;

  // Fetch categories once on mount
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const snap = await getDocs(
          query(collection(db, "categories"), where("is_active", "==", true), orderBy("name")),
        );
        setCategories(snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Category));
      } catch (err) {
        if (!isIndexError(err)) { setCategories([]); return; }
        try {
          const snap = await getDocs(
            query(collection(db, "categories"), where("is_active", "==", true), limit(100)),
          );
          const cats = snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Category);
          cats.sort((a, b) => a.name.localeCompare(b.name));
          setCategories(cats);
        } catch { setCategories([]); }
      }
    };
    fetchCategories();
  }, []);

  // Re-fetch when filters change
  useEffect(() => {
    let cancelled = false;
    const performFetch = async () => {
      setIsLoading(true);
      setProducts([]);
      setLastDoc(null);
      try {
        const result = await fetchProductsWithFallback(filtersRef.current);
        if (cancelled) return;
        setProducts(result.docs);
        setLastDoc(result.lastDoc);
        setHasMore(result.hasMore);
      } catch (err) {
        if (!cancelled) {
          console.error("Error fetching products:", err);
          setProducts([]);
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };
    performFetch();
    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    filters.selectedCategory,
    filters.showFeatured,
    filters.sortBy,
    filters.debouncedSearch,
    filters.minPrice,
    filters.maxPrice,
    filters.showOnSale,
  ]);

  const loadMore = useCallback(async () => {
    if (isLoadingMore || !hasMore || !lastDoc) return;
    setIsLoadingMore(true);
    try {
      const result = await fetchProductsWithFallback(filtersRef.current, lastDoc);
      setProducts((prev) => [...prev, ...result.docs]);
      setLastDoc(result.lastDoc);
      setHasMore(result.hasMore);
    } catch (err) {
      console.error("Error loading more products:", err);
    }
    setIsLoadingMore(false);
  }, [isLoadingMore, hasMore, lastDoc]);

  const lastProductRef = useInfiniteScroll(
    () => { if (hasMore && !isLoadingMore) loadMore(); },
    hasMore && !isLoading,
  );

  return { products, categories, isLoading, isLoadingMore, hasMore, lastProductRef };
}
