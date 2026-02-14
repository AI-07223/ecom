"use client";

import { useRef, useCallback } from "react";

export function useInfiniteScroll(callback: () => void, enabled: boolean = true) {
  const observerRef = useRef<IntersectionObserver | null>(null);

  const lastElementRef = useCallback(
    (node: HTMLElement | null) => {
      if (!enabled) return;
      
      if (observerRef.current) {
        observerRef.current.disconnect();
      }

      observerRef.current = new IntersectionObserver(
        (entries) => {
          if (entries[0].isIntersecting) {
            callback();
          }
        },
        {
          rootMargin: "100px",
          threshold: 0.1,
        }
      );

      if (node) {
        observerRef.current.observe(node);
      }
    },
    [callback, enabled]
  );

  return lastElementRef;
}
