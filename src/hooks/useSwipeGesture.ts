"use client";

import { useRef, useCallback, TouchEvent } from "react";

interface SwipeConfig {
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  onSwipeUp?: () => void;
  onSwipeDown?: () => void;
  threshold?: number;
  preventDefault?: boolean;
}

export function useSwipeGesture(config: SwipeConfig) {
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);
  const touchEndRef = useRef<{ x: number; y: number } | null>(null);
  
  const threshold = config.threshold || 50;

  const onTouchStart = useCallback(
    (e: TouchEvent<HTMLElement>) => {
      if (config.preventDefault) {
        e.preventDefault();
      }
      touchEndRef.current = null;
      touchStartRef.current = {
        x: e.targetTouches[0].clientX,
        y: e.targetTouches[0].clientY,
      };
    },
    [config.preventDefault]
  );

  const onTouchMove = useCallback(
    (e: TouchEvent<HTMLElement>) => {
      if (config.preventDefault) {
        e.preventDefault();
      }
      touchEndRef.current = {
        x: e.targetTouches[0].clientX,
        y: e.targetTouches[0].clientY,
      };
    },
    [config.preventDefault]
  );

  const onTouchEnd = useCallback(
    (e: TouchEvent<HTMLElement>) => {
      if (!touchStartRef.current || !touchEndRef.current) return;

      const distanceX = touchStartRef.current.x - touchEndRef.current.x;
      const distanceY = touchStartRef.current.y - touchEndRef.current.y;
      const absDistanceX = Math.abs(distanceX);
      const absDistanceY = Math.abs(distanceY);

      // Determine if horizontal or vertical swipe
      if (absDistanceX > absDistanceY) {
        // Horizontal swipe
        if (absDistanceX > threshold) {
          if (distanceX > 0 && config.onSwipeLeft) {
            config.onSwipeLeft();
          } else if (distanceX < 0 && config.onSwipeRight) {
            config.onSwipeRight();
          }
        }
      } else {
        // Vertical swipe
        if (absDistanceY > threshold) {
          if (distanceY > 0 && config.onSwipeUp) {
            config.onSwipeUp();
          } else if (distanceY < 0 && config.onSwipeDown) {
            config.onSwipeDown();
          }
        }
      }

      touchStartRef.current = null;
      touchEndRef.current = null;
    },
    [config, threshold]
  );

  return {
    onTouchStart,
    onTouchMove,
    onTouchEnd,
  };
}
