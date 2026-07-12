import { streamText, convertToModelMessages, type UIMessage } from "ai";
import { AI_MODEL } from "@/lib/ai";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { computeBudget } from "@/lib/budget-calc";

export const maxDuration = 60;

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return new Response("Unauthorized", { status: 401 });

  const { messages }: { messages: UIMessage[] } = await req.json();
  const userId = session.user.id;

  const membership = await prisma.householdMember.findFirst({
    where: { userId },
    include: { household: true },
  });

  let contextBlock = "Aucune donnée disponible pour cet utilisateur pour le moment.";

  if (membership) {
    const householdId = membership.householdId;
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const [incomes, fixedExpenses, transactions, goals, nutritionProfile, pantryItems] = await Promise.all([
      prisma.income.findMany({ where: { householdId } }),
      prisma.fixedExpense.findMany({ where: { householdId } }),
      prisma.transaction.findMany({ where: { householdId, date: { gte: startOfMonth } } }),
      prisma.financialGoal.findMany({ where: { householdId } }),
      prisma.nutritionProfile.findUnique({ where: { userId } }),
      prisma.pantryItem.findMany({ where: { householdId }, take: 20, select: { name: true } }),
    ]);

    const totalIncome = incomes.reduce((s, i) => s + i.amount, 0);
    const totalFixed = fixedExpenses.reduce((s, f) => s + f.amount, 0);
    const variableSpent = transactions.reduce((s, t) => s + t.amount, 0);
    const budget = computeBudget({ totalIncome, totalFixed, variableSpentThisMonth: variableSpent });

    contextBlock = `
Foyer : ${membership.household.type}, devise ${membership.household.currency}
Budget restant ce mois-ci : ${budget.budgetRemaining} ${membership.household.currency}
Budget quotidien disponible : ${budget.dailyBudget} ${membership.household.currency}
Prévision fin de mois : ${budget.projectedEndOfMonth} ${membership.household.currency}
Objectifs financiers : ${goals.map((g) => `${g.name} (${g.currentAmount}/${g.targetAmount})`).join(", ") || "aucun"}
Profil nutritionnel : objectif calorique ${nutritionProfile?.calorieTarget ?? "non défini"} kcal/jour, allergies : ${nutritionProfile?.allergies?.join(", ") || "aucune"}
Produits en stock : ${pantryItems.map((p) => p.name).join(", ") || "aucun"}`;
  }

  const result = streamText({
    model: AI_MODEL,
    system: `Tu es le coach personnel de LifePilot AI, un assistant de vie intelligent qui aide l'utilisateur à gérer son budget, son alimentation, ses courses et ses objectifs.
Sois chaleureux, concret et actionnable. Réponds en français, de façon concise (quelques phrases ou une liste courte).
Voici le contexte actuel de l'utilisateur :
${contextBlock}`,
    messages: await convertToModelMessages(messages),
  });

  return result.toUIMessageStreamResponse();
}
