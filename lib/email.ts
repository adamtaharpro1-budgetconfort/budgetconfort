import { Resend } from "resend";

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;
const FROM = process.env.EMAIL_FROM ?? "LifePilot AI <onboarding@resend.dev>";

async function send(to: string, subject: string, html: string) {
  if (!resend) {
    console.warn(`[email] RESEND_API_KEY absent — email non envoyé (${subject} -> ${to})`);
    return;
  }
  await resend.emails.send({ from: FROM, to, subject, html });
}

export async function sendVerificationEmail(to: string, token: string) {
  const url = `${process.env.NEXTAUTH_URL}/verifier-email?token=${token}`;
  await send(
    to,
    "Confirme ton adresse email — LifePilot AI",
    `<p>Bienvenue sur LifePilot AI 👋</p><p>Confirme ton adresse email pour activer ton compte :</p><p><a href="${url}">${url}</a></p><p>Ce lien expire dans 24h.</p>`
  );
}

export async function sendPasswordResetEmail(to: string, token: string) {
  const url = `${process.env.NEXTAUTH_URL}/reinitialiser-mot-de-passe?token=${token}`;
  await send(
    to,
    "Réinitialise ton mot de passe — LifePilot AI",
    `<p>Tu as demandé à réinitialiser ton mot de passe.</p><p><a href="${url}">${url}</a></p><p>Si tu n'es pas à l'origine de cette demande, ignore cet email. Ce lien expire dans 1h.</p>`
  );
}
