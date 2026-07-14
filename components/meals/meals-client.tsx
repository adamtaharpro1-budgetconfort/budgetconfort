"use client";

import { useState, useTransition } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Sparkles, Trash2, Heart, Clock, Flame, Users, ChefHat, RefreshCw } from "lucide-react";
import {
  generateAiMealPlan,
  removeMealPlanEntry,
  toggleFavoriteRecipe,
  regenerateMealSlot,
  regenerateDayMeals,
  clearAllMeals,
} from "@/lib/actions/meals";
import { toast } from "sonner";
import { Progress } from "@/components/ui/progress";
import { useFakeProgress } from "@/lib/hooks/use-fake-progress";
import { cn, formatCurrency } from "@/lib/utils";

const MEAL_TYPES = [
  { value: "BREAKFAST", label: "Petit-déjeuner" },
  { value: "LUNCH", label: "Déjeuner" },
  { value: "DINNER", label: "Dîner" },
  { value: "SNACK", label: "Collation" },
];

interface RecipeInfo {
  id: string;
  name: string;
  photo: string | null;
  prepTime: number | null;
  difficulty: string;
  calories: number | null;
  priceEstimate: number | null;
  proteins?: number | null;
  carbs?: number | null;
  fats?: number | null;
  servings?: number;
  cuisine?: string | null;
  steps?: string[];
  ingredients?: { name: string; quantity: number | null; unit: string | null }[];
  isFavorite: boolean;
}

interface MemberPortion {
  label: string;
  grams: number | null;
  calories: number | null;
}

interface DayEntry {
  id: string;
  mealType: string;
  portions: MemberPortion[];
  recipe: RecipeInfo | null;
}

interface Day {
  date: string;
  label: string;
  entries: DayEntry[];
}

export function MealsClient({
  days,
  currency,
  favoriteRecipes,
  defaultServings,
}: {
  days: Day[];
  currency: string;
  favoriteRecipes: RecipeInfo[];
  defaultServings: number;
}) {
  const [openRecipe, setOpenRecipe] = useState<{ recipe: RecipeInfo; portions: MemberPortion[] } | null>(null);
  const hasMeals = days.some((d) => d.entries.some((e) => e.recipe));

  return (
    <div className="space-y-6">
      <div className="flex justify-end gap-2">
        {hasMeals && <ClearAllMealsButton />}
        <GenerateMealPlanDialog defaultServings={defaultServings} />
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {days.map((day) => (
          <Card key={day.date}>
            <CardHeader className="flex-row items-center justify-between gap-2">
              <CardTitle className="text-base">{day.label}</CardTitle>
              {day.entries.some((e) => e.recipe) && <RegenerateDayButton date={day.date} />}
            </CardHeader>
            <CardContent className="space-y-3">
              {MEAL_TYPES.map((mt) => {
                const entry = day.entries.find((e) => e.mealType === mt.value);
                return (
                  <div key={mt.value} className="rounded-md border border-border p-2">
                    <p className="text-[11px] font-medium uppercase text-muted-foreground">{mt.label}</p>
                    {entry?.recipe ? (
                      <MealSlot entry={entry} currency={currency} onOpen={() => setOpenRecipe({ recipe: entry.recipe!, portions: entry.portions })} />
                    ) : (
                      <p className="mt-1 text-xs text-muted-foreground/70">Vide</p>
                    )}
                  </div>
                );
              })}
            </CardContent>
          </Card>
        ))}
      </div>

      {favoriteRecipes.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Mes recettes favorites</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {favoriteRecipes.map((r) => (
              <RecipeCard key={r.id} recipe={r} currency={currency} onOpen={() => setOpenRecipe({ recipe: r, portions: [] })} />
            ))}
          </CardContent>
        </Card>
      )}

      <RecipeDetailDialog
        recipe={openRecipe?.recipe ?? null}
        portions={openRecipe?.portions ?? []}
        currency={currency}
        onClose={() => setOpenRecipe(null)}
      />
    </div>
  );
}

