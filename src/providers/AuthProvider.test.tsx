import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor, act } from "@testing-library/react";
import React from "react";
import { AuthProvider, useAuth } from "./AuthProvider";

// ─── Hoisted mock primitives ─────────────────────────────────────────────────
const {
  mockOnAuthStateChanged,
  mockSignInWithEmailAndPassword,
  mockCreateUserWithEmailAndPassword,
  mockFirebaseSignOut,
  mockSignInWithPopup,
  mockUpdateProfile,
  mockSendEmailVerification,
  mockGetDoc,
  mockSetDoc,
  mockBootstrapAdminRole,
} = vi.hoisted(() => ({
  mockOnAuthStateChanged: vi.fn(),
  mockSignInWithEmailAndPassword: vi.fn(),
  mockCreateUserWithEmailAndPassword: vi.fn(),
  mockFirebaseSignOut: vi.fn(),
  mockSignInWithPopup: vi.fn(),
  mockUpdateProfile: vi.fn(),
  mockSendEmailVerification: vi.fn(),
  mockGetDoc: vi.fn(),
  mockSetDoc: vi.fn(),
  mockBootstrapAdminRole: vi.fn(),
}));

vi.mock("firebase/auth", () => ({
  onAuthStateChanged: mockOnAuthStateChanged,
  signInWithEmailAndPassword: mockSignInWithEmailAndPassword,
  createUserWithEmailAndPassword: mockCreateUserWithEmailAndPassword,
  signOut: mockFirebaseSignOut,
  signInWithPopup: mockSignInWithPopup,
  updateProfile: mockUpdateProfile,
  sendEmailVerification: mockSendEmailVerification,
  GoogleAuthProvider: vi.fn().mockImplementation(() => ({})),
  RecaptchaVerifier: vi.fn().mockImplementation(() => ({ clear: vi.fn() })),
  signInWithPhoneNumber: vi.fn(),
}));

vi.mock("firebase/firestore", () => ({
  doc: vi.fn(() => ({ id: "profile-ref" })),
  getDoc: mockGetDoc,
  setDoc: mockSetDoc,
  serverTimestamp: vi.fn(() => "__TIMESTAMP__"),
}));

vi.mock("@/lib/firebase/config", () => ({
  auth: {},
  db: {},
}));

vi.mock("@/app/actions/admin", () => ({
  bootstrapAdminRole: mockBootstrapAdminRole,
}));

// Prevent fetch from failing in tests (session cookie endpoints)
global.fetch = vi.fn(() => Promise.resolve({ ok: true } as Response));

// ─── Fixtures ────────────────────────────────────────────────────────────────

function makeFirebaseUser(overrides: Partial<{
  uid: string;
  email: string;
  emailVerified: boolean;
  displayName: string | null;
  photoURL: string | null;
  phoneNumber: string | null;
}> = {}) {
  return {
    uid: "user-abc",
    email: "user@example.com",
    emailVerified: true,
    displayName: "Test User",
    photoURL: null,
    phoneNumber: null,
    getIdToken: vi.fn().mockResolvedValue("id-token"),
    ...overrides,
  };
}

function makeProfileData(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    email: "user@example.com",
    full_name: "Test User",
    avatar_url: null,
    phone: null,
    address: null,
    saved_addresses: [],
    gst_number: null,
    role: "customer",
    created_at: "2024-01-01T00:00:00.000Z",
    updated_at: "2024-01-01T00:00:00.000Z",
    ...overrides,
  };
}

const wrapper = ({ children }: { children: React.ReactNode }) =>
  React.createElement(AuthProvider, null, children);

// ─── Tests ───────────────────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks();
  // Default: no session
  mockOnAuthStateChanged.mockImplementation((_auth: unknown, cb: (user: null) => void) => {
    cb(null);
    return vi.fn(); // unsubscribe
  });
  mockBootstrapAdminRole.mockResolvedValue({ success: false, isAdmin: false });
  mockGetDoc.mockResolvedValue({ exists: () => false, data: () => undefined, id: "user-abc" });
  mockSetDoc.mockResolvedValue(undefined);
});

