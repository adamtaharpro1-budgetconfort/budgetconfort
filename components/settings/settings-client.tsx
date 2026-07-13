"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { signOut } from "next-auth/react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { updateProfile } from "@/lib/actions/profile";
import { changePassword } from "@/lib/actions/auth";
import { updateNutritionProfile } from "@/lib/actions/nutrition";
import { calculateBMR, calculateTDEE, type ActivityLevel, type NutritionGoal } from "@/lib/nutrition-calc";
import { GoalRecap } from "@/components/nutrition/goal-recap";
import { toast } from "sonner";

interface Props {
  user: { firstName: string | null; lastName: string | null; email: string; language: string; currency: string; country: string | null };
  nutritionProfile: {
    sex: string | null;
    age: number | null;
    height: number | null;
    weight: number | null;
    goal: string | null;
    targetWeightDelta: number | null;
    activityLevel: string | null;
    allergies: string[];
    preferences: string[];
  } | null;
}

export function SettingsClient({ user, nutritionProfile }: Props) {
  return (
    <Tabs defaultValue="profil">
      <TabsList>
        <TabsTrigger value="profil">Profil</TabsTrigger>
        <TabsTrigger value="nutrition">Nutrition</TabsTrigger>
        <TabsTrigger value="securite">Sécurité</TabsTrigger>
        <TabsTrigger value="notifications">Notifications</TabsTrigger>
        <TabsTrigger value="compte">Compte</TabsTrigger>
      </TabsList>

      <TabsContent value="profil">
        <ProfilTab user={user} />
      </TabsContent>
      <TabsContent value="nutrition">
        <NutritionTab profile={nutritionProfile} />
      </TabsContent>
      <TabsContent value="securite">
        <SecuriteTab />
      </TabsContent>
      <TabsContent value="notifications">
        <NotificationsTab />
      </TabsContent>
      <TabsContent value="compte">
        <CompteTab />
      </TabsContent>
    </Tabs>
  );
}

function ProfilTab({ user }: { user: Props["user"] }) {
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    const form = new FormData(e.currentTarget);
    const result = await updateProfile({
      firstName: form.get("firstName") as string,
      lastName: (form.get("lastName") as string) || undefined,
      language: form.get("language") as string,
      currency: form.get("currency") as string,
      country: (form.get("country") as string) || undefined,
    });
    setLoading(false);
    if (result.ok) toast.success("Profil mis à jour");
  }

  return (
    <Card>
      <CardHeader><CardTitle>Mon profil</CardTitle></CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Prénom</Label>
              <Input name="firstName" defaultValue={user.firstName ?? ""} required />
            </div>
            <div className="space-y-2">
              <Label>Nom</Label>
              <Input name="lastName" defaultValue={user.lastName ?? ""} />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Email</Label>
            <Input value={user.email} disabled />
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Langue</Label>
              <Select name="language" defaultValue={user.language}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="fr">Français</SelectItem>
                  <SelectItem value="en">English</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Devise</Label>
              <Select name="currency" defaultValue={user.currency}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="EUR">EUR €</SelectItem>
                  <SelectItem value="USD">USD $</SelectItem>
                  <SelectItem value="MAD">MAD DH</SelectItem>
                  <SelectItem value="CHF">CHF</SelectItem>
                  <SelectItem value="CAD">CAD $</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Pays</Label>
              <Input name="country" defaultValue={user.country ?? ""} />
            </div>
          </div>
          <Button type="submit" disabled={loading}>{loading ? "..." : "Enregistrer"}</Button>
        </form>
      </CardContent>
    </Card>
  );
}

