"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
} from "react";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase/config";
import { CartItem, Product } from "@/types/database.types";
import { useAuth } from "./AuthProvider";
import { toast } from "sonner";

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

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<(CartItem & { product: Product })[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [appliedCoupon, setAppliedCoupon] = useState<Coupon | null>(null);
  const { user } = useAuth();

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

      const cartItems: (CartItem & { product: Product })[] = [];

      for (const cartDoc of cartSnap.docs) {
        const cartData = cartDoc.data();
        const productRef = doc(db, "products", cartData.product_id);
        const productSnap = await getDoc(productRef);

        if (productSnap.exists()) {
          cartItems.push({
            id: cartDoc.id,
            user_id: user.uid,
            product_id: cartData.product_id,
            quantity: cartData.quantity,
            created_at:
              cartData.created_at?.toDate?.()?.toISOString() ||
              new Date().toISOString(),
            updated_at:
              cartData.updated_at?.toDate?.()?.toISOString() ||
              new Date().toISOString(),
            product: { id: productSnap.id, ...productSnap.data() } as Product,
          });
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
      const cartItemRef = doc(db, "users", user.uid, "cart", productId);
      const existingItem = await getDoc(cartItemRef);

      if (existingItem.exists()) {
        await setDoc(
          cartItemRef,
          {
            product_id: productId,
            quantity: existingItem.data().quantity + quantity,
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
      toast.error("Failed to add to cart");
      console.error("Error adding to cart:", error);
    }
  };

  const removeFromCart = async (productId: string) => {
    if (!user) return;

    try {
      await deleteDoc(doc(db, "users", user.uid, "cart", productId));
      toast.success("Item removed");
      await fetchCart();
    } catch (error) {
      toast.error("Failed to remove item");
      console.error("Error removing from cart:", error);
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

      const deletePromises = cartSnap.docs.map((doc) => deleteDoc(doc.ref));
      await Promise.all(deletePromises);

      toast.success("Cart cleared");
      setItems([]);
    } catch (error) {
      toast.error("Failed to clear cart");
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
