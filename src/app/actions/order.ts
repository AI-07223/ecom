"use server";

import { adminDb } from "@/lib/firebase/admin";
import { FieldValue, Timestamp } from "firebase-admin/firestore";

interface OrderItem {
  product_id: string;
  quantity: number;
}

interface ShippingAddress {
  full_name: string;
  phone: string;
  address: string;
  city: string;
  state: string;
  postal_code: string;
  country: string;
}

interface CreateOrderInput {
  user_id: string;
  items: OrderItem[];
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
  try {
    const {
      user_id,
      items,
      shipping_address,
      coupon_code,
      gst_number,
      payment_method,
    } = input;

    // Validate input
    if (!user_id || !items || items.length === 0) {
      return { success: false, error: "Invalid order data" };
    }

    if (
      !shipping_address.full_name ||
      !shipping_address.phone ||
      !shipping_address.address ||
      !shipping_address.city ||
      !shipping_address.state ||
      !shipping_address.postal_code
    ) {
      return { success: false, error: "Please fill in all address fields" };
    }

    // Fetch all product details from database (source of truth for prices)
    const productPromises = items.map(async (item): Promise<ProductData> => {
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
    const orderItems = products.map((product) => {
      const itemTotal = product.price * product.requested_quantity;
      subtotal += itemTotal;
      return {
        product_id: product.id,
        product_name: product.name,
        product_image: product.thumbnail || product.images?.[0] || null,
        quantity: product.requested_quantity,
        price: product.price, // Database price
        total: itemTotal,
      };
    });

    // Apply coupon discount if provided
    let discount = 0;
    let validCouponCode = null;

    if (coupon_code) {
      const couponsSnapshot = await adminDb
        .collection("coupons")
        .where("code", "==", coupon_code.toUpperCase())
        .get();

      if (!couponsSnapshot.empty) {
        const couponData = couponsSnapshot.docs[0].data();

        if (couponData.is_active) {
          // Check minimum order value
          const minOrderValue =
            couponData.min_order_amount || couponData.min_order_value || 0;

          if (subtotal >= minOrderValue) {
            if (couponData.discount_type === "percentage") {
              discount = Math.round(
                subtotal * (couponData.discount_value / 100),
              );
              // Apply max discount if set
              if (
                couponData.max_discount_amount &&
                discount > couponData.max_discount_amount
              ) {
                discount = couponData.max_discount_amount;
              }
            } else {
              discount = couponData.discount_value;
            }
            validCouponCode = coupon_code.toUpperCase();
          }
        }
      }
    }

    // Calculate shipping
    const shipping = subtotal >= 999 ? 0 : 99;

    // Calculate final total
    const total = subtotal - discount + shipping;

    // Generate order ID
    const orderId = `ORD-${Date.now()}`;

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
        coupon_code: validCouponCode,
        gst_number: gst_number?.trim() || null,
        total,
        shipping_address,
        items: orderItems,
        created_at: FieldValue.serverTimestamp(),
        updated_at: FieldValue.serverTimestamp(),
      });

      // Increment coupon usage if used
      if (validCouponCode) {
        const couponSnapshot = await adminDb
          .collection("coupons")
          .where("code", "==", validCouponCode)
          .get();

        if (!couponSnapshot.empty) {
          const couponRef = couponSnapshot.docs[0].ref;
          const currentUsed = couponSnapshot.docs[0].data().used_count || 0;
          transaction.update(couponRef, {
            used_count: currentUsed + 1,
            updated_at: FieldValue.serverTimestamp(),
          });
        }
      }
    });

    return { success: true, order_id: orderId };
  } catch (error) {
    console.error("Error creating order:", error);
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Failed to create order. Please try again.",
    };
  }
}
