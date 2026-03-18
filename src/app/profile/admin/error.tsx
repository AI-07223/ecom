"use client";

import { useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function AdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[admin] Error boundary caught:", error);
  }, [error]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30">
      <div className="bg-white rounded-2xl border p-12 max-w-md mx-auto text-center shadow-sm">
        <h2 className="text-2xl font-bold mb-4">Admin page error</h2>
        <p className="text-muted-foreground mb-6">
          Something went wrong in the admin panel. Your data is safe.
        </p>
        <div className="flex gap-3 justify-center">
          <Button onClick={reset}>Try again</Button>
          <Link href="/profile/admin">
            <Button variant="outline">Admin Home</Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
