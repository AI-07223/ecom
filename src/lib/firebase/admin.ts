import { initializeApp, getApps, cert, App } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { getAuth } from "firebase-admin/auth";

let adminApp: App | undefined;

// Initialize Firebase Admin (server-side only)
function getAdminApp(): App {
  if (adminApp) return adminApp;

  const existingApps = getApps();
  if (existingApps.length > 0) {
    adminApp = existingApps[0];
    return adminApp;
  }

  // Try to initialize with service account credentials
  // Handle both raw newlines and escaped \n in the private key
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n") // Convert escaped \n to actual newlines
    ?.replace(/^"/, "") // Remove leading quote
    ?.replace(/"$/, ""); // Remove trailing quote

  if (
    privateKey &&
    process.env.FIREBASE_CLIENT_EMAIL &&
    process.env.FIREBASE_PROJECT_ID
  ) {
    try {
      adminApp = initializeApp({
        credential: cert({
          projectId: process.env.FIREBASE_PROJECT_ID,
          clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
          privateKey: privateKey,
        }),
      });
    } catch (error) {
      console.error("Firebase Admin initialization error:", error);
      throw error;
    }
  } else {
    throw new Error(
      "Firebase Admin credentials not configured. " +
        "Please set FIREBASE_PRIVATE_KEY, FIREBASE_CLIENT_EMAIL, and FIREBASE_PROJECT_ID environment variables.",
    );
  }

  return adminApp;
}

export const adminDb = getFirestore(getAdminApp());
export const adminAuth = getAuth(getAdminApp());
export default getAdminApp();
