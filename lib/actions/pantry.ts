"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireSessionHousehold } from "@/lib/actions/helpers";

export async function addPantryItem(input: { name: string; quantity?: number; unit?: string; category?: string; expiryDate?: Date }) {
  const { householdId } = await requireSessionHousehold();
  await prisma.pantryItem.create({ data: { ...input, householdId } });
  revalidatePath("/stock");
  revalidatePath("/dashboard");
}

export async function deletePantryItem(id: string) {
  const { householdId } = await requireSessionHousehold();
  await prisma.pantryItem.deleteMany({ where: { id, householdId } });
  revalidatePath("/stock");
  revalidatePath("/dashboard");
}
