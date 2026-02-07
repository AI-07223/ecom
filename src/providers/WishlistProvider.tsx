'use client'

import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import {
    collection,
    doc,
    getDoc,
    getDocs,
    setDoc,
    deleteDoc,
    query,
    orderBy,
    serverTimestamp,
} from 'firebase/firestore'
import { db } from '@/lib/firebase/config'
import { WishlistItem, Product } from '@/types/database.types'
import { timestampToString } from '@/lib/firebase/utils'
import { useAuth } from './AuthProvider'
import { toast } from 'sonner'

interface WishlistContextType {
    items: (WishlistItem & { product: Product })[]
    isLoading: boolean
    isInWishlist: (productId: string) => boolean
    addToWishlist: (productId: string) => Promise<void>
    removeFromWishlist: (productId: string) => Promise<void>
    toggleWishlist: (productId: string) => Promise<void>
    refreshWishlist: () => Promise<void>
}

const WishlistContext = createContext<WishlistContextType | undefined>(undefined)

// Helper to convert Firestore product data to Product type
function convertProductData(docId: string, data: Record<string, unknown>): Product {
  return {
    id: docId,
    name: data.name as string,
    slug: data.slug as string,
    description: (data.description as string | null) ?? null,
    short_description: (data.short_description as string | null) ?? null,
    price: data.price as number,
    wholeseller_price: (data.wholeseller_price as number | null) ?? null,
    compare_at_price: (data.compare_at_price as number | null) ?? null,
    cost_price: (data.cost_price as number | null) ?? null,
    sku: (data.sku as string | null) ?? null,
    barcode: (data.barcode as string | null) ?? null,
    quantity: data.quantity as number,
    track_inventory: data.track_inventory as boolean,
    allow_backorder: data.allow_backorder as boolean,
    category_id: (data.category_id as string | null) ?? null,
    images: (data.images as string[]) ?? [],
    thumbnail: (data.thumbnail as string | null) ?? null,
    weight: (data.weight as number | null) ?? null,
    dimensions: (data.dimensions as Product['dimensions']) ?? null,
    tags: (data.tags as string[]) ?? [],
    is_active: data.is_active as boolean,
    is_featured: data.is_featured as boolean,
    metadata: (data.metadata as Record<string, unknown>) ?? {},
    created_at: timestampToString(data.created_at as Parameters<typeof timestampToString>[0]),
    updated_at: timestampToString(data.updated_at as Parameters<typeof timestampToString>[0]),
  };
}

// Helper to convert Firestore wishlist data to WishlistItem type
function convertWishlistItemData(
  docId: string,
  data: Record<string, unknown>,
  userId: string,
  product?: Product,
): WishlistItem & { product: Product } {
  return {
    id: docId,
    user_id: userId,
    product_id: data.product_id as string,
    created_at: timestampToString(data.created_at as Parameters<typeof timestampToString>[0]),
    updated_at: timestampToString(data.updated_at as Parameters<typeof timestampToString>[0]),
    product: product!,
  };
}

export function WishlistProvider({ children }: { children: React.ReactNode }) {
    const [items, setItems] = useState<(WishlistItem & { product: Product })[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const { user } = useAuth()

    const fetchWishlist = useCallback(async () => {
        if (!user) {
            setItems([])
            setIsLoading(false)
            return
        }

        try {
            const wishlistRef = collection(db, 'users', user.uid, 'wishlist')
            const wishlistSnap = await getDocs(query(wishlistRef, orderBy('created_at', 'desc')))

            const wishlistItems: (WishlistItem & { product: Product })[] = []

            for (const wishlistDoc of wishlistSnap.docs) {
                const wishlistData = wishlistDoc.data()
                const productRef = doc(db, 'products', wishlistData.product_id)
                const productSnap = await getDoc(productRef)

                if (productSnap.exists()) {
                    const productData = convertProductData(
                      productSnap.id,
                      productSnap.data() as Record<string, unknown>,
                    );
                    wishlistItems.push(
                      convertWishlistItemData(
                        wishlistDoc.id,
                        wishlistData as Record<string, unknown>,
                        user.uid,
                        productData,
                      ),
                    );
                }
            }

            setItems(wishlistItems)
        } catch (error) {
            console.error('Error fetching wishlist:', error)
            setItems([])
        }
        setIsLoading(false)
    }, [user])

    useEffect(() => {
        fetchWishlist()
    }, [fetchWishlist])

    const isInWishlist = (productId: string) => {
        return items.some(item => item.product_id === productId)
    }

    const addToWishlist = async (productId: string) => {
        if (!user) {
            toast.error('Please sign in to add items to wishlist')
            return
        }

        try {
            const wishlistItemRef = doc(db, 'users', user.uid, 'wishlist', productId)
            const existingItem = await getDoc(wishlistItemRef)

            if (existingItem.exists()) {
                toast.info('Already in wishlist')
                return
            }

            await setDoc(wishlistItemRef, {
                product_id: productId,
                created_at: serverTimestamp(),
                updated_at: serverTimestamp(),
            })

            toast.success('Added to wishlist')
            await fetchWishlist()
        } catch (error) {
            toast.error('Failed to add to wishlist')
            console.error('Error adding to wishlist:', error)
        }
    }

    const removeFromWishlist = async (productId: string) => {
        if (!user) return

        try {
            await deleteDoc(doc(db, 'users', user.uid, 'wishlist', productId))
            toast.success('Removed from wishlist')
            await fetchWishlist()
        } catch (error) {
            toast.error('Failed to remove from wishlist')
            console.error('Error removing from wishlist:', error)
        }
    }

    const toggleWishlist = async (productId: string) => {
        if (isInWishlist(productId)) {
            await removeFromWishlist(productId)
        } else {
            await addToWishlist(productId)
        }
    }

    return (
        <WishlistContext.Provider
            value={{
                items,
                isLoading,
                isInWishlist,
                addToWishlist,
                removeFromWishlist,
                toggleWishlist,
                refreshWishlist: fetchWishlist,
            }}
        >
            {children}
        </WishlistContext.Provider>
    )
}

export function useWishlist() {
    const context = useContext(WishlistContext)
    if (context === undefined) {
        throw new Error('useWishlist must be used within a WishlistProvider')
    }
    return context
}