describe("useAuth", () => {
  it("throws when used outside of AuthProvider", () => {
    expect(() => renderHook(() => useAuth())).toThrow(
      "useAuth must be used within an AuthProvider",
    );
  });
});

describe("AuthProvider — logged out state", () => {
  it("resolves to isLoading=false after auth state check", async () => {
    const { result } = renderHook(() => useAuth(), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
  });

  it("exposes null user and null profile when logged out", async () => {
    const { result } = renderHook(() => useAuth(), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.user).toBeNull();
    expect(result.current.profile).toBeNull();
  });

  it("defaults role to 'customer' when no profile", async () => {
    const { result } = renderHook(() => useAuth(), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.role).toBe("customer");
    expect(result.current.isAdmin).toBe(false);
    expect(result.current.isWholeseller).toBe(false);
  });
});

describe("AuthProvider — logged in state", () => {
  it("loads user and profile on auth state change", async () => {
    const mockUser = makeFirebaseUser();
    mockOnAuthStateChanged.mockImplementation((_auth: unknown, cb: (user: typeof mockUser) => void) => {
      cb(mockUser);
      return vi.fn();
    });
    mockGetDoc.mockResolvedValue({
      exists: () => true,
      id: mockUser.uid,
      data: () => makeProfileData(),
    });

    const { result } = renderHook(() => useAuth(), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.user).toBe(mockUser);
    expect(result.current.profile?.email).toBe("user@example.com");
  });

  it("sets isAdmin=true when profile role is 'admin'", async () => {
    const mockUser = makeFirebaseUser();
    mockOnAuthStateChanged.mockImplementation((_auth: unknown, cb: (user: typeof mockUser) => void) => {
      cb(mockUser);
      return vi.fn();
    });
    mockGetDoc.mockResolvedValue({
      exists: () => true,
      id: mockUser.uid,
      data: () => makeProfileData({ role: "admin" }),
    });

    const { result } = renderHook(() => useAuth(), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.isAdmin).toBe(true);
    expect(result.current.role).toBe("admin");
  });

  it("sets isWholeseller=true when profile role is 'wholeseller'", async () => {
    const mockUser = makeFirebaseUser();
    mockOnAuthStateChanged.mockImplementation((_auth: unknown, cb: (user: typeof mockUser) => void) => {
      cb(mockUser);
      return vi.fn();
    });
    mockGetDoc.mockResolvedValue({
      exists: () => true,
      id: mockUser.uid,
      data: () => makeProfileData({ role: "wholeseller" }),
    });

    const { result } = renderHook(() => useAuth(), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.isWholeseller).toBe(true);
    expect(result.current.isAdmin).toBe(false);
  });

  it("promotes to admin via bootstrapAdminRole when profile is not admin", async () => {
    const mockUser = makeFirebaseUser();
    mockOnAuthStateChanged.mockImplementation((_auth: unknown, cb: (user: typeof mockUser) => void) => {
      cb(mockUser);
      return vi.fn();
    });
    mockGetDoc.mockResolvedValue({
      exists: () => true,
      id: mockUser.uid,
      data: () => makeProfileData({ role: "customer" }),
    });
    // Bootstrap says this user IS the admin
    mockBootstrapAdminRole.mockResolvedValue({ success: true, isAdmin: true });

    const { result } = renderHook(() => useAuth(), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.isAdmin).toBe(true);
  });

  it("reflects emailVerified from Firebase user", async () => {
    const mockUser = makeFirebaseUser({ emailVerified: false });
    mockOnAuthStateChanged.mockImplementation((_auth: unknown, cb: (user: typeof mockUser) => void) => {
      cb(mockUser);
      return vi.fn();
    });
    mockGetDoc.mockResolvedValue({
      exists: () => true,
      id: mockUser.uid,
      data: () => makeProfileData(),
    });

    const { result } = renderHook(() => useAuth(), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.isEmailVerified).toBe(false);
  });

  it("creates a new profile document for first-time users", async () => {
    const mockUser = makeFirebaseUser();
    mockOnAuthStateChanged.mockImplementation((_auth: unknown, cb: (user: typeof mockUser) => void) => {
      cb(mockUser);
      return vi.fn();
    });
    // Profile does not exist yet
    mockGetDoc.mockResolvedValue({ exists: () => false, data: () => undefined, id: mockUser.uid });

    const { result } = renderHook(() => useAuth(), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(mockSetDoc).toHaveBeenCalledOnce();
    expect(result.current.profile?.role).toBe("customer");
  });
});

describe("AuthProvider — signIn", () => {
  it("returns { error: null } on successful sign-in", async () => {
    mockSignInWithEmailAndPassword.mockResolvedValue({
      user: makeFirebaseUser({ emailVerified: true }),
    });
    const { result } = renderHook(() => useAuth(), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    let outcome: { error: Error | null; emailNotVerified?: boolean } | undefined;
    await act(async () => {
      outcome = await result.current.signIn("user@example.com", "password123");
    });

    expect(outcome?.error).toBeNull();
    expect(outcome?.emailNotVerified).toBe(false);
  });

  it("returns emailNotVerified=true when email is not verified", async () => {
    mockSignInWithEmailAndPassword.mockResolvedValue({
      user: makeFirebaseUser({ emailVerified: false }),
    });
    const { result } = renderHook(() => useAuth(), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    let outcome: { error: Error | null; emailNotVerified?: boolean } | undefined;
    await act(async () => {
      outcome = await result.current.signIn("user@example.com", "password123");
    });

    expect(outcome?.error).toBeNull();
    expect(outcome?.emailNotVerified).toBe(true);
  });

  it("returns error when Firebase signIn throws", async () => {
    mockSignInWithEmailAndPassword.mockRejectedValue(new Error("auth/wrong-password"));
    const { result } = renderHook(() => useAuth(), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    let outcome: { error: Error | null } | undefined;
    await act(async () => {
      outcome = await result.current.signIn("user@example.com", "wrongpass");
    });

    expect(outcome?.error?.message).toBe("auth/wrong-password");
  });
});

describe("AuthProvider — signUp", () => {
  it("returns { error: null } and sends verification email on success", async () => {
    const newUser = makeFirebaseUser({ emailVerified: false });
    mockCreateUserWithEmailAndPassword.mockResolvedValue({ user: newUser });
    mockUpdateProfile.mockResolvedValue(undefined);
    mockSendEmailVerification.mockResolvedValue(undefined);

    const { result } = renderHook(() => useAuth(), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    let outcome: { error: Error | null } | undefined;
    await act(async () => {
      outcome = await result.current.signUp("new@example.com", "pass123", "New User");
    });

    expect(outcome?.error).toBeNull();
    expect(mockSendEmailVerification).toHaveBeenCalledWith(newUser);
  });

  it("returns error when Firebase signUp throws", async () => {
    mockCreateUserWithEmailAndPassword.mockRejectedValue(new Error("auth/email-already-in-use"));

    const { result } = renderHook(() => useAuth(), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    let outcome: { error: Error | null } | undefined;
    await act(async () => {
      outcome = await result.current.signUp("existing@example.com", "pass123");
    });

    expect(outcome?.error?.message).toBe("auth/email-already-in-use");
  });
});

describe("AuthProvider — signOut", () => {
  it("calls Firebase signOut", async () => {
    mockFirebaseSignOut.mockResolvedValue(undefined);
    const { result } = renderHook(() => useAuth(), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await act(async () => {
      await result.current.signOut();
    });

    expect(mockFirebaseSignOut).toHaveBeenCalledOnce();
  });
});
