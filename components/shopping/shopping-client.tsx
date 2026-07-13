"use client";

import { useState, useTransition } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Plus, Trash2, Wand2, ShoppingBasket, SlidersHorizontal } from "lucide-react";
import {
  addShoppingItem,
  toggleShoppingItem,
  deleteShoppingItem,
  generateShoppingListFromMealPlan,
  recategorizeShoppingList,
} from "@/lib/actions/shopping";
import { SHOPPING_AISLES } from "@/lib/shopping-aisles";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const FILTER_OPTIONS = ["Tout", ...SHOPPING_AISLES] as const;

interface Item {
  id: string;
  name: string;
  quantity: number | null;
  unit: string | null;
  checked: boolean;
  category: string | null;
}

export function ShoppingClient({ items }: { items: Item[] }) {
  const [isPending, startTransition] = useTransition();
  const [generating, setGenerating] = useState(false);
  const [recategorizing, setRecategorizing] = useState(false);
  const [name, setName] = useState("");
  const [category, setCategory] = useState<string>("Autre");
  const [filter, setFilter] = useState<string>("Tout");

  async function handleAdd(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!name.trim()) return;
    await addShoppingItem({ name: name.trim(), category });
    setName("");
  }

  async function handleGenerate() {
    setGenerating(true);
    const result = await generateShoppingListFromMealPlan();
    setGenerating(false);
    toast.success(`${result.count} article(s) ajouté(s) depuis ton planning repas`);
  }

  async function handleRecategorize() {
    setRecategorizing(true);
    const result = await recategorizeShoppingList();
    setRecategorizing(false);
    toast.success(result.count > 0 ? `${result.count} article(s) reclassé(s)` : "Tous les articles sont déjà bien classés");
  }

  const unchecked = items.filter((i) => !i.checked);
  const checked = items.filter((i) => i.checked);

  const groups = SHOPPING_AISLES.filter((aisle) => filter === "Tout" || filter === aisle)
    .map((aisle) => ({
      aisle,
      items: unchecked.filter((i) => (i.category ?? "Autre") === aisle),
    }))
    .filter((g) => g.items.length > 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row">
        <form onSubmit={handleAdd} className="flex flex-1 flex-col gap-2 sm:flex-row">
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ajouter un article..." />
          <Select value={category} onValueChange={setCategory}>
            <SelectTrigger className="sm:w-48"><SelectValue /></SelectTrigger>
            <SelectContent>
              {SHOPPING_AISLES.map((a) => <SelectItem key={a} value={a}>{a}</SelectItem>)}
            </SelectContent>
          </Select>
          <Button type="submit"><Plus className="h-4 w-4" /></Button>
        </form>
        <Button variant="outline" onClick={handleGenerate} disabled={generating}>
          <Wand2 className="h-4 w-4" /> {generating ? "..." : "Générer depuis les repas"}
        </Button>
        <Button variant="outline" onClick={handleRecategorize} disabled={recategorizing} title="Revérifier le rayon de chaque article">
          <SlidersHorizontal className="h-4 w-4" /> {recategorizing ? "..." : "Recatégoriser"}
        </Button>
      </div>

      <div className="flex items-center gap-2">
        <span className="text-xs text-muted-foreground">Filtrer par rayon :</span>
        <Select value={filter} onValueChange={setFilter}>
          <SelectTrigger className="w-56"><SelectValue /></SelectTrigger>
          <SelectContent>
            {FILTER_OPTIONS.map((a) => <SelectItem key={a} value={a}>{a}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {unchecked.length === 0 && checked.length === 0 ? (
        <Card>
          <CardContent className="p-6 text-center text-sm text-muted-foreground">Ta liste est vide.</CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {groups.map((group) => (
            <Card key={group.aisle}>
              <CardContent className="p-4">
                <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold text-muted-foreground">
                  <ShoppingBasket className="h-4 w-4" /> {group.aisle}
                </h3>
                <ul className="divide-y divide-border">
                  {group.items.map((item) => (
                    <ShoppingRow key={item.id} item={item} isPending={isPending} onToggle={() => startTransition(() => toggleShoppingItem(item.id))} onDelete={() => startTransition(() => deleteShoppingItem(item.id))} />
                  ))}
                </ul>
              </CardContent>
            </Card>
          ))}

          {checked.length > 0 && (
            <Card>
              <CardContent className="p-4">
                <h3 className="mb-2 text-sm font-semibold text-muted-foreground">Déjà pris</h3>
                <ul className="divide-y divide-border">
                  {checked.map((item) => (
                    <ShoppingRow key={item.id} item={item} isPending={isPending} onToggle={() => startTransition(() => toggleShoppingItem(item.id))} onDelete={() => startTransition(() => deleteShoppingItem(item.id))} />
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}

function ShoppingRow({
  item,
  isPending,
  onToggle,
  onDelete,
}: {
  item: Item;
  isPending: boolean;
  onToggle: () => void;
  onDelete: () => void;
}) {
  return (
    <li className="flex items-center justify-between py-2.5">
      <label className="flex items-center gap-3">
        <Checkbox checked={item.checked} onCheckedChange={onToggle} />
        <span className={cn("text-sm", item.checked && "text-muted-foreground line-through")}>
          {item.name} {item.quantity ? `(${item.quantity}${item.unit ?? ""})` : ""}
        </span>
      </label>
      <button disabled={isPending} onClick={onDelete} className="text-muted-foreground hover:text-destructive">
        <Trash2 className="h-4 w-4" />
      </button>
    </li>
  );
}
