"use server";

import { Resend } from "resend";
import { z } from "zod";
import type { ActionResult } from "@/lib/actions/auth";

const schema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  message: z.string().min(5),
});

export async function sendContactMessage(input: z.infer<typeof schema>): Promise<ActionResult> {
  const parsed = schema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Formulaire invalide" };

  if (!process.env.RESEND_API_KEY) {
    console.warn("[contact] RESEND_API_KEY absent — message non envoyé", parsed.data);
    return { ok: true };
  }

  const resend = new Resend(process.env.RESEND_API_KEY);
  await resend.emails.send({
    from: process.env.EMAIL_FROM ?? "LifePilot AI <onboarding@resend.dev>",
    to: process.env.CONTACT_EMAIL ?? "adamtaharpro1@gmail.com",
    replyTo: parsed.data.email,
    subject: `Nouveau message de contact — ${parsed.data.name}`,
    html: `<p>${parsed.data.message}</p><p>De : ${parsed.data.name} (${parsed.data.email})</p>`,
  });

  return { ok: true };
}
