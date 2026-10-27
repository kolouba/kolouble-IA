import Link from "next/link";
import {
  ArrowRight,
  BarChart3,
  Check,
  Database,
  Globe2,
  Mail,
  MessageCircle,
  Rocket,
  Search,
  ShieldCheck,
  Sparkles,
  Workflow,
  Zap,
} from "lucide-react";
import { auth } from "@/auth";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Services complémentaires",
  description:
    "Sites web responsives, automatisation intelligente et veille stratégique : Kôloublé IA accompagne votre croissance au-delà de la génération d'applications.",
};

const SERVICES = [
  {
    icon: Globe2,
    title: "Sites web responsives",
    tagline: "Une vitrine rapide, accessible et pensée pour convertir.",
    accent: "border-mint-400/20 bg-mint-400/[0.06] text-mint-300",
    points: [
      "Design sur mesure aligné sur votre identité",
      "Performance, SEO technique et accessibilité",
      "Formulaires, catalogue, blog et espaces membres",
      "Hébergement Vercel, Netlify ou votre propre domaine",
    ],
    deliverable: "Livrable : site déployé, code source et guide de prise en main.",
  },
  {
    icon: Workflow,
    title: "Automatisation intelligente",
    tagline: "Vos tâches répétitives exécutées sans intervention.",
    accent: "border-sky-400/20 bg-sky-400/[0.06] text-sky-300",
    points: [
      "Bots e-mail et WhatsApp pour le support et les relances",
      "Automatisation administrative et commerciale",
      "Intégrations avec vos outils existants (CRM, ERP, paiement)",
      "Rapports automatiques et alertes en temps réel",
    ],
    deliverable: "Livrable : scénarios documentés, tableau de supervision et journal d'exécution.",
  },
  {
    icon: BarChart3,
    title: "Business intelligence",
    tagline: "Des décisions appuyées sur des données vérifiables.",
    accent: "border-gold/25 bg-gold/[0.07] text-gold",
    points: [
      "Détection d'opportunités et de tendances de marché",
      "Identification de partenaires et veille concurrentielle",
      "Tableaux de bord et indicateurs métier consolidés",
      "Recommandations périodiques priorisées",
    ],
    deliverable: "Livrable : tableau de bord, synthèse mensuelle et plan d'action.",
  },
];

const PROCESS = [
  {
    title: "Cadrage",
    text: "Nous clarifions vos objectifs, vos utilisateurs et les indicateurs qui comptent vraiment.",
  },
  {
    title: "Conception",
    text: "Parcours, maquettes et architecture technique validés avant la première ligne de code.",
  },
  {
    title: "Réalisation",
    text: "Développement itératif, démonstrations régulières et tests sur vos cas réels.",
  },
  {
    title: "Suivi",
    text: "Mise en production, formation de vos équipes et amélioration continue.",
  },
];

