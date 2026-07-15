import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requireHousehold } from "@/lib/household";
import { getMonthRange, activeFixedExpenseWhere } from "@/lib/budget-calc";
import { formatCurrency } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

const MONTH_LABEL = new Intl.DateTimeFormat("fr-FR", { month: "long", year: "numeric" });

function monthParam(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

/** Parse le paramètre ?month=YYYY-MM ; par défaut le mois précédent (le mois en cours n'est pas encore terminé). */
function parseMonth(param: string | undefined, now: Date) {
  if (param && /^\d{4}-\d{2}$/.test(param)) {
    const [y, m] = param.split("-").map(Number);
    return new Date(y, m - 1, 1);
  }
  return new Date(now.getFullYear(), now.getMonth() - 1, 1);
}

export default async function HistoriquePage({ searchParams }: { searchParams: Promise<{ month?: string }> }) {
  const { month } = await searchParams;
  const { household } = await requireHousehold();

  const now = new Date();
  const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const target = parseMonth(month, now);
  const { start, end } = getMonthRange(target);
  const isCurrentMonth = start.getTime() === currentMonthStart.getTime();
  const prevMonth = new Date(target.getFullYear(), target.getMonth() - 1, 1);
  const nextMonth = new Date(target.getFullYear(), target.getMonth() + 1, 1);
  const canGoNext = nextMonth.getTime() <= currentMonthStart.getTime();

  const [incomes, fixedExpenses, transactions] = await Promise.all([
    prisma.income.findMany({
      where: { householdId: household.id, date: { gte: start, lt: end } },
      orderBy: { date: "desc" },
    }),
    prisma.fixedExpense.findMany({
      where: { householdId: household.id, createdAt: { lt: end }, ...activeFixedExpenseWhere(end) },
    }),
    prisma.transaction.findMany({
      where: { householdId: household.id, date: { gte: start, lt: end } },
      orderBy: { date: "desc" },
    }),
  ]);

  const totalIncome = incomes.reduce((s, i) => s + i.amount, 0);
  const totalFixed = fixedExpenses.reduce((s, f) => s + f.amount, 0);
  const totalVariable = transactions.reduce((s, t) => s + t.amount, 0);
  const solde = Math.round((totalIncome - totalFixed - totalVariable) * 100) / 100;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold">Historique</h1>
        <div className="flex items-center gap-2">
          <Link
            href={`/historique?month=${monthParam(prevMonth)}`}
            className="rounded-md border border-border p-2 text-muted-foreground hover:bg-muted hover:text-foreground"
            aria-label="Mois précédent"
          >
            <ChevronLeft className="h-4 w-4" />
          </Link>
          <span className="w-40 text-center text-sm font-medium capitalize">
            {MONTH_LABEL.format(target)}
            {isCurrentMonth && <span className="text-muted-foreground"> (en cours)</span>}
          </span>
          <Link
            href={canGoNext ? `/historique?month=${monthParam(nextMonth)}` : "#"}
            aria-disabled={!canGoNext}
            className={cn(
              "rounded-md border border-border p-2",
              canGoNext ? "text-muted-foreground hover:bg-muted hover:text-foreground" : "pointer-events-none opacity-30"
            )}
            aria-label="Mois suivant"
          >
            <ChevronRight className="h-4 w-4" />
          </Link>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Revenus</p>
            <p className="text-xl font-semibold">{formatCurrency(totalIncome, household.currency)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Dépenses (fixes + variables)</p>
            <p className="text-xl font-semibold">{formatCurrency(totalFixed + totalVariable, household.currency)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Solde {isCurrentMonth ? "prévisionnel" : "final"}</p>
            <p className={cn("text-xl font-semibold", solde < 0 && "text-destructive")}>
              {formatCurrency(solde, household.currency)}
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Revenus</CardTitle>
        </CardHeader>
        <CardContent>
          {incomes.length === 0 ? (
            <p className="text-sm text-muted-foreground">Aucun revenu enregistré ce mois-ci.</p>
          ) : (
            <ul className="divide-y divide-border">
              {incomes.map((i) => (
                <li key={i.id} className="flex items-center justify-between py-2 text-sm">
                  <span>
                    {i.label} <span className="text-muted-foreground">· {i.type}</span>
                  </span>
                  <span className="font-medium">{formatCurrency(i.amount, household.currency)}</span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Charges fixes</CardTitle>
        </CardHeader>
        <CardContent>
          {fixedExpenses.length === 0 ? (
            <p className="text-sm text-muted-foreground">Aucune charge fixe active ce mois-ci.</p>
          ) : (
            <ul className="divide-y divide-border">
              {fixedExpenses.map((f) => (
                <li key={f.id} className="flex items-center justify-between py-2 text-sm">
                  <span>
                    {f.label} <span className="text-muted-foreground">· {f.category}</span>
                  </span>
                  <span className="font-medium">{formatCurrency(f.amount, household.currency)}</span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Dépenses variables</CardTitle>
        </CardHeader>
        <CardContent>
          {transactions.length === 0 ? (
            <p className="text-sm text-muted-foreground">Aucune dépense variable enregistrée ce mois-ci.</p>
          ) : (
            <ul className="divide-y divide-border">
              {transactions.map((t) => (
                <li key={t.id} className="flex items-center justify-between py-2 text-sm">
                  <span>
                    {t.label} <span className="text-muted-foreground">· {t.category}</span>
                  </span>
                  <span className="font-medium">{formatCurrency(t.amount, household.currency)}</span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
