"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  Trash2,
  Minus,
  Plus,
  ArrowRight,
  ShoppingBag,
  Ticket,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { useCart } from "@/providers/CartProvider";
import { useSiteSettings } from "@/providers/SiteSettingsProvider";
import { useAuth } from "@/providers/AuthProvider";
import { collection, getDocs, query, where } from "firebase/firestore";
import { db } from "@/lib/firebase/config";
import { toast } from "sonner";

interface Coupon {
  code: string;
  discount_type: "percentage" | "fixed";
  discount_value: number;
  min_order_value?: number;
  is_active: boolean;
}

export default function CartPage() {
  const {
    items,
    itemCount,
    subtotal,
    isLoading,
    updateQuantity,
    removeFromCart,
    clearCart,
    appliedCoupon,
    discountAmount,
    applyCoupon: setAppliedCouponInContext,
    removeCoupon: removeCouponFromContext,
  } = useCart();
  const { settings } = useSiteSettings();
  const { user } = useAuth();

  // Coupon UI state (only for input handling)
  const [couponCode, setCouponCode] = useState("");
  const [couponLoading, setCouponLoading] = useState(false);
  const [couponError, setCouponError] = useState("");

  const formatPrice = (price: number) => {
    return `${settings.currency_symbol}${price.toLocaleString("en-IN")}`;
  };

  const handleApplyCoupon = async () => {
    if (!couponCode.trim()) {
      setCouponError("Please enter a coupon code");
      return;
    }

    setCouponLoading(true);
    setCouponError("");

    try {
      const couponsQuery = query(
        collection(db, "coupons"),
        where("code", "==", couponCode.trim().toUpperCase()),
      );
      const couponSnap = await getDocs(couponsQuery);

      if (couponSnap.empty) {
        setCouponError("Invalid coupon code");
        setCouponLoading(false);
        return;
      }

      const couponData = couponSnap.docs[0].data() as Coupon;

      if (!couponData.is_active) {
        setCouponError("This coupon is no longer active");
        setCouponLoading(false);
        return;
      }

      if (couponData.min_order_value && subtotal < couponData.min_order_value) {
        setCouponError(
          `Minimum order value is ${formatPrice(couponData.min_order_value)}`,
        );
        setCouponLoading(false);
        return;
      }

      // Store in cart context so it persists to checkout
      setAppliedCouponInContext(couponData);
      setCouponCode("");
      toast.success("Coupon applied successfully!");
    } catch (error) {
      console.error("Error applying coupon:", error);
      setCouponError("Failed to apply coupon");
    }
    setCouponLoading(false);
  };

  const handleRemoveCoupon = () => {
    removeCouponFromContext();
    setCouponError("");
    toast.success("Coupon removed");
  };

  if (!user) {
    return (
      <div className="container mx-auto px-4 py-16 text-center">
        <ShoppingBag className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
        <h1 className="text-2xl font-bold mb-2">Please Sign In</h1>
        <p className="text-muted-foreground mb-6">
          Sign in to view your cart and start shopping
        </p>
        <Link href="/login?redirect=/cart">
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
        <h1 className="text-2xl font-bold mb-8">Shopping Cart</h1>
        <div className="grid lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-4">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-32 w-full" />
            ))}
          </div>
          <Skeleton className="h-64" />
        </div>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="container mx-auto px-4 py-16 text-center">
        <ShoppingBag className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
        <h1 className="text-2xl font-bold mb-2">Your Cart is Empty</h1>
        <p className="text-muted-foreground mb-6">
          Looks like you haven&apos;t added anything to your cart yet.
        </p>
        <Link href="/products">
          <Button style={{ backgroundColor: settings.primary_color }}>
            Start Shopping
            <ArrowRight className="h-4 w-4 ml-2" />
          </Button>
        </Link>
      </div>
    );
  }

  const discount = discountAmount;
  const shipping = subtotal >= 999 ? 0 : 99;
  const total = subtotal - discount + shipping;

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-bold">
          Shopping Cart ({itemCount} items)
        </h1>
        <Button variant="ghost" size="sm" onClick={clearCart}>
          Clear Cart
        </Button>
      </div>

      <div className="grid lg:grid-cols-3 gap-8">
        {/* Cart Items */}
        <div className="lg:col-span-2 space-y-4">
          {items.map((item) => (
            <Card key={item.id}>
              <CardContent className="p-4">
                <div className="flex gap-4">
                  {/* Product Image */}
                  <Link
                    href={`/products/${item.product.slug}`}
                    className="shrink-0"
                  >
                    <div className="relative w-24 h-24 rounded-md overflow-hidden bg-muted">
                      <Image
                        src={
                          item.product.thumbnail ||
                          item.product.images[0] ||
                          "/placeholder.svg"
                        }
                        alt={item.product.name}
                        fill
                        className="object-cover"
                        sizes="96px"
                      />
                    </div>
                  </Link>

                  {/* Product Info */}
                  <div className="flex-1 min-w-0">
                    <Link href={`/products/${item.product.slug}`}>
                      <h3 className="font-medium hover:text-primary transition-colors line-clamp-1">
                        {item.product.name}
                      </h3>
                    </Link>
                    <p className="text-sm text-muted-foreground mb-2">
                      {formatPrice(item.product.price)} each
                    </p>

                    <div className="flex items-center justify-between">
                      {/* Quantity Controls */}
                      <div className="flex items-center border rounded-md">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() =>
                            updateQuantity(item.product_id, item.quantity - 1)
                          }
                        >
                          <Minus className="h-3 w-3" />
                        </Button>
                        <span className="w-8 text-center text-sm">
                          {item.quantity}
                        </span>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() =>
                            updateQuantity(item.product_id, item.quantity + 1)
                          }
                          disabled={item.quantity >= item.product.quantity}
                        >
                          <Plus className="h-3 w-3" />
                        </Button>
                      </div>

                      {/* Remove Button */}
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-red-500 hover:text-red-600 hover:bg-red-50"
                        onClick={() => removeFromCart(item.product_id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  {/* Item Total */}
                  <div className="text-right">
                    <p
                      className="font-semibold"
                      style={{ color: settings.primary_color }}
                    >
                      {formatPrice(item.product.price * item.quantity)}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Order Summary */}
        <div>
          <Card className="sticky top-24">
            <CardHeader>
              <CardTitle>Order Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Coupon Input */}
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <Ticket className="h-4 w-4" />
                  Have a coupon?
                </div>
                {appliedCoupon ? (
                  <div className="flex items-center justify-between p-2 bg-green-50 border border-green-200 rounded-md">
                    <div className="flex items-center gap-2">
                      <Ticket className="h-4 w-4 text-green-600" />
                      <span className="text-sm font-medium text-green-700">
                        {appliedCoupon.code}
                      </span>
                      <span className="text-xs text-green-600">
                        {appliedCoupon.discount_type === "percentage"
                          ? `${appliedCoupon.discount_value}% off`
                          : `${formatPrice(appliedCoupon.discount_value)} off`}
                      </span>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0 text-green-700 hover:text-red-500"
                      onClick={handleRemoveCoupon}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-1">
                    <div className="flex gap-2">
                      <Input
                        placeholder="Enter code"
                        value={couponCode}
                        onChange={(e) => {
                          setCouponCode(e.target.value.toUpperCase());
                          setCouponError("");
                        }}
                        className="flex-1 h-9 text-sm uppercase"
                      />
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleApplyCoupon}
                        disabled={couponLoading}
                        className="h-9"
                      >
                        {couponLoading ? "Applying..." : "Apply"}
                      </Button>
                    </div>
                    {couponError && (
                      <p className="text-xs text-red-500">{couponError}</p>
                    )}
                  </div>
                )}
              </div>

              <Separator />

              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Subtotal</span>
                <span>{formatPrice(subtotal)}</span>
              </div>
              {discount > 0 && (
                <div className="flex justify-between text-sm text-green-600">
                  <span>Discount</span>
                  <span>-{formatPrice(discount)}</span>
                </div>
              )}
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Shipping</span>
                <span>{shipping === 0 ? "Free" : formatPrice(shipping)}</span>
              </div>
              {shipping > 0 && (
                <p className="text-xs text-muted-foreground">
                  Free shipping on orders over {formatPrice(999)}
                </p>
              )}
              <Separator />
              <div className="flex justify-between font-semibold text-lg">
                <span>Total</span>
                <span style={{ color: settings.primary_color }}>
                  {formatPrice(total)}
                </span>
              </div>
            </CardContent>
            <CardFooter className="flex-col gap-3">
              <Link href="/checkout" className="w-full">
                <Button
                  className="w-full"
                  size="lg"
                  style={{ backgroundColor: settings.primary_color }}
                >
                  Proceed to Checkout
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </Link>
              <Link href="/products" className="w-full">
                <Button variant="outline" className="w-full">
                  Continue Shopping
                </Button>
              </Link>
            </CardFooter>
          </Card>
        </div>
      </div>
    </div>
  );
}
