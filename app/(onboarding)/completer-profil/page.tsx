import { auth } from "@/lib/auth";
import { HealthProfileForm } from "@/components/family/health-profile-form";

export default async function CompleterProfilPage() {
  const session = await auth();

  return (
    <div className="mx-auto flex min-h-screen max-w-xl flex-col justify-center px-4 py-12">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold">Complète ton profil</h1>
        <p className="mt-1 text-muted-foreground">
          Quelques informations pour calculer ton IMC et tes besoins nutritionnels personnalisés.
        </p>
      </div>
      <HealthProfileForm defaultFirstName={session?.user?.name ?? ""} />
    </div>
  );
}
