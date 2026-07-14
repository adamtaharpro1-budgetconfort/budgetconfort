export type ActivityLevel = "SEDENTARY" | "LIGHT" | "MODERATE" | "ACTIVE" | "VERY_ACTIVE";
export type NutritionGoal = "LOSE" | "MAINTAIN" | "GAIN";

/** Âge en années révolues à partir d'une date de naissance — toujours exact, contrairement à un âge saisi une fois qui devient faux avec le temps. */
export function calculateAge(birthDate: Date, at: Date = new Date()): number {
  let age = at.getFullYear() - birthDate.getFullYear();
  const monthDiff = at.getMonth() - birthDate.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && at.getDate() < birthDate.getDate())) {
    age--;
  }
  return age;
}

const ACTIVITY_MULTIPLIER: Record<ActivityLevel, number> = {
  SEDENTARY: 1.2,
  LIGHT: 1.375,
  MODERATE: 1.55,
  ACTIVE: 1.725,
  VERY_ACTIVE: 1.9,
};

export function calculateBMR(sex: string, weightKg: number, heightCm: number, age: number) {
  const base = 10 * weightKg + 6.25 * heightCm - 5 * age;
  return Math.round(sex === "F" ? base - 161 : base + 5);
}

export function calculateTDEE(bmr: number, activity: ActivityLevel) {
  return Math.round(bmr * ACTIVITY_MULTIPLIER[activity]);
}

export function calculateCalorieTarget(tdee: number, goal: NutritionGoal) {
  if (goal === "LOSE") return Math.round(tdee - 500);
  if (goal === "GAIN") return Math.round(tdee + 300);
  return tdee;
}

export function calculateMacros(calories: number) {
  return {
    proteinTarget: Math.round((calories * 0.3) / 4),
    carbTarget: Math.round((calories * 0.4) / 4),
    fatTarget: Math.round((calories * 0.3) / 9),
  };
}

export function calculateBMI(weightKg: number, heightCm: number) {
  const heightM = heightCm / 100;
  return Math.round((weightKg / (heightM * heightM)) * 10) / 10;
}

export function computeFullNutritionProfile(input: {
  sex: string;
  weight: number;
  height: number;
  age: number;
  activityLevel: ActivityLevel;
  goal: NutritionGoal;
}) {
  const bmr = calculateBMR(input.sex, input.weight, input.height, input.age);
  const tdee = calculateTDEE(bmr, input.activityLevel);
  const calorieTarget = calculateCalorieTarget(tdee, input.goal);
  const macros = calculateMacros(calorieTarget);
  return { bmr, tdee, calorieTarget, ...macros };
}

/**
 * The Mifflin-St Jeor formula (used above) is only valid for adults.
 * For children, use published pediatric daily energy guidelines
 * (repères PNNS / OMS) by age bracket instead of an adult BMR formula,
 * which would give a medically misleading number for a toddler.
 */
export function estimateChildNutrition(age: number) {
  let calorieTarget: number;
  if (age <= 3) calorieTarget = 1200;
  else if (age <= 8) calorieTarget = 1600;
  else if (age <= 13) calorieTarget = 2000;
  else calorieTarget = 2400;

  return { calorieTarget, ...calculateMacros(calorieTarget) };
}

const KCAL_PER_KG = 7700; // approximation standard : ~7700 kcal ≈ 1 kg de masse corporelle
const WEEKS_PER_MONTH = 4.345;
const MAX_SAFE_KG_PER_WEEK = 1; // recommandation santé : jamais plus de 1 kg/semaine, perte ou prise
const MIN_SAFE_CALORIE_FLOOR = 1200; // plancher calorique jamais franchi, même pour un objectif agressif

export interface GoalPlan {
  dailyCalorieTarget: number;
  weeklyRateKg: number; // rythme réel utilisé pour le calcul (kg/semaine)
  weeks: number | null; // durée réaliste estimée pour atteindre l'objectif
  requestedWeeks: number | null; // durée initialement demandée par l'utilisateur, si renseignée
  wasAdjusted: boolean; // true si le rythme demandé était dangereux et a été recalculé
  goal: NutritionGoal;
}

