import Link from "next/link";
import { auth } from "@/lib/auth";
import { getInviteByToken } from "@/lib/actions/invite";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AcceptInviteButton } from "@/components/family/accept-invite-button";

export default async function RejoindreFamillePage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;

  if (!token) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Lien invalide</CardTitle>
          <CardDescription>Ce lien d&apos;invitation est incomplet.</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const invite = await getInviteByToken(token);

  if (!invite) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Invitation invalide ou expirée</CardTitle>
          <CardDescription>Demande à la personne qui t&apos;a invité de te renvoyer un nouveau lien.</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const session = await auth();
  const callback = `/rejoindre-famille?token=${token}`;

  if (!session?.user?.id) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Rejoindre {invite.household.name}</CardTitle>
          <CardDescription>
            Tu as été invité{invite.label ? ` en tant que "${invite.label}"` : ""} à rejoindre ce foyer sur
            LifePilot AI. Connecte-toi ou crée un compte pour continuer.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-2">
          <Link href={`/connexion?callbackUrl=${encodeURIComponent(callback)}`}>
            <Button className="w-full">Se connecter</Button>
          </Link>
          <Link href="/inscription">
            <Button variant="outline" className="w-full">Créer un compte</Button>
          </Link>
          <p className="mt-2 text-center text-xs text-muted-foreground">
            Après avoir créé ton compte et confirmé ton email, reviens sur ce même lien pour rejoindre le
            foyer.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Rejoindre {invite.household.name}</CardTitle>
        <CardDescription>
          Tu es connecté en tant que {session.user.email}. Confirme pour rejoindre ce foyer
          {invite.label ? ` en tant que "${invite.label}"` : ""}.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <AcceptInviteButton token={token} />
      </CardContent>
    </Card>
  );
}
