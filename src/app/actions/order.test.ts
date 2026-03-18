import { describe, it, expect, vi, beforeEach } from "vitest";
import { createOrder } from "./order";

// ─── Hoisted mock primitives (available in vi.mock factories) ────────────────
const {
  mockVerifyIdToken,
  mockProductGet,
  mockOrdersGet,
  mockCouponsGet,
  mockRunTransaction,
  mockTxUpdate,
  mockTxSet,
  mockTxGet,
  mockSendEmail,
} = vi.hoisted(() => {
  const mockTxUpdate = vi.fn();
  const mockTxSet = vi.fn();
  const mockTxGet = vi.fn();
  return {
    mockVerifyIdToken: vi.fn(),
    mockProductGet: vi.fn(),
    mockOrdersGet: vi.fn(),
    mockCouponsGet: vi.fn(),
    mockRunTransaction: vi.fn(async (cb: (tx: unknown) => Promise<void>) =>
      cb({ update: mockTxUpdate, set: mockTxSet, get: mockTxGet }),
    ),
    mockTxUpdate,
    mockTxSet,
    mockTxGet,
    mockSendEmail: vi.fn(),
  };
});

vi.mock("@/lib/firebase/admin", () => {
  // Chainable query object for orders (idempotency check)
  const ordersChain = {
    where: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    get: mockOrdersGet,
    doc: vi.fn().mockReturnValue({ id: "order-ref" }),
  };
  // Chainable query object for coupons
  const couponsChain = {
    where: vi.fn().mockReturnThis(),
    get: mockCouponsGet,
  };

  return {
    adminDb: {
      collection: vi.fn((name: string) => {
        if (name === "orders") return ordersChain;
        if (name === "coupons") return couponsChain;
        // products: each doc() call returns an object with get: mockProductGet
        return { doc: vi.fn().mockReturnValue({ get: mockProductGet }) };
      }),
      runTransaction: mockRunTransaction,
    },
    adminAuth: { verifyIdToken: mockVerifyIdToken },
  };
});

vi.mock("@/lib/email", () => ({
  sendOrderConfirmationEmail: mockSendEmail,
}));

vi.mock("firebase-admin/firestore", () => ({
  FieldValue: {
    serverTimestamp: vi.fn(() => "__TIMESTAMP__"),
    increment: vi.fn((n: number) => n),
  },
}));

// ─── Fixtures ────────────────────────────────────────────────────────────────

const VALID_ADDRESS = {
  full_name: "Jane Smith",
  phone: "9876543210",
  street: "42 Commerce Lane",
  city: "Mumbai",
  state: "Maharashtra",
  postal_code: "400001",
};

const VALID_INPUT = {
  user_id: "user-abc",
  id_token: "valid-id-token",
  items: [{ product_id: "prod-1", quantity: 2 }],
  shipping_address: VALID_ADDRESS,
};

function makeProductSnapshot(overrides: Partial<{
  exists: boolean;
  name: string;
  price: number;
  quantity: number;
  is_active: boolean;
}> = {}) {
  const {
    exists = true,
    name = "Widget",
    price = 500,
    quantity = 10,
    is_active = true,
  } = overrides;
  return {
    exists,
    id: "prod-1",
    data: () => ({ name, price, quantity, is_active, thumbnail: null }),
  };
}

function makeDecodedToken(uid = "user-abc", email = "jane@example.com", emailVerified = true) {
  return { uid, email, email_verified: emailVerified };
}

// ─── Test Setup ──────────────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks();
  // Default: no existing order (idempotency returns empty)
  mockOrdersGet.mockResolvedValue({ empty: true, docs: [] });
  // Default: auth succeeds
  mockVerifyIdToken.mockResolvedValue(makeDecodedToken());
  // Default: product exists with sufficient stock
  mockProductGet.mockResolvedValue(makeProductSnapshot());
  // Default: no coupon
  mockCouponsGet.mockResolvedValue({ empty: true, docs: [] });
  // Default: transaction executes callback (already wired in hoisted)
  mockRunTransaction.mockImplementation(async (cb: (tx: unknown) => Promise<void>) =>
    cb({ update: mockTxUpdate, set: mockTxSet, get: mockTxGet }),
  );
  // Default: email sends without error
  mockSendEmail.mockReturnValue(Promise.resolve());
});

