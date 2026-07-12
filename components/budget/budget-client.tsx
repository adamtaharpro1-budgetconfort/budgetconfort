"use client";

import { useState, useTransition } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Plus, Trash2 } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import {
  addIncome,
  deleteIncome,
  addFixedExpense,
  deleteFixedExpense,
  addTransaction,
  deleteTransaction,
} from "@/lib/actions/budget";
import { toast } from "sonner";

const INCOME_TYPES = ["SALAIRE", "PRIME", "FREELANCE", "CAF", "AUTRE"];
const FIXED_CATEGORIES = ["LOYER", "INTERNET", "TELEPHONE", "NETFLIX", "SPOTIFY", "CREDIT", "ASSURANCE", "ELECTRICITE", "GAZ", "ABONNEMENT", "AUTRE"];
const VARIABLE_CATEGORIES = ["RESTAURANT", "SHOPPING", "ESSENCE", "VOYAGES", "LOISIRS", "SANTE", "ANIMAUX", "ENFANTS", "COURSES", "AUTRE"];

interface Row {
  id: string;
  label: string;
  amount: number;
  meta: string;
}

export function BudgetClient({
  currency,
  budget,
  incomes,
  fixedExpenses,
  transactions,
}: {
  currency: string;
  budget: { budgetRemaining: number; dailyBudget: number; projectedEndOfMonth: number; percentUsed: number; availableForVariable: number };
  incomes: Row[];
  fixedExpenses: Row[];
  transactions: Row[];
}) {
  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Budget restant</p>
            <p className="text-xl font-semibold">{formatCurrency(budget.budgetRemaining, currency)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Budget quotidien</p>
            <p className="text-xl font-semibold">{formatCurrency(budget.dailyBudget, currency)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Prévision fin de mois</p>
            <p className={`text-xl font-semibold ${budget.projectedEndOfMonth < 0 ? "text-destructive" : ""}`}>
              {formatCurrency(budget.projectedEndOfMonth, currency)}
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="p-4">
          <div className="mb-2 flex justify-between text-sm">
            <span>Dépenses variables utilisées</span>
            <span>{budget.percentUsed}%</span>
          </div>
          <Progress value={Math.min(budget.percentUsed, 100)} />
        </CardContent>
      </Card>

      <Section
        title="Revenus"
        rows={incomes}
        currency={currency}
        onDelete={(id) => deleteIncome(id)}
        addDialog={<AddIncomeDialog />}
      />
      <Section
        title="Charges fixes"
        rows={fixedExpenses}
        currency={currency}
        onDelete={(id) => deleteFixedExpense(id)}
        addDialog={<AddFixedExpenseDialog />}
      />
      <Section
        title="Dépenses variables (ce mois-ci)"
        rows={transactions}
        currency={currency}
        onDelete={(id) => deleteTransaction(id)}
        addDialog={<AddTransactionDialog />}
      />
    </div>
  );
}

function Section({
  title,
  rows,
  currency,
  onDelete,
  addDialog,
}: {
  title: string;
  rows: Row[];
  currency: string;
  onDelete: (id: string) => Promise<void>;
  addDialog: React.ReactNode;
}) {
  const [isPending, startTransition] = useTransition();
  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between">
        <CardTitle>{title}</CardTitle>
        {addDialog}
      </CardHeader>
      <CardContent>
        {rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">Rien pour l&apos;instant.</p>
        ) : (
          <ul className="divide-y divide-border">
            {rows.map((r) => (
              <li key={r.id} className="flex items-center justify-between py-2">
                <div>
                  <p className="text-sm font-medium">{r.label}</p>
                  <p className="text-xs text-muted-foreground">{r.meta}</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm font-medium">{formatCurrency(r.amount, currency)}</span>
                  <button
                    disabled={isPending}
                    onClick={() => startTransition(() => onDelete(r.id))}
                    className="text-muted-foreground hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

function AddIncomeDialog() {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    const form = new FormData(e.currentTarget);
    try {
      await addIncome({
        label: form.get("label") as string,
        amount: Number(form.get("amount")),
        type: form.get("type") as never,
      });
      setOpen(false);
      toast.success("Revenu ajouté");
    } catch {
      toast.error("Erreur");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline"><Plus className="h-4 w-4" /> Ajouter</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>Ajouter un revenu</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Libellé</Label>
            <Input name="label" required />
          </div>
          <div className="space-y-2">
            <Label>Montant</Label>
            <Input name="amount" type="number" step="0.01" required />
          </div>
          <div className="space-y-2">
            <Label>Type</Label>
            <Select name="type" defaultValue="SALAIRE">
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {INCOME_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button type="submit" disabled={loading}>{loading ? "..." : "Ajouter"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function AddFixedExpenseDialog() {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    const form = new FormData(e.currentTarget);
    try {
      await addFixedExpense({
        label: form.get("label") as string,
        amount: Number(form.get("amount")),
        category: form.get("category") as never,
      });
      setOpen(false);
      toast.success("Charge ajoutée");
    } catch {
      toast.error("Erreur");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline"><Plus className="h-4 w-4" /> Ajouter</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>Ajouter une charge fixe</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Libellé</Label>
            <Input name="label" required />
          </div>
          <div className="space-y-2">
            <Label>Montant</Label>
            <Input name="amount" type="number" step="0.01" required />
          </div>
          <div className="space-y-2">
            <Label>Catégorie</Label>
            <Select name="category" defaultValue="LOYER">
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {FIXED_CATEGORIES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button type="submit" disabled={loading}>{loading ? "..." : "Ajouter"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function AddTransactionDialog() {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    const form = new FormData(e.currentTarget);
    try {
      await addTransaction({
        label: form.get("label") as string,
        amount: Number(form.get("amount")),
        category: form.get("category") as never,
      });
      setOpen(false);
      toast.success("Dépense ajoutée");
    } catch {
      toast.error("Erreur");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline"><Plus className="h-4 w-4" /> Ajouter</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>Ajouter une dépense</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Libellé</Label>
            <Input name="label" required />
          </div>
          <div className="space-y-2">
            <Label>Montant</Label>
            <Input name="amount" type="number" step="0.01" required />
          </div>
          <div className="space-y-2">
            <Label>Catégorie</Label>
            <Select name="category" defaultValue="COURSES">
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {VARIABLE_CATEGORIES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button type="submit" disabled={loading}>{loading ? "..." : "Ajouter"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
