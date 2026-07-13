"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { completeHealthProfile } from "@/lib/actions/health-profile";
import { calculateBMR, calculateTDEE, type ActivityLevel, type NutritionGoal } from "@/lib/nutrition-calc";
import { GoalRecap } from "@/components/nutrition/goal-recap";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const ALLERGY_OPTIONS = ["Gluten", "Lactose", "Arachides", "Fruits de mer", "Œufs", "Soja"];
const PREF_OPTIONS = ["Végétarien", "Végan", "Halal", "Casher", "Sans sucre", "Pas de restriction"];
const ACTIVITY_OPTIONS = [
  { v: "SEDENTARY", l: "Sédentaire" },
  { v: "LIGHT", l: "Légère" },
  { v: "MODERATE", l: "Modérée" },
  { v: "ACTIVE", l: "Active" },
  { v: "VERY_ACTIVE", l: "Très active" },
];
const GOAL_OPTIONS = [
  { v: "LOSE", l: "Perdre du poids" },
  { v: "MAINTAIN", l: "Maintenir" },
  { v: "GAIN", l: "Prendre du poids" },
];

export function HealthProfileForm({ defaultFirstName }: { defaultFirstName: string }) {
  const [loading, setLoading] = useState(false);
  const [sex, setSex] = useState<"F" | "M">("F");
  const [activityLevel, setActivityLevel] = useState("MODERATE");
  const [goal, setGoal] = useState("MAINTAIN");
  const [age, setAge] = useState("");
  const [height, setHeight] = useState("");
  const [weight, setWeight] = useState("");
  const [targetWeightDelta, setTargetWeightDelta] = useState("");
  const [targetDurationMonths, setTargetDurationMonths] = useState("");
  const [allergies, setAllergies] = useState<string[]>([]);
  const [preferences, setPreferences] = useState<string[]>([]);

  const previewTdee =
    age && height && weight
      ? calculateTDEE(
          calculateBMR(sex, Number(weight), Number(height), Number(age)),
          activityLevel as ActivityLevel
        )
      : null;

  function toggle(list: string[], setList: (v: string[]) => void, value: string) {
    setList(list.includes(value) ? list.filter((x) => x !== value) : [...list, value]);
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    const form = new FormData(e.currentTarget);
    const result = await completeHealthProfile({
      firstName: form.get("firstName") as string,
      sex,
      age: Number(age),
      height: Number(height),
      weight: Number(weight),
      activityLevel: activityLevel as never,
      goal: goal as never,
      targetWeightDelta: goal === "MAINTAIN" ? null : targetWeightDelta ? Number(targetWeightDelta) : null,
      targetDurationMonths: goal === "MAINTAIN" ? null : targetDurationMonths ? Number(targetDurationMonths) : null,
      allergies,
      preferences,
    });
    setLoading(false);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    toast.success("Profil complété ✨");
    window.location.href = "/dashboard";
  }

  return (
    <Card>
      <CardContent className="p-6">
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-2">
            <Label>Prénom</Label>
            <Input name="firstName" defaultValue={defaultFirstName} required />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Sexe</Label>
              <div className="flex gap-2">
                <ChoiceButton selected={sex === "F"} onClick={() => setSex("F")}>Féminin</ChoiceButton>
                <ChoiceButton selected={sex === "M"} onClick={() => setSex("M")}>Masculin</ChoiceButton>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Âge</Label>
              <Input type="number" min={10} max={120} value={age} onChange={(e) => setAge(e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label>Taille (cm)</Label>
              <Input type="number" min={50} max={250} value={height} onChange={(e) => setHeight(e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label>Poids (kg)</Label>
              <Input type="number" min={20} max={300} value={weight} onChange={(e) => setWeight(e.target.value)} required />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Niveau d&apos;activité physique</Label>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {ACTIVITY_OPTIONS.map((a) => (
                <ChoiceButton key={a.v} selected={activityLevel === a.v} onClick={() => setActivityLevel(a.v)}>
                  {a.l}
                </ChoiceButton>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label>Objectif</Label>
            <div className="grid grid-cols-3 gap-2">
              {GOAL_OPTIONS.map((g) => (
                <ChoiceButton key={g.v} selected={goal === g.v} onClick={() => setGoal(g.v)}>
                  {g.l}
                </ChoiceButton>
              ))}
            </div>
            {goal !== "MAINTAIN" && (
              <div className="grid grid-cols-2 gap-4 pt-2">
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
                <div className="space-y-2">
                  <Label>En combien de mois ? (optionnel)</Label>
                  <Input
                    type="number"
                    min={0}
                    step={0.5}
                    placeholder="ex : 2"
                    value={targetDurationMonths}
                    onChange={(e) => setTargetDurationMonths(e.target.value)}
                  />
                </div>
              </div>
            )}
            {previewTdee && (
              <GoalRecap
                tdee={previewTdee}
                goal={goal as NutritionGoal}
                targetWeightDelta={goal === "MAINTAIN" ? null : Number(targetWeightDelta) || null}
                targetDurationMonths={goal === "MAINTAIN" ? null : Number(targetDurationMonths) || null}
                className="mt-2"
              />
            )}
          </div>

          <div className="space-y-2">
            <Label>Allergies</Label>
            <div className="flex flex-wrap gap-2">
              {ALLERGY_OPTIONS.map((a) => (
                <TagToggle key={a} label={a} selected={allergies.includes(a)} onToggle={() => toggle(allergies, setAllergies, a)} />
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label>Préférences alimentaires</Label>
            <div className="flex flex-wrap gap-2">
              {PREF_OPTIONS.map((p) => (
                <TagToggle key={p} label={p} selected={preferences.includes(p)} onToggle={() => toggle(preferences, setPreferences, p)} />
              ))}
            </div>
          </div>

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Enregistrement..." : "Valider mon profil"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

function ChoiceButton({ selected, onClick, children }: { selected: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-lg border px-3 py-2 text-sm font-medium transition-colors",
        selected ? "border-primary bg-accent text-accent-foreground" : "border-border hover:bg-muted"
      )}
    >
      {children}
    </button>
  );
}

function TagToggle({ label, selected, onToggle }: { label: string; selected: boolean; onToggle: () => void }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className={cn(
        "flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm transition-colors",
        selected ? "border-primary bg-accent text-accent-foreground" : "border-border hover:bg-muted"
      )}
    >
      <Checkbox checked={selected} className="pointer-events-none" />
      {label}
    </button>
  );
}
