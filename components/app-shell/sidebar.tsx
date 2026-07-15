"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Wallet,
  Target,
  PiggyBank,
  ChefHat,
  Apple,
  ShoppingCart,
  MessageCircle,
  Users,
  Settings,
  ShieldCheck,
  History,
  Menu,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/dashboard", label: "Tableau de bord", icon: LayoutDashboard },
  { href: "/budget", label: "Budget", icon: Wallet },
  { href: "/historique", label: "Historique", icon: History },
  { href: "/objectifs", label: "Objectifs", icon: Target },
  { href: "/tirelires", label: "Tirelires", icon: PiggyBank },
  { href: "/repas", label: "Repas", icon: ChefHat },
  { href: "/nutrition", label: "Nutrition", icon: Apple },
  { href: "/courses", label: "Courses", icon: ShoppingCart },
  { href: "/coach", label: "Coach IA", icon: MessageCircle },
  { href: "/famille", label: "Famille", icon: Users },
  { href: "/parametres", label: "Paramètres", icon: Settings },
];

// Onglets visibles directement dans la barre mobile (les autres passent par "Plus")
const MOBILE_PRIMARY_HREFS = ["/dashboard", "/budget", "/repas", "/courses"];

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

export function MobileNav({ isAdmin }: { isAdmin?: boolean } = {}) {
  const pathname = usePathname();
  const [moreOpen, setMoreOpen] = useState(false);
  const allItems = isAdmin ? [...NAV, { href: "/admin", label: "Administration", icon: ShieldCheck }] : NAV;

  const primaryItems = MOBILE_PRIMARY_HREFS.map((href) => allItems.find((i) => i.href === href)!).filter(Boolean);
  const moreItems = allItems.filter((i) => !MOBILE_PRIMARY_HREFS.includes(i.href));
  const moreActive = moreItems.some((i) => pathname?.startsWith(i.href));

  return (
    <>
      <nav className="fixed bottom-0 left-0 right-0 z-40 flex border-t border-border bg-card md:hidden">
        {primaryItems.map((item) => {
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
        <button
          onClick={() => setMoreOpen(true)}
          className={cn(
            "flex flex-1 flex-col items-center gap-0.5 py-2 text-[10px]",
            moreActive ? "text-primary" : "text-muted-foreground"
          )}
        >
          <Menu className="h-5 w-5" />
          Plus
        </button>
      </nav>

      {moreOpen && (
        <div className="fixed inset-0 z-50 flex items-end md:hidden">
          <div className="absolute inset-0 bg-black/50" onClick={() => setMoreOpen(false)} />
          <div className="relative w-full rounded-t-2xl border-t border-border bg-card p-4 pb-8">
            <div className="mb-3 flex items-center justify-between">
              <p className="text-sm font-semibold">Tout le menu</p>
              <button onClick={() => setMoreOpen(false)} className="text-muted-foreground">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="grid grid-cols-4 gap-3">
              {moreItems.map((item) => {
                const active = pathname?.startsWith(item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMoreOpen(false)}
                    className={cn(
                      "flex flex-col items-center gap-1.5 rounded-lg p-3 text-center text-[11px]",
                      active ? "bg-accent text-accent-foreground" : "text-muted-foreground hover:bg-muted"
                    )}
                  >
                    <item.icon className="h-5 w-5" />
                    {item.label}
                  </Link>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
