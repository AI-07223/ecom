"use client";

import { useRef, useCallback, TouchEvent, MouseEvent } from "react";

interface LongPressConfig {
  onLongPress: () => void;
  onClick?: () => void;
  delay?: number;
  preventDefault?: boolean;
}

export function useLongPress(config: LongPressConfig) {
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const isLongPressRef = useRef(false);
  const startPosRef = useRef<{ x: number; y: number } | null>(null);
  
  const delay = config.delay || 500;
  const moveThreshold = 10; // pixels

  const start = useCallback(
    (e: TouchEvent<HTMLElement> | MouseEvent<HTMLElement>) => {
      isLongPressRef.current = false;
      
      // Store start position for movement detection
      if ('touches' in e) {
        startPosRef.current = {
          x: e.touches[0].clientX,
          y: e.touches[0].clientY,
        };
      } else {
        startPosRef.current = {
          x: e.clientX,
          y: e.clientY,
        };
      }

      timerRef.current = setTimeout(() => {
        isLongPressRef.current = true;
        config.onLongPress();
      }, delay);
    },
    [config, delay]
  );

  const move = useCallback(
    (e: TouchEvent<HTMLElement>) => {
      if (!startPosRef.current) return;

      const moveX = Math.abs(e.touches[0].clientX - startPosRef.current.x);
      const moveY = Math.abs(e.touches[0].clientY - startPosRef.current.y);

      // Cancel if moved too much
      if (moveX > moveThreshold || moveY > moveThreshold) {
        if (timerRef.current) {
          clearTimeout(timerRef.current);
          timerRef.current = null;
        }
      }
    },
    []
  );

  const end = useCallback(
    (e: TouchEvent<HTMLElement> | MouseEvent<HTMLElement>) => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }

      // Only trigger click if it wasn't a long press
      if (!isLongPressRef.current && config.onClick) {
        config.onClick();
      }

      startPosRef.current = null;
      
      if (config.preventDefault && isLongPressRef.current) {
        e.preventDefault();
      }
    },
    [config]
  );

  const cancel = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    isLongPressRef.current = false;
    startPosRef.current = null;
  }, []);

  return {
    onTouchStart: start,
    onTouchMove: move,
    onTouchEnd: end,
    onMouseDown: start,
    onMouseUp: end,
    onMouseLeave: cancel,
    onContextMenu: (e: React.MouseEvent) => {
      // Prevent default context menu on long press
      if (config.preventDefault) {
        e.preventDefault();
      }
    },
  };
}
