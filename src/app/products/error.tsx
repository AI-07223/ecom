"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";

export default function ProductsError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[products] Error boundary caught:", error);
  }, [error]);

  return (
    <div className="min-h-screen bg-[#FAFAF5] flex items-center justify-center">
      <div className="bg-white rounded-2xl border border-[#E2E0DA] p-12 max-w-md mx-auto text-center shadow-soft">
        <h2 className="text-2xl font-bold text-[#1A1A1A] mb-4">Failed to load products</h2>
        <p className="text-[#6B7280] mb-6">
          We couldn&apos;t fetch the product catalog. Please check your connection and try again.
        </p>
        <Button onClick={reset} className="bg-[#2D5A27] hover:bg-[#3B7D34] rounded-full">
          Try again
        </Button>
      </div>
    </div>
  );
}
