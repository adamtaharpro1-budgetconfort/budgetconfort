"use server";

import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { computeFullNutritionProfile, type ActivityLevel, type NutritionGoal } from "@/lib/nutrition-calc";
import type { ActionResult } from "@/lib/actions/auth";

const onboardingSchema = z.object({
  firstName: z.string().min(1),
  householdType: z.enum(["SOLO", "COUPLE", "FAMILY"]),
  monthlyIncome: z.number().min(0),
  rent: z.number().min(0),
  mainGoal: z.enum(["ECONOMISER", "MIEUX_MANGER", "PERDRE_POIDS", "ORGANISER_COURSES", "TOUT_FAIRE"]),
  height: z.number().min(50).max(250),
  weight: z.number().min(20).max(300),
  age: z.number().min(10).max(120),
  sex: z.enum(["M", "F"]),
  activityLevel: z.enum(["SEDENTARY", "LIGHT", "MODERATE", "ACTIVE", "VERY_ACTIVE"]),
  allergies: z.array(z.string()).default([]),
  preferences: z.array(z.string()).default([]),
});

export type OnboardingInput = z.infer<typeof onboardingSchema>;

export async function completeOnboarding(input: OnboardingInput): Promise<ActionResult> {
  const session = await auth();
  if (!session?.user?.id) return { ok: false, error: "Non authentifié" };

  const parsed = onboardingSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Données invalides" };
  const data = parsed.data;

  const userId = session.user.id;
  const goalToNutritionGoal: Record<string, NutritionGoal> = {
    ECONOMISER: "MAINTAIN",
    MIEUX_MANGER: "MAINTAIN",
    PERDRE_POIDS: "LOSE",
    ORGANISER_COURSES: "MAINTAIN",
    TOUT_FAIRE: "MAINTAIN",
  };

  const nutrition = computeFullNutritionProfile({
    sex: data.sex,
    weight: data.weight,
    height: data.height,
    age: data.age,
    activityLevel: data.activityLevel as ActivityLevel,
    goal: goalToNutritionGoal[data.mainGoal],
  });

  await prisma.$transaction(async (tx) => {
    const household = await tx.household.create({
      data: {
        name: `Foyer de ${data.firstName}`,
        type: data.householdType,
        budgetMonthly: data.monthlyIncome,
      },
    });

    await tx.householdMember.create({
      data: {
        householdId: household.id,
        userId,
        role: "OWNER",
        label: data.firstName,
      },
    });

    if (data.monthlyIncome > 0) {
      await tx.income.create({
        data: {
          householdId: household.id,
          userId,
          label: "Revenu principal",
          amount: data.monthlyIncome,
          type: "SALAIRE",
        },
      });
    }

    if (data.rent > 0) {
      await tx.fixedExpense.create({
        data: {
          householdId: household.id,
          label: "Loyer",
          category: "LOYER",
          amount: data.rent,
        },
      });
    }

    if (data.mainGoal === "ECONOMISER" || data.mainGoal === "TOUT_FAIRE") {
      await tx.financialGoal.create({
        data: {
          householdId: household.id,
          name: "Mon épargne",
          type: "URGENCE",
          targetAmount: Math.max(data.monthlyIncome * 3, 500),
          currentAmount: 0,
          weeklyContribution: Math.round((data.monthlyIncome - data.rent) * 0.1 * 100) / 100 / 4.33,
        },
      });
    }

    await tx.user.update({
      where: { id: userId },
      data: {
        firstName: data.firstName,
        height: data.height,
        weight: data.weight,
        sex: data.sex,
        onboardingDone: true,
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
        goal: goalToNutritionGoal[data.mainGoal],
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
        goal: goalToNutritionGoal[data.mainGoal],
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

    await tx.shoppingList.create({
      data: { householdId: household.id, name: "Ma liste de courses" },
    });
  });

  return { ok: true };
}
