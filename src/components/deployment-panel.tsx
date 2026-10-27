"use client";

import { useMemo, useState } from "react";
import {
  AlertTriangle,
  Check,
  CheckCircle2,
  Cloud,
  Copy,
  ExternalLink,
  FileCode2,
  Github,
  Globe2,
  Loader2,
  Rocket,
  Save,
  Server,
  ShieldCheck,
  XCircle,
} from "lucide-react";
import { apiFetch, ApiRequestError } from "@/lib/client-api";
import { cn } from "@/lib/cn";
import {
  DEPLOY_TARGETS,
  DEPLOY_TARGET_HINTS,
  DEPLOY_TARGET_LABELS,
  buildSettingsFor,
  deployConsoleUrl,
  dnsRecordsFor,
  repositoryUrlFor,
  type DeploymentState,
  type DeployTarget,
} from "@/lib/deployment";

const TARGET_ICONS: Record<DeployTarget, typeof Cloud> = {
  vercel: Cloud,
  netlify: Cloud,
  "github-pages": Github,
  "cloudflare-pages": Cloud,
  "self-hosted": Server,
};

const REQUIRED_ASSETS = [
  "vercel.json",
  "netlify.toml",
  "scripts/netlify-build.sh",
  ".github/workflows/deploy.yml",
  "DEPLOYMENT.md",
];

function CopyButton({ value, label = "Copier" }: { value: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(value);
          setCopied(true);
          setTimeout(() => setCopied(false), 1600);
        } catch {
          setCopied(false);
        }
      }}
      className="inline-flex items-center gap-1 rounded-md border border-white/10 bg-white/[0.03] px-1.5 py-0.5 text-[8.5px] text-white/45 transition hover:border-mint-400/30 hover:text-mint-200"
    >
      {copied ? <Check className="h-2.5 w-2.5" /> : <Copy className="h-2.5 w-2.5" />}
      {copied ? "Copié" : label}
    </button>
  );
}

function CommandBlock({ label, command }: { label: string; command: string }) {
  return (
    <div className="rounded-xl border border-white/[0.07] bg-ink-950/70 p-2.5">
      <div className="flex items-center justify-between gap-2">
        <span className="text-[8.5px] font-semibold uppercase tracking-[0.14em] text-white/30">{label}</span>
        <CopyButton value={command} />
      </div>
      <pre className="mt-1.5 overflow-x-auto whitespace-pre-wrap break-words font-mono text-[9.5px] leading-4 text-mint-100/70">
        {command}
      </pre>
    </div>
  );
}

function StatusPill({ status }: { status: string }) {
  if (status === "live") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-mint-400/10 px-2 py-0.5 text-[9px] font-medium text-mint-200">
        <CheckCircle2 className="h-3 w-3" /> En ligne
      </span>
    );
  }
  if (status === "error") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-red-400/10 px-2 py-0.5 text-[9px] font-medium text-red-200">
        <XCircle className="h-3 w-3" /> À corriger
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-white/[0.05] px-2 py-0.5 text-[9px] font-medium text-white/45">
      <Rocket className="h-3 w-3" /> À déployer
    </span>
  );
}

