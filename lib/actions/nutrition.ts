"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireSessionHousehold } from "@/lib/actions/helpers";
import {
  computeFullNutritionProfile,
  estimateGoalPlan,
  calculateMacros,
  calculateAge,
  type ActivityLevel,
  type NutritionGoal,
} from "@/lib/nutrition-calc";
import type { ActionResult } from "@/lib/actions/auth";

export async function updateNutritionProfile(input: {
  sex: string;
  birthDate: Date;
  height: number;
  weight: number;
  goal: NutritionGoal;
  targetWeightDelta?: number | null;
  targetDurationMonths?: number | null;
  activityLevel: ActivityLevel;
  allergies: string[];
  preferences: string[];
}): Promise<ActionResult> {
  const { userId } = await requireSessionHousehold();
  const { targetWeightDelta, targetDurationMonths, ...calcInput } = input;
  const base = computeFullNutritionProfile({ ...calcInput, age: calculateAge(input.birthDate) });
  const normalizedDelta = input.goal === "MAINTAIN" ? null : targetWeightDelta ?? null;
  const normalizedDuration = input.goal === "MAINTAIN" ? null : targetDurationMonths ?? null;
  const plan = estimateGoalPlan(base.tdee, input.goal, normalizedDelta, normalizedDuration);
  const computed = { bmr: base.bmr, tdee: base.tdee, calorieTarget: plan.dailyCalorieTarget, ...calculateMacros(plan.dailyCalorieTarget) };

  await prisma.nutritionProfile.upsert({
    where: { userId },
    create: {
      userId,
      ...input,
      targetWeightDelta: normalizedDelta,
      targetDurationMonths: normalizedDuration,
      ...computed,
      forbiddenFoods: [],
    },
    update: { ...input, targetWeightDelta: normalizedDelta, targetDurationMonths: normalizedDuration, ...computed },
  });
  await prisma.user.update({ where: { id: userId }, data: { height: input.height, weight: input.weight, sex: input.sex } });

  revalidatePath("/nutrition");
  revalidatePath("/parametres");
  revalidatePath("/famille");
  revalidatePath("/dashboard");
  return { ok: true };
}

export async function updateNutritionGoal(
  goal: NutritionGoal,
  targetWeightDelta?: number | null,
  targetDurationMonths?: number | null
): Promise<ActionResult> {
  const { userId } = await requireSessionHousehold();

  const existing = await prisma.nutritionProfile.findUnique({ where: { userId } });
  if (!existing?.sex || !existing.birthDate || !existing.height || !existing.weight) {
    return {
      ok: false,
      error: "Complète d'abord ton profil (âge, taille, poids) dans Paramètres → Nutrition.",
    };
  }

  const base = computeFullNutritionProfile({
    sex: existing.sex,
    age: calculateAge(existing.birthDate),
    height: existing.height,
    weight: existing.weight,
    activityLevel: (existing.activityLevel as ActivityLevel) ?? "MODERATE",
    goal,
  });

  const normalizedDelta = goal === "MAINTAIN" ? null : targetWeightDelta ?? null;
  const normalizedDuration = goal === "MAINTAIN" ? null : targetDurationMonths ?? null;
  const plan = estimateGoalPlan(base.tdee, goal, normalizedDelta, normalizedDuration);
  const computed = { bmr: base.bmr, tdee: base.tdee, calorieTarget: plan.dailyCalorieTarget, ...calculateMacros(plan.dailyCalorieTarget) };

  await prisma.nutritionProfile.update({
    where: { userId },
    data: { goal, targetWeightDelta: normalizedDelta, targetDurationMonths: normalizedDuration, ...computed },
  });

  revalidatePath("/nutrition");
  revalidatePath("/parametres");
  revalidatePath("/famille");
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
