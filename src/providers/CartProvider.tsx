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

// --- Guest cart localStorage helpers ---

const GUEST_CART_KEY = "guest_cart";

type GuestCartEntry = { product_id: string; quantity: number };

function getGuestCart(): GuestCartEntry[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(GUEST_CART_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function setGuestCart(entries: GuestCartEntry[]): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(GUEST_CART_KEY, JSON.stringify(entries));
  } catch {
    // localStorage full or unavailable — ignore silently
  }
}

function clearGuestCartStorage(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(GUEST_CART_KEY);
  } catch {
    // ignore
  }
}

// --- Batch product fetcher (shared by guest and authenticated paths) ---

async function batchFetchProducts(productIds: string[]): Promise<Map<string, Product>> {
  const productMap = new Map<string, Product>();
  if (productIds.length === 0) return productMap;

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
  return productMap;
}

// --- Types ---

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

// Helper to build a cart item from a guest entry + product
function guestEntryToCartItem(
  entry: GuestCartEntry,
  product: Product,
): CartItem & { product: Product } {
  const now = new Date().toISOString();
  return {
    id: entry.product_id,
    user_id: "guest",
    product_id: entry.product_id,
    quantity: entry.quantity,
    created_at: now,
    updated_at: now,
    product,
  };
}

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<(CartItem & { product: Product })[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [appliedCoupon, setAppliedCoupon] = useState<Coupon | null>(null);
  const { user } = useAuth();

  // Track previous user for detecting login transitions (guest → authenticated)
  const prevUserRef = useRef<typeof user>(undefined);

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

  // --- Fetch cart (guest or authenticated) ---

  const fetchCart = useCallback(async () => {
    if (!user) {
      // Guest: read from localStorage, fetch product details from Firestore
      const guestEntries = getGuestCart();
      if (guestEntries.length === 0) {
        setItems([]);
        setIsLoading(false);
        return;
      }

      try {
        const productIds = guestEntries.map((e) => e.product_id);
        const productMap = await batchFetchProducts(productIds);

        const cartItems: (CartItem & { product: Product })[] = [];
        for (const entry of guestEntries) {
          const product = productMap.get(entry.product_id);
          if (product) {
            cartItems.push(guestEntryToCartItem(entry, product));
          }
        }

        // Clean up entries for products that no longer exist
        if (cartItems.length < guestEntries.length) {
          const validIds = new Set(cartItems.map((i) => i.product_id));
          setGuestCart(guestEntries.filter((e) => validIds.has(e.product_id)));
        }

        setItems(cartItems);
      } catch (error) {
        console.error("Error fetching guest cart products:", error);
        setItems([]);
      }
      setIsLoading(false);
      return;
    }

    // Authenticated: read from Firestore subcollection
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

      const productIds = cartSnap.docs.map((d) => d.data().product_id as string);
      const productMap = await batchFetchProducts(productIds);

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

  // --- Merge guest cart into Firestore on login ---

  useEffect(() => {
    const prevUser = prevUserRef.current;
    prevUserRef.current = user;

    // Detect login transition: previous user was null/undefined, current user exists
    if (user && !prevUser) {
      const guestEntries = getGuestCart();
      if (guestEntries.length === 0) return;

      (async () => {
        try {
          for (const entry of guestEntries) {
            const cartItemRef = doc(db, "users", user.uid, "cart", entry.product_id);
            const existing = await getDoc(cartItemRef);

            if (existing.exists()) {
              // Merge: increment quantity, capped at available stock
              const productSnap = await getDoc(doc(db, "products", entry.product_id));
              if (!productSnap.exists()) continue;
              const maxStock = productSnap.data().quantity as number;
              const currentQty = existing.data().quantity as number;
              const newQty = Math.min(currentQty + entry.quantity, maxStock);
              if (newQty > currentQty) {
                await setDoc(cartItemRef, { quantity: newQty, updated_at: serverTimestamp() }, { merge: true });
              }
            } else {
              // New item: add to Firestore cart
              await setDoc(cartItemRef, {
                product_id: entry.product_id,
                quantity: entry.quantity,
                created_at: serverTimestamp(),
                updated_at: serverTimestamp(),
              });
            }
          }

          clearGuestCartStorage();
          await fetchCart();
          if (guestEntries.length > 0) {
            toast.success(`${guestEntries.length} item${guestEntries.length > 1 ? "s" : ""} from your guest cart merged`);
          }
        } catch (error) {
          console.error("Error merging guest cart:", error);
        }
      })();
    }
  }, [user, fetchCart]);

  // --- Add to cart (guest or authenticated) ---

  const addToCart = async (productId: string, quantity: number = 1) => {
    try {
      // Fetch product to check stock (required for both guest and authenticated)
      const productRef = doc(db, "products", productId);
      const productSnap = await getDoc(productRef);

      if (!productSnap.exists()) {
        toast.error("Product not found");
        return;
      }

      const productData = productSnap.data();
      const availableStock = productData.quantity as number;

      if (!user) {
        // Guest cart: localStorage
        const guestEntries = getGuestCart();
        const existing = guestEntries.find((e) => e.product_id === productId);
        const currentQty = existing ? existing.quantity : 0;

        if (currentQty + quantity > availableStock) {
          if (availableStock === 0) {
            toast.error("Product is out of stock");
          } else if (currentQty >= availableStock) {
            toast.error(`You already have the maximum available quantity (${availableStock}) in your cart`);
          } else {
            toast.error(`Only ${availableStock - currentQty} more items available`);
          }
          return;
        }

        if (existing) {
          existing.quantity += quantity;
        } else {
          guestEntries.push({ product_id: productId, quantity });
        }
        setGuestCart(guestEntries);
        await fetchCart();
        toast.success(existing ? "Cart updated" : "Added to cart");
        return;
      }

      // Authenticated cart: Firestore subcollection
      const cartItemRef = doc(db, "users", user.uid, "cart", productId);
      const existingItem = await getDoc(cartItemRef);
      const currentCartQty = existingItem.exists() ? existingItem.data().quantity : 0;

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

  // --- Remove from cart ---

  const removeFromCart = async (productId: string, showUndo = true) => {
    try {
      const itemToRemove = items.find((item) => item.product_id === productId);
      if (itemToRemove) {
        removedItemsRef.current.set(productId, itemToRemove);
      }

      if (!user) {
        // Guest: remove from localStorage
        const guestEntries = getGuestCart();
        setGuestCart(guestEntries.filter((e) => e.product_id !== productId));
        await fetchCart();
      } else {
        // Authenticated: remove from Firestore
        await deleteDoc(doc(db, "users", user.uid, "cart", productId));
        await fetchCart();
      }

      if (showUndo && itemToRemove) {
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
    const removedItem = removedItemsRef.current.get(productId);
    if (!removedItem) {
      toast.error("Cannot undo - item data not found");
      return;
    }

    try {
      if (!user) {
        // Guest: re-add to localStorage
        const guestEntries = getGuestCart();
        guestEntries.push({ product_id: productId, quantity: removedItem.quantity });
        setGuestCart(guestEntries);
      } else {
        // Authenticated: re-add to Firestore
        await setDoc(
          doc(db, "users", user.uid, "cart", productId),
          {
            product_id: productId,
            quantity: removedItem.quantity,
            created_at: serverTimestamp(),
            updated_at: serverTimestamp(),
          },
        );
      }

      await fetchCart();
      toast.success("Item restored to cart");
      removedItemsRef.current.delete(productId);
    } catch (error) {
      toast.error("Failed to restore item");
      console.error("Error restoring item to cart:", error);
    }
  };

  // --- Update quantity ---

  const updateQuantity = async (productId: string, quantity: number) => {
    if (quantity <= 0) {
      await removeFromCart(productId);
      return;
    }

    try {
      if (!user) {
        // Guest: update localStorage
        const guestEntries = getGuestCart();
        const entry = guestEntries.find((e) => e.product_id === productId);
        if (entry) {
          entry.quantity = quantity;
          setGuestCart(guestEntries);
        }
        await fetchCart();
      } else {
        // Authenticated: update Firestore
        await setDoc(
          doc(db, "users", user.uid, "cart", productId),
          {
            quantity,
            updated_at: serverTimestamp(),
          },
          { merge: true },
        );
        await fetchCart();
      }
    } catch (error) {
      toast.error("Failed to update quantity");
      console.error("Error updating quantity:", error);
    }
  };

  // --- Clear cart ---

  const clearCart = async () => {
    try {
      const clearedItems = items.map((item) => ({
        productId: item.product_id,
        quantity: item.quantity,
        product: item.product,
      }));

      if (!user) {
        // Guest: clear localStorage
        clearGuestCartStorage();
        setItems([]);
      } else {
        // Authenticated: delete all Firestore docs
        const cartRef = collection(db, "users", user.uid, "cart");
        const cartSnap = await getDocs(cartRef);
        const deletePromises = cartSnap.docs.map((d) => deleteDoc(d.ref));
        await Promise.all(deletePromises);
        setItems([]);
      }

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
              if (!user) {
                // Guest: restore to localStorage
                setGuestCart(clearedItems.map((i) => ({ product_id: i.productId, quantity: i.quantity })));
              } else {
                // Authenticated: restore to Firestore
                for (const item of clearedItems) {
                  await setDoc(
                    doc(db, "users", user.uid, "cart", item.productId),
                    {
                      product_id: item.productId,
                      quantity: item.quantity,
                      created_at: serverTimestamp(),
                      updated_at: serverTimestamp(),
                    },
                  );
                }
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
