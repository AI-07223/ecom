import { Product } from "@/types/database.types";
import { ProductCard } from "./ProductCard";
import { Skeleton } from "@/components/ui/skeleton";
import { PackageX } from "lucide-react";

interface ProductGridProps {
  products: Product[];
  isLoading?: boolean;
}

export function ProductGrid({ products, isLoading }: ProductGridProps) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-2 gap-3 sm:gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="bg-white rounded-2xl overflow-hidden border border-[#E2E0DA]"
          >
            <Skeleton className="aspect-square bg-[#F0EFE8]" />
            <div className="p-3 sm:p-4 space-y-2">
              <Skeleton className="h-4 w-3/4 bg-[#F0EFE8]" />
              <Skeleton className="h-3 w-1/2 bg-[#F0EFE8]" />
              <Skeleton className="h-5 w-1/3 bg-[#F0EFE8]" />
              <Skeleton className="h-9 w-full bg-[#F0EFE8] rounded-xl" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (products.length === 0) {
    return (
      <div className="text-center py-12 px-4">
        <div className="w-20 h-20 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-[#2D5A27]/10 to-[#4CAF50]/10 flex items-center justify-center">
          <PackageX className="w-10 h-10 text-[#6B7280]" />
        </div>
        <h3 className="text-base font-semibold text-[#1A1A1A] mb-1">
          No products found
        </h3>
        <p className="text-[#6B7280] text-sm max-w-xs mx-auto">
          Try adjusting your filters or browse other categories
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-3 sm:gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
      {products.map((product) => (
        <ProductCard key={product.id} product={product} />
      ))}
    </div>
  );
}
