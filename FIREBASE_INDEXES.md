# Firebase Firestore Indexes Setup

This project requires several composite indexes for optimal query performance.

## Quick Setup (Automatic)

### Option A: Deploy via Firebase CLI

1. **Install Firebase CLI** (if not already installed):
   ```bash
   npm install -g firebase-tools
   ```

2. **Login to Firebase**:
   ```bash
   firebase login
   ```

3. **Initialize Firebase** (if not already done):
   ```bash
   firebase init firestore
   ```

4. **Deploy indexes**:
   ```bash
   firebase deploy --only firestore:indexes
   ```

### Option B: Create via Firebase Console (Manual)

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project: `royal-5fd42`
3. Navigate to: **Firestore Database** → **Indexes** tab
4. Click **Add Index** and create each index listed below:

#### Required Indexes

| Collection | Fields | Query Scope |
|------------|--------|-------------|
| `products` | `is_active` (Ascending) → `created_at` (Descending) | Collection |
| `products` | `is_active` (Ascending) → `price` (Ascending) | Collection |
| `products` | `is_active` (Ascending) → `price` (Descending) | Collection |
| `products` | `is_active` (Ascending) → `name` (Ascending) | Collection |
| `products` | `is_active` (Ascending) → `is_featured` (Ascending) → `created_at` (Descending) | Collection |
| `products` | `category_id` (Ascending) → `is_active` (Ascending) | Collection |
| `categories` | `is_active` (Ascending) → `name` (Ascending) | Collection |
| `categories` | `is_active` (Ascending) → `sort_order` (Ascending) | Collection |

5. Wait for indexes to build (status: **Building** → **Enabled**)

## Why These Indexes?

Firestore requires composite indexes when you:
1. Filter on multiple fields (`where`)
2. Filter and sort on different fields (`where` + `orderBy`)
3. Sort on multiple fields (`orderBy` on field A, then field B)

Without these indexes, the app falls back to client-side filtering (slower but works).

## Current Workaround

The app currently uses a **3-level fallback strategy**:

1. Try optimized query with indexes
2. If fails, try simpler query without `orderBy`
3. If still fails, fetch all products and filter client-side

This ensures the app works without indexes, but creating them will improve performance.
