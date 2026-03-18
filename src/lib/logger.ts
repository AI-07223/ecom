/**
 * Structured logger for server-side code.
 * - In production: JSON format for log aggregation
 * - In development: human-readable format
 *
 * Usage:
 *   import { logger } from "@/lib/logger";
 *   logger.info("[createOrder] Starting", { user_id, item_count: items.length });
 *   logger.error("[createOrder] Failed", error);
 */

type LogLevel = "debug" | "info" | "warn" | "error";

const IS_PROD = process.env.NODE_ENV === "production";

function log(level: LogLevel, message: string, data?: unknown): void {
  const timestamp = new Date().toISOString();

  if (IS_PROD) {
    const entry: Record<string, unknown> = { timestamp, level, message };
    if (data !== undefined) {
      if (data instanceof Error) {
        entry.error = { message: data.message, stack: data.stack, name: data.name };
      } else {
        entry.data = data;
      }
    }
    // In production, write structured JSON — log aggregators (Vercel, GCP) parse this
    const writer = level === "error" ? console.error : level === "warn" ? console.warn : console.log;
    writer(JSON.stringify(entry));
  } else {
    const prefix = `[${timestamp}] [${level.toUpperCase()}]`;
    if (data !== undefined) {
      const writer = level === "error" ? console.error : level === "warn" ? console.warn : console.log;
      writer(prefix, message, data);
    } else {
      const writer = level === "error" ? console.error : level === "warn" ? console.warn : console.log;
      writer(prefix, message);
    }
  }
}

export const logger = {
  debug: (message: string, data?: unknown) => log("debug", message, data),
  info:  (message: string, data?: unknown) => log("info",  message, data),
  warn:  (message: string, data?: unknown) => log("warn",  message, data),
  error: (message: string, data?: unknown) => log("error", message, data),
};
