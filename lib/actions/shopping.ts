"use server";

import { generateObject } from "ai";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireSessionHousehold } from "@/lib/actions/helpers";
import { AI_MODEL } from "@/lib/ai";
import { SHOPPING_AISLES } from "@/lib/shopping-aisles";

async function categorizeIngredients(names: string[]): Promise<Record<string, string>> {
  if (names.length === 0) return {};
  try {
    const result = await generateObject({
      model: AI_MODEL,
      schema: z.object({
        items: z.array(z.object({ name: z.string(), aisle: z.enum(SHOPPING_AISLES) })),
      }),
      prompt: `Classe chacun de ces produits alimentaires dans le rayon de supermarché le plus adapté parmi : ${SHOPPING_AISLES.join(", ")}.
Produits : ${names.join(", ")}`,
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

export async function generateShoppingListFromMealPlan() {
  const { householdId } = await requireSessionHousehold();
  const now = new Date();
  const in7Days = new Date(now);
  in7Days.setDate(in7Days.getDate() + 7);

  const [entries, pantryItems, list] = await Promise.all([
    prisma.mealPlanEntry.findMany({
      where: { householdId, date: { gte: now, lte: in7Days } },
      include: { recipe: { include: { ingredients: true } } },
    }),
    prisma.pantryItem.findMany({ where: { householdId }, select: { name: true } }),
    getOrCreateActiveList(householdId),
  ]);

  const pantryNames = new Set(pantryItems.map((p) => p.name.toLowerCase().trim()));
  const needed = new Map<string, { quantity: number; unit?: string }>();

  for (const entry of entries) {
    for (const ing of entry.recipe?.ingredients ?? []) {
      const key = ing.name.toLowerCase().trim();
      if (pantryNames.has(key)) continue;
      const existing = needed.get(key);
      needed.set(key, { quantity: (existing?.quantity ?? 0) + (ing.quantity ?? 1), unit: ing.unit ?? existing?.unit });
    }
  }

  const existingItems = await prisma.shoppingListItem.findMany({ where: { listId: list.id }, select: { name: true } });
  const existingNames = new Set(existingItems.map((i) => i.name.toLowerCase().trim()));

  const newNames = Array.from(needed.keys()).filter((name) => !existingNames.has(name));
  const aisleByName = await categorizeIngredients(newNames);

  const toCreate = newNames.map((name) => ({
    listId: list.id,
    name,
    quantity: needed.get(name)!.quantity,
    unit: needed.get(name)!.unit,
    category: aisleByName[name] ?? "Autre",
  }));

  if (toCreate.length > 0) {
    await prisma.shoppingListItem.createMany({ data: toCreate });
  }

  revalidatePath("/courses");
  return { ok: true as const, count: toCreate.length };
}
