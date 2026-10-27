import Link from "next/link";
import {
  ArrowRight,
  BookOpen,
  Bot,
  Boxes,
  Code2,
  Database,
  FileUp,
  Figma,
  Hammer,
  KeyRound,
  Mic,
  Rocket,
  ShieldCheck,
  Terminal,
} from "lucide-react";
import { auth } from "@/auth";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Documentation",
  description:
    "Démarrage, contrats API, pipeline de génération, imports voix/Word/Figma, compilation Flutter, déploiement et mode SaaS : la documentation Kôloublé IA.",
};

const SECTIONS = [
  { id: "demarrage", label: "Démarrage rapide" },
  { id: "api", label: "Contrats API" },
  { id: "pipeline", label: "Pipeline" },
  { id: "imports", label: "Imports" },
  { id: "compilation", label: "Compilation Flutter" },
  { id: "deploiement", label: "Déploiement" },
  { id: "saas", label: "Mode SaaS" },
  { id: "securite", label: "Sécurité" },
];

const ENV_VARS = [
  ["DATABASE_URL", "SQLite en local, PostgreSQL en production."],
  ["AUTH_SECRET", "Secret de signature des sessions Auth.js."],
  ["NEXT_PUBLIC_APP_URL", "URL publique utilisée dans les liens et le sitemap."],
  ["OLLAMA_BASE_URL / OLLAMA_MODEL", "IA locale par défaut."],
  ["AI_PROVIDER / AI_MODEL", "Fournisseur et modèle par défaut."],
  ["OPENAI_API_KEY, ANTHROPIC_API_KEY, GOOGLE_AI_API_KEY…", "Clés optionnelles, jamais commitées."],
  ["FIGMA_TOKEN", "Jeton Figma en lecture seule pour l'import de maquettes."],
  ["BUILD_ENABLED / FLUTTER_BIN", "Active et localise la compilation Flutter locale."],
];

