"use server";

import { generateObject } from "ai";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireSessionHousehold } from "@/lib/actions/helpers";
import { AI_MODEL } from "@/lib/ai";
import { resolveMemberCalorieTarget, calculateAge } from "@/lib/nutrition-calc";
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

const singleRecipeSchema = z.object({ recipe: recipeSchema, adviceMessage: z.string() });

const manualMealEstimateSchema = z.object({
  calories: z.number().int().min(50).max(3000),
  servingWeightGrams: z.number().int().min(50).max(1500),
  proteins: z.number().min(0),
  carbs: z.number().min(0),
  fats: z.number().min(0),
  prepTime: z.number().int().min(1).max(240),
  priceEstimate: z.number().min(0),
  ingredients: z.array(z.object({ name: z.string(), quantity: z.number().nullable(), unit: z.string().nullable() })),
  steps: z.array(z.string()).min(1),
});

// Répartition indicative des calories quotidiennes par type de repas.
const MEAL_CALORIE_WEIGHT: Record<string, number> = {
  BREAKFAST: 0.25,
  LUNCH: 0.35,
  DINNER: 0.3,
  SNACK: 0.1,
};

const MEAL_TYPE_LABELS: Record<string, string> = {
  BREAKFAST: "petit-déjeuner",
  LUNCH: "déjeuner",
  DINNER: "dîner",
  SNACK: "collation",
};

const GOAL_LABELS: Record<string, string> = {
  LOSE: "veut perdre du poids",
  MAINTAIN: "veut maintenir son poids",
  GAIN: "veut prendre du poids",
};

/** Contexte nutritionnel/foyer partagé par la génération d'un plan complet et la régénération d'un seul repas. */
async function buildMealPlanContext(userId: string, householdId: string, servings: number) {
  const [nutritionProfile, pantryItems, members] = await Promise.all([
    prisma.nutritionProfile.findUnique({ where: { userId } }),
    prisma.pantryItem.findMany({ where: { householdId }, take: 30, select: { name: true } }),
    prisma.householdMember.findMany({
      where: { householdId },
      include: { user: { include: { nutritionProfile: true } } },
    }),
  ]);

  const pantryNames = pantryItems.map((p) => p.name).join(", ") || "aucun produit en stock connu";

  // Besoins caloriques + objectif de chaque membre, pour dimensionner ses portions individuelles.
  // Volontairement AUCUNE portion chiffrée (calories/grammes) pour les enfants de moins de 16 ans :
  // ils sont comptés dans la taille du foyer (quantités de la recette adaptées en conséquence),
  // mais on ne veut pas se substituer à un parent pour décider combien un enfant doit manger.
  const memberProfiles = members.map((m) => {
    const birthDate = m.birthDate ?? m.user?.nutritionProfile?.birthDate ?? null;
    const age = birthDate ? calculateAge(birthDate) : null;
    const isYoungChild = m.isChild && (age == null || age < 16);
    return {
      id: m.id,
      label: m.label ?? m.user?.firstName ?? "Membre",
      isChild: m.isChild,
      goal: m.isChild ? null : m.user?.nutritionProfile?.goal ?? m.goal,
      calorieTarget: isYoungChild
        ? null
        : resolveMemberCalorieTarget({
            isChild: m.isChild,
            age,
            sex: m.sex ?? m.user?.nutritionProfile?.sex ?? null,
            height: m.height ?? m.user?.nutritionProfile?.height ?? null,
            weight: m.weight ?? m.user?.nutritionProfile?.weight ?? null,
            goal: m.user?.nutritionProfile?.goal ?? m.goal,
            linkedCalorieTarget: m.user?.nutritionProfile?.calorieTarget,
          }),
    };
  });

  const adultsCount = members.filter((m) => !m.isChild).length || servings;
  const childrenCount = members.filter((m) => m.isChild).length;
  const childrenAges = members
    .filter((m) => m.isChild && m.birthDate != null)
    .map((m) => calculateAge(m.birthDate!));
  const householdBreakdown =
    childrenCount > 0
      ? `Composition du foyer : ${adultsCount} adulte(s) et ${childrenCount} enfant(s)${childrenAges.length ? ` (âges : ${childrenAges.join(", ")})` : ""}. Adapte les portions : portions pleines pour les adultes, portions réduites et adaptées au goût des enfants selon leur âge.`
      : `Composition du foyer : ${servings} personne(s) (portions standards pour tous).`;

  const goalNotes = memberProfiles
    .filter((m) => !m.isChild && m.goal && m.goal !== "MAINTAIN")
    .map((m) => `${m.label} ${GOAL_LABELS[m.goal!] ?? ""}`);
  const goalBlock =
    goalNotes.length > 0
      ? `Objectifs individuels à prendre en compte (les portions de chacun seront ajustées automatiquement selon ses calories, mais privilégie des recettes qui restent adaptées à un objectif de perte de poids quand c'est pertinent — légères, riches en protéines, pas trop caloriques) : ${goalNotes.join(", ")}.`
      : "";

  return { nutritionProfile, pantryNames, memberProfiles, householdBreakdown, goalBlock };
}

