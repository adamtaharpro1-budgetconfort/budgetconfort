"use server";

import { randomBytes } from "crypto";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { requireSessionHousehold } from "@/lib/actions/helpers";
import type { ActionResult } from "@/lib/actions/auth";

export async function createFamilyInvite(input: { label?: string; isChild: boolean }): Promise<
  ActionResult & { url?: string }
> {
  const { userId, householdId } = await requireSessionHousehold();

  const token = randomBytes(24).toString("hex");
  const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24 * 7); // 7 jours

  await prisma.householdInvite.create({
    data: {
      householdId,
      label: input.label?.trim() || undefined,
      isChild: input.isChild,
      token,
      invitedBy: userId,
      expiresAt,
    },
  });

  revalidatePath("/famille");
  const url = `${process.env.NEXTAUTH_URL}/rejoindre-famille?token=${token}`;
  return { ok: true, url };
}

export async function listInvites() {
  const { householdId } = await requireSessionHousehold();
  return prisma.householdInvite.findMany({
    where: { householdId, status: "PENDING" },
    orderBy: { createdAt: "desc" },
  });
}

export async function cancelInvite(id: string): Promise<ActionResult> {
  const { householdId } = await requireSessionHousehold();
  await prisma.householdInvite.updateMany({
    where: { id, householdId },
    data: { status: "CANCELLED" },
  });
  revalidatePath("/famille");
  return { ok: true };
}

export async function getInviteByToken(token: string) {
  const invite = await prisma.householdInvite.findUnique({
    where: { token },
    include: { household: { select: { name: true, type: true } } },
  });
  if (!invite || invite.status !== "PENDING" || invite.expiresAt < new Date()) return null;
  return invite;
}

export async function acceptInvite(token: string): Promise<ActionResult> {
  const session = await auth();
  if (!session?.user?.id) return { ok: false, error: "Non authentifié" };

  const invite = await prisma.householdInvite.findUnique({ where: { token } });
  if (!invite || invite.status !== "PENDING") return { ok: false, error: "Invitation invalide ou déjà utilisée" };
  if (invite.expiresAt < new Date()) return { ok: false, error: "Cette invitation a expiré" };

  const userId = session.user.id;

  const existingMembership = await prisma.householdMember.findFirst({ where: { userId } });
  if (existingMembership) {
    if (existingMembership.householdId === invite.householdId) {
      return { ok: true };
    }
    return {
      ok: false,
      error: "Tu fais déjà partie d'un autre foyer. Contacte-nous si tu veux le changer.",
    };
  }

  await prisma.$transaction(async (tx) => {
    await tx.householdMember.create({
      data: {
        householdId: invite.householdId,
        userId,
        role: invite.isChild ? "CHILD" : "MEMBER",
        label: invite.label,
        isChild: invite.isChild,
      },
    });
    await tx.user.update({ where: { id: userId }, data: { onboardingDone: true } });
    await tx.householdInvite.update({ where: { id: invite.id }, data: { status: "ACCEPTED" } });
  });

  revalidatePath("/famille");
  return { ok: true };
}
