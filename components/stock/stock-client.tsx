"use client";

import { useState, useTransition } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Plus, Trash2 } from "lucide-react";
import { addPantryItem, deletePantryItem } from "@/lib/actions/pantry";
import { formatDate } from "@/lib/utils";
import { toast } from "sonner";

interface Item {
  id: string;
  name: string;
  quantity: number | null;
  unit: string | null;
  category: string | null;
  expiryDate: string | null;
}

function expiryStatus(expiryDate: string | null) {
  if (!expiryDate) return null;
  const days = Math.ceil((new Date(expiryDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
  if (days < 0) return { text: "Périmé", variant: "destructive" as const };
  if (days <= 3) return { text: `${days}j restants`, variant: "warning" as const };
  return { text: formatDate(expiryDate), variant: "outline" as const };
}

export function StockClient({ items }: { items: Item[] }) {
  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <AddPantryDialog />
      </div>
      {items.length === 0 ? (
        <Card><CardContent className="p-8 text-center text-muted-foreground">Ton stock est vide.</CardContent></Card>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((item) => (
            <StockItem key={item.id} item={item} />
          ))}
        </div>
      )}
    </div>
  );
}

function StockItem({ item }: { item: Item }) {
  const [isPending, startTransition] = useTransition();
  const status = expiryStatus(item.expiryDate);
  return (
    <Card>
      <CardContent className="flex items-start justify-between p-4">
        <div>
          <p className="text-sm font-medium">{item.name}</p>
          <p className="text-xs text-muted-foreground">
            {item.quantity ? `${item.quantity} ${item.unit ?? ""}` : ""} {item.category ? `· ${item.category}` : ""}
          </p>
          {status && <Badge variant={status.variant} className="mt-2">{status.text}</Badge>}
        </div>
        <button disabled={isPending} onClick={() => startTransition(() => deletePantryItem(item.id))} className="text-muted-foreground hover:text-destructive">
          <Trash2 className="h-4 w-4" />
        </button>
      </CardContent>
    </Card>
  );
}

function AddPantryDialog() {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    const form = new FormData(e.currentTarget);
    const expiryStr = form.get("expiryDate") as string;
    await addPantryItem({
      name: form.get("name") as string,
      quantity: Number(form.get("quantity")) || undefined,
      unit: (form.get("unit") as string) || undefined,
      category: (form.get("category") as string) || undefined,
      expiryDate: expiryStr ? new Date(expiryStr) : undefined,
    });
    setLoading(false);
    setOpen(false);
    toast.success("Ajouté au stock");
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button><Plus className="h-4 w-4" /> Ajouter un produit</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>Ajouter au stock</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Nom</Label>
            <Input name="name" required />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Quantité</Label>
              <Input name="quantity" type="number" step="0.01" />
            </div>
            <div className="space-y-2">
              <Label>Unité</Label>
              <Input name="unit" placeholder="kg, L, pièce..." />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Catégorie</Label>
            <Input name="category" placeholder="Frigo, Congélateur, Placard..." />
          </div>
          <div className="space-y-2">
            <Label>Date de péremption</Label>
            <Input name="expiryDate" type="date" />
          </div>
          <DialogFooter>
            <Button type="submit" disabled={loading}>{loading ? "..." : "Ajouter"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
