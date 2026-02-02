"use client";

import Link from "next/link";
import Image from "next/image";
import { Heart, ShoppingCart, Trash2, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useWishlist } from "@/providers/WishlistProvider";
import { useCart } from "@/providers/CartProvider";
import { useSiteSettings } from "@/providers/SiteSettingsProvider";
import { useAuth } from "@/providers/AuthProvider";

export default function WishlistPage() {
  const { user } = useAuth();
  const { items, isLoading, removeFromWishlist } = useWishlist();
  const { addToCart } = useCart();
  const { settings } = useSiteSettings();

  const formatPrice = (price: number) => {
    return `${settings.currency_symbol}${price.toLocaleString("en-IN")}`;
  };

  if (!user) {
    return (
      <div className="container mx-auto px-4 py-16 text-center">
        <Heart className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
        <h1 className="text-2xl font-bold mb-2">Please Sign In</h1>
        <p className="text-muted-foreground mb-6">
          Sign in to view your wishlist
        </p>
        <Link href="/login?redirect=/wishlist">
          <Button style={{ backgroundColor: settings.primary_color }}>
            Sign In
          </Button>
        </Link>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Skeleton className="h-10 w-48 mb-8" />
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-80 rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="container mx-auto px-4 py-16 text-center">
        <Heart className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
        <h1 className="text-2xl font-bold mb-2">Your Wishlist is Empty</h1>
        <p className="text-muted-foreground mb-6">
          Save items you love by clicking the heart icon on any product.
        </p>
        <Link href="/products">
          <Button style={{ backgroundColor: settings.primary_color }}>
            Explore Products
            <ArrowRight className="h-4 w-4 ml-2" />
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold">My Wishlist</h1>
        <p className="text-muted-foreground">
          {items.length} {items.length === 1 ? "item" : "items"} saved
        </p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {items.map((item) => (
          <Card key={item.id} className="group overflow-hidden">
            <CardContent className="p-0">
              <Link href={`/products/${item.product.slug}`}>
                <div className="relative aspect-square overflow-hidden bg-muted">
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
                  <h3 className="font-medium line-clamp-1 hover:text-primary transition-colors">
                    {item.product.name}
                  </h3>
                </Link>

                <div className="flex items-baseline gap-2 mt-1">
                  <span
                    className="font-semibold"
                    style={{ color: settings.primary_color }}
                  >
                    {formatPrice(item.product.price)}
                  </span>
                  {item.product.compare_at_price && (
                    <span className="text-sm text-muted-foreground line-through">
                      {formatPrice(item.product.compare_at_price)}
                    </span>
                  )}
                </div>

                <div className="flex gap-2 mt-3">
                  <Button
                    size="sm"
                    className="flex-1"
                    style={{ backgroundColor: settings.primary_color }}
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
  );
}
