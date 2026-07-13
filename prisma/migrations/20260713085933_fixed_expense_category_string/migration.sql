-- AlterTable: convert enum column to plain text, preserving existing values
ALTER TABLE "FixedExpense" ALTER COLUMN "category" TYPE TEXT USING "category"::TEXT;

-- DropEnum
DROP TYPE "FixedExpenseCategory";
