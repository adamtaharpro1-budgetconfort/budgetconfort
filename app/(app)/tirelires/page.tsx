import { prisma } from "@/lib/prisma";
import { requireHousehold } from "@/lib/household";
import { computeBudget, getMonthRange } from "@/lib/budget-calc";
import { EnvelopesClient } from "@/components/envelopes/envelopes-client";
import { getHouseholdEnvelopes } from "@/lib/actions/envelopes";
import { Card, CardContent } from "@/components/ui/card";
import Link from "next/link";

export default async function TirelinesPage() {
  const { household } = await requireHousehold();

  const now = new Date();
  const { start: startOfMonth, end: endOfMonth } = getMonthRange(now);

  const [incomes, fixedExpenses, transactionsThisMonth, envelopes] = await Promise.all([
    prisma.income.findMany({ where: { householdId: household.id, date: { gte: startOfMonth, lt: endOfMonth } } }),
    prisma.fixedExpense.findMany({ where: { householdId: household.id } }),
    prisma.transaction.findMany({ where: { householdId: household.id, date: { gte: startOfMonth } } }),
    getHouseholdEnvelopes(household.id),
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
      {incomes.length === 0 && (
        <Card className="border-warning/40 bg-warning/10">
          <CardContent className="flex flex-col gap-2 p-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm">
              <span className="font-medium">Aucun revenu renseigné ce mois-ci.</span> L&apos;argent disponible affiché est à 0€.
            </p>
            <Link href="/budget" className="shrink-0 text-sm font-medium text-primary underline-offset-4 hover:underline">
              Ajouter mes revenus →
            </Link>
          </CardContent>
        </Card>
      )}
      <EnvelopesClient
        currency={household.currency}
        envelopes={envelopes}
        availableForVariable={budget.availableForVariable}
      />
    </div>
  );
}
