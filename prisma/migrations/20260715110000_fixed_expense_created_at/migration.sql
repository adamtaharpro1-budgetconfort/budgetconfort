-- AlterTable: add createdAt, backfilled with an old sentinel date for existing rows so they keep
-- counting in past months' history as before (same behavior as pre-migration), while new rows
-- created from now on get their real creation date.
ALTER TABLE "FixedExpense" ADD COLUMN "createdAt" TIMESTAMP(3) NOT NULL DEFAULT '2000-01-01T00:00:00Z';
ALTER TABLE "FixedExpense" ALTER COLUMN "createdAt" SET DEFAULT CURRENT_TIMESTAMP;
