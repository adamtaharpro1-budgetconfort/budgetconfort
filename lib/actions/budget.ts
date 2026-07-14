"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireSessionHousehold } from "@/lib/actions/helpers";
import type { IncomeType, VariableExpenseCategory } from "@prisma/client";

export async function addIncome(input: { label: string; amount: number; type: IncomeType }) {
  const { householdId, userId } = await requireSessionHousehold();
  await prisma.income.create({ data: { ...input, householdId, userId } });
  revalidatePath("/budget");
  revalidatePath("/dashboard");
}

export async function deleteIncome(id: string) {
  const { householdId } = await requireSessionHousehold();
  await prisma.income.deleteMany({ where: { id, householdId } });
  revalidatePath("/budget");
  revalidatePath("/dashboard");
}

export async function addFixedExpense(input: { label: string; amount: number; category: string; dueDay?: number }) {
  const { householdId } = await requireSessionHousehold();
  await prisma.fixedExpense.create({ data: { ...input, householdId } });
  revalidatePath("/budget");
  revalidatePath("/dashboard");
}

export async function updateFixedExpense(id: string, input: { label: string; amount: number; category: string; dueDay?: number }) {
  const { householdId } = await requireSessionHousehold();
  await prisma.fixedExpense.updateMany({ where: { id, householdId }, data: input });
  revalidatePath("/budget");
  revalidatePath("/dashboard");
}

export async function deleteFixedExpense(id: string) {
  const { householdId } = await requireSessionHousehold();
  await prisma.fixedExpense.deleteMany({ where: { id, householdId } });
  revalidatePath("/budget");
  revalidatePath("/dashboard");
}

export async function addTransaction(input: { label: string; amount: number; category: VariableExpenseCategory; date?: Date }) {
  const { householdId, userId } = await requireSessionHousehold();
  await prisma.transaction.create({
    data: { ...input, householdId, userId, date: input.date ?? new Date() },
  });
  revalidatePath("/budget");
  revalidatePath("/dashboard");
}

export async function deleteTransaction(id: string) {
  const { householdId } = await requireSessionHousehold();
  await prisma.transaction.deleteMany({ where: { id, householdId } });
  revalidatePath("/budget");
  revalidatePath("/dashboard");
}