export default async function DocsPage() {
  const session = await auth();
  const signedIn = Boolean(session?.user?.id);

  return (
    <main className="relative overflow-hidden">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[520px] grid-fade" aria-hidden="true" />
      <SiteHeader signedIn={signedIn} />

      <section className="relative z-10 pb-12 pt-8 sm:pt-12">
        <div className="container-page max-w-4xl">
          <div className="chip border-mint-400/20 bg-mint-400/[0.07] text-mint-300">
            <BookOpen className="h-3.5 w-3.5" />
            Documentation
          </div>
          <h1 className="mt-6 font-display text-4xl font-semibold leading-[1.08] tracking-[-0.03em] sm:text-5xl">
            Tout ce qu&apos;il faut pour <span className="text-gradient">construire et livrer</span>.
          </h1>
          <p className="mt-5 text-[15px] leading-7 text-white/55">
            Kôloublé IA génère des applications Flutter complètes, exécutables hors plateforme.
            Cette page décrit les contrats, les commandes et les garde-fous de sécurité.
          </p>
        </div>
      </section>

      <section className="relative pb-20">
        <div className="container-page grid gap-10 lg:grid-cols-[220px_1fr]">
          <aside className="hidden lg:block">
            <div className="sticky top-6 card-tight p-4">
              <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-white/25">
                Sommaire
              </div>
              <nav className="mt-3 space-y-1" aria-label="Sommaire de la documentation">
                {SECTIONS.map((section) => (
                  <a
                    key={section.id}
                    href={`#${section.id}`}
                    className="block rounded-lg px-2 py-1.5 text-[12px] text-white/45 transition hover:bg-white/[0.04] hover:text-white"
                  >
                    {section.label}
                  </a>
                ))}
              </nav>
            </div>
          </aside>

          <div className="space-y-12">
            <section id="demarrage" className="scroll-mt-24">
              <div className="flex items-center gap-2">
                <Terminal className="h-4 w-4 text-mint-300" />
                <h2 className="font-display text-2xl font-semibold tracking-tight">Démarrage rapide</h2>
              </div>
              <div className="mt-4 space-y-3 text-[13px] leading-6 text-white/55">
                <p>
                  Clonez le dépôt, installez les dépendances et appliquez la migration SQLite locale.
                  Le serveur de développement démarre sur <span className="kbd">:3000</span>.
                </p>
                <pre className="code-block">{`npm install
npx prisma migrate deploy
npm run dev`}</pre>
                <p>
                  Créez un compte, ouvrez le studio et décrivez votre application. Sans fournisseur IA
                  distant, les gabarits déterministes produisent déjà un projet complet.
                </p>
              </div>
            </section>

            <section id="api" className="scroll-mt-24">
              <div className="flex items-center gap-2">
                <Code2 className="h-4 w-4 text-mint-300" />
                <h2 className="font-display text-2xl font-semibold tracking-tight">Contrats API</h2>
              </div>
              <div className="mt-4 space-y-5">
                <div className="card-tight p-5">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-md bg-mint-400/15 px-2 py-0.5 font-mono text-[10.5px] font-semibold text-mint-300">POST</span>
                    <code className="font-mono text-[12.5px] text-white/80">/api/generate</code>
                  </div>
                  <p className="mt-3 text-[12.5px] leading-6 text-white/45">
                    Crée le projet, exécute le pipeline puis persiste les fichiers. La session Auth.js
                    et l&apos;origine de la requête sont vérifiées ; la route est limitée à 6 appels par
                    10 minutes.
                  </p>
                  <pre className="code-block mt-3">{`{
  "prompt": "Application de gestion des adhésions",
  "name": "OBC Terrain",
  "mode": "scaffold",
  "provider": "ollama",
  "model": "deepseek-coder:latest",
  "templateKey": "association",
  "saas": true,
  "preserveEdits": true,
  "deployment": {
    "target": "vercel",
    "repoName": "obc-terrain",
    "customDomain": "app.exemple.ci"
  }
}`}</pre>
                  <p className="mt-3 text-[12.5px] leading-6 text-white/45">
                    Réponse <span className="kbd">200</span> : objet contenant{" "}
                    <span className="kbd">projectId</span>, <span className="kbd">generationId</span>,{" "}
                    <span className="kbd">status</span>, <span className="kbd">summary</span> et la liste des{" "}
                    <span className="kbd">files</span> générés.
                  </p>
                </div>

                <div className="card-tight p-5">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-md bg-mint-400/15 px-2 py-0.5 font-mono text-[10.5px] font-semibold text-mint-300">POST</span>
                    <code className="font-mono text-[12.5px] text-white/80">/api/export</code>
                  </div>
                  <p className="mt-3 text-[12.5px] leading-6 text-white/45">
                    Renvoie une archive ZIP de l&apos;application. Le corps JSON est optionnel : sans{" "}
                    <span className="kbd">projectId</span>, le projet le plus récent disposant de fichiers
                    est utilisé. La réponse porte les en-têtes <span className="kbd">X-Project-Id</span> et{" "}
                    <span className="kbd">X-Zip-Url</span>.
                  </p>
                  <pre className="code-block mt-3">{`{
  "projectId": "clx0abc123"
}`}</pre>
                </div>
              </div>
            </section>

            <section id="pipeline" className="scroll-mt-24">
              <div className="flex items-center gap-2">
                <Boxes className="h-4 w-4 text-mint-300" />
                <h2 className="font-display text-2xl font-semibold tracking-tight">Pipeline de génération</h2>
              </div>
              <p className="mt-4 text-[13px] leading-6 text-white/55">
                Six agents se relaient et diffusent leur progression en NDJSON quand vous utilisez le
                studio :
              </p>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                {[
                  ["Architecte logiciel", "Spécification, entités, rôles et plateformes."],
                  ["Designer UI/UX", "Palette, écrans et prototype web autonome."],
                  ["Développeur Flutter", "Modèles, dépôts, providers, écrans et navigation."],
                  ["Expert Supabase", "Schéma PostgreSQL, RLS, triggers et SaaS."],
                  ["DevOps", "Docker, Caddy, Vercel, Netlify et GitHub Actions."],
                  ["Ingénieur QA", "Validation, réparation et documentation."],
                ].map(([title, text], index) => (
                  <div key={title} className="card-tight flex gap-3 p-4">
                    <span className="font-mono text-[11px] text-mint-400/70">0{index + 1}</span>
                    <div>
                      <div className="text-[12.5px] font-medium text-white/80">{title}</div>
                      <div className="mt-1 text-[11px] leading-5 text-white/35">{text}</div>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            <section id="imports" className="scroll-mt-24">
              <div className="flex items-center gap-2">
                <Bot className="h-4 w-4 text-mint-300" />
                <h2 className="font-display text-2xl font-semibold tracking-tight">Imports</h2>
              </div>
              <div className="mt-4 grid gap-3 sm:grid-cols-3">
                {[
                  {
                    icon: Mic,
                    title: "Dictée vocale",
                    text: "La Web Speech API transcrit votre demande en français directement dans le prompt. Aucun audio n'est conservé.",
                  },
                  {
                    icon: FileUp,
                    title: "Document Word",
                    text: "Un fichier .docx jusqu'à 8 Mo est converti en texte localement, sans service externe.",
                  },
                  {
                    icon: Figma,
                    title: "Maquette Figma",
                    text: "Avec FIGMA_TOKEN, les cadres et textes d'un fichier Figma sont résumés en spécification.",
                  },
                ].map((item) => {
                  const Icon = item.icon;
                  return (
                    <div key={item.title} className="card-tight p-4">
                      <Icon className="h-4 w-4 text-mint-300" />
                      <div className="mt-3 text-[12.5px] font-medium text-white/80">{item.title}</div>
                      <p className="mt-1.5 text-[11px] leading-5 text-white/35">{item.text}</p>
                    </div>
                  );
                })}
              </div>
            </section>

            <section id="compilation" className="scroll-mt-24">
              <div className="flex items-center gap-2">
                <Hammer className="h-4 w-4 text-mint-300" />
                <h2 className="font-display text-2xl font-semibold tracking-tight">Compilation Flutter</h2>
              </div>
              <div className="mt-4 space-y-3 text-[13px] leading-6 text-white/55">
                <p>
                  L&apos;onglet <span className="kbd">Compilation</span> du studio détecte Flutter, prépare
                  les dépendances puis produit une version web et, si demandé, un APK de débogage. Les
                  artefacts sont téléchargeables depuis l&apos;interface.
                </p>
                <pre className="code-block">{`GET  /api/projects/:id/build          # capacités et artefacts
POST /api/projects/:id/build          # { "target": "web" | "android" | "all" }
GET  /api/projects/:id/build/artifacts/:name`}</pre>
                <p>
                  Sur Vercel, la compilation locale est désactivée : exportez le ZIP et compilez avec
                  votre chaîne CI. Les journaux restent visibles dans le panneau.
                </p>
              </div>
            </section>

            <section id="deploiement" className="scroll-mt-24">
              <div className="flex items-center gap-2">
                <Rocket className="h-4 w-4 text-mint-300" />
                <h2 className="font-display text-2xl font-semibold tracking-tight">Déploiement</h2>
              </div>
              <div className="mt-4 space-y-3 text-[13px] leading-6 text-white/55">
                <p>
                  Chaque projet embarque les fichiers nécessaires à cinq cibles : Vercel, Netlify,
                  GitHub Pages, Cloudflare Pages et l&apos;auto-hébergement Docker + Caddy. Le centre de
                  déploiement du studio vérifie la configuration et affiche les enregistrements DNS du
                  domaine personnalisé.
                </p>
                <div className="flex flex-wrap gap-2">
                  {["Vercel", "Netlify", "GitHub Pages", "Cloudflare Pages", "Docker + Caddy"].map((target) => (
                    <span key={target} className="chip">{target}</span>
                  ))}
                </div>
                <p>
                  Pour un domaine propre, créez l&apos;enregistrement CNAME ou A indiqué, attendez la
                  propagation puis activez le certificat TLS automatique de votre hébergeur.
                </p>
              </div>
            </section>

            <section id="saas" className="scroll-mt-24">
              <div className="flex items-center gap-2">
                <Database className="h-4 w-4 text-mint-300" />
                <h2 className="font-display text-2xl font-semibold tracking-tight">Mode SaaS</h2>
              </div>
              <div className="mt-4 space-y-3 text-[13px] leading-6 text-white/55">
                <p>
                  Activez <span className="kbd">Mode SaaS</span> lors de la création pour générer les
                  tables <span className="kbd">organizations</span>,{" "}
                  <span className="kbd">organization_members</span>, <span className="kbd">plans</span>,{" "}
                  <span className="kbd">subscriptions</span> et <span className="kbd">payment_transactions</span>.
                  Les tables métier reçoivent une colonne <span className="kbd">organization_id</span> et
                  des politiques RLS strictes.
                </p>
                <p>
                  Trois plans (Découverte, Pro, Entreprise) et cinq moyens de paiement (Stripe, Orange
                  Money, MTN Money, Wave, Moov Money) sont préconfigurés. Modifiez-les dans la
                  spécification ou directement dans <span className="kbd">supabase/schema.sql</span>.
                </p>
                <p>
                  Le projet généré contient <span className="kbd">lib/config/billing.dart</span> et{" "}
                  <span className="kbd">docs/SAAS.md</span>. Aucun secret n&apos;est écrit dans ces fichiers :
                  seuls les noms de variables attendus sont listés.
                </p>
              </div>
            </section>

            <section id="securite" className="scroll-mt-24">
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-mint-300" />
                <h2 className="font-display text-2xl font-semibold tracking-tight">Sécurité</h2>
              </div>
              <div className="mt-4 space-y-3 text-[13px] leading-6 text-white/55">
                <p>
                  Les routes sensibles vérifient la session, l&apos;origine de la requête et appliquent
                  une limitation de débit. Les fichiers générés sont validés avant écriture : chemins
                  sûrs, imports Dart résolus, absence de secrets.
                </p>
                <div className="flex flex-wrap gap-2">
                  {["RLS activé par défaut", "Rôle service_role réservé au serveur", "ZIP sans binaire externe", "Aucune clé dans le code généré"].map((item) => (
                    <span key={item} className="chip border-mint-400/15 text-mint-300/80">
                      <ShieldCheck className="h-3 w-3" /> {item}
                    </span>
                  ))}
                </div>
                <p>
                  Ne commitez jamais de clé API. Renseignez les secrets dans l&apos;environnement local ou
                  dans le gestionnaire de secrets de votre hébergeur.
                </p>
              </div>
            </section>

            <section className="scroll-mt-24">
              <div className="flex items-center gap-2">
                <KeyRound className="h-4 w-4 text-mint-300" />
                <h2 className="font-display text-2xl font-semibold tracking-tight">Variables d&apos;environnement</h2>
              </div>
              <div className="mt-4 overflow-hidden card-tight">
                {ENV_VARS.map(([name, description]) => (
                  <div key={name} className="flex flex-col gap-1 border-b border-white/[0.05] p-3 last:border-0 sm:flex-row sm:items-center sm:gap-4">
                    <code className="shrink-0 font-mono text-[11px] text-mint-200/80">{name}</code>
                    <span className="text-[11.5px] leading-5 text-white/35">{description}</span>
                  </div>
                ))}
              </div>
            </section>

            <div className="card flex flex-col items-start justify-between gap-4 p-6 sm:flex-row sm:items-center">
              <div>
                <h2 className="font-display text-lg font-semibold">Prêt à générer ?</h2>
                <p className="mt-1 text-[12px] text-white/40">
                  Le studio applique cette documentation automatiquement.
                </p>
              </div>
              <Link href={signedIn ? "/dashboard" : "/register"} className="btn-primary px-5 py-2.5">
                {signedIn ? "Ouvrir le studio" : "Créer un compte"} <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      <SiteFooter />
    </main>
  );
}
