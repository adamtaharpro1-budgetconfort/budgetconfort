import { prisma } from "@/lib/prisma";
import { requireHousehold } from "@/lib/household";
import { NutritionClient } from "@/components/nutrition/nutrition-client";

export default async function NutritionPage() {
  const { userId } = await requireHousehold();
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const [profile, todayLog] = await Promise.all([
    prisma.nutritionProfile.findUnique({ where: { userId } }),
    prisma.dailyNutritionLog.findUnique({ where: { userId_date: { userId, date: today } } }),
  ]);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Nutrition</h1>
      <NutritionClient profile={profile} todayLog={todayLog} />
    </div>
  );
}