/** Crée les portions individuelles d'un repas (part des calories selon le besoin de chaque membre). */
function buildPortionsData(
  mealPlanEntryId: string,
  mealType: string,
  recipeCalories: number,
  recipeServingWeightGrams: number,
  memberProfiles: Awaited<ReturnType<typeof buildMealPlanContext>>["memberProfiles"],
  weightSum: number
) {
  const mealWeight = (MEAL_CALORIE_WEIGHT[mealType] ?? 0.25) / weightSum;
  return memberProfiles
    .filter((m) => m.calorieTarget)
    .map((m) => {
      const mealCalories = m.calorieTarget! * mealWeight;
      const ratio = Math.min(Math.max(mealCalories / recipeCalories, 0.5), 1.6);
      return {
        mealPlanEntryId,
        memberId: m.id,
        calories: Math.round(recipeCalories * ratio),
        grams: Math.round(recipeServingWeightGrams * ratio),
      };
    });
}

export interface GenerateMealPlanInput {
  numDays: number;
  mealTypes: MealType[];
  budgetTotal?: number;
  servings: number;
  cuisine?: string;
  startDate?: Date;
  preferredIngredients?: string;
  meatMealsCount?: number;
}

export async function generateAiMealPlan(input: GenerateMealPlanInput): Promise<ActionResult & { adviceMessage?: string }> {
  const { userId, householdId } = await requireSessionHousehold();

  const startDate = input.startDate ?? new Date();
  const ctx = await buildMealPlanContext(userId, householdId, input.servings);

  const lunchDinnerTypes = input.mealTypes.filter((t) => t === "LUNCH" || t === "DINNER");
  const lunchDinnerCount = input.numDays * lunchDinnerTypes.length;
  const meatBlock =
    input.meatMealsCount != null && lunchDinnerTypes.length > 0
      ? `- Sur les ${lunchDinnerCount} repas de déjeuner/dîner de la semaine, prévois exactement ${input.meatMealsCount} repas avec de la viande (poulet, bœuf, porc, agneau...) et les ${Math.max(lunchDinnerCount - input.meatMealsCount, 0)} restants sans viande (poisson, œufs, végétarien...). Répartis-les de façon équilibrée sur la semaine plutôt que tous groupés.`
      : "";

  const prompt = `Tu es un chef cuisinier et nutritionniste. Génère un plan de repas de ${input.numDays} jour(s) pour ${input.servings} personne(s).

Contraintes :
- ${ctx.householdBreakdown}
- ${ctx.goalBlock}
- Repas à générer chaque jour : ${input.mealTypes.join(", ")}
${meatBlock}
- Budget total pour la période : ${input.budgetTotal ? `${input.budgetTotal} €` : "raisonnable, sans contrainte stricte"}
- Objectif calorique quotidien de référence : ${ctx.nutritionProfile?.calorieTarget ?? "environ 2000"} kcal
- Allergies à éviter absolument : ${ctx.nutritionProfile?.allergies?.join(", ") || "aucune"}
- Préférences alimentaires : ${ctx.nutritionProfile?.preferences?.join(", ") || "aucune"}
- Cuisine souhaitée : ${input.cuisine || "variée"}
- Produits déjà disponibles à la maison (à réutiliser en priorité si pertinent) : ${ctx.pantryNames}
${input.preferredIngredients ? `- Ingrédients que la famille aime et veut manger cette semaine (construis les recettes AUTOUR de ces ingrédients autant que possible, répartis-les intelligemment sur les différents repas plutôt que de tous les mettre dans une seule recette) : ${input.preferredIngredients}` : ""}

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
        const portionsData = buildPortionsData(
          entry.id,
          meal.mealType,
          meal.recipe.calories,
          meal.recipe.servingWeightGrams,
          ctx.memberProfiles,
          weightSum
        );

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

/** Supprime tous les repas planifiés (la semaine affichée sur /repas). */
export async function clearAllMeals() {
  const { householdId } = await requireSessionHousehold();
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const end = new Date(start);
  end.setDate(end.getDate() + 7);

  await prisma.mealPlanEntry.deleteMany({ where: { householdId, date: { gte: start, lt: end } } });
  revalidatePath("/repas");
  revalidatePath("/dashboard");
}

/** Estime les calories/macros/poids d'un plat saisi manuellement, à partir de son nom et ses ingrédients. */
export async function estimateManualMealNutrition(input: {
  name: string;
  ingredients: string[];
  servings: number;
}): Promise<ActionResult & { estimate?: z.infer<typeof manualMealEstimateSchema> }> {
  await requireSessionHousehold();
  if (!input.name.trim()) return { ok: false, error: "Indique d'abord un nom de plat." };

  const prompt = `Tu es chef cuisinier et nutritionniste. Construis la recette complète du plat suivant, prévu pour ${input.servings} personne(s) au total.

Plat : ${input.name}
${
    input.ingredients.length > 0
      ? `Ingrédients demandés par l'utilisateur (utilise EXACTEMENT ceux-ci, sans en retirer ; tu peux seulement ajouter des ingrédients de base indispensables comme sel/poivre/huile si besoin) : ${input.ingredients.join(", ")}`
      : "Aucun ingrédient précisé : choisis toi-même des ingrédients cohérents avec le nom du plat."
  }

Donne :
- la liste complète des ingrédients avec une quantité et une unité réalistes pour ${input.servings} personne(s) (ex: 400 g, 2 pièces, 1 c. à soupe)
- les étapes de préparation numérotées
- les calories, le poids en grammes et les macronutriments (protéines/glucides/lipides) d'UNE portion standard
- un temps de préparation raisonnable en minutes
- un prix estimé en euros pour l'ensemble du plat (tous les convives)`;

  try {
    const result = await generateObject({ model: AI_MODEL, schema: manualMealEstimateSchema, prompt });
    return { ok: true, estimate: result.object };
  } catch (error) {
    console.error("[estimateManualMealNutrition] failed:", error);
    return { ok: false, error: "L'estimation IA a échoué. Réessaie ou saisis les valeurs toi-même." };
  }
}

