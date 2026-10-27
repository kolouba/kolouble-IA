import Link from "next/link";
import { Brand } from "@/components/brand";
import { OnBradeCredit } from "@/components/onbrade-credit";

export function SiteFooter() {
  return (
    <footer className="relative border-t border-white/[0.06] pb-10 pt-10">
      <div className="container-page grid gap-8 sm:grid-cols-[1.2fr_1fr_1fr]">
        <div>
          <Brand />
          <p className="mt-3 max-w-xs text-[11.5px] leading-5 text-white/30">
            Nous transformons vos idées en solutions digitales intelligentes pour booster votre
            croissance et votre productivité.
          </p>
        </div>
        <div>
          <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-white/25">Produit</div>
          <div className="mt-3 space-y-2 text-[12px] text-white/40">
            <Link href="/templates" className="block transition hover:text-white">Modèles métier</Link>
            <Link href="/services" className="block transition hover:text-white">Services complémentaires</Link>
            <Link href="/tarifs" className="block transition hover:text-white">Tarifs</Link>
            <Link href="/docs" className="block transition hover:text-white">Documentation</Link>
          </div>
        </div>
        <div>
          <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-white/25">Studio</div>
          <div className="mt-3 space-y-2 text-[12px] text-white/40">
            <Link href="/dashboard" className="block transition hover:text-white">Mes applications</Link>
            <Link href="/settings" className="block transition hover:text-white">Paramètres</Link>
            <Link href="/login" className="block transition hover:text-white">Connexion</Link>
            <Link href="/register" className="block transition hover:text-white">Créer un compte</Link>
          </div>
        </div>
      </div>
      <div className="container-page mt-10 border-t border-white/[0.05] pt-6">
        <div className="flex flex-col items-start justify-between gap-2 text-[10.5px] text-white/20 sm:flex-row sm:items-center">
          <span>© {new Date().getFullYear()} Kôloublé IA. Le code est à vous.</span>
          <span>Flutter · Supabase · Hive · Ollama · Vercel · Docker</span>
        </div>
        <div className="mt-3 text-[10.5px] text-white/35">
          <OnBradeCredit />
        </div>
      </div>
    </footer>
  );
}
