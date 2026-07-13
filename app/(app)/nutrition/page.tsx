import { prisma } from "@/lib/prisma";
import { requireHousehold } from "@/lib/household";
import { NutritionClient } from "@/components/nutrition/nutrition-client";
import { FamilyNutrition } from "@/components/nutrition/family-nutrition";
import { computeFullNutritionProfile, estimateChildNutrition, calculateBMI } from "@/lib/nutrition-calc";

export default async function NutritionPage() {
  const { userId, household } = await requireHousehold();
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const [profile, todayLog, members] = await Promise.all([
    prisma.nutritionProfile.findUnique({ where: { userId } }),
    prisma.dailyNutritionLog.findUnique({ where: { userId_date: { userId, date: today } } }),
    prisma.householdMember.findMany({
      where: { householdId: household.id, userId: { not: userId } },
      include: { user: { include: { nutritionProfile: true } } },
      orderBy: { joinedAt: "asc" },
    }),
  ]);

  const familyMembers = members.map((m) => {
    // Un membre avec compte utilise son propre profil nutritionnel s'il existe.
    if (m.user?.nutritionProfile) {
      const p = m.user.nutritionProfile;
      return {
        id: m.id,
        label: m.label ?? m.user.firstName ?? "Membre",
        isChild: m.isChild,
        age: p.age,
        bmi: !m.isChild && p.height && p.weight ? calculateBMI(p.weight, p.height) : null,
        calorieTarget: p.calorieTarget,
        proteinTarget: p.proteinTarget,
        carbTarget: p.carbTarget,
        fatTarget: p.fatTarget,
        goal: p.goal,
        targetWeightDelta: p.targetWeightDelta,
        tdee: p.tdee,
        computed: false,
      };
    }

    // Enfant : repères PNNS par tranche d'âge (une formule adulte serait fausse pour un enfant).
    if (m.isChild && m.age != null) {
      const nutrition = estimateChildNutrition(m.age);
      return {
        id: m.id,
        label: m.label ?? "Membre",
        isChild: true,
        age: m.age,
        bmi: null,
        calorieTarget: nutrition.calorieTarget,
        proteinTarget: nutrition.proteinTarget,
        carbTarget: nutrition.carbTarget,
        fatTarget: nutrition.fatTarget,
        goal: null,
        targetWeightDelta: null,
        tdee: null,
        computed: true,
      };
    }

    // Adulte sans compte : calcul à partir des infos de base saisies dans la page Famille.
    if (!m.isChild && m.sex && m.age && m.height && m.weight) {
      const goal = (m.goal as "LOSE" | "MAINTAIN" | "GAIN") ?? "MAINTAIN";
      const nutrition = computeFullNutritionProfile({
        sex: m.sex,
        age: m.age,
        height: m.height,
        weight: m.weight,
        activityLevel: "MODERATE",
        goal,
      });
      return {
        id: m.id,
        label: m.label ?? "Membre",
        isChild: false,
        age: m.age,
        bmi: calculateBMI(m.weight, m.height),
        calorieTarget: nutrition.calorieTarget,
        proteinTarget: nutrition.proteinTarget,
        carbTarget: nutrition.carbTarget,
        fatTarget: nutrition.fatTarget,
        goal,
        targetWeightDelta: m.targetWeightDelta,
        tdee: nutrition.tdee,
        computed: true,
      };
    }

    return {
      id: m.id,
      label: m.label ?? "Membre",
      isChild: m.isChild,
      age: m.age,
      bmi: null,
      calorieTarget: null,
      proteinTarget: null,
      carbTarget: null,
      fatTarget: null,
      goal: m.goal,
      targetWeightDelta: m.targetWeightDelta,
      tdee: null,
      computed: false,
    };
  });

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Nutrition</h1>
      <NutritionClient profile={profile} todayLog={todayLog} />
      {familyMembers.length > 0 && <FamilyNutrition members={familyMembers} />}
    </div>
  );
}
