import { Card, CardContent } from "@/components/ui/card";

const STEPS = [
  { n: "1", title: "Crée ton compte", desc: "Inscription en 30 secondes avec ton email." },
  { n: "2", title: "Réponds à 7 questions", desc: "L'onboarding IA configure ton budget, tes objectifs et tes besoins nutritionnels." },
  { n: "3", title: "Ton espace est prêt", desc: "Budget, premier menu de la semaine et liste de courses générés automatiquement." },
  { n: "4", title: "Vis avec ton assistant", desc: "Scanne tes tickets et ton frigo, discute avec le coach IA, atteins tes objectifs." },
];

export default function CommentCaMarchePage() {
  return (
    <section className="mx-auto max-w-4xl px-4 py-20">
      <h1 className="text-center text-4xl font-bold">Comment ça marche ?</h1>
      <p className="mx-auto mt-4 max-w-xl text-center text-muted-foreground">
        Quatre étapes pour que LifePilot AI devienne ton assistant de vie.
      </p>
      <div className="mt-14 space-y-6">
        {STEPS.map((s) => (
          <Card key={s.n}>
            <CardContent className="flex items-start gap-4 p-6">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground font-semibold">
                {s.n}
              </div>
              <div>
                <h3 className="font-semibold">{s.title}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{s.desc}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </section>
  );
}
