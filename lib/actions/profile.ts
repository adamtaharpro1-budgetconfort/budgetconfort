"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireSessionHousehold } from "@/lib/actions/helpers";
import type { ActionResult } from "@/lib/actions/auth";

export async function updateProfile(input: {
  firstName: string;
  lastName?: string;
  language: string;
  currency: string;
  country?: string;
}): Promise<ActionResult> {
  const { userId } = await requireSessionHousehold();
  await prisma.user.update({ where: { id: userId }, data: input });
  revalidatePath("/parametres");
  return { ok: true };
}

export async function exportUserData() {
  const { userId } = await requireSessionHousehold();
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      householdMemberships: { include: { household: true } },
      nutritionProfile: true,
      dailyLogs: true,
      transactions: true,
      incomes: true,
    },
  });
  return user;
}

export async function deleteAccount(): Promise<ActionResult> {
  const { userId } = await requireSessionHousehold();
  await prisma.user.delete({ where: { id: userId } });
  return { ok: true };
}
