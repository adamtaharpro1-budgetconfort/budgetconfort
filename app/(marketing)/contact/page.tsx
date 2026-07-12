"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { sendContactMessage } from "@/lib/actions/contact";
import { toast } from "sonner";

export default function ContactPage() {
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    const form = new FormData(e.currentTarget);
    const result = await sendContactMessage({
      name: form.get("name") as string,
      email: form.get("email") as string,
      message: form.get("message") as string,
    });
    setLoading(false);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    setSent(true);
  }

  return (
    <section className="mx-auto max-w-xl px-4 py-20">
      <h1 className="text-center text-4xl font-bold">Contact</h1>
      <p className="mx-auto mt-4 max-w-md text-center text-muted-foreground">
        Une question, une suggestion ? Écris-nous.
      </p>
      <Card className="mt-10">
        <CardHeader>
          <CardTitle>Envoie-nous un message</CardTitle>
          <CardDescription>Réponse sous 48h ouvrées.</CardDescription>
        </CardHeader>
        <CardContent>
          {sent ? (
            <p className="text-sm">Merci, ton message a bien été envoyé ! 🎉</p>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nom</Label>
                <Input id="name" name="name" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" name="email" type="email" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="message">Message</Label>
                <Textarea id="message" name="message" required rows={5} />
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "Envoi..." : "Envoyer"}
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </section>
  );
}
