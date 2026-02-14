"use client";

import { useState, useRef, useCallback } from "react";
import { RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";

interface PullToRefreshProps {
  onRefresh: () => Promise<void>;
  children: React.ReactNode;
  className?: string;
}

export function PullToRefresh({ onRefresh, children, className }: PullToRefreshProps) {
  const [pulling, setPulling] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [pullDistance, setPullDistance] = useState(0);
  const startY = useRef(0);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (containerRef.current?.scrollTop === 0) {
      startY.current = e.touches[0].clientY;
    }
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (containerRef.current?.scrollTop === 0 && startY.current > 0) {
      const diff = e.touches[0].clientY - startY.current;
      if (diff > 0 && diff < 150) {
        setPulling(true);
        setPullDistance(diff);
      }
    }
  }, []);

  const handleTouchEnd = useCallback(async () => {
    if (pulling && pullDistance > 60) {
      setRefreshing(true);
      try {
        await onRefresh();
      } finally {
        setRefreshing(false);
      }
    }
    setPulling(false);
    setPullDistance(0);
    startY.current = 0;
  }, [pulling, pullDistance, onRefresh]);

  return (
    <div
      ref={containerRef}
      className={cn("relative overflow-y-auto", className)}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {(pulling || refreshing) && (
        <div 
          className="absolute top-0 left-0 right-0 flex items-center justify-center pointer-events-none"
          style={{ height: `${Math.max(pullDistance, refreshing ? 60 : 0)}px` }}
        >
          <div className="flex items-center justify-center">
            <RefreshCw 
              className={cn(
                "w-6 h-6 text-[#2D5A27] transition-transform",
                refreshing && "animate-spin",
                !refreshing && pulling && pullDistance > 60 && "rotate-180"
              )} 
            />
          </div>
        </div>
      )}
      <div 
        style={{ 
          transform: pulling || refreshing ? `translateY(${Math.max(pullDistance, refreshing ? 60 : 0)}px)` : undefined,
          transition: pulling ? undefined : "transform 0.2s ease-out"
        }}
      >
        {children}
      </div>
    </div>
  );
}
