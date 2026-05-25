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
  User,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut as firebaseSignOut,
  signInWithPopup,
  GoogleAuthProvider,
  updateProfile,
  sendEmailVerification,
  RecaptchaVerifier,
  signInWithPhoneNumber,
  ConfirmationResult,
} from "firebase/auth";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { auth, db } from "@/lib/firebase/config";
import { Profile, UserRole } from "@/types/database.types";
import { bootstrapAdminRole } from "@/app/actions/admin";

interface AuthContextType {
  user: User | null;
  profile: Profile | null;
  isLoading: boolean;
  isAdmin: boolean;
  isWholeseller: boolean;
  role: UserRole;
  isEmailVerified: boolean;
  signIn: (email: string, password: string) => Promise<{ error: Error | null; emailNotVerified?: boolean }>;
  signUp: (
    email: string,
    password: string,
    fullName?: string,
  ) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  signInWithGoogle: () => Promise<{ error: Error | null }>;
  sendOtp: (phoneNumber: string) => Promise<{ error: Error | null }>;
  verifyOtp: (code: string) => Promise<{ error: Error | null }>;
  setupRecaptcha: (elementId: string) => void;
  refreshProfile: () => Promise<void>;
  sendVerificationEmail: () => Promise<{ error: Error | null }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Helper function to convert Firestore data to Profile type
function convertToProfile(data: Record<string, unknown>, id: string): Profile {
  // Handle timestamp conversion
  const createdAt = data.created_at;
  const updatedAt = data.updated_at;

  return {
    id: id,
    email: data.email as string,
    full_name: (data.full_name as string | null) ?? null,
    avatar_url: (data.avatar_url as string | null) ?? null,
    phone: (data.phone as string | null) ?? null,
    address: (data.address as Profile['address']) ?? null,
    saved_addresses: (data.saved_addresses as Profile['saved_addresses']) ?? [],
    gst_number: (data.gst_number as string | null) ?? null,
    role: (data.role as UserRole) ?? "customer",
    created_at: typeof createdAt === 'object' && createdAt && 'toDate' in createdAt
      ? (createdAt as { toDate: () => Date }).toDate().toISOString()
      : (createdAt as string) ?? new Date().toISOString(),
    updated_at: typeof updatedAt === 'object' && updatedAt && 'toDate' in updatedAt
      ? (updatedAt as { toDate: () => Date }).toDate().toISOString()
      : (updatedAt as string) ?? new Date().toISOString(),
  };
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const confirmationResultRef = useRef<ConfirmationResult | null>(null);
  const recaptchaVerifierRef = useRef<RecaptchaVerifier | null>(null);

  const fetchProfile = useCallback(
    async (
      firebaseUser: User,
    ) => {
      try {
        const userId = firebaseUser.uid;
        const email = firebaseUser.email || "";
        const displayName = firebaseUser.displayName;
        const photoURL = firebaseUser.photoURL;
        const phoneNumber = firebaseUser.phoneNumber;

        const profileRef = doc(db, "profiles", userId);
        const profileSnap = await getDoc(profileRef);

        if (profileSnap.exists()) {
          let profileData = convertToProfile(profileSnap.data() as Record<string, unknown>, userId);

          // Check admin bootstrapping via server action (admin email checked server-side only)
          if (profileData.role !== "admin") {
            try {
              const idToken = await firebaseUser.getIdToken();
              const result = await bootstrapAdminRole(idToken);
              if (result.success && result.isAdmin) {
                profileData = { ...profileData, role: "admin" as UserRole };
              }
            } catch {
              // Non-critical: admin bootstrap failed, continue with current role
            }
          }

          return profileData;
        } else {
          // Create profile for new user (always as "customer" - Firestore rules enforce this)
          const now = new Date().toISOString();
          const newProfile: Profile = {
            id: userId,
            email: email,
            full_name: displayName || null,
            avatar_url: photoURL || null,
            phone: phoneNumber || null,
            address: null,
            saved_addresses: [],
            gst_number: null,
            role: "customer",
            created_at: now,
            updated_at: now,
          };
          await setDoc(profileRef, {
            ...newProfile,
            created_at: serverTimestamp(),
            updated_at: serverTimestamp(),
          });

          // After creating as customer, check if this is the designated admin
          try {
            const idToken = await firebaseUser.getIdToken();
            const result = await bootstrapAdminRole(idToken);
            if (result.success && result.isAdmin) {
              return { ...newProfile, role: "admin" as UserRole };
            }
          } catch {
            // Non-critical: admin bootstrap failed, continue as customer
          }

          return newProfile;
        }
      } catch (error) {
        console.error("Error fetching/creating profile:", error);
        return null;
      }
    },
    [],
  );

  const refreshProfile = useCallback(async () => {
    if (user) {
      const profileData = await fetchProfile(user);
      setProfile(profileData);
    }
  }, [user, fetchProfile]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);

      if (firebaseUser) {
        const profileData = await fetchProfile(firebaseUser);
        setProfile(profileData);

        // Set server-side session cookie for middleware auth checks
        try {
          const idToken = await firebaseUser.getIdToken();
          await fetch("/api/auth/session", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ idToken }),
          });
        } catch {
          // Non-critical: middleware session set failed
        }
      } else {
        setProfile(null);
        // Clear session cookie on logout
        try {
          await fetch("/api/auth/session", { method: "DELETE" });
        } catch {
          // Non-critical
        }
      }

      setIsLoading(false);
    });

    return () => unsubscribe();
  }, [fetchProfile]);

  const signIn = async (email: string, password: string) => {
    try {
      const { user: signedInUser } = await signInWithEmailAndPassword(auth, email, password);

      // Check email verification status but don't block signin
      const emailNotVerified = !signedInUser.emailVerified;

      return { error: null, emailNotVerified };
    } catch (error) {
      return { error: error as Error, emailNotVerified: false };
    }
  };

  const signUp = async (email: string, password: string, fullName?: string) => {
    try {
      const { user: newUser } = await createUserWithEmailAndPassword(
        auth,
        email,
        password,
      );

      if (fullName) {
        await updateProfile(newUser, { displayName: fullName });
      }

      // Send email verification
      await sendEmailVerification(newUser);

      return { error: null };
    } catch (error) {
      return { error: error as Error };
    }
  };

  const sendVerificationEmail = async () => {
    try {
      if (user && !user.emailVerified) {
        await sendEmailVerification(user);
      }
      return { error: null };
    } catch (error) {
      return { error: error as Error };
    }
  };

  const signOut = async () => {
    await firebaseSignOut(auth);
    setUser(null);
    setProfile(null);
    // Clear server-side session cookie
    try {
      await fetch("/api/auth/session", { method: "DELETE" });
    } catch {
      // Non-critical
    }
  };

  const signInWithGoogle = async () => {
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
      return { error: null };
    } catch (error) {
      return { error: error as Error };
    }
  };

  // Phone Auth: setup invisible reCAPTCHA
  const setupRecaptcha = (elementId: string) => {
    if (recaptchaVerifierRef.current) {
      recaptchaVerifierRef.current.clear();
    }
    recaptchaVerifierRef.current = new RecaptchaVerifier(auth, elementId, {
      size: "invisible",
      callback: () => {
        // reCAPTCHA solved
      },
    });
  };

  // Phone Auth: send OTP
  const sendOtp = async (phoneNumber: string) => {
    try {
      if (!recaptchaVerifierRef.current) {
        return { error: new Error("reCAPTCHA not initialized. Please try again.") };
      }
      const result = await signInWithPhoneNumber(
        auth,
        phoneNumber,
        recaptchaVerifierRef.current,
      );
      confirmationResultRef.current = result;
      return { error: null };
    } catch (error) {
      // Reset reCAPTCHA on error so user can retry
      if (recaptchaVerifierRef.current) {
        recaptchaVerifierRef.current.clear();
        recaptchaVerifierRef.current = null;
      }
      return { error: error as Error };
    }
  };

  // Phone Auth: verify OTP
  const verifyOtp = async (code: string) => {
    try {
      if (!confirmationResultRef.current) {
        return { error: new Error("No OTP request found. Please send OTP first.") };
      }
      await confirmationResultRef.current.confirm(code);
      confirmationResultRef.current = null;
      return { error: null };
    } catch (error) {
      return { error: error as Error };
    }
  };

  // Derive role from profile - single source of truth
  const role: UserRole = profile?.role ?? "customer";
  const isAdmin = role === "admin";
  const isWholeseller = role === "wholeseller";
  const isEmailVerified = user?.emailVerified ?? false;

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        isLoading,
        isAdmin,
        isWholeseller,
        role,
        isEmailVerified,
        signIn,
        signUp,
        signOut,
        signInWithGoogle,
        sendOtp,
        verifyOtp,
        setupRecaptcha,
        refreshProfile,
        sendVerificationEmail,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
