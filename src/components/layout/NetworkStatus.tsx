"use client";

import { useState, useEffect } from "react";
import { WifiOff, Wifi } from "lucide-react";
import { cn } from "@/lib/utils";

export function NetworkStatus() {
  const [isOnline, setIsOnline] = useState(true);
  const [showBanner, setShowBanner] = useState(false);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      setShowBanner(true);
      setTimeout(() => setShowBanner(false), 3000);
    };

    const handleOffline = () => {
      setIsOnline(false);
      setShowBanner(true);
    };

    setIsOnline(navigator.onLine);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  if (!showBanner) return null;

  return (
    <div
      className={cn(
        "fixed top-0 left-0 right-0 z-[200] px-4 py-2 text-center text-sm font-medium transition-colors",
        isOnline ? "bg-green-500 text-white" : "bg-red-500 text-white"
      )}
    >
      <div className="flex items-center justify-center gap-2">
        {isOnline ? <Wifi className="w-4 h-4" /> : <WifiOff className="w-4 h-4" />}
        {isOnline ? "You're back online" : "You're offline. Check your connection."}
      </div>
    </div>
  );
}
