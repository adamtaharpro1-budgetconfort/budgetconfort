"use client";

import { useState, useTransition } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Plus, Trash2, PiggyBank } from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/utils";
import { addGoal, contributeToGoal, deleteGoal } from "@/lib/actions/goals";
import { toast } from "sonner";

const GOAL_TYPES = ["MAISON", "VOITURE", "VACANCES", "MARIAGE", "URGENCE", "ENTREPRISE", "RETRAITE", "AUTRE"];

interface Goal {
  id: string;
  name: string;
  type: string;
  targetAmount: number;
  currentAmount: number;
  weeklyContribution: number | null;
  targetDate: Date | null;
}

export function GoalsClient({ currency, goals }: { currency: string; goals: Goal[] }) {
  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <AddGoalDialog />
      </div>
      {goals.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center text-muted-foreground">
            Aucun objectif pour l&apos;instant. Crée ton premier objectif financier !
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {goals.map((g) => (
            <GoalCard key={g.id} goal={g} currency={currency} />
          ))}
        </div>
      )}
    </div>
  );
}

function GoalCard({ goal, currency }: { goal: Goal; currency: string }) {
  const [isPending, startTransition] = useTransition();
  const pct = goal.targetAmount > 0 ? Math.min(Math.round((goal.currentAmount / goal.targetAmount) * 100), 100) : 0;

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between">
        <div>
          <CardTitle>{goal.name}</CardTitle>
          <p className="text-xs text-muted-foreground">{goal.type}</p>
        </div>
        <button
          disabled={isPending}
          onClick={() => startTransition(() => deleteGoal(goal.id))}
          className="text-muted-foreground hover:text-destructive"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </CardHeader>
      <CardContent>
        <div className="flex justify-between text-sm mb-1">
          <span className="font-medium">{formatCurrency(goal.currentAmount, currency)}</span>
          <span className="text-muted-foreground">{formatCurrency(goal.targetAmount, currency)}</span>
        </div>
        <Progress value={pct} />
        <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
          <span>{pct}% atteint</span>
          {goal.weeklyContribution && <span>~{formatCurrency(goal.weeklyContribution, currency)}/semaine</span>}
        </div>
        {goal.targetDate && (
          <p className="mt-1 text-xs text-muted-foreground">Objectif : {formatDate(goal.targetDate)}</p>
        )}
        <ContributeButton goalId={goal.id} currency={currency} />
      </CardContent>
    </Card>
  );
}

function ContributeButton({ goalId, currency }: { goalId: string; currency: string }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    const amount = Number(new FormData(e.currentTarget).get("amount"));
    await contributeToGoal(goalId, amount);
    setLoading(false);
    setOpen(false);
    toast.success("Contribution ajoutée");
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline" className="mt-4 w-full">
          <PiggyBank className="h-4 w-4" /> Ajouter une contribution
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>Ajouter à cet objectif</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Montant ({currency})</Label>
            <Input name="amount" type="number" step="0.01" required />
          </div>
          <DialogFooter>
            <Button type="submit" disabled={loading}>{loading ? "..." : "Ajouter"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function AddGoalDialog() {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    const form = new FormData(e.currentTarget);
    const targetDateStr = form.get("targetDate") as string;
    try {
      await addGoal({
        name: form.get("name") as string,
        type: form.get("type") as never,
        targetAmount: Number(form.get("targetAmount")),
        targetDate: targetDateStr ? new Date(targetDateStr) : undefined,
      });
      setOpen(false);
      toast.success("Objectif créé");
    } catch {
      toast.error("Erreur");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button><Plus className="h-4 w-4" /> Nouvel objectif</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>Créer un objectif financier</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Nom</Label>
            <Input name="name" required placeholder="Ex: Vacances au Maroc" />
          </div>
          <div className="space-y-2">
            <Label>Type</Label>
            <Select name="type" defaultValue="URGENCE">
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {GOAL_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Montant cible</Label>
            <Input name="targetAmount" type="number" step="0.01" required />
          </div>
          <div className="space-y-2">
            <Label>Date cible (optionnel)</Label>
            <Input name="targetDate" type="date" />
          </div>
          <DialogFooter>
            <Button type="submit" disabled={loading}>{loading ? "..." : "Créer"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
