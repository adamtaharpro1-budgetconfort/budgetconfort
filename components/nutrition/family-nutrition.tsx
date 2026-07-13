import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";

interface FamilyMemberNutrition {
  id: string;
  label: string;
  isChild: boolean;
  age: number | null;
  calorieTarget: number | null;
  proteinTarget: number | null;
  carbTarget: number | null;
  fatTarget: number | null;
  computed: boolean;
}

export function FamilyNutrition({ members }: { members: FamilyMemberNutrition[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Nutrition de la famille</CardTitle>
        <CardDescription>Besoins caloriques estimés pour chaque membre du foyer.</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {members.map((m) => (
          <div key={m.id} className="rounded-md border border-border p-4">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium">{m.label}</p>
              <Badge variant="outline">{m.isChild ? "Enfant" : "Adulte"}{m.age != null ? ` · ${m.age} ans` : ""}</Badge>
            </div>
            {m.calorieTarget ? (
              <>
                <p className="mt-2 text-xl font-semibold">{m.calorieTarget} kcal<span className="text-xs font-normal text-muted-foreground"> / jour</span></p>
                <div className="mt-2 grid grid-cols-3 gap-2 text-center text-xs text-muted-foreground">
                  <div><p className="font-medium text-foreground">{m.proteinTarget}g</p>Protéines</div>
                  <div><p className="font-medium text-foreground">{m.carbTarget}g</p>Glucides</div>
                  <div><p className="font-medium text-foreground">{m.fatTarget}g</p>Lipides</div>
                </div>
                {m.computed && !m.isChild && (
                  <p className="mt-2 text-[11px] text-muted-foreground">Estimation à partir du profil (taille/poids/âge).</p>
                )}
                {m.isChild && (
                  <p className="mt-2 text-[11px] text-muted-foreground">Repère nutritionnel selon l&apos;âge (PNNS).</p>
                )}
              </>
            ) : (
              <p className="mt-2 text-sm text-muted-foreground">
                Complète l&apos;âge, le sexe, la taille et le poids dans{" "}
                <Link href="/famille" className="text-primary underline-offset-4 hover:underline">
                  l&apos;espace Famille
                </Link>{" "}
                pour voir ses besoins.
              </p>
            )}
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
