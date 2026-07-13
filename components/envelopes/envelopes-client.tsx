"use client";

import { useState, useTransition } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Plus, Trash2, PiggyBank, RotateCcw, Minus } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { addEnvelope, recordEnvelopeSpend, resetEnvelope, deleteEnvelope } from "@/lib/actions/envelopes";
import { toast } from "sonner";

interface Envelope {
  id: string;
  name: string;
  monthlyAmount: number;
  spentAmount: number;
}

export function EnvelopesClient({
  currency,
  envelopes,
  availableForVariable,
}: {
  currency: string;
  envelopes: Envelope[];
  availableForVariable: number;
}) {
  const totalAllocated = envelopes.reduce((s, e) => s + e.monthlyAmount, 0);
  const overAllocated = totalAllocated > availableForVariable;

  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="flex flex-col gap-2 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-medium">Argent disponible une fois les charges payées</p>
            <p className="text-xl font-semibold">{formatCurrency(availableForVariable, currency)}</p>
          </div>
          <div className="text-right">
            <p className="text-sm text-muted-foreground">Alloué à tes tirelires</p>
            <p className="flex items-center justify-end gap-2 text-xl font-semibold">
              {formatCurrency(totalAllocated, currency)}
              {overAllocated && <Badge variant="destructive">Dépassé</Badge>}
            </p>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <AddEnvelopeDialog />
      </div>

      {envelopes.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center text-muted-foreground">
            Aucune tirelire pour l&apos;instant. Crée-en une pour ton budget restaurant, loisirs, argent de côté...
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {envelopes.map((e) => (
            <EnvelopeCard key={e.id} envelope={e} currency={currency} />
          ))}
        </div>
      )}
    </div>
  );
}

function EnvelopeCard({ envelope, currency }: { envelope: Envelope; currency: string }) {
  const [isPending, startTransition] = useTransition();
  const remaining = envelope.monthlyAmount - envelope.spentAmount;
  const pct = envelope.monthlyAmount > 0 ? Math.min(Math.round((envelope.spentAmount / envelope.monthlyAmount) * 100), 100) : 0;
  const isOver = envelope.spentAmount > envelope.monthlyAmount;

  function handleReset() {
    startTransition(async () => {
      await resetEnvelope(envelope.id);
      toast.success("Tirelire réinitialisée pour le mois");
    });
  }

  function handleDelete() {
    startTransition(async () => {
      await deleteEnvelope(envelope.id);
    });
  }

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2 text-base">
          <PiggyBank className="h-4 w-4 text-primary" /> {envelope.name}
        </CardTitle>
        <div className="flex items-center gap-1">
          <button disabled={isPending} onClick={handleReset} title="Nouveau mois" className="text-muted-foreground hover:text-foreground">
            <RotateCcw className="h-3.5 w-3.5" />
          </button>
          <button disabled={isPending} onClick={handleDelete} className="text-muted-foreground hover:text-destructive">
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex justify-between text-sm mb-1">
          <span className={isOver ? "font-medium text-destructive" : "font-medium"}>
            {formatCurrency(envelope.spentAmount, currency)} utilisés
          </span>
          <span className="text-muted-foreground">{formatCurrency(envelope.monthlyAmount, currency)}</span>
        </div>
        <Progress value={pct} />
        <p className="mt-2 text-xs text-muted-foreground">
          {isOver
            ? `Dépassement de ${formatCurrency(Math.abs(remaining), currency)}`
            : `${formatCurrency(remaining, currency)} restants`}
        </p>
        <SpendButton envelopeId={envelope.id} currency={currency} />
      </CardContent>
    </Card>
  );
}

function SpendButton({ envelopeId, currency }: { envelopeId: string; currency: string }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    const amount = Number(new FormData(e.currentTarget).get("amount"));
    await recordEnvelopeSpend(envelopeId, amount);
    setLoading(false);
    setOpen(false);
    toast.success("Enregistré");
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline" className="mt-4 w-full">
          <Minus className="h-4 w-4" /> Enregistrer une dépense
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>Dépense sur cette tirelire</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Montant ({currency})</Label>
            <Input name="amount" type="number" step="0.01" required />
            <p className="text-xs text-muted-foreground">
              Montant positif pour une dépense, négatif pour corriger/retirer.
            </p>
          </div>
          <DialogFooter>
            <Button type="submit" disabled={loading}>{loading ? "..." : "Enregistrer"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function AddEnvelopeDialog() {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    const form = new FormData(e.currentTarget);
    const name = form.get("name") as string;
    const monthlyAmount = Number(form.get("monthlyAmount"));
    if (!name.trim() || !monthlyAmount) {
      toast.error("Indique un nom et un montant");
      setLoading(false);
      return;
    }
    await addEnvelope({ name, monthlyAmount });
    setLoading(false);
    setOpen(false);
    toast.success("Tirelire créée");
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button><Plus className="h-4 w-4" /> Nouvelle tirelire</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>Créer une tirelire</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Nom</Label>
            <Input name="name" required placeholder="Ex: Restaurant, Loisirs, Argent de côté..." />
          </div>
          <div className="space-y-2">
            <Label>Montant par mois</Label>
            <Input name="monthlyAmount" type="number" step="0.01" min={0.01} required placeholder="Ex: 100" />
          </div>
          <DialogFooter>
            <Button type="submit" disabled={loading}>{loading ? "..." : "Créer"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