function NutritionTab({ profile }: { profile: Props["nutritionProfile"] }) {
  const [loading, setLoading] = useState(false);
  const [sex, setSex] = useState(profile?.sex ?? "F");
  const [goal, setGoal] = useState(profile?.goal ?? "MAINTAIN");
  const [activityLevel, setActivityLevel] = useState(profile?.activityLevel ?? "MODERATE");
  const [age, setAge] = useState(profile?.age ? String(profile.age) : "");
  const [height, setHeight] = useState(profile?.height ? String(profile.height) : "");
  const [weight, setWeight] = useState(profile?.weight ? String(profile.weight) : "");
  const [targetWeightDelta, setTargetWeightDelta] = useState(
    profile?.targetWeightDelta != null ? String(profile.targetWeightDelta) : ""
  );

  const previewTdee =
    age && height && weight
      ? calculateTDEE(
          calculateBMR(sex, Number(weight), Number(height), Number(age)),
          activityLevel as ActivityLevel
        )
      : null;

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    const form = new FormData(e.currentTarget);
    const result = await updateNutritionProfile({
      sex,
      age: Number(age),
      height: Number(height),
      weight: Number(weight),
      goal: goal as never,
      targetWeightDelta: goal === "MAINTAIN" ? null : targetWeightDelta ? Number(targetWeightDelta) : null,
      activityLevel: activityLevel as never,
      allergies: (form.get("allergies") as string).split(",").map((s) => s.trim()).filter(Boolean),
      preferences: (form.get("preferences") as string).split(",").map((s) => s.trim()).filter(Boolean),
    });
    setLoading(false);
    if (result.ok) toast.success("Profil nutritionnel mis à jour");
    else toast.error(result.error);
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Profil nutritionnel</CardTitle>
        <CardDescription>Recalcule automatiquement tes besoins caloriques.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Sexe</Label>
              <Select value={sex} onValueChange={setSex}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="F">Femme</SelectItem>
                  <SelectItem value="M">Homme</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Âge</Label>
              <Input type="number" value={age} onChange={(e) => setAge(e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label>Taille (cm)</Label>
              <Input type="number" value={height} onChange={(e) => setHeight(e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label>Poids (kg)</Label>
              <Input type="number" value={weight} onChange={(e) => setWeight(e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label>Objectif</Label>
              <Select value={goal} onValueChange={setGoal}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="LOSE">Perdre du poids</SelectItem>
                  <SelectItem value="MAINTAIN">Maintenir</SelectItem>
                  <SelectItem value="GAIN">Prendre du poids</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Activité</Label>
              <Select value={activityLevel} onValueChange={setActivityLevel}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="SEDENTARY">Sédentaire</SelectItem>
                  <SelectItem value="LIGHT">Légère</SelectItem>
                  <SelectItem value="MODERATE">Modérée</SelectItem>
                  <SelectItem value="ACTIVE">Active</SelectItem>
                  <SelectItem value="VERY_ACTIVE">Très active</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {goal !== "MAINTAIN" && (
              <div className="space-y-2">
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
          </div>

          {previewTdee && (
            <GoalRecap
              tdee={previewTdee}
              goal={goal as NutritionGoal}
              targetWeightDelta={goal === "MAINTAIN" ? null : Number(targetWeightDelta) || null}
            />
          )}

          <div className="space-y-2">
            <Label>Allergies (séparées par virgules)</Label>
            <Input name="allergies" defaultValue={profile?.allergies?.join(", ") ?? ""} />
          </div>
          <div className="space-y-2">
            <Label>Préférences (séparées par virgules)</Label>
            <Input name="preferences" defaultValue={profile?.preferences?.join(", ") ?? ""} />
          </div>
          <Button type="submit" disabled={loading}>{loading ? "..." : "Enregistrer"}</Button>
        </form>
      </CardContent>
    </Card>
  );
}

function SecuriteTab() {
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    const form = new FormData(e.currentTarget);
    const newPassword = form.get("newPassword") as string;
    const confirm = form.get("confirmPassword") as string;
    if (newPassword !== confirm) {
      toast.error("Les mots de passe ne correspondent pas");
      setLoading(false);
      return;
    }
    const result = await changePassword(form.get("currentPassword") as string, newPassword).catch(() => ({ ok: false, error: "Erreur" }) as const);
    setLoading(false);
    if (result.ok) {
      toast.success("Mot de passe mis à jour");
      (e.target as HTMLFormElement).reset();
    } else {
      toast.error("error" in result ? result.error : "Erreur");
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader><CardTitle>Changer mon mot de passe</CardTitle></CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label>Mot de passe actuel</Label>
              <Input name="currentPassword" type="password" required />
            </div>
            <div className="space-y-2">
              <Label>Nouveau mot de passe</Label>
              <Input name="newPassword" type="password" required minLength={8} />
            </div>
            <div className="space-y-2">
              <Label>Confirmation</Label>
              <Input name="confirmPassword" type="password" required minLength={8} />
            </div>
            <Button type="submit" disabled={loading}>{loading ? "..." : "Mettre à jour"}</Button>
          </form>
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle>Sessions</CardTitle></CardHeader>
        <CardContent>
          <Button variant="outline" onClick={() => signOut({ callbackUrl: "/" })}>
            Se déconnecter de cet appareil
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

function NotificationsTab() {
  const [prefs, setPrefs] = useState({
    budget: true,
    repas: true,
    peremption: true,
    conseilsIA: true,
    nouveautes: false,
    promotions: false,
  });

  const LABELS: Record<keyof typeof prefs, string> = {
    budget: "Alertes budget",
    repas: "Alertes repas",
    peremption: "Alertes péremption",
    conseilsIA: "Conseils IA",
    nouveautes: "Nouveautés",
    promotions: "Promotions",
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Notifications</CardTitle>
        <CardDescription>Choisis les notifications que tu souhaites recevoir par email.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {(Object.keys(prefs) as (keyof typeof prefs)[]).map((key) => (
          <div key={key} className="flex items-center justify-between">
            <Label>{LABELS[key]}</Label>
            <Switch
              checked={prefs[key]}
              onCheckedChange={(v) => setPrefs((p) => ({ ...p, [key]: v }))}
            />
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

function CompteTab() {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);

  async function handleExport() {
    const res = await fetch("/api/account/export");
    const data = await res.json();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "lifepilot-mes-donnees.json";
    a.click();
  }

  async function handleDelete() {
    const res = await fetch("/api/account/delete", { method: "POST" });
    if (res.ok) {
      toast.success("Compte supprimé");
      router.push("/");
    } else {
      toast.error("Erreur lors de la suppression");
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Export de mes données (RGPD)</CardTitle>
          <CardDescription>Télécharge toutes tes données personnelles au format JSON.</CardDescription>
        </CardHeader>
        <CardContent>
          <Button variant="outline" onClick={handleExport}>Exporter mes données</Button>
        </CardContent>
      </Card>
      <Card className="border-destructive/40">
        <CardHeader>
          <CardTitle className="text-destructive">Zone de danger</CardTitle>
          <CardDescription>La suppression de ton compte est définitive.</CardDescription>
        </CardHeader>
        <CardContent>
          {confirming ? (
            <div className="flex gap-2">
              <Button variant="destructive" onClick={handleDelete}>Confirmer la suppression</Button>
              <Button variant="outline" onClick={() => setConfirming(false)}>Annuler</Button>
            </div>
          ) : (
            <Button variant="destructive" onClick={() => setConfirming(true)}>Supprimer mon compte</Button>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
