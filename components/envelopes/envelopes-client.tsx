"use client";

import { useState, useTransition } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Plus, Trash2, PiggyBank, RotateCcw, Minus, TrendingUp } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { addEnvelope, recordEnvelopeSpend, resetEnvelope, deleteEnvelope } from "@/lib/actions/envelopes";
import { toast } from "sonner";

interface Envelope {
  id: string;
  name: string;
  monthlyAmount: number;
  balance: number;
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
  const isNegative = envelope.balance < 0;
  const hasCarryOver = envelope.balance > envelope.monthlyAmount;

  function handleReset() {
    const lost = envelope.balance - envelope.monthlyAmount;
    const message =
      lost > 0
        ? `Tu vas perdre ${formatCurrency(lost, currency)} de cumul (solde actuel ${formatCurrency(envelope.balance, currency)} → ${formatCurrency(envelope.monthlyAmount, currency)}). Cette action ne se fait jamais automatiquement, uniquement si tu la déclenches toi-même. Confirmer ?`
        : `Remettre le solde à ${formatCurrency(envelope.monthlyAmount, currency)} ?`;
    if (!window.confirm(message)) return;
    startTransition(async () => {
      await resetEnvelope(envelope.id);
      toast.success("Solde remis au montant mensuel");
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
        <button disabled={isPending} onClick={handleDelete} className="text-muted-foreground hover:text-destructive">
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-2">
          <p className={isNegative ? "text-2xl font-semibold text-destructive" : "text-2xl font-semibold"}>
            {formatCurrency(envelope.balance, currency)}
          </p>
          {hasCarryOver && (
            <Badge variant="success" className="flex items-center gap-1">
              <TrendingUp className="h-3 w-3" /> cumulée
            </Badge>
          )}
        </div>
        <p className="mt-1 text-xs text-muted-foreground">
          disponible · +{formatCurrency(envelope.monthlyAmount, currency)} ajoutés chaque mois, jamais remis à 0 automatiquement
        </p>
        <SpendButton envelopeId={envelope.id} currency={currency} />
        <button
          disabled={isPending}
          onClick={handleReset}
          className="mt-2 flex w-full items-center justify-center gap-1 text-[11px] text-muted-foreground hover:text-foreground"
        >
          <RotateCcw className="h-3 w-3" /> Remettre au montant mensuel (perd le cumul)
        </button>
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
              Montant positif pour retirer du solde (dépense), négatif pour en rajouter.
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
