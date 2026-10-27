import Link from "next/link";
import {
  ArrowRight,
  Building2,
  Check,
  CreditCard,
  Rocket,
  ShieldCheck,
  Smartphone,
  Sparkles,
  Wallet,
} from "lucide-react";
import { auth } from "@/auth";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Tarifs",
  description:
    "Découverte, Pro ou Entreprise : choisissez le plan Kôloublé IA adapté à votre équipe. Paiement par carte, Orange Money, MTN Money, Wave ou Moov Money.",
};

const PLANS = [
  {
    key: "starter",
    name: "Découverte",
    price: "0",
    period: "pour toujours",
    description: "Pour tester le studio et livrer une première application.",
    highlighted: false,
    features: [
      "1 espace de travail",
      "Génération Flutter + Supabase complète",
      "Export ZIP et code source",
      "Mode hors ligne Hive",
      "Support communautaire",
    ],
    cta: "Commencer gratuitement",
  },
  {
    key: "pro",
    name: "Pro",
    price: "15 000",
    period: "FCFA / mois",
    description: "Pour les indépendants et petites équipes qui livrent régulièrement.",
    highlighted: true,
    features: [
      "5 espaces de travail",
      "Tous les modèles métier",
      "Mode SaaS multi-tenant",
      "Compilation web et APK",
      "Rôles et permissions",
      "Paiements mobile money",
      "Support prioritaire",
    ],
    cta: "Passer au plan Pro",
  },
  {
    key: "business",
    name: "Entreprise",
    price: "45 000",
    period: "FCFA / mois",
    description: "Pour les organisations qui industrialisent leurs applications.",
    highlighted: false,
    features: [
      "Espaces illimités",
      "Facturation Stripe et mobile money",
      "Rapports et exports avancés",
      "Domaine personnalisé",
      "Accompagnement au déploiement",
      "Support dédié",
    ],
    cta: "Choisir Entreprise",
  },
];

const PAYMENTS = [
  { icon: CreditCard, label: "Stripe", detail: "Cartes bancaires internationales" },
  { icon: Smartphone, label: "Orange Money", detail: "Côte d'Ivoire et région" },
  { icon: Smartphone, label: "MTN Money", detail: "Paiement mobile" },
  { icon: Wallet, label: "Wave", detail: "Transfert instantané" },
  { icon: Wallet, label: "Moov Money", detail: "Paiement mobile" },
];

const FAQ = [
  {
    q: "Puis-je démarrer sans carte bancaire ?",
    a: "Oui. Le plan Découverte est gratuit et ne demande aucun moyen de paiement. Vous pouvez générer, modifier et exporter vos projets.",
  },
  {
    q: "Que contient exactement un projet exporté ?",
    a: "Le code Flutter complet, le schéma Supabase, les tests, les fichiers Docker, les workflows GitHub Actions et les guides de déploiement. Le code vous appartient.",
  },
  {
    q: "Comment sont gérés les paiements ?",
    a: "Les paiements sont opérés par Stripe, Orange Money, MTN Money, Wave ou Moov Money selon votre pays. Kôloublé IA ne stocke aucune donnée bancaire.",
  },
  {
    q: "Les services complémentaires sont-ils inclus ?",
    a: "Les sites web, l'automatisation et la business intelligence font l'objet d'un devis adapté à votre périmètre. Contactez-nous depuis le studio.",
  },
];

