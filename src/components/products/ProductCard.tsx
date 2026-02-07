"use client";

import Link from "next/link";
import Image from "next/image";
import { Heart, ShoppingCart, Check, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useCart } from "@/providers/CartProvider";
import { useWishlist } from "@/providers/WishlistProvider";
import { useAuth } from "@/providers/AuthProvider";
import { Product } from "@/types/database.types";
import { useState } from "react";
import { cn } from "@/lib/utils";

interface ProductCardProps {
  product: Product;
}

export function ProductCard({ product }: ProductCardProps) {
  const { addToCart } = useCart();
  const { isInWishlist, toggleWishlist } = useWishlist();
  const { isWholeseller } = useAuth();
  const [isAdding, setIsAdding] = useState(false);
  const [isAdded, setIsAdded] = useState(false);

  const displayPrice = isWholeseller && product.wholeseller_price
    ? product.wholeseller_price
    : product.price;

  const showRetailPrice = isWholeseller &&
    product.wholeseller_price &&
    product.wholeseller_price < product.price;

  const discount = product.compare_at_price
    ? Math.round(
      ((product.compare_at_price - product.price) / product.compare_at_price) * 100
    )
    : 0;

  const formatPrice = (price: number) => {
    return `₹${price.toLocaleString("en-IN")}`;
  };

  const inWishlist = isInWishlist(product.id);
  const outOfStock = product.quantity === 0;

  const handleAddToCart = async (e: React.MouseEvent) => {
    e.preventDefault();
    if (outOfStock || isAdding) return;
    
    setIsAdding(true);
    await addToCart(product.id);
    setIsAdding(false);
    setIsAdded(true);
    
    // Reset to default state after animation
    setTimeout(() => setIsAdded(false), 1500);
  };

  return (
    <div className="group bg-white rounded-2xl overflow-hidden border border-[#E2E0DA] shadow-soft card-press">
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

        {/* Badges Container */}
        <div className="absolute top-2 left-2 right-10 flex flex-wrap gap-1">
          {/* Discount Badge */}
          {discount > 0 && (
            <Badge className="bg-[#2D5A27] text-white font-bold text-[10px] px-2 py-0.5 rounded-full shadow-sm">
              -{discount}%
            </Badge>
          )}

          {/* Wholesale Badge */}
          {isWholeseller && product.wholeseller_price && (
            <Badge className="bg-[#4CAF50] text-white text-[10px] px-2 py-0.5 rounded-full shadow-sm">
              Wholesale
            </Badge>
          )}
        </div>

        {/* Wishlist Button */}
        <button
          className={`absolute top-2 right-2 w-8 h-8 rounded-full flex items-center justify-center tap-active shadow-md ${inWishlist
            ? "bg-red-500 text-white"
            : "bg-white text-[#6B7280] hover:text-red-500"
            }`}
          onClick={(e) => {
            e.preventDefault();
            toggleWishlist(product.id);
          }}
        >
          <Heart className={`h-4 w-4 ${inWishlist ? "fill-current" : ""}`} />
        </button>

        {/* Out of Stock Overlay */}
        {outOfStock && (
          <div className="absolute inset-0 bg-white/80 backdrop-blur-[2px] flex items-center justify-center">
            <Badge className="bg-[#F0EFE8] text-[#6B7280] text-xs border border-[#E2E0DA] px-3 py-1">
              Out of Stock
            </Badge>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-4">
        {/* Category Tag */}
        {product.category?.name && (
          <p className="text-[10px] text-[#9CA3AF] uppercase tracking-wider mb-1">
            {product.category.name}
          </p>
        )}

        {/* Product Name */}
        <Link href={`/products/${product.slug}`}>
          <h3 className="font-medium text-[#1A1A1A] text-sm mb-1 line-clamp-2 min-h-[2.5rem] hover:text-[#2D5A27] transition-colors">
            {product.name}
          </h3>
        </Link>

        {/* Price */}
        <div className="flex items-center gap-2 mb-3">
          <span className="text-base font-bold text-[#2D5A27]">
            {formatPrice(displayPrice)}
          </span>
          {(showRetailPrice || product.compare_at_price) && (
            <span className="text-xs text-[#9CA3AF] line-through">
              {formatPrice(showRetailPrice ? product.price : product.compare_at_price!)}
            </span>
          )}
        </div>

        {/* Add to Cart Button with Animation */}
        <Button
          variant="outline"
          size="sm"
          className={cn(
            "w-full h-10 rounded-xl border-[#2D5A27] font-medium tap-active transition-all duration-300",
            isAdded 
              ? "bg-green-500 border-green-500 text-white hover:bg-green-600 hover:text-white" 
              : "text-[#2D5A27] hover:bg-[#2D5A27] hover:text-white"
          )}
          onClick={handleAddToCart}
          disabled={outOfStock || isAdding}
        >
          {isAdding ? (
            <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
          ) : isAdded ? (
            <Check className="h-4 w-4 mr-1.5" />
          ) : (
            <ShoppingCart className="h-4 w-4 mr-1.5" />
          )}
          {outOfStock ? "Out of Stock" : isAdded ? "Added!" : "Add"}
        </Button>

        {/* Wholesaler Savings */}
        {isWholeseller && product.wholeseller_price && (
          <p className="text-[10px] text-[#4CAF50] mt-2 font-medium text-center">
            Save {formatPrice(product.price - product.wholeseller_price)}
          </p>
        )}

        {/* Low Stock Warning */}
        {product.quantity <= 5 && product.quantity > 0 && (
          <p className="text-[10px] text-amber-600 mt-2 font-medium text-center">
            Only {product.quantity} left
          </p>
        )}
      </div>
    </div>
  );
}
