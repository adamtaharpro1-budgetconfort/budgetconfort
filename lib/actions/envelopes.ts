"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireSessionHousehold } from "@/lib/actions/helpers";

function isSameMonth(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth();
}

/**
 * Charge les tirelires du foyer et reconduit automatiquement le budget mensuel : dès qu'on change
 * de mois, spentAmount repart à 0 (le montant alloué monthlyAmount, lui, ne change jamais tant que
 * l'utilisateur ne le modifie pas). Évite d'avoir besoin d'un cron : le rattrapage se fait à la
 * prochaine consultation de la page.
 */
export async function getHouseholdEnvelopes(householdId: string) {
  const envelopes = await prisma.budgetEnvelope.findMany({ where: { householdId }, orderBy: { createdAt: "desc" } });
  const now = new Date();
  const staleIds = envelopes.filter((e) => !isSameMonth(e.periodStart, now)).map((e) => e.id);

  if (staleIds.length > 0) {
    await prisma.budgetEnvelope.updateMany({
      where: { id: { in: staleIds } },
      data: { spentAmount: 0, periodStart: now },
    });
  }

  return envelopes.map((e) =>
    staleIds.includes(e.id) ? { ...e, spentAmount: 0, periodStart: now } : e
  );
}

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
    data: { spentAmount: 0, periodStart: new Date() },
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