export default async function PricingPage() {
  const session = await auth();
  const signedIn = Boolean(session?.user?.id);

  return (
    <main className="relative overflow-hidden">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[520px] grid-fade" aria-hidden="true" />
      <SiteHeader signedIn={signedIn} />

      <section className="relative z-10 pb-14 pt-8 sm:pt-14">
        <div className="container-page max-w-3xl text-center">
          <div className="chip mx-auto border-mint-400/20 bg-mint-400/[0.07] text-mint-300">
            <Sparkles className="h-3.5 w-3.5" />
            Tarifs transparents
          </div>
          <h1 className="mt-6 font-display text-4xl font-semibold leading-[1.08] tracking-[-0.03em] sm:text-5xl">
            Un plan pour chaque <span className="text-gradient">ambition</span>.
          </h1>
          <p className="mt-5 text-[15px] leading-7 text-white/55">
            Commencez gratuitement, puis choisissez le plan qui accompagne votre croissance.
            Sans engagement, résiliable à tout moment.
          </p>
        </div>
      </section>

      <section className="relative pb-14">
        <div className="container-page grid gap-5 lg:grid-cols-3">
          {PLANS.map((plan) => (
            <article
              key={plan.key}
              className={`card relative flex flex-col p-6 ${
                plan.highlighted ? "border-mint-400/30 bg-mint-400/[0.05]" : ""
              }`}
            >
              {plan.highlighted && (
                <span className="absolute right-5 top-5 rounded-full bg-mint-400 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-ink-950">
                  Populaire
                </span>
              )}
              <h2 className="font-display text-lg font-semibold">{plan.name}</h2>
              <p className="mt-2 min-h-[40px] text-[12px] leading-5 text-white/45">{plan.description}</p>
              <div className="mt-5 flex items-end gap-1.5">
                <span className="font-display text-4xl font-semibold tracking-tight">{plan.price}</span>
                <span className="pb-1 text-[11.5px] text-white/40">{plan.period}</span>
              </div>
              <ul className="mt-6 space-y-2.5">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex gap-2 text-[12.5px] leading-5 text-white/55">
                    <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-mint-400" />
                    {feature}
                  </li>
                ))}
              </ul>
              <Link
                href={signedIn ? "/dashboard" : "/register"}
                className={`mt-7 w-full ${plan.highlighted ? "btn-primary" : "btn-secondary"} px-5 py-3`}
              >
                {plan.cta} <ArrowRight className="h-4 w-4" />
              </Link>
            </article>
          ))}
        </div>
      </section>

      <section className="relative pb-16">
        <div className="container-page">
          <div className="card p-6 sm:p-8">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="section-label">Paiements</div>
                <h2 className="mt-2 font-display text-xl font-semibold">Payez comme vous voulez.</h2>
              </div>
              <div className="chip border-white/10 text-white/45">
                <ShieldCheck className="h-3.5 w-3.5" /> Aucune donnée bancaire stockée
              </div>
            </div>
            <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
              {PAYMENTS.map((payment) => {
                const Icon = payment.icon;
                return (
                  <div key={payment.label} className="card-tight p-4">
                    <Icon className="h-4 w-4 text-mint-300" />
                    <div className="mt-3 text-[12.5px] font-medium text-white/80">{payment.label}</div>
                    <div className="mt-1 text-[10.5px] leading-4 text-white/35">{payment.detail}</div>
                  </div>
                );
              })}
            </div>
            <p className="mt-5 text-[11px] leading-5 text-white/30">
              Les montants sont affichés en francs CFA. La devise et les moyens de paiement de vos
              propres applications SaaS sont configurables lors de la génération.
            </p>
          </div>
        </div>
      </section>

      <section className="relative pb-16">
        <div className="container-page grid gap-4 lg:grid-cols-3">
          {[
            {
              icon: Rocket,
              title: "Sans engagement",
              text: "Changez de plan ou arrêtez à tout moment depuis vos paramètres.",
            },
            {
              icon: Building2,
              title: "Sur devis",
              text: "Sites web, automatisation et business intelligence : périmètre et budget validés ensemble.",
            },
            {
              icon: ShieldCheck,
              title: "Code source livré",
              text: "Vos projets exportés restent exécutables hors plateforme, sans dépendance.",
            },
          ].map((item) => {
            const Icon = item.icon;
            return (
              <div key={item.title} className="card-tight p-5">
                <Icon className="h-4 w-4 text-mint-300" />
                <h3 className="mt-4 text-[13.5px] font-semibold">{item.title}</h3>
                <p className="mt-2 text-[12px] leading-5 text-white/45">{item.text}</p>
              </div>
            );
          })}
        </div>
      </section>

      <section className="relative border-t border-white/[0.06] py-16">
        <div className="container-page max-w-3xl">
          <h2 className="font-display text-2xl font-semibold tracking-tight sm:text-3xl">
            Questions fréquentes
          </h2>
          <div className="mt-6 space-y-3">
            {FAQ.map((item) => (
              <details key={item.q} className="card-tight group p-5">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-[13px] font-medium text-white/80">
                  {item.q}
                  <span className="text-white/25 transition group-open:rotate-45">+</span>
                </summary>
                <p className="mt-3 text-[12.5px] leading-6 text-white/45">{item.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      <SiteFooter />
    </main>
  );
}
