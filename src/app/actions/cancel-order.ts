"use server";

import { adminDb, adminAuth } from "@/lib/firebase/admin";
import { FieldValue } from "firebase-admin/firestore";
import { logger } from "@/lib/logger";

interface CancelOrderInput {
  order_id: string;
  id_token: string;
}

interface CancelOrderResult {
  success: boolean;
  error?: string;
}

export async function cancelOrder(
  input: CancelOrderInput,
): Promise<CancelOrderResult> {
  const { order_id, id_token } = input;

  // Verify authentication
  let decodedToken;
  try {
    decodedToken = await adminAuth.verifyIdToken(id_token);
  } catch {
    logger.warn("[cancelOrder] Authentication failed: invalid ID token");
    return { success: false, error: "Not authenticated" };
  }

  const uid = decodedToken.uid;

  // Fetch the order
  const orderDoc = await adminDb.collection("orders").doc(order_id).get();
  if (!orderDoc.exists) {
    return { success: false, error: "Order not found" };
  }

  const orderData = orderDoc.data()!;

  // Validate ownership
  if (orderData.user_id !== uid) {
    logger.warn("[cancelOrder] Authorization failed: user mismatch", {
      uid,
      order_user_id: orderData.user_id,
    });
    return { success: false, error: "You can only cancel your own orders" };
  }

  // Validate status
  if (orderData.status !== "pending") {
    return {
      success: false,
      error: "Only pending orders can be cancelled. Your order is currently " + orderData.status + ".",
    };
  }

  logger.info("[cancelOrder] Starting cancellation transaction", { order_id, uid });

  try {
    await adminDb.runTransaction(async (transaction) => {
      // Re-read order inside transaction to confirm it's still pending
      const freshOrder = await transaction.get(adminDb.collection("orders").doc(order_id));
      if (!freshOrder.exists) {
        throw new Error("Order not found");
      }

      const freshData = freshOrder.data()!;
      if (freshData.status !== "pending") {
        throw new Error("Order is no longer pending — it may have been updated by the store.");
      }

      // Update order status to cancelled
      transaction.update(adminDb.collection("orders").doc(order_id), {
        status: "cancelled",
        updated_at: FieldValue.serverTimestamp(),
      });

      // Restore stock for each item
      const items = freshData.items as Array<{
        product_id: string;
        quantity: number;
      }>;
      for (const item of items) {
        const productRef = adminDb.collection("products").doc(item.product_id);
        transaction.update(productRef, {
          quantity: FieldValue.increment(item.quantity),
          updated_at: FieldValue.serverTimestamp(),
        });
      }
    });

    logger.info("[cancelOrder] Order cancelled successfully", { order_id, uid });
    return { success: true };
  } catch (error: unknown) {
    logger.error("[cancelOrder] Transaction failed", error);
    const message = error instanceof Error ? error.message : "Failed to cancel order. Please try again.";
    return { success: false, error: message };
  }
}
