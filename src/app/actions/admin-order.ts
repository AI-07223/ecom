"use server";

import { adminDb, adminAuth } from "@/lib/firebase/admin";
import { FieldValue } from "firebase-admin/firestore";
import { sendOrderStatusUpdateEmail } from "@/lib/email";
import { logger } from "@/lib/logger";
import type { OrderStatus, PaymentStatus, OrderItem } from "@/types/database.types";

// Helper: verify the caller is an admin
async function verifyAdmin(idToken: string): Promise<{ uid: string } | { error: string }> {
  let decoded;
  try {
    decoded = await adminAuth.verifyIdToken(idToken);
  } catch {
    return { error: "Not authenticated" };
  }

  const profileSnap = await adminDb.collection("profiles").doc(decoded.uid).get();
  if (!profileSnap.exists || profileSnap.data()?.role !== "admin") {
    return { error: "Admin access required" };
  }

  return { uid: decoded.uid };
}

// --- Update order status ---

export async function updateOrderStatus(input: {
  order_id: string;
  id_token: string;
  new_status: OrderStatus;
}): Promise<{ success: boolean; error?: string }> {
  const auth = await verifyAdmin(input.id_token);
  if ("error" in auth) return { success: false, error: auth.error };

  const orderRef = adminDb.collection("orders").doc(input.order_id);
  const orderSnap = await orderRef.get();
  if (!orderSnap.exists) {
    return { success: false, error: "Order not found" };
  }

  const orderData = orderSnap.data()!;

  await orderRef.update({
    status: input.new_status,
    updated_at: FieldValue.serverTimestamp(),
  });

  logger.info("[updateOrderStatus] Status updated", {
    order_id: input.order_id,
    old_status: orderData.status,
    new_status: input.new_status,
    admin_uid: auth.uid,
  });

  // Send status email to customer (non-blocking)
  try {
    const customerProfile = await adminDb.collection("profiles").doc(orderData.user_id).get();
    const customerEmail = customerProfile.data()?.email;
    const customerName = customerProfile.data()?.full_name || "Customer";

    if (customerEmail) {
      const items = (orderData.items as OrderItem[]).map((item) => ({
        name: item.product_name,
        quantity: item.quantity,
        price: item.price,
      }));

      sendOrderStatusUpdateEmail({
        orderId: input.order_id,
        customerName,
        customerEmail,
        newStatus: input.new_status,
        items,
        total: orderData.total,
      }).catch((err) => logger.error("[updateOrderStatus] Email send failed", err));
    }
  } catch (err) {
    logger.error("[updateOrderStatus] Email setup error", err);
  }

  return { success: true };
}

// --- Update payment status ---

export async function updatePaymentStatus(input: {
  order_id: string;
  id_token: string;
  new_payment_status: PaymentStatus;
}): Promise<{ success: boolean; error?: string }> {
  const auth = await verifyAdmin(input.id_token);
  if ("error" in auth) return { success: false, error: auth.error };

  const orderRef = adminDb.collection("orders").doc(input.order_id);
  const orderSnap = await orderRef.get();
  if (!orderSnap.exists) {
    return { success: false, error: "Order not found" };
  }

  const oldStatus = orderSnap.data()!.payment_status;

  await orderRef.update({
    payment_status: input.new_payment_status,
    updated_at: FieldValue.serverTimestamp(),
  });

  logger.info("[updatePaymentStatus] Payment status updated", {
    order_id: input.order_id,
    old_status: oldStatus,
    new_status: input.new_payment_status,
    admin_uid: auth.uid,
  });

  return { success: true };
}

// --- Update order items (recalculate totals server-side) ---

export async function updateOrderItems(input: {
  order_id: string;
  id_token: string;
  items: OrderItem[];
}): Promise<{ success: boolean; error?: string }> {
  const auth = await verifyAdmin(input.id_token);
  if ("error" in auth) return { success: false, error: auth.error };

  const orderRef = adminDb.collection("orders").doc(input.order_id);
  const orderSnap = await orderRef.get();
  if (!orderSnap.exists) {
    return { success: false, error: "Order not found" };
  }

  const orderData = orderSnap.data()!;

  // Recalculate totals server-side (never trust client-computed values)
  const newSubtotal = input.items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const newShipping = newSubtotal >= 999 ? 0 : 99;
  const discount = orderData.discount || 0;
  const newTotal = newSubtotal - discount + newShipping;

  await orderRef.update({
    items: input.items,
    subtotal: newSubtotal,
    shipping: newShipping,
    total: newTotal,
    updated_at: FieldValue.serverTimestamp(),
  });

  logger.info("[updateOrderItems] Items updated", {
    order_id: input.order_id,
    item_count: input.items.length,
    new_total: newTotal,
    admin_uid: auth.uid,
  });

  return { success: true };
}
