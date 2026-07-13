"use server";

import { generateObject } from "ai";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireSessionHousehold } from "@/lib/actions/helpers";
import { AI_MODEL } from "@/lib/ai";
import { resolveMemberCalorieTarget } from "@/lib/nutrition-calc";
import type { ActionResult } from "@/lib/actions/auth";
import type { MealType } from "@prisma/client";

const recipeSchema = z.object({
  name: z.string(),
  cuisine: z.string().nullable(),
  prepTime: z.number().int().min(1).max(240),
  difficulty: z.enum(["FACILE", "MOYEN", "DIFFICILE"]),
  calories: z.number().int().min(50).max(3000),
  servingWeightGrams: z.number().int().min(50).max(1500),
  priceEstimate: z.number().min(0),
  proteins: z.number().min(0),
  carbs: z.number().min(0),
  fats: z.number().min(0),
  servings: z.number().int().min(1).max(12),
  ingredients: z.array(z.object({ name: z.string(), quantity: z.number().nullable(), unit: z.string().nullable() })),
  steps: z.array(z.string()).min(1),
});

const mealPlanSchema = z.object({
  days: z.array(
    z.object({
      dayIndex: z.number().int().min(0),
      meals: z.array(z.object({ mealType: z.enum(["BREAKFAST", "LUNCH", "DINNER", "SNACK"]), recipe: recipeSchema })),
    })
  ),
  totalEstimatedCost: z.number(),
  adviceMessage: z.string(),
});

// Répartition indicative des calories quotidiennes par type de repas.
const MEAL_CALORIE_WEIGHT: Record<string, number> = {
  BREAKFAST: 0.25,
  LUNCH: 0.35,
  DINNER: 0.3,
  SNACK: 0.1,
};

const GOAL_LABELS: Record<string, string> = {
  LOSE: "veut perdre du poids",
  MAINTAIN: "veut maintenir son poids",
  GAIN: "veut prendre du poids",
};

export interface GenerateMealPlanInput {
  numDays: number;
  mealTypes: MealType[];
  budgetTotal?: number;
  servings: number;
  cuisine?: string;
  startDate?: Date;
}