/**
 * Calcule le plafond/plancher calorique quotidien et la durée réaliste pour
 * atteindre un objectif de poids. Si la durée demandée impliquerait un
 * rythme dangereux (> 1 kg/semaine, ou un plancher calorique franchi), le
 * plan est automatiquement recalculé sur un rythme sûr et signalé via
 * `wasAdjusted` plutôt que de suivre une valeur saisie par l'utilisateur.
 */
const DEFAULT_DAILY_DELTA: Record<"LOSE" | "GAIN", number> = { LOSE: 500, GAIN: 300 };

export function estimateGoalPlan(
  tdee: number,
  goal: NutritionGoal,
  targetWeightDelta?: number | null,
  targetDurationMonths?: number | null
): GoalPlan {
  if (goal === "MAINTAIN") {
    return {
      dailyCalorieTarget: calculateCalorieTarget(tdee, "MAINTAIN"),
      weeklyRateKg: 0,
      weeks: null,
      requestedWeeks: null,
      wasAdjusted: false,
      goal,
    };
  }

  const hasDelta = !!targetWeightDelta && targetWeightDelta > 0;
  const requestedWeeks =
    hasDelta && targetDurationMonths && targetDurationMonths > 0 ? targetDurationMonths * WEEKS_PER_MONTH : null;
  const requestedWeeklyRate = requestedWeeks ? targetWeightDelta! / requestedWeeks : null;

  let dailyDelta: number;
  let wasAdjusted = false;

  if (requestedWeeklyRate != null) {
    // Durée précise demandée : on vérifie que le rythme induit reste sûr.
    let weeklyRateKg = requestedWeeklyRate;
    if (weeklyRateKg > MAX_SAFE_KG_PER_WEEK) {
      weeklyRateKg = MAX_SAFE_KG_PER_WEEK;
      wasAdjusted = true;
    }
    dailyDelta = Math.round((weeklyRateKg * KCAL_PER_KG) / 7);
  } else {
    // Pas de durée précisée : rythme par défaut recommandé.
    dailyDelta = DEFAULT_DAILY_DELTA[goal];
  }

  let dailyCalorieTarget = goal === "LOSE" ? tdee - dailyDelta : tdee + dailyDelta;

  if (goal === "LOSE" && dailyCalorieTarget < MIN_SAFE_CALORIE_FLOOR) {
    dailyCalorieTarget = MIN_SAFE_CALORIE_FLOOR;
    dailyDelta = Math.max(tdee - MIN_SAFE_CALORIE_FLOOR, 0);
    wasAdjusted = true;
  }

  const weeklyRateKg = Math.round(((dailyDelta * 7) / KCAL_PER_KG) * 100) / 100;
  const weeks = hasDelta && weeklyRateKg > 0 ? Math.round(targetWeightDelta! / weeklyRateKg) : null;

  return {
    dailyCalorieTarget,
    weeklyRateKg,
    weeks,
    requestedWeeks: requestedWeeks ? Math.round(requestedWeeks) : null,
    wasAdjusted,
    goal,
  };
}

export interface MemberNutritionInput {
  isChild: boolean;
  age: number | null;
  sex: string | null;
  height: number | null;
  weight: number | null;
  goal: string | null; // LOSE, MAINTAIN, GAIN
  linkedCalorieTarget?: number | null; // from a real NutritionProfile, when the member has an account
}

/** Best-effort daily calorie target for any household member, account-linked or not. */
export function resolveMemberCalorieTarget(m: MemberNutritionInput): number | null {
  if (m.linkedCalorieTarget) return m.linkedCalorieTarget;
  if (m.isChild) {
    if (m.age == null) return null;
    return estimateChildNutrition(m.age).calorieTarget;
  }
  if (m.sex && m.age && m.height && m.weight) {
    return computeFullNutritionProfile({
      sex: m.sex,
      age: m.age,
      height: m.height,
      weight: m.weight,
      activityLevel: "MODERATE",
      goal: (m.goal as NutritionGoal) ?? "MAINTAIN",
    }).calorieTarget;
  }
  return null;
}
