"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { acceptInvite } from "@/lib/actions/invite";
import { toast } from "sonner";

export function AcceptInviteButton({ token }: { token: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleAccept() {
    setLoading(true);
    const result = await acceptInvite(token);
    setLoading(false);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    toast.success("Tu as rejoint le foyer !");
    window.location.href = "/dashboard";
  }

  return (
    <Button onClick={handleAccept} disabled={loading} className="w-full">
      {loading ? "..." : "Rejoindre le foyer"}
    </Button>
  );
}
