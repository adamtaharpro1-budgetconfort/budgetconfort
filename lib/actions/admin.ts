"use server";

import { cookies } from "next/headers";
import { encode, decode } from "next-auth/jwt";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import type { ActionResult } from "@/lib/actions/auth";
import type { PlanType } from "@prisma/client";

const SESSION_COOKIE = process.env.NODE_ENV === "production" ? "__Secure-authjs.session-token" : "authjs.session-token";
const SECRET = process.env.AUTH_SECRET!;

async function requireAdmin() {
  const session = await auth();
  const role = session?.user?.role;
  if (!session?.user?.id || (role !== "ADMIN" && role !== "SUPERADMIN")) {
    throw new Error("FORBIDDEN");
  }
  return { adminId: session.user.id, role };
}

export async function listUsers(query?: string) {
  await requireAdmin();
  return prisma.user.findMany({
    where: query
      ? {
          OR: [
            { email: { contains: query, mode: "insensitive" } },
            { firstName: { contains: query, mode: "insensitive" } },
            { lastName: { contains: query, mode: "insensitive" } },
          ],
        }
      : undefined,
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      role: true,
      plan: true,
      planExpiresAt: true,
      emailVerified: true,
      onboardingDone: true,
      createdAt: true,
    },
    orderBy: { createdAt: "desc" },
    take: 100,
  });
}

export async function updateUserPlan(userId: string, plan: PlanType, addMonths?: number): Promise<ActionResult> {
  await requireAdmin();

  if (plan === "UNLIMITED") {
    await prisma.user.update({ where: { id: userId }, data: { plan, planExpiresAt: null } });
  } else if (addMonths) {
    const user = await prisma.user.findUnique({ where: { id: userId }, select: { planExpiresAt: true } });
    const base = user?.planExpiresAt && user.planExpiresAt > new Date() ? user.planExpiresAt : new Date();
    const newExpiry = new Date(base);
    newExpiry.setMonth(newExpiry.getMonth() + addMonths);
    await prisma.user.update({ where: { id: userId }, data: { plan, planExpiresAt: newExpiry } });
  } else {
    await prisma.user.update({ where: { id: userId }, data: { plan } });
  }

  revalidatePath("/admin");
  return { ok: true };
}

export async function updateUserRole(userId: string, role: "USER" | "ADMIN" | "SUPERADMIN"): Promise<ActionResult> {
  const { role: callerRole } = await requireAdmin();
  if (callerRole !== "SUPERADMIN") return { ok: false, error: "Réservé au super administrateur" };

  await prisma.user.update({ where: { id: userId }, data: { role } });
  revalidatePath("/admin");
  return { ok: true };
}

export async function deleteUserAccount(userId: string): Promise<ActionResult> {
  const { adminId, role } = await requireAdmin();
  if (role !== "SUPERADMIN") return { ok: false, error: "Réservé au super administrateur" };
  if (userId === adminId) return { ok: false, error: "Impossible de supprimer ton propre compte" };

  await prisma.user.delete({ where: { id: userId } });
  revalidatePath("/admin");
  return { ok: true };
}

export async function impersonateUser(targetUserId: string): Promise<ActionResult> {
  const session = await auth();
  const role = session?.user?.role;
  if (!session?.user?.id || (role !== "ADMIN" && role !== "SUPERADMIN")) {
    return { ok: false, error: "Accès refusé" };
  }

  const target = await prisma.user.findUnique({ where: { id: targetUserId } });
  if (!target) return { ok: false, error: "Utilisateur introuvable" };
  if (target.role === "ADMIN" || target.role === "SUPERADMIN") {
    return { ok: false, error: "Impossible de se connecter en tant qu'administrateur" };
  }

  const cookieStore = await cookies();
  const currentRaw = cookieStore.get(SESSION_COOKIE)?.value;
  if (!currentRaw) return { ok: false, error: "Session invalide" };

  const currentPayload = await decode({ token: currentRaw, secret: SECRET, salt: SESSION_COOKIE });
  if (!currentPayload) return { ok: false, error: "Session invalide" };

  const newToken = await encode({
    secret: SECRET,
    salt: SESSION_COOKIE,
    token: {
      ...currentPayload,
      userId: target.id,
      onboardingDone: target.onboardingDone,
      role: target.role,
      impersonatorId: currentPayload.impersonatorId ?? session.user.id,
      name: [target.firstName, target.lastName].filter(Boolean).join(" ") || null,
      email: target.email,
      picture: target.image,
    },
  });

  cookieStore.set(SESSION_COOKIE, newToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
  });

  return { ok: true };
}

export async function stopImpersonation(): Promise<ActionResult> {
  const cookieStore = await cookies();
  const currentRaw = cookieStore.get(SESSION_COOKIE)?.value;
  if (!currentRaw) return { ok: false, error: "Session invalide" };

  const currentPayload = await decode({ token: currentRaw, secret: SECRET, salt: SESSION_COOKIE });
  if (!currentPayload?.impersonatorId) return { ok: false, error: "Tu n'es pas en mode usurpation" };

  const admin = await prisma.user.findUnique({ where: { id: currentPayload.impersonatorId as string } });
  if (!admin) return { ok: false, error: "Administrateur introuvable" };

  const newToken = await encode({
    secret: SECRET,
    salt: SESSION_COOKIE,
    token: {
      ...currentPayload,
      userId: admin.id,
      onboardingDone: admin.onboardingDone,
      role: admin.role,
      impersonatorId: undefined,
      name: [admin.firstName, admin.lastName].filter(Boolean).join(" ") || null,
      email: admin.email,
      picture: admin.image,
    },
  });

  cookieStore.set(SESSION_COOKIE, newToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
  });

  return { ok: true };
}
