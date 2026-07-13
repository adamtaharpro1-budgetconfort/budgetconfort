"use client";

import { useState, useTransition } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Plus, Trash2, User as UserIcon, Baby, Pencil } from "lucide-react";
import { addFamilyMember, updateFamilyMember, deleteFamilyMember, type FamilyMemberInput } from "@/lib/actions/family";
import { toast } from "sonner";

interface Member {
  id: string;
  label: string;
  isChild: boolean;
  age: number | null;
  sex: string | null;
  height: number | null;
  weight: number | null;
  hasAccount: boolean;
  accountEmail: string | null;
  role: string;
}

export function FamilyClient({ members }: { members: Member[] }) {
  const adults = members.filter((m) => !m.isChild);
  const children = members.filter((m) => m.isChild);

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Adultes</p>
            <p className="text-xl font-semibold">{adults.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Enfants</p>
            <p className="text-xl font-semibold">{children.length}</p>
          </CardContent>
        </Card>
      </div>

      <div className="flex justify-end">
        <MemberDialog />
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {members.map((m) => (
          <MemberCard key={m.id} member={m} />
        ))}
      </div>
    </div>
  );
}

function MemberCard({ member }: { member: Member }) {
  const [isPending, startTransition] = useTransition();

  async function handleDelete() {
    const result = await deleteFamilyMember(member.id);
    if (!result.ok) toast.error(result.error);
  }

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            {member.isChild ? <Baby className="h-4 w-4 text-primary" /> : <UserIcon className="h-4 w-4 text-primary" />}
            <p className="text-sm font-medium">{member.label}</p>
          </div>
          <div className="flex items-center gap-1">
            {!member.hasAccount && <MemberDialog existing={member} />}
            {!member.hasAccount && (
              <button
                disabled={isPending}
                onClick={() => startTransition(handleDelete)}
                className="text-muted-foreground hover:text-destructive"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>
        <div className="mt-2 flex flex-wrap gap-1.5">
          <Badge variant="outline">{member.isChild ? "Enfant" : "Adulte"}</Badge>
          {member.age != null && <Badge variant="outline">{member.age} ans</Badge>}
          {member.hasAccount && <Badge variant="success">Compte actif</Badge>}
        </div>
        {member.hasAccount && member.accountEmail && (
          <p className="mt-2 text-xs text-muted-foreground">{member.accountEmail}</p>
        )}
      </CardContent>
    </Card>
  );
}

function MemberDialog({ existing }: { existing?: Member }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [isChild, setIsChild] = useState(existing?.isChild ?? false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    const form = new FormData(e.currentTarget);
    const input: FamilyMemberInput = {
      label: form.get("label") as string,
      isChild,
      age: form.get("age") ? Number(form.get("age")) : undefined,
      sex: (form.get("sex") as string) || undefined,
      height: form.get("height") ? Number(form.get("height")) : undefined,
      weight: form.get("weight") ? Number(form.get("weight")) : undefined,
    };
    const result = existing ? await updateFamilyMember(existing.id, input) : await addFamilyMember(input);
    setLoading(false);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    setOpen(false);
    toast.success(existing ? "Profil mis à jour" : "Membre ajouté");
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {existing ? (
          <button className="text-muted-foreground hover:text-foreground">
            <Pencil className="h-4 w-4" />
          </button>
        ) : (
          <Button size="sm">
            <Plus className="h-4 w-4" /> Ajouter un membre
          </Button>
        )}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{existing ? "Modifier le profil" : "Ajouter un membre du foyer"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Nom</Label>
            <Input name="label" defaultValue={existing?.label} placeholder="Ex: Enfant 1, Papa..." required />
          </div>
          <label className="flex items-center gap-2 text-sm">
            <Checkbox checked={isChild} onCheckedChange={(v) => setIsChild(!!v)} />
            C&apos;est un enfant
          </label>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Âge</Label>
              <Input name="age" type="number" min={0} max={120} defaultValue={existing?.age ?? ""} />
            </div>
            <div className="space-y-2">
              <Label>Sexe</Label>
              <select
                name="sex"
                defaultValue={existing?.sex ?? ""}
                className="flex h-10 w-full rounded-md border border-input bg-card px-3 py-2 text-sm shadow-sm"
              >
                <option value="">—</option>
                <option value="F">Féminin</option>
                <option value="M">Masculin</option>
              </select>
            </div>
            <div className="space-y-2">
              <Label>Taille (cm)</Label>
              <Input name="height" type="number" defaultValue={existing?.height ?? ""} />
            </div>
            <div className="space-y-2">
              <Label>Poids (kg)</Label>
              <Input name="weight" type="number" defaultValue={existing?.weight ?? ""} />
            </div>
          </div>
          <DialogFooter>
            <Button type="submit" disabled={loading}>{loading ? "..." : existing ? "Enregistrer" : "Ajouter"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
