"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowUpRight,
  Check,
  Chrome,
  Cloud,
  Cpu,
  Database,
  Facebook,
  Github,
  HardDrive,
  KeyRound,
  Loader2,
  LockKeyhole,
  Mail,
  RefreshCw,
  Server,
  ShieldCheck,
  Sparkles,
  X,
} from "lucide-react";
import { apiFetch } from "@/lib/client-api";
import { cn } from "@/lib/cn";

interface ProviderInfo {
  id: string;
  label: string;
  hint: string;
  enabled: boolean;
  online: boolean;
  models: string[];
  defaultModel: string;
}

interface ModelsResponse {
  online: boolean;
  baseUrl: string;
  defaultModel: string;
  models: Array<{ name: string; parameterSize: string | null; family: string | null }>;
  providers?: ProviderInfo[];
  defaultProvider?: string;
  aiAvailable?: boolean;
  error?: string;
}

interface HealthResponse {
  status: string;
  database: string;
  runtime: string;
}

function StatusLine({
  ok,
  label,
  detail,
}: {
  ok: boolean | null;
  label: string;
  detail: string;
}) {
  return (
    <div className="flex items-start gap-2.5">
      <span
        className={cn(
          "mt-1 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border",
          ok === null
            ? "border-white/10 bg-white/[0.03] text-white/30"
            : ok
              ? "border-mint-400/25 bg-mint-400/10 text-mint-300"
              : "border-white/10 bg-white/[0.03] text-white/30",
        )}
      >
        {ok === null ? <Loader2 className="h-2.5 w-2.5 animate-spin" /> : ok ? <Check className="h-2.5 w-2.5" /> : <X className="h-2.5 w-2.5" />}
      </span>
      <div>
        <div className="text-[12px] font-medium text-white/75">{label}</div>
        <div className="mt-0.5 text-[10.5px] leading-4 text-white/30">{detail}</div>
      </div>
    </div>
  );
}

