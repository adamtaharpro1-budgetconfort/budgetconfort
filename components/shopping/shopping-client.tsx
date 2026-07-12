"use client";

import { useState, useTransition } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Plus, Trash2, Wand2 } from "lucide-react";
import { addShoppingItem, toggleShoppingItem, deleteShoppingItem, generateShoppingListFromMealPlan } from "@/lib/actions/shopping";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface Item {
  id: string;
  name: string;
  quantity: number | null;
  unit: string | null;
  checked: boolean;
}

export function ShoppingClient({ items }: { items: Item[] }) {
  const [isPending, startTransition] = useTransition();
  const [generating, setGenerating] = useState(false);
  const [name, setName] = useState("");

  async function handleAdd(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!name.trim()) return;
    await addShoppingItem({ name: name.trim() });
    setName("");
  }

  async function handleGenerate() {
    setGenerating(true);
    const result = await generateShoppingListFromMealPlan();
    setGenerating(false);
    toast.success(`${result.count} article(s) ajouté(s) depuis ton planning repas`);
  }

  const unchecked = items.filter((i) => !i.checked);
  const checked = items.filter((i) => i.checked);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row">
        <form onSubmit={handleAdd} className="flex flex-1 gap-2">
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ajouter un article..." />
          <Button type="submit"><Plus className="h-4 w-4" /></Button>
        </form>
        <Button variant="outline" onClick={handleGenerate} disabled={generating}>
          <Wand2 className="h-4 w-4" /> {generating ? "..." : "Générer depuis les repas"}
        </Button>
      </div>

      <Card>
        <CardContent className="p-4">
          {unchecked.length === 0 && checked.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">Ta liste est vide.</p>
          ) : (
            <ul className="divide-y divide-border">
              {[...unchecked, ...checked].map((item) => (
                <li key={item.id} className="flex items-center justify-between py-2.5">
                  <label className="flex items-center gap-3">
                    <Checkbox
                      checked={item.checked}
                      onCheckedChange={() => startTransition(() => toggleShoppingItem(item.id))}
                    />
                    <span className={cn("text-sm", item.checked && "text-muted-foreground line-through")}>
                      {item.name} {item.quantity ? `(${item.quantity}${item.unit ?? ""})` : ""}
                    </span>
                  </label>
                  <button disabled={isPending} onClick={() => startTransition(() => deleteShoppingItem(item.id))} className="text-muted-foreground hover:text-destructive">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
