"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  BadgeCheck,
  Boxes,
  Church,
  Flower2,
  HeartHandshake,
  HeartPulse,
  Landmark,
  Map,
  Receipt,
  School,
  Search,
  ShoppingCart,
  Sparkles,
  Users,
  type LucideIcon,
} from "lucide-react";
import { MARKETPLACE_TEMPLATES, TEMPLATE_CATEGORIES, type TemplateCategory, type TemplateIcon } from "@/lib/templates";
import { cn } from "@/lib/cn";

const ICONS: Record<TemplateIcon, LucideIcon> = {
  users: Users,
  boxes: Boxes,
  receipt: Receipt,
  badge: BadgeCheck,
  cart: ShoppingCart,
  school: School,
  health: HeartPulse,
  landmark: Landmark,
  heart: HeartHandshake,
  church: Church,
  map: Map,
  flower: Flower2,
};

export function TemplatesClient() {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<TemplateCategory | "Tous">("Tous");

  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase();
    return MARKETPLACE_TEMPLATES.filter((template) => {
      if (category !== "Tous" && template.category !== category) return false;
      if (!term) return true;
      return [template.name, template.tagline, template.description, ...template.entities, ...template.highlights]
        .join(" ")
        .toLowerCase()
        .includes(term);
    });
  }, [query, category]);

  return (
    <div className="container-page pb-20">
      <div className="flex flex-col justify-between gap-6 pt-8 md:flex-row md:items-end">
        <div className="max-w-2xl">
          <div className="section-label">Marketplace</div>
          <h1 className="mt-3 font-display text-4xl font-semibold tracking-tight sm:text-5xl">
            Un métier, un modèle, une application.
          </h1>
          <p className="mt-4 text-sm leading-7 text-white/50">
            Douze modèles verticaux prêts à générer : CRM, ERP, facturation, RH, e-commerce, école,
            santé, mairie, association, église, collectivité et funéraire. Chaque modèle embarque ses
            entités, ses écrans, son thème et son schéma Supabase.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <span className="chip border-mint-400/20 py-1 text-[10px] text-mint-300">
            <Sparkles className="h-3 w-3" /> 12 modèles
          </span>
          <span className="chip py-1 text-[10px]">Offline-first</span>
          <span className="chip py-1 text-[10px]">SaaS ready</span>
        </div>
      </div>

      <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-white/25" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Rechercher un métier, une entité, une fonction…"
            aria-label="Rechercher un modèle"
            className="input pl-10"
          />
        </div>
        <div className="scrollbar-none flex gap-1 overflow-x-auto pb-1">
          {(["Tous", ...TEMPLATE_CATEGORIES] as const).map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => setCategory(item)}
              className={cn(
                "shrink-0 rounded-full border px-3 py-1.5 text-[11px] transition",
                category === item
                  ? "border-mint-400/40 bg-mint-400/10 text-mint-200"
                  : "border-white/[0.08] bg-white/[0.02] text-white/40 hover:text-white/70",
              )}
            >
              {item}
            </button>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="mt-10 rounded-3xl border border-dashed border-white/10 px-6 py-16 text-center">
          <p className="text-sm text-white/40">Aucun modèle ne correspond à cette recherche.</p>
          <button type="button" onClick={() => { setQuery(""); setCategory("Tous"); }} className="btn-secondary mt-4">
            Réinitialiser les filtres
          </button>
        </div>
      ) : (
        <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filtered.map((template) => {
            const Icon = ICONS[template.icon];
            return (
              <article key={template.key} className="card group flex flex-col p-5 transition duration-300 hover:-translate-y-1 hover:border-mint-400/20">
                <div className="flex items-start justify-between gap-3">
                  <span
                    className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/[0.08]"
                    style={{ color: template.accent, backgroundColor: `${template.accent}16` }}
                  >
                    <Icon className="h-5 w-5" />
                  </span>
                  <div className="flex flex-col items-end gap-1">
                    {template.badge && (
                      <span className="rounded-full bg-mint-400/12 px-2 py-0.5 text-[8.5px] font-semibold uppercase tracking-wide text-mint-300">
                        {template.badge}
                      </span>
                    )}
                    <span className="text-[9px] uppercase tracking-[0.14em] text-white/25">{template.category}</span>
                  </div>
                </div>

                <h2 className="mt-4 font-display text-xl font-semibold tracking-tight text-white/90">{template.name}</h2>
                <p className="mt-1 text-[12px] text-white/45">{template.tagline}</p>
                <p className="mt-3 text-[11.5px] leading-5 text-white/35">{template.description}</p>

                <div className="mt-3 flex flex-wrap gap-1.5">
                  {template.entities.map((entity) => (
                    <span key={entity} className="chip py-0.5 text-[9.5px]">{entity}</span>
                  ))}
                </div>

                <ul className="mt-3 space-y-1">
                  {template.highlights.map((highlight) => (
                    <li key={highlight} className="flex items-center gap-1.5 text-[10.5px] text-white/35">
                      <span className="h-1 w-1 rounded-full bg-mint-400/60" /> {highlight}
                    </li>
                  ))}
                </ul>

                <div className="mt-auto flex items-center justify-between border-t border-white/[0.06] pt-4 mt-4">
                  <span className="text-[9.5px] text-white/20">{template.saasReady ? "Multi-tenant prêt" : "Application simple"}</span>
                  <Link
                    href={`/dashboard?new=1&template=${template.key}`}
                    className="inline-flex items-center gap-1 text-[11.5px] font-medium text-mint-300/80 transition hover:text-mint-200"
                  >
                    Utiliser ce modèle <ArrowRight className="h-3 w-3" />
                  </Link>
                </div>
              </article>
            );
          })}
        </div>
      )}

      <div className="mt-12 flex flex-col items-start justify-between gap-4 rounded-3xl border border-mint-400/15 bg-mint-400/[0.04] px-6 py-6 sm:flex-row sm:items-center">
        <div>
          <h2 className="font-display text-lg font-semibold">Votre métier n'est pas dans la liste ?</h2>
          <p className="mt-1 text-[12px] text-white/40">
            Décrivez-le librement : l'architecte détecte vos entités et compose un modèle sur mesure.
          </p>
        </div>
        <Link href="/dashboard?new=1" className="btn-primary shrink-0">
          Créer sur mesure <Sparkles className="h-4 w-4" />
        </Link>
      </div>
    </div>
  );
}
