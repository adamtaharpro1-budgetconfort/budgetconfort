import { prisma } from "@/lib/prisma";
import { requireHousehold } from "@/lib/household";
import { computeBudget } from "@/lib/budget-calc";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { formatCurrency, formatDate } from "@/lib/utils";
import Link from "next/link";
import { Sparkles, TriangleAlert } from "lucide-react";

export default async function DashboardPage() {
  const { userId, household } = await requireHousehold();

  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const endOfDay = new Date(startOfDay);
  endOfDay.setDate(endOfDay.getDate() + 1);
  const soonExpiry = new Date();
  soonExpiry.setDate(soonExpiry.getDate() + 4);

  const [user, incomes, fixedExpenses, transactionsThisMonth, goals, envelopes, todayMeals, pantrySoon, shoppingList, nutritionProfile, todayLog] =
    await Promise.all([
      prisma.user.findUnique({ where: { id: userId } }),
      prisma.income.findMany({ where: { householdId: household.id } }),
      prisma.fixedExpense.findMany({ where: { householdId: household.id } }),
      prisma.transaction.findMany({ where: { householdId: household.id, date: { gte: startOfMonth } } }),
      prisma.financialGoal.findMany({ where: { householdId: household.id }, take: 3 }),
      prisma.budgetEnvelope.findMany({ where: { householdId: household.id }, orderBy: { createdAt: "desc" }, take: 4 }),
      prisma.mealPlanEntry.findMany({
        where: { householdId: household.id, date: { gte: startOfDay, lt: endOfDay } },
        include: { recipe: true },
      }),
      prisma.pantryItem.findMany({
        where: { householdId: household.id, expiryDate: { lte: soonExpiry, gte: now } },
        take: 5,
        orderBy: { expiryDate: "asc" },
      }),
      prisma.shoppingList.findFirst({
        where: { householdId: household.id, status: "ACTIVE" },
        include: { items: true },
      }),
      prisma.nutritionProfile.findUnique({ where: { userId } }),
      prisma.dailyNutritionLog.findUnique({ where: { userId_date: { userId, date: startOfDay } } }),
    ]);

  const totalIncome = incomes.reduce((s, i) => s + i.amount, 0);
  const totalFixed = fixedExpenses.reduce((s, f) => s + f.amount, 0);
  const variableSpent = transactionsThisMonth.reduce((s, t) => s + t.amount, 0);
  const budget = computeBudget({ totalIncome, totalFixed, variableSpentThisMonth: variableSpent });

  const caloriesTarget = nutritionProfile?.calorieTarget ?? 2000;
  const caloriesConsumed = todayLog?.caloriesConsumed ?? 0;
  const caloriesRemaining = Math.max(caloriesTarget - caloriesConsumed, 0);

  const uncheckedItems = shoppingList?.items.filter((i) => !i.checked).length ?? 0;

  const dailyScore = Math.round(
    ((!budget.isOverBudget ? 40 : 10) +
      (caloriesConsumed > 0 ? 30 : 10) +
      (todayMeals.length > 0 ? 30 : 10))
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Bonjour {user?.firstName ?? ""} 👋</h1>
        <p className="text-muted-foreground">{formatDate(now)}</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Argent restant"
          value={formatCurrency(budget.budgetRemaining, household.currency)}
          badge={budget.isOverBudget ? { text: "Dépassement", variant: "destructive" } : undefined}
        />
        <StatCard label="Budget quotidien" value={formatCurrency(budget.dailyBudget, household.currency)} />
        <StatCard label="Calories restantes" value={`${caloriesRemaining} kcal`} />
        <StatCard label="Score du jour" value={`${dailyScore}/100`} />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Budget du mois</CardTitle>
            <CardDescription>
              {formatCurrency(variableSpent, household.currency)} dépensés sur{" "}
              {formatCurrency(budget.availableForVariable, household.currency)} disponibles
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Progress value={Math.min(budget.percentUsed, 100)} />
            <p className="mt-3 text-sm text-muted-foreground">
              Prévision fin de mois :{" "}
              <span className={budget.projectedEndOfMonth < 0 ? "text-destructive font-medium" : "font-medium text-foreground"}>
                {formatCurrency(budget.projectedEndOfMonth, household.currency)}
              </span>
            </p>
            <Link href="/budget" className="mt-3 inline-block text-sm text-primary underline-offset-4 hover:underline">
              Voir le détail →
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" /> Conseil IA
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              {budget.isOverBudget
                ? "Ton budget variable est dépassé ce mois-ci. Essaie de limiter les sorties restaurant jusqu'à la fin du mois."
                : "Tu es dans les clous ce mois-ci. Continue comme ça et pense à alimenter ton objectif d'épargne !"}
            </p>
            <Link href="/coach" className="mt-3 inline-block text-sm text-primary underline-offset-4 hover:underline">
              Parler au coach →
            </Link>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Repas du jour</CardTitle>
          </CardHeader>
          <CardContent>
            {todayMeals.length === 0 ? (
              <p className="text-sm text-muted-foreground">Aucun repas planifié. Génère ton menu avec l&apos;IA.</p>
            ) : (
              <ul className="space-y-2">
                {todayMeals.map((m) => (
                  <li key={m.id} className="text-sm">
                    <span className="text-muted-foreground">{m.mealType} — </span>
                    {m.recipe?.name ?? "?"}
                  </li>
                ))}
              </ul>
            )}
            <Link href="/repas" className="mt-3 inline-block text-sm text-primary underline-offset-4 hover:underline">
              Planning des repas →
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Liste de courses</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">{uncheckedItems}</p>
            <p className="text-sm text-muted-foreground">articles à acheter</p>
            <Link href="/courses" className="mt-3 inline-block text-sm text-primary underline-offset-4 hover:underline">
              Voir la liste →
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TriangleAlert className="h-4 w-4 text-warning" /> Bientôt périmés
            </CardTitle>
          </CardHeader>
          <CardContent>
            {pantrySoon.length === 0 ? (
              <p className="text-sm text-muted-foreground">Rien à signaler.</p>
            ) : (
              <ul className="space-y-1">
                {pantrySoon.map((p) => (
                  <li key={p.id} className="text-sm flex justify-between">
                    <span>{p.name}</span>
                    <span className="text-muted-foreground">{p.expiryDate ? formatDate(p.expiryDate) : ""}</span>
                  </li>
                ))}
              </ul>
            )}
            <Link href="/stock" className="mt-3 inline-block text-sm text-primary underline-offset-4 hover:underline">
              Voir le stock →
            </Link>
          </CardContent>
        </Card>
      </div>

      {goals.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Objectifs financiers</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {goals.map((g) => {
              const pct = g.targetAmount > 0 ? Math.min(Math.round((g.currentAmount / g.targetAmount) * 100), 100) : 0;
              return (
                <div key={g.id}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="font-medium">{g.name}</span>
                    <span className="text-muted-foreground">
                      {formatCurrency(g.currentAmount, household.currency)} / {formatCurrency(g.targetAmount, household.currency)}
                    </span>
                  </div>
                  <Progress value={pct} />
                </div>
              );
            })}
            <Link href="/objectifs" className="inline-block text-sm text-primary underline-offset-4 hover:underline">
              Voir tous mes objectifs →
            </Link>
          </CardContent>
        </Card>
      )}

      {envelopes.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>Mes tirelires</CardTitle>
            <CardDescription>Budget restaurant, loisirs, argent de côté... alimentés par ton argent disponible.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {envelopes.map((e) => {
              const pct = e.monthlyAmount > 0 ? Math.min(Math.round((e.spentAmount / e.monthlyAmount) * 100), 100) : 0;
              return (
                <div key={e.id}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="font-medium">{e.name}</span>
                    <span className="text-muted-foreground">
                      {formatCurrency(e.spentAmount, household.currency)} / {formatCurrency(e.monthlyAmount, household.currency)}
                    </span>
                  </div>
                  <Progress value={pct} />
                </div>
              );
            })}
            <Link href="/tirelires" className="inline-block text-sm text-primary underline-offset-4 hover:underline">
              Voir toutes mes tirelires →
            </Link>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Mes tirelires</CardTitle>
            <CardDescription>Répartis ton argent disponible ({formatCurrency(budget.availableForVariable, household.currency)}) en petits budgets.</CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/tirelires" className="inline-block text-sm text-primary underline-offset-4 hover:underline">
              Créer ma première tirelire →
            </Link>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function StatCard({
  label,
  value,
  badge,
}: {
  label: string;
  value: string;
  badge?: { text: string; variant: "destructive" | "success" | "warning" };
}) {
  return (
    <Card>
      <CardContent className="p-4">
        <p className="text-xs text-muted-foreground">{label}</p>
        <div className="mt-1 flex items-center gap-2">
          <p className="text-xl font-semibold">{value}</p>
          {badge && <Badge variant={badge.variant}>{badge.text}</Badge>}
        </div>
      </CardContent>
    </Card>
  );
}
