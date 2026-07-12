"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireSessionHousehold } from "@/lib/actions/helpers";
import { computeFullNutritionProfile, type ActivityLevel, type NutritionGoal } from "@/lib/nutrition-calc";
import type { ActionResult } from "@/lib/actions/auth";

export async function updateNutritionProfile(input: {
  sex: string;
  age: number;
  height: number;
  weight: number;
  goal: NutritionGoal;
  activityLevel: ActivityLevel;
  allergies: string[];
  preferences: string[];
}): Promise<ActionResult> {
  const { userId } = await requireSessionHousehold();
  const computed = computeFullNutritionProfile(input);

  await prisma.nutritionProfile.upsert({
    where: { userId },
    create: { userId, ...input, ...computed, forbiddenFoods: [] },
    update: { ...input, ...computed },
  });
  await prisma.user.update({ where: { id: userId }, data: { height: input.height, weight: input.weight, sex: input.sex } });

  revalidatePath("/nutrition");
  revalidatePath("/dashboard");
  return { ok: true };
}

export async function logNutritionEntry(input: { calories: number; proteins?: number; carbs?: number; fats?: number; waterMl?: number }) {
  const { userId } = await requireSessionHousehold();
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  await prisma.dailyNutritionLog.upsert({
    where: { userId_date: { userId, date: today } },
    create: {
      userId,
      date: today,
      caloriesConsumed: input.calories,
      proteins: input.proteins ?? 0,
      carbs: input.carbs ?? 0,
      fats: input.fats ?? 0,
      waterMl: input.waterMl ?? 0,
    },
    update: {
      caloriesConsumed: { increment: input.calories },
      proteins: { increment: input.proteins ?? 0 },
      carbs: { increment: input.carbs ?? 0 },
      fats: { increment: input.fats ?? 0 },
      waterMl: { increment: input.waterMl ?? 0 },
    },
  });

  revalidatePath("/nutrition");
  revalidatePath("/dashboard");
}
