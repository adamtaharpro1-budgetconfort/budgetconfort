"use server";

import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import {
  computeFullNutritionProfile,
  estimateGoalPlan,
  calculateMacros,
  type ActivityLevel,
  type NutritionGoal,
} from "@/lib/nutrition-calc";
import type { ActionResult } from "@/lib/actions/auth";

const onboardingSchema = z.object({
  firstName: z.string().min(1),
  householdType: z.enum(["SOLO", "COUPLE", "FAMILY"]),
  adultsCount: z.number().min(1).max(10).default(1),
  childrenCount: z.number().min(0).max(10).default(0),
  childrenAges: z.array(z.number().min(0).max(17)).default([]),
  monthlyIncome: z.number().min(0),
  rent: z.number().min(0),
  mainGoal: z.enum(["ECONOMISER", "MIEUX_MANGER", "PERDRE_POIDS", "ORGANISER_COURSES", "TOUT_FAIRE"]),
  height: z.number().min(50).max(250),
  weight: z.number().min(20).max(300),
  age: z.number().min(10).max(120),
  sex: z.enum(["M", "F"]),
  activityLevel: z.enum(["SEDENTARY", "LIGHT", "MODERATE", "ACTIVE", "VERY_ACTIVE"]),
  weightGoal: z.enum(["LOSE", "MAINTAIN", "GAIN"]).default("MAINTAIN"),
  targetWeightDelta: z.number().min(0).max(200).nullable().default(null),
  targetDurationMonths: z.number().min(0).max(60).nullable().default(null),
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

  const existingMembership = await prisma.householdMember.findFirst({ where: { userId } });
  if (existingMembership) {
    return { ok: true };
  }

  const base = computeFullNutritionProfile({
    sex: data.sex,
    weight: data.weight,
    height: data.height,
    age: data.age,
    activityLevel: data.activityLevel as ActivityLevel,
    goal: data.weightGoal as NutritionGoal,
  });
  const normalizedDelta = data.weightGoal === "MAINTAIN" ? null : data.targetWeightDelta;
  const normalizedDuration = data.weightGoal === "MAINTAIN" ? null : data.targetDurationMonths;
  const plan = estimateGoalPlan(base.tdee, data.weightGoal as NutritionGoal, normalizedDelta, normalizedDuration);
  const nutrition = {
    bmr: base.bmr,
    tdee: base.tdee,
    calorieTarget: plan.dailyCalorieTarget,
    ...calculateMacros(plan.dailyCalorieTarget),
  };

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

    const extraAdults = Math.max(data.adultsCount - 1, 0);
    for (let i = 0; i < extraAdults; i++) {
      await tx.householdMember.create({
        data: {
          householdId: household.id,
          role: "MEMBER",
          label: `Adulte ${i + 2}`,
          isChild: false,
        },
      });
    }

    for (let i = 0; i < data.childrenCount; i++) {
      await tx.householdMember.create({
        data: {
          householdId: household.id,
          role: "CHILD",
          label: `Enfant ${i + 1}`,
          isChild: true,
          age: data.childrenAges[i],
        },
      });
    }

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
        goal: data.weightGoal,
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
        age: data.age,
        height: data.height,
        weight: data.weight,
        goal: data.weightGoal,
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

    await tx.shoppingList.create({
      data: { householdId: household.id, name: "Ma liste de courses" },
    });
  });

  return { ok: true };
}
