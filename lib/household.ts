import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";

export async function requireHousehold() {
  const session = await auth();
  if (!session?.user?.id) redirect("/connexion");

  const membership = await prisma.householdMember.findFirst({
    where: { userId: session.user.id },
    include: { household: true },
  });

  if (!membership) redirect("/onboarding");

  return { userId: session.user.id, household: membership.household, membership };
}
