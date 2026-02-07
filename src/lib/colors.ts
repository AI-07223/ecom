/**
 * Centralized color definitions for UI consistency
 * Royal Trading Company - E-commerce Design System
 */

export const colors = {
  primary: {
    DEFAULT: '#2D5A27',
    light: '#3B7D34',
    dark: '#1E3D1C',
    dim: '#4A7C44',
  },
  accent: '#4CAF50',
  background: {
    DEFAULT: '#FAFAF5',
    cream: '#FAFAF5',
    elevated: '#FFFFFF',
    subtle: '#F0EFE8',
  },
  border: '#E2E0DA',
  text: {
    primary: '#1A1A1A',
    secondary: '#6B7280',
    muted: '#9CA3AF',
  },
  status: {
    pending: { bg: '#FEF3C7', text: '#B45309', border: '#FDE68A' },
    processing: { bg: '#DBEAFE', text: '#1D4ED8', border: '#BFDBFE' },
    shipped: { bg: '#E9D5FF', text: '#7C3AED', border: '#C4B5FD' },
    delivered: { bg: '#D1FAE5', text: '#059669', border: '#6EE7B7' },
    cancelled: { bg: '#FEE2E2', text: '#DC2626', border: '#FECACA' },
  },
} as const;

export type ColorTheme = typeof colors;