export default async function ServicesPage() {
  const session = await auth();
  const signedIn = Boolean(session?.user?.id);

  return (
    <main className="relative overflow-hidden">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[520px] grid-fade" aria-hidden="true" />
      <SiteHeader signedIn={signedIn} />

      <section className="relative z-10 pb-16 pt-8 sm:pt-14">
        <div className="container-page max-w-4xl">
          <div className="chip border-mint-400/20 bg-mint-400/[0.07] text-mint-300">
            <Sparkles className="h-3.5 w-3.5" />
            Services complémentaires
          </div>
          <h1 className="mt-6 font-display text-4xl font-semibold leading-[1.08] tracking-[-0.03em] sm:text-5xl">
            Nous transformons vos idées en{" "}
            <span className="text-gradient">solutions digitales intelligentes</span>.
          </h1>
          <p className="mt-5 max-w-2xl text-[15px] leading-7 text-white/55">
            Pour booster votre croissance et votre productivité, Kôloublé IA complète la génération
            d&apos;applications par trois expertises : la présence web, l&apos;automatisation des opérations
            et la lecture stratégique de vos données.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link href={signedIn ? "/dashboard" : "/register"} className="btn-primary px-6 py-3 text-[15px]">
              Démarrer un projet <ArrowRight className="h-4 w-4" />
            </Link>
            <Link href="/tarifs" className="btn-secondary px-6 py-3 text-[15px]">
              Voir les tarifs
            </Link>
          </div>
        </div>
      </section>

      <section className="relative pb-16">
        <div className="container-page grid gap-5 lg:grid-cols-3">
          {SERVICES.map((service) => {
            const Icon = service.icon;
            return (
              <article key={service.title} className="card flex flex-col p-6">
                <div className={`flex h-11 w-11 items-center justify-center rounded-2xl border ${service.accent}`}>
                  <Icon className="h-5 w-5" />
                </div>
                <h2 className="mt-5 font-display text-xl font-semibold">{service.title}</h2>
                <p className="mt-2 text-[12.5px] leading-6 text-white/45">{service.tagline}</p>
                <ul className="mt-5 space-y-2.5">
                  {service.points.map((point) => (
                    <li key={point} className="flex gap-2 text-[12.5px] leading-5 text-white/55">
                      <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-mint-400" />
                      {point}
                    </li>
                  ))}
                </ul>
                <p className="mt-auto pt-6 text-[11px] leading-5 text-white/30">{service.deliverable}</p>
              </article>
            );
          })}
        </div>
      </section>

      <section className="relative pb-16">
        <div className="container-page">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { icon: Mail, label: "Bots e-mail", text: "Relances et réponses suivies." },
              { icon: MessageCircle, label: "Bots WhatsApp", text: "Support et notifications." },
              { icon: Database, label: "Intégrations", text: "CRM, ERP, paiements." },
              { icon: Search, label: "Veille", text: "Tendances et concurrence." },
            ].map((item) => {
              const Icon = item.icon;
              return (
                <div key={item.label} className="card-tight flex items-center gap-3 p-4">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-white/[0.03] text-white/60">
                    <Icon className="h-4 w-4" />
                  </div>
                  <div>
                    <div className="text-[12.5px] font-medium text-white/80">{item.label}</div>
                    <div className="text-[11px] text-white/35">{item.text}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <section className="relative border-t border-white/[0.06] py-16">
        <div className="container-page">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <div className="section-label">Méthode</div>
              <h2 className="mt-3 font-display text-3xl font-semibold tracking-tight">
                Quatre étapes, aucune surprise.
              </h2>
            </div>
            <div className="chip border-white/10 text-white/50">
              <ShieldCheck className="h-3.5 w-3.5" /> Code source livré
            </div>
          </div>
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {PROCESS.map((step, index) => (
              <div key={step.title} className="card-tight p-5">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-[11px] text-mint-400/70">0{index + 1}</span>
                  <Zap className="h-4 w-4 text-white/20" />
                </div>
                <h3 className="mt-4 text-[13.5px] font-semibold">{step.title}</h3>
                <p className="mt-2 text-[12px] leading-5 text-white/45">{step.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="relative pb-20">
        <div className="container-page">
          <div className="relative overflow-hidden rounded-3xl border border-mint-400/20 bg-gradient-to-br from-mint-400/[0.1] via-ink-850 to-ink-900 px-6 py-12 sm:px-10">
            <div className="pointer-events-none absolute -right-20 -top-20 h-56 w-56 rounded-full bg-mint-400/15 blur-3xl" aria-hidden="true" />
            <div className="relative flex flex-col items-start justify-between gap-6 sm:flex-row sm:items-center">
              <div>
                <h2 className="font-display text-2xl font-semibold tracking-tight sm:text-3xl">
                  Un besoin précis ? Parlons-en.
                </h2>
                <p className="mt-3 max-w-xl text-[13px] leading-6 text-white/50">
                  Décrivez votre contexte dans le studio : les six agents préparent la base, puis nous
                  ajustons ensemble les modules complémentaires.
                </p>
              </div>
              <div className="flex flex-col gap-3 sm:flex-row">
                <Link href={signedIn ? "/dashboard" : "/register"} className="btn-primary px-6 py-3">
                  {signedIn ? "Ouvrir le studio" : "Créer un compte"} <Rocket className="h-4 w-4" />
                </Link>
                <Link href="/docs" className="btn-secondary px-6 py-3">
                  Lire la documentation
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      <SiteFooter />
    </main>
  );
}
