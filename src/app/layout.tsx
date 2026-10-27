import type { Metadata, Viewport } from "next";
import "./globals.css";

const siteUrl = (process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000").replace(/\/+$/, "");

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "Kôloublé IA — Votre studio d'applications Flutter & Supabase",
    template: "%s · Kôloublé IA",
  },
  description:
    "Décrivez votre application. Kôloublé IA génère le code Flutter, le schéma Supabase, la synchronisation hors ligne, les tests et le déploiement Vercel.",
  applicationName: "Kôloublé IA",
  keywords: [
    "Flutter",
    "Flutter web",
    "Supabase",
    "PostgreSQL",
    "SaaS",
    "Ollama",
    "génération d'applications",
    "offline first",
    "mobile money",
    "Vercel",
    "Docker",
  ],
  authors: [{ name: "Kôloublé IA" }],
  openGraph: {
    title: "Kôloublé IA — De l'idée à l'application Flutter complète",
    description: "De l'idée à l'application Flutter complète, pilotée par votre IA locale.",
    url: siteUrl,
    siteName: "Kôloublé IA",
    type: "website",
    locale: "fr_FR",
  },
  twitter: {
    card: "summary_large_image",
    title: "Kôloublé IA",
    description: "De l'idée à l'application Flutter complète, pilotée par votre IA locale.",
  },
};

export const viewport: Viewport = {
  themeColor: "#07100D",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="fr">
      <body>{children}</body>
    </html>
  );
}
