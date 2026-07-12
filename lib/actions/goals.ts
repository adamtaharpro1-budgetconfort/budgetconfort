"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireSessionHousehold } from "@/lib/actions/helpers";
import type { GoalType } from "@prisma/client";

export async function addGoal(input: {
  name: string;
  type: GoalType;
  targetAmount: number;
  targetDate?: Date;
}) {
  const { householdId } = await requireSessionHousehold();
  const weeksUntilTarget = input.targetDate
    ? Math.max(Math.ceil((input.targetDate.getTime() - Date.now()) / (7 * 24 * 60 * 60 * 1000)), 1)
    : 26;

  await prisma.financialGoal.create({
    data: {
      ...input,
      householdId,
      weeklyContribution: Math.round((input.targetAmount / weeksUntilTarget) * 100) / 100,
    },
  });
  revalidatePath("/objectifs");
  revalidatePath("/dashboard");
}

export async function contributeToGoal(id: string, amount: number) {
  const { householdId } = await requireSessionHousehold();
  await prisma.financialGoal.updateMany({
    where: { id, householdId },
    data: { currentAmount: { increment: amount } },
  });
  revalidatePath("/objectifs");
  revalidatePath("/dashboard");
}

export async function deleteGoal(id: string) {
  const { householdId } = await requireSessionHousehold();
  await prisma.financialGoal.deleteMany({ where: { id, householdId } });
  revalidatePath("/objectifs");
  revalidatePath("/dashboard");
}
