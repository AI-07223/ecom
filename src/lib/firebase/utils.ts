import { Timestamp } from "firebase/firestore";

/**
 * Converts Firestore Timestamp to ISO string
 */
export function timestampToString(
  timestamp: Timestamp | Date | string | { toDate: () => Date } | null | undefined,
): string {
  if (!timestamp) {
    return new Date().toISOString();
  }

  if (typeof timestamp === "string") {
    return timestamp;
  }

  if (timestamp instanceof Date) {
    return timestamp.toISOString();
  }

  // Firestore Timestamp
  if ("toDate" in timestamp && typeof timestamp.toDate === "function") {
    return timestamp.toDate().toISOString();
  }

  return new Date().toISOString();
}

/**
 * Type guard to check if value is a Firestore Timestamp
 */
export function isTimestamp(value: unknown): value is Timestamp {
  return (
    typeof value === "object" &&
    value !== null &&
    "toDate" in value &&
    typeof (value as { toDate: unknown }).toDate === "function" &&
    "seconds" in value &&
    "nanoseconds" in value
  );
}

/**
 * Converts an object with Timestamp fields to ISO strings
 */
export function convertTimestamps<T extends Record<string, unknown>>(
  data: T,
  dateFields: (keyof T)[],
): T {
  const result = { ...data };

  for (const field of dateFields) {
    const value = result[field];
    if (isTimestamp(value) || typeof value === "object") {
      (result as Record<string, unknown>)[field as string] = timestampToString(
        value as Timestamp | { toDate: () => Date },
      );
    }
  }

  return result;
}

/**
 * Safely converts Firestore document data to typed object with proper date conversion
 */
export function convertDoc<T extends Record<string, unknown> & { id: string }>(
  docData: Record<string, unknown>,
  id: string,
  dateFields: (keyof T)[],
): T {
  const converted = convertTimestamps({ ...docData, id } as T, dateFields);
  return converted;
}

/**
 * Validates that a value is a valid order status
 */
export function isValidOrderStatus(status: unknown): status is
  | "pending"
  | "confirmed"
  | "processing"
  | "shipped"
  | "delivered"
  | "cancelled"
  | "refunded" {
  const validStatuses = [
    "pending",
    "confirmed",
    "processing",
    "shipped",
    "delivered",
    "cancelled",
    "refunded",
  ];
  return typeof status === "string" && validStatuses.includes(status);
}

/**
 * Validates that a value is a valid payment status
 */
export function isValidPaymentStatus(
  status: unknown,
): status is "pending" | "paid" | "failed" | "refunded" {
  const validStatuses = ["pending", "paid", "failed", "refunded"];
  return typeof status === "string" && validStatuses.includes(status);
}

/**
 * Validates that a value is a valid user role
 */
export function isValidUserRole(
  role: unknown,
): role is "customer" | "wholeseller" | "admin" {
  const validRoles = ["customer", "wholeseller", "admin"];
  return typeof role === "string" && validRoles.includes(role);
}
