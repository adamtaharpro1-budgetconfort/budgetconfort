import { auth } from "@/lib/auth";
import { listUsers } from "@/lib/actions/admin";
import { AdminClient } from "@/components/admin/admin-client";

export default async function AdminPage() {
  const session = await auth();
  const users = await listUsers();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Administration</h1>
        <p className="text-sm text-muted-foreground">Gestion des utilisateurs, abonnements et accès.</p>
      </div>
      <AdminClient
        users={users.map((u) => ({
          id: u.id,
          email: u.email,
          name: [u.firstName, u.lastName].filter(Boolean).join(" ") || "—",
          role: u.role,
          plan: u.plan,
          planExpiresAt: u.planExpiresAt ? u.planExpiresAt.toISOString() : null,
          emailVerified: !!u.emailVerified,
          onboardingDone: u.onboardingDone,
          createdAt: u.createdAt.toISOString(),
        }))}
        isSuperAdmin
        currentUserId={session?.user?.id ?? ""}
      />
    </div>
  );
}
