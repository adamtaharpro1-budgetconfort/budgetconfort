import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function requireSessionHousehold() {
  const session = await auth();
  if (!session?.user?.id) throw new Error("UNAUTHENTICATED");

  const membership = await prisma.householdMember.findFirst({
    where: { userId: session.user.id },
  });
  if (!membership) throw new Error("NO_HOUSEHOLD");

  return { userId: session.user.id, householdId: membership.householdId };
}
