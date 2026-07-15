const FAQS = [
  { q: "LifePilot AI est-il gratuit ?", a: "Oui, un plan gratuit complet est disponible. Le plan Premium débloque les fonctionnalités IA illimitées." },
  { q: "Mes données bancaires sont-elles connectées ?", a: "Pas pour l'instant. Tu saisis tes revenus et dépenses manuellement. La synchronisation bancaire arrive en V3." },
  { q: "Comment fonctionne le générateur de repas IA ?", a: "L'IA prend en compte ton budget, tes calories, ton temps disponible et tes allergies pour proposer un menu complet avec liste de courses." },
  { q: "Puis-je utiliser LifePilot AI en famille ?", a: "Oui, le mode famille permet de créer plusieurs profils et de partager repas, courses, budget et objectifs." },
  { q: "Mes données sont-elles sécurisées ?", a: "Oui, chiffrement, authentification sécurisée et conformité RGPD avec export et suppression de tes données à tout moment." },
  { q: "Puis-je annuler à tout moment ?", a: "Oui, aucun engagement, résiliation en un clic depuis tes paramètres." },
];

export default function FaqPage() {
  return (
    <section className="mx-auto max-w-3xl px-4 py-20">
      <h1 className="text-center text-4xl font-bold">Questions fréquentes</h1>
      <div className="mt-12 space-y-6">
        {FAQS.map((f) => (
          <div key={f.q} className="border-b border-border pb-6">
            <h3 className="font-semibold">{f.q}</h3>
            <p className="mt-2 text-sm text-muted-foreground">{f.a}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
