"use client";

import { useTransition } from "react";
import { stopImpersonation } from "@/lib/actions/admin";
import { UserCog } from "lucide-react";

export function ImpersonationBanner({ userLabel }: { userLabel: string }) {
  const [isPending, startTransition] = useTransition();

  function handleStop() {
    startTransition(async () => {
      const result = await stopImpersonation();
      if (result.ok) window.location.href = "/admin";
    });
  }

  return (
    <div className="flex items-center justify-center gap-3 bg-warning/90 px-4 py-2 text-sm font-medium text-black">
      <UserCog className="h-4 w-4" />
      Connecté en tant que {userLabel} (mode administrateur)
      <button
        onClick={handleStop}
        disabled={isPending}
        className="rounded-md bg-black/10 px-2 py-0.5 text-xs font-semibold hover:bg-black/20"
      >
        {isPending ? "..." : "Quitter"}
      </button>
    </div>
  );
}
