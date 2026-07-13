import { prisma } from "@/lib/prisma";
import { requireHousehold } from "@/lib/household";
import { computeBudget } from "@/lib/budget-calc";
import { BudgetClient } from "@/components/budget/budget-client";

export default async function BudgetPage() {
  const { household } = await requireHousehold();
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const [incomes, fixedExpenses, transactions] = await Promise.all([
    prisma.income.findMany({ where: { householdId: household.id }, orderBy: { date: "desc" } }),
    prisma.fixedExpense.findMany({ where: { householdId: household.id } }),
    prisma.transaction.findMany({
      where: { householdId: household.id, date: { gte: startOfMonth } },
      orderBy: { date: "desc" },
    }),
  ]);

  const totalIncome = incomes.reduce((s, i) => s + i.amount, 0);
  const totalFixed = fixedExpenses.reduce((s, f) => s + f.amount, 0);
  const variableSpent = transactions.reduce((s, t) => s + t.amount, 0);
  const budget = computeBudget({ totalIncome, totalFixed, variableSpentThisMonth: variableSpent });

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Budget</h1>
      <BudgetClient
        currency={household.currency}
        budget={budget}
        incomes={incomes.map((i) => ({ id: i.id, label: i.label, amount: i.amount, meta: i.type }))}
        fixedExpenses={fixedExpenses.map((f) => ({
          id: f.id,
          label: f.label,
          amount: f.amount,
          meta: f.dueDay ? `${f.category} · à payer le ${f.dueDay}` : f.category,
        }))}
        transactions={transactions.map((t) => ({ id: t.id, label: t.label, amount: t.amount, meta: t.category }))}
      />
    </div>
  );
}
