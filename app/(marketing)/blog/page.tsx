import { Card, CardContent } from "@/components/ui/card";

const POSTS = [
  {
    title: "5 astuces pour réduire ta facture alimentaire sans sacrifier la qualité",
    excerpt: "Planification, stock, anti-gaspillage : les leviers concrets pour économiser chaque mois.",
    date: "Bientôt",
  },
  {
    title: "Comprendre son TDEE pour manger juste",
    excerpt: "BMR, TDEE, macros : ce que ces chiffres veulent vraiment dire pour ton alimentation.",
    date: "Bientôt",
  },
  {
    title: "Comment l'IA génère un menu de la semaine adapté à ton budget",
    excerpt: "Un aperçu du fonctionnement du générateur de repas de LifePilot AI.",
    date: "Bientôt",
  },
];

export default function BlogPage() {
  return (
    <section className="mx-auto max-w-4xl px-4 py-20">
      <h1 className="text-center text-4xl font-bold">Blog</h1>
      <p className="mx-auto mt-4 max-w-xl text-center text-muted-foreground">
        Conseils budget, nutrition et organisation. Premiers articles très bientôt.
      </p>
      <div className="mt-14 space-y-6">
        {POSTS.map((p) => (
          <Card key={p.title}>
            <CardContent className="p-6">
              <p className="text-xs text-muted-foreground">{p.date}</p>
              <h3 className="mt-1 font-semibold">{p.title}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{p.excerpt}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </section>
  );
}
