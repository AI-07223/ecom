"use client";

import { useState, useCallback } from "react";
import Link from "next/link";
import Image from "next/image";
import { Trash2, Minus, Plus, ArrowRight, ShoppingBag, Ticket, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useCart } from "@/providers/CartProvider";
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
  expires_at: { toDate: () => Date } | Date | null;
  max_uses: number | null;
  current_uses: number;
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
  const { user } = useAuth();

  const [couponCode, setCouponCode] = useState("");
  const [couponLoading, setCouponLoading] = useState(false);
  const [couponError, setCouponError] = useState("");
  const [editingQuantities, setEditingQuantities] = useState<Record<string, string>>({});

  const formatPrice = (price: number) => {
    return `₹${price.toLocaleString("en-IN")}`;
  };

  const handleApplyCoupon = async () => {
    if (!couponCode.trim()) {
      setCouponError("Enter a coupon code");
      return;
    }

    setCouponLoading(true);
    setCouponError("");

    try {
      const couponsQuery = query(
        collection(db, "coupons"),
        where("code", "==", couponCode.trim().toUpperCase())
      );
      const couponSnap = await getDocs(couponsQuery);

      if (couponSnap.empty) {
        setCouponError("Invalid coupon code");
        setCouponLoading(false);
        return;
      }

      const couponDoc = couponSnap.docs[0];
      const couponData = couponDoc.data() as Coupon;

      if (!couponData.is_active) {
        setCouponError("Coupon is not active");
        setCouponLoading(false);
        return;
      }

      if (couponData.expires_at) {
        const expiryDate = "toDate" in couponData.expires_at
          ? couponData.expires_at.toDate()
          : new Date(couponData.expires_at);
        if (expiryDate < new Date()) {
          setCouponError("Coupon has expired");
          setCouponLoading(false);
          return;
        }
      }

      if (couponData.max_uses !== null && couponData.max_uses > 0) {
        if (couponData.current_uses >= couponData.max_uses) {
          setCouponError("Coupon limit reached");
          setCouponLoading(false);
          return;
        }
      }

      if (couponData.min_order_value && subtotal < couponData.min_order_value) {
        setCouponError(`Min order: ${formatPrice(couponData.min_order_value)}`);
        setCouponLoading(false);
        return;
      }

      setAppliedCouponInContext({
        code: couponDoc.id,
        discount_type: couponData.discount_type,
        discount_value: couponData.discount_value,
      });
      setCouponCode("");
      toast.success(`Coupon ${couponDoc.id} applied!`);
    } catch {
      setCouponError("Failed to apply coupon");
    }
    setCouponLoading(false);
  };

  const handleRemoveCoupon = () => {
    removeCouponFromContext();
    setCouponError("");
    toast.success("Coupon removed");
  };

  // Handle manual quantity input
  const handleQuantityInputChange = useCallback((productId: string, value: string) => {
    // Only allow numeric input
    if (value === "" || /^\d+$/.test(value)) {
      setEditingQuantities(prev => ({ ...prev, [productId]: value }));
    }
  }, []);

  const handleQuantityInputBlur = useCallback((productId: string, maxStock: number) => {
    const value = editingQuantities[productId];
    if (value === undefined || value === "") return;
    
    let quantity = parseInt(value, 10);
    
    // Validate bounds
    if (isNaN(quantity) || quantity < 1) {
      quantity = 1;
    } else if (quantity > maxStock) {
      quantity = maxStock;
      toast.error(`Maximum available quantity is ${maxStock}`);
    }
    
    updateQuantity(productId, quantity);
    setEditingQuantities(prev => ({ ...prev, [productId]: "" }));
  }, [editingQuantities, updateQuantity]);

  const handleQuantityInputKeyDown = useCallback((e: React.KeyboardEvent, productId: string, maxStock: number) => {
    if (e.key === "Enter") {
      handleQuantityInputBlur(productId, maxStock);
    }
  }, [handleQuantityInputBlur]);

  if (!user) {
    return (
      <div className="min-h-screen bg-[#FAFAF5] flex items-center justify-center p-4">
        <Card className="w-full max-w-sm border-[#E2E0DA] shadow-soft">
          <CardContent className="p-8 text-center">
            <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-[#2D5A27]/10 flex items-center justify-center">
              <ShoppingBag className="h-8 w-8 text-[#2D5A27]" />
            </div>
            <h1 className="text-xl font-bold text-[#1A1A1A] mb-2">Sign In Required</h1>
            <p className="text-[#6B7280] text-sm mb-6">Sign in to view your cart and continue shopping</p>
            <Link href="/login?redirect=/cart">
              <Button className="w-full h-12 rounded-xl bg-[#2D5A27] hover:bg-[#3B7D34] font-semibold tap-active">
                Sign In
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#FAFAF5]">
        {/* Header */}
        <div className="bg-white border-b border-[#E2E0DA] sticky top-0 z-10">
          <div className="container mx-auto px-4 py-3">
            <div className="flex items-center justify-between">
              <Skeleton className="h-6 w-40" />
              <Skeleton className="h-6 w-16" />
            </div>
          </div>
        </div>
        <div className="container mx-auto px-4 py-4">
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-28 rounded-2xl" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="min-h-screen bg-[#FAFAF5] flex items-center justify-center p-4">
        <Card className="w-full max-w-sm border-[#E2E0DA] shadow-soft">
          <CardContent className="p-8 text-center">
            <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-[#2D5A27]/10 flex items-center justify-center">
              <ShoppingBag className="h-8 w-8 text-[#2D5A27]" />
            </div>
            <h1 className="text-xl font-bold text-[#1A1A1A] mb-2">Your Cart is Empty</h1>
            <p className="text-[#6B7280] text-sm mb-6">Add items to your cart and they will appear here</p>
            <Link href="/products">
              <Button className="w-full h-12 rounded-xl bg-[#2D5A27] hover:bg-[#3B7D34] font-semibold tap-active">
                Browse Products
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  const discount = discountAmount;
  const shipping = subtotal >= 999 ? 0 : 99;
  const total = subtotal - discount + shipping;

  return (
    <div className="min-h-screen bg-[#FAFAF5] pb-[calc(1rem+env(safe-area-inset-bottom)+64px)]">
      {/* Header */}
      <div className="bg-white border-b border-[#E2E0DA] sticky top-0 z-10">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <h1 className="text-lg font-bold text-[#1A1A1A]">Shopping Cart ({itemCount})</h1>
            <button
              onClick={clearCart}
              className="text-sm text-red-500 font-medium tap-active"
            >
              Clear
            </button>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-4">
        {/* Cart Items */}
        <div className="space-y-3 mb-6">
          {items.map((item) => (
            <Card key={item.id} className="border-[#E2E0DA] shadow-soft overflow-hidden rounded-2xl">
              <CardContent className="p-3">
                <div className="flex gap-3">
                  {/* Product Image */}
                  <Link href={`/products/${item.product.slug}`} className="shrink-0">
                    <div className="relative w-20 h-20 rounded-xl overflow-hidden bg-[#F0EFE8]">
                      <Image
                        src={item.product.thumbnail || item.product.images[0] || "/placeholder.svg"}
                        alt={item.product.name}
                        fill
                        className="object-cover"
                        sizes="80px"
                      />
                    </div>
                  </Link>

                  {/* Product Info */}
                  <div className="flex-1 min-w-0">
                    <Link href={`/products/${item.product.slug}`}>
                      <h3 className="font-medium text-[#1A1A1A] text-sm line-clamp-2 hover:text-[#2D5A27]">
                        {item.product.name}
                      </h3>
                    </Link>
                    <p className="text-xs text-[#6B7280] mt-0.5">{formatPrice(item.product.price)} each</p>

                    <div className="flex items-center justify-between mt-2">
                      {/* Quantity Controls with Manual Input for Bulk Orders */}
                      <div className="flex items-center bg-[#F0EFE8] rounded-lg">
                        <button
                          className="w-8 h-8 flex items-center justify-center tap-active hover:bg-[#E2E0DA] rounded-l-lg transition-colors"
                          onClick={() => updateQuantity(item.product_id, item.quantity - 1)}
                        >
                          <Minus className="h-3.5 w-3.5 text-[#6B7280]" />
                        </button>
                        
                        {/* Manual Quantity Input for Bulk Orders */}
                        <Input
                          type="text"
                          inputMode="numeric"
                          value={editingQuantities[item.product_id] ?? item.quantity}
                          onChange={(e) => handleQuantityInputChange(item.product_id, e.target.value)}
                          onBlur={() => handleQuantityInputBlur(item.product_id, item.product.quantity)}
                          onKeyDown={(e) => handleQuantityInputKeyDown(e, item.product_id, item.product.quantity)}
                          className="w-12 h-8 p-0 text-center text-sm font-medium text-[#1A1A1A] bg-transparent border-0 focus-visible:ring-0 focus-visible:ring-offset-0"
                          aria-label="Quantity"
                        />
                        
                        <button
                          className="w-8 h-8 flex items-center justify-center tap-active hover:bg-[#E2E0DA] rounded-r-lg transition-colors disabled:opacity-50"
                          onClick={() => updateQuantity(item.product_id, item.quantity + 1)}
                          disabled={item.quantity >= item.product.quantity}
                        >
                          <Plus className="h-3.5 w-3.5 text-[#6B7280]" />
                        </button>
                      </div>

                      {/* Price & Remove */}
                      <div className="flex items-center gap-3">
                        <span className="font-semibold text-[#2D5A27]">
                          {formatPrice(item.product.price * item.quantity)}
                        </span>
                        <button
                          onClick={() => removeFromCart(item.product_id)}
                          className="w-8 h-8 flex items-center justify-center rounded-lg text-red-500 tap-active hover:bg-red-50"
                          aria-label="Remove item"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                    
                    {/* Stock Info */}
                    {item.product.quantity <= 10 && item.product.quantity > 0 && (
                      <p className="text-[10px] text-amber-600 mt-1">
                        Only {item.product.quantity} left in stock
                      </p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Coupon Section */}
        <Card className="border-[#E2E0DA] shadow-soft mb-4 rounded-2xl">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-sm font-medium text-[#1A1A1A] mb-3">
              <Ticket className="h-4 w-4 text-[#2D5A27]" />
              Apply Coupon
            </div>

            {appliedCoupon ? (
              <div className="flex items-center justify-between p-3 bg-[#2D5A27]/10 rounded-xl">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-[#2D5A27]">{appliedCoupon.code}</span>
                  <span className="text-xs text-[#4CAF50]">
                    {appliedCoupon.discount_type === "percentage"
                      ? `${appliedCoupon.discount_value}% off`
                      : `${formatPrice(appliedCoupon.discount_value)} off`}
                  </span>
                </div>
                <button
                  onClick={handleRemoveCoupon}
                  className="w-8 h-8 flex items-center justify-center rounded-lg tap-active hover:bg-red-50"
                >
                  <X className="h-4 w-4 text-[#6B7280]" />
                </button>
              </div>
            ) : (
              <div className="flex gap-2">
                <Input
                  placeholder="Enter code"
                  value={couponCode}
                  onChange={(e) => {
                    setCouponCode(e.target.value.toUpperCase());
                    setCouponError("");
                  }}
                  className="flex-1 h-10 uppercase bg-[#F0EFE8] border-0 rounded-xl text-sm focus:ring-2 focus:ring-[#2D5A27]/20"
                />
                <Button
                  onClick={handleApplyCoupon}
                  disabled={couponLoading}
                  className="h-10 px-4 rounded-xl bg-[#2D5A27] hover:bg-[#3B7D34] text-white font-medium tap-active"
                >
                  {couponLoading ? "..." : "Apply"}
                </Button>
              </div>
            )}
            {couponError && <p className="text-xs text-red-500 mt-2">{couponError}</p>}
          </CardContent>
        </Card>

        {/* Order Summary */}
        <Card className="border-[#E2E0DA] shadow-soft rounded-2xl">
          <CardContent className="p-4 space-y-3">
            <h3 className="font-semibold text-[#1A1A1A]">Order Summary</h3>

            <div className="space-y-2 text-sm">
              <div className="flex justify-between text-[#6B7280]">
                <span>Subtotal</span>
                <span className="text-[#1A1A1A] font-medium">{formatPrice(subtotal)}</span>
              </div>
              {discount > 0 && (
                <div className="flex justify-between text-[#4CAF50]">
                  <span>Discount</span>
                  <span className="font-medium">-{formatPrice(discount)}</span>
                </div>
              )}
              <div className="flex justify-between text-[#6B7280]">
                <span>Shipping</span>
                <span className="text-[#1A1A1A] font-medium">
                  {shipping === 0 ? "Free" : formatPrice(shipping)}
                </span>
              </div>
              {shipping > 0 && (
                <p className="text-xs text-[#9CA3AF]">
                  Free shipping on orders over {formatPrice(999)}
                </p>
              )}
            </div>

            <Separator className="bg-[#E2E0DA]" />

            <div className="flex justify-between">
              <span className="font-semibold text-[#1A1A1A]">Total</span>
              <span className="font-bold text-lg text-[#2D5A27]">{formatPrice(total)}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Fixed Bottom Checkout Button */}
      <div className="fixed bottom-0 left-0 right-0 w-full bg-white border-t border-[#E2E0DA] p-4 z-40 pb-[calc(1rem+env(safe-area-inset-bottom)+64px)] md:pb-4 shadow-[0_-4px_20px_rgba(0,0,0,0.08)]">
        <div className="container mx-auto max-w-md">
          <Link href="/checkout">
            <Button className="w-full h-14 rounded-xl bg-[#2D5A27] hover:bg-[#3B7D34] text-white font-semibold text-base tap-active shadow-lg">
              Proceed to Checkout
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
