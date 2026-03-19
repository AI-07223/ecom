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

// Lazy proxy — defers getAdminApp() until the first method/property is accessed.
// This prevents the module from throwing during Next.js build-time static analysis,
// where env vars are not available.
function makeLazyProxy<T extends object>(factory: () => T): T {
  let instance: T | undefined;
  return new Proxy({} as T, {
    get(_, prop, receiver) {
      if (!instance) instance = factory();
      const value = Reflect.get(instance, prop, instance);
      if (typeof value === "function") return value.bind(instance);
      return value;
    },
    set(_, prop, value) {
      if (!instance) instance = factory();
      return Reflect.set(instance, prop, value, instance);
    },
  });
}

export const adminDb = makeLazyProxy(() => getFirestore(getAdminApp()));
export const adminAuth = makeLazyProxy(() => getAuth(getAdminApp()));
export default getAdminApp;
