import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Check } from "lucide-react";

const PLANS = [
  {
    name: "Gratuit",
    price: "0€",
    period: "pour toujours",
    features: ["Budget & dépenses", "Liste de courses", "3 recettes IA / mois", "1 objectif financier"],
    cta: "Commencer gratuitement",
    highlighted: false,
  },
  {
    name: "Premium",
    price: "6,99€",
    period: "/ mois",
    features: [
      "Tout le plan gratuit",
      "Générateur de repas IA illimité",
      "Scanner frigo & tickets illimité",
      "Objectifs financiers illimités",
      "Coach IA illimité",
      "Mode famille (jusqu'à 6 comptes)",
    ],
    cta: "Essayer 14 jours gratuits",
    highlighted: true,
  },
  {
    name: "Famille",
    price: "11,99€",
    period: "/ mois",
    features: ["Tout le plan Premium", "Comptes illimités", "Partage temps réel", "Support prioritaire"],
    cta: "Choisir Famille",
    highlighted: false,
  },
];

export default function TarifsPage() {
  return (
    <section className="mx-auto max-w-6xl px-4 py-20">
      <h1 className="text-center text-4xl font-bold">Des tarifs simples</h1>
      <p className="mx-auto mt-4 max-w-xl text-center text-muted-foreground">
        Commence gratuitement. Passe au niveau supérieur quand tu es prêt.
      </p>
      <div className="mt-14 grid gap-6 md:grid-cols-3">
        {PLANS.map((plan) => (
          <Card key={plan.name} className={plan.highlighted ? "border-primary shadow-lg" : ""}>
            <CardHeader>
              <CardTitle>{plan.name}</CardTitle>
              <div className="mt-2 flex items-baseline gap-1">
                <span className="text-3xl font-bold">{plan.price}</span>
                <span className="text-sm text-muted-foreground">{plan.period}</span>
              </div>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-sm">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-start gap-2">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                    {f}
                  </li>
                ))}
              </ul>
              <Link href="/inscription">
                <Button className="mt-6 w-full" variant={plan.highlighted ? "default" : "outline"}>
                  {plan.cta}
                </Button>
              </Link>
            </CardContent>
          </Card>
        ))}
      </div>
    </section>
  );
}
