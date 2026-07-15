import { Card, CardContent } from "@/components/ui/card";
import { Wallet, ChefHat, ShoppingCart, Apple, Target, Users, Trophy, Plane, Bot } from "lucide-react";

const GROUPS = [
  {
    title: "Finances",
    icon: Wallet,
    items: ["Revenus et charges fixes/variables", "Calculs automatiques (budget restant, prévisions)", "Alertes de dépassement", "Objectifs financiers avec suivi de progression"],
  },
  {
    title: "Alimentation",
    icon: ChefHat,
    items: ["Générateur de repas par IA", "Planning semaine et mois", "Recettes détaillées (temps, prix, calories)", "Repas favoris et aléatoires"],
  },
  {
    title: "Courses",
    icon: ShoppingCart,
    items: ["Liste de courses automatique", "Rangée par rayon de supermarché", "Historique et duplication de listes"],
  },
  {
    title: "Nutrition",
    icon: Apple,
    items: ["Calcul IMC, BMR, TDEE", "Objectifs caloriques et macros", "Suivi quotidien", "Allergies et préférences prises en compte"],
  },
  {
    title: "Objectifs & voyages",
    icon: Target,
    items: ["Plusieurs objectifs simultanés", "Calcul automatique de l'épargne hebdomadaire", "Planification de vacances avec budget"],
  },
  {
    title: "Famille",
    icon: Users,
    items: ["Comptes multiples", "Partage repas, courses, objectifs", "Permissions par membre"],
  },
  {
    title: "Gamification",
    icon: Trophy,
    items: ["Défis budget, nutrition, gaspillage", "Badges et XP", "Score quotidien"],
  },
  {
    title: "Coach IA",
    icon: Bot,
    items: ["Discussion naturelle", "Conseils personnalisés", "Génération de menus et de listes sur demande"],
  },
];

export default function FonctionnalitesPage() {
  return (
    <section className="mx-auto max-w-6xl px-4 py-20">
      <h1 className="text-center text-4xl font-bold">Toutes les fonctionnalités</h1>
      <p className="mx-auto mt-4 max-w-xl text-center text-muted-foreground">
        Une plateforme complète pour piloter ton quotidien, pas une simple app de budget.
      </p>
      <div className="mt-14 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {GROUPS.map((g) => (
          <Card key={g.title}>
            <CardContent className="p-6">
              <g.icon className="h-7 w-7 text-primary" />
              <h3 className="mt-3 font-semibold">{g.title}</h3>
              <ul className="mt-3 space-y-1.5 text-sm text-muted-foreground">
                {g.items.map((i) => (
                  <li key={i}>• {i}</li>
                ))}
              </ul>
            </CardContent>
          </Card>
        ))}
      </div>
    </section>
  );
}
