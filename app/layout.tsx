import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Providers } from "./providers";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "LifePilot AI — Ton assistant de vie intelligent",
    template: "%s — LifePilot AI",
  },
  description:
    "Budget, courses, repas, nutrition et objectifs : LifePilot AI centralise toute l'organisation de ton quotidien, assistée par l'intelligence artificielle.",
  metadataBase: new URL("https://lifepilot.ai"),
  openGraph: {
    title: "LifePilot AI — Ton assistant de vie intelligent",
    description:
      "Budget, courses, repas, nutrition et objectifs : tout ton quotidien, centralisé et assisté par l'IA.",
    type: "website",
    locale: "fr_FR",
  },
  twitter: {
    card: "summary_large_image",
    title: "LifePilot AI",
    description: "Ton assistant de vie intelligent.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="fr"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="min-h-full flex flex-col bg-background text-foreground">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
