"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import {
  computeFullNutritionProfile,
  estimateGoalPlan,
  calculateMacros,
  calculateAge,
  type ActivityLevel,
  type NutritionGoal,
} from "@/lib/nutrition-calc";
import type { ActionResult } from "@/lib/actions/auth";

const healthProfileSchema = z.object({
  firstName: z.string().min(1),
  sex: z.enum(["M", "F"]),
  birthDate: z.coerce.date(),
  height: z.number().min(50).max(250),
  weight: z.number().min(20).max(300),
  activityLevel: z.enum(["SEDENTARY", "LIGHT", "MODERATE", "ACTIVE", "VERY_ACTIVE"]),
  goal: z.enum(["LOSE", "MAINTAIN", "GAIN"]),
  targetWeightDelta: z.number().min(0).max(200).nullable().default(null),
  targetDurationMonths: z.number().min(0).max(60).nullable().default(null),
  allergies: z.array(z.string()).default([]),
  preferences: z.array(z.string()).default([]),
});

export type HealthProfileInput = z.infer<typeof healthProfileSchema>;

export async function completeHealthProfile(input: HealthProfileInput): Promise<ActionResult> {
  const session = await auth();
  if (!session?.user?.id) return { ok: false, error: "Non authentifié" };

  const parsed = healthProfileSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Données invalides" };
  const data = parsed.data;

  const userId = session.user.id;
  const age = calculateAge(data.birthDate);
  const base = computeFullNutritionProfile({
    sex: data.sex,
    weight: data.weight,
    height: data.height,
    age,
    activityLevel: data.activityLevel as ActivityLevel,
    goal: data.goal as NutritionGoal,
  });
  const normalizedDelta = data.goal === "MAINTAIN" ? null : data.targetWeightDelta;
  const normalizedDuration = data.goal === "MAINTAIN" ? null : data.targetDurationMonths;
  const plan = estimateGoalPlan(base.tdee, data.goal as NutritionGoal, normalizedDelta, normalizedDuration);
  const nutrition = {
    bmr: base.bmr,
    tdee: base.tdee,
    calorieTarget: plan.dailyCalorieTarget,
    ...calculateMacros(plan.dailyCalorieTarget),
  };

  await prisma.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: userId },
      data: {
        firstName: data.firstName,
        sex: data.sex,
        height: data.height,
        weight: data.weight,
      },
    });

    await tx.nutritionProfile.upsert({
      where: { userId },
      create: {
        userId,
        sex: data.sex,
        birthDate: data.birthDate,
        height: data.height,
        weight: data.weight,
        goal: data.goal,
        targetWeightDelta: normalizedDelta,
        targetDurationMonths: normalizedDuration,
        activityLevel: data.activityLevel,
        allergies: data.allergies,
        preferences: data.preferences,
        forbiddenFoods: [],
        bmr: nutrition.bmr,
        tdee: nutrition.tdee,
        calorieTarget: nutrition.calorieTarget,
        proteinTarget: nutrition.proteinTarget,
        carbTarget: nutrition.carbTarget,
        fatTarget: nutrition.fatTarget,
      },
      update: {
        sex: data.sex,
        birthDate: data.birthDate,
        height: data.height,
        weight: data.weight,
        goal: data.goal,
        targetWeightDelta: normalizedDelta,
        targetDurationMonths: normalizedDuration,
        activityLevel: data.activityLevel,
        allergies: data.allergies,
        preferences: data.preferences,
        bmr: nutrition.bmr,
        tdee: nutrition.tdee,
        calorieTarget: nutrition.calorieTarget,
        proteinTarget: nutrition.proteinTarget,
        carbTarget: nutrition.carbTarget,
        fatTarget: nutrition.fatTarget,
      },
    });
  });

  revalidatePath("/nutrition");
  revalidatePath("/dashboard");
  return { ok: true };
}
