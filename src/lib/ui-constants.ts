/**
 * UI Constants for consistent sizing, spacing, and styling across components
 * Royal Trading Company - E-commerce Design System
 */

export const SIZES = {
  button: {
    sm: 'h-9',
    md: 'h-11',
    lg: 'h-12',
    xl: 'h-14',
  },
  icon: {
    sm: 'w-8 h-8',
    md: 'w-10 h-10',
    lg: 'w-12 h-12',
  },
  radius: {
    sm: 'rounded-lg',     // 8px
    md: 'rounded-xl',     // 12px
    lg: 'rounded-2xl',    // 16px
    xl: 'rounded-3xl',    // 24px
  },
  padding: {
    card: 'p-4',
    section: 'py-6',
  },
} as const;

export const SHADOWS = {
  none: '',
  sm: 'shadow-sm',
  soft: 'shadow-soft',
  elevated: 'shadow-elevated',
  floating: 'shadow-floating',
} as const;

export type ButtonSize = keyof typeof SIZES.button;
export type IconSize = keyof typeof SIZES.icon;
export type RadiusSize = keyof typeof SIZES.radius;
export type ShadowType = keyof typeof SHADOWS;
