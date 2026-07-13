import { prisma } from "@/lib/prisma";
import { requireHousehold } from "@/lib/household";
import { FamilyClient } from "@/components/family/family-client";

export default async function FamillePage() {
  const { household } = await requireHousehold();

  const members = await prisma.householdMember.findMany({
    where: { householdId: household.id },
    include: { user: { select: { firstName: true, email: true, image: true } } },
    orderBy: { joinedAt: "asc" },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Ma famille</h1>
        <p className="text-sm text-muted-foreground">
          Gère les profils de chaque membre du foyer. Utilisé pour adapter les portions des repas générés
          par l&apos;IA et suivre les objectifs de chacun.
        </p>
      </div>
      <FamilyClient
        members={members.map((m) => ({
          id: m.id,
          label: m.label ?? m.user?.firstName ?? "Membre",
          isChild: m.isChild,
          age: m.age,
          sex: m.sex,
          height: m.height,
          weight: m.weight,
          hasAccount: !!m.userId,
          accountEmail: m.user?.email ?? null,
          role: m.role,
        }))}
      />
    </div>
  );
}
