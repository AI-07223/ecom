"use client";

import Image from "next/image";
import { Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { CartItem, Product } from "@/types/database.types";

interface Coupon {
  code: string;
  discount_type: "percentage" | "fixed";
  discount_value: number;
}

interface OrderSummaryProps {
  items: (CartItem & { product: Product })[];
  subtotal: number;
  discount: number;
  appliedCoupon: Coupon | null;
  shipping: number;
  total: number;
  gstNumber: string;
  isProcessing: boolean;
}

function formatPrice(price: number) {
  return `₹${price.toLocaleString("en-IN")}`;
}

export function OrderSummary({
  items,
  subtotal,
  discount,
  appliedCoupon,
  shipping,
  total,
  gstNumber,
  isProcessing,
}: OrderSummaryProps) {
  return (
    <Card className="sticky top-24 border-[#E2E0DA] shadow-soft-lg">
      <CardHeader>
        <CardTitle className="text-[#1A1A1A] flex items-center gap-2">
          <span className="w-1 h-5 bg-gradient-to-b from-[#2D5A27] to-[#4CAF50] rounded-full" />
          Order Summary
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-3 max-h-64 overflow-y-auto">
          {items.map((item) => (
            <div key={item.id} className="flex gap-3">
              <div className="relative w-16 h-16 rounded-xl bg-[#F0EFE8] border border-[#E2E0DA] shrink-0 overflow-hidden">
                <Image
                  src={item.product.thumbnail || "/placeholder.svg"}
                  alt={item.product.name}
                  fill
                  className="object-cover"
                  sizes="64px"
                />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-[#1A1A1A] line-clamp-1">{item.product.name}</p>
                <p className="text-sm text-[#6B7280]">Qty: {item.quantity}</p>
                <p className="text-sm font-medium text-[#2D5A27]">
                  {formatPrice(item.product.price * item.quantity)}
                </p>
              </div>
            </div>
          ))}
        </div>

        <Separator className="bg-[#E2E0DA]" />

        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-[#6B7280]">Subtotal</span>
            <span className="text-[#1A1A1A] font-medium">{formatPrice(subtotal)}</span>
          </div>
          {discount > 0 && (
            <div className="flex justify-between text-[#4CAF50]">
              <span className="flex items-center gap-1">
                Discount
                {appliedCoupon && (
                  <span className="text-xs bg-[#4CAF50]/10 px-1.5 py-0.5 rounded text-[#4CAF50]">
                    {appliedCoupon.code}
                  </span>
                )}
              </span>
              <span className="font-medium">-{formatPrice(discount)}</span>
            </div>
          )}
          <div className="flex justify-between">
            <span className="text-[#6B7280]">Shipping</span>
            <span className="text-[#1A1A1A] font-medium">
              {shipping === 0 ? "Free" : formatPrice(shipping)}
            </span>
          </div>
        </div>

        <Separator className="bg-[#E2E0DA]" />

        <div className="flex justify-between font-semibold text-lg">
          <span className="text-[#1A1A1A]">Total</span>
          <span className="text-[#2D5A27]">{formatPrice(total)}</span>
        </div>

        {gstNumber && (
          <div className="text-xs text-[#6B7280] bg-[#F0EFE8] p-2 rounded-lg border border-[#E2E0DA]">
            GST Invoice will be generated for:{" "}
            <span className="font-mono text-[#1A1A1A]">{gstNumber}</span>
          </div>
        )}

        <Button
          type="submit"
          className="w-full bg-[#2D5A27] hover:bg-[#3B7D34] rounded-xl h-12"
          size="lg"
          disabled={isProcessing}
        >
          {isProcessing ? "Processing..." : "Place Order"}
        </Button>

        <div className="flex items-center justify-center gap-2 text-xs text-[#6B7280]">
          <Shield className="h-3 w-3 text-[#2D5A27]" />
          Secure checkout
        </div>
      </CardContent>
    </Card>
  );
}
