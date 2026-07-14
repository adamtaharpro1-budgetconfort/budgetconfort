-- AlterTable HouseholdMember: age (int) -> birthDate (approximated from existing age)
ALTER TABLE "HouseholdMember" ADD COLUMN "birthDate" TIMESTAMP(3);
UPDATE "HouseholdMember" SET "birthDate" = (CURRENT_DATE - ("age" || ' years')::interval) WHERE "age" IS NOT NULL;
ALTER TABLE "HouseholdMember" DROP COLUMN "age";

-- AlterTable NutritionProfile: age (int) -> birthDate (approximated from existing age)
ALTER TABLE "NutritionProfile" ADD COLUMN "birthDate" TIMESTAMP(3);
UPDATE "NutritionProfile" SET "birthDate" = (CURRENT_DATE - ("age" || ' years')::interval) WHERE "age" IS NOT NULL;
ALTER TABLE "NutritionProfile" DROP COLUMN "age";
