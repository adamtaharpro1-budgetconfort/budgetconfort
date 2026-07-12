import { prisma } from "@/lib/prisma";
import { requireHousehold } from "@/lib/household";
import { GoalsClient } from "@/components/goals/goals-client";

export default async function ObjectifsPage() {
  const { household } = await requireHousehold();
  const goals = await prisma.financialGoal.findMany({
    where: { householdId: household.id },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Objectifs financiers</h1>
      <GoalsClient currency={household.currency} goals={goals} />
    </div>
  );
}