// ─── Tests ───────────────────────────────────────────────────────────────────

describe("createOrder", () => {
  // ── Happy path ────────────────────────────────────────────────────────────

  it("creates an order and returns success with an order ID", async () => {
    const result = await createOrder(VALID_INPUT);

    expect(result.success).toBe(true);
    expect(result.order_id).toMatch(/^ORD-[A-Z0-9]{12}$/);
    expect(result.error).toBeUndefined();
  });

  it("runs an atomic Firestore transaction", async () => {
    await createOrder(VALID_INPUT);
    expect(mockRunTransaction).toHaveBeenCalledOnce();
  });

  it("decrements product stock inside the transaction", async () => {
    await createOrder(VALID_INPUT);
    // transaction.update called with new quantity (10 - 2 = 8)
    expect(mockTxUpdate).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ quantity: 8 }),
    );
  });

  it("calculates free shipping for orders >= ₹999", async () => {
    // 2 × ₹500 = ₹1000 subtotal → shipping = 0
    await createOrder(VALID_INPUT);
    expect(mockTxSet).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ shipping: 0, subtotal: 1000, total: 1000 }),
    );
  });

  it("calculates ₹99 shipping for orders < ₹999", async () => {
    mockProductGet.mockResolvedValue(makeProductSnapshot({ price: 200, quantity: 5 }));
    // 2 × ₹200 = ₹400 subtotal → shipping = 99
    await createOrder({ ...VALID_INPUT, items: [{ product_id: "prod-1", quantity: 2 }] });
    expect(mockTxSet).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ shipping: 99, subtotal: 400, total: 499 }),
    );
  });

  it("uses server-side price (ignores any client-side price)", async () => {
    // Even if somehow a client sends a tampered price, the action fetches from DB
    mockProductGet.mockResolvedValue(makeProductSnapshot({ price: 500 }));
    const result = await createOrder(VALID_INPUT);
    expect(result.success).toBe(true);
    expect(mockTxSet).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ subtotal: 1000 }),
    );
  });

  it("generates a unique order ID on each call", async () => {
    const r1 = await createOrder(VALID_INPUT);
    const r2 = await createOrder(VALID_INPUT);
    expect(r1.order_id).not.toEqual(r2.order_id);
  });

  // ── Authentication failures ────────────────────────────────────────────────

  it("returns error when ID token is invalid", async () => {
    mockVerifyIdToken.mockRejectedValue(new Error("Token expired"));
    const result = await createOrder(VALID_INPUT);
    expect(result.success).toBe(false);
    expect(result.error).toBe("Not authenticated");
  });

  it("returns error when email is not verified", async () => {
    mockVerifyIdToken.mockResolvedValue(makeDecodedToken("user-abc", "jane@example.com", false));
    const result = await createOrder(VALID_INPUT);
    expect(result.success).toBe(false);
    expect(result.error).toMatch(/verify your email/);
  });

  it("returns error when user_id does not match token uid", async () => {
    mockVerifyIdToken.mockResolvedValue(makeDecodedToken("different-uid"));
    const result = await createOrder(VALID_INPUT);
    expect(result.success).toBe(false);
    expect(result.error).toBe("Cannot create order for another user");
  });

  // ── Validation failures ───────────────────────────────────────────────────

  it("returns error when address fields are missing", async () => {
    const result = await createOrder({
      ...VALID_INPUT,
      shipping_address: { ...VALID_ADDRESS, city: "" },
    });
    expect(result.success).toBe(false);
    expect(result.error).toBe("Please fill in all address fields");
  });

  it("returns error when items array is empty", async () => {
    const result = await createOrder({ ...VALID_INPUT, items: [] });
    expect(result.success).toBe(false);
    expect(result.error).toBe("Invalid order data");
  });

  // ── Insufficient stock ────────────────────────────────────────────────────

  it("returns error when product has insufficient stock", async () => {
    mockProductGet.mockResolvedValue(makeProductSnapshot({ quantity: 1 }));
    // Requesting 2, only 1 available
    const result = await createOrder(VALID_INPUT);
    expect(result.success).toBe(false);
    expect(result.error).toMatch(/Insufficient stock/);
    expect(result.error).toMatch(/Widget/);
    expect(result.error).toMatch(/1 available/);
  });

  it("returns error when product is inactive", async () => {
    mockProductGet.mockResolvedValue(makeProductSnapshot({ is_active: false }));
    const result = await createOrder(VALID_INPUT);
    expect(result.success).toBe(false);
    expect(result.error).toMatch(/no longer available/);
  });

  it("returns error when product does not exist", async () => {
    mockProductGet.mockResolvedValue({ exists: false, id: "prod-1", data: () => undefined });
    const result = await createOrder(VALID_INPUT);
    expect(result.success).toBe(false);
    expect(result.error).toMatch(/not found/);
  });

  // ── Coupon validation ─────────────────────────────────────────────────────

  it("applies percentage coupon discount correctly", async () => {
    mockCouponsGet.mockResolvedValue({
      empty: false,
      docs: [{
        ref: "coupon-ref",
        data: () => ({
          is_active: true,
          expires_at: null,
          used_count: 0,
          usage_limit: null,
          min_order_amount: 0,
          discount_type: "percentage",
          discount_value: 10, // 10%
          max_discount_amount: null,
        }),
      }],
    });
    mockTxGet.mockResolvedValue({ data: () => ({ used_count: 0 }) });

    // subtotal = 1000, 10% = 100 discount, shipping = 0, total = 900
    const result = await createOrder({ ...VALID_INPUT, coupon_code: "SAVE10" });
    expect(result.success).toBe(true);
    expect(mockTxSet).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ discount: 100, total: 900 }),
    );
  });

  it("applies flat coupon discount correctly", async () => {
    mockCouponsGet.mockResolvedValue({
      empty: false,
      docs: [{
        ref: "coupon-ref",
        data: () => ({
          is_active: true,
          expires_at: null,
          used_count: 0,
          usage_limit: null,
          min_order_amount: 0,
          discount_type: "flat",
          discount_value: 150,
        }),
      }],
    });
    mockTxGet.mockResolvedValue({ data: () => ({ used_count: 0 }) });

    const result = await createOrder({ ...VALID_INPUT, coupon_code: "FLAT150" });
    expect(result.success).toBe(true);
    expect(mockTxSet).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ discount: 150, total: 850 }),
    );
  });

  it("returns error when coupon is inactive", async () => {
    mockCouponsGet.mockResolvedValue({
      empty: false,
      docs: [{ ref: "coupon-ref", data: () => ({ is_active: false }) }],
    });
    const result = await createOrder({ ...VALID_INPUT, coupon_code: "DEAD" });
    expect(result.success).toBe(false);
    expect(result.error).toBe("Coupon is no longer active");
  });

  it("returns error when coupon is expired", async () => {
    const pastDate = { toDate: () => new Date("2020-01-01") };
    mockCouponsGet.mockResolvedValue({
      empty: false,
      docs: [{
        ref: "coupon-ref",
        data: () => ({
          is_active: true,
          expires_at: pastDate,
          used_count: 0,
          usage_limit: null,
          min_order_amount: 0,
          discount_type: "flat",
          discount_value: 50,
        }),
      }],
    });
    const result = await createOrder({ ...VALID_INPUT, coupon_code: "EXPIRED" });
    expect(result.success).toBe(false);
    expect(result.error).toBe("Coupon has expired");
  });

  it("returns error when coupon has reached usage limit", async () => {
    mockCouponsGet.mockResolvedValue({
      empty: false,
      docs: [{
        ref: "coupon-ref",
        data: () => ({
          is_active: true,
          expires_at: null,
          used_count: 100,
          usage_limit: 100,
          min_order_amount: 0,
          discount_type: "flat",
          discount_value: 50,
        }),
      }],
    });
    const result = await createOrder({ ...VALID_INPUT, coupon_code: "MAXED" });
    expect(result.success).toBe(false);
    expect(result.error).toBe("Coupon has reached its maximum usage limit");
  });

  it("returns error when order subtotal is below coupon minimum", async () => {
    mockCouponsGet.mockResolvedValue({
      empty: false,
      docs: [{
        ref: "coupon-ref",
        data: () => ({
          is_active: true,
          expires_at: null,
          used_count: 0,
          usage_limit: null,
          min_order_amount: 2000, // requires ₹2000, order is only ₹1000
          discount_type: "flat",
          discount_value: 200,
        }),
      }],
    });
    const result = await createOrder({ ...VALID_INPUT, coupon_code: "HIGHMIN" });
    expect(result.success).toBe(false);
    expect(result.error).toMatch(/Minimum order value of ₹2000/);
  });

  it("returns error for invalid coupon code", async () => {
    mockCouponsGet.mockResolvedValue({ empty: true, docs: [] });
    const result = await createOrder({ ...VALID_INPUT, coupon_code: "INVALID" });
    expect(result.success).toBe(false);
    expect(result.error).toBe("Invalid coupon code");
  });

  // ── Idempotency ────────────────────────────────────────────────────────────

  it("returns existing order without re-creating when idempotency key already exists", async () => {
    const existingOrderId = "ORD-EXISTINGONE1";
    mockOrdersGet.mockResolvedValue({
      empty: false,
      docs: [{ id: existingOrderId }],
    });

    const result = await createOrder({
      ...VALID_INPUT,
      idempotency_key: "idem-key-123",
    });

    expect(result.success).toBe(true);
    expect(result.order_id).toBe(existingOrderId);
    // Auth and transaction should NOT have been called
    expect(mockVerifyIdToken).not.toHaveBeenCalled();
    expect(mockRunTransaction).not.toHaveBeenCalled();
  });

  it("proceeds normally when idempotency key is new", async () => {
    mockOrdersGet.mockResolvedValue({ empty: true, docs: [] });
    const result = await createOrder({
      ...VALID_INPUT,
      idempotency_key: "new-unique-key",
    });
    expect(result.success).toBe(true);
    expect(mockRunTransaction).toHaveBeenCalledOnce();
  });

  it("stores idempotency key in order metadata", async () => {
    await createOrder({ ...VALID_INPUT, idempotency_key: "my-key-abc" });
    expect(mockTxSet).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        metadata: expect.objectContaining({ idempotency_key: "my-key-abc" }),
      }),
    );
  });

  it("skips idempotency check when no key is provided", async () => {
    await createOrder(VALID_INPUT); // no idempotency_key
    expect(mockOrdersGet).not.toHaveBeenCalled();
  });

  // ── Email (non-blocking) ───────────────────────────────────────────────────

  it("does not fail if email sending throws", async () => {
    mockSendEmail.mockReturnValue(Promise.reject(new Error("SMTP error")));
    const result = await createOrder(VALID_INPUT);
    // Order should still succeed despite email failure
    expect(result.success).toBe(true);
  });

  // ── Transaction failure ────────────────────────────────────────────────────

  it("returns error when Firestore transaction fails", async () => {
    mockRunTransaction.mockRejectedValue(new Error("Firestore quota exceeded"));
    const result = await createOrder(VALID_INPUT);
    expect(result.success).toBe(false);
    expect(result.error).toBe("Firestore quota exceeded");
  });
});
