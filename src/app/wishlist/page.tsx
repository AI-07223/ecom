"use client";

import Link from "next/link";
import Image from "next/image";
import { Heart, ShoppingCart, Trash2, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useWishlist } from "@/providers/WishlistProvider";
import { useCart } from "@/providers/CartProvider";
import { useAuth } from "@/providers/AuthProvider";

export default function WishlistPage() {
  const { user } = useAuth();
  const { items, isLoading, removeFromWishlist } = useWishlist();
  const { addToCart } = useCart();

  const formatPrice = (price: number) => {
    return `₹${price.toLocaleString("en-IN")}`;
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-[#FAFAF5]">
        <div className="container mx-auto px-4 py-16 text-center">
          <div className="bg-white rounded-2xl border border-[#E2E0DA] p-12 max-w-md mx-auto shadow-soft">
            <div className="w-20 h-20 rounded-full bg-[#2D5A27]/10 flex items-center justify-center mx-auto mb-6">
              <Heart className="h-10 w-10 text-[#2D5A27]" />
            </div>
            <h1 className="text-2xl font-bold text-[#1A1A1A] mb-2">Please Sign In</h1>
            <p className="text-[#6B7280] mb-6">
              Sign in to view your wishlist
            </p>
            <Link href="/login?redirect=/wishlist">
              <Button className="bg-[#2D5A27] hover:bg-[#3B7D34] rounded-full px-8">
                Sign In
              </Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#FAFAF5]">
        <div className="container mx-auto px-4 py-8">
          <Skeleton className="h-10 w-48 mb-2 bg-[#E2E0DA]" />
          <Skeleton className="h-6 w-32 mb-8 bg-[#E2E0DA]" />
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-80 rounded-2xl bg-[#E2E0DA]" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="min-h-screen bg-[#FAFAF5]">
        <div className="container mx-auto px-4 py-16 text-center">
          <div className="bg-white rounded-2xl border border-[#E2E0DA] p-12 max-w-md mx-auto shadow-soft">
            <div className="w-20 h-20 rounded-full bg-[#2D5A27]/10 flex items-center justify-center mx-auto mb-6">
              <Heart className="h-10 w-10 text-[#2D5A27]" />
            </div>
            <h1 className="text-2xl font-bold text-[#1A1A1A] mb-2">Your Wishlist is Empty</h1>
            <p className="text-[#6B7280] mb-6">
              Save items you love by clicking the heart icon on any product.
            </p>
            <Link href="/products">
              <Button className="bg-[#2D5A27] hover:bg-[#3B7D34] rounded-full px-8">
                Explore Products
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FAFAF5]">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-[#1A1A1A] flex items-center gap-2">
            <span className="w-1 h-6 bg-gradient-to-b from-[#2D5A27] to-[#4CAF50] rounded-full" />
            My Wishlist
          </h1>
          <p className="text-[#6B7280]">
            {items.length} {items.length === 1 ? "item" : "items"} saved
          </p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {items.map((item) => (
            <Card key={item.id} className="group overflow-hidden border-[#E2E0DA] shadow-soft hover:shadow-soft-lg transition-all">
              <CardContent className="p-0">
                <Link href={`/products/${item.product.slug}`}>
                  <div className="relative aspect-square overflow-hidden bg-[#F0EFE8]">
                    <Image
                      src={
                        item.product.thumbnail ||
                        item.product.images[0] ||
                        "/placeholder.svg"
                      }
                      alt={item.product.name}
                      fill
                      className="object-cover transition-transform group-hover:scale-105"
                      sizes="(max-width: 768px) 50vw, (max-width: 1024px) 33vw, 25vw"
                    />
                  </div>
                </Link>

                <div className="p-4">
                  <Link href={`/products/${item.product.slug}`}>
                    <h3 className="font-medium text-[#1A1A1A] line-clamp-1 hover:text-[#2D5A27] transition-colors">
                      {item.product.name}
                    </h3>
                  </Link>

                  <div className="flex items-baseline gap-2 mt-1">
                    <span className="font-semibold text-[#2D5A27]">
                      {formatPrice(item.product.price)}
                    </span>
                    {item.product.compare_at_price && (
                      <span className="text-sm text-[#9CA3AF] line-through">
                        {formatPrice(item.product.compare_at_price)}
                      </span>
                    )}
                  </div>

                  <div className="flex gap-2 mt-3">
                    <Button
                      size="sm"
                      className="flex-1 bg-[#2D5A27] hover:bg-[#3B7D34] rounded-xl"
                      onClick={() => {
                        addToCart(item.product.id);
                        removeFromWishlist(item.product_id);
                      }}
                      disabled={item.product.quantity === 0}
                    >
                      <ShoppingCart className="h-4 w-4 mr-1" />
                      {item.product.quantity === 0
                        ? "Out of Stock"
                        : "Add to Cart"}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => removeFromWishlist(item.product_id)}
                      className="border-[#E2E0DA] text-red-500 hover:bg-red-50 hover:text-red-600"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
