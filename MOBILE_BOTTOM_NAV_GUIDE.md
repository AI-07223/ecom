# Mobile Bottom Navigation - Industry Standards Reference Guide

A comprehensive guide for implementing proper mobile bottom navigation based on Material Design 3, iOS Human Interface Guidelines, WCAG 2.1 accessibility standards, and modern web best practices.

---

## Table of Contents

1. [Navigation Bar Heights](#1-navigation-bar-heights)
2. [Touch Target Sizes](#2-touch-target-sizes)
3. [Preventing Unwanted Scrolling](#3-preventing-unwanted-scrolling)
4. [Safe Area Handling](#4-safe-area-handling)
5. [Grid vs Flexbox for Navigation](#5-grid-vs-flexbox-for-navigation)
6. [Active States](#6-active-states)
7. [Complete Implementation Example](#7-complete-implementation-example)

---

## 1. Navigation Bar Heights

### Material Design 3 (Google)

| Property | Value | Notes |
|----------|-------|-------|
| **Height** | 80px | Material Design 3 increased height from M2's 56px |
| **Active Indicator** | 32px height, pill-shaped | Filled icon with container background |
| **Icon Size** | 24px | Standard icon size |
| **Label** | Optional, below icon | Larger touch targets than M2 |

### iOS Human Interface Guidelines

| Property | Value | Notes |
|----------|-------|-------|
| **Height** | 49pt (49px) | Standard tab bar height |
| **With Safe Area** | 83px+ | Includes safe-area-inset-bottom |
| **Icon Size** | 25pt × 25pt | Unselected state |
| **Icon Size (Selected)** | 25pt × 25pt | Same size, filled variant |

### React Navigation (React Native Standard)

| Property | Value | Notes |
|----------|-------|-------|
| **Height** | ~49-60px | Varies by platform |
| **Safe Area** | Automatic | Uses `SafeAreaView` |
| **Keyboard Handling** | Hides on keyboard open | Configurable |

### Recommended Web Implementation

```css
.mobile-bottom-nav {
  /* Base height: Material 3's 80px provides best touch targets */
  height: 80px;
  
  /* Add safe area padding for notched devices */
  padding-bottom: env(safe-area-inset-bottom, 0px);
  
  /* Total height becomes 80px + safe area (typically 34px on iPhone X+) */
  min-height: 80px;
}
```

---

## 2. Touch Target Sizes

### WCAG 2.1 Accessibility Standards

| Standard | Minimum Size | Target Level |
|----------|--------------|--------------|
| **WCAG 2.5.5 (AAA)** | 44×44px | Ideal - all touch targets |
| **WCAG 2.5.8 (AA)** | 24×24px | Minimum - except when essential |

### Google's Web.dev / Lighthouse

- **Recommended**: 48×48px touch targets
- **Spacing**: Minimum 8px between targets
- **Audit Failure**: Targets < 48px with 25%+ overlap

### Implementation Strategy

```css
.nav-item {
  /* Visual size can be smaller... */
  width: 24px;
  height: 24px;
  
  /* ...but touch target must be larger */
  padding: 12px; /* 24 + 12 + 12 = 48px */
  
  /* Alternative: Use min dimensions */
  min-width: 48px;
  min-height: 48px;
}
```

### Touch Target Best Practices

```css
.nav-button {
  /* Method 1: Large hit area with visual centering */
  display: flex;
  align-items: center;
  justify-content: center;
  min-width: 48px;
  min-height: 48px;
  padding: 8px 12px;
  
  /* Method 2: Equal distribution (3-5 items) */
  flex: 1;
  min-height: 80px; /* Full nav height */
}
```

---

## 3. Preventing Unwanted Scrolling

### Critical CSS Properties

#### `touch-action`

Controls how touch gestures are handled by the browser.

```css
.mobile-bottom-nav {
  /* Disable browser handling of ALL gestures on navbar */
  touch-action: none;
  
  /* Alternative: Allow horizontal swipes only */
  touch-action: pan-x;
  
  /* Alternative: Allow pinch-zoom but disable scroll */
  touch-action: pan-x pan-y pinch-zoom;
}
```

| Value | Effect |
|-------|--------|
| `auto` | Default - browser handles all gestures |
| `none` | Disable all browser gestures (custom handling) |
| `pan-x` | Enable horizontal panning only |
| `pan-y` | Enable vertical panning only |
| `manipulation` | Enable pan + pinch-zoom, disable double-tap zoom |

#### `overscroll-behavior`

Prevents scroll chaining (rubber-band effect) and pull-to-refresh.

```css
.mobile-bottom-nav {
  /* Prevent scroll chaining to parent/underlying elements */
  overscroll-behavior: none;
  
  /* Allow bounce effects locally, prevent chaining */
  overscroll-behavior: contain;
}

/* Prevent pull-to-refresh on entire page */
html, body {
  overscroll-behavior-y: none;
}
```

| Value | Effect |
|-------|--------|
| `auto` | Default - scroll chaining occurs |
| `contain` | Local bounce effects, no chaining |
| `none` | No overscroll effects, no chaining |

#### `user-select`

Prevent text selection on navigation items.

```css
.mobile-bottom-nav {
  /* Prevent accidental text selection on long press */
  -webkit-user-select: none;
  user-select: none;
}
```

#### `-webkit-tap-highlight-color`

Remove default blue highlight on tap (Android/older iOS).

```css
.mobile-bottom-nav {
  /* Remove tap highlight or make it subtle */
  -webkit-tap-highlight-color: transparent;
  
  /* Or use a subtle color */
  -webkit-tap-highlight-color: rgba(0, 0, 0, 0.1);
}
```

### Complete Anti-Scroll Configuration

```css
.mobile-bottom-nav {
  /* Position fixed at bottom */
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  
  /* Prevent any scrolling */
  overflow: hidden;
  overscroll-behavior: none;
  
  /* Disable touch gestures */
  touch-action: none;
  
  /* Prevent text selection */
  -webkit-user-select: none;
  user-select: none;
  
  /* Remove tap highlight */
  -webkit-tap-highlight-color: transparent;
}
```

---

## 4. Safe Area Handling

### Understanding Safe Areas

Safe areas are the regions of the screen not obscured by:
- Device notches (iPhone X+)
- Dynamic Island (iPhone 14 Pro+)
- Home indicators (iOS gesture bar)
- Rounded corners
- Camera cutouts (Android)

### Environment Variables

```css
/* iOS safe area insets */
env(safe-area-inset-top);      /* ~44-59px (notch/status bar) */
env(safe-area-inset-right);    /* ~0px (usually) */
env(safe-area-inset-bottom);   /* ~34px (home indicator) */
env(safe-area-inset-left);     /* ~0px (usually) */
```

### Implementation

```css
.mobile-bottom-nav {
  /* Base styles */
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  height: 80px;
  
  /* Add safe area padding with fallback */
  padding-bottom: env(safe-area-inset-bottom, 0px);
  
  /* Ensure content stays above safe area */
  padding-left: max(env(safe-area-inset-left), 16px);
  padding-right: max(env(safe-area-inset-right), 16px);
}

/* Viewport meta tag requirement */
/* Add to HTML <head>: */
/* <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover"> */
```

### Safe Area Best Practices

1. **Always use fallbacks**: `env(safe-area-inset-bottom, 0px)`
2. **Combine with max()**: `max(env(safe-area-inset-bottom), 16px)`
3. **Use `viewport-fit=cover`**: Required in viewport meta tag
4. **Test on real devices**: Simulators may not show accurate values

### Viewport Meta Tag

```html
<meta 
  name="viewport" 
  content="width=device-width, initial-scale=1.0, viewport-fit=cover, user-scalable=no"
>
```

| Property | Purpose |
|----------|---------|
| `width=device-width` | Match device screen width |
| `initial-scale=1.0` | No initial zoom |
| `viewport-fit=cover` | **Required** for safe-area-inset-* support |
| `user-scalable=no` | Optional - prevent zoom |

---

## 5. Grid vs Flexbox for Navigation

### Comparison

| Feature | Flexbox | Grid |
|---------|---------|------|
| **Equal Width** | `flex: 1` | `grid-template-columns: repeat(5, 1fr)` |
| **Dynamic Items** | ✅ Automatic | ❌ Fixed columns |
| **3-5 Items** | ✅ Perfect | ✅ Perfect |
| **6+ Items** | ❌ Crowded | ❌ Not recommended |
| **Gap Control** | `gap` property | `gap` property |
| **Browser Support** | Excellent | Excellent |

### Flexbox Implementation (Recommended)

```css
.mobile-bottom-nav {
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: space-around; /* or space-evenly */
}

.nav-item {
  /* Equal width distribution */
  flex: 1;
  
  /* Full height for larger touch target */
  height: 100%;
  
  /* Center content */
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  
  /* Minimum touch target */
  min-width: 48px;
}
```

### Grid Implementation

```css
.mobile-bottom-nav {
  display: grid;
  /* 4 items = 4 columns */
  grid-template-columns: repeat(4, 1fr);
  align-items: center;
  height: 80px;
}

.nav-item {
  /* Full cell */
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
}
```

### Recommendation

**Use Flexbox** for mobile bottom navigation because:

1. **Automatic equal distribution** - Items naturally share space
2. **Dynamic item count** - Works with 3, 4, or 5 items without CSS changes
3. **Better for touch targets** - Easier to make full-height clickable areas
4. **Simpler responsive behavior** - Natural wrapping if needed

### Handling Different Item Counts

```css
/* 3 items - larger touch targets */
.nav-item:nth-last-child(3):first-child,
.nav-item:nth-last-child(3):first-child ~ .nav-item {
  flex: 1;
}

/* 4 items - balanced */
.nav-item:nth-last-child(4):first-child,
.nav-item:nth-last-child(4):first-child ~ .nav-item {
  flex: 1;
}

/* 5 items - minimum recommended */
.nav-item:nth-last-child(5):first-child,
.nav-item:nth-last-child(5):first-child ~ .nav-item {
  flex: 1;
}

/* 6+ items - consider scrollable or overflow menu */
.nav-item:nth-last-child(n+6):first-child,
.nav-item:nth-last-child(n+6):first-child ~ .nav-item {
  flex: 0 0 64px; /* Fixed width, scrollable */
}
```

---

## 6. Active States

### Material Design 3 Active State

```css
.nav-item {
  /* Inactive state */
  opacity: 0.7;
  color: var(--on-surface-variant);
}

.nav-item.active {
  /* Active indicator container */
  position: relative;
  color: var(--on-secondary-container);
}

.nav-item.active::before {
  /* Pill-shaped background indicator */
  content: '';
  position: absolute;
  width: 64px;
  height: 32px;
  background-color: var(--secondary-container);
  border-radius: 16px; /* Pill shape */
  z-index: -1;
}

.nav-item.active .icon {
  /* Filled icon variant */
  opacity: 1;
}
```

### iOS Active State

```css
.nav-item {
  /* Inactive - outline/faded */
  color: var(--tab-bar-inactive);
  opacity: 0.6;
}

.nav-item.active {
  /* Active - filled/bright */
  color: var(--tint-color); /* System blue or app accent */
  opacity: 1;
}

/* No background indicator in iOS */
/* Icon switches from outline to filled */
```

### Accessibility: Focus States

```css
.nav-item {
  /* Remove default outline */
  outline: none;
}

.nav-item:focus-visible {
  /* Visible focus indicator for keyboard navigation */
  outline: 2px solid var(--focus-ring-color);
  outline-offset: -2px;
  border-radius: 8px;
}

/* Reduce motion preference */
@media (prefers-reduced-motion: reduce) {
  .nav-item,
  .nav-item .icon {
    transition: none;
  }
}
```

### Touch Feedback

```css
.nav-item {
  /* Subtle press feedback */
  transition: transform 0.1s ease, opacity 0.2s ease;
}

.nav-item:active {
  transform: scale(0.95);
  opacity: 0.8;
}

/* Alternative: Ripple effect (Material) */
.nav-item {
  position: relative;
  overflow: hidden;
}

.nav-item::after {
  content: '';
  position: absolute;
  inset: 0;
  background: radial-gradient(circle, rgba(0,0,0,0.1) 10%, transparent 10%);
  background-repeat: no-repeat;
  background-position: center;
  background-size: 0% 0%;
  transition: background-size 0.3s ease;
}

.nav-item:active::after {
  background-size: 200% 200%;
}
```

---

## 7. Complete Implementation Example

### HTML Structure

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover">
  <title>Mobile Bottom Navigation</title>
</head>
<body>
  <!-- Main content area -->
  <main class="content">
    <!-- Page content -->
  </main>
  
  <!-- Bottom Navigation -->
  <nav class="mobile-bottom-nav" role="navigation" aria-label="Main Navigation">
    <a href="/home" class="nav-item active" aria-current="page">
      <span class="nav-icon" aria-hidden="true">
        <!-- Active: filled icon -->
        <svg><!-- Home filled --></svg>
      </span>
      <span class="nav-label">Home</span>
    </a>
    
    <a href="/categories" class="nav-item">
      <span class="nav-icon" aria-hidden="true">
        <svg><!-- Grid outline --></svg>
      </span>
      <span class="nav-label">Categories</span>
    </a>
    
    <a href="/cart" class="nav-item">
      <span class="nav-icon" aria-hidden="true">
        <svg><!-- Cart outline --></svg>
      </span>
      <span class="nav-label">Cart</span>
      <span class="badge" aria-label="3 items in cart">3</span>
    </a>
    
    <a href="/profile" class="nav-item">
      <span class="nav-icon" aria-hidden="true">
        <svg><!-- User outline --></svg>
      </span>
      <span class="nav-label">Profile</span>
    </a>
  </nav>
</body>
</html>
```

### Complete CSS

```css
/* ============================================
   MOBILE BOTTOM NAVIGATION - COMPLETE STYLES
   ============================================ */

/* CSS Custom Properties */
:root {
  /* Colors */
  --nav-background: #ffffff;
  --nav-border: rgba(0, 0, 0, 0.1);
  --nav-text: #666666;
  --nav-text-active: #1976d2;
  --nav-active-indicator: rgba(25, 118, 210, 0.12);
  --focus-ring: #1976d2;
  
  /* Dimensions */
  --nav-height: 80px;
  --nav-icon-size: 24px;
  --nav-label-size: 12px;
  --touch-target-min: 48px;
  --safe-area-bottom: env(safe-area-inset-bottom, 0px);
}

@media (prefers-color-scheme: dark) {
  :root {
    --nav-background: #1e1e1e;
    --nav-border: rgba(255, 255, 255, 0.1);
    --nav-text: #999999;
    --nav-text-active: #90caf9;
    --nav-active-indicator: rgba(144, 202, 249, 0.15);
  }
}

/* Reset and Base */
*, *::before, *::after {
  box-sizing: border-box;
}

html {
  /* Prevent pull-to-refresh and overscroll */
  overscroll-behavior: none;
}

body {
  margin: 0;
  padding: 0;
  /* Add bottom padding to prevent content from being hidden behind nav */
  padding-bottom: calc(var(--nav-height) + var(--safe-area-bottom));
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  -webkit-font-smoothing: antialiased;
}

/* ============================================
   MOBILE BOTTOM NAVIGATION COMPONENT
   ============================================ */

.mobile-bottom-nav {
  /* Positioning - Fixed at bottom */
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  z-index: 1000;
  
  /* Dimensions - Material 3 standard */
  height: var(--nav-height);
  padding-bottom: var(--safe-area-bottom);
  
  /* Layout - Flexbox for equal distribution */
  display: flex;
  flex-direction: row;
  align-items: stretch; /* Full height items */
  justify-content: space-around;
  
  /* Appearance */
  background-color: var(--nav-background);
  border-top: 1px solid var(--nav-border);
  
  /* Prevent interaction issues */
  overflow: hidden;
  
  /* Touch behavior - Disable browser handling */
  touch-action: none;
  
  /* Prevent scroll chaining */
  overscroll-behavior: none;
  
  /* Prevent text selection */
  -webkit-user-select: none;
  user-select: none;
  
  /* Remove tap highlight */
  -webkit-tap-highlight-color: transparent;
  
  /* Safe area handling for horizontal */
  padding-left: max(env(safe-area-inset-left), 0px);
  padding-right: max(env(safe-area-inset-right), 0px);
}

/* ============================================
   NAVIGATION ITEM
   ============================================ */

.nav-item {
  /* Layout */
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  
  /* Minimum touch target */
  min-width: var(--touch-target-min);
  min-height: var(--touch-target-min);
  
  /* Spacing */
  padding: 8px 4px;
  gap: 4px;
  
  /* Reset link styles */
  text-decoration: none;
  color: var(--nav-text);
  
  /* Positioning for active indicator */
  position: relative;
  
  /* Interaction */
  cursor: pointer;
  transition: color 0.2s ease, transform 0.1s ease;
  
  /* Accessibility */
  outline: none;
}

/* Hover state (desktop) */
@media (hover: hover) {
  .nav-item:hover {
    color: var(--nav-text-active);
  }
}

/* Touch feedback */
.nav-item:active {
  transform: scale(0.95);
}

/* Focus visible (keyboard navigation) */
.nav-item:focus-visible {
  outline: 2px solid var(--focus-ring);
  outline-offset: -4px;
  border-radius: 12px;
}

/* ============================================
   ACTIVE STATE - Material Design 3 Style
   ============================================ */

.nav-item.active {
  color: var(--nav-text-active);
}

.nav-item.active::before {
  /* Pill-shaped active indicator */
  content: '';
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 64px;
  height: 32px;
  background-color: var(--nav-active-indicator);
  border-radius: 16px;
  z-index: -1;
}

/* ============================================
   ICON & LABEL
   ============================================ */

.nav-icon {
  width: var(--nav-icon-size);
  height: var(--nav-icon-size);
  display: flex;
  align-items: center;
  justify-content: center;
}

.nav-icon svg {
  width: 100%;
  height: 100%;
  fill: currentColor;
}

.nav-label {
  font-size: var(--nav-label-size);
  font-weight: 500;
  line-height: 1;
  /* Optional: Hide labels on very small screens */
  white-space: nowrap;
}

/* ============================================
   BADGE (Notification count)
   ============================================ */

.badge {
  position: absolute;
  top: 8px;
  right: calc(50% - 20px);
  min-width: 18px;
  height: 18px;
  padding: 0 5px;
  background-color: #f44336;
  color: white;
  font-size: 11px;
  font-weight: 600;
  border-radius: 9px;
  display: flex;
  align-items: center;
  justify-content: center;
}

/* ============================================
   RESPONSIVE ADJUSTMENTS
   ============================================ */

/* Small screens - Compact mode */
@media (max-width: 320px) {
  :root {
    --nav-height: 64px;
    --nav-label-size: 10px;
  }
  
  .nav-label {
    display: none; /* Icon-only on very small screens */
  }
  
  .nav-item.active::before {
    width: 40px;
    height: 40px;
    border-radius: 50%; /* Circular instead of pill */
  }
}

/* Large screens - Show more prominently */
@media (min-width: 768px) {
  .mobile-bottom-nav {
    display: none; /* Switch to desktop nav */
  }
  
  body {
    padding-bottom: 0;
  }
}

/* ============================================
   REDUCED MOTION
   ============================================ */

@media (prefers-reduced-motion: reduce) {
  .nav-item,
  .nav-item::before {
    transition: none;
  }
  
  .nav-item:active {
    transform: none;
  }
}

/* ============================================
   LANDSCAPE ORIENTATION
   ============================================ */

@media (orientation: landscape) and (max-height: 500px) {
  :root {
    --nav-height: 56px; /* Shorter in landscape */
  }
  
  .nav-label {
    display: none; /* Icon-only */
  }
}

/* ============================================
   KEYBOARD VISIBLE (when supported)
   ============================================ */

/* Hide bottom nav when virtual keyboard is shown */
@media (max-height: 400px) {
  .mobile-bottom-nav {
    transform: translateY(100%);
    transition: transform 0.3s ease;
  }
}
```

### React/Next.js Component Example

```tsx
// MobileBottomNav.tsx
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Grid3X3, ShoppingCart, User } from 'lucide-react';
import { cn } from '@/lib/utils';

interface NavItem {
  href: string;
  label: string;
  icon: typeof Home;
}

const navItems: NavItem[] = [
  { href: '/', label: 'Home', icon: Home },
  { href: '/categories', label: 'Categories', icon: Grid3X3 },
  { href: '/cart', label: 'Cart', icon: ShoppingCart },
  { href: '/profile', label: 'Profile', icon: User },
];

export function MobileBottomNav() {
  const pathname = usePathname();
  
  return (
    <nav 
      className="mobile-bottom-nav"
      role="navigation" 
      aria-label="Main Navigation"
    >
      {navItems.map(({ href, label, icon: Icon }) => {
        const isActive = pathname === href || pathname.startsWith(`${href}/`);
        
        return (
          <Link
            key={href}
            href={href}
            className={cn('nav-item', isActive && 'active')}
            aria-current={isActive ? 'page' : undefined}
          >
            <span className="nav-icon" aria-hidden="true">
              <Icon size={24} strokeWidth={isActive ? 2.5 : 2} />
            </span>
            <span className="nav-label">{label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
```

### Tailwind CSS Implementation

```tsx
// Using Tailwind CSS v4
export function MobileBottomNavTailwind() {
  const pathname = usePathname();
  
  return (
    <nav 
      className="
        fixed bottom-0 left-0 right-0 z-50
        h-20 pb-[env(safe-area-inset-bottom)]
        flex items-stretch justify-around
        bg-white dark:bg-gray-900
        border-t border-gray-200 dark:border-gray-800
        overflow-hidden
        touch-none
        overscroll-none
        select-none
        [-webkit-tap-highlight-color:transparent]
      "
      role="navigation"
      aria-label="Main Navigation"
    >
      {navItems.map(({ href, label, icon: Icon }) => {
        const isActive = pathname === href;
        
        return (
          <Link
            key={href}
            href={href}
            className={`
              flex-1 flex flex-col items-center justify-center
              min-w-12 min-h-12
              py-2 px-1 gap-1
              text-gray-500 dark:text-gray-400
              relative
              transition-colors duration-200
              active:scale-95
              focus-visible:outline-2 focus-visible:outline-blue-500 focus-visible:outline-offset-[-4px] focus-visible:rounded-xl
              ${isActive ? 'text-blue-600 dark:text-blue-400' : ''}
            `}
            aria-current={isActive ? 'page' : undefined}
          >
            {/* Active indicator pill */}
            {isActive && (
              <span className="
                absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2
                w-16 h-8
                bg-blue-100 dark:bg-blue-900/30
                rounded-full
                -z-10
              " />
            )}
            
            <Icon 
              size={24} 
              strokeWidth={isActive ? 2.5 : 2}
              className={isActive ? 'fill-current' : ''}
              aria-hidden="true"
            />
            
            <span className="text-xs font-medium">{label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
```

---

## Quick Reference Checklist

### Must-Have Properties

| Property | Value | Purpose |
|----------|-------|---------|
| `height` | 80px | Material 3 standard height |
| `padding-bottom` | `env(safe-area-inset-bottom, 0px)` | iPhone safe area |
| `position` | `fixed` | Stay at bottom |
| `z-index` | `1000+` | Above content |
| `touch-action` | `none` | Disable gestures |
| `overscroll-behavior` | `none` | No scroll chaining |
| `user-select` | `none` | No text selection |
| `-webkit-tap-highlight-color` | `transparent` | No tap highlight |
| `display` | `flex` | Equal distribution |
| `min-height` on items | `48px` | WCAG touch target |

### Viewport Meta Tag

```html
<meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover">
```

### Body Padding

```css
body {
  padding-bottom: calc(80px + env(safe-area-inset-bottom, 0px));
}
```

---

## Sources & References

1. **Material Design 3** - https://m3.material.io/components/navigation-bar
2. **iOS Human Interface Guidelines** - https://developer.apple.com/design/human-interface-guidelines
3. **WCAG 2.1** - https://www.w3.org/WAI/WCAG21/Understanding/target-size-minimum
4. **Web.dev Tap Targets** - https://web.dev/tap-targets/
5. **MDN: overscroll-behavior** - https://developer.mozilla.org/en-US/docs/Web/CSS/overscroll-behavior
6. **MDN: touch-action** - https://developer.mozilla.org/en-US/docs/Web/CSS/touch-action
7. **MDN: env()** - https://developer.mozilla.org/en-US/docs/Web/CSS/env
8. **React Navigation** - https://reactnavigation.org/docs/handling-safe-area/

---

*Last Updated: February 2026*
