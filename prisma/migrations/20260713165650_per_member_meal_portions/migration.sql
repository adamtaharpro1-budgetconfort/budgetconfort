-- AlterTable
ALTER TABLE "HouseholdMember" ADD COLUMN     "goal" TEXT;

-- AlterTable
ALTER TABLE "Recipe" ADD COLUMN     "servingWeightGrams" INTEGER;

-- CreateTable
CREATE TABLE "MealPortion" (
    "id" TEXT NOT NULL,
    "mealPlanEntryId" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "grams" INTEGER,
    "calories" INTEGER,

    CONSTRAINT "MealPortion_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "MealPortion_mealPlanEntryId_memberId_key" ON "MealPortion"("mealPlanEntryId", "memberId");

-- AddForeignKey
ALTER TABLE "MealPortion" ADD CONSTRAINT "MealPortion_mealPlanEntryId_fkey" FOREIGN KEY ("mealPlanEntryId") REFERENCES "MealPlanEntry"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MealPortion" ADD CONSTRAINT "MealPortion_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "HouseholdMember"("id") ON DELETE CASCADE ON UPDATE CASCADE;
