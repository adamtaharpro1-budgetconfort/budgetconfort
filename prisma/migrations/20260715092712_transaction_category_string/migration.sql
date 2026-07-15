-- AlterTable: convert Transaction.category from enum to free text (custom categories),
-- casting existing values instead of dropping the column to preserve data.
ALTER TABLE "Transaction" ALTER COLUMN "category" TYPE TEXT USING ("category"::TEXT);

-- DropEnum
DROP TYPE "VariableExpenseCategory";
