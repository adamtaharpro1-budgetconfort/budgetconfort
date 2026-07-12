import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { verifyEmail } from "@/lib/actions/auth";

export default async function VerifierEmailPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;
  const result = token ? await verifyEmail(token) : { ok: false, error: "Lien manquant" };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{result.ok ? "Email confirmé ✅" : "Lien invalide"}</CardTitle>
        <CardDescription>
          {result.ok
            ? "Ton compte est activé, tu peux te connecter."
            : "error" in result
              ? result.error
              : "Une erreur est survenue."}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Link href="/connexion">
          <Button className="w-full">Se connecter</Button>
        </Link>
      </CardContent>
    </Card>
  );
}
