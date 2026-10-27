import Link from "next/link";
import {
  ArrowRight,
  Boxes,
  Check,
  ChevronRight,
  CloudOff,
  Code2,
  Cpu,
  Database,
  FileCode2,
  FolderTree,
  Github,
  Globe2,
  Layers,
  LockKeyhole,
  Palette,
  RefreshCw,
  Rocket,
  ServerCog,
  ShieldCheck,
  Smartphone,
  Sparkles,
  Terminal,
  Wand2,
  Zap,
} from "lucide-react";
import { auth } from "@/auth";
import { Brand } from "@/components/brand";
import { OnBradeCredit } from "@/components/onbrade-credit";
import { AGENTS } from "@/lib/generator/types";

export const dynamic = "force-dynamic";

const AGENT_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  architect: Layers,
  designer: Palette,
  flutter: Smartphone,
  supabase: Database,
  devops: Rocket,
  tester: ShieldCheck,
};

const FEATURES = [
  {
    icon: Wand2,
    title: "Un prompt, une application",
    body: "L'architecte détecte vos entités métier, les champs et les écrans, puis fige une spécification exécutable. Aucun pseudocode.",
  },
  {
    icon: Smartphone,
    title: "Flutter 3, quatre plateformes",
    body: "Web, Android, iOS et Windows à partir d'une seule base de code propre, responsive et thémée.",
  },
  {
    icon: CloudOff,
    title: "Offline-first par défaut",
    body: "Hive conserve les données localement. Une file de synchronisation rejoue les écritures vers Supabase dès le retour du réseau.",
  },
  {
    icon: LockKeyhole,
    title: "Sécurité intégrée",
    body: "Auth e-mail, Google et Facebook via Supabase, politiques RLS par propriétaire et aucun secret dans le code généré.",
  },
  {
    icon: ServerCog,
    title: "Prêt pour votre domaine",
    body: "Vercel, Docker durci, Caddy, Nginx, healthchecks et GitHub Actions. Vous choisissez votre hébergement.",
  },
  {
    icon: ShieldCheck,
    title: "QA et auto-réparation",
    body: "Les six agents valident la structure, les imports, le SQL et les tests. Les erreurs détectées sont corrigées automatiquement.",
  },
];

const STACK = [
  { label: "Flutter 3", hint: "Riverpod · go_router" },
  { label: "Supabase", hint: "Postgres · Auth · RLS" },
  { label: "Hive", hint: "Stockage local" },
  { label: "Ollama", hint: "DeepSeek / Qwen" },
  { label: "Vercel", hint: "Edge & CI" },
  { label: "Docker", hint: "Caddy · Nginx" },
];

const FILES = [
  { icon: FolderTree, path: "lib/features/" },
  { icon: FileCode2, path: "lib/core/storage/local_store.dart" },
  { icon: FileCode2, path: "lib/core/sync/sync_service.dart" },
  { icon: Database, path: "supabase/schema.sql" },
  { icon: Code2, path: "test/validators_test.dart" },
  { icon: Rocket, path: ".github/workflows/flutter.yml" },
  { icon: Globe2, path: "prototype/index.html" },
];

const FAQ = [
  {
    q: "L'IA envoie-t-elle mon code à un service tiers ?",
    a: "Non. Ollama tourne sur votre machine et l'application lui parle en local. Vous pouvez même générer sans modèle connecté : le moteur de gabarits déterministes prend le relais.",
  },
  {
    q: "Le projet généré fonctionne-t-il vraiment ?",
    a: "Oui. Kôloublé IA produit une arborescence Flutter complète : modèles, dépôts, providers Riverpod, écrans CRUD, navigation, thème, stockage Hive, synchronisation Supabase, tests et fichiers de déploiement.",
  },
  {
    q: "Comment déployer sur mon propre domaine ?",
    a: "Le ZIP contient un Dockerfile non-root, un docker-compose avec Caddy et un guide pas à pas. Vous pouvez aussi déployer la vitrine web sur Vercel en une commande.",
  },
  {
    q: "Puis-je modifier les fichiers générés ?",
    a: "Chaque fichier est éditable dans le studio. Vos modifications sont conservées lors des régénérations, et vous pouvez lancer une réparation automatique à tout moment.",
  },
];

