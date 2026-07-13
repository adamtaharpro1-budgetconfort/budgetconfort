export interface BudgetSnapshot {
  totalIncome: number;
  totalFixed: number;
  variableSpentThisMonth: number;
}

export function daysInMonth(date = new Date()) {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
}

export function dayOfMonth(date = new Date()) {
  return date.getDate();
}

/** Bornes [début, fin) du mois calendaire de `date` — sert à ne compter que les revenus du mois en cours. */
export function getMonthRange(date = new Date()) {
  const start = new Date(date.getFullYear(), date.getMonth(), 1);
  const end = new Date(date.getFullYear(), date.getMonth() + 1, 1);
  return { start, end };
}

export function computeBudget(snapshot: BudgetSnapshot, now = new Date()) {
  const { totalIncome, totalFixed, variableSpentThisMonth } = snapshot;
  const totalDays = daysInMonth(now);
  const elapsedDays = dayOfMonth(now);
  const remainingDays = Math.max(totalDays - elapsedDays + 1, 1);

  const budgetRemaining = totalIncome - totalFixed - variableSpentThisMonth;
  const dailyBudget = budgetRemaining / remainingDays;

  const dailyBurnRate = variableSpentThisMonth / elapsedDays;
  const projectedVariableSpend = dailyBurnRate * totalDays;
  const projectedEndOfMonth = totalIncome - totalFixed - projectedVariableSpend;

  const availableForVariable = totalIncome - totalFixed;
  const isOverBudget = variableSpentThisMonth > availableForVariable;
  const possibleSavings = Math.max(projectedEndOfMonth, 0);

  return {
    budgetRemaining: Math.round(budgetRemaining * 100) / 100,
    dailyBudget: Math.round(dailyBudget * 100) / 100,
    projectedEndOfMonth: Math.round(projectedEndOfMonth * 100) / 100,
    isOverBudget,
    possibleSavings: Math.round(possibleSavings * 100) / 100,
    availableForVariable: Math.round(availableForVariable * 100) / 100,
    percentUsed: availableForVariable > 0 ? Math.min(Math.round((variableSpentThisMonth / availableForVariable) * 100), 999) : 0,
  };
}
