import { prisma } from "@/lib/prisma";
import { requireHousehold } from "@/lib/household";
import { StockClient } from "@/components/stock/stock-client";

export default async function StockPage() {
  const { household } = await requireHousehold();
  const items = await prisma.pantryItem.findMany({
    where: { householdId: household.id },
    orderBy: { expiryDate: "asc" },
  });

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Stock</h1>
      <StockClient
        items={items.map((i) => ({
          id: i.id,
          name: i.name,
          quantity: i.quantity,
          unit: i.unit,
          category: i.category,
          expiryDate: i.expiryDate ? i.expiryDate.toISOString() : null,
        }))}
      />
    </div>
  );
}
