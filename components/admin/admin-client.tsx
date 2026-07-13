"use client";

import { useState, useTransition } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import { MoreVertical, UserCog, Trash2, Crown, Shield } from "lucide-react";
import {
  updateUserPlan,
  updateUserRole,
  deleteUserAccount,
  impersonateUser,
} from "@/lib/actions/admin";
import { toast } from "sonner";
import { formatDate } from "@/lib/utils";

interface AdminUser {
  id: string;
  email: string;
  name: string;
  role: string;
  plan: string;
  planExpiresAt: string | null;
  emailVerified: boolean;
  onboardingDone: boolean;
  createdAt: string;
}

const PLAN_VARIANT: Record<string, "default" | "outline" | "success" | "warning"> = {
  FREE: "outline",
  PREMIUM: "default",
  FAMILLE: "default",
  UNLIMITED: "success",
};

export function AdminClient({
  users,
  isSuperAdmin,
  currentUserId,
}: {
  users: AdminUser[];
  isSuperAdmin: boolean;
  currentUserId: string;
}) {
  const [search, setSearch] = useState("");
  const filtered = users.filter(
    (u) => u.email.toLowerCase().includes(search.toLowerCase()) || u.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-3">
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Utilisateurs</p><p className="text-xl font-semibold">{users.length}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Comptes payants</p><p className="text-xl font-semibold">{users.filter((u) => u.plan !== "FREE").length}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Emails vérifiés</p><p className="text-xl font-semibold">{users.filter((u) => u.emailVerified).length}</p></CardContent></Card>
      </div>

      <Input placeholder="Rechercher par email ou nom..." value={search} onChange={(e) => setSearch(e.target.value)} />

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs text-muted-foreground">
                  <th className="p-3">Utilisateur</th>
                  <th className="p-3">Rôle</th>
                  <th className="p-3">Plan</th>
                  <th className="p-3">Expire</th>
                  <th className="p-3">Inscrit le</th>
                  <th className="p-3"></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((u) => (
                  <UserRow key={u.id} user={u} isSuperAdmin={isSuperAdmin} isSelf={u.id === currentUserId} />
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function UserRow({ user, isSuperAdmin, isSelf }: { user: AdminUser; isSuperAdmin: boolean; isSelf: boolean }) {
  const [isPending, startTransition] = useTransition();
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  function handlePlan(plan: string, months?: number) {
    startTransition(async () => {
      const result = await updateUserPlan(user.id, plan as never, months);
      if (result.ok) toast.success(`Plan mis à jour pour ${user.email}`);
      else toast.error(result.error);
    });
  }

  function handleRole(role: "USER" | "ADMIN" | "SUPERADMIN") {
    startTransition(async () => {
      const result = await updateUserRole(user.id, role);
      if (result.ok) toast.success("Rôle mis à jour");
      else toast.error(result.error);
    });
  }

  function handleImpersonate() {
    startTransition(async () => {
      const result = await impersonateUser(user.id);
      if (result.ok) window.location.href = "/dashboard";
      else toast.error(result.error);
    });
  }

  function handleDelete() {
    startTransition(async () => {
      const result = await deleteUserAccount(user.id);
      if (!result.ok) toast.error(result.error);
    });
  }

  return (
    <tr className="border-b border-border last:border-0">
      <td className="p-3">
        <p className="font-medium">{user.name}</p>
        <p className="text-xs text-muted-foreground">{user.email}</p>
      </td>
      <td className="p-3">
        <Badge variant={user.role === "SUPERADMIN" ? "success" : user.role === "ADMIN" ? "default" : "outline"}>
          {user.role === "SUPERADMIN" && <Crown className="mr-1 h-3 w-3" />}
          {user.role === "ADMIN" && <Shield className="mr-1 h-3 w-3" />}
          {user.role}
        </Badge>
      </td>
      <td className="p-3"><Badge variant={PLAN_VARIANT[user.plan]}>{user.plan}</Badge></td>
      <td className="p-3 text-xs text-muted-foreground">
        {user.plan === "UNLIMITED" ? "Illimité" : user.planExpiresAt ? formatDate(user.planExpiresAt) : "—"}
      </td>
      <td className="p-3 text-xs text-muted-foreground">{formatDate(user.createdAt)}</td>
      <td className="p-3 text-right">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button disabled={isPending} className="text-muted-foreground hover:text-foreground">
              <MoreVertical className="h-4 w-4" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>Abonnement</DropdownMenuLabel>
            <DropdownMenuItem onClick={() => handlePlan("PREMIUM", 1)}>+ 1 mois Premium</DropdownMenuItem>
            <DropdownMenuItem onClick={() => handlePlan("PREMIUM", 3)}>+ 3 mois Premium</DropdownMenuItem>
            <DropdownMenuItem onClick={() => handlePlan("PREMIUM", 12)}>+ 12 mois Premium</DropdownMenuItem>
            <DropdownMenuItem onClick={() => handlePlan("UNLIMITED")}>Pass illimité</DropdownMenuItem>
            <DropdownMenuItem onClick={() => handlePlan("FREE")}>Repasser en Gratuit</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleImpersonate} disabled={user.role !== "USER"}>
              <UserCog className="mr-2 h-4 w-4" /> Se connecter en tant que
            </DropdownMenuItem>
            {isSuperAdmin && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuLabel>Rôle (super admin)</DropdownMenuLabel>
                {user.role !== "ADMIN" && <DropdownMenuItem onClick={() => handleRole("ADMIN")}>Promouvoir admin</DropdownMenuItem>}
                {user.role !== "USER" && !isSelf && <DropdownMenuItem onClick={() => handleRole("USER")}>Rétrograder utilisateur</DropdownMenuItem>}
                <DropdownMenuSeparator />
                {!isSelf && (
                  confirmingDelete ? (
                    <DropdownMenuItem onClick={handleDelete} className="text-destructive">
                      <Trash2 className="mr-2 h-4 w-4" /> Confirmer la suppression
                    </DropdownMenuItem>
                  ) : (
                    <DropdownMenuItem onClick={() => setConfirmingDelete(true)} className="text-destructive">
                      <Trash2 className="mr-2 h-4 w-4" /> Supprimer le compte
                    </DropdownMenuItem>
                  )
                )}
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </td>
    </tr>
  );
}
