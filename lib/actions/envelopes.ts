"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireSessionHousehold } from "@/lib/actions/helpers";

export async function addEnvelope(input: { name: string; monthlyAmount: number; icon?: string }) {
  const { householdId } = await requireSessionHousehold();
  await prisma.budgetEnvelope.create({
    data: {
      householdId,
      name: input.name,
      monthlyAmount: input.monthlyAmount,
      icon: input.icon,
    },
  });
  revalidatePath("/tirelires");
  revalidatePath("/dashboard");
}

export async function recordEnvelopeSpend(id: string, amount: number) {
  const { householdId } = await requireSessionHousehold();
  await prisma.budgetEnvelope.updateMany({
    where: { id, householdId },
    data: { spentAmount: { increment: amount } },
  });
  revalidatePath("/tirelires");
  revalidatePath("/dashboard");
}

export async function resetEnvelope(id: string) {
  const { householdId } = await requireSessionHousehold();
  await prisma.budgetEnvelope.updateMany({
    where: { id, householdId },
    data: { spentAmount: 0 },
  });
  revalidatePath("/tirelires");
  revalidatePath("/dashboard");
}

export async function deleteEnvelope(id: string) {
  const { householdId } = await requireSessionHousehold();
  await prisma.budgetEnvelope.deleteMany({ where: { id, householdId } });
  revalidatePath("/tirelires");
  revalidatePath("/dashboard");
}
