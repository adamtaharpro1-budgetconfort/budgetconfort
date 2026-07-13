"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { completeHealthProfile } from "@/lib/actions/health-profile";
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
  const [allergies, setAllergies] = useState<string[]>([]);
  const [preferences, setPreferences] = useState<string[]>([]);

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
      age: Number(form.get("age")),
      height: Number(form.get("height")),
      weight: Number(form.get("weight")),
      activityLevel: activityLevel as never,
      goal: goal as never,
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
              <Input name="age" type="number" min={10} max={120} required />
            </div>
            <div className="space-y-2">
              <Label>Taille (cm)</Label>
              <Input name="height" type="number" min={50} max={250} required />
            </div>
            <div className="space-y-2">
              <Label>Poids (kg)</Label>
              <Input name="weight" type="number" min={20} max={300} required />
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
