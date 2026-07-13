"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireSessionHousehold } from "@/lib/actions/helpers";
import type { ActivityLevel, NutritionGoal } from "@/lib/nutrition-calc";
import type { ActionResult } from "@/lib/actions/auth";

export interface FamilyMemberInput {
  label: string;
  isChild: boolean;
  age?: number;
  sex?: string;
  height?: number;
  weight?: number;
  activityLevel?: ActivityLevel;
  goal?: NutritionGoal;
  targetWeightDelta?: number | null;
}

export async function addFamilyMember(input: FamilyMemberInput): Promise<ActionResult> {
  const { householdId } = await requireSessionHousehold();
  if (!input.label.trim()) return { ok: false, error: "Indique un nom" };

  await prisma.householdMember.create({
    data: {
      householdId,
      role: input.isChild ? "CHILD" : "MEMBER",
      label: input.label.trim(),
      isChild: input.isChild,
      age: input.age,
      sex: input.sex,
      height: input.height,
      weight: input.weight,
      goal: input.isChild ? undefined : input.goal,
      targetWeightDelta: input.isChild || input.goal === "MAINTAIN" ? null : input.targetWeightDelta,
    },
  });

  revalidatePath("/famille");
  revalidatePath("/repas");
  revalidatePath("/nutrition");
  return { ok: true };
}

export async function updateFamilyMember(id: string, input: FamilyMemberInput): Promise<ActionResult> {
  const { householdId } = await requireSessionHousehold();
  if (!input.label.trim()) return { ok: false, error: "Indique un nom" };

  await prisma.householdMember.updateMany({
    where: { id, householdId },
    data: {
      label: input.label.trim(),
      isChild: input.isChild,
      role: input.isChild ? "CHILD" : "MEMBER",
      age: input.age,
      sex: input.sex,
      height: input.height,
      weight: input.weight,
      goal: input.isChild ? null : input.goal,
      targetWeightDelta: input.isChild || input.goal === "MAINTAIN" ? null : input.targetWeightDelta,
    },
  });

  revalidatePath("/famille");
  revalidatePath("/repas");
  revalidatePath("/nutrition");
  return { ok: true };
}

export async function deleteFamilyMember(id: string): Promise<ActionResult> {
  const { householdId } = await requireSessionHousehold();
  const member = await prisma.householdMember.findFirst({ where: { id, householdId } });
  if (!member) return { ok: false, error: "Introuvable" };
  if (member.userId) return { ok: false, error: "Impossible de supprimer un membre ayant son propre compte" };

  await prisma.householdMember.delete({ where: { id } });
  revalidatePath("/famille");
  revalidatePath("/repas");
  return { ok: true };
}
