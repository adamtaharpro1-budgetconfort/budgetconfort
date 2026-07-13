"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { computeFullNutritionProfile, type ActivityLevel, type NutritionGoal } from "@/lib/nutrition-calc";
import type { ActionResult } from "@/lib/actions/auth";

const healthProfileSchema = z.object({
  firstName: z.string().min(1),
  sex: z.enum(["M", "F"]),
  age: z.number().min(10).max(120),
  height: z.number().min(50).max(250),
  weight: z.number().min(20).max(300),
  activityLevel: z.enum(["SEDENTARY", "LIGHT", "MODERATE", "ACTIVE", "VERY_ACTIVE"]),
  goal: z.enum(["LOSE", "MAINTAIN", "GAIN"]),
  targetWeightDelta: z.number().min(0).max(200).nullable().default(null),
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
  const nutrition = computeFullNutritionProfile({
    sex: data.sex,
    weight: data.weight,
    height: data.height,
    age: data.age,
    activityLevel: data.activityLevel as ActivityLevel,
    goal: data.goal as NutritionGoal,
  });
  const normalizedDelta = data.goal === "MAINTAIN" ? null : data.targetWeightDelta;

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
        age: data.age,
        height: data.height,
        weight: data.weight,
        goal: data.goal,
        targetWeightDelta: normalizedDelta,
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
        age: data.age,
        height: data.height,
        weight: data.weight,
        goal: data.goal,
        targetWeightDelta: normalizedDelta,
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