export function SettingsClient({
  name,
  email,
  googleEnabled,
  facebookEnabled,
  githubEnabled,
  defaultProvider,
  figmaEnabled,
  buildEnabled,
  defaultModel,
  isVercel,
}: {
  name: string | null;
  email: string | null;
  googleEnabled: boolean;
  facebookEnabled: boolean;
  githubEnabled: boolean;
  defaultProvider: string;
  figmaEnabled: boolean;
  buildEnabled: boolean;
  defaultModel: string;
  isVercel: boolean;
}) {
  const [models, setModels] = useState<ModelsResponse | null>(null);
  const [modelsLoading, setModelsLoading] = useState(true);
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [healthError, setHealthError] = useState(false);

  const loadModels = useCallback(async () => {
    setModelsLoading(true);
    try {
      setModels(await apiFetch<ModelsResponse>("/api/models"));
    } catch (error) {
      setModels({
        online: false,
        baseUrl: "—",
        defaultModel,
        models: [{ name: defaultModel, parameterSize: null, family: null }],
        error: error instanceof Error ? error.message : "Indisponible",
      });
    } finally {
      setModelsLoading(false);
    }
  }, [defaultModel]);

  useEffect(() => {
    void loadModels();
    fetch("/api/health", { headers: { Accept: "application/json" } })
      .then(async (response) => {
        if (!response.ok && response.status !== 503) throw new Error("health");
        setHealth((await response.json()) as HealthResponse);
      })
      .catch(() => setHealthError(true));
  }, [loadModels]);

  const initial = (name || email || "K")
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("")
    .slice(0, 2);

  return (
    <main className="container-page py-10 sm:py-12">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <div className="section-label">Configuration</div>
          <h1 className="mt-2 font-display text-3xl font-semibold tracking-tight sm:text-4xl">Paramètres du studio</h1>
          <p className="mt-2 max-w-lg text-[13px] leading-6 text-white/40">
            Vérifiez les services locaux, les fournisseurs d'authentification et le stockage de votre instance.
          </p>
        </div>
        <Link href="/dashboard" className="btn-secondary self-start px-4 py-2.5 text-[12px]">
          Retour au studio <ArrowUpRight className="h-3.5 w-3.5" />
        </Link>
      </div>

      <div className="mt-8 grid gap-4 lg:grid-cols-2">
        <section className="card p-6">
          <div className="flex items-center gap-4">
            <span className="flex h-14 w-14 items-center justify-center rounded-2xl border border-mint-400/20 bg-mint-400/10 font-display text-lg font-semibold text-mint-200">
              {initial}
            </span>
            <div className="min-w-0">
              <h2 className="truncate font-display text-lg font-semibold">{name || "Mon compte"}</h2>
              <p className="truncate text-[12px] text-white/35">{email}</p>
            </div>
          </div>
          <div className="mt-5 space-y-2.5 border-t border-white/[0.06] pt-5">
            <div className="flex items-center justify-between text-[11.5px]">
              <span className="inline-flex items-center gap-2 text-white/35"><Mail className="h-3.5 w-3.5" /> Authentification e-mail</span>
              <span className="inline-flex items-center gap-1 text-mint-300"><Check className="h-3 w-3" /> Active</span>
            </div>
            <div className="flex items-center justify-between text-[11.5px]">
              <span className="inline-flex items-center gap-2 text-white/35"><KeyRound className="h-3.5 w-3.5" /> Session</span>
              <span className="text-white/45">JWT · 30 jours</span>
            </div>
            <div className="flex items-center justify-between text-[11.5px]">
              <span className="inline-flex items-center gap-2 text-white/35"><LockKeyhole className="h-3.5 w-3.5" /> Mot de passe</span>
              <span className="text-white/45">bcrypt · 12 rounds</span>
            </div>
          </div>
        </section>

        <section className="card p-6">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-2">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl border border-gold/20 bg-gold/[0.07]">
                <Cpu className="h-4 w-4 text-gold" />
              </span>
              <div>
                <h2 className="font-display text-base font-semibold">Moteur Ollama</h2>
                <p className="text-[10px] text-white/30">Génération et réparation assistées</p>
              </div>
            </div>
            <button type="button" onClick={loadModels} disabled={modelsLoading} className="btn-ghost p-1.5" title="Actualiser">
              <RefreshCw className={cn("h-3.5 w-3.5", modelsLoading && "animate-spin")} />
            </button>
          </div>

          <div className="mt-5">
            <StatusLine
              ok={modelsLoading ? null : Boolean(models?.online)}
              label={modelsLoading ? "Vérification du service…" : models?.online ? "Ollama est en ligne" : "Ollama est hors ligne"}
              detail={
                modelsLoading
                  ? "Interrogation des modèles disponibles."
                  : models?.online
                    ? `${models.models.length} modèle(s) détecté(s) · ${models.baseUrl}`
                    : "Les gabarits déterministes restent disponibles sans modèle local."
              }
            />
            {models?.error && <p className="mt-2 rounded-lg border border-gold/15 bg-gold/[0.04] px-2.5 py-2 text-[10px] leading-4 text-gold/70">{models.error}</p>}
            {models && models.models.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-1.5">
                {models.models.map((item) => (
                  <span key={item.name} className="chip py-0.5 text-[9.5px]">
                    {item.name}
                    {item.parameterSize && <span className="text-white/25">{item.parameterSize}</span>}
                    {item.name === models.defaultModel && <span className="text-mint-300">défaut</span>}
                  </span>
                ))}
              </div>
            )}
            <div className="mt-4 rounded-xl border border-white/[0.06] bg-ink-950/60 p-3">
              <div className="text-[9px] font-semibold uppercase tracking-[0.14em] text-white/25">Préparer un modèle</div>
              <code className="mt-1.5 block font-mono text-[10px] leading-5 text-mint-200/60">
                ollama pull deepseek-coder
                <br />
                ollama pull qwen2.5-coder:7b
              </code>
            </div>
            <div className="mt-4 border-t border-white/[0.06] pt-4">
              <div className="flex items-center justify-between">
                <div className="text-[9px] font-semibold uppercase tracking-[0.14em] text-white/25">Fournisseurs IA</div>
                <span className="text-[9px] text-white/25">défaut : {defaultProvider}</span>
              </div>
              <div className="mt-2 space-y-1.5">
                {(models?.providers ?? []).map((provider) => (
                  <div key={provider.id} className="flex items-center justify-between gap-2 rounded-lg border border-white/[0.05] bg-white/[0.02] px-2.5 py-1.5">
                    <div className="min-w-0">
                      <div className="truncate text-[10.5px] text-white/60">{provider.label}</div>
                      <div className="truncate text-[8.5px] text-white/25">{provider.hint}</div>
                    </div>
                    <span className={cn("chip shrink-0 py-0 text-[8.5px]", provider.online ? "border-mint-400/20 text-mint-300" : "text-white/30")}>
                      {provider.online ? provider.defaultModel : "non configuré"}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="card p-6">
          <h2 className="font-display text-base font-semibold">Connexions externes</h2>
          <p className="mt-1 text-[10.5px] text-white/30">Les fournisseurs OAuth sont activés par variables d'environnement.</p>
          <div className="mt-5 space-y-3">
            <div className="flex items-center justify-between rounded-xl border border-white/[0.06] bg-white/[0.02] px-3.5 py-3">
              <span className="inline-flex items-center gap-2.5 text-[12px] text-white/70"><Chrome className="h-4 w-4 text-white/40" /> Google</span>
              <span className={cn("chip py-0.5 text-[9.5px]", googleEnabled ? "border-mint-400/20 text-mint-300" : "text-white/30")}>
                {googleEnabled ? "Activé" : "Non configuré"}
              </span>
            </div>
            <div className="flex items-center justify-between rounded-xl border border-white/[0.06] bg-white/[0.02] px-3.5 py-3">
              <span className="inline-flex items-center gap-2.5 text-[12px] text-white/70"><Facebook className="h-4 w-4 text-white/40" /> Facebook</span>
              <span className={cn("chip py-0.5 text-[9.5px]", facebookEnabled ? "border-mint-400/20 text-mint-300" : "text-white/30")}>
                {facebookEnabled ? "Activé" : "Non configuré"}
              </span>
            </div>
            <div className="flex items-center justify-between rounded-xl border border-white/[0.06] bg-white/[0.02] px-3.5 py-3">
              <span className="inline-flex items-center gap-2.5 text-[12px] text-white/70"><Github className="h-4 w-4 text-white/40" /> GitHub</span>
              <span className={cn("chip py-0.5 text-[9.5px]", githubEnabled ? "border-mint-400/20 text-mint-300" : "text-white/30")}>
                {githubEnabled ? "Activé" : "Non configuré"}
              </span>
            </div>
          </div>
          {(!googleEnabled || !facebookEnabled || !githubEnabled) && (
            <p className="mt-3 text-[10px] leading-4 text-white/25">
              Renseignez GOOGLE_CLIENT_ID / SECRET, FACEBOOK_CLIENT_ID / SECRET et GITHUB_CLIENT_ID / SECRET
              dans le fichier .env, puis redémarrez le serveur. Ajoutez l'URL de redirection dans chaque fournisseur.
            </p>
          )}
        </section>

        <section className="card p-6">
          <h2 className="font-display text-base font-semibold">Infrastructure</h2>
          <p className="mt-1 text-[10.5px] text-white/30">État de votre instance Kôloublé IA.</p>
          <div className="mt-5 space-y-4">
            <StatusLine
              ok={healthError ? false : health ? health.database === "ok" : null}
              label="Base de données Prisma"
              detail={
                healthError
                  ? "Impossible de joindre l'API de santé."
                  : health
                    ? health.database === "ok"
                      ? "Connexion établie. Les projets et fichiers sont persistés."
                      : "Base indisponible : vérifiez DATABASE_URL et les migrations."
                    : "Vérification en cours…"
              }
            />
            <StatusLine
              ok={!isVercel}
              label="Miroir local des projets"
              detail={
                isVercel
                  ? "Désactivé sur Vercel : la base reste la source de vérité pour l'export."
                  : "Les fichiers générés sont recopiés dans WORKSPACE_ROOT en plus de la base."
              }
            />
            <StatusLine
              ok
              label="Prototype sandboxé"
              detail="Aperçu HTML isolé : aucun réseau, aucun cookie, scripts inline uniquement."
            />
            <StatusLine
              ok={buildEnabled}
              label="Compilation Flutter"
              detail={
                buildEnabled
                  ? "Le studio peut lancer flutter pub get, build web et build APK sur cette machine."
                  : "Compilation désactivée sur cette instance (Vercel ou BUILD_ENABLED=false)."
              }
            />
            <StatusLine
              ok={figmaEnabled}
              label="Import Figma"
              detail={
                figmaEnabled
                  ? "Un jeton FIGMA_TOKEN est configuré pour lire les maquettes."
                  : "Ajoutez FIGMA_TOKEN pour importer une maquette Figma."
              }
            />
          </div>
          <div className="mt-4 flex flex-wrap gap-1.5">
            <span className="chip py-0.5 text-[9.5px]"><Database className="h-2.5 w-2.5" /> {health?.runtime ?? (isVercel ? "vercel" : "self-hosted")}</span>
            <span className="chip py-0.5 text-[9.5px]"><Cloud className="h-2.5 w-2.5" /> {health?.status ?? "…"}</span>
          </div>
        </section>

        <section className="card p-6 lg:col-span-2">
          <div className="flex items-center gap-2">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl border border-sky-400/20 bg-sky-400/[0.07]">
              <ShieldCheck className="h-4 w-4 text-sky-400" />
            </span>
            <div>
              <h2 className="font-display text-base font-semibold">Sécurité et bonnes pratiques</h2>
              <p className="text-[10px] text-white/30">Ce qui est appliqué à chaque génération.</p>
            </div>
          </div>
          <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { icon: LockKeyhole, title: "Fichiers isolés", body: "Chemins normalisés, extensions limitées, aucun fichier caché." },
              { icon: HardDrive, title: "Secrets exclus", body: "Aucune clé n'est écrite dans les projets ni dans les logs." },
              { icon: Sparkles, title: "RLS Supabase", body: "Chaque table est protégée par auth.uid() = user_id." },
              { icon: Server, title: "Livraison portable", body: "ZIP, Docker non-root et domaine propre sans dépendance au studio." },
            ].map((item) => {
              const Icon = item.icon;
              return (
                <div key={item.title} className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-3.5">
                  <Icon className="h-4 w-4 text-white/35" />
                  <div className="mt-2 text-[11.5px] font-medium text-white/70">{item.title}</div>
                  <p className="mt-1 text-[9.5px] leading-4 text-white/30">{item.body}</p>
                </div>
              );
            })}
          </div>
        </section>
      </div>
    </main>
  );
}
