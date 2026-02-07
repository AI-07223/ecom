"use server";

import { adminDb, adminAuth } from "@/lib/firebase/admin";
import { FieldValue } from "firebase-admin/firestore";
import type { OrderItem, ShippingAddress } from "@/types/database.types";

interface CreateOrderInput {
  user_id: string;
  id_token: string;
  items: { product_id: string; quantity: number }[];
  shipping_address: ShippingAddress;
  coupon_code?: string | null;
  gst_number?: string | null;
  payment_method?: "cod" | "online";
}

interface CreateOrderResult {
  success: boolean;
  order_id?: string;
  error?: string;
}

interface ProductData {
  id: string;
  name: string;
  price: number;
  quantity: number;
  is_active: boolean;
  thumbnail?: string | null;
  images?: string[];
  requested_quantity: number;
}

export async function createOrder(
  input: CreateOrderInput,
): Promise<CreateOrderResult> {
  console.log(
    "[createOrder] Starting with input:",
    JSON.stringify(input, null, 2),
  );
  try {
    const {
      user_id,
      items,
      shipping_address,
      coupon_code,
      gst_number,
      payment_method,
    } = input;

    // Verify authentication using the ID token from client
    let decodedToken;
    try {
      decodedToken = await adminAuth.verifyIdToken(input.id_token);
    } catch (error) {
      console.log("[createOrder] Authentication failed: invalid ID token", error);
      return { success: false, error: "Not authenticated" };
    }

    const authenticatedUserId = decodedToken.uid;

    // Verify the user is creating an order for themselves
    if (authenticatedUserId !== user_id) {
      console.log(
        "[createOrder] Authorization failed: user mismatch",
        { authenticatedUserId, requestedUserId: user_id },
      );
      return { success: false, error: "Cannot create order for another user" };
    }

    // Validate input
    if (!user_id || !items || items.length === 0) {
      console.log("[createOrder] Validation failed: invalid order data");
      return { success: false, error: "Invalid order data" };
    }

    if (
      !shipping_address.full_name ||
      !shipping_address.phone ||
      !shipping_address.street ||
      !shipping_address.city ||
      !shipping_address.state ||
      !shipping_address.postal_code
    ) {
      console.log("[createOrder] Validation failed: missing address fields");
      return { success: false, error: "Please fill in all address fields" };
    }

    console.log("[createOrder] Fetching product details...");
    // Fetch all product details from database (source of truth for prices)
    const productPromises = items.map(async (item): Promise<ProductData> => {
      console.log(`[createOrder] Fetching product ${item.product_id}`);
      const productDoc = await adminDb
        .collection("products")
        .doc(item.product_id)
        .get();
      if (!productDoc.exists) {
        throw new Error(`Product ${item.product_id} not found`);
      }
      const data = productDoc.data()!;
      return {
        id: productDoc.id,
        name: data.name as string,
        price: data.price as number,
        quantity: data.quantity as number,
        is_active: data.is_active as boolean,
        thumbnail: data.thumbnail as string | null | undefined,
        images: data.images as string[] | undefined,
        requested_quantity: item.quantity,
      };
    });

    const products = await Promise.all(productPromises);

    // Validate stock availability
    for (const product of products) {
      if (product.quantity < product.requested_quantity) {
        return {
          success: false,
          error: `Insufficient stock for "${product.name}". Only ${product.quantity} available.`,
        };
      }
      if (!product.is_active) {
        return {
          success: false,
          error: `"${product.name}" is no longer available.`,
        };
      }
    }

    // Calculate totals using DATABASE prices (not client-provided)
    let subtotal = 0;
    const orderItems: OrderItem[] = products.map((product) => {
      const itemTotal = product.price * product.requested_quantity;
      subtotal += itemTotal;
      return {
        product_id: product.id,
        product_name: product.name,
        product_image: product.thumbnail || product.images?.[0] || null,
        quantity: product.requested_quantity,
        price: product.price,
        total: itemTotal,
      };
    });

    // Apply coupon discount if provided
    let discount = 0;
    let validCouponCode: string | null = null;
    let couponRef: FirebaseFirestore.DocumentReference | null = null;

    if (coupon_code) {
      const couponsSnapshot = await adminDb
        .collection("coupons")
        .where("code", "==", coupon_code.toUpperCase())
        .get();

      if (!couponsSnapshot.empty) {
        const couponDoc = couponsSnapshot.docs[0];
        const couponData = couponDoc.data();
        couponRef = couponDoc.ref;

        // Validate coupon is active
        if (!couponData.is_active) {
          return { success: false, error: "Coupon is no longer active" };
        }

        // Validate expiration
        if (couponData.expires_at) {
          const expiryDate = couponData.expires_at.toDate
            ? couponData.expires_at.toDate()
            : new Date(couponData.expires_at);
          if (expiryDate < new Date()) {
            return { success: false, error: "Coupon has expired" };
          }
        }

        // Validate max uses
        const currentUses = couponData.used_count || 0;
        const maxUses = couponData.usage_limit;
        if (maxUses && currentUses >= maxUses) {
          return {
            success: false,
            error: "Coupon has reached its maximum usage limit",
          };
        }

        // Check minimum order value
        const minOrderValue = couponData.min_order_amount || 0;

        if (subtotal < minOrderValue) {
          return {
            success: false,
            error: `Minimum order value of ₹${minOrderValue} required for this coupon`,
          };
        }

        // Calculate discount
        if (couponData.discount_type === "percentage") {
          discount = Math.round(subtotal * (couponData.discount_value / 100));
          // Apply max discount if set
          const maxDiscount = couponData.max_discount_amount;
          if (maxDiscount && discount > maxDiscount) {
            discount = maxDiscount;
          }
        } else {
          discount = couponData.discount_value;
        }

        // Ensure discount doesn't exceed subtotal
        if (discount > subtotal) {
          discount = subtotal;
        }

        validCouponCode = coupon_code.toUpperCase();
      } else {
        return { success: false, error: "Invalid coupon code" };
      }
    }

    // Calculate shipping
    const shipping = subtotal >= 999 ? 0 : 99;

    // Calculate final total
    const total = subtotal - discount + shipping;

    // Generate order ID
    const orderId = `ORD-${Date.now()}`;

    console.log("[createOrder] Starting transaction...");
    // Use transaction to create order and update stock atomically
    await adminDb.runTransaction(async (transaction) => {
      // Decrement stock for each product
      for (const product of products) {
        const productRef = adminDb.collection("products").doc(product.id);
        const newQuantity = product.quantity - product.requested_quantity;
        transaction.update(productRef, {
          quantity: newQuantity,
          updated_at: FieldValue.serverTimestamp(),
        });
      }

      // Create the order
      const orderRef = adminDb.collection("orders").doc(orderId);
      transaction.set(orderRef, {
        user_id,
        order_number: orderId,
        status: "pending",
        payment_status: "pending",
        payment_method: payment_method || "cod",
        subtotal,
        shipping,
        discount,
        tax_amount: 0, // Set default tax amount
        currency: "INR", // Set default currency
        coupon_code: validCouponCode,
        gst_number: gst_number?.trim() || null,
        total,
        shipping_address,
        billing_address: null,
        notes: null,
        metadata: {},
        items: orderItems,
        created_at: FieldValue.serverTimestamp(),
        updated_at: FieldValue.serverTimestamp(),
      });
    });

    // Increment coupon usage outside transaction (after successful order creation)
    if (validCouponCode && couponRef) {
      try {
        const currentUsed = (await couponRef.get()).data()?.used_count || 0;
        await couponRef.update({
          used_count: currentUsed + 1,
          updated_at: FieldValue.serverTimestamp(),
        });
      } catch (couponError) {
        // Log but don't fail the order if coupon update fails
        console.error("Failed to update coupon usage:", couponError);
      }
    }

    return { success: true, order_id: orderId };
  } catch (error: unknown) {
    console.error("[createOrder] Error creating order:", error);
    let errorMessage = "Failed to create order. Please try again.";
    if (error instanceof Error) {
      errorMessage = error.message;
    }
    console.error("[createOrder] Error message:", errorMessage);
    return {
      success: false,
      error: errorMessage,
    };
  }
}
