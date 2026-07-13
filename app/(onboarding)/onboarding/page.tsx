"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Checkbox } from "@/components/ui/checkbox";
import { completeOnboarding, type OnboardingInput } from "@/lib/actions/onboarding";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const TOTAL_STEPS = 7;

const GOALS = [
  { value: "ECONOMISER", label: "Économiser", emoji: "💰" },
  { value: "MIEUX_MANGER", label: "Mieux manger", emoji: "🥗" },
  { value: "PERDRE_POIDS", label: "Perdre du poids", emoji: "⚖️" },
  { value: "ORGANISER_COURSES", label: "Organiser mes courses", emoji: "🛒" },
  { value: "TOUT_FAIRE", label: "Tout faire", emoji: "✨" },
] as const;

const ALLERGY_OPTIONS = ["Gluten", "Lactose", "Arachides", "Fruits de mer", "Œufs", "Soja"];
const PREF_OPTIONS = ["Végétarien", "Végan", "Halal", "Casher", "Sans sucre", "Pas de restriction"];

export default function OnboardingPage() {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [data, setData] = useState<Partial<OnboardingInput>>({
    householdType: "SOLO",
    adultsCount: 1,
    childrenCount: 0,
    childrenAges: [],
    mainGoal: "TOUT_FAIRE",
    sex: "F",
    activityLevel: "MODERATE",
    allergies: [],
    preferences: [],
  });

  function update<K extends keyof OnboardingInput>(key: K, value: OnboardingInput[K]) {
    setData((d) => ({ ...d, [key]: value }));
  }

  function next() {
    setStep((s) => Math.min(s + 1, TOTAL_STEPS));
  }
  function back() {
    setStep((s) => Math.max(s - 1, 1));
  }

  async function finish() {
    if (loading || done) return;
    setLoading(true);
    const result = await completeOnboarding(data as OnboardingInput);
    if (!result.ok) {
      setLoading(false);
      toast.error(result.error);
      return;
    }
    setDone(true);
    toast.success("Ton espace est prêt ✨ Redirection...");
    // Hard navigation so the middleware re-reads a fresh session with onboardingDone = true.
    window.location.href = "/dashboard";
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-xl flex-col justify-center px-4 py-12">
      <div className="mb-8">
        <Progress value={(step / TOTAL_STEPS) * 100} />
        <p className="mt-2 text-sm text-muted-foreground">Étape {step} sur {TOTAL_STEPS}</p>
      </div>

      {step === 1 && (
        <StepCard title="Quel est ton prénom ?" description="On personnalise tout de suite ton espace.">
          <Input
            autoFocus
            placeholder="Ton prénom"
            value={data.firstName ?? ""}
            onChange={(e) => update("firstName", e.target.value)}
          />
        </StepCard>
      )}

      {step === 2 && (
        <StepCard title="Tu vis seul, en couple ou en famille ?">
          <div className="grid grid-cols-3 gap-3">
            {[
              { value: "SOLO", label: "Seul(e)", adults: 1, children: 0 },
              { value: "COUPLE", label: "En couple", adults: 2, children: 0 },
              { value: "FAMILY", label: "En famille", adults: 2, children: 1 },
            ].map((opt) => (
              <ChoiceButton
                key={opt.value}
                selected={data.householdType === opt.value}
                onClick={() => {
                  update("householdType", opt.value as OnboardingInput["householdType"]);
                  update("adultsCount", opt.adults);
                  update("childrenCount", opt.children);
                  update("childrenAges", Array(opt.children).fill(6));
                }}
              >
                {opt.label}
              </ChoiceButton>
            ))}
          </div>

          {data.householdType === "FAMILY" && (
            <div className="mt-6 space-y-4 rounded-lg border border-border p-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Nombre d&apos;adultes</Label>
                  <Input
                    type="number"
                    min={1}
                    max={10}
                    value={data.adultsCount ?? 2}
                    onChange={(e) => update("adultsCount", Math.max(Number(e.target.value), 1))}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Nombre d&apos;enfants</Label>
                  <Input
                    type="number"
                    min={0}
                    max={10}
                    value={data.childrenCount ?? 0}
                    onChange={(e) => {
                      const count = Math.max(Number(e.target.value), 0);
                      const ages = data.childrenAges ?? [];
                      update("childrenCount", count);
                      update(
                        "childrenAges",
                        Array.from({ length: count }, (_, i) => ages[i] ?? 6)
                      );
                    }}
                  />
                </div>
              </div>
              {(data.childrenCount ?? 0) > 0 && (
                <div className="space-y-2">
                  <Label>Âge de chaque enfant</Label>
                  <div className="grid grid-cols-3 gap-3">
                    {Array.from({ length: data.childrenCount ?? 0 }).map((_, i) => (
                      <div key={i} className="space-y-1">
                        <p className="text-xs text-muted-foreground">Enfant {i + 1}</p>
                        <Input
                          type="number"
                          min={0}
                          max={17}
                          value={data.childrenAges?.[i] ?? 6}
                          onChange={(e) => {
                            const ages = [...(data.childrenAges ?? [])];
                            ages[i] = Number(e.target.value);
                            update("childrenAges", ages);
                          }}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}
              <p className="text-xs text-muted-foreground">
                Tu pourras compléter le profil de chaque membre (nutrition, objectifs) plus tard dans
                l&apos;espace Famille.
              </p>
            </div>
          )}
        </StepCard>
      )}

      {step === 3 && (
        <StepCard title="Quel est ton revenu mensuel ?" description="Ça reste privé, uniquement pour calculer ton budget.">
          <Input
            type="number"
            placeholder="Ex: 2200"
            value={data.monthlyIncome ?? ""}
            onChange={(e) => update("monthlyIncome", Number(e.target.value))}
          />
        </StepCard>
      )}

      {step === 4 && (
        <StepCard title="Quel est ton loyer ?">
          <Input
            type="number"
            placeholder="Ex: 750"
            value={data.rent ?? ""}
            onChange={(e) => update("rent", Number(e.target.value))}
          />
        </StepCard>
      )}

      {step === 5 && (
        <StepCard title="Quel est ton objectif principal ?">
          <div className="grid grid-cols-2 gap-3">
            {GOALS.map((g) => (
              <ChoiceButton
                key={g.value}
                selected={data.mainGoal === g.value}
                onClick={() => update("mainGoal", g.value)}
              >
                <span className="mr-2">{g.emoji}</span>
                {g.label}
              </ChoiceButton>
            ))}
          </div>
        </StepCard>
      )}

      {step === 6 && (
        <StepCard title="Quelques infos santé" description="Pour calculer tes besoins nutritionnels.">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Taille (cm)</Label>
              <Input type="number" value={data.height ?? ""} onChange={(e) => update("height", Number(e.target.value))} />
            </div>
            <div className="space-y-2">
              <Label>Poids (kg)</Label>
              <Input type="number" value={data.weight ?? ""} onChange={(e) => update("weight", Number(e.target.value))} />
            </div>
            <div className="space-y-2">
              <Label>Âge</Label>
              <Input type="number" value={data.age ?? ""} onChange={(e) => update("age", Number(e.target.value))} />
            </div>
            <div className="space-y-2">
              <Label>Sexe</Label>
              <div className="flex gap-2">
                <ChoiceButton selected={data.sex === "F"} onClick={() => update("sex", "F")}>F</ChoiceButton>
                <ChoiceButton selected={data.sex === "M"} onClick={() => update("sex", "M")}>M</ChoiceButton>
              </div>
            </div>
          </div>
          <div className="mt-4 space-y-2">
            <Label>Activité physique</Label>
            <div className="grid grid-cols-2 gap-2">
              {[
                { v: "SEDENTARY", l: "Sédentaire" },
                { v: "LIGHT", l: "Légère" },
                { v: "MODERATE", l: "Modérée" },
                { v: "ACTIVE", l: "Active" },
                { v: "VERY_ACTIVE", l: "Très active" },
              ].map((a) => (
                <ChoiceButton key={a.v} selected={data.activityLevel === a.v} onClick={() => update("activityLevel", a.v as OnboardingInput["activityLevel"])}>
                  {a.l}
                </ChoiceButton>
              ))}
            </div>
          </div>
        </StepCard>
      )}

      {step === 7 && (
        <StepCard title="Allergies et préférences alimentaires">
          <div className="space-y-4">
            <div>
              <Label className="mb-2 block">Allergies</Label>
              <div className="flex flex-wrap gap-2">
                {ALLERGY_OPTIONS.map((a) => (
                  <TagToggle
                    key={a}
                    label={a}
                    selected={(data.allergies ?? []).includes(a)}
                    onToggle={() =>
                      update(
                        "allergies",
                        (data.allergies ?? []).includes(a)
                          ? (data.allergies ?? []).filter((x) => x !== a)
                          : [...(data.allergies ?? []), a]
                      )
                    }
                  />
                ))}
              </div>
            </div>
            <div>
              <Label className="mb-2 block">Préférences</Label>
              <div className="flex flex-wrap gap-2">
                {PREF_OPTIONS.map((p) => (
                  <TagToggle
                    key={p}
                    label={p}
                    selected={(data.preferences ?? []).includes(p)}
                    onToggle={() =>
                      update(
                        "preferences",
                        (data.preferences ?? []).includes(p)
                          ? (data.preferences ?? []).filter((x) => x !== p)
                          : [...(data.preferences ?? []), p]
                      )
                    }
                  />
                ))}
              </div>
            </div>
          </div>
        </StepCard>
      )}

      <div className="mt-8 flex justify-between">
        <Button variant="outline" onClick={back} disabled={step === 1}>
          Retour
        </Button>
        {step < TOTAL_STEPS ? (
          <Button onClick={next}>Continuer</Button>
        ) : (
          <Button onClick={finish} disabled={loading || done}>
            {done ? "C'est prêt, redirection..." : loading ? "Configuration..." : "C'est parti 🚀"}
          </Button>
        )}
      </div>
    </div>
  );
}

function StepCard({ title, description, children }: { title: string; description?: string; children: React.ReactNode }) {
  return (
    <div>
      <h1 className="text-2xl font-semibold">{title}</h1>
      {description && <p className="mt-1 text-muted-foreground">{description}</p>}
      <div className="mt-6">{children}</div>
    </div>
  );
}

function ChoiceButton({
  selected,
  onClick,
  children,
}: {
  selected: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-lg border px-4 py-3 text-sm font-medium transition-colors",
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