export default async function LandingPage() {
  const session = await auth();
  const signedIn = Boolean(session?.user?.id);

  return (
    <main className="relative overflow-hidden">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[760px] grid-fade" aria-hidden="true" />

      <header className="relative z-20">
        <div className="container-page flex h-20 items-center justify-between">
          <Brand />
          <nav className="hidden items-center gap-1 md:flex" aria-label="Navigation principale">
            <a href="#features" className="nav-link">Fonctionnalités</a>
            <Link href="/templates" className="nav-link">Modèles</Link>
            <Link href="/services" className="nav-link">Services</Link>
            <Link href="/tarifs" className="nav-link">Tarifs</Link>
            <Link href="/docs" className="nav-link">Docs</Link>
          </nav>
          <div className="flex items-center gap-2">
            {signedIn ? (
              <Link href="/dashboard" className="btn-primary">
                Mon studio <ArrowRight className="h-4 w-4" />
              </Link>
            ) : (
              <>
                <Link href="/login" className="hidden rounded-full px-4 py-2 text-sm text-white/65 transition hover:text-white sm:inline-flex">
                  Se connecter
                </Link>
                <Link href="/register" className="btn-primary">
                  Créer un compte <Sparkles className="h-4 w-4" />
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      <nav className="container-page relative z-20 flex flex-wrap items-center gap-1 pb-3 md:hidden" aria-label="Navigation mobile">
        <a href="#features" className="nav-link text-[12px]">Fonctionnalités</a>
        <Link href="/templates" className="nav-link text-[12px]">Modèles</Link>
        <Link href="/services" className="nav-link text-[12px]">Services</Link>
        <Link href="/tarifs" className="nav-link text-[12px]">Tarifs</Link>
        <Link href="/docs" className="nav-link text-[12px]">Docs</Link>
      </nav>

      <section className="relative z-10 pb-24 pt-10 sm:pt-16">
        <div className="container-page grid items-center gap-14 lg:grid-cols-[1.05fr_0.95fr]">
          <div className="animate-in">
            <div className="chip border-mint-400/20 bg-mint-400/[0.07] text-mint-300">
              <span className="status-dot bg-mint-400 animate-pulseSoft" />
              Moteur local · Ollama · DeepSeek & Qwen
            </div>
            <h1 className="mt-6 font-display text-[42px] font-semibold leading-[1.04] tracking-[-0.035em] sm:text-6xl xl:text-[68px]">
              Une phrase.
              <br />
              <span className="text-gradient">Une application Flutter complète.</span>
            </h1>
            <p className="mt-6 max-w-xl text-[15px] leading-7 text-white/55 sm:text-base">
              Kôloublé IA transforme votre idée en projet Flutter pour le web, Android, iOS et Windows.
              Modèles, écrans, Supabase, mode hors ligne, tests et déploiement : tout est écrit, prêt à exécuter.
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link href={signedIn ? "/dashboard" : "/register"} className="btn-primary px-6 py-3 text-[15px]">
                {signedIn ? "Ouvrir mon studio" : "Lancer ma première application"}
                <ArrowRight className="h-4 w-4" />
              </Link>
              <a href="#pipeline" className="btn-secondary px-6 py-3 text-[15px]">
                Voir les six agents <ChevronRight className="h-4 w-4" />
              </a>
            </div>

            <div className="mt-7 flex flex-wrap items-center gap-x-6 gap-y-2 text-[12px] text-white/40">
              <span className="inline-flex items-center gap-1.5"><Check className="h-3.5 w-3.5 text-mint-400" /> Sans pseudocode</span>
              <span className="inline-flex items-center gap-1.5"><Check className="h-3.5 w-3.5 text-mint-400" /> ZIP exportable</span>
              <span className="inline-flex items-center gap-1.5"><Check className="h-3.5 w-3.5 text-mint-400" /> 100 % éditable</span>
              <span className="inline-flex items-center gap-1.5"><Check className="h-3.5 w-3.5 text-mint-400" /> Hébergement libre</span>
            </div>
          </div>

          <div className="relative animate-in" style={{ animationDelay: "120ms" }}>
            <div className="absolute -inset-10 -z-10 rounded-full bg-mint-400/10 blur-3xl" aria-hidden="true" />
            <div className="card border-gradient overflow-hidden">
              <div className="flex items-center justify-between border-b border-white/[0.06] px-5 py-3.5">
                <div className="flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-full bg-white/15" />
                  <span className="h-2.5 w-2.5 rounded-full bg-white/10" />
                  <span className="h-2.5 w-2.5 rounded-full bg-white/10" />
                </div>
                <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-white/30">kolouble · studio</span>
                <span className="chip border-mint-400/25 py-0.5 text-[10px] text-mint-300">
                  <span className="status-dot bg-mint-400" /> live
                </span>
              </div>

              <div className="p-5">
                <div className="rounded-2xl border border-white/[0.07] bg-ink-950/60 p-4">
                  <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-white/30">
                    <Terminal className="h-3.5 w-3.5" /> prompt
                  </div>
                  <p className="mt-2 text-sm leading-6 text-white/80">
                    Crée une application de gestion de projets avec Android, iPhone, Web, Windows,
                    mode offline et synchronisation cloud.
                  </p>
                  <div className="mt-3 flex items-center justify-between">
                    <span className="font-mono text-[10px] text-white/25">deepseek-coder · standard</span>
                    <span className="inline-flex items-center gap-1 rounded-lg bg-mint-400 px-2.5 py-1 text-[10px] font-bold text-ink-950">
                      Générer <Zap className="h-3 w-3" />
                    </span>
                  </div>
                </div>

                <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3">
                  {AGENTS.map((agent, index) => {
                    const Icon = AGENT_ICONS[agent.id] ?? Sparkles;
                    const complete = index < 4;
                    return (
                      <div
                        key={agent.id}
                        className={`rounded-xl border px-2.5 py-2 transition ${
                          complete
                            ? "border-mint-400/20 bg-mint-400/[0.055]"
                            : index === 4
                              ? "border-gold/25 bg-gold/[0.055]"
                              : "border-white/[0.06] bg-white/[0.02]"
                        }`}
                      >
                        <div className="flex items-center gap-1.5">
                          <Icon className={`h-3 w-3 ${complete ? "text-mint-400" : index === 4 ? "text-gold" : "text-white/25"}`} />
                          <span className="truncate text-[10px] font-medium text-white/60">{agent.title.split(" ")[0]}</span>
                        </div>
                        <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-white/[0.06]">
                          <div
                            className={`h-full rounded-full ${complete ? "w-full bg-mint-400/70" : index === 4 ? "w-2/3 animate-pulseSoft bg-gold/70" : "w-0 bg-white/20"}`}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="mt-4 rounded-2xl border border-white/[0.07] bg-ink-950/60 p-3 font-mono text-[10.5px] leading-6">
                  {FILES.map((file, index) => {
                    const Icon = file.icon;
                    return (
                      <div key={file.path} className="flex items-center gap-2">
                        <span className="text-mint-400/70">{index < 6 ? "✓" : "…"}</span>
                        <Icon className={`h-3 w-3 ${index === 6 ? "text-gold/70" : "text-white/35"}`} />
                        <span className={index === 6 ? "text-gold/80" : "text-white/50"}>{file.path}</span>
                      </div>
                    );
                  })}
                </div>

                <div className="mt-4 flex items-center justify-between rounded-2xl border border-white/[0.07] bg-white/[0.025] px-4 py-3">
                  <div className="flex items-center gap-2 text-[11px] text-white/50">
                    <RefreshCw className="h-3.5 w-3.5 text-mint-400" />
                    Synchronisation Hive → Supabase
                  </div>
                  <span className="badge rounded-full bg-mint-400/10 px-2 py-0.5 text-[10px] font-semibold text-mint-300">prêt</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="relative border-y border-white/[0.06] bg-ink-900/40">
        <div className="container-page grid grid-cols-2 gap-6 py-8 sm:grid-cols-4">
          {[
            { value: "6", label: "agents spécialisés" },
            { value: "4", label: "plateformes Flutter" },
            { value: "0", label: "pseudocode" },
            { value: "100 %", label: "code source livré" },
          ].map((stat) => (
            <div key={stat.label} className="text-center sm:text-left">
              <div className="font-display text-3xl font-semibold tracking-tight text-white sm:text-4xl">{stat.value}</div>
              <div className="mt-1 text-[11px] uppercase tracking-[0.18em] text-white/35">{stat.label}</div>
            </div>
          ))}
        </div>
      </section>

      <section id="features" className="relative py-24">
        <div className="container-page">
          <div className="max-w-2xl">
            <div className="section-label">Pourquoi Kôloublé IA</div>
            <h2 className="mt-3 font-display text-3xl font-semibold tracking-tight sm:text-4xl">
              Un studio complet, pas un chatbot.
            </h2>
            <p className="mt-4 text-sm leading-7 text-white/50">
              Chaque génération produit une application structurée selon les principes Clean Architecture
              et Feature First, avec des dépendances réelles et des fichiers prêts à compiler.
            </p>
          </div>
          <div className="mt-12 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((feature) => {
              const Icon = feature.icon;
              return (
                <article key={feature.title} className="card group p-6 transition duration-300 hover:-translate-y-1 hover:border-mint-400/25">
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-mint-400/15 bg-mint-400/[0.07] text-mint-400 transition group-hover:bg-mint-400/[0.12]">
                    <Icon className="h-5 w-5" />
                  </div>
                  <h3 className="mt-5 font-display text-base font-semibold text-white">{feature.title}</h3>
                  <p className="mt-2 text-[13px] leading-6 text-white/45">{feature.body}</p>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      <section id="pipeline" className="relative border-y border-white/[0.06] bg-ink-900/30 py-24">
        <div className="container-page">
          <div className="flex flex-col justify-between gap-6 md:flex-row md:items-end">
            <div className="max-w-2xl">
              <div className="section-label">Le pipeline</div>
              <h2 className="mt-3 font-display text-3xl font-semibold tracking-tight sm:text-4xl">
                Six agents, une seule sortie : du code exécutable.
              </h2>
            </div>
            <p className="max-w-sm text-sm leading-6 text-white/45">
              Les agents travaillent en séquence, se transmettent la spécification et corrigent
              automatiquement les incohérences avant l'export.
            </p>
          </div>
          <div className="mt-12 grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            {AGENTS.map((agent, index) => {
              const Icon = AGENT_ICONS[agent.id] ?? Sparkles;
              return (
                <div key={agent.id} className="card-tight group flex gap-4 p-5 transition hover:border-white/20">
                  <div className="flex flex-col items-center">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/[0.08] bg-white/[0.03] text-mint-300">
                      <Icon className="h-4.5 w-4.5" />
                    </div>
                    <span className="mt-2 font-mono text-[10px] text-white/25">0{index + 1}</span>
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-white/90">{agent.title}</h3>
                    <p className="mt-1.5 text-[12px] leading-5 text-white/40">{agent.description}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <section id="stack" className="relative py-24">
        <div className="container-page grid items-start gap-14 lg:grid-cols-2">
          <div>
            <div className="section-label">La stack</div>
            <h2 className="mt-3 font-display text-3xl font-semibold tracking-tight sm:text-4xl">
              Votre architecture, pas la nôtre.
            </h2>
            <p className="mt-4 max-w-lg text-sm leading-7 text-white/50">
              Kôloublé IA génère du code que vous possédez entièrement : Flutter avec Riverpod et
              go_router, Supabase pour le cloud, Hive pour le hors ligne. Aucune dépendance à la plateforme.
            </p>
            <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-3">
              {STACK.map((item) => (
                <div key={item.label} className="rounded-2xl border border-white/[0.07] bg-white/[0.02] p-3.5">
                  <div className="text-[13px] font-semibold text-white/85">{item.label}</div>
                  <div className="mt-0.5 text-[10px] text-white/30">{item.hint}</div>
                </div>
              ))}
            </div>
            <div className="mt-8 flex items-start gap-3 rounded-2xl border border-mint-400/15 bg-mint-400/[0.04] p-4">
              <Cpu className="mt-0.5 h-4 w-4 shrink-0 text-mint-400" />
              <p className="text-[12px] leading-5 text-white/50">
                <strong className="font-semibold text-white/80">Mode local d'abord.</strong> Sans Ollama,
                les gabarits déterministes produisent déjà l'application complète. Avec Ollama, les agents
                enrichissent l'identité, les contenus et réparent les fichiers.
              </p>
            </div>
          </div>

          <div className="card overflow-hidden">
            <div className="flex items-center justify-between border-b border-white/[0.06] px-5 py-4">
              <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-white/40">
                <FolderTree className="h-3.5 w-3.5 text-mint-400" /> Arborescence générée
              </div>
              <span className="chip py-0.5 text-[10px]">~40 fichiers</span>
            </div>
            <div className="space-y-1 p-5 font-mono text-[11.5px] leading-6">
              {[
                ["lib/", "folder"],
                ["  main.dart", "file"],
                ["  app.dart", "file"],
                ["  core/", "folder"],
                ["    auth/auth_service.dart", "file"],
                ["    storage/local_store.dart", "file"],
                ["    sync/sync_service.dart", "file"],
                ["    router/app_router.dart", "file"],
                ["  features/projects/", "folder"],
                ["    data/projects_repository.dart", "file"],
                ["    domain/models/project.dart", "file"],
                ["    presentation/pages/projects_list_page.dart", "file"],
                ["supabase/schema.sql", "sql"],
                ["test/models/project_model_test.dart", "file"],
                ["prototype/index.html", "html"],
                ["Dockerfile · docker-compose.yml · Caddyfile", "ops"],
                [".github/workflows/flutter.yml", "ops"],
              ].map(([line]) => (
                <div
                  key={line}
                  className={
                    line.endsWith("/")
                      ? "text-gold/80"
                      : line?.startsWith("supabase")
                        ? "text-sky-400/75 pl-4"
                        : line?.startsWith("prototype")
                          ? "text-mint-300/70 pl-4"
                          : line?.includes("Dockerfile") || line?.startsWith(".github")
                            ? "text-white/35 pl-4"
                            : "text-white/45 pl-4"
                  }
                >
                  {line}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section id="deploiement" className="relative border-y border-white/[0.06] bg-ink-900/30 py-24">
        <div className="container-page">
          <div className="mx-auto max-w-2xl text-center">
            <div className="section-label">Déploiement</div>
            <h2 className="mt-3 font-display text-3xl font-semibold tracking-tight sm:text-4xl">
              Vercel, votre serveur ou les deux.
            </h2>
            <p className="mt-4 text-sm leading-7 text-white/50">
              Le ZIP inclut les scripts de build, la configuration Supabase, le SQL prêt à exécuter
              et une image Docker non-root avec Caddy pour votre nom de domaine.
            </p>
          </div>
          <div className="mt-12 grid gap-4 lg:grid-cols-3">
            {[
              {
                icon: Globe2,
                tag: "Cloud",
                title: "Vercel + Supabase",
                body: "Variables d'environnement, migration Postgres, OAuth et domaine personnalisé. Le guide couvre chaque étape.",
                code: "vercel --prod",
              },
              {
                icon: Boxes,
                tag: "Docker",
                title: "Serveur privé",
                body: "Image nginx non-root, compose avec Caddy, TLS automatique et healthchecks. Idéal pour votre propre domaine.",
                code: "docker compose up -d",
              },
              {
                icon: Github,
                tag: "CI/CD",
                title: "GitHub Actions",
                body: "Analyse, tests, build web, APK Android et option de déploiement Vercel déclenchée par vos secrets.",
                code: "git push origin main",
              },
            ].map((item) => {
              const Icon = item.icon;
              return (
                <article key={item.title} className="card p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/[0.08] bg-white/[0.03] text-mint-300">
                      <Icon className="h-4.5 w-4.5" />
                    </div>
                    <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-white/25">{item.tag}</span>
                  </div>
                  <h3 className="mt-5 font-display text-base font-semibold">{item.title}</h3>
                  <p className="mt-2 text-[12.5px] leading-6 text-white/45">{item.body}</p>
                  <code className="mt-4 block rounded-xl border border-white/[0.06] bg-ink-950/70 px-3 py-2 font-mono text-[11px] text-mint-200/80">
                    {item.code}
                  </code>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      <section className="relative py-24">
        <div className="container-page grid gap-14 lg:grid-cols-[0.9fr_1.1fr]">
          <div>
            <div className="section-label">Questions fréquentes</div>
            <h2 className="mt-3 font-display text-3xl font-semibold tracking-tight sm:text-4xl">
              Tout est local. Tout est à vous.
            </h2>
            <p className="mt-4 max-w-md text-sm leading-7 text-white/45">
              Le studio tourne sur votre poste, avec votre modèle. Vos prompts, vos fichiers et vos
              identifiants Supabase restent sous votre contrôle.
            </p>
            <div className="mt-6 flex items-center gap-2 text-[12px] text-white/40">
              <LockKeyhole className="h-4 w-4 text-mint-400" />
              Aucun secret n'est stocké dans les projets générés.
            </div>
          </div>
          <div id="faq" className="space-y-3">
            {FAQ.map((item) => (
              <details key={item.q} className="group card-tight px-5 py-4 open:border-mint-400/20 open:bg-mint-400/[0.03]">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-[13.5px] font-medium text-white/80">
                  {item.q}
                  <ChevronRight className="h-4 w-4 shrink-0 text-white/25 transition group-open:rotate-90" />
                </summary>
                <p className="mt-3 text-[12.5px] leading-6 text-white/45">{item.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      <section className="relative pb-24">
        <div className="container-page">
          <div className="relative overflow-hidden rounded-[2rem] border border-mint-400/20 bg-gradient-to-br from-mint-400/[0.11] via-ink-850 to-ink-900 px-6 py-14 text-center sm:px-12">
            <div className="pointer-events-none absolute -left-24 -top-24 h-64 w-64 rounded-full bg-mint-400/20 blur-3xl" aria-hidden="true" />
            <div className="pointer-events-none absolute -bottom-32 -right-16 h-72 w-72 rounded-full bg-gold/10 blur-3xl" aria-hidden="true" />
            <div className="relative">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl border border-mint-400/30 bg-mint-400/10">
                <Sparkles className="h-5 w-5 text-mint-300" />
              </div>
              <h2 className="mx-auto mt-6 max-w-2xl font-display text-3xl font-semibold tracking-tight sm:text-4xl">
                Votre prochaine application commence par une phrase.
              </h2>
              <p className="mx-auto mt-4 max-w-lg text-sm leading-7 text-white/50">
                Créez votre compte, décrivez votre idée, regardez les six agents construire le projet.
                Puis exportez-le et déployez-le où vous voulez.
              </p>
              <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
                <Link href={signedIn ? "/dashboard" : "/register"} className="btn-primary px-6 py-3 text-[15px]">
                  {signedIn ? "Retour au studio" : "Créer mon compte"}
                  <ArrowRight className="h-4 w-4" />
                </Link>
                <Link href="/login" className="btn-secondary px-6 py-3 text-[15px]">
                  J'ai déjà un compte
                </Link>
              </div>
              <p className="mt-5 text-[10.5px] uppercase tracking-[0.18em] text-white/25">
                Fonctionne avec votre installation Ollama · sans carte bancaire
              </p>
            </div>
          </div>
        </div>
      </section>

      <footer className="relative border-t border-white/[0.06] pb-10 pt-8">
        <div className="container-page">
          <p className="mx-auto max-w-2xl text-center text-[12.5px] leading-6 text-white/40">
            Nous transformons vos idées en solutions digitales intelligentes pour booster votre
            croissance et votre productivité.
          </p>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-[11.5px] text-white/35">
            <Link href="/templates" className="transition hover:text-white">Modèles métier</Link>
            <Link href="/services" className="transition hover:text-white">Services complémentaires</Link>
            <Link href="/tarifs" className="transition hover:text-white">Tarifs</Link>
            <Link href="/docs" className="transition hover:text-white">Documentation</Link>
          </div>
          <div className="mt-6 flex flex-col items-center justify-between gap-3 border-t border-white/[0.05] pt-5 sm:flex-row">
            <Brand />
            <p className="text-[11px] text-white/25">© {new Date().getFullYear()} Kôloublé IA. Le code est à vous.</p>
          </div>
          <div className="mt-4 text-center text-[11px] text-white/35 sm:text-right">
            <OnBradeCredit />
          </div>
        </div>
      </footer>
    </main>
  );
}
