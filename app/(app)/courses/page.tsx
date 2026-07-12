import { prisma } from "@/lib/prisma";
import { requireHousehold } from "@/lib/household";
import { ShoppingClient } from "@/components/shopping/shopping-client";

export default async function CoursesPage() {
  const { household } = await requireHousehold();
  const list = await prisma.shoppingList.findFirst({
    where: { householdId: household.id, status: "ACTIVE" },
    include: { items: true },
  });

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Liste de courses</h1>
      <ShoppingClient items={list?.items ?? []} />
    </div>
  );
}
