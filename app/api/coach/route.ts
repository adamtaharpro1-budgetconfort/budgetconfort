import { streamText, convertToModelMessages, type UIMessage } from "ai";
import { AI_MODEL } from "@/lib/ai";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { computeBudget, activeFixedExpenseWhere } from "@/lib/budget-calc";

export const maxDuration = 60;

function textOf(message: UIMessage): string {
  return message.parts
    .filter((p): p is { type: "text"; text: string } => p.type === "text")
    .map((p) => p.text)
    .join("");
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return new Response("Unauthorized", { status: 401 });
  const userId = session.user.id;

  const { messages, conversationId }: { messages: UIMessage[]; conversationId: string } = await req.json();

  const conversation = await prisma.chatConversation.findFirst({ where: { id: conversationId, userId } });
  if (!conversation) return new Response("Conversation introuvable", { status: 404 });

  const lastMessage = messages[messages.length - 1];
  if (lastMessage?.role === "user") {
    const existingCount = await prisma.chatMessage.count({ where: { conversationId } });
    const userText = textOf(lastMessage);

    await prisma.chatMessage.create({
      data: { conversationId, userId, role: "user", content: userText },
    });

    if (existingCount === 0) {
      await prisma.chatConversation.update({
        where: { id: conversationId },
        data: { title: userText.slice(0, 60) || "Nouvelle conversation" },
      });
    }
  }

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
      prisma.fixedExpense.findMany({ where: { householdId, ...activeFixedExpenseWhere(now) } }),
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
    onFinish: async ({ text }) => {
      await prisma.chatMessage.create({
        data: { conversationId, userId, role: "assistant", content: text },
      });
      await prisma.chatConversation.update({
        where: { id: conversationId },
        data: { updatedAt: new Date() },
      });
    },
  });

  return result.toUIMessageStreamResponse();
}
