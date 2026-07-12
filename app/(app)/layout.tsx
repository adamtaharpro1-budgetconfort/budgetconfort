import { auth } from "@/lib/auth";
import { Sidebar, MobileNav } from "@/components/app-shell/sidebar";
import { Header } from "@/components/app-shell/header";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <div className="flex flex-1 flex-col">
        <Header name={session?.user?.name || "LifePilot"} image={session?.user?.image} />
        <main className="flex-1 overflow-y-auto bg-background p-4 pb-20 md:p-6 md:pb-6">{children}</main>
      </div>
      <MobileNav />
    </div>
  );
}
