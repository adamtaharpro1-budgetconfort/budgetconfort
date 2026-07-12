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
  DialogFooter,
} from "@/components/ui/dialog";
import { Sparkles, Trash2, Heart, Clock, Flame } from "lucide-react";
import { generateAiMealPlan, removeMealPlanEntry, toggleFavoriteRecipe } from "@/lib/actions/meals";
import { toast } from "sonner";
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
  isFavorite: boolean;
}

interface DayEntry {
  id: string;
  mealType: string;
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
}: {
  days: Day[];
  currency: string;
  favoriteRecipes: RecipeInfo[];
}) {
  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <GenerateMealPlanDialog />
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {days.map((day) => (
          <Card key={day.date}>
            <CardHeader>
              <CardTitle className="text-base">{day.label}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {MEAL_TYPES.map((mt) => {
                const entry = day.entries.find((e) => e.mealType === mt.value);
                return (
                  <div key={mt.value} className="rounded-md border border-border p-2">
                    <p className="text-[11px] font-medium uppercase text-muted-foreground">{mt.label}</p>
                    {entry?.recipe ? (
                      <MealSlot entry={entry} currency={currency} />
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
              <RecipeCard key={r.id} recipe={r} currency={currency} />
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function MealSlot({ entry, currency }: { entry: DayEntry; currency: string }) {
  const [isPending, startTransition] = useTransition();
  if (!entry.recipe) return null;
  return (
    <div className="mt-1 flex items-start justify-between gap-2">
      <div>
        <p className="text-sm font-medium">{entry.recipe.name}</p>
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
      </div>
      <button
        disabled={isPending}
        onClick={() => startTransition(() => removeMealPlanEntry(entry.id))}
        className="text-muted-foreground hover:text-destructive"
      >
        <Trash2 className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

function RecipeCard({ recipe, currency }: { recipe: RecipeInfo; currency: string }) {
  const [isPending, startTransition] = useTransition();
  return (
    <div className="rounded-md border border-border p-3">
      <div className="flex items-start justify-between">
        <p className="text-sm font-medium">{recipe.name}</p>
        <button disabled={isPending} onClick={() => startTransition(() => toggleFavoriteRecipe(recipe.id))}>
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

function GenerateMealPlanDialog() {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [numDays, setNumDays] = useState(7);
  const [servings, setServings] = useState(2);
  const [budget, setBudget] = useState("");
  const [cuisine, setCuisine] = useState("");
  const [selectedMeals, setSelectedMeals] = useState<string[]>(["LUNCH", "DINNER"]);

  function toggleMeal(v: string) {
    setSelectedMeals((prev) => (prev.includes(v) ? prev.filter((x) => x !== v) : [...prev, v]));
  }

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
    setLoading(false);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    setOpen(false);
    toast.success(result.adviceMessage || "Menu généré !");
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
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Nombre de jours</Label>
              <Input type="number" min={1} max={14} value={numDays} onChange={(e) => setNumDays(Number(e.target.value))} />
            </div>
            <div className="space-y-2">
              <Label>Nombre de personnes</Label>
              <Input type="number" min={1} max={12} value={servings} onChange={(e) => setServings(Number(e.target.value))} />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Repas à générer</Label>
            <div className="flex flex-wrap gap-3">
              {MEAL_TYPES.map((mt) => (
                <label key={mt.value} className="flex items-center gap-2 text-sm">
                  <Checkbox checked={selectedMeals.includes(mt.value)} onCheckedChange={() => toggleMeal(mt.value)} />
                  {mt.label}
                </label>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Budget total (optionnel)</Label>
              <Input type="number" value={budget} onChange={(e) => setBudget(e.target.value)} placeholder="Ex: 60" />
            </div>
            <div className="space-y-2">
              <Label>Cuisine (optionnel)</Label>
              <Input value={cuisine} onChange={(e) => setCuisine(e.target.value)} placeholder="Ex: italienne" />
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button onClick={handleGenerate} disabled={loading}>
            {loading ? "Génération en cours..." : "Générer le menu"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
