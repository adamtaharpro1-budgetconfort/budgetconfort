import { getInviteByToken } from "@/lib/actions/invite";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { JoinFamilyForm } from "@/components/family/join-family-form";

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

  return (
    <JoinFamilyForm
      token={token}
      householdName={invite.household.name}
      label={invite.label}
    />
  );
}
