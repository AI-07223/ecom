"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
} from "react";
import {
  User,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut as firebaseSignOut,
  signInWithPopup,
  GoogleAuthProvider,
  GithubAuthProvider,
  updateProfile,
  sendEmailVerification,
} from "firebase/auth";
import { doc, getDoc, setDoc, updateDoc, serverTimestamp } from "firebase/firestore";
import { auth, db } from "@/lib/firebase/config";
import { Profile, UserRole } from "@/types/database.types";

// Admin email — auto-promoted to admin role on login/signup
const ADMIN_EMAIL = process.env.NEXT_PUBLIC_ADMIN_EMAIL || "z41d.706@gmail.com";

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
  signInWithGithub: () => Promise<{ error: Error | null }>;
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

  const fetchProfile = useCallback(
    async (
      userId: string,
      email: string,
      displayName?: string | null,
      photoURL?: string | null,
    ) => {
      try {
        const profileRef = doc(db, "profiles", userId);
        const profileSnap = await getDoc(profileRef);
        const isDesignatedAdmin = email.toLowerCase() === ADMIN_EMAIL.toLowerCase();

        if (profileSnap.exists()) {
          const profileData = convertToProfile(profileSnap.data() as Record<string, unknown>, userId);

          // Auto-promote designated admin email if not already admin
          if (isDesignatedAdmin && profileData.role !== "admin") {
            await updateDoc(profileRef, {
              role: "admin",
              updated_at: serverTimestamp(),
            });
            return { ...profileData, role: "admin" as UserRole };
          }

          return profileData;
        } else {
          // Create profile for new user
          const now = new Date().toISOString();
          const newRole: UserRole = isDesignatedAdmin ? "admin" : "customer";
          const newProfile: Profile = {
            id: userId,
            email: email,
            full_name: displayName || null,
            avatar_url: photoURL || null,
            phone: null,
            address: null,
            saved_addresses: [],
            gst_number: null,
            role: newRole,
            created_at: now,
            updated_at: now,
          };
          await setDoc(profileRef, {
            ...newProfile,
            created_at: serverTimestamp(),
            updated_at: serverTimestamp(),
          });
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
      const profileData = await fetchProfile(
        user.uid,
        user.email || "",
        user.displayName,
        user.photoURL,
      );
      setProfile(profileData);
    }
  }, [user, fetchProfile]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);

      if (firebaseUser) {
        const profileData = await fetchProfile(
          firebaseUser.uid,
          firebaseUser.email || "",
          firebaseUser.displayName,
          firebaseUser.photoURL,
        );
        setProfile(profileData);
      } else {
        setProfile(null);
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

  const signInWithGithub = async () => {
    try {
      const provider = new GithubAuthProvider();
      await signInWithPopup(auth, provider);
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
        signInWithGithub,
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
