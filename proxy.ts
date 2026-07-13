import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { SUPERADMIN_EMAIL } from "@/lib/constants";

const APP_PREFIXES = [
  "/dashboard",
  "/budget",
  "/objectifs",
  "/tirelires",
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
  const isAdmin = req.auth?.user?.email?.toLowerCase() === SUPERADMIN_EMAIL.toLowerCase();
  const onboardingDone = req.auth?.user?.onboardingDone;
  const needsHealthProfile = req.auth?.user?.needsHealthProfile;

  const isOnboardingRoute = nextUrl.pathname.startsWith("/onboarding");
  const isHealthProfileRoute = nextUrl.pathname.startsWith("/completer-profil");
  const isAdminRoute = nextUrl.pathname.startsWith("/admin");
  const isAppRoute = APP_PREFIXES.some((p) => nextUrl.pathname.startsWith(p));

  if ((isAppRoute || isOnboardingRoute || isHealthProfileRoute || isAdminRoute) && !isLoggedIn) {
    const url = new URL("/connexion", nextUrl);
    url.searchParams.set("callbackUrl", nextUrl.pathname);
    return NextResponse.redirect(url);
  }

  if (isAppRoute && isLoggedIn && !onboardingDone) {
    return NextResponse.redirect(new URL("/onboarding", nextUrl));
  }

  if (isAppRoute && isLoggedIn && onboardingDone && needsHealthProfile) {
    return NextResponse.redirect(new URL("/completer-profil", nextUrl));
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
    "/completer-profil/:path*",
    "/admin/:path*",
  ],
};
