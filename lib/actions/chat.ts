"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

async function requireUserId() {
  const session = await auth();
  if (!session?.user?.id) throw new Error("UNAUTHENTICATED");
  return session.user.id;
}

export async function listConversations() {
  const userId = await requireUserId();
  return prisma.chatConversation.findMany({
    where: { userId },
    orderBy: { updatedAt: "desc" },
    select: { id: true, title: true, updatedAt: true },
  });
}

export async function createConversation() {
  const userId = await requireUserId();
  const conversation = await prisma.chatConversation.create({
    data: { userId, title: "Nouvelle conversation" },
  });
  revalidatePath("/coach");
  redirect(`/coach/${conversation.id}`);
}

export async function getConversationMessages(conversationId: string) {
  const userId = await requireUserId();
  const conversation = await prisma.chatConversation.findFirst({
    where: { id: conversationId, userId },
  });
  if (!conversation) return null;

  const messages = await prisma.chatMessage.findMany({
    where: { conversationId },
    orderBy: { createdAt: "asc" },
  });
  return { conversation, messages };
}

export async function deleteConversation(conversationId: string) {
  const userId = await requireUserId();
  await prisma.chatConversation.deleteMany({ where: { id: conversationId, userId } });
  revalidatePath("/coach");
}
