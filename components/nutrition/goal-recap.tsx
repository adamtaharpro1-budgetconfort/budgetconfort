import { Flame, TrendingDown, TrendingUp, Target, ShieldAlert } from "lucide-react";
import { estimateGoalPlan, type NutritionGoal } from "@/lib/nutrition-calc";
import { cn } from "@/lib/utils";

const MIN_CALORIE_HINT = 1200;

export function GoalRecap({
  tdee,
  goal,
  targetWeightDelta,
  targetDurationMonths,
  className,
}: {
  tdee: number;
  goal: NutritionGoal;
  targetWeightDelta?: number | null;
  targetDurationMonths?: number | null;
  className?: string;
}) {
  const plan = estimateGoalPlan(tdee, goal, targetWeightDelta, targetDurationMonths);

  if (goal === "MAINTAIN") {
    return (
      <div
        className={cn(
          "flex items-center gap-3 rounded-lg border border-border bg-muted/40 p-3 text-sm",
          className
        )}
      >
        <Flame className="h-4 w-4 shrink-0 text-info" />
        <p>
          Pour maintenir ton poids actuel, vise environ{" "}
          <span className="font-semibold text-foreground">{plan.dailyCalorieTarget} kcal/jour</span>.
        </p>
      </div>
    );
  }

  const isLose = goal === "LOSE";
  const Icon = isLose ? TrendingDown : TrendingUp;

  if (!targetWeightDelta || targetWeightDelta <= 0 || plan.weeks == null) {
    return (
      <div
        className={cn(
          "flex items-center gap-3 rounded-lg border border-border bg-muted/40 p-3 text-sm",
          className
        )}
      >
        <Icon className={cn("h-4 w-4 shrink-0", isLose ? "text-success" : "text-warning")} />
        <p>
          {isLose ? "Ne dépasse pas" : "Ne descends pas sous"}{" "}
          <span className="font-semibold text-foreground">{plan.dailyCalorieTarget} kcal/jour</span>{" "}
          pour {isLose ? "perdre" : "prendre"} du poids. Renseigne le nombre de kg visé pour une estimation du temps nécessaire.
        </p>
      </div>
    );
  }

  const months = plan.weeks / 4.345;
  const durationLabel =
    plan.weeks < 8 ? `${plan.weeks} semaine${plan.weeks > 1 ? "s" : ""}` : `${Math.round(months * 10) / 10} mois`;

  return (
    <div className={cn("space-y-2 rounded-lg border border-border bg-muted/40 p-3 text-sm", className)}>
      {plan.wasAdjusted && (
        <div className="flex items-start gap-2 rounded-md border border-warning/40 bg-warning/10 p-2 text-warning">
          <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" />
          <p className="text-xs">
            {plan.requestedWeeks
              ? "Le délai demandé imposait un rythme trop rapide."
              : "Ton objectif a été ajusté."}{" "}
            Pour rester en sécurité (max 1 kg/semaine, sans descendre sous {MIN_CALORIE_HINT} kcal/jour), on a
            recalculé un rythme raisonnable d&apos;environ{" "}
            <span className="font-semibold">{plan.weeklyRateKg} kg/semaine</span>.
          </p>
        </div>
      )}
      <div className="flex items-center gap-3">
        <Icon className={cn("h-4 w-4 shrink-0", isLose ? "text-success" : "text-warning")} />
        <p>
          {isLose ? "Ne dépasse pas" : "Ne descends pas sous"}{" "}
          <span className="font-semibold text-foreground">{plan.dailyCalorieTarget} kcal/jour</span>{" "}
          pour {isLose ? "perdre" : "prendre"} {targetWeightDelta} kg.
        </p>
      </div>
      <div className="flex items-center gap-3">
        <Target className="h-4 w-4 shrink-0 text-info" />
        <p>
          Temps estimé pour atteindre ton objectif :{" "}
          <span className="font-semibold text-foreground">~{durationLabel}</span>{" "}
          <span className="text-xs text-muted-foreground">(~{plan.weeklyRateKg} kg/semaine)</span>.
        </p>
      </div>
    </div>
  );
}
