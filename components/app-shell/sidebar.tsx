"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Wallet,
  Target,
  ChefHat,
  Apple,
  Package,
  ShoppingCart,
  ScanLine,
  MessageCircle,
  Users,
  Settings,
  ShieldCheck,
} from "lucide-react";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/dashboard", label: "Tableau de bord", icon: LayoutDashboard },
  { href: "/budget", label: "Budget", icon: Wallet },
  { href: "/objectifs", label: "Objectifs", icon: Target },
  { href: "/repas", label: "Repas", icon: ChefHat },
  { href: "/nutrition", label: "Nutrition", icon: Apple },
  { href: "/stock", label: "Stock", icon: Package },
  { href: "/courses", label: "Courses", icon: ShoppingCart },
  { href: "/scanner", label: "Scanner", icon: ScanLine },
  { href: "/coach", label: "Coach IA", icon: MessageCircle },
  { href: "/famille", label: "Famille", icon: Users },
  { href: "/parametres", label: "Paramètres", icon: Settings },
];

export function Sidebar({ isAdmin }: { isAdmin?: boolean } = {}) {
  const pathname = usePathname();
  const items = isAdmin ? [...NAV, { href: "/admin", label: "Administration", icon: ShieldCheck }] : NAV;

  return (
    <aside className="hidden w-64 shrink-0 border-r border-border bg-card md:flex md:flex-col">
      <div className="flex h-16 items-center px-6">
        <Link href="/dashboard" className="text-lg font-bold text-primary">
          LifePilot AI
        </Link>
      </div>
      <nav className="flex-1 space-y-1 px-3 py-2">
        {items.map((item) => {
          const active = pathname?.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                active ? "bg-accent text-accent-foreground" : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}

export function MobileNav() {
  const pathname = usePathname();
  const items = NAV.slice(0, 5);
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 flex border-t border-border bg-card md:hidden">
      {items.map((item) => {
        const active = pathname?.startsWith(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex flex-1 flex-col items-center gap-0.5 py-2 text-[10px]",
              active ? "text-primary" : "text-muted-foreground"
            )}
          >
            <item.icon className="h-5 w-5" />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