export async function generateAiMealPlan(input: GenerateMealPlanInput): Promise<ActionResult & { adviceMessage?: string }> {
  const { userId, householdId } = await requireSessionHousehold();

  const [nutritionProfile, pantryItems, members] = await Promise.all([
    prisma.nutritionProfile.findUnique({ where: { userId } }),
    prisma.pantryItem.findMany({ where: { householdId }, take: 30, select: { name: true } }),
    prisma.householdMember.findMany({
      where: { householdId },
      include: { user: { include: { nutritionProfile: true } } },
    }),
  ]);

  const startDate = input.startDate ?? new Date();
  const pantryNames = pantryItems.map((p) => p.name).join(", ") || "aucun produit en stock connu";

  // Besoins caloriques + objectif de chaque membre, pour dimensionner ses portions individuelles.
  const memberProfiles = members.map((m) => ({
    id: m.id,
    label: m.label ?? m.user?.firstName ?? "Membre",
    isChild: m.isChild,
    goal: m.isChild ? null : m.user?.nutritionProfile?.goal ?? m.goal,
    calorieTarget: resolveMemberCalorieTarget({
      isChild: m.isChild,
      age: m.age ?? m.user?.nutritionProfile?.age ?? null,
      sex: m.sex ?? m.user?.nutritionProfile?.sex ?? null,
      height: m.height ?? m.user?.nutritionProfile?.height ?? null,
      weight: m.weight ?? m.user?.nutritionProfile?.weight ?? null,
      goal: m.user?.nutritionProfile?.goal ?? m.goal,
      linkedCalorieTarget: m.user?.nutritionProfile?.calorieTarget,
    }),
  }));

  const adultsCount = members.filter((m) => !m.isChild).length || input.servings;
  const childrenCount = members.filter((m) => m.isChild).length;
  const childrenAges = members.filter((m) => m.isChild && m.age != null).map((m) => m.age);
  const householdBreakdown =
    childrenCount > 0
      ? `Composition du foyer : ${adultsCount} adulte(s) et ${childrenCount} enfant(s)${childrenAges.length ? ` (âges : ${childrenAges.join(", ")})` : ""}. Adapte les portions : portions pleines pour les adultes, portions réduites et adaptées au goût des enfants selon leur âge.`
      : `Composition du foyer : ${input.servings} personne(s) (portions standards pour tous).`;

  const goalNotes = memberProfiles
    .filter((m) => !m.isChild && m.goal && m.goal !== "MAINTAIN")
    .map((m) => `${m.label} ${GOAL_LABELS[m.goal!] ?? ""}`);
  const goalBlock =
    goalNotes.length > 0
      ? `Objectifs individuels à prendre en compte (les portions de chacun seront ajustées automatiquement selon ses calories, mais privilégie des recettes qui restent adaptées à un objectif de perte de poids quand c'est pertinent — légères, riches en protéines, pas trop caloriques) : ${goalNotes.join(", ")}.`
      : "";

  const prompt = `Tu es un chef cuisinier et nutritionniste. Génère un plan de repas de ${input.numDays} jour(s) pour ${input.servings} personne(s).

Contraintes :
- ${householdBreakdown}
- ${goalBlock}
- Repas à générer chaque jour : ${input.mealTypes.join(", ")}
- Budget total pour la période : ${input.budgetTotal ? `${input.budgetTotal} €` : "raisonnable, sans contrainte stricte"}
- Objectif calorique quotidien de référence : ${nutritionProfile?.calorieTarget ?? "environ 2000"} kcal
- Allergies à éviter absolument : ${nutritionProfile?.allergies?.join(", ") || "aucune"}
- Préférences alimentaires : ${nutritionProfile?.preferences?.join(", ") || "aucune"}
- Cuisine souhaitée : ${input.cuisine || "variée"}
- Produits déjà disponibles à la maison (à réutiliser en priorité si pertinent) : ${pantryNames}

Pour chaque recette, donne un nom, le temps de préparation, la difficulté, les calories d'UNE portion standard, le poids en grammes d'UNE portion standard (servingWeightGrams), un prix estimé en euros, les macronutriments (protéines/glucides/lipides en grammes), les ingrédients avec quantités pour l'ensemble des convives, et les étapes de préparation numérotées. Termine par un court message de conseil personnalisé (adviceMessage) sur ce menu.`;

  let result;
  try {
    result = await generateObject({ model: AI_MODEL, schema: mealPlanSchema, prompt });
  } catch (error) {
    console.error("[generateAiMealPlan] failed:", error);
    return { ok: false, error: "La génération IA a échoué. Réessaie dans quelques instants." };
  }

  const plan = result.object;
  const selectedWeights = input.mealTypes.map((t) => MEAL_CALORIE_WEIGHT[t] ?? 0.25);
  const weightSum = selectedWeights.reduce((s, w) => s + w, 0) || 1;

  await prisma.$transaction(async (tx) => {
    for (const day of plan.days) {
      const date = new Date(startDate);
      date.setDate(date.getDate() + day.dayIndex);
      date.setHours(0, 0, 0, 0);

      for (const meal of day.meals) {
        const recipe = await tx.recipe.create({
          data: {
            name: meal.recipe.name,
            cuisine: meal.recipe.cuisine,
            prepTime: meal.recipe.prepTime,
            difficulty: meal.recipe.difficulty,
            calories: meal.recipe.calories,
            servingWeightGrams: meal.recipe.servingWeightGrams,
            priceEstimate: meal.recipe.priceEstimate,
            proteins: meal.recipe.proteins,
            carbs: meal.recipe.carbs,
            fats: meal.recipe.fats,
            servings: meal.recipe.servings,
            steps: meal.recipe.steps,
            isAiGenerated: true,
            ingredients: {
              create: meal.recipe.ingredients.map((i) => ({ name: i.name, quantity: i.quantity, unit: i.unit })),
            },
          },
        });

        const entry = await tx.mealPlanEntry.create({
          data: {
            householdId,
            date,
            mealType: meal.mealType,
            recipeId: recipe.id,
            servings: input.servings,
          },
        });

        // Portion individuelle : part des calories du repas selon le besoin quotidien de chaque
        // membre, ramenée au poids/calories d'une portion standard de la recette. Bornée pour
        // éviter des portions absurdes en cas d'estimation extrême.
        const mealWeight = (MEAL_CALORIE_WEIGHT[meal.mealType] ?? 0.25) / weightSum;
        const portionsData = memberProfiles
          .filter((m) => m.calorieTarget)
          .map((m) => {
            const mealCalories = m.calorieTarget! * mealWeight;
            const ratio = Math.min(Math.max(mealCalories / meal.recipe.calories, 0.5), 1.6);
            return {
              mealPlanEntryId: entry.id,
              memberId: m.id,
              calories: Math.round(meal.recipe.calories * ratio),
              grams: Math.round(meal.recipe.servingWeightGrams * ratio),
            };
          });

        if (portionsData.length > 0) {
          await tx.mealPortion.createMany({ data: portionsData });
        }
      }
    }
  });

  revalidatePath("/repas");
  revalidatePath("/dashboard");
  return { ok: true, adviceMessage: plan.adviceMessage };
}

export async function toggleFavoriteRecipe(recipeId: string) {
  const { userId } = await requireSessionHousehold();
  const existing = await prisma.recipeFavorite.findUnique({
    where: { userId_recipeId: { userId, recipeId } },
  });
  if (existing) {
    await prisma.recipeFavorite.delete({ where: { id: existing.id } });
  } else {
    await prisma.recipeFavorite.create({ data: { userId, recipeId } });
  }
  revalidatePath("/repas");
}

export async function removeMealPlanEntry(id: string) {
  const { householdId } = await requireSessionHousehold();
  await prisma.mealPlanEntry.deleteMany({ where: { id, householdId } });
  revalidatePath("/repas");
  revalidatePath("/dashboard");
}

export async function assignRecipeToSlot(input: { date: Date; mealType: MealType; recipeId: string; servings: number }) {
  const { householdId } = await requireSessionHousehold();
  await prisma.mealPlanEntry.create({
    data: {
      householdId,
      date: input.date,
      mealType: input.mealType,
      recipeId: input.recipeId,
      servings: input.servings,
    },
  });
  revalidatePath("/repas");
  revalidatePath("/dashboard");
}