export interface ManualMealInput {
  entryId?: string; // si renseigné, remplace le repas existant plutôt que d'en créer un nouveau
  date: Date;
  mealType: MealType;
  servings: number;
  name: string;
  calories: number;
  servingWeightGrams: number;
  proteins?: number;
  carbs?: number;
  fats?: number;
  prepTime?: number;
  priceEstimate?: number;
  ingredients: { name: string; quantity: number | null; unit: string | null }[];
  steps?: string[];
}

/**
 * Enregistre un repas saisi manuellement (pas de génération IA) et recalcule aussitôt les portions
 * individuelles de chaque membre selon son objectif nutritionnel — même logique que pour un repas
 * généré par l'IA, pour que le repas reste cohérent avec le reste du plan.
 */
export async function saveManualMeal(input: ManualMealInput): Promise<ActionResult> {
  const { userId, householdId } = await requireSessionHousehold();
  const ctx = await buildMealPlanContext(userId, householdId, input.servings);

  const entryId = await prisma.$transaction(async (tx) => {
    const recipe = await tx.recipe.create({
      data: {
        name: input.name,
        prepTime: input.prepTime ?? 20,
        difficulty: "FACILE",
        calories: input.calories,
        servingWeightGrams: input.servingWeightGrams,
        priceEstimate: input.priceEstimate ?? 0,
        proteins: input.proteins ?? 0,
        carbs: input.carbs ?? 0,
        fats: input.fats ?? 0,
        servings: input.servings,
        steps: input.steps ?? [],
        isAiGenerated: false,
        ingredients: input.ingredients.length > 0 ? { create: input.ingredients } : undefined,
      },
    });

    let id = input.entryId;
    if (id) {
      await tx.mealPlanEntry.updateMany({
        where: { id, householdId },
        data: { recipeId: recipe.id, servings: input.servings },
      });
      await tx.mealPortion.deleteMany({ where: { mealPlanEntryId: id } });
    } else {
      const entry = await tx.mealPlanEntry.create({
        data: { householdId, date: input.date, mealType: input.mealType, recipeId: recipe.id, servings: input.servings },
      });
      id = entry.id;
    }

    const portionsData = buildPortionsData(id, input.mealType, input.calories, input.servingWeightGrams, ctx.memberProfiles, 1);
    if (portionsData.length > 0) {
      await tx.mealPortion.createMany({ data: portionsData });
    }

    return id;
  });

  revalidatePath("/repas");
  revalidatePath("/dashboard");
  return { ok: true };
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

/** Régénère uniquement un repas (une nouvelle recette IA différente), sans toucher au reste du plan. */
export async function regenerateMealSlot(entryId: string): Promise<ActionResult & { adviceMessage?: string }> {
  const { userId, householdId } = await requireSessionHousehold();

  const entry = await prisma.mealPlanEntry.findFirst({
    where: { id: entryId, householdId },
    include: { recipe: true },
  });
  if (!entry) return { ok: false, error: "Repas introuvable." };

  const ctx = await buildMealPlanContext(userId, householdId, entry.servings);

  const prompt = `Tu es un chef cuisinier et nutritionniste. L'utilisateur n'aime pas la recette actuellement proposée pour son ${MEAL_TYPE_LABELS[entry.mealType] ?? entry.mealType.toLowerCase()}${entry.recipe ? ` ("${entry.recipe.name}")` : ""} et veut une alternative. Propose UNE NOUVELLE recette différente pour ce repas, pour ${entry.servings} personne(s).

Contraintes :
- ${ctx.householdBreakdown}
- ${ctx.goalBlock}
- Objectif calorique quotidien de référence : ${ctx.nutritionProfile?.calorieTarget ?? "environ 2000"} kcal
- Allergies à éviter absolument : ${ctx.nutritionProfile?.allergies?.join(", ") || "aucune"}
- Préférences alimentaires : ${ctx.nutritionProfile?.preferences?.join(", ") || "aucune"}
- Produits déjà disponibles à la maison (à réutiliser en priorité si pertinent) : ${ctx.pantryNames}
- La nouvelle recette doit être clairement différente de la précédente (autre plat, pas juste une variante).

Donne un nom, le temps de préparation, la difficulté, les calories d'UNE portion standard, le poids en grammes d'UNE portion standard (servingWeightGrams), un prix estimé en euros, les macronutriments (protéines/glucides/lipides en grammes), les ingrédients avec quantités pour l'ensemble des convives, et les étapes de préparation numérotées. Termine par un court message de conseil (adviceMessage).`;

  let result;
  try {
    result = await generateObject({ model: AI_MODEL, schema: singleRecipeSchema, prompt });
  } catch (error) {
    console.error("[regenerateMealSlot] failed:", error);
    return { ok: false, error: "La régénération IA a échoué. Réessaie dans quelques instants." };
  }

  const recipe = result.object.recipe;

  await prisma.$transaction(async (tx) => {
    const newRecipe = await tx.recipe.create({
      data: {
        name: recipe.name,
        cuisine: recipe.cuisine,
        prepTime: recipe.prepTime,
        difficulty: recipe.difficulty,
        calories: recipe.calories,
        servingWeightGrams: recipe.servingWeightGrams,
        priceEstimate: recipe.priceEstimate,
        proteins: recipe.proteins,
        carbs: recipe.carbs,
        fats: recipe.fats,
        servings: recipe.servings,
        steps: recipe.steps,
        isAiGenerated: true,
        ingredients: {
          create: recipe.ingredients.map((i) => ({ name: i.name, quantity: i.quantity, unit: i.unit })),
        },
      },
    });

    await tx.mealPlanEntry.update({ where: { id: entry.id }, data: { recipeId: newRecipe.id } });
    await tx.mealPortion.deleteMany({ where: { mealPlanEntryId: entry.id } });

    const portionsData = buildPortionsData(
      entry.id,
      entry.mealType,
      recipe.calories,
      recipe.servingWeightGrams,
      ctx.memberProfiles,
      1
    );
    if (portionsData.length > 0) {
      await tx.mealPortion.createMany({ data: portionsData });
    }
  });

  revalidatePath("/repas");
  revalidatePath("/dashboard");
  return { ok: true, adviceMessage: result.object.adviceMessage };
}

/** Supprime puis régénère tous les repas d'une journée donnée avec l'IA. */
export async function regenerateDayMeals(dateIso: string): Promise<ActionResult & { adviceMessage?: string }> {
  const { householdId } = await requireSessionHousehold();

  const date = new Date(dateIso);
  date.setHours(0, 0, 0, 0);
  const nextDate = new Date(date);
  nextDate.setDate(nextDate.getDate() + 1);

  const existing = await prisma.mealPlanEntry.findMany({
    where: { householdId, date: { gte: date, lt: nextDate } },
  });
  if (existing.length === 0) {
    return { ok: false, error: "Aucun repas à régénérer pour cette journée." };
  }

  const mealTypes = Array.from(new Set(existing.map((e) => e.mealType)));
  const servings = existing[0].servings;

  await prisma.mealPlanEntry.deleteMany({ where: { id: { in: existing.map((e) => e.id) } } });

  return generateAiMealPlan({ numDays: 1, mealTypes, servings, startDate: date });
}
