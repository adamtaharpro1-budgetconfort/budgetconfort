import { prisma } from "@/lib/prisma";
import { requireHousehold } from "@/lib/household";
import { MealsClient } from "@/components/meals/meals-client";

const WEEKDAY = new Intl.DateTimeFormat("fr-FR", { weekday: "long", day: "numeric", month: "short" });

export default async function RepasPage() {
  const { userId, household } = await requireHousehold();

  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + 7);

  const [entries, favorites] = await Promise.all([
    prisma.mealPlanEntry.findMany({
      where: { householdId: household.id, date: { gte: start, lt: end } },
      include: { recipe: { include: { favoritedBy: { where: { userId } }, ingredients: true } } },
    }),
    prisma.recipe.findMany({
      where: { favoritedBy: { some: { userId } } },
      include: { favoritedBy: { where: { userId } }, ingredients: true },
      take: 12,
    }),
  ]);

  const days = Array.from({ length: 7 }).map((_, idx) => {
    const date = new Date(start);
    date.setDate(date.getDate() + idx);
    const dayEntries = entries.filter((e) => e.date.toDateString() === date.toDateString());
    return {
      date: date.toISOString(),
      label: WEEKDAY.format(date),
      entries: dayEntries.map((e) => ({
        id: e.id,
        mealType: e.mealType,
        recipe: e.recipe
          ? {
              id: e.recipe.id,
              name: e.recipe.name,
              photo: e.recipe.photo,
              prepTime: e.recipe.prepTime,
              difficulty: e.recipe.difficulty,
              calories: e.recipe.calories,
              priceEstimate: e.recipe.priceEstimate,
              proteins: e.recipe.proteins,
              carbs: e.recipe.carbs,
              fats: e.recipe.fats,
              servings: e.recipe.servings,
              cuisine: e.recipe.cuisine,
              steps: Array.isArray(e.recipe.steps) ? (e.recipe.steps as string[]) : [],
              ingredients: e.recipe.ingredients.map((i) => ({ name: i.name, quantity: i.quantity, unit: i.unit })),
              isFavorite: e.recipe.favoritedBy.length > 0,
            }
          : null,
      })),
    };
  });

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Repas</h1>
      <MealsClient
        days={days}
        currency={household.currency}
        favoriteRecipes={favorites.map((r) => ({
          id: r.id,
          name: r.name,
          photo: r.photo,
          prepTime: r.prepTime,
          difficulty: r.difficulty,
          calories: r.calories,
          priceEstimate: r.priceEstimate,
          proteins: r.proteins,
          carbs: r.carbs,
          fats: r.fats,
          servings: r.servings,
          cuisine: r.cuisine,
          steps: Array.isArray(r.steps) ? (r.steps as string[]) : [],
          ingredients: r.ingredients.map((i) => ({ name: i.name, quantity: i.quantity, unit: i.unit })),
          isFavorite: true,
        }))}
      />
    </div>
  );
}
