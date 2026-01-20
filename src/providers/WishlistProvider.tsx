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
                    wishlistItems.push({
                        id: wishlistDoc.id,
                        user_id: user.uid,
                        product_id: wishlistData.product_id,
                        created_at: wishlistData.created_at?.toDate?.()?.toISOString() || new Date().toISOString(),
                        product: { id: productSnap.id, ...productSnap.data() } as Product,
                    })
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
