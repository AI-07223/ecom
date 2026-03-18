import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor, act } from "@testing-library/react";
import React from "react";
import { CartProvider, useCart } from "./CartProvider";
import { AuthProvider } from "./AuthProvider";

// ─── Hoisted mock primitives ─────────────────────────────────────────────────
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
  increment: vi.fn((n: number) => n),
  serverTimestamp: vi.fn(() => "__TIMESTAMP__"),
}));

vi.mock("@/lib/firebase/config", () => ({ auth: {}, db: {} }));
vi.mock("@/lib/firebase/converters", () => ({
  convertProductData: vi.fn((id: string, data: Record<string, unknown>) => ({
    id,
    name: data.name,
    price: data.price,
    quantity: data.quantity,
    is_active: data.is_active,
  })),
}));
vi.mock("@/app/actions/admin", () => ({
  bootstrapAdminRole: vi.fn().mockResolvedValue({ success: false, isAdmin: false }),
}));
vi.mock("sonner", () => ({ toast: { error: vi.fn(), success: vi.fn() } }));
vi.mock("lucide-react", () => ({ Undo2: vi.fn(), RotateCcw: vi.fn() }));

global.fetch = vi.fn(() => Promise.resolve({ ok: true } as Response));

// ─── Wrapper: Auth + Cart providers ──────────────────────────────────────────

const wrapper = ({ children }: { children: React.ReactNode }) =>
  React.createElement(AuthProvider, null,
    React.createElement(CartProvider, null, children)
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
    cb({ uid, email: "user@test.com", emailVerified: true, displayName: null, photoURL: null, phoneNumber: null, getIdToken: vi.fn().mockResolvedValue("token") });
    return vi.fn();
  });
  // AuthProvider fetches profile via getDoc
  mockGetDoc.mockResolvedValue({ exists: () => false, data: () => undefined, id: uid });
}

function makeCartSnap(items: Array<{ id: string; product_id: string; quantity: number }>) {
  if (items.length === 0) return { empty: true, docs: [] };
  return {
    empty: false,
    docs: items.map(item => ({
      id: item.id,
      data: () => ({
        product_id: item.product_id,
        quantity: item.quantity,
        created_at: "__TIMESTAMP__",
        updated_at: "__TIMESTAMP__",
      }),
    })),
  };
}

function makeProductSnap(id: string, price: number, stock = 10) {
  return {
    docs: [{
      id,
      data: () => ({ name: "Widget", price, quantity: stock, is_active: true }),
    }],
  };
}

// ─── Tests ───────────────────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks();
  global.fetch = vi.fn(() => Promise.resolve({ ok: true } as Response));
});

describe("useCart", () => {
  it("throws when used outside CartProvider", () => {
    expect(() => renderHook(() => useCart())).toThrow(
      "useCart must be used within a CartProvider",
    );
  });
});

describe("CartProvider — logged out", () => {
  it("shows empty cart and isLoading=false when not logged in", async () => {
    setLoggedOut();
    const { result } = renderHook(() => useCart(), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.items).toHaveLength(0);
    expect(result.current.itemCount).toBe(0);
  });
});

describe("CartProvider — logged in with items", () => {
  beforeEach(() => {
    setLoggedIn();
  });

  it("loads cart items from Firestore", async () => {
    mockGetDocs
      .mockResolvedValueOnce(makeCartSnap([
        { id: "cart-1", product_id: "prod-1", quantity: 2 },
      ]))
      .mockResolvedValueOnce(makeProductSnap("prod-1", 500));

    const { result } = renderHook(() => useCart(), { wrapper });
    await waitFor(() => expect(result.current.items).toHaveLength(1));

    expect(result.current.items[0].quantity).toBe(2);
  });

  it("calculates itemCount as sum of all quantities", async () => {
    mockGetDocs
      .mockResolvedValueOnce(makeCartSnap([
        { id: "cart-1", product_id: "prod-1", quantity: 3 },
        { id: "cart-2", product_id: "prod-2", quantity: 2 },
      ]))
      .mockResolvedValueOnce({
        docs: [
          { id: "prod-1", data: () => ({ name: "Widget A", price: 100, quantity: 10, is_active: true }) },
          { id: "prod-2", data: () => ({ name: "Widget B", price: 200, quantity: 10, is_active: true }) },
        ],
      });

    const { result } = renderHook(() => useCart(), { wrapper });
    await waitFor(() => expect(result.current.itemCount).toBe(5)); // 3 + 2
  });

  it("calculates subtotal from database prices", async () => {
    mockGetDocs
      .mockResolvedValueOnce(makeCartSnap([
        { id: "cart-1", product_id: "prod-1", quantity: 3 },
      ]))
      .mockResolvedValueOnce(makeProductSnap("prod-1", 400));

    const { result } = renderHook(() => useCart(), { wrapper });
    await waitFor(() => expect(result.current.subtotal).toBe(1200)); // 3 × ₹400
  });

  it("shows empty cart when Firestore cart is empty", async () => {
    mockGetDocs.mockResolvedValueOnce({ empty: true, docs: [] });

    const { result } = renderHook(() => useCart(), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.items).toHaveLength(0);
    expect(result.current.subtotal).toBe(0);
  });
});

describe("CartProvider — coupon discount", () => {
  beforeEach(() => {
    setLoggedOut(); // coupon tests don't need Firestore cart
  });

  it("starts with no applied coupon", async () => {
    const { result } = renderHook(() => useCart(), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.appliedCoupon).toBeNull();
    expect(result.current.discountAmount).toBe(0);
  });

  it("applies a coupon via applyCoupon", async () => {
    const { result } = renderHook(() => useCart(), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    act(() => {
      result.current.applyCoupon({ code: "SAVE10", discount_type: "percentage", discount_value: 10 });
    });

    expect(result.current.appliedCoupon?.code).toBe("SAVE10");
  });

  it("removes coupon via removeCoupon", async () => {
    const { result } = renderHook(() => useCart(), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    act(() => {
      result.current.applyCoupon({ code: "SAVE10", discount_type: "percentage", discount_value: 10 });
    });
    act(() => {
      result.current.removeCoupon();
    });

    expect(result.current.appliedCoupon).toBeNull();
  });

  it("calculates percentage discount on subtotal", async () => {
    // Logged in with items to get a non-zero subtotal
    setLoggedIn();
    mockGetDocs
      .mockResolvedValueOnce(makeCartSnap([{ id: "c1", product_id: "p1", quantity: 2 }]))
      .mockResolvedValueOnce(makeProductSnap("p1", 500)); // subtotal = 1000

    const { result } = renderHook(() => useCart(), { wrapper });
    await waitFor(() => expect(result.current.subtotal).toBe(1000));

    act(() => {
      result.current.applyCoupon({ code: "PCT10", discount_type: "percentage", discount_value: 10 });
    });

    expect(result.current.discountAmount).toBe(100); // 10% of 1000
  });

  it("calculates fixed discount", async () => {
    setLoggedIn();
    mockGetDocs
      .mockResolvedValueOnce(makeCartSnap([{ id: "c1", product_id: "p1", quantity: 2 }]))
      .mockResolvedValueOnce(makeProductSnap("p1", 500)); // subtotal = 1000

    const { result } = renderHook(() => useCart(), { wrapper });
    await waitFor(() => expect(result.current.subtotal).toBe(1000));

    act(() => {
      result.current.applyCoupon({ code: "FLAT200", discount_type: "fixed", discount_value: 200 });
    });

    expect(result.current.discountAmount).toBe(200);
  });
});
