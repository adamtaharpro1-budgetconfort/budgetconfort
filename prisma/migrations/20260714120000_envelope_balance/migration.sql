-- AlterTable
ALTER TABLE "BudgetEnvelope" ADD COLUMN "balance" DOUBLE PRECISION NOT NULL DEFAULT 0;

-- Bootstrap existing envelopes with a full balance equal to their monthly amount
UPDATE "BudgetEnvelope" SET "balance" = "monthlyAmount";

-- AlterTable
ALTER TABLE "BudgetEnvelope" DROP COLUMN "spentAmount";
