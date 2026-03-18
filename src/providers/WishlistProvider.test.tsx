import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor, act } from "@testing-library/react";
import React from "react";
import { WishlistProvider, useWishlist } from "./WishlistProvider";
import { AuthProvider } from "./AuthProvider";

// ─── Hoisted mocks ───────────────────────────────────────────────────────────
const {
  mockOnAuthStateChanged,
  mockGetDoc,
  mockSetDoc,
  mockGetDocs,
  mockDeleteDoc,
} = vi.hoisted(() => ({
  mockOnAuthStateChanged: vi.fn(),
  mockGetDoc: vi.fn(),
  mockSetDoc: vi.fn(),
  mockGetDocs: vi.fn(),
  mockDeleteDoc: vi.fn(),
}));

vi.mock("firebase/auth", () => ({
  onAuthStateChanged: mockOnAuthStateChanged,
  signInWithEmailAndPassword: vi.fn(),
  createUserWithEmailAndPassword: vi.fn(),
  signOut: vi.fn(),
  signInWithPopup: vi.fn(),
  updateProfile: vi.fn(),
  sendEmailVerification: vi.fn(),
  GoogleAuthProvider: vi.fn().mockImplementation(() => ({})),
  RecaptchaVerifier: vi.fn().mockImplementation(() => ({ clear: vi.fn() })),
  signInWithPhoneNumber: vi.fn(),
}));

vi.mock("firebase/firestore", () => ({
  collection: vi.fn(() => "col-ref"),
  doc: vi.fn(() => ({ id: "doc-ref" })),
  getDoc: mockGetDoc,
  setDoc: mockSetDoc,
  getDocs: mockGetDocs,
  deleteDoc: mockDeleteDoc,
  query: vi.fn((...args: unknown[]) => args[0]),
  orderBy: vi.fn(),
  where: vi.fn(),
  documentId: vi.fn(() => "__name__"),
  serverTimestamp: vi.fn(() => "__TIMESTAMP__"),
}));

vi.mock("@/lib/firebase/config", () => ({ auth: {}, db: {} }));
vi.mock("@/lib/firebase/converters", () => ({
  convertProductData: vi.fn((id: string, data: Record<string, unknown>) => ({
    id, name: data.name, price: data.price, quantity: data.quantity, is_active: data.is_active,
  })),
}));
vi.mock("@/app/actions/admin", () => ({
  bootstrapAdminRole: vi.fn().mockResolvedValue({ success: false, isAdmin: false }),
}));
vi.mock("sonner", () => ({ toast: { error: vi.fn(), success: vi.fn() } }));
vi.mock("lucide-react", () => ({ Undo2: vi.fn(), RotateCcw: vi.fn() }));

global.fetch = vi.fn(() => Promise.resolve({ ok: true } as Response));

// ─── Wrapper ─────────────────────────────────────────────────────────────────

const wrapper = ({ children }: { children: React.ReactNode }) =>
  React.createElement(AuthProvider, null,
    React.createElement(WishlistProvider, null, children)
  );

// ─── Helpers ─────────────────────────────────────────────────────────────────

function setLoggedOut() {
  mockOnAuthStateChanged.mockImplementation((_: unknown, cb: (u: null) => void) => {
    cb(null);
    return vi.fn();
  });
}

function setLoggedIn(uid = "user-abc") {
  mockOnAuthStateChanged.mockImplementation((_: unknown, cb: (u: { uid: string; email: string; emailVerified: boolean; displayName: null; photoURL: null; phoneNumber: null; getIdToken: () => Promise<string> }) => void) => {
    cb({ uid, email: "u@t.com", emailVerified: true, displayName: null, photoURL: null, phoneNumber: null, getIdToken: vi.fn().mockResolvedValue("tok") });
    return vi.fn();
  });
  mockGetDoc.mockResolvedValue({ exists: () => false, data: () => undefined, id: uid });
}

// ─── Tests ───────────────────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks();
  global.fetch = vi.fn(() => Promise.resolve({ ok: true } as Response));
});

describe("useWishlist", () => {
  it("throws when used outside WishlistProvider", () => {
    expect(() => renderHook(() => useWishlist())).toThrow(
      "useWishlist must be used within a WishlistProvider",
    );
  });
});

describe("WishlistProvider — logged out", () => {
  it("returns empty wishlist and isLoading=false", async () => {
    setLoggedOut();
    const { result } = renderHook(() => useWishlist(), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.items).toHaveLength(0);
  });
});

describe("WishlistProvider — isInWishlist", () => {
  it("returns false for a product not in the wishlist", async () => {
    setLoggedOut();
    const { result } = renderHook(() => useWishlist(), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.isInWishlist("prod-999")).toBe(false);
  });

  it("returns true for a product that is in the wishlist", async () => {
    setLoggedIn();
    mockGetDocs
      .mockResolvedValueOnce({
        empty: false,
        docs: [{ id: "wish-1", data: () => ({ product_id: "prod-42", created_at: null, updated_at: null }) }],
      })
      .mockResolvedValueOnce({
        docs: [{ id: "prod-42", data: () => ({ name: "Widget", price: 100, quantity: 5, is_active: true }) }],
      });

    const { result } = renderHook(() => useWishlist(), { wrapper });
    // Wait for the specific item to appear (not just isLoading, which resolves on the null-user pass first)
    await waitFor(() => expect(result.current.isInWishlist("prod-42")).toBe(true));
    expect(result.current.isInWishlist("prod-99")).toBe(false);
  });
});

describe("WishlistProvider — loaded items", () => {
  it("loads wishlist items from Firestore", async () => {
    setLoggedIn();
    mockGetDocs
      .mockResolvedValueOnce({
        empty: false,
        docs: [
          { id: "w1", data: () => ({ product_id: "prod-1", created_at: null, updated_at: null }) },
          { id: "w2", data: () => ({ product_id: "prod-2", created_at: null, updated_at: null }) },
        ],
      })
      .mockResolvedValueOnce({
        docs: [
          { id: "prod-1", data: () => ({ name: "Prod 1", price: 100, quantity: 5, is_active: true }) },
          { id: "prod-2", data: () => ({ name: "Prod 2", price: 200, quantity: 3, is_active: true }) },
        ],
      });

    const { result } = renderHook(() => useWishlist(), { wrapper });
    await waitFor(() => expect(result.current.items).toHaveLength(2));
  });

  it("shows empty wishlist when Firestore wishlist is empty", async () => {
    setLoggedIn();
    mockGetDocs.mockResolvedValueOnce({ empty: true, docs: [] });

    const { result } = renderHook(() => useWishlist(), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.items).toHaveLength(0);
  });
});

describe("WishlistProvider — removeFromWishlist", () => {
  it("calls deleteDoc to remove an item", async () => {
    setLoggedIn();
    mockGetDocs
      .mockResolvedValueOnce({
        empty: false,
        docs: [{ id: "w1", data: () => ({ product_id: "prod-1", created_at: null, updated_at: null }) }],
      })
      .mockResolvedValueOnce({
        docs: [{ id: "prod-1", data: () => ({ name: "Widget", price: 100, quantity: 5, is_active: true }) }],
      });

    const { result } = renderHook(() => useWishlist(), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await act(async () => {
      await result.current.removeFromWishlist("prod-1");
    });

    expect(mockDeleteDoc).toHaveBeenCalledOnce();
  });
});
