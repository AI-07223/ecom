"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useRef,
} from "react";
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
  increment,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase/config";
import { CartItem, Product } from "@/types/database.types";
import { timestampToString } from "@/lib/firebase/utils";
import { convertProductData } from "@/lib/firebase/converters";
import { useAuth } from "./AuthProvider";
import { toast } from "sonner";
import { Undo2, RotateCcw } from "lucide-react";

interface Coupon {
  code: string;
  discount_type: "percentage" | "fixed";
  discount_value: number;
}

interface CartContextType {
  items: (CartItem & { product: Product })[];
  itemCount: number;
  subtotal: number;
  isLoading: boolean;
  appliedCoupon: Coupon | null;
  discountAmount: number;
  addToCart: (productId: string, quantity?: number) => Promise<void>;
  removeFromCart: (productId: string) => Promise<void>;
  updateQuantity: (productId: string, quantity: number) => Promise<void>;
  clearCart: () => Promise<void>;
  refreshCart: () => Promise<void>;
  applyCoupon: (coupon: Coupon) => void;
  removeCoupon: () => void;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

// Helper to convert Firestore cart data to CartItem type
function convertCartItemData(
  docId: string,
  data: Record<string, unknown>,
  userId: string,
  product?: Product,
): CartItem & { product: Product } {
  return {
    id: docId,
    user_id: userId,
    product_id: data.product_id as string,
    quantity: data.quantity as number,
    created_at: timestampToString(data.created_at as Parameters<typeof timestampToString>[0]),
    updated_at: timestampToString(data.updated_at as Parameters<typeof timestampToString>[0]),
    product: product!,
  };
}

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<(CartItem & { product: Product })[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [appliedCoupon, setAppliedCoupon] = useState<Coupon | null>(null);
  const { user } = useAuth();
  
  // Keep track of removed items for undo
  const removedItemsRef = useRef<Map<string, CartItem & { product: Product }>>(new Map());

  const applyCoupon = (coupon: Coupon) => {
    setAppliedCoupon(coupon);
  };

  const removeCoupon = () => {
    setAppliedCoupon(null);
  };

  const calculateDiscount = (subtotalValue: number) => {
    if (!appliedCoupon) return 0;
    if (appliedCoupon.discount_type === "percentage") {
      return Math.round(subtotalValue * (appliedCoupon.discount_value / 100));
    }
    return appliedCoupon.discount_value;
  };

  const fetchCart = useCallback(async () => {
    if (!user) {
      setItems([]);
      setIsLoading(false);
      return;
    }

    try {
      const cartRef = collection(db, "users", user.uid, "cart");
      const cartSnap = await getDocs(
        query(cartRef, orderBy("created_at", "desc")),
      );

      if (cartSnap.empty) {
        setItems([]);
        setIsLoading(false);
        return;
      }

      // Batch-fetch all products instead of N+1 individual queries
      const productIds = cartSnap.docs.map(d => d.data().product_id as string);
      const productMap = new Map<string, Product>();

      // Firestore 'in' queries support up to 30 values, chunk if needed
      for (let i = 0; i < productIds.length; i += 30) {
        const chunk = productIds.slice(i, i + 30);
        const productsSnap = await getDocs(
          query(collection(db, "products"), where(documentId(), "in", chunk)),
        );
        for (const productDoc of productsSnap.docs) {
          productMap.set(
            productDoc.id,
            convertProductData(productDoc.id, productDoc.data() as Record<string, unknown>),
          );
        }
      }

      const cartItems: (CartItem & { product: Product })[] = [];
      for (const cartDoc of cartSnap.docs) {
        const cartData = cartDoc.data();
        const product = productMap.get(cartData.product_id);
        if (product) {
          cartItems.push(
            convertCartItemData(cartDoc.id, cartData as Record<string, unknown>, user.uid, product),
          );
        }
      }

      setItems(cartItems);
    } catch (error) {
      console.error("Error fetching cart:", error);
      setItems([]);
    }
    setIsLoading(false);
  }, [user]);

  useEffect(() => {
    fetchCart();
  }, [fetchCart]);

  const addToCart = async (productId: string, quantity: number = 1) => {
    if (!user) {
      toast.error("Please sign in to add items to cart");
      return;
    }

    try {
      // Fetch product to check stock
      const productRef = doc(db, "products", productId);
      const productSnap = await getDoc(productRef);

      if (!productSnap.exists()) {
        toast.error("Product not found");
        return;
      }

      const productData = productSnap.data();
      const availableStock = productData.quantity;

      const cartItemRef = doc(db, "users", user.uid, "cart", productId);
      const existingItem = await getDoc(cartItemRef);
      const currentCartQty = existingItem.exists() ? existingItem.data().quantity : 0;

      // Check if adding would exceed stock
      if (currentCartQty + quantity > availableStock) {
        if (availableStock === 0) {
          toast.error("Product is out of stock");
        } else if (currentCartQty >= availableStock) {
          toast.error(`You already have the maximum available quantity (${availableStock}) in your cart`);
        } else {
          toast.error(`Only ${availableStock - currentCartQty} more items available`);
        }
        return;
      }

      if (existingItem.exists()) {
        // Use increment() for atomic update - prevents race condition with rapid clicks
        await setDoc(
          cartItemRef,
          {
            product_id: productId,
            quantity: increment(quantity),
            updated_at: serverTimestamp(),
          },
          { merge: true },
        );
        toast.success("Cart updated");
      } else {
        await setDoc(cartItemRef, {
          product_id: productId,
          quantity,
          created_at: serverTimestamp(),
          updated_at: serverTimestamp(),
        });
        toast.success("Added to cart");
      }

      await fetchCart();
    } catch (error) {
      toast.error("Failed to add to cart", {
        action: {
          label: (
            <span className="flex items-center gap-1">
              <RotateCcw className="w-3 h-3" />
              Retry
            </span>
          ) as unknown as string,
          onClick: () => addToCart(productId, quantity),
        },
      });
      console.error("Error adding to cart:", error);
    }
  };

  const removeFromCart = async (productId: string, showUndo = true) => {
    if (!user) return;

    try {
      // Find the item before removing it
      const itemToRemove = items.find(item => item.product_id === productId);
      
      if (itemToRemove) {
        // Store for potential undo
        removedItemsRef.current.set(productId, itemToRemove);
      }
      
      await deleteDoc(doc(db, "users", user.uid, "cart", productId));
      await fetchCart();
      
      if (showUndo && itemToRemove) {
        // Show toast with undo action
        toast.success("Item removed from cart", {
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
        toast.success("Item removed");
      }
    } catch (error) {
      toast.error("Failed to remove item", {
        action: {
          label: (
            <span className="flex items-center gap-1">
              <RotateCcw className="w-3 h-3" />
              Retry
            </span>
          ) as unknown as string,
          onClick: () => removeFromCart(productId, showUndo),
        },
      });
      console.error("Error removing from cart:", error);
    }
  };
  
  const handleUndoRemove = async (productId: string) => {
    if (!user) return;
    
    const removedItem = removedItemsRef.current.get(productId);
    if (!removedItem) {
      toast.error("Cannot undo - item data not found");
      return;
    }
    
    try {
      // Restore the item
      await setDoc(
        doc(db, "users", user.uid, "cart", productId),
        {
          product_id: productId,
          quantity: removedItem.quantity,
          created_at: serverTimestamp(),
          updated_at: serverTimestamp(),
        }
      );
      
      await fetchCart();
      toast.success("Item restored to cart");
      
      // Clean up
      removedItemsRef.current.delete(productId);
    } catch (error) {
      toast.error("Failed to restore item");
      console.error("Error restoring item to cart:", error);
    }
  };

  const updateQuantity = async (productId: string, quantity: number) => {
    if (!user) return;

    if (quantity <= 0) {
      await removeFromCart(productId);
      return;
    }

    try {
      await setDoc(
        doc(db, "users", user.uid, "cart", productId),
        {
          quantity,
          updated_at: serverTimestamp(),
        },
        { merge: true },
      );
      await fetchCart();
    } catch (error) {
      toast.error("Failed to update quantity");
      console.error("Error updating quantity:", error);
    }
  };

  const clearCart = async () => {
    if (!user) return;

    try {
      const cartRef = collection(db, "users", user.uid, "cart");
      const cartSnap = await getDocs(cartRef);
      
      // Store all items for potential undo
      const clearedItems = items.map(item => ({
        productId: item.product_id,
        quantity: item.quantity,
        product: item.product,
      }));

      const deletePromises = cartSnap.docs.map((doc) => deleteDoc(doc.ref));
      await Promise.all(deletePromises);

      toast.success("Cart cleared", {
        action: clearedItems.length > 0 ? {
          label: (
            <span className="flex items-center gap-1">
              <Undo2 className="w-3 h-3" />
              Undo
            </span>
          ) as unknown as string,
          onClick: async () => {
            try {
              for (const item of clearedItems) {
                await setDoc(
                  doc(db, "users", user.uid, "cart", item.productId),
                  {
                    product_id: item.productId,
                    quantity: item.quantity,
                    created_at: serverTimestamp(),
                    updated_at: serverTimestamp(),
                  }
                );
              }
              await fetchCart();
              toast.success("Cart restored");
            } catch (error) {
              toast.error("Failed to restore cart");
              console.error("Error restoring cart:", error);
            }
          },
        } : undefined,
        duration: 5000,
      });
      setItems([]);
    } catch (error) {
      toast.error("Failed to clear cart", {
        action: {
          label: (
            <span className="flex items-center gap-1">
              <RotateCcw className="w-3 h-3" />
              Retry
            </span>
          ) as unknown as string,
          onClick: () => clearCart(),
        },
      });
      console.error("Error clearing cart:", error);
    }
  };

  const itemCount = items.reduce((total, item) => total + item.quantity, 0);
  const subtotal = items.reduce(
    (total, item) => total + item.product.price * item.quantity,
    0,
  );
  const discountAmount = calculateDiscount(subtotal);

  return (
    <CartContext.Provider
      value={{
        items,
        itemCount,
        subtotal,
        isLoading,
        appliedCoupon,
        discountAmount,
        addToCart,
        removeFromCart,
        updateQuantity,
        clearCart,
        refreshCart: fetchCart,
        applyCoupon,
        removeCoupon,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (context === undefined) {
    throw new Error("useCart must be used within a CartProvider");
  }
  return context;
}
