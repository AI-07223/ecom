"use client";

import { Suspense, useState, useCallback, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { SlidersHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { ProductGrid } from "@/components/products/ProductGrid";
import { ProductFilters } from "@/components/products/ProductFilters";
import { ProductSearch } from "@/components/products/ProductSearch";
import { useProductQuery } from "@/hooks/useProductQuery";

function ProductsContent() {
  const searchParams = useSearchParams();

  const [search, setSearch] = useState(searchParams.get("search") || "");
  const [debouncedSearch, setDebouncedSearch] = useState(search);
  const [selectedCategory, setSelectedCategory] = useState(searchParams.get("category") || "all");
  const [sortBy, setSortBy] = useState("newest");
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [showFeatured, setShowFeatured] = useState(searchParams.get("featured") === "true");
  const [showOnSale, setShowOnSale] = useState(searchParams.get("sale") === "true");

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(timer);
  }, [search]);

  const { products, categories, isLoading, isLoadingMore, hasMore, lastProductRef } =
    useProductQuery({
      selectedCategory,
      showFeatured,
      sortBy,
      debouncedSearch,
      minPrice,
      maxPrice,
      showOnSale,
    });

  const clearFilters = useCallback(() => {
    setSearch("");
    setDebouncedSearch("");
    setSelectedCategory("all");
    setSortBy("newest");
    setMinPrice("");
    setMaxPrice("");
    setShowFeatured(false);
    setShowOnSale(false);
  }, []);

  const hasActiveFilters = !!(
    search ||
    (selectedCategory && selectedCategory !== "all") ||
    minPrice ||
    maxPrice ||
    showFeatured ||
    showOnSale
  );

  const filterProps = {
    search,
    selectedCategory,
    minPrice,
    maxPrice,
    showFeatured,
    showOnSale,
    categories,
    hasActiveFilters,
    onSearchChange: setSearch,
    onCategoryChange: setSelectedCategory,
    onMinPriceChange: setMinPrice,
    onMaxPriceChange: setMaxPrice,
    onFeaturedChange: setShowFeatured,
    onSaleChange: setShowOnSale,
    onClearFilters: clearFilters,
  };

  return (
    <div className="min-h-screen bg-[#FAFAF5] pb-20 md:pb-8">
      <div className="container mx-auto px-4 py-6 md:py-8">
        <div className="flex flex-col lg:flex-row gap-6 lg:gap-8">
          {/* Desktop Filter Sidebar */}
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
              <ProductFilters {...filterProps} />
            </div>
          </aside>

          {/* Main Content */}
          <div className="flex-1">
            {/* Header row */}
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
                {/* Mobile filter sheet */}
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
                    <div className="mt-6">
                      <ProductFilters {...filterProps} />
                    </div>
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

            {/* Search with suggestions */}
            <ProductSearch
              value={search}
              onChange={setSearch}
              onSubmit={(term) => { setSearch(term); setDebouncedSearch(term); }}
              onClear={() => { setSearch(""); setDebouncedSearch(""); }}
              onFeaturedFilter={() => setShowFeatured(true)}
              onSaleFilter={() => setShowOnSale(true)}
            />

            <ProductGrid
              products={products}
              isLoading={isLoading}
              isLoadingMore={isLoadingMore}
              lastProductRef={lastProductRef}
              hasMore={hasMore}
            />
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
