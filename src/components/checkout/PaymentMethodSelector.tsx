"use client";

import { CreditCard, Banknote, Smartphone, Check } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface PaymentMethodSelectorProps {
  paymentMethod: "cod" | "online";
  onChange: (method: "cod" | "online") => void;
}

export function PaymentMethodSelector({ paymentMethod, onChange }: PaymentMethodSelectorProps) {
  return (
    <Card className="border-[#E2E0DA] shadow-soft">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-[#1A1A1A]">
          <div className="w-8 h-8 rounded-lg bg-[#2D5A27]/10 flex items-center justify-center">
            <CreditCard className="h-4 w-4 text-[#2D5A27]" />
          </div>
          Payment Method
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <button
          type="button"
          onClick={() => onChange("cod")}
          className={`w-full p-4 rounded-xl border-2 text-left transition-all flex items-center gap-4 ${
            paymentMethod === "cod"
              ? "border-[#2D5A27] bg-[#2D5A27]/5"
              : "border-[#E2E0DA] hover:border-[#2D5A27]/50"
          }`}
        >
          <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
            paymentMethod === "cod" ? "bg-[#2D5A27] text-white" : "bg-[#F0EFE8] text-[#6B7280]"
          }`}>
            <Banknote className="h-5 w-5" />
          </div>
          <div className="flex-1">
            <p className="font-medium text-[#1A1A1A]">Cash on Delivery</p>
            <p className="text-xs text-[#6B7280]">Pay when you receive your order</p>
          </div>
          {paymentMethod === "cod" && <Check className="h-5 w-5 text-[#2D5A27]" />}
        </button>

        <button
          type="button"
          onClick={() => onChange("online")}
          className={`w-full p-4 rounded-xl border-2 text-left transition-all flex items-center gap-4 ${
            paymentMethod === "online"
              ? "border-[#2D5A27] bg-[#2D5A27]/5"
              : "border-[#E2E0DA] hover:border-[#2D5A27]/50"
          }`}
        >
          <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
            paymentMethod === "online" ? "bg-[#2D5A27] text-white" : "bg-[#F0EFE8] text-[#6B7280]"
          }`}>
            <Smartphone className="h-5 w-5" />
          </div>
          <div className="flex-1">
            <p className="font-medium text-[#1A1A1A]">UPI / Card / Net Banking</p>
            <p className="text-xs text-[#6B7280]">Pay securely online</p>
          </div>
          {paymentMethod === "online" && <Check className="h-5 w-5 text-[#2D5A27]" />}
        </button>

        {paymentMethod === "online" && (
          <div className="mt-4 p-4 bg-amber-50 border border-amber-200 rounded-xl">
            <p className="text-sm text-amber-800 font-medium">Online Payment Coming Soon!</p>
            <p className="text-xs text-amber-700 mt-1">
              We&apos;re integrating Razorpay for secure online payments. For now, please use Cash on
              Delivery.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
