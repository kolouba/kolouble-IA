import Link from "next/link";
import { ArrowLeft, Check, Database, LockKeyhole, Smartphone, Sparkles, Terminal } from "lucide-react";
import { Brand } from "@/components/brand";

export function AuthShell({
  title,
  subtitle,
  footer,
  children,
}: {
  title: string;
  subtitle: string;
  footer: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <main className="relative min-h-screen overflow-hidden">
      <div className="pointer-events-none absolute inset-0 grid-fade opacity-70" aria-hidden="true" />
      <div className="relative z-10 mx-auto grid min-h-screen w-full max-w-6xl lg:grid-cols-[1fr_460px]">
        <aside className="relative hidden flex-col justify-between overflow-hidden p-10 lg:flex">
          <div className="flex items-center justify-between">
            <Brand />
            <Link href="/" className="btn-ghost text-[12px]">
              <ArrowLeft className="h-3.5 w-3.5" /> Accueil
            </Link>
          </div>

          <div className="max-w-md py-16">
            <div className="chip border-mint-400/20 bg-mint-400/[0.06] text-mint-300">
              <Sparkles className="h-3.5 w-3.5" /> Studio de génération local
            </div>
            <h2 className="mt-6 font-display text-[40px] font-semibold leading-[1.08] tracking-[-0.03em]">
              De l'idée au code,
              <br />
              <span className="text-gradient-mint">sans intermédiaire.</span>
            </h2>
            <p className="mt-5 text-sm leading-7 text-white/45">
              Vos prompts restent sur votre machine. Kôloublé IA assemble une application Flutter
              complète, connectée à votre propre Supabase.
            </p>

            <ul className="mt-8 space-y-4">
              {[
                { icon: Smartphone, text: "Web, Android, iOS et Windows depuis une seule base Flutter." },
                { icon: Database, text: "Schéma Supabase, politiques RLS et mode hors ligne Hive." },
                { icon: Terminal, text: "ZIP, Docker, Caddy, Vercel et GitHub Actions inclus." },
                { icon: LockKeyhole, text: "Aucune clé secrète stockée dans les projets générés." },
              ].map((item) => {
                const Icon = item.icon;
                return (
                  <li key={item.text} className="flex items-start gap-3">
                    <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-mint-400/15 bg-mint-400/[0.06]">
                      <Icon className="h-3.5 w-3.5 text-mint-400" />
                    </span>
                    <span className="text-[12.5px] leading-6 text-white/50">{item.text}</span>
                  </li>
                );
              })}
            </ul>
          </div>

          <div className="card-tight flex items-center gap-3 p-4">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-mint-400/10">
              <Check className="h-4 w-4 text-mint-400" />
            </span>
            <div>
              <p className="text-[12px] font-medium text-white/75">Génération déterministe disponible</p>
              <p className="text-[11px] text-white/35">Même sans Ollama, le projet complet est produit.</p>
            </div>
          </div>
        </aside>

        <div className="flex flex-col justify-center px-5 py-10 sm:px-10 lg:border-l lg:border-white/[0.06] lg:bg-ink-900/30">
          <div className="mb-10 flex items-center justify-between lg:hidden">
            <Brand />
            <Link href="/" className="btn-ghost text-[12px]">
              <ArrowLeft className="h-3.5 w-3.5" /> Accueil
            </Link>
          </div>
          <div className="mx-auto w-full max-w-sm">
            <h1 className="font-display text-2xl font-semibold tracking-tight">{title}</h1>
            <p className="mt-2 text-[13px] leading-6 text-white/45">{subtitle}</p>
            <div className="mt-8">{children}</div>
            <div className="mt-7 text-center text-[12.5px] text-white/40">{footer}</div>
          </div>
        </div>
      </div>
    </main>
  );
}
