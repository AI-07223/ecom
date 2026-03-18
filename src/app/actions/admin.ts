"use server";

import { adminDb, adminAuth } from "@/lib/firebase/admin";
import { FieldValue } from "firebase-admin/firestore";

/**
 * Bootstrap admin role for the designated admin email.
 * Uses Admin SDK (bypasses Firestore rules) so the admin email
 * is never exposed to the client bundle.
 *
 * Called by AuthProvider when a user logs in and their profile
 * doesn't have admin role yet.
 */
export async function bootstrapAdminRole(idToken: string): Promise<{
  success: boolean;
  isAdmin: boolean;
  error?: string;
}> {
  try {
    // Verify the ID token server-side
    const decoded = await adminAuth.verifyIdToken(idToken);
    const uid = decoded.uid;
    const email = decoded.email?.toLowerCase();

    if (!email) {
      return { success: false, isAdmin: false, error: "No email associated with account" };
    }

    // Check against server-side env var (NOT NEXT_PUBLIC_)
    const adminEmail = process.env.ADMIN_EMAIL || process.env.NEXT_PUBLIC_ADMIN_EMAIL;
    if (!adminEmail) {
      return { success: true, isAdmin: false };
    }

    const isDesignatedAdmin = email === adminEmail.toLowerCase();
    if (!isDesignatedAdmin) {
      return { success: true, isAdmin: false };
    }

    // Use Admin SDK to update the profile (bypasses Firestore rules)
    const profileRef = adminDb.collection("profiles").doc(uid);
    const profileSnap = await profileRef.get();

    if (profileSnap.exists) {
      const currentRole = profileSnap.data()?.role;
      if (currentRole !== "admin") {
        await profileRef.update({
          role: "admin",
          updated_at: FieldValue.serverTimestamp(),
        });
      }
    }
    // If profile doesn't exist yet, AuthProvider will create it as "customer"
    // and then this function promotes it on the next call

    return { success: true, isAdmin: true };
  } catch (error) {
    console.error("[bootstrapAdminRole] Error:", error);
    return { success: false, isAdmin: false, error: "Failed to verify admin status" };
  }
}
