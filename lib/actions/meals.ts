"use server";

import { generateObject } from "ai";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireSessionHousehold } from "@/lib/actions/helpers";
import { AI_MODEL } from "@/lib/ai";
import type { ActionResult } from "@/lib/actions/auth";
import type { MealType } from "@prisma/client";

const recipeSchema = z.object({
  name: z.string(),
  cuisine: z.string().optional(),
  prepTime: z.number().int().min(1).max(240),
  difficulty: z.enum(["FACILE", "MOYEN", "DIFFICILE"]),
  calories: z.number().int().min(50).max(3000),
  priceEstimate: z.number().min(0),
  proteins: z.number().min(0),
  carbs: z.number().min(0),
  fats: z.number().min(0),
  servings: z.number().int().min(1).max(12),
  ingredients: z.array(z.object({ name: z.string(), quantity: z.number().optional(), unit: z.string().optional() })),
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

  const [nutritionProfile, pantryItems] = await Promise.all([
    prisma.nutritionProfile.findUnique({ where: { userId } }),
    prisma.pantryItem.findMany({ where: { householdId }, take: 30, select: { name: true } }),
  ]);

  const startDate = input.startDate ?? new Date();
  const pantryNames = pantryItems.map((p) => p.name).join(", ") || "aucun produit en stock connu";

  const prompt = `Tu es un chef cuisinier et nutritionniste. Génère un plan de repas de ${input.numDays} jour(s) pour ${input.servings} personne(s).

Contraintes :
- Repas à générer chaque jour : ${input.mealTypes.join(", ")}
- Budget total pour la période : ${input.budgetTotal ? `${input.budgetTotal} €` : "raisonnable, sans contrainte stricte"}
- Objectif calorique quotidien par personne : ${nutritionProfile?.calorieTarget ?? "environ 2000"} kcal
- Allergies à éviter absolument : ${nutritionProfile?.allergies?.join(", ") || "aucune"}
- Préférences alimentaires : ${nutritionProfile?.preferences?.join(", ") || "aucune"}
- Cuisine souhaitée : ${input.cuisine || "variée"}
- Produits déjà disponibles à la maison (à réutiliser en priorité si pertinent) : ${pantryNames}

Pour chaque recette, donne un nom, le temps de préparation, la difficulté, les calories, un prix estimé en euros, les macronutriments (protéines/glucides/lipides en grammes), les ingrédients avec quantités, et les étapes de préparation numérotées. Termine par un court message de conseil personnalisé (adviceMessage) sur ce menu.`;

  let result;
  try {
    result = await generateObject({ model: AI_MODEL, schema: mealPlanSchema, prompt });
  } catch (error) {
    console.error("[generateAiMealPlan] failed:", error);
    return { ok: false, error: "La génération IA a échoué. Réessaie dans quelques instants." };
  }

  const plan = result.object;

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

        await tx.mealPlanEntry.create({
          data: {
            householdId,
            date,
            mealType: meal.mealType,
            recipeId: recipe.id,
            servings: input.servings,
          },
        });
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
