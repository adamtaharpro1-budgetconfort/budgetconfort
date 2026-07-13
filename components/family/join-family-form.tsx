"use client";

import { useEffect, useState } from "react";
import { useSession, signIn } from "next-auth/react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { acceptInvite, signUpViaInvite } from "@/lib/actions/invite";
import { toast } from "sonner";

export function JoinFamilyForm({
  token,
  householdName,
  label,
}: {
  token: string;
  householdName: string;
  label: string | null;
}) {
  const { status } = useSession();
  const [mode, setMode] = useState<"signup" | "login">("signup");
  const [loading, setLoading] = useState(false);
  const [joining, setJoining] = useState(false);

  useEffect(() => {
    if (status === "authenticated" && !joining) {
      setJoining(true);
      acceptInvite(token).then((result) => {
        if (result.ok) {
          window.location.href = "/dashboard";
        } else {
          toast.error(result.error);
          setJoining(false);
        }
      });
    }
  }, [status, token, joining]);

  if (status === "loading" || joining) {
    return (
      <Card>
        <CardContent className="p-8 text-center text-sm text-muted-foreground">
          {joining ? "On te connecte au foyer..." : "Chargement..."}
        </CardContent>
      </Card>
    );
  }

  async function handleSignup(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    const form = new FormData(e.currentTarget);
    const email = form.get("email") as string;
    const password = form.get("password") as string;
    const confirmPassword = form.get("confirmPassword") as string;

    const result = await signUpViaInvite(token, { email, password, confirmPassword });
    if (!result.ok) {
      setLoading(false);
      toast.error(result.error);
      return;
    }

    const signInResult = await signIn("credentials", { email, password, redirect: false });
    setLoading(false);
    if (signInResult?.error) {
      toast.success("Compte créé ! Connecte-toi.");
      setMode("login");
      return;
    }
    window.location.href = "/dashboard";
  }

  async function handleLogin(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    const form = new FormData(e.currentTarget);
    const email = form.get("email") as string;
    const password = form.get("password") as string;

    const result = await signIn("credentials", { email, password, redirect: false });
    setLoading(false);
    if (result?.error) {
      toast.error("Email ou mot de passe incorrect");
      return;
    }
    // La session se met à jour, le useEffect ci-dessus rejoint automatiquement le foyer.
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Rejoindre {householdName}</CardTitle>
        <CardDescription>
          {label ? `Tu as été invité(e) en tant que "${label}". ` : ""}
          {mode === "signup"
            ? "Crée ton compte pour rejoindre directement ce foyer."
            : "Connecte-toi avec ton compte pour rejoindre ce foyer."}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {mode === "signup" ? (
          <form onSubmit={handleSignup} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Adresse e-mail</Label>
              <Input id="email" name="email" type="email" required autoFocus />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Mot de passe</Label>
              <Input id="password" name="password" type="password" required minLength={8} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirmation</Label>
              <Input id="confirmPassword" name="confirmPassword" type="password" required minLength={8} />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "..." : "Créer mon compte et rejoindre"}
            </Button>
          </form>
        ) : (
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email-login">Adresse e-mail</Label>
              <Input id="email-login" name="email" type="email" required autoFocus />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password-login">Mot de passe</Label>
              <Input id="password-login" name="password" type="password" required />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "..." : "Se connecter et rejoindre"}
            </Button>
          </form>
        )}
        <button
          type="button"
          onClick={() => setMode(mode === "signup" ? "login" : "signup")}
          className="mt-4 w-full text-center text-sm text-primary underline-offset-4 hover:underline"
        >
          {mode === "signup" ? "J'ai déjà un compte" : "Créer un nouveau compte"}
        </button>
      </CardContent>
    </Card>
  );
}