function MealSlot({ entry, currency, onOpen }: { entry: DayEntry; currency: string; onOpen: () => void }) {
  const [isPending, startTransition] = useTransition();
  const [isRegenerating, startRegenerate] = useTransition();
  if (!entry.recipe) return null;

  function handleRegenerate() {
    startRegenerate(async () => {
      const result = await regenerateMealSlot(entry.id);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success(result.adviceMessage || "Repas régénéré !");
    });
  }

  return (
    <div className={cn("mt-1 flex items-start justify-between gap-2", isRegenerating && "opacity-50")}>
      <button type="button" onClick={onOpen} className="flex-1 text-left" disabled={isRegenerating}>
        <p className="text-sm font-medium hover:underline">{entry.recipe.name}</p>
        <div className="mt-1 flex items-center gap-2 text-[11px] text-muted-foreground">
          {entry.recipe.calories && (
            <span className="flex items-center gap-0.5">
              <Flame className="h-3 w-3" /> {entry.recipe.calories} kcal
            </span>
          )}
          {entry.recipe.prepTime && (
            <span className="flex items-center gap-0.5">
              <Clock className="h-3 w-3" /> {entry.recipe.prepTime} min
            </span>
          )}
          {entry.recipe.priceEstimate != null && <span>{formatCurrency(entry.recipe.priceEstimate, currency)}</span>}
        </div>
        {entry.portions.length > 0 && (
          <div className="mt-1.5 flex flex-wrap gap-x-2 gap-y-0.5 text-[10px] text-muted-foreground">
            {entry.portions.map((p, i) => (
              <span key={i}>
                {p.label} {p.grams ? `${p.grams}g` : ""}
                {p.calories ? ` (${p.calories} kcal)` : ""}
              </span>
            ))}
          </div>
        )}
      </button>
      <div className="flex shrink-0 items-center gap-1.5">
        <button
          disabled={isPending || isRegenerating}
          onClick={handleRegenerate}
          title="Régénérer ce repas"
          className="text-muted-foreground hover:text-primary"
        >
          <RefreshCw className={cn("h-3.5 w-3.5", isRegenerating && "animate-spin")} />
        </button>
        <button
          disabled={isPending || isRegenerating}
          onClick={() => startTransition(() => removeMealPlanEntry(entry.id))}
          className="text-muted-foreground hover:text-destructive"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}

function RegenerateDayButton({ date }: { date: string }) {
  const [isPending, startTransition] = useTransition();

  function handleClick() {
    startTransition(async () => {
      const result = await regenerateDayMeals(date);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success(result.adviceMessage || "Journée régénérée !");
    });
  }

  return (
    <button
      disabled={isPending}
      onClick={handleClick}
      title="Régénérer toute la journée"
      className="flex shrink-0 items-center gap-1 text-[11px] text-muted-foreground hover:text-primary disabled:opacity-50"
    >
      <RefreshCw className={cn("h-3.5 w-3.5", isPending && "animate-spin")} />
      {isPending ? "..." : "Régénérer"}
    </button>
  );
}

function ClearAllMealsButton() {
  const [isPending, startTransition] = useTransition();

  function handleClick() {
    if (!window.confirm("Supprimer tous les repas planifiés cette semaine ? Cette action est irréversible.")) return;
    startTransition(async () => {
      await clearAllMeals();
      toast.success("Tous les repas ont été supprimés");
    });
  }

  return (
    <Button variant="outline" onClick={handleClick} disabled={isPending}>
      <Trash2 className="h-4 w-4" /> {isPending ? "..." : "Tout supprimer"}
    </Button>
  );
}

function RecipeCard({ recipe, currency, onOpen }: { recipe: RecipeInfo; currency: string; onOpen: () => void }) {
  const [isPending, startTransition] = useTransition();
  return (
    <div className="rounded-md border border-border p-3">
      <div className="flex items-start justify-between">
        <button type="button" onClick={onOpen} className="text-left text-sm font-medium hover:underline">
          {recipe.name}
        </button>
        <button
          disabled={isPending}
          onClick={(e) => {
            e.stopPropagation();
            startTransition(() => toggleFavoriteRecipe(recipe.id));
          }}
        >
          <Heart className={cn("h-4 w-4", recipe.isFavorite ? "fill-destructive text-destructive" : "text-muted-foreground")} />
        </button>
      </div>
      <div className="mt-2 flex items-center gap-2 text-[11px] text-muted-foreground">
        {recipe.calories && <span>{recipe.calories} kcal</span>}
        {recipe.prepTime && <span>{recipe.prepTime} min</span>}
        <Badge variant="outline">{recipe.difficulty}</Badge>
      </div>
    </div>
  );
}

function RecipeDetailDialog({
  recipe,
  portions,
  currency,
  onClose,
}: {
  recipe: RecipeInfo | null;
  portions: MemberPortion[];
  currency: string;
  onClose: () => void;
}) {
  return (
    <Dialog open={!!recipe} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[85vh] overflow-y-auto">
        {recipe && (
          <>
            <DialogHeader>
              <DialogTitle>{recipe.name}</DialogTitle>
              {recipe.cuisine && <DialogDescription>Cuisine {recipe.cuisine}</DialogDescription>}
            </DialogHeader>

            <div className="flex flex-wrap gap-2">
              <Badge variant="outline">{recipe.difficulty}</Badge>
              {recipe.prepTime && (
                <Badge variant="outline"><Clock className="mr-1 h-3 w-3" />{recipe.prepTime} min</Badge>
              )}
              {recipe.calories && (
                <Badge variant="outline"><Flame className="mr-1 h-3 w-3" />{recipe.calories} kcal / portion standard</Badge>
              )}
              {recipe.servings && (
                <Badge variant="outline"><Users className="mr-1 h-3 w-3" />{recipe.servings} pers.</Badge>
              )}
              {recipe.priceEstimate != null && <Badge variant="outline">{formatCurrency(recipe.priceEstimate, currency)}</Badge>}
            </div>

            {portions.length > 0 && (
              <div>
                <h3 className="mb-2 text-sm font-semibold">Portions par personne</h3>
                <ul className="space-y-1 rounded-md border border-border p-3 text-sm">
                  {portions.map((p, i) => (
                    <li key={i} className="flex justify-between">
                      <span>{p.label}</span>
                      <span className="text-muted-foreground">
                        {p.grams ? `${p.grams} g` : "—"}
                        {p.calories ? ` · ${p.calories} kcal` : ""}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {(recipe.proteins != null || recipe.carbs != null || recipe.fats != null) && (
              <div className="grid grid-cols-3 gap-2 rounded-md bg-muted p-3 text-center text-sm">
                <div>
                  <p className="font-semibold">{recipe.proteins ?? "-"}g</p>
                  <p className="text-[11px] text-muted-foreground">Protéines</p>
                </div>
                <div>
                  <p className="font-semibold">{recipe.carbs ?? "-"}g</p>
                  <p className="text-[11px] text-muted-foreground">Glucides</p>
                </div>
                <div>
                  <p className="font-semibold">{recipe.fats ?? "-"}g</p>
                  <p className="text-[11px] text-muted-foreground">Lipides</p>
                </div>
              </div>
            )}

            {recipe.ingredients && recipe.ingredients.length > 0 && (
              <div>
                <h3 className="mb-2 text-sm font-semibold">Ingrédients</h3>
                <ul className="space-y-1 text-sm text-muted-foreground">
                  {recipe.ingredients.map((ing, i) => (
                    <li key={i}>
                      • {ing.name}
                      {ing.quantity ? ` — ${ing.quantity}${ing.unit ?? ""}` : ing.unit ? ` — ${ing.unit}` : ""}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {recipe.steps && recipe.steps.length > 0 && (
              <div>
                <h3 className="mb-2 flex items-center gap-1.5 text-sm font-semibold">
                  <ChefHat className="h-4 w-4" /> Étapes
                </h3>
                <ol className="space-y-2 text-sm text-muted-foreground">
                  {recipe.steps.map((step, i) => (
                    <li key={i} className="flex gap-2">
                      <span className="font-medium text-foreground">{i + 1}.</span> {step}
                    </li>
                  ))}
                </ol>
              </div>
            )}
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

function GenerateMealPlanDialog({ defaultServings }: { defaultServings: number }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [numDays, setNumDays] = useState(7);
  const [servings, setServings] = useState(defaultServings);
  const [budget, setBudget] = useState("");
  const [cuisine, setCuisine] = useState("");
  const [selectedMeals, setSelectedMeals] = useState<string[]>(["LUNCH", "DINNER"]);

  function toggleMeal(v: string) {
    setSelectedMeals((prev) => (prev.includes(v) ? prev.filter((x) => x !== v) : [...prev, v]));
  }

  const recipeCount = numDays * selectedMeals.length;
  const estimatedSeconds = Math.max(3 + recipeCount * 2.2, 5);
  const { progress, setProgress } = useFakeProgress(loading, estimatedSeconds);

  async function handleGenerate() {
    if (selectedMeals.length === 0) {
      toast.error("Sélectionne au moins un type de repas");
      return;
    }
    setLoading(true);
    const result = await generateAiMealPlan({
      numDays,
      mealTypes: selectedMeals as never,
      servings,
      budgetTotal: budget ? Number(budget) : undefined,
      cuisine: cuisine || undefined,
    });

    if (!result.ok) {
      setLoading(false);
      toast.error(result.error);
      return;
    }

    setProgress(100);
    setTimeout(() => {
      setLoading(false);
      setOpen(false);
      toast.success(result.adviceMessage || "Menu généré !");
    }, 400);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Sparkles className="h-4 w-4" /> Générer mes repas
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Génération de menu par IA</DialogTitle>
        </DialogHeader>
        <div className={cn("space-y-4", loading && "pointer-events-none opacity-50")}>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Nombre de jours</Label>
              <Input type="number" min={1} max={14} value={numDays} onChange={(e) => setNumDays(Number(e.target.value))} disabled={loading} />
            </div>
            <div className="space-y-2">
              <Label>Nombre de personnes</Label>
              <Input type="number" min={1} max={12} value={servings} onChange={(e) => setServings(Number(e.target.value))} disabled={loading} />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Repas à générer</Label>
            <div className="flex flex-wrap gap-3">
              {MEAL_TYPES.map((mt) => (
                <label key={mt.value} className="flex items-center gap-2 text-sm">
                  <Checkbox checked={selectedMeals.includes(mt.value)} onCheckedChange={() => toggleMeal(mt.value)} disabled={loading} />
                  {mt.label}
                </label>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Budget total (optionnel)</Label>
              <Input type="number" value={budget} onChange={(e) => setBudget(e.target.value)} placeholder="Ex: 60" disabled={loading} />
            </div>
            <div className="space-y-2">
              <Label>Cuisine (optionnel)</Label>
              <Input value={cuisine} onChange={(e) => setCuisine(e.target.value)} placeholder="Ex: italienne" disabled={loading} />
            </div>
          </div>
        </div>

        {loading && (
          <div className="space-y-2">
            <Progress value={progress} />
            <p className="text-center text-xs text-muted-foreground">
              {progress < 100
                ? `Génération de ${recipeCount} recette${recipeCount > 1 ? "s" : ""} en cours... (${Math.round(progress)}%)`
                : "Menu prêt !"}
            </p>
          </div>
        )}

        <DialogFooter>
          <Button onClick={handleGenerate} disabled={loading}>
            {loading ? (
              <span className="flex items-center gap-2">
                <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" />
                Génération en cours...
              </span>
            ) : (
              "Générer le menu"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