export function DeploymentPanel({
  projectId,
  projectName,
  files,
  initial,
}: {
  projectId: string;
  projectName: string;
  files: string[];
  initial: DeploymentState;
}) {
  const [deployment, setDeployment] = useState<DeploymentState>(initial);
  const [target, setTarget] = useState<DeployTarget>(initial.target);
  const [repoName, setRepoName] = useState(initial.repoName);
  const [repositoryUrl, setRepositoryUrl] = useState(initial.repositoryUrl ?? "");
  const [customDomain, setCustomDomain] = useState(initial.customDomain ?? "");
  const [productionUrl, setProductionUrl] = useState(initial.productionUrl ?? "");
  const [saving, setSaving] = useState(false);
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const present = useMemo(() => new Set(files), [files]);
  const assets = useMemo(
    () => [...REQUIRED_ASSETS, ...(customDomain.trim() ? ["web/CNAME"] : [])],
    [customDomain],
  );
  const settings = buildSettingsFor(target);
  const consoleUrl = deployConsoleUrl(target, repositoryUrl.trim() || null, repoName.trim());
  const dnsRecords = dnsRecordsFor(target, customDomain.trim() || null);
  const remoteUrl = repositoryUrlFor(repositoryUrl.trim() || null, repoName.trim() || "application");
  const gitCommands = [
    "git init",
    "git add .",
    'git commit -m "Initial commit"',
    "git branch -M main",
    `git remote add origin ${remoteUrl}`,
    "git push -u origin main",
  ].join("\n");

  async function persist(): Promise<DeploymentState | null> {
    setSaving(true);
    setError(null);
    setNotice(null);
    try {
      const data = await apiFetch<{ deployment: DeploymentState }>(
        `/api/projects/${projectId}/deployment`,
        {
          method: "PUT",
          body: JSON.stringify({
            target,
            repoName: repoName.trim(),
            repositoryUrl: repositoryUrl.trim() || null,
            customDomain: customDomain.trim().toLowerCase() || null,
            productionUrl: productionUrl.trim() || null,
          }),
        },
      );
      setDeployment(data.deployment);
      setRepoName(data.deployment.repoName);
      setNotice("Configuration enregistrée.");
      return data.deployment;
    } catch (cause) {
      setError(cause instanceof ApiRequestError ? cause.message : "Enregistrement impossible.");
      return null;
    } finally {
      setSaving(false);
    }
  }

  async function check() {
    setChecking(true);
    setError(null);
    setNotice(null);
    try {
      const saved = await persist();
      if (!saved) return;
      const data = await apiFetch<{
        deployment: DeploymentState;
        check: { ok: boolean; message: string };
      }>(`/api/projects/${projectId}/deployment/check`, { method: "POST" });
      setDeployment(data.deployment);
      setNotice(data.check.message);
      if (!data.check.ok) setError(data.check.message);
    } catch (cause) {
      setError(cause instanceof ApiRequestError ? cause.message : "Vérification impossible.");
    } finally {
      setChecking(false);
    }
  }

  return (
    <div className="max-h-[620px] space-y-3 overflow-y-auto p-3">
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-[10.5px] font-semibold text-white/75">{projectName}</p>
          <p className="truncate font-mono text-[8.5px] text-white/25">{repoName || "depot"}</p>
        </div>
        <StatusPill status={deployment.status} />
      </div>

      {deployment.lastCheckAt && (
        <p className="text-[8.5px] leading-4 text-white/30">
          Dernière vérification :{" "}
          <span suppressHydrationWarning>{new Date(deployment.lastCheckAt).toLocaleString("fr-FR")}</span>
          {deployment.checkMessage ? ` — ${deployment.checkMessage}` : ""}
        </p>
      )}

      <div className="rounded-xl border border-mint-400/15 bg-mint-400/[0.04] p-2.5">
        <div className="flex items-center gap-1.5 text-[9.5px] font-semibold text-mint-200">
          <ShieldCheck className="h-3 w-3" /> GitHub → hébergeur, sans secret dans le code
        </div>
        <p className="mt-1 text-[9px] leading-4 text-white/35">
          Le dépôt contient les configurations Vercel, Netlify, Cloudflare, GitHub Pages
          et Docker. Les clés Supabase restent dans les variables d'environnement.
        </p>
      </div>

      <section>
        <h3 className="text-[9.5px] font-semibold uppercase tracking-[0.14em] text-white/35">1 · Dépôt GitHub</h3>
        <div className="mt-1.5 grid gap-2">
          <label className="block">
            <span className="text-[9px] text-white/30">Nom du dépôt</span>
            <input
              value={repoName}
              onChange={(event) => setRepoName(event.target.value)}
              maxLength={80}
              placeholder="gestion-projets"
              className="input mt-1 py-1.5 text-[11px]"
            />
          </label>
          <label className="block">
            <span className="text-[9px] text-white/30">URL du dépôt (une fois créé)</span>
            <input
              value={repositoryUrl}
              onChange={(event) => setRepositoryUrl(event.target.value)}
              placeholder="https://github.com/compte/depot"
              className="input mt-1 py-1.5 text-[11px]"
            />
          </label>
        </div>
        <div className="mt-2">
          <CommandBlock label="Publication initiale" command={gitCommands} />
        </div>
        <p className="mt-1.5 text-[8.5px] leading-4 text-white/30">
          Ou <span className="font-mono text-white/45">gh repo create {repoName || "depot"} --public --source=. --remote=origin --push</span>
        </p>
      </section>

      <section>
        <h3 className="text-[9.5px] font-semibold uppercase tracking-[0.14em] text-white/35">2 · Hébergeur</h3>
        <div className="mt-1.5 grid grid-cols-2 gap-1.5">
          {DEPLOY_TARGETS.map((value) => {
            const Icon = TARGET_ICONS[value];
            const active = target === value;
            return (
              <button
                key={value}
                type="button"
                onClick={() => setTarget(value)}
                aria-pressed={active}
                className={cn(
                  "flex items-center gap-1.5 rounded-xl border px-2 py-1.5 text-left text-[9.5px] transition",
                  active
                    ? "border-mint-400/40 bg-mint-400/[0.07] text-mint-100"
                    : "border-white/[0.07] bg-white/[0.02] text-white/45 hover:border-white/15",
                )}
              >
                <Icon className="h-3 w-3 shrink-0" />
                <span className="truncate">{DEPLOY_TARGET_LABELS[value]}</span>
              </button>
            );
          })}
        </div>
        <p className="mt-1.5 text-[9px] leading-4 text-white/35">{DEPLOY_TARGET_HINTS[target]}</p>

        <div className="mt-2 space-y-1 rounded-xl border border-white/[0.06] bg-white/[0.02] p-2.5">
          <div className="flex items-center justify-between gap-2 text-[8.5px]">
            <span className="text-white/30">Build</span>
            <span className="truncate font-mono text-white/50">{settings.build}</span>
          </div>
          <div className="flex items-center justify-between gap-2 text-[8.5px]">
            <span className="text-white/30">Sortie</span>
            <span className="truncate font-mono text-white/50">{settings.output}</span>
          </div>
          <div className="flex items-center justify-between gap-2 text-[8.5px]">
            <span className="text-white/30">Variables</span>
            <span className="truncate font-mono text-white/50">{settings.env.join(", ")}</span>
          </div>
        </div>

        {consoleUrl && (
          <a
            href={consoleUrl}
            target="_blank"
            rel="noreferrer noopener"
            className="btn-secondary mt-2 w-full justify-center px-3 py-1.5 text-[9.5px]"
          >
            <ExternalLink className="h-3 w-3" /> Ouvrir {DEPLOY_TARGET_LABELS[target]}
          </a>
        )}
      </section>

      <section>
        <h3 className="text-[9.5px] font-semibold uppercase tracking-[0.14em] text-white/35">3 · Domaine personnalisé</h3>
        <div className="mt-1.5 grid gap-2">
          <input
            value={customDomain}
            onChange={(event) => setCustomDomain(event.target.value)}
            placeholder="app.votre-domaine.ci"
            className="input py-1.5 text-[11px]"
            aria-label="Domaine personnalisé"
          />
          <input
            value={productionUrl}
            onChange={(event) => setProductionUrl(event.target.value)}
            placeholder="https://app.votre-domaine.ci (optionnel)"
            className="input py-1.5 text-[11px]"
            aria-label="URL de production"
          />
        </div>
        {dnsRecords.length > 0 ? (
          <div className="mt-2 overflow-hidden rounded-xl border border-white/[0.06]">
            <table className="w-full text-left text-[8.5px]">
              <thead className="bg-white/[0.03] text-white/30">
                <tr>
                  <th className="px-2 py-1 font-medium">Type</th>
                  <th className="px-2 py-1 font-medium">Nom</th>
                  <th className="px-2 py-1 font-medium">Valeur</th>
                </tr>
              </thead>
              <tbody className="text-white/45">
                {dnsRecords.map((record) => (
                  <tr key={`${record.type}-${record.name}-${record.value}`} className="border-t border-white/[0.04]">
                    <td className="px-2 py-1 font-mono">{record.type}</td>
                    <td className="px-2 py-1 font-mono">{record.name}</td>
                    <td className="px-2 py-1 font-mono break-all">{record.value}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="mt-1.5 text-[8.5px] leading-4 text-white/25">
            Renseignez un domaine pour afficher les enregistrements DNS de l'hébergeur choisi.
          </p>
        )}
        <p className="mt-1.5 text-[8.5px] leading-4 text-white/25">
          GitHub Pages utilise web/CNAME ; relancez la génération après avoir enregistré le domaine.
        </p>
      </section>

      <section>
        <h3 className="text-[9.5px] font-semibold uppercase tracking-[0.14em] text-white/35">4 · Fichiers de déploiement</h3>
        <div className="mt-1.5 space-y-1">
          {assets.map((asset) => {
            const ok = present.has(asset);
            return (
              <div key={asset} className="flex items-center justify-between gap-2 rounded-lg bg-white/[0.02] px-2 py-1">
                <span className="truncate font-mono text-[8.5px] text-white/40">{asset}</span>
                {ok ? (
                  <CheckCircle2 className="h-3 w-3 shrink-0 text-mint-400/80" />
                ) : (
                  <AlertTriangle className="h-3 w-3 shrink-0 text-gold/70" />
                )}
              </div>
            );
          })}
        </div>
        {!present.has("DEPLOYMENT.md") && files.length > 0 && (
          <p className="mt-1.5 text-[8.5px] leading-4 text-gold/60">
            Relancez la génération pour produire les fichiers de déploiement manquants.
          </p>
        )}
      </section>

      {(error || notice) && (
        <div
          role="status"
          className={cn(
            "rounded-xl border px-2.5 py-2 text-[9px] leading-4",
            error
              ? "border-red-400/20 bg-red-400/[0.06] text-red-200/90"
              : "border-mint-400/20 bg-mint-400/[0.06] text-mint-100/90",
          )}
        >
          {error ?? notice}
        </div>
      )}

      <div className="flex flex-wrap gap-2 pt-1">
        <button
          type="button"
          onClick={persist}
          disabled={saving || checking}
          className="btn-primary flex-1 justify-center px-3 py-2 text-[9.5px]"
        >
          {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />}
          Enregistrer
        </button>
        <button
          type="button"
          onClick={check}
          disabled={saving || checking || (!customDomain.trim() && !productionUrl.trim())}
          className="btn-secondary flex-1 justify-center px-3 py-2 text-[9.5px]"
        >
          {checking ? <Loader2 className="h-3 w-3 animate-spin" /> : <Globe2 className="h-3 w-3" />}
          Vérifier en ligne
        </button>
      </div>

      <div className="flex flex-wrap gap-2">
        <a href={`/api/projects/${projectId}/export`} className="btn-secondary flex-1 justify-center px-3 py-2 text-[9.5px]">
          <FileCode2 className="h-3 w-3" /> Télécharger le ZIP
        </a>
      </div>

      <p className="flex items-start gap-1.5 pt-1 text-[8.5px] leading-4 text-white/20">
        <Server className="mt-0.5 h-2.5 w-2.5 shrink-0" />
        Le guide détaillé (DNS, TLS, secrets CI, dépannage) est dans DEPLOYMENT.md, généré avec le projet.
      </p>
    </div>
  );
}
