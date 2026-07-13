"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Plus } from "lucide-react";
import { logNutritionEntry, updateNutritionGoal } from "@/lib/actions/nutrition";
import { calculateBMI } from "@/lib/nutrition-calc";
import { BmiGauge } from "@/components/nutrition/bmi-gauge";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { toast } from "sonner";

interface Props {
  profile: {
    height: number | null;
    weight: number | null;
    goal: string | null;
    bmr: number | null;
    tdee: number | null;
    calorieTarget: number | null;
    proteinTarget: number | null;
    carbTarget: number | null;
    fatTarget: number | null;
    allergies: string[];
    preferences: string[];
  } | null;
  todayLog: { caloriesConsumed: number; proteins: number; carbs: number; fats: number; waterMl: number } | null;
}

const GOAL_OPTIONS = [
  { value: "LOSE", label: "Perdre du poids" },
  { value: "MAINTAIN", label: "Maintenir mon poids" },
  { value: "GAIN", label: "Prendre du poids" },
];

export function NutritionClient({ profile, todayLog }: Props) {
  const bmi = profile?.height && profile?.weight ? calculateBMI(profile.weight, profile.height) : null;
  const caloriesConsumed = todayLog?.caloriesConsumed ?? 0;
  const calorieTarget = profile?.calorieTarget ?? 2000;
  const pct = Math.min(Math.round((caloriesConsumed / calorieTarget) * 100), 100);

  return (
    <div className="space-y-6">
      <GoalSelector currentGoal={profile?.goal ?? null} hasProfile={!!profile?.height && !!profile?.weight} />

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="text-sm">Indice de masse corporelle</CardTitle>
          </CardHeader>
          <CardContent>
            {bmi ? (
              <BmiGauge bmi={bmi} />
            ) : (
              <p className="text-sm text-muted-foreground">
                Renseigne ta taille et ton poids dans{" "}
                <a href="/parametres" className="text-primary underline-offset-4 hover:underline">
                  tes paramètres
                </a>{" "}
                pour voir ton IMC.
              </p>
            )}
          </CardContent>
        </Card>
        <div className="grid grid-cols-2 gap-4 lg:col-span-2">
          <StatCard label="Métabolisme de base" value={profile?.bmr ? `${profile.bmr} kcal` : "—"} />
          <StatCard label="Dépense totale (TDEE)" value={profile?.tdee ? `${profile.tdee} kcal` : "—"} />
          <StatCard label="Objectif calorique" value={profile?.calorieTarget ? `${profile.calorieTarget} kcal` : "—"} />
          <StatCard label="Poids actuel" value={profile?.weight ? `${profile.weight} kg` : "—"} />
        </div>
      </div>

      <Card>
        <CardHeader className="flex-row items-center justify-between">
          <div>
            <CardTitle>Aujourd&apos;hui</CardTitle>
            <CardDescription>{caloriesConsumed} / {calorieTarget} kcal</CardDescription>
          </div>
          <LogDialog />
        </CardHeader>
        <CardContent>
          <Progress value={pct} />
          <div className="mt-4 grid grid-cols-3 gap-4 text-center text-sm">
            <div>
              <p className="font-semibold">{todayLog?.proteins ?? 0}g</p>
              <p className="text-muted-foreground text-xs">Protéines / {profile?.proteinTarget ?? "-"}g</p>
            </div>
            <div>
              <p className="font-semibold">{todayLog?.carbs ?? 0}g</p>
              <p className="text-muted-foreground text-xs">Glucides / {profile?.carbTarget ?? "-"}g</p>
            </div>
            <div>
              <p className="font-semibold">{todayLog?.fats ?? 0}g</p>
              <p className="text-muted-foreground text-xs">Lipides / {profile?.fatTarget ?? "-"}g</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Profil santé</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <p><span className="text-muted-foreground">Allergies : </span>{profile?.allergies?.join(", ") || "aucune"}</p>
          <p><span className="text-muted-foreground">Préférences : </span>{profile?.preferences?.join(", ") || "aucune"}</p>
          <p className="text-xs text-muted-foreground">Modifiable depuis les paramètres.</p>
        </CardContent>
      </Card>
    </div>
  );
}

function GoalSelector({ currentGoal, hasProfile }: { currentGoal: string | null; hasProfile: boolean }) {
  const [goal, setGoal] = useState(currentGoal ?? "MAINTAIN");
  const [loading, setLoading] = useState(false);

  async function handleChange(value: string) {
    setGoal(value);
    if (!hasProfile) {
      toast.error("Renseigne d'abord ton âge, ta taille et ton poids dans Paramètres → Nutrition.");
      return;
    }
    setLoading(true);
    const result = await updateNutritionGoal(value as never);
    setLoading(false);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    toast.success("Objectif mis à jour ✨");
  }

  return (
    <Card>
      <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-medium">Mon objectif</p>
          <p className="text-xs text-muted-foreground">Utilisé pour tes calories et tes portions dans les repas générés par l&apos;IA.</p>
        </div>
        <Select value={goal} onValueChange={handleChange} disabled={loading}>
          <SelectTrigger className="w-full sm:w-56"><SelectValue /></SelectTrigger>
          <SelectContent>
            {GOAL_OPTIONS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
          </SelectContent>
        </Select>
      </CardContent>
    </Card>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <Card>
      <CardContent className="p-4">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="mt-1 text-xl font-semibold">{value}</p>
      </CardContent>
    </Card>
  );
}

function LogDialog() {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    const form = new FormData(e.currentTarget);
    await logNutritionEntry({
      calories: Number(form.get("calories")) || 0,
      proteins: Number(form.get("proteins")) || 0,
      carbs: Number(form.get("carbs")) || 0,
      fats: Number(form.get("fats")) || 0,
      waterMl: Number(form.get("waterMl")) || 0,
    });
    setLoading(false);
    setOpen(false);
    toast.success("Ajouté au suivi du jour");
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm"><Plus className="h-4 w-4" /> Ajouter</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>Ajouter au suivi du jour</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Calories</Label>
              <Input name="calories" type="number" />
            </div>
            <div className="space-y-2">
              <Label>Eau (ml)</Label>
              <Input name="waterMl" type="number" />
            </div>
            <div className="space-y-2">
              <Label>Protéines (g)</Label>
              <Input name="proteins" type="number" />
            </div>
            <div className="space-y-2">
              <Label>Glucides (g)</Label>
              <Input name="carbs" type="number" />
            </div>
            <div className="space-y-2">
              <Label>Lipides (g)</Label>
              <Input name="fats" type="number" />
            </div>
          </div>
          <DialogFooter>
            <Button type="submit" disabled={loading}>{loading ? "..." : "Ajouter"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
