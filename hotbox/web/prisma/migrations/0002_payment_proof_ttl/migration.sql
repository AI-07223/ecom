-- Add 30-day TTL column to payment proofs
ALTER TABLE "orders" ADD COLUMN "payment_proof_expires_at" TIMESTAMPTZ(6);
CREATE INDEX "orders_payment_proof_expires_at_idx" ON "orders"("payment_proof_expires_at");
