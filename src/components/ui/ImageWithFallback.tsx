"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { cn } from "@/lib/utils";

interface ImageWithFallbackProps {
  src: string;
  alt: string;
  fill?: boolean;
  width?: number;
  height?: number;
  className?: string;
  containerClassName?: string;
  priority?: boolean;
  sizes?: string;
  onError?: () => void;
}

export function ImageWithFallback({
  src,
  alt,
  fill,
  width,
  height,
  className,
  containerClassName,
  priority = false,
  sizes,
  onError,
}: ImageWithFallbackProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [currentSrc, setCurrentSrc] = useState(src);

  useEffect(() => {
    setCurrentSrc(src);
    setIsLoading(true);
    setHasError(false);
  }, [src]);

  const handleLoad = () => {
    setIsLoading(false);
  };

  const handleError = () => {
    setIsLoading(false);
    setHasError(true);
    onError?.();
  };

  // Generate a low-quality placeholder color based on the alt text
  const placeholderColor = stringToColor(alt);

  return (
    <div
      className={cn(
        "relative overflow-hidden",
        fill && "h-full w-full",
        containerClassName
      )}
      style={
        !fill && width && height
          ? { width, height }
          : undefined
      }
    >
      {/* Placeholder / Blur backdrop */}
      {(isLoading || hasError) && (
        <div
          className={cn(
            "absolute inset-0 animate-pulse bg-[#F0EFE8]",
            !hasError && "backdrop-blur-sm"
          )}
          style={{
            backgroundColor: hasError ? undefined : placeholderColor,
          }}
        >
          {hasError && (
            <div className="flex h-full items-center justify-center">
              <svg
                className="h-8 w-8 text-[#9CA3AF]"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                />
              </svg>
            </div>
          )}
        </div>
      )}

      {/* Main Image */}
      <Image
        src={hasError ? "/placeholder.svg" : currentSrc}
        alt={alt}
        fill={fill}
        width={!fill ? width : undefined}
        height={!fill ? height : undefined}
        className={cn(
          "transition-opacity duration-300",
          isLoading ? "opacity-0" : "opacity-100",
          className
        )}
        priority={priority}
        sizes={sizes}
        onLoad={handleLoad}
        onError={handleError}
      />
    </div>
  );
}

// Generate a consistent color from a string
function stringToColor(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  
  const hue = Math.abs(hash % 360);
  return `hsl(${hue}, 20%, 92%)`;
}
