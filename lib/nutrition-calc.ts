export type ActivityLevel = "SEDENTARY" | "LIGHT" | "MODERATE" | "ACTIVE" | "VERY_ACTIVE";
export type NutritionGoal = "LOSE" | "MAINTAIN" | "GAIN";

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
