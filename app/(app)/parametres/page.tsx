import { prisma } from "@/lib/prisma";
import { requireHousehold } from "@/lib/household";
import { SettingsClient } from "@/components/settings/settings-client";

export default async function ParametresPage() {
  const { userId } = await requireHousehold();
  const [user, nutritionProfile] = await Promise.all([
    prisma.user.findUniqueOrThrow({ where: { id: userId } }),
    prisma.nutritionProfile.findUnique({ where: { userId } }),
  ]);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Paramètres</h1>
      <SettingsClient
        user={{
          firstName: user.firstName,
          lastName: user.lastName,
          email: user.email,
          language: user.language,
          currency: user.currency,
          country: user.country,
        }}
        nutritionProfile={nutritionProfile}
      />
    </div>
  );
}
