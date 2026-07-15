import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Wallet,
  ChefHat,
  ShoppingCart,
  Apple,
  Target,
  Sparkles,
  Users,
  Trophy,
} from "lucide-react";

const FEATURES = [
  { icon: Wallet, title: "Budget & finances", desc: "Revenus, charges, prévisions et alertes automatiques." },
  { icon: ChefHat, title: "Repas générés par l'IA", desc: "Un menu complet selon ton budget, tes calories et tes envies." },
  { icon: ShoppingCart, title: "Courses intelligentes", desc: "Liste générée automatiquement à partir de tes repas." },
  { icon: Apple, title: "Nutrition sur-mesure", desc: "IMC, calories, macros calculés et suivis au quotidien." },
  { icon: Target, title: "Objectifs financiers", desc: "Épargne, voyages, projets : progression suivie semaine après semaine." },
  { icon: Users, title: "Mode famille", desc: "Partagez budget, repas et objectifs entre tous les membres du foyer." },
  { icon: Trophy, title: "Défis & récompenses", desc: "Reste motivé avec des défis, badges et un score quotidien." },
];

export default function HomePage() {
  return (
    <>
      <section className="mx-auto max-w-6xl px-4 py-20 text-center md:py-32">
        <span className="mx-auto mb-6 inline-flex items-center gap-2 rounded-full border border-border bg-card px-4 py-1.5 text-sm text-muted-foreground">
          <Sparkles className="h-4 w-4 text-primary" /> Propulsé par l&apos;intelligence artificielle
        </span>
        <h1 className="mx-auto max-w-3xl text-4xl font-bold tracking-tight md:text-6xl">
          L&apos;assistant qui pilote ton quotidien
        </h1>
        <p className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground">
          Budget, courses, repas, nutrition et objectifs : LifePilot AI centralise toute l&apos;organisation
          de ta vie (ou de ta famille) dans une seule application, assistée par l&apos;IA à chaque étape.
        </p>
        <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
          <Link href="/inscription">
            <Button size="lg" className="w-full sm:w-auto">Commencer gratuitement</Button>
          </Link>
          <Link href="/comment-ca-marche">
            <Button size="lg" variant="outline" className="w-full sm:w-auto">Voir comment ça marche</Button>
          </Link>
        </div>
        <p className="mt-4 text-xs text-muted-foreground">Sans carte bancaire · Configuration en 5 minutes</p>
      </section>

      <section className="border-y border-border bg-muted/30 py-20">
        <div className="mx-auto max-w-6xl px-4">
          <h2 className="text-center text-3xl font-semibold">Tout ce dont tu as besoin, au même endroit</h2>
          <p className="mx-auto mt-3 max-w-xl text-center text-muted-foreground">
            Fini de jongler entre cinq applications différentes.
          </p>
          <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {FEATURES.map((f) => (
              <Card key={f.title}>
                <CardContent className="p-6">
                  <f.icon className="h-8 w-8 text-primary" />
                  <h3 className="mt-4 font-semibold">{f.title}</h3>
                  <p className="mt-2 text-sm text-muted-foreground">{f.desc}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-4xl px-4 py-20 text-center">
        <h2 className="text-3xl font-semibold">Prêt à reprendre le contrôle de ton quotidien ?</h2>
        <p className="mt-3 text-muted-foreground">Rejoins LifePilot AI et laisse l&apos;IA t&apos;aider chaque jour.</p>
        <Link href="/inscription">
          <Button size="lg" className="mt-6">Créer mon compte gratuit</Button>
        </Link>
      </section>
    </>
  );
}
