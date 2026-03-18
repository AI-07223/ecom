'use client'

import { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react'
import {
    collection,
    doc,
    getDoc,
    getDocs,
    setDoc,
    deleteDoc,
    query,
    orderBy,
    where,
    documentId,
    serverTimestamp,
} from 'firebase/firestore'
import { db } from '@/lib/firebase/config'
import { WishlistItem, Product } from '@/types/database.types'
import { timestampToString } from '@/lib/firebase/utils'
import { convertProductData } from '@/lib/firebase/converters'
import { useAuth } from './AuthProvider'
import { toast } from 'sonner'
import { Undo2, RotateCcw } from 'lucide-react'

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
    
    // Keep track of removed items for undo
    const removedItemsRef = useRef<Map<string, Product>>(new Map());

    const fetchWishlist = useCallback(async () => {
        if (!user) {
            setItems([])
            setIsLoading(false)
            return
        }

        try {
            const wishlistRef = collection(db, 'users', user.uid, 'wishlist')
            const wishlistSnap = await getDocs(query(wishlistRef, orderBy('created_at', 'desc')))

            if (wishlistSnap.empty) {
                setItems([])
                setIsLoading(false)
                return
            }

            // Batch-fetch all products instead of N+1 individual queries
            const productIds = wishlistSnap.docs.map(d => d.data().product_id as string)
            const productMap = new Map<string, Product>()

            // Firestore 'in' queries support up to 30 values, chunk if needed
            for (let i = 0; i < productIds.length; i += 30) {
                const chunk = productIds.slice(i, i + 30)
                const productsSnap = await getDocs(
                    query(collection(db, 'products'), where(documentId(), 'in', chunk))
                )
                for (const productDoc of productsSnap.docs) {
                    productMap.set(
                        productDoc.id,
                        convertProductData(productDoc.id, productDoc.data() as Record<string, unknown>),
                    )
                }
            }

            const wishlistItems: (WishlistItem & { product: Product })[] = []
            for (const wishlistDoc of wishlistSnap.docs) {
                const wishlistData = wishlistDoc.data()
                const product = productMap.get(wishlistData.product_id)
                if (product) {
                    wishlistItems.push(
                        convertWishlistItemData(
                            wishlistDoc.id,
                            wishlistData as Record<string, unknown>,
                            user.uid,
                            product,
                        ),
                    )
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

            toast.success('Added to wishlist', {
                action: {
                    label: 'View',
                    onClick: () => {
                        window.location.href = '/wishlist'
                    },
                },
                duration: 3000,
            })
            await fetchWishlist()
        } catch (error) {
            toast.error('Failed to add to wishlist', {
                action: {
                    label: (
                        <span className="flex items-center gap-1">
                            <RotateCcw className="w-3 h-3" />
                            Retry
                        </span>
                    ) as unknown as string,
                    onClick: () => addToWishlist(productId),
                },
            })
            console.error('Error adding to wishlist:', error)
        }
    }

    const removeFromWishlist = async (productId: string, showUndo = true) => {
        if (!user) return

        try {
            // Find the item before removing it
            const itemToRemove = items.find(item => item.product_id === productId);
            
            if (itemToRemove) {
                // Store for potential undo
                removedItemsRef.current.set(productId, itemToRemove.product);
            }
            
            await deleteDoc(doc(db, 'users', user.uid, 'wishlist', productId))
            await fetchWishlist()
            
            if (showUndo) {
                // Show toast with undo action
                toast.success('Removed from wishlist', {
                    action: {
                        label: (
                            <span className="flex items-center gap-1">
                                <Undo2 className="w-3 h-3" />
                                Undo
                            </span>
                        ) as unknown as string,
                        onClick: () => handleUndoRemove(productId),
                    },
                    duration: 5000,
                });
            } else {
                toast.success('Removed from wishlist');
            }
        } catch (error) {
            toast.error('Failed to remove from wishlist', {
                action: {
                    label: (
                        <span className="flex items-center gap-1">
                            <RotateCcw className="w-3 h-3" />
                            Retry
                        </span>
                    ) as unknown as string,
                    onClick: () => removeFromWishlist(productId, showUndo),
                },
            })
            console.error('Error removing from wishlist:', error)
        }
    }
    
    const handleUndoRemove = async (productId: string) => {
        if (!user) return;
        
        const removedProduct = removedItemsRef.current.get(productId);
        if (!removedProduct) {
            toast.error('Cannot undo - item data not found');
            return;
        }
        
        try {
            // Restore the item
            await setDoc(
                doc(db, 'users', user.uid, 'wishlist', productId),
                {
                    product_id: productId,
                    created_at: serverTimestamp(),
                    updated_at: serverTimestamp(),
                }
            );
            
            await fetchWishlist();
            toast.success('Restored to wishlist');
            
            // Clean up
            removedItemsRef.current.delete(productId);
        } catch (error) {
            toast.error('Failed to restore item');
            console.error('Error restoring item to wishlist:', error);
        }
    };

    const toggleWishlist = async (productId: string) => {
        if (isInWishlist(productId)) {
            await removeFromWishlist(productId, true)
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
