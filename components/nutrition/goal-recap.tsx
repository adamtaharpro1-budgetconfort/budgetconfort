import { Flame, TrendingDown, TrendingUp, Target } from "lucide-react";
import { estimateGoalRecap, type NutritionGoal } from "@/lib/nutrition-calc";
import { cn } from "@/lib/utils";

export function GoalRecap({
  tdee,
  goal,
  targetWeightDelta,
  className,
}: {
  tdee: number;
  goal: NutritionGoal;
  targetWeightDelta?: number | null;
  className?: string;
}) {
  const recap = estimateGoalRecap(tdee, goal, targetWeightDelta);

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
          <span className="font-semibold text-foreground">{recap.dailyCalorieTarget} kcal/jour</span>.
        </p>
      </div>
    );
  }

  const isLose = goal === "LOSE";
  const Icon = isLose ? TrendingDown : TrendingUp;

  if (!targetWeightDelta || targetWeightDelta <= 0 || recap.weeks == null) {
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
          <span className="font-semibold text-foreground">{recap.dailyCalorieTarget} kcal/jour</span>{" "}
          pour {isLose ? "perdre" : "prendre"} du poids. Renseigne le nombre de kg visé pour une estimation du temps nécessaire.
        </p>
      </div>
    );
  }

  const months = recap.weeks / 4.33;
  const durationLabel =
    recap.weeks < 8
      ? `${recap.weeks} semaine${recap.weeks > 1 ? "s" : ""}`
      : `${Math.round(months * 10) / 10} mois`;

  return (
    <div
      className={cn(
        "space-y-2 rounded-lg border border-border bg-muted/40 p-3 text-sm",
        className
      )}
    >
      <div className="flex items-center gap-3">
        <Icon className={cn("h-4 w-4 shrink-0", isLose ? "text-success" : "text-warning")} />
        <p>
          {isLose ? "Ne dépasse pas" : "Ne descends pas sous"}{" "}
          <span className="font-semibold text-foreground">{recap.dailyCalorieTarget} kcal/jour</span>{" "}
          pour {isLose ? "perdre" : "prendre"} {targetWeightDelta} kg.
        </p>
      </div>
      <div className="flex items-center gap-3">
        <Target className="h-4 w-4 shrink-0 text-info" />
        <p>
          Temps estimé pour atteindre ton objectif :{" "}
          <span className="font-semibold text-foreground">~{durationLabel}</span>.
        </p>
      </div>
    </div>
  );
}
