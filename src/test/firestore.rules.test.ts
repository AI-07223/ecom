/**
 * Firestore Security Rules Tests
 *
 * Requires the Firebase Firestore emulator to be running:
 *   firebase emulators:start --only firestore
 *
 * The emulator must be available at FIRESTORE_EMULATOR_HOST (default: localhost:8080).
 * These tests are automatically skipped when the emulator is not running.
 *
 * To run only these tests:
 *   FIRESTORE_EMULATOR_HOST=localhost:8080 npx vitest run src/test/firestore.rules.test.ts
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import {
  initializeTestEnvironment,
  assertFails,
  assertSucceeds,
  type RulesTestEnvironment,
} from "@firebase/rules-unit-testing";
import { readFileSync } from "fs";
import { resolve } from "path";
import { setDoc, getDoc, deleteDoc, doc } from "firebase/firestore";

// ─── Skip if emulator is not available ───────────────────────────────────────
const EMULATOR_HOST = process.env.FIRESTORE_EMULATOR_HOST ?? "localhost:8080";
const EMULATOR_AVAILABLE = process.env.FIRESTORE_EMULATOR_HOST != null;

const describeWithEmulator = EMULATOR_AVAILABLE ? describe : describe.skip;

// ─── Test environment setup ───────────────────────────────────────────────────

let testEnv: RulesTestEnvironment;

const RULES = readFileSync(resolve(__dirname, "../../firestore.rules"), "utf-8");

beforeAll(async () => {
  if (!EMULATOR_AVAILABLE) return;
  const [host, portStr] = EMULATOR_HOST.split(":");
  testEnv = await initializeTestEnvironment({
    projectId: "royal-test",
    firestore: {
      host,
      port: parseInt(portStr, 10),
      rules: RULES,
    },
  });
});

afterAll(async () => {
  if (testEnv) await testEnv.cleanup();
});

beforeEach(async () => {
  if (testEnv) await testEnv.clearFirestore();
});

// ─── Helpers ─────────────────────────────────────────────────────────────────

function authed(uid: string, role: "customer" | "wholeseller" | "admin" = "customer") {
  return testEnv.authenticatedContext(uid, { uid });
}

function unauthed() {
  return testEnv.unauthenticatedContext();
}

async function seedProfile(uid: string, role: "customer" | "wholeseller" | "admin") {
  await testEnv.withSecurityRulesDisabled(async (ctx) => {
    await setDoc(doc(ctx.firestore(), "profiles", uid), {
      id: uid,
      email: `${uid}@test.com`,
      role,
      full_name: null,
    });
  });
}

async function seedProduct(productId: string) {
  await testEnv.withSecurityRulesDisabled(async (ctx) => {
    await setDoc(doc(ctx.firestore(), "products", productId), {
      name: "Test Product",
      price: 100,
      quantity: 10,
      is_active: true,
    });
  });
}

// ─── Products collection ──────────────────────────────────────────────────────

describeWithEmulator("products collection", () => {
  it("anyone (unauthenticated) can read products", async () => {
    await seedProduct("prod-1");
    const db = unauthed().firestore();
    await assertSucceeds(getDoc(doc(db, "products", "prod-1")));
  });

  it("authenticated customer cannot write products", async () => {
    await seedProfile("cust-1", "customer");
    const db = authed("cust-1").firestore();
    await assertFails(
      setDoc(doc(db, "products", "new-prod"), { name: "Test", price: 50, quantity: 5, is_active: true }),
    );
  });

  it("admin can write products", async () => {
    await seedProfile("admin-1", "admin");
    const db = authed("admin-1").firestore();
    await assertSucceeds(
      setDoc(doc(db, "products", "new-prod"), { name: "Test", price: 50, quantity: 5, is_active: true }),
    );
  });
});

// ─── Profiles collection ─────────────────────────────────────────────────────

describeWithEmulator("profiles collection", () => {
  it("user can read their own profile", async () => {
    await seedProfile("user-1", "customer");
    const db = authed("user-1").firestore();
    await assertSucceeds(getDoc(doc(db, "profiles", "user-1")));
  });

  it("user cannot read another user's profile", async () => {
    await seedProfile("user-2", "customer");
    const db = authed("user-1").firestore();
    await assertFails(getDoc(doc(db, "profiles", "user-2")));
  });

  it("admin can read any profile", async () => {
    await seedProfile("admin-1", "admin");
    await seedProfile("user-2", "customer");
    const db = authed("admin-1").firestore();
    await assertSucceeds(getDoc(doc(db, "profiles", "user-2")));
  });

  it("user can create their own profile with 'customer' role", async () => {
    const db = authed("new-user").firestore();
    await assertSucceeds(
      setDoc(doc(db, "profiles", "new-user"), {
        id: "new-user",
        email: "new@test.com",
        role: "customer",
        full_name: null,
      }),
    );
  });

  it("user cannot create a profile with 'admin' role", async () => {
    const db = authed("evil-user").firestore();
    await assertFails(
      setDoc(doc(db, "profiles", "evil-user"), {
        id: "evil-user",
        email: "evil@test.com",
        role: "admin",
        full_name: null,
      }),
    );
  });

  it("user cannot create a profile for another user", async () => {
    const db = authed("user-1").firestore();
    await assertFails(
      setDoc(doc(db, "profiles", "user-2"), {
        id: "user-2",
        email: "other@test.com",
        role: "customer",
        full_name: null,
      }),
    );
  });

  it("user cannot change their own role via update", async () => {
    await seedProfile("user-1", "customer");
    const db = authed("user-1").firestore();
    await assertFails(
      setDoc(doc(db, "profiles", "user-1"), {
        id: "user-1",
        email: "user@test.com",
        role: "admin", // escalation attempt
        full_name: "Hacker",
      }),
    );
  });
});

// ─── Cart collection ──────────────────────────────────────────────────────────

describeWithEmulator("cart collection", () => {
  it("user can read their own cart", async () => {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), "users/user-1/cart/item-1"), { product_id: "prod-1", quantity: 1 });
    });
    const db = authed("user-1").firestore();
    await assertSucceeds(getDoc(doc(db, "users/user-1/cart/item-1")));
  });

  it("user cannot read another user's cart", async () => {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), "users/user-2/cart/item-1"), { product_id: "prod-1", quantity: 1 });
    });
    const db = authed("user-1").firestore();
    await assertFails(getDoc(doc(db, "users/user-2/cart/item-1")));
  });

  it("unauthenticated user cannot access cart", async () => {
    const db = unauthed().firestore();
    await assertFails(getDoc(doc(db, "users/user-1/cart/item-1")));
  });
});

// ─── Orders collection ────────────────────────────────────────────────────────

describeWithEmulator("orders collection", () => {
  const validOrder = {
    user_id: "user-1",
    order_number: "ORD-TESTORDER",
    status: "pending",
    payment_status: "pending",
    subtotal: 500,
    shipping: 99,
    discount: 0,
    total: 599,
    currency: "INR",
    items: [{ product_id: "prod-1", quantity: 1, price: 500, total: 500, product_name: "Widget" }],
    shipping_address: { full_name: "Test", street: "123 Lane", city: "Mumbai", state: "MH", postal_code: "400001", phone: "9999999999" },
    created_at: new Date(),
    updated_at: new Date(),
  };

  it("user can create their own order with valid data", async () => {
    await seedProfile("user-1", "customer");
    const db = authed("user-1").firestore();
    await assertSucceeds(setDoc(doc(db, "orders", "ORD-001"), validOrder));
  });

  it("user cannot create an order for another user", async () => {
    await seedProfile("user-1", "customer");
    const db = authed("user-1").firestore();
    await assertFails(
      setDoc(doc(db, "orders", "ORD-002"), { ...validOrder, user_id: "user-2" }),
    );
  });

  it("unauthenticated user cannot create orders", async () => {
    const db = unauthed().firestore();
    await assertFails(setDoc(doc(db, "orders", "ORD-003"), validOrder));
  });

  it("user can read their own order", async () => {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), "orders", "ORD-004"), validOrder);
    });
    const db = authed("user-1").firestore();
    await assertSucceeds(getDoc(doc(db, "orders", "ORD-004")));
  });

  it("user cannot read another user's order", async () => {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), "orders", "ORD-005"), { ...validOrder, user_id: "user-2" });
    });
    const db = authed("user-1").firestore();
    await assertFails(getDoc(doc(db, "orders", "ORD-005")));
  });

  it("customer cannot update an order", async () => {
    await seedProfile("user-1", "customer");
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), "orders", "ORD-006"), validOrder);
    });
    const db = authed("user-1").firestore();
    await assertFails(
      setDoc(doc(db, "orders", "ORD-006"), { ...validOrder, status: "cancelled" }),
    );
  });

  it("admin can update an order status", async () => {
    await seedProfile("admin-1", "admin");
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), "orders", "ORD-007"), validOrder);
    });
    const db = authed("admin-1").firestore();
    await assertSucceeds(
      setDoc(doc(db, "orders", "ORD-007"), { ...validOrder, status: "confirmed" }),
    );
  });
});

// ─── Coupons collection ───────────────────────────────────────────────────────

describeWithEmulator("coupons collection", () => {
  it("anyone can read coupons", async () => {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), "coupons", "SAVE10"), { code: "SAVE10", is_active: true });
    });
    const db = unauthed().firestore();
    await assertSucceeds(getDoc(doc(db, "coupons", "SAVE10")));
  });

  it("customer cannot create coupons", async () => {
    await seedProfile("user-1", "customer");
    const db = authed("user-1").firestore();
    await assertFails(
      setDoc(doc(db, "coupons", "FAKE20"), { code: "FAKE20", is_active: true, discount_value: 100 }),
    );
  });

  it("admin can create coupons", async () => {
    await seedProfile("admin-1", "admin");
    const db = authed("admin-1").firestore();
    await assertSucceeds(
      setDoc(doc(db, "coupons", "LEGIT10"), { code: "LEGIT10", is_active: true, discount_value: 10 }),
    );
  });
});
