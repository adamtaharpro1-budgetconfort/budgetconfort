import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export default async function CoachIndexPage() {
  const session = await auth();
  const userId = session!.user!.id;

  const latest = await prisma.chatConversation.findFirst({
    where: { userId },
    orderBy: { updatedAt: "desc" },
    select: { id: true },
  });

  if (latest) redirect(`/coach/${latest.id}`);

  const created = await prisma.chatConversation.create({
    data: { userId, title: "Nouvelle conversation" },
    select: { id: true },
  });
  redirect(`/coach/${created.id}`);
}
