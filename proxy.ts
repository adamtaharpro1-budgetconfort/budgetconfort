import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";

const APP_PREFIXES = [
  "/dashboard",
  "/budget",
  "/objectifs",
  "/repas",
  "/nutrition",
  "/stock",
  "/courses",
  "/scanner",
  "/coach",
  "/vacances",
  "/calendrier",
  "/famille",
  "/parametres",
];

export default auth((req) => {
  const { nextUrl } = req;
  const isLoggedIn = !!req.auth;
  const role = req.auth?.user?.role;
  const isAdmin = role === "ADMIN" || role === "SUPERADMIN";
  const onboardingDone = req.auth?.user?.onboardingDone;

  const isOnboardingRoute = nextUrl.pathname.startsWith("/onboarding");
  const isAdminRoute = nextUrl.pathname.startsWith("/admin");
  const isAppRoute = APP_PREFIXES.some((p) => nextUrl.pathname.startsWith(p));

  if ((isAppRoute || isOnboardingRoute || isAdminRoute) && !isLoggedIn) {
    const url = new URL("/connexion", nextUrl);
    url.searchParams.set("callbackUrl", nextUrl.pathname);
    return NextResponse.redirect(url);
  }

  if (isAppRoute && isLoggedIn && !onboardingDone) {
    return NextResponse.redirect(new URL("/onboarding", nextUrl));
  }

  if (isAdminRoute && !isAdmin) {
    return NextResponse.redirect(new URL("/dashboard", nextUrl));
  }
});

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/budget/:path*",
    "/objectifs/:path*",
    "/repas/:path*",
    "/nutrition/:path*",
    "/stock/:path*",
    "/courses/:path*",
    "/scanner/:path*",
    "/coach/:path*",
    "/vacances/:path*",
    "/calendrier/:path*",
    "/famille/:path*",
    "/parametres/:path*",
    "/onboarding/:path*",
    "/admin/:path*",
  ],
};
