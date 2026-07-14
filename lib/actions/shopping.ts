"use server";

import { generateObject } from "ai";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireSessionHousehold } from "@/lib/actions/helpers";
import { AI_MODEL } from "@/lib/ai";
import { SHOPPING_AISLES, AISLE_EXAMPLES } from "@/lib/shopping-aisles";

async function categorizeIngredients(names: string[]): Promise<Record<string, string>> {
  if (names.length === 0) return {};

  const aisleGuide = SHOPPING_AISLES.map((a) => `- ${a} : ${AISLE_EXAMPLES[a]}`).join("\n");

  try {
    const result = await generateObject({
      model: AI_MODEL,
      schema: z.object({
        items: z.array(z.object({ name: z.string(), aisle: z.enum(SHOPPING_AISLES) })),
      }),
      prompt: `Tu es expert en organisation de supermarché. Classe CHAQUE produit ci-dessous dans un seul rayon, en choisissant le plus précis et le plus pertinent parmi cette liste (ne jamais inventer un rayon en dehors de cette liste) :

${aisleGuide}

Règles :
- Utilise "Autre" uniquement si le produit ne correspond vraiment à aucun rayon ci-dessus.
- Un produit frais (viande, poisson, fruits, légumes, crèmerie) ne doit jamais aller dans "Épicerie salée" ou "Épicerie sucrée".
- Renvoie exactement un rayon pour chaque produit de la liste, dans le même ordre.

Produits à classer (${names.length}) : ${names.join(", ")}`,
    });
    const map: Record<string, string> = {};
    for (const item of result.object.items) {
      map[item.name.toLowerCase().trim()] = item.aisle;
    }
    return map;
  } catch (error) {
    console.error("[categorizeIngredients] failed:", error);
    return {};
  }
}

async function getOrCreateActiveList(householdId: string) {
  const existing = await prisma.shoppingList.findFirst({ where: { householdId, status: "ACTIVE" } });
  if (existing) return existing;
  return prisma.shoppingList.create({ data: { householdId, name: "Courses" } });
}

export async function addShoppingItem(input: { name: string; quantity?: number; unit?: string; category?: string }) {
  const { householdId } = await requireSessionHousehold();
  const list = await getOrCreateActiveList(householdId);
  await prisma.shoppingListItem.create({ data: { ...input, listId: list.id } });
  revalidatePath("/courses");
  revalidatePath("/dashboard");
}

export async function toggleShoppingItem(id: string) {
  const item = await prisma.shoppingListItem.findUnique({ where: { id } });
  if (!item) return;
  await prisma.shoppingListItem.update({ where: { id }, data: { checked: !item.checked } });
  revalidatePath("/courses");
  revalidatePath("/dashboard");
}

export async function deleteShoppingItem(id: string) {
  await prisma.shoppingListItem.delete({ where: { id } });
  revalidatePath("/courses");
  revalidatePath("/dashboard");
}

export async function clearShoppingList() {
  const { householdId } = await requireSessionHousehold();
  const list = await prisma.shoppingList.findFirst({ where: { householdId, status: "ACTIVE" } });
  if (list) {
    await prisma.shoppingListItem.deleteMany({ where: { listId: list.id } });
  }
  revalidatePath("/courses");
  revalidatePath("/dashboard");
}

export async function generateShoppingListFromMealPlan() {
  const { householdId } = await requireSessionHousehold();
  const now = new Date();
  const in7Days = new Date(now);
  in7Days.setDate(in7Days.getDate() + 7);

  const [entries, pantryItems, list] = await Promise.all([
    prisma.mealPlanEntry.findMany({
      where: { householdId, date: { gte: now, lte: in7Days } },
      include: { recipe: { include: { ingredients: true } }, portions: true },
    }),
    prisma.pantryItem.findMany({ where: { householdId }, select: { name: true } }),
    getOrCreateActiveList(householdId),
  ]);

  const pantryNames = new Set(pantryItems.map((p) => p.name.toLowerCase().trim()));
  const needed = new Map<string, { quantity: number; unit?: string }>();

  for (const entry of entries) {
    if (!entry.recipe) continue;

    // Ajuste les quantités à la somme réelle des portions individuelles plutôt qu'à
    // l'hypothèse de base de la recette (ex: quelqu'un en perte de poids mange moins).
    let scale = 1;
    if (entry.recipe.servingWeightGrams && entry.portions.length > 0) {
      const totalPortionGrams = entry.portions.reduce((s, p) => s + (p.grams ?? entry.recipe!.servingWeightGrams!), 0);
      const baseGrams = entry.recipe.servingWeightGrams * entry.recipe.servings;
      if (baseGrams > 0) scale = Math.min(Math.max(totalPortionGrams / baseGrams, 0.4), 2.5);
    }

    for (const ing of entry.recipe.ingredients) {
      const key = ing.name.toLowerCase().trim();
      if (pantryNames.has(key)) continue;
      const existing = needed.get(key);
      const scaledQuantity = (ing.quantity ?? 1) * scale;
      needed.set(key, { quantity: (existing?.quantity ?? 0) + scaledQuantity, unit: ing.unit ?? existing?.unit });
    }
  }

  const existingItems = await prisma.shoppingListItem.findMany({ where: { listId: list.id }, select: { name: true } });
  const existingNames = new Set(existingItems.map((i) => i.name.toLowerCase().trim()));

  const newNames = Array.from(needed.keys()).filter((name) => !existingNames.has(name));
  const aisleByName = await categorizeIngredients(newNames);

  const toCreate = newNames.map((name) => ({
    listId: list.id,
    name,
    quantity: Math.round(needed.get(name)!.quantity * 10) / 10,
    unit: needed.get(name)!.unit,
    category: aisleByName[name] ?? "Autre",
  }));

  if (toCreate.length > 0) {
    await prisma.shoppingListItem.createMany({ data: toCreate });
  }

  revalidatePath("/courses");
  return { ok: true as const, count: toCreate.length };
}

export async function recategorizeShoppingList() {
  const { householdId } = await requireSessionHousehold();
  const list = await prisma.shoppingList.findFirst({ where: { householdId, status: "ACTIVE" }, include: { items: true } });
  if (!list || list.items.length === 0) return { ok: true as const, count: 0 };

  const aisleByName = await categorizeIngredients(list.items.map((i) => i.name));

  let count = 0;
  await Promise.all(
    list.items.map(async (item) => {
      const aisle = aisleByName[item.name.toLowerCase().trim()];
      if (aisle && aisle !== item.category) {
        count++;
        await prisma.shoppingListItem.update({ where: { id: item.id }, data: { category: aisle } });
      }
    })
  );

  revalidatePath("/courses");
  return { ok: true as const, count };
}
