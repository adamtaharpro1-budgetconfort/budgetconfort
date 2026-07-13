import { prisma } from "@/lib/prisma";
import { requireHousehold } from "@/lib/household";
import { computeBudget } from "@/lib/budget-calc";
import { EnvelopesClient } from "@/components/envelopes/envelopes-client";

export default async function TirelinesPage() {
  const { household } = await requireHousehold();

  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const [incomes, fixedExpenses, transactionsThisMonth, envelopes] = await Promise.all([
    prisma.income.findMany({ where: { householdId: household.id } }),
    prisma.fixedExpense.findMany({ where: { householdId: household.id } }),
    prisma.transaction.findMany({ where: { householdId: household.id, date: { gte: startOfMonth } } }),
    prisma.budgetEnvelope.findMany({ where: { householdId: household.id }, orderBy: { createdAt: "desc" } }),
  ]);

  const totalIncome = incomes.reduce((s, i) => s + i.amount, 0);
  const totalFixed = fixedExpenses.reduce((s, f) => s + f.amount, 0);
  const variableSpent = transactionsThisMonth.reduce((s, t) => s + t.amount, 0);
  const budget = computeBudget({ totalIncome, totalFixed, variableSpentThisMonth: variableSpent });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Mes tirelires</h1>
        <p className="text-sm text-muted-foreground">
          Répartis l&apos;argent disponible une fois tes charges payées : budget restaurant, loisirs, argent de côté...
        </p>
      </div>
      <EnvelopesClient
        currency={household.currency}
        envelopes={envelopes}
        availableForVariable={budget.availableForVariable}
      />
    </div>
  );
}
