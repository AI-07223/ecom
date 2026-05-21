import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"

/**
 * Simple liveness endpoint for Coolify (and any external uptime monitor).
 * Returns 200 unconditionally — if Medusa boots far enough to serve this
 * route, it's healthy.
 */
export async function GET(req: MedusaRequest, res: MedusaResponse): Promise<void> {
  res.status(200).json({ status: "ok", service: "medusa" })
}
