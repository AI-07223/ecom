"use client";

import { useState, useEffect, useCallback } from "react";
import { ArrowUp, ShoppingCart, X } from "lucide-react";
import { cn } from "@/lib/utils";
import Link from "next/link";

interface FloatingActionButtonProps {
  showCart?: boolean;
  cartItemCount?: number;
  className?: string;
}

export function FloatingActionButton({ 
  showCart = true, 
  cartItemCount = 0,
  className 
}: FloatingActionButtonProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);

  const handleScroll = useCallback(() => {
    // Show FAB after scrolling down 300px
    const scrollTop = window.scrollY || document.documentElement.scrollTop;
    setIsVisible(scrollTop > 300);
  }, []);

  useEffect(() => {
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [handleScroll]);

  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: "smooth"
    });
    setIsExpanded(false);
  };

  const toggleExpanded = () => {
    setIsExpanded(!isExpanded);
  };

  if (!isVisible) return null;

  return (
    <div className={cn("fixed bottom-[calc(80px+env(safe-area-inset-bottom,0px))] right-4 z-40 flex flex-col items-end gap-2", className)}>
      {/* Expanded Actions */}
      <div 
        className={cn(
          "flex flex-col items-end gap-2 transition-all duration-300",
          isExpanded ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4 pointer-events-none"
        )}
      >
        {/* Scroll to Top Button */}
        <button
          onClick={scrollToTop}
          className="w-12 h-12 rounded-full bg-white text-[#2D5A27] shadow-elevated flex items-center justify-center tap-active"
          aria-label="Scroll to top"
        >
          <ArrowUp className="w-5 h-5" />
        </button>

        {/* Quick Cart Button */}
        {showCart && (
          <Link
            href="/cart"
            className="w-12 h-12 rounded-full bg-[#2D5A27] text-white shadow-elevated flex items-center justify-center tap-active relative"
            aria-label="Go to cart"
          >
            <ShoppingCart className="w-5 h-5" />
            {cartItemCount > 0 && (
              <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center">
                {cartItemCount > 99 ? "99+" : cartItemCount}
              </span>
            )}
          </Link>
        )}
      </div>

      {/* Main FAB */}
      <button
        onClick={toggleExpanded}
        className={cn(
          "w-14 h-14 rounded-full shadow-floating flex items-center justify-center tap-active transition-colors duration-200",
          isExpanded 
            ? "bg-white text-[#2D5A27]" 
            : "bg-[#2D5A27] text-white"
        )}
        aria-label={isExpanded ? "Close actions" : "Open actions"}
        aria-expanded={isExpanded}
      >
        <X className={cn(
          "w-6 h-6 transition-transform duration-200",
          !isExpanded && "rotate-45"
        )} />
      </button>
    </div>
  );
}
