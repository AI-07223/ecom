import { NextRequest, NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebase/admin";

/**
 * POST: Set session cookie after login
 * Verifies Firebase ID token, reads user role, sets HttpOnly cookie
 */
export async function POST(request: NextRequest) {
  try {
    const { idToken } = await request.json();

    if (!idToken || typeof idToken !== "string") {
      return NextResponse.json({ error: "Missing ID token" }, { status: 400 });
    }

    // Verify token with Firebase Admin
    const decoded = await adminAuth.verifyIdToken(idToken);
    const uid = decoded.uid;

    // Read role from Firestore profile
    const profileSnap = await adminDb.collection("profiles").doc(uid).get();
    const role = profileSnap.exists ? (profileSnap.data()?.role ?? "customer") : "customer";

    // Create session payload
    const sessionData = JSON.stringify({
      uid,
      role,
      email: decoded.email,
    });

    const response = NextResponse.json({ success: true, role });

    // Set HttpOnly cookie (7 day expiry, matching Firebase token refresh)
    response.cookies.set("__session", sessionData, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 7, // 7 days
    });

    return response;
  } catch (error) {
    console.error("[session/POST] Error:", error);
    return NextResponse.json({ error: "Invalid token" }, { status: 401 });
  }
}

/**
 * DELETE: Clear session cookie on logout
 */
export async function DELETE() {
  const response = NextResponse.json({ success: true });
  response.cookies.delete("__session");
  return response;
}
