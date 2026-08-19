ALTER TABLE "Share" ADD COLUMN "recipientEmail" TEXT;

CREATE INDEX "Share_recipientEmail_revokedAt_idx"
ON "Share"("recipientEmail", "revokedAt");
