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
import Link from "next/link";
import { Plus, Trash2, User as UserIcon, Baby, Pencil, Link2, Copy, X, Settings } from "lucide-react";
import { addFamilyMember, updateFamilyMember, deleteFamilyMember, type FamilyMemberInput } from "@/lib/actions/family";
import { createFamilyInvite, cancelInvite } from "@/lib/actions/invite";
import { calculateBMR, calculateTDEE, type ActivityLevel, type NutritionGoal } from "@/lib/nutrition-calc";
import { GoalRecap } from "@/components/nutrition/goal-recap";
import { toast } from "sonner";
import { formatDate } from "@/lib/utils";

interface Member {
  id: string;
  userId: string | null;
  label: string;
  isChild: boolean;
  age: number | null;
  sex: string | null;
  height: number | null;
  weight: number | null;
  goal: string | null;
  targetWeightDelta: number | null;
  hasAccount: boolean;
  accountEmail: string | null;
  role: string;
}

const GOAL_LABELS: Record<string, string> = {
  LOSE: "Perdre du poids",
  MAINTAIN: "Maintenir",
  GAIN: "Prendre du poids",
};

interface Invite {
  id: string;
  label: string | null;
  isChild: boolean;
  token: string;
  createdAt: string;
}

export function FamilyClient({
  members,
  invites,
  currentUserId,
}: {
  members: Member[];
  invites: Invite[];
  currentUserId: string;
}) {
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

      <div className="flex flex-wrap justify-end gap-2">
        <InviteDialog />
        <MemberDialog />
      </div>

      {invites.length > 0 && (
        <Card>
          <CardContent className="p-4">
            <h3 className="mb-2 text-sm font-semibold text-muted-foreground">Invitations en attente</h3>
            <ul className="divide-y divide-border">
              {invites.map((invite) => (
                <InviteRow key={invite.id} invite={invite} />
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {members.map((m) => (
          <MemberCard key={m.id} member={m} isSelf={m.userId === currentUserId} />
        ))}
      </div>
    </div>
  );
}

function InviteRow({ invite }: { invite: Invite }) {
  const [isPending, startTransition] = useTransition();
  const url = typeof window !== "undefined" ? `${window.location.origin}/rejoindre-famille?token=${invite.token}` : "";

  function handleCopy() {
    navigator.clipboard.writeText(url);
    toast.success("Lien copié");
  }

  function handleCancel() {
    startTransition(async () => {
      await cancelInvite(invite.id);
    });
  }

  return (
    <li className="flex items-center justify-between py-2.5">
      <div>
        <p className="text-sm font-medium">{invite.label || "Invitation"} {invite.isChild && <Badge variant="outline" className="ml-1">Enfant</Badge>}</p>
        <p className="text-xs text-muted-foreground">Créée le {formatDate(invite.createdAt)}</p>
      </div>
      <div className="flex items-center gap-3">
        <button onClick={handleCopy} className="text-muted-foreground hover:text-foreground" title="Copier le lien">
          <Copy className="h-4 w-4" />
        </button>
        <button disabled={isPending} onClick={handleCancel} className="text-muted-foreground hover:text-destructive" title="Annuler">
          <X className="h-4 w-4" />
        </button>
      </div>
    </li>
  );
}

function InviteDialog() {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [isChild, setIsChild] = useState(false);
  const [generatedUrl, setGeneratedUrl] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    const form = new FormData(e.currentTarget);
    const result = await createFamilyInvite({
      label: (form.get("label") as string) || undefined,
      isChild,
    });
    setLoading(false);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    if (!result.url) {
      toast.error("Erreur lors de la génération du lien");
      return;
    }
    setGeneratedUrl(result.url);
  }

  function handleCopy() {
    if (!generatedUrl) return;
    navigator.clipboard.writeText(generatedUrl);
    toast.success("Lien copié — envoie-le par SMS, WhatsApp...");
  }

  function handleClose(v: boolean) {
    setOpen(v);
    if (!v) {
      setGeneratedUrl(null);
      setIsChild(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline">
          <Link2 className="h-4 w-4" /> Inviter par lien
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Inviter un membre de la famille</DialogTitle>
        </DialogHeader>
        {generatedUrl ? (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Envoie ce lien à la personne (SMS, WhatsApp...). En l&apos;ouvrant, elle pourra se connecter ou
              créer son compte puis rejoindre ton foyer.
            </p>
            <div className="flex gap-2">
              <Input readOnly value={generatedUrl} className="text-xs" />
              <Button type="button" onClick={handleCopy}><Copy className="h-4 w-4" /></Button>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => handleClose(false)}>Fermer</Button>
            </DialogFooter>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label>Nom (optionnel)</Label>
              <Input name="label" placeholder="Ex: Sarah" />
            </div>
            <label className="flex items-center gap-2 text-sm">
              <Checkbox checked={isChild} onCheckedChange={(v) => setIsChild(!!v)} />
              C&apos;est un enfant
            </label>
            <DialogFooter>
              <Button type="submit" disabled={loading}>{loading ? "..." : "Générer le lien"}</Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}

function MemberCard({ member, isSelf }: { member: Member; isSelf: boolean }) {
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
            <p className="text-sm font-medium">{member.label} {isSelf && <span className="text-xs text-muted-foreground">(toi)</span>}</p>
          </div>
          <div className="flex items-center gap-1">
            {isSelf && (
              <Link href="/parametres" title="Modifier mon objectif dans Paramètres → Nutrition" className="text-muted-foreground hover:text-foreground">
                <Settings className="h-4 w-4" />
              </Link>
            )}
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
          {!member.isChild && member.goal && <Badge variant="outline">{GOAL_LABELS[member.goal] ?? member.goal}</Badge>}
          {!member.isChild && !member.goal && <Badge variant="warning">Objectif non défini</Badge>}
          {member.hasAccount && <Badge variant="success">Compte actif</Badge>}
        </div>
        {!member.isChild && member.goal && member.goal !== "MAINTAIN" && member.targetWeightDelta && member.sex && member.age && member.height && member.weight && (
          <GoalRecap
            className="mt-2"
            tdee={calculateTDEE(calculateBMR(member.sex, member.weight, member.height, member.age), "MODERATE")}
            goal={member.goal as NutritionGoal}
            targetWeightDelta={member.targetWeightDelta}
          />
        )}
        {isSelf && !member.goal && (
          <p className="mt-2 text-xs text-muted-foreground">
            Définis ton objectif dans{" "}
            <Link href="/parametres" className="text-primary underline-offset-4 hover:underline">
              Paramètres → Nutrition
            </Link>
            .
          </p>
        )}
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
  const [goal, setGoal] = useState(existing?.goal ?? "MAINTAIN");
  const [sex, setSex] = useState(existing?.sex ?? "");
  const [age, setAge] = useState(existing?.age ? String(existing.age) : "");
  const [height, setHeight] = useState(existing?.height ? String(existing.height) : "");
  const [weight, setWeight] = useState(existing?.weight ? String(existing.weight) : "");
  const [targetWeightDelta, setTargetWeightDelta] = useState(
    existing?.targetWeightDelta != null ? String(existing.targetWeightDelta) : ""
  );

  const previewTdee =
    sex && age && height && weight
      ? calculateTDEE(calculateBMR(sex, Number(weight), Number(height), Number(age)), "MODERATE" as ActivityLevel)
      : null;

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    const form = new FormData(e.currentTarget);
    const input: FamilyMemberInput = {
      label: form.get("label") as string,
      isChild,
      age: age ? Number(age) : undefined,
      sex: sex || undefined,
      height: height ? Number(height) : undefined,
      weight: weight ? Number(weight) : undefined,
      goal: isChild ? undefined : (goal as never),
      targetWeightDelta: goal === "MAINTAIN" ? null : targetWeightDelta ? Number(targetWeightDelta) : null,
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
              <Input type="number" min={0} max={120} value={age} onChange={(e) => setAge(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Sexe</Label>
              <select
                value={sex}
                onChange={(e) => setSex(e.target.value)}
                className="flex h-10 w-full rounded-md border border-input bg-card px-3 py-2 text-sm shadow-sm"
              >
                <option value="">—</option>
                <option value="F">Féminin</option>
                <option value="M">Masculin</option>
              </select>
            </div>
            <div className="space-y-2">
              <Label>Taille (cm)</Label>
              <Input type="number" value={height} onChange={(e) => setHeight(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Poids (kg)</Label>
              <Input type="number" value={weight} onChange={(e) => setWeight(e.target.value)} />
            </div>
          </div>
          {!isChild && (
            <div className="space-y-2">
              <Label>Objectif</Label>
              <select
                value={goal}
                onChange={(e) => setGoal(e.target.value)}
                className="flex h-10 w-full rounded-md border border-input bg-card px-3 py-2 text-sm shadow-sm"
              >
                <option value="LOSE">Perdre du poids</option>
                <option value="MAINTAIN">Maintenir</option>
                <option value="GAIN">Prendre du poids</option>
              </select>
              <p className="text-xs text-muted-foreground">Utilisé pour adapter ses portions dans les repas générés par l&apos;IA.</p>
              {goal !== "MAINTAIN" && (
                <div className="space-y-2 pt-1">
                  <Label>Nombre de kg à {goal === "LOSE" ? "perdre" : "prendre"}</Label>
                  <Input
                    type="number"
                    min={0}
                    step={0.5}
                    placeholder="ex : 5"
                    value={targetWeightDelta}
                    onChange={(e) => setTargetWeightDelta(e.target.value)}
                  />
                </div>
              )}
              {previewTdee && (
                <GoalRecap
                  tdee={previewTdee}
                  goal={goal as NutritionGoal}
                  targetWeightDelta={goal === "MAINTAIN" ? null : Number(targetWeightDelta) || null}
                  className="mt-2"
                />
              )}
            </div>
          )}
          <DialogFooter>
            <Button type="submit" disabled={loading}>{loading ? "..." : existing ? "Enregistrer" : "Ajouter"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
