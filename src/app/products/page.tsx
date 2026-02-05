"use client";

import { Suspense, useEffect, useState, useCallback, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { SlidersHorizontal, X, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { ProductGrid } from "@/components/products/ProductGrid";
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

const PRODUCTS_PER_PAGE = 12;

function ProductsContent() {
  const searchParams = useSearchParams();
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [lastDoc, setLastDoc] = useState<DocumentSnapshot | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const isInitialMount = useRef(true);

  // Filters
  const [search, setSearch] = useState(searchParams.get("search") || "");
  const [selectedCategory, setSelectedCategory] = useState<string>(
    searchParams.get("category") || "all",
  );
  const [sortBy, setSortBy] = useState("newest");
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [showFeatured, setShowFeatured] = useState(
    searchParams.get("featured") === "true",
  );
  const [showOnSale, setShowOnSale] = useState(
    searchParams.get("sale") === "true",
  );

  // Debounced search
  const [debouncedSearch, setDebouncedSearch] = useState(search);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        // Try query with orderBy first (requires composite index)
        const categoriesQuery = query(
          collection(db, "categories"),
          where("is_active", "==", true),
          orderBy("name"),
        );
        const categoriesSnap = await getDocs(categoriesQuery);
        const cats = categoriesSnap.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as Category[];
        setCategories(cats);
      } catch (error: unknown) {
        console.error("Error fetching categories:", error);

        // Fallback: fetch without orderBy and sort client-side
        const errorMessage =
          error instanceof Error ? error.message : String(error);
        const errorCode = (error as { code?: string })?.code;
        if (
          errorMessage.includes("index") ||
          errorCode === "failed-precondition"
        ) {
          console.warn(
            "Missing Firestore composite index. Falling back to client-side sorting for categories.",
          );
          try {
            const fallbackQuery = query(
              collection(db, "categories"),
              where("is_active", "==", true),
              limit(100),
            );
            const fallbackSnap = await getDocs(fallbackQuery);
            const fallbackCats = fallbackSnap.docs.map((doc) => ({
              id: doc.id,
              ...doc.data(),
            })) as Category[];

            // Sort by name client-side
            fallbackCats.sort((a, b) => a.name.localeCompare(b.name));
            setCategories(fallbackCats);
          } catch (fallbackError) {
            console.error("Category fallback fetch failed:", fallbackError);
            setCategories([]);
          }
        } else {
          setCategories([]);
        }
      }
    };
    fetchCategories();
  }, []);

  const buildQuery = useCallback(() => {
    const constraints: Parameters<typeof query>[1][] = [
      where("is_active", "==", true),
    ];

    // Category filter (server-side)
    if (selectedCategory && selectedCategory !== "all") {
      constraints.push(where("category_id", "==", selectedCategory));
    }

    // Featured filter (server-side)
    if (showFeatured) {
      constraints.push(where("is_featured", "==", true));
    }

    // Sorting (server-side where possible)
    switch (sortBy) {
      case "price_asc":
        constraints.push(orderBy("price", "asc"));
        break;
      case "price_desc":
        constraints.push(orderBy("price", "desc"));
        break;
      case "name":
        constraints.push(orderBy("name", "asc"));
        break;
      case "newest":
      default:
        constraints.push(orderBy("created_at", "desc"));
    }

    return constraints;
  }, [selectedCategory, showFeatured, sortBy]);

  const applyClientFilters = useCallback(
    (productList: Product[]) => {
      let filtered = productList;

      // Search filter (client-side for partial matching)
      if (debouncedSearch) {
        const searchLower = debouncedSearch.toLowerCase();
        filtered = filtered.filter(
          (p) =>
            p.name.toLowerCase().includes(searchLower) ||
            p.description?.toLowerCase().includes(searchLower),
        );
      }

      // Price filters (client-side)
      if (minPrice) {
        filtered = filtered.filter((p) => p.price >= parseFloat(minPrice));
      }
      if (maxPrice) {
        filtered = filtered.filter((p) => p.price <= parseFloat(maxPrice));
      }

      // On sale filter (client-side)
      if (showOnSale) {
        filtered = filtered.filter((p) => p.compare_at_price !== null);
      }

      return filtered;
    },
    [debouncedSearch, minPrice, maxPrice, showOnSale],
  );

  // Initial fetch on mount
  useEffect(() => {
    const performFetch = async () => {
      setIsLoading(true);
      setProducts([]);
      setLastDoc(null);

      let fallbackToClientSort = false;

      try {
        const constraints = buildQuery();
        const productsQuery = query(
          collection(db, "products"),
          ...constraints,
          limit(PRODUCTS_PER_PAGE),
        );

        const productsSnap = await getDocs(productsQuery);
        const newProducts = productsSnap.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as Product[];

        // Apply client-side filters
        const filteredProducts = applyClientFilters(newProducts);

        // Update last document for pagination
        if (productsSnap.docs.length > 0) {
          setLastDoc(productsSnap.docs[productsSnap.docs.length - 1]);
        }

        // Check if there are more products
        setHasMore(productsSnap.docs.length === PRODUCTS_PER_PAGE);
        setProducts(filteredProducts);
      } catch (error: unknown) {
        console.error("Error fetching products:", error);

        // Check if error is due to missing composite index
        const errorMessage =
          error instanceof Error ? error.message : String(error);
        const errorCode = (error as { code?: string })?.code;
        if (
          errorMessage.includes("index") ||
          errorCode === "failed-precondition"
        ) {
          console.warn(
            "Missing Firestore composite index. Falling back to client-side sorting.",
          );
          fallbackToClientSort = true;
        }

        // Fallback: fetch without orderBy and sort client-side
        if (fallbackToClientSort) {
          try {
            // Simple query with just is_active filter
            const simpleConstraints: Parameters<typeof query>[1][] = [
              where("is_active", "==", true),
            ];

            // Add category filter if present
            if (selectedCategory && selectedCategory !== "all") {
              simpleConstraints.push(
                where("category_id", "==", selectedCategory),
              );
            }

            // Add featured filter if present
            if (showFeatured) {
              simpleConstraints.push(where("is_featured", "==", true));
            }

            const fallbackQuery = query(
              collection(db, "products"),
              ...simpleConstraints,
              limit(PRODUCTS_PER_PAGE * 3), // Fetch more to account for client-side filtering
            );

            const fallbackSnap = await getDocs(fallbackQuery);
            const fallbackProducts = fallbackSnap.docs.map((doc) => ({
              id: doc.id,
              ...doc.data(),
            })) as Product[];

            // Apply client-side sorting
            fallbackProducts.sort((a, b) => {
              switch (sortBy) {
                case "price_asc":
                  return a.price - b.price;
                case "price_desc":
                  return b.price - a.price;
                case "name":
                  return a.name.localeCompare(b.name);
                case "newest":
                default:
                  return (
                    new Date(b.created_at).getTime() -
                    new Date(a.created_at).getTime()
                  );
              }
            });

            // Apply client-side filters (search, price range, on sale)
            const filteredProducts = applyClientFilters(fallbackProducts);

            setProducts(filteredProducts.slice(0, PRODUCTS_PER_PAGE));
            setHasMore(filteredProducts.length > PRODUCTS_PER_PAGE);
          } catch (fallbackError) {
            console.error("Fallback fetch also failed:", fallbackError);

            // Last resort: fetch all products and filter client-side
            try {
              console.warn(
                "Attempting last-resort fetch without any filters...",
              );
              const lastResortQuery = query(
                collection(db, "products"),
                limit(PRODUCTS_PER_PAGE * 5),
              );

              const lastResortSnap = await getDocs(lastResortQuery);
              let lastResortProducts = lastResortSnap.docs.map((doc) => ({
                id: doc.id,
                ...doc.data(),
              })) as Product[];

              // Filter active products client-side
              lastResortProducts = lastResortProducts.filter(
                (p) => p.is_active !== false,
              );

              // Apply category filter client-side
              if (selectedCategory && selectedCategory !== "all") {
                lastResortProducts = lastResortProducts.filter(
                  (p) => p.category_id === selectedCategory,
                );
              }

              // Apply featured filter client-side
              if (showFeatured) {
                lastResortProducts = lastResortProducts.filter(
                  (p) => p.is_featured,
                );
              }

              // Apply client-side sorting
              lastResortProducts.sort((a, b) => {
                switch (sortBy) {
                  case "price_asc":
                    return a.price - b.price;
                  case "price_desc":
                    return b.price - a.price;
                  case "name":
                    return a.name.localeCompare(b.name);
                  case "newest":
                  default:
                    return (
                      new Date(b.created_at).getTime() -
                      new Date(a.created_at).getTime()
                    );
                }
              });

              // Apply remaining client-side filters (search, price range, on sale)
              const filteredProducts = applyClientFilters(lastResortProducts);

              setProducts(filteredProducts.slice(0, PRODUCTS_PER_PAGE));
              setHasMore(filteredProducts.length > PRODUCTS_PER_PAGE);
            } catch (lastResortError) {
              console.error("Last resort fetch also failed:", lastResortError);
              setProducts([]);
            }
          }
        } else {
          setProducts([]);
        }
      }

      setIsLoading(false);
    };

    performFetch();
    isInitialMount.current = false;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Fetch products when filters change (skip initial mount)
  useEffect(() => {
    if (!isInitialMount.current) {
      const performFetch = async () => {
        setIsLoading(true);
        setProducts([]);
        setLastDoc(null);

        let fallbackToClientSort = false;

        try {
          const constraints = buildQuery();
          const productsQuery = query(
            collection(db, "products"),
            ...constraints,
            limit(PRODUCTS_PER_PAGE),
          );

          const productsSnap = await getDocs(productsQuery);
          const newProducts = productsSnap.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
          })) as Product[];

          // Apply client-side filters
          const filteredProducts = applyClientFilters(newProducts);

          // Update last document for pagination
          if (productsSnap.docs.length > 0) {
            setLastDoc(productsSnap.docs[productsSnap.docs.length - 1]);
          }

          // Check if there are more products
          setHasMore(productsSnap.docs.length === PRODUCTS_PER_PAGE);
          setProducts(filteredProducts);
        } catch (error: unknown) {
          console.error("Error fetching products:", error);

          // Check if error is due to missing composite index
          const errorMessage =
            error instanceof Error ? error.message : String(error);
          const errorCode = (error as { code?: string })?.code;
          if (
            errorMessage.includes("index") ||
            errorCode === "failed-precondition"
          ) {
            console.warn(
              "Missing Firestore composite index. Falling back to client-side sorting.",
            );
            fallbackToClientSort = true;
          }

          // Fallback: fetch without orderBy and sort client-side
          if (fallbackToClientSort) {
            try {
              // Simple query with just is_active filter
              const simpleConstraints: Parameters<typeof query>[1][] = [
                where("is_active", "==", true),
              ];

              // Add category filter if present
              if (selectedCategory && selectedCategory !== "all") {
                simpleConstraints.push(
                  where("category_id", "==", selectedCategory),
                );
              }

              // Add featured filter if present
              if (showFeatured) {
                simpleConstraints.push(where("is_featured", "==", true));
              }

              const fallbackQuery = query(
                collection(db, "products"),
                ...simpleConstraints,
                limit(PRODUCTS_PER_PAGE * 3), // Fetch more to account for client-side filtering
              );

              const fallbackSnap = await getDocs(fallbackQuery);
              const fallbackProducts = fallbackSnap.docs.map((doc) => ({
                id: doc.id,
                ...doc.data(),
              })) as Product[];

              // Apply client-side sorting
              fallbackProducts.sort((a, b) => {
                switch (sortBy) {
                  case "price_asc":
                    return a.price - b.price;
                  case "price_desc":
                    return b.price - a.price;
                  case "name":
                    return a.name.localeCompare(b.name);
                  case "newest":
                  default:
                    return (
                      new Date(b.created_at).getTime() -
                      new Date(a.created_at).getTime()
                    );
                }
              });

              // Apply client-side filters (search, price range, on sale)
              const filteredProducts = applyClientFilters(fallbackProducts);

              setProducts(filteredProducts.slice(0, PRODUCTS_PER_PAGE));
              setHasMore(filteredProducts.length > PRODUCTS_PER_PAGE);
            } catch (fallbackError) {
              console.error("Fallback fetch also failed:", fallbackError);

              // Last resort: fetch all products and filter client-side
              try {
                console.warn(
                  "Attempting last-resort fetch without any filters...",
                );
                const lastResortQuery = query(
                  collection(db, "products"),
                  limit(PRODUCTS_PER_PAGE * 5),
                );

                const lastResortSnap = await getDocs(lastResortQuery);
                let lastResortProducts = lastResortSnap.docs.map((doc) => ({
                  id: doc.id,
                  ...doc.data(),
                })) as Product[];

                // Filter active products client-side
                lastResortProducts = lastResortProducts.filter(
                  (p) => p.is_active !== false,
                );

                // Apply category filter client-side
                if (selectedCategory && selectedCategory !== "all") {
                  lastResortProducts = lastResortProducts.filter(
                    (p) => p.category_id === selectedCategory,
                  );
                }

                // Apply featured filter client-side
                if (showFeatured) {
                  lastResortProducts = lastResortProducts.filter(
                    (p) => p.is_featured,
                  );
                }

                // Apply client-side sorting
                lastResortProducts.sort((a, b) => {
                  switch (sortBy) {
                    case "price_asc":
                      return a.price - b.price;
                    case "price_desc":
                      return b.price - a.price;
                    case "name":
                      return a.name.localeCompare(b.name);
                    case "newest":
                    default:
                      return (
                        new Date(b.created_at).getTime() -
                        new Date(a.created_at).getTime()
                      );
                  }
                });

                // Apply remaining client-side filters (search, price range, on sale)
                const filteredProducts = applyClientFilters(lastResortProducts);

                setProducts(filteredProducts.slice(0, PRODUCTS_PER_PAGE));
                setHasMore(filteredProducts.length > PRODUCTS_PER_PAGE);
              } catch (lastResortError) {
                console.error(
                  "Last resort fetch also failed:",
                  lastResortError,
                );
                setProducts([]);
              }
            }
          } else {
            setProducts([]);
          }
        }

        setIsLoading(false);
      };

      performFetch();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    selectedCategory,
    showFeatured,
    sortBy,
    debouncedSearch,
    minPrice,
    maxPrice,
    showOnSale,
  ]);

  const handleLoadMore = async () => {
    if (isLoadingMore || !hasMore) return;

    setIsLoadingMore(true);

    try {
      const constraints = buildQuery();
      const productsQuery = query(
        collection(db, "products"),
        ...constraints,
        startAfter(lastDoc),
        limit(PRODUCTS_PER_PAGE),
      );

      const productsSnap = await getDocs(productsQuery);
      const newProducts = productsSnap.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Product[];

      // Apply client-side filters
      const filteredProducts = applyClientFilters(newProducts);

      // Update last document for pagination
      if (productsSnap.docs.length > 0) {
        setLastDoc(productsSnap.docs[productsSnap.docs.length - 1]);
      }

      // Check if there are more products
      setHasMore(productsSnap.docs.length === PRODUCTS_PER_PAGE);
      setProducts((prev) => [...prev, ...filteredProducts]);
    } catch (error: unknown) {
      console.error("Error loading more products:", error);
    }

    setIsLoadingMore(false);
  };

  const clearFilters = () => {
    setSearch("");
    setSelectedCategory("all");
    setSortBy("newest");
    setMinPrice("");
    setMaxPrice("");
    setShowFeatured(false);
    setShowOnSale(false);
  };

  const hasActiveFilters =
    search ||
    (selectedCategory && selectedCategory !== "all") ||
    minPrice ||
    maxPrice ||
    showFeatured ||
    showOnSale;

  const filterContent = (
    <div className="space-y-6">
      {/* Search */}
      <div>
        <Label htmlFor="search" className="text-[#1A1A1A]">Search</Label>
        <Input
          id="search"
          placeholder="Search products..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="mt-1 bg-[#F0EFE8] border-[#E2E0DA] focus:border-[#2D5A27] focus:ring-[#2D5A27]/20"
        />
      </div>

      {/* Categories */}
      <div>
        <Label className="text-[#1A1A1A]">Category</Label>
        <Select value={selectedCategory} onValueChange={setSelectedCategory}>
          <SelectTrigger className="mt-1 bg-[#F0EFE8] border-[#E2E0DA] focus:ring-[#2D5A27]/20">
            <SelectValue placeholder="All Categories" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {categories
              .filter((category) => category.id && category.name)
              .map((category) => (
                <SelectItem key={category.id} value={category.id}>
                  {category.name}
                </SelectItem>
              ))}
          </SelectContent>
        </Select>
      </div>

      {/* Price Range */}
      <div>
        <Label className="text-[#1A1A1A]">Price Range</Label>
        <div className="flex gap-2 mt-1">
          <Input
            type="number"
            placeholder="Min"
            value={minPrice}
            onChange={(e) => setMinPrice(e.target.value)}
            className="bg-[#F0EFE8] border-[#E2E0DA] focus:border-[#2D5A27] focus:ring-[#2D5A27]/20"
          />
          <Input
            type="number"
            placeholder="Max"
            value={maxPrice}
            onChange={(e) => setMaxPrice(e.target.value)}
            className="bg-[#F0EFE8] border-[#E2E0DA] focus:border-[#2D5A27] focus:ring-[#2D5A27]/20"
          />
        </div>
      </div>

      {/* Toggles */}
      <div className="space-y-3">
        <div className="flex items-center space-x-2">
          <Checkbox
            id="featured"
            checked={showFeatured}
            onCheckedChange={(checked) => setShowFeatured(checked === true)}
            className="border-[#2D5A27] data-[state=checked]:bg-[#2D5A27] data-[state=checked]:text-white"
          />
          <Label htmlFor="featured" className="cursor-pointer text-[#1A1A1A]">
            Featured Only
          </Label>
        </div>
        <div className="flex items-center space-x-2">
          <Checkbox
            id="sale"
            checked={showOnSale}
            onCheckedChange={(checked) => setShowOnSale(checked === true)}
            className="border-[#2D5A27] data-[state=checked]:bg-[#2D5A27] data-[state=checked]:text-white"
          />
          <Label htmlFor="sale" className="cursor-pointer text-[#1A1A1A]">
            On Sale
          </Label>
        </div>
      </div>

      {/* Clear Filters */}
      {hasActiveFilters && (
        <Button
          variant="outline"
          size="sm"
          onClick={clearFilters}
          className="w-full border-[#E2E0DA] text-[#6B7280] hover:bg-[#F0EFE8] hover:text-[#2D5A27]"
        >
          <X className="h-4 w-4 mr-2" />
          Clear All Filters
        </Button>
      )}
    </div>
  );

  return (
    <div className="min-h-screen bg-[#FAFAF5]">
      <div className="container mx-auto px-4 py-8">
        <div className="flex flex-col lg:flex-row gap-8">
          {/* Desktop Filters */}
          <aside className="hidden lg:block w-64 shrink-0">
            <div className="sticky top-24 space-y-6 bg-white p-6 rounded-2xl border border-[#E2E0DA] shadow-soft">
              <div className="flex items-center justify-between">
                <h2 className="font-semibold text-[#1A1A1A] flex items-center gap-2">
                  <span className="w-1 h-5 bg-gradient-to-b from-[#2D5A27] to-[#4CAF50] rounded-full" />
                  Filters
                </h2>
                {hasActiveFilters && (
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={clearFilters}
                    className="text-[#2D5A27] hover:text-[#3B7D34] hover:bg-[#2D5A27]/10"
                  >
                    Clear
                  </Button>
                )}
              </div>
              {filterContent}
            </div>
          </aside>

          {/* Main Content */}
          <div className="flex-1">
            {/* Mobile Header & Sort */}
            <div className="flex items-center justify-between mb-6">
              <div>
                <h1 className="text-2xl font-bold text-[#1A1A1A] flex items-center gap-2">
                  <span className="w-1 h-6 bg-gradient-to-b from-[#2D5A27] to-[#4CAF50] rounded-full" />
                  Products
                </h1>
                <p className="text-[#6B7280] text-sm mt-1">
                  {products.length} product{products.length !== 1 ? "s" : ""}
                  {hasMore && "+"}
                </p>
              </div>
              <div className="flex items-center gap-2">
                {/* Mobile Filter Button */}
                <Sheet>
                  <SheetTrigger asChild>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="lg:hidden border-[#E2E0DA] text-[#6B7280] hover:bg-[#F0EFE8] hover:text-[#2D5A27]"
                    >
                      <SlidersHorizontal className="h-4 w-4 mr-2" />
                      Filters
                      {hasActiveFilters && (
                        <span className="ml-1 bg-[#2D5A27] text-white w-5 h-5 rounded-full text-xs flex items-center justify-center">
                          !
                        </span>
                      )}
                    </Button>
                  </SheetTrigger>
                  <SheetContent side="left" className="bg-white border-r border-[#E2E0DA]">
                    <SheetHeader>
                      <SheetTitle className="text-[#1A1A1A] flex items-center gap-2">
                        <span className="w-1 h-5 bg-gradient-to-b from-[#2D5A27] to-[#4CAF50] rounded-full" />
                        Filters
                      </SheetTitle>
                    </SheetHeader>
                    <div className="mt-6">{filterContent}</div>
                  </SheetContent>
                </Sheet>

                {/* Sort */}
                <Select value={sortBy} onValueChange={setSortBy}>
                  <SelectTrigger className="w-[140px] bg-white border-[#E2E0DA] focus:ring-[#2D5A27]/20">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="newest">Newest</SelectItem>
                    <SelectItem value="price_asc">Price: Low</SelectItem>
                    <SelectItem value="price_desc">Price: High</SelectItem>
                    <SelectItem value="name">Name</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Products Grid */}
            {isLoading ? (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {Array.from({ length: 8 }).map((_, i) => (
                  <div key={i} className="space-y-3">
                    <Skeleton className="aspect-square rounded-2xl bg-[#E2E0DA]" />
                    <Skeleton className="h-4 w-3/4 bg-[#E2E0DA]" />
                    <Skeleton className="h-4 w-1/2 bg-[#E2E0DA]" />
                  </div>
                ))}
              </div>
            ) : products.length === 0 ? (
              <div className="text-center py-16 bg-white rounded-2xl border border-[#E2E0DA]">
                <p className="text-[#6B7280] mb-4">No products found</p>
                {hasActiveFilters && (
                  <Button 
                    variant="outline" 
                    onClick={clearFilters}
                    className="border-[#2D5A27] text-[#2D5A27] hover:bg-[#2D5A27] hover:text-white"
                  >
                    Clear Filters
                  </Button>
                )}
              </div>
            ) : (
              <>
                <ProductGrid products={products} />

                {/* Load More Button */}
                {hasMore && (
                  <div className="mt-8 text-center">
                    <Button
                      variant="outline"
                      size="lg"
                      onClick={handleLoadMore}
                      disabled={isLoadingMore}
                      className="border-[#2D5A27] text-[#2D5A27] hover:bg-[#2D5A27] hover:text-white rounded-full px-8"
                    >
                      {isLoadingMore ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Loading...
                        </>
                      ) : (
                        "Load More Products"
                      )}
                    </Button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ProductsPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#FAFAF5]">
          <div className="container mx-auto px-4 py-8">
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="space-y-3">
                  <Skeleton className="aspect-square rounded-2xl bg-[#E2E0DA]" />
                  <Skeleton className="h-4 w-3/4 bg-[#E2E0DA]" />
                  <Skeleton className="h-4 w-1/2 bg-[#E2E0DA]" />
                </div>
              ))}
            </div>
          </div>
        </div>
      }
    >
      <ProductsContent />
    </Suspense>
  );
}
