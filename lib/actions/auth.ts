"use server";

import { randomBytes } from "crypto";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { hashPassword, verifyPassword } from "@/lib/password";
import { sendVerificationEmail, sendPasswordResetEmail } from "@/lib/email";

const signUpSchema = z
  .object({
    email: z.string().email(),
    password: z.string().min(8, "8 caractères minimum"),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Les mots de passe ne correspondent pas",
    path: ["confirmPassword"],
  });

export type ActionResult = { ok: true } | { ok: false; error: string };

export async function signUp(input: {
  email: string;
  password: string;
  confirmPassword: string;
}): Promise<ActionResult> {
  const parsed = signUpSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Données invalides" };
  }
  const { email, password } = parsed.data;

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return { ok: false, error: "Un compte existe déjà avec cet email" };
  }

  const passwordHash = await hashPassword(password);
  await prisma.user.create({
    data: { email, passwordHash },
  });

  await issueVerificationToken(email);

  return { ok: true };
}

export async function issueVerificationToken(email: string) {
  const token = randomBytes(32).toString("hex");
  const expires = new Date(Date.now() + 1000 * 60 * 60 * 24);

  await prisma.verificationToken.deleteMany({
    where: { identifier: email, type: "email_verification" },
  });
  await prisma.verificationToken.create({
    data: { identifier: email, token, expires, type: "email_verification" },
  });

  await sendVerificationEmail(email, token);
}

export async function resendVerification(email: string): Promise<ActionResult> {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) return { ok: false, error: "Aucun compte avec cet email" };
  if (user.emailVerified) return { ok: false, error: "Email déjà vérifié" };
  await issueVerificationToken(email);
  return { ok: true };
}

export async function verifyEmail(token: string): Promise<ActionResult> {
  const record = await prisma.verificationToken.findFirst({
    where: { token, type: "email_verification" },
  });
  if (!record || record.expires < new Date()) {
    return { ok: false, error: "Lien invalide ou expiré" };
  }
  await prisma.user.update({
    where: { email: record.identifier },
    data: { emailVerified: new Date() },
  });
  await prisma.verificationToken.delete({ where: { token } });
  return { ok: true };
}

export async function requestPasswordReset(email: string): Promise<ActionResult> {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || !user.passwordHash) {
    // On ne révèle pas si le compte existe
    return { ok: true };
  }
  const token = randomBytes(32).toString("hex");
  const expires = new Date(Date.now() + 1000 * 60 * 60);

  await prisma.verificationToken.deleteMany({
    where: { identifier: email, type: "password_reset" },
  });
  await prisma.verificationToken.create({
    data: { identifier: email, token, expires, type: "password_reset" },
  });

  await sendPasswordResetEmail(email, token);
  return { ok: true };
}

export async function resetPassword(token: string, newPassword: string): Promise<ActionResult> {
  if (newPassword.length < 8) {
    return { ok: false, error: "8 caractères minimum" };
  }
  const record = await prisma.verificationToken.findFirst({
    where: { token, type: "password_reset" },
  });
  if (!record || record.expires < new Date()) {
    return { ok: false, error: "Lien invalide ou expiré" };
  }
  const passwordHash = await hashPassword(newPassword);
  await prisma.user.update({
    where: { email: record.identifier },
    data: { passwordHash },
  });
  await prisma.verificationToken.delete({ where: { token } });
  return { ok: true };
}

export async function changePassword(
  currentPassword: string,
  newPassword: string
): Promise<ActionResult> {
  if (newPassword.length < 8) return { ok: false, error: "8 caractères minimum" };
  const { auth } = await import("@/lib/auth");
  const session = await auth();
  if (!session?.user?.id) return { ok: false, error: "Non authentifié" };
  const userId = session.user.id;
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user?.passwordHash) return { ok: false, error: "Compte invalide" };
  const valid = await verifyPassword(currentPassword, user.passwordHash);
  if (!valid) return { ok: false, error: "Mot de passe actuel incorrect" };
  const passwordHash = await hashPassword(newPassword);
  await prisma.user.update({ where: { id: userId }, data: { passwordHash } });
  return { ok: true };
}
