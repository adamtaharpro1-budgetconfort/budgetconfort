"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireSessionHousehold } from "@/lib/actions/helpers";

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

  const toCreate = Array.from(needed.entries())
    .filter(([name]) => !existingNames.has(name))
    .map(([name, v]) => ({ listId: list.id, name, quantity: v.quantity, unit: v.unit }));

  if (toCreate.length > 0) {
    await prisma.shoppingListItem.createMany({ data: toCreate });
  }

  revalidatePath("/courses");
  return { ok: true as const, count: toCreate.length };
}
