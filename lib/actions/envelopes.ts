"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireSessionHousehold } from "@/lib/actions/helpers";

function monthsElapsed(from: Date, to: Date) {
  return (to.getFullYear() - from.getFullYear()) * 12 + (to.getMonth() - from.getMonth());
}

/**
 * Charge les tirelires du foyer et crédite automatiquement le solde de chaque mois manqué : le
 * solde n'est jamais remis à 0, monthlyAmount vient simplement s'ajouter à ce qu'il reste (une
 * tirelire pas dépensée à 100% se remplit un peu plus le mois suivant). Évite d'avoir besoin d'un
 * cron : le rattrapage se fait à la prochaine consultation de la page.
 */
export async function getHouseholdEnvelopes(householdId: string) {
  const envelopes = await prisma.budgetEnvelope.findMany({ where: { householdId }, orderBy: { createdAt: "desc" } });
  const now = new Date();

  const updates = envelopes
    .map((e) => ({ envelope: e, months: monthsElapsed(e.periodStart, now) }))
    .filter((u) => u.months > 0);

  if (updates.length > 0) {
    await Promise.all(
      updates.map((u) =>
        prisma.budgetEnvelope.update({
          where: { id: u.envelope.id },
          data: { balance: { increment: u.envelope.monthlyAmount * u.months }, periodStart: now },
        })
      )
    );
  }

  return envelopes.map((e) => {
    const update = updates.find((u) => u.envelope.id === e.id);
    return update ? { ...e, balance: e.balance + e.monthlyAmount * update.months, periodStart: now } : e;
  });
}

export async function addEnvelope(input: { name: string; monthlyAmount: number; icon?: string }) {
  const { householdId } = await requireSessionHousehold();
  await prisma.budgetEnvelope.create({
    data: {
      householdId,
      name: input.name,
      monthlyAmount: input.monthlyAmount,
      balance: input.monthlyAmount,
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
    data: { balance: { decrement: amount } },
  });
  revalidatePath("/tirelires");
  revalidatePath("/dashboard");
}

/** Remet le solde au montant mensuel de base, en perdant le cumul accumulé jusque-là. */
export async function resetEnvelope(id: string) {
  const { householdId } = await requireSessionHousehold();
  const envelope = await prisma.budgetEnvelope.findFirst({ where: { id, householdId } });
  if (!envelope) return;
  await prisma.budgetEnvelope.update({
    where: { id },
    data: { balance: envelope.monthlyAmount, periodStart: new Date() },
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
