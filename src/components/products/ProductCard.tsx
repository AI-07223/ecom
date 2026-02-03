"use client";

import Link from "next/link";
import Image from "next/image";
import { Heart, ShoppingCart, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useCart } from "@/providers/CartProvider";
import { useWishlist } from "@/providers/WishlistProvider";
import { useAuth } from "@/providers/AuthProvider";
import { Product } from "@/types/database.types";

interface ProductCardProps {
  product: Product;
}

export function ProductCard({ product }: ProductCardProps) {
  const { addToCart } = useCart();
  const { isInWishlist, toggleWishlist } = useWishlist();
  const { isWholeseller } = useAuth();

  const displayPrice =
    isWholeseller && product.wholeseller_price
      ? product.wholeseller_price
      : product.price;

  const showRetailPrice =
    isWholeseller &&
    product.wholeseller_price &&
    product.wholeseller_price < product.price;

  const discount = product.compare_at_price
    ? Math.round(
      ((product.compare_at_price - product.price) /
        product.compare_at_price) *
      100,
    )
    : 0;

  const formatPrice = (price: number) => {
    return `₹${price.toLocaleString("en-IN")}`;
  };

  const inWishlist = isInWishlist(product.id);
  const outOfStock = product.quantity === 0;

  return (
    <div className="group relative bg-white rounded-2xl overflow-hidden border border-[#E2E0DA] hover:border-[#2D5A27]/30 hover:shadow-soft-lg transition-all tap-scale">
      {/* Image Container */}
      <div className="relative aspect-square overflow-hidden bg-[#F0EFE8]">
        <Link href={`/products/${product.slug}`}>
          <Image
            src={product.thumbnail || product.images[0] || "/placeholder.svg"}
            alt={product.name}
            fill
            className="object-cover group-hover:scale-105 transition-transform duration-300"
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 20vw"
          />
        </Link>

        {/* Badges */}
        <div className="absolute top-2 left-2 flex flex-col gap-1">
          {/* Discount Badge */}
          {discount > 0 && (
            <Badge className="bg-[#2D5A27] text-white font-bold text-[10px] px-2 py-0.5 rounded-full">
              -{discount}%
            </Badge>
          )}

          {/* Featured Badge */}
          {product.is_featured && (
            <Badge className="bg-white/90 backdrop-blur-sm text-[#2D5A27] border border-[#2D5A27]/20 font-medium text-[10px] px-2 py-0.5 rounded-full flex items-center gap-1">
              <Sparkles className="h-2.5 w-2.5" />
              <span className="hidden sm:inline">Featured</span>
            </Badge>
          )}
        </div>

        {/* Wholeseller Badge */}
        {isWholeseller && product.wholeseller_price && (
          <Badge className="absolute top-2 right-2 bg-emerald-100 text-emerald-700 border border-emerald-200 text-[10px] px-2 py-0.5 rounded-full">
            Wholesale
          </Badge>
        )}

        {/* Wishlist Button */}
        <button
          className={`absolute top-2 right-2 w-8 h-8 rounded-full flex items-center justify-center transition-all tap-scale ${inWishlist
              ? "bg-red-500 text-white shadow-md"
              : "bg-white/90 backdrop-blur-sm text-[#6B7280] hover:text-red-500 border border-[#E2E0DA]"
            } ${isWholeseller && product.wholeseller_price ? "top-9" : ""}`}
          onClick={(e) => {
            e.preventDefault();
            toggleWishlist(product.id);
          }}
        >
          <Heart
            className={`h-4 w-4 ${inWishlist ? "fill-current" : ""}`}
          />
        </button>

        {/* Out of Stock Overlay */}
        {outOfStock && (
          <div className="absolute inset-0 bg-white/80 backdrop-blur-[2px] flex items-center justify-center">
            <Badge
              variant="secondary"
              className="bg-[#F0EFE8] text-[#6B7280] text-xs border border-[#E2E0DA]"
            >
              Out of Stock
            </Badge>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-3 sm:p-4">
        <Link href={`/products/${product.slug}`}>
          <h3 className="font-medium text-[#1A1A1A] text-sm sm:text-base mb-1 line-clamp-1 hover:text-[#2D5A27] transition-colors">
            {product.name}
          </h3>
        </Link>

        {product.short_description && (
          <p className="text-xs text-[#6B7280] mb-2 line-clamp-1 hidden sm:block">
            {product.short_description}
          </p>
        )}

        {/* Price Section */}
        <div className="flex items-center gap-2 flex-wrap mb-3">
          <span className="text-base sm:text-lg font-bold text-[#2D5A27]">
            {formatPrice(displayPrice)}
          </span>

          {(showRetailPrice || product.compare_at_price) && (
            <span className="text-xs text-[#9CA3AF] line-through">
              {formatPrice(
                showRetailPrice ? product.price : product.compare_at_price!,
              )}
            </span>
          )}
        </div>

        {/* Add to Cart Button */}
        <Button
          variant="outline"
          size="sm"
          className="w-full h-9 sm:h-10 text-xs sm:text-sm rounded-xl border-[#E2E0DA] bg-[#F0EFE8] text-[#2D5A27] hover:bg-[#2D5A27] hover:text-white hover:border-[#2D5A27] font-medium tap-scale"
          onClick={(e) => {
            e.preventDefault();
            addToCart(product.id);
          }}
          disabled={outOfStock}
        >
          <ShoppingCart className="h-4 w-4 mr-1.5" />
          {outOfStock ? "Out of Stock" : "Add to Cart"}
        </Button>

        {/* Savings for Wholesellers */}
        {isWholeseller && product.wholeseller_price && (
          <p className="text-[10px] sm:text-xs text-emerald-600 mt-2 font-medium text-center">
            You save {formatPrice(product.price - product.wholeseller_price)}
          </p>
        )}

        {/* Low Stock Warning */}
        {product.quantity <= 5 && product.quantity > 0 && (
          <p className="text-[10px] sm:text-xs text-amber-600 mt-2 font-medium text-center">
            Only {product.quantity} left in stock
          </p>
        )}
      </div>
    </div>
  );
}
