"use client";

import { useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function CheckoutError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[checkout] Error boundary caught:", error);
  }, [error]);

  return (
    <div className="min-h-screen bg-[#FAFAF5] flex items-center justify-center">
      <div className="bg-white rounded-2xl border border-[#E2E0DA] p-12 max-w-md mx-auto text-center shadow-soft">
        <h2 className="text-2xl font-bold text-[#1A1A1A] mb-4">Something went wrong</h2>
        <p className="text-[#6B7280] mb-6">
          We couldn&apos;t load the checkout page. Please try again.
        </p>
        <div className="flex gap-3 justify-center">
          <Button
            onClick={reset}
            className="bg-[#2D5A27] hover:bg-[#3B7D34] rounded-full"
          >
            Try again
          </Button>
          <Link href="/cart">
            <Button variant="outline" className="rounded-full border-[#E2E0DA]">
              Back to Cart
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
