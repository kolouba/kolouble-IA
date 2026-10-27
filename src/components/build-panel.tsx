"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  AlertCircle,
  CheckCircle2,
  Download,
  Globe2,
  Hammer,
  Loader2,
  RefreshCw,
  Smartphone,
  Terminal,
} from "lucide-react";
import { cn } from "@/lib/cn";

interface BuildArtifact {
  name: string;
  bytes: number;
  url: string;
  createdAt: string;
}

interface BuildReport {
  ok: boolean;
  target: "web" | "apk" | "all";
  logs: string[];
  artifacts: BuildArtifact[];
  durationMs: number;
  error?: string;
  flutterVersion?: string | null;
}

interface Capability {
  enabled: boolean;
  available: boolean;
  version: string | null;
  error: string | null;
  artifacts: BuildArtifact[];
}

function formatBytes(bytes: number): string {
  if (bytes >= 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(2)} Mo`;
  if (bytes >= 1024) return `${(bytes / 1024).toFixed(0)} Ko`;
  return `${bytes} o`;
}

function formatDuration(ms: number): string {
  const seconds = Math.round(ms / 1000);
  if (seconds < 60) return `${seconds} s`;
  const minutes = Math.floor(seconds / 60);
  return `${minutes} min ${seconds % 60} s`;
}

const TARGETS: Array<{ id: "web" | "apk" | "all"; label: string; icon: typeof Globe2; hint: string }> = [
  { id: "web", label: "Web", icon: Globe2, hint: "flutter build web --release" },
  { id: "apk", label: "Android", icon: Smartphone, hint: "flutter build apk --debug" },
  { id: "all", label: "Web + APK", icon: Hammer, hint: "Les deux artefacts" },
];

export function BuildPanel({ projectId }: { projectId: string }) {
  const [capability, setCapability] = useState<Capability | null>(null);
  const [target, setTarget] = useState<"web" | "apk" | "all">("web");
  const [running, setRunning] = useState(false);
  const [report, setReport] = useState<BuildReport | null>(null);
  const [error, setError] = useState<string | null>(null);
  const logRef = useRef<HTMLPreElement>(null);

  const loadCapability = useCallback(async () => {
    try {
      const response = await fetch(`/api/projects/${projectId}/build`, {
        headers: { Accept: "application/json" },
      });
      const data = (await response.json().catch(() => null)) as (Capability & { error?: string }) | null;
      if (!response.ok) throw new Error(data?.error || "État de compilation indisponible.");
      if (data) setCapability(data);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "État de compilation indisponible.");
    }
  }, [projectId]);

  useEffect(() => {
    void loadCapability();
  }, [loadCapability]);

  useEffect(() => {
    logRef.current?.scrollTo({ top: logRef.current.scrollHeight });
  }, [report]);

  async function startBuild() {
    if (running) return;
    setRunning(true);
    setError(null);
    setReport(null);
    try {
      const response = await fetch(`/api/projects/${projectId}/build`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({ target }),
      });
      const data = (await response.json().catch(() => null)) as (BuildReport & { error?: string }) | null;
      if (!data) throw new Error(`Compilation échouée (${response.status}).`);
      if (!response.ok && !data.logs) {
        throw new Error(data.error || `Compilation échouée (${response.status}).`);
      }
      setReport(data);
      if (!data.ok) setError(data.error || "La compilation a échoué. Consultez les journaux.");
      await loadCapability();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Compilation impossible.");
    } finally {
      setRunning(false);
    }
  }

  const artifacts = report?.artifacts.length ? report.artifacts : capability?.artifacts ?? [];
  const unavailable = capability && (!capability.enabled || !capability.available);

  return (
    <div className="space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 text-[11px] font-semibold text-white/70">
            <Hammer className="h-3.5 w-3.5 text-mint-300" /> Compilation Flutter
          </div>
          <p className="mt-1 text-[10px] leading-4 text-white/30">
            Produit le site web et l'APK Android directement dans l'espace de travail local.
          </p>
        </div>
        <button
          type="button"
          onClick={() => void loadCapability()}
          className="rounded-lg p-1.5 text-white/25 transition hover:bg-white/[0.04] hover:text-white/60"
          aria-label="Actualiser l'état de compilation"
        >
          <RefreshCw className="h-3.5 w-3.5" />
        </button>
      </div>

      <div className="flex items-center gap-2 rounded-xl border border-white/[0.06] bg-white/[0.02] px-3 py-2 text-[10px] text-white/40">
        <span
          className={cn(
            "status-dot",
            !capability ? "bg-white/25" : capability.available ? "bg-mint-400" : "bg-gold/80",
          )}
        />
        {!capability ? (
          "Vérification de Flutter…"
        ) : capability.available ? (
          <span className="truncate">{capability.version ?? "Flutter détecté"}</span>
        ) : (
          <span className="truncate">{capability.error ?? "Flutter indisponible."}</span>
        )}
      </div>

      <div className="grid grid-cols-3 gap-1.5">
        {TARGETS.map((item) => {
          const Icon = item.icon;
          const active = target === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => setTarget(item.id)}
              disabled={running}
              title={item.hint}
              className={cn(
                "flex flex-col items-center gap-1 rounded-xl border px-2 py-2 text-[10px] transition disabled:opacity-50",
                active
                  ? "border-mint-400/40 bg-mint-400/[0.07] text-mint-200"
                  : "border-white/[0.07] bg-white/[0.02] text-white/40 hover:border-white/15",
              )}
            >
              <Icon className="h-3.5 w-3.5" />
              {item.label}
            </button>
          );
        })}
      </div>

      <button
        type="button"
        onClick={() => void startBuild()}
        disabled={running || Boolean(unavailable)}
        className="btn-primary w-full justify-center py-2.5 text-[12px]"
      >
        {running ? (
          <>
            <Loader2 className="h-3.5 w-3.5 animate-spin" /> Compilation en cours…
          </>
        ) : (
          <>
            <Hammer className="h-3.5 w-3.5" /> Lancer la compilation
          </>
        )}
      </button>

      {error && (
        <div className="flex items-start gap-2 rounded-xl border border-gold/25 bg-gold/[0.05] px-3 py-2 text-[10.5px] leading-4 text-gold/80">
          <AlertCircle className="mt-0.5 h-3 w-3 shrink-0" /> {error}
        </div>
      )}

      {report?.ok && (
        <div className="flex items-start gap-2 rounded-xl border border-mint-400/20 bg-mint-400/[0.05] px-3 py-2 text-[10.5px] leading-4 text-mint-200/80">
          <CheckCircle2 className="mt-0.5 h-3 w-3 shrink-0" />
          Compilation réussie en {formatDuration(report.durationMs)}.
        </div>
      )}

      {artifacts.length > 0 && (
        <div className="space-y-1.5">
          <div className="text-[9px] uppercase tracking-[0.14em] text-white/25">Artefacts</div>
          {artifacts.map((artifact) => (
            <a
              key={artifact.name}
              href={artifact.url}
              className="flex items-center justify-between gap-2 rounded-xl border border-white/[0.07] bg-white/[0.02] px-3 py-2 text-[10.5px] text-white/55 transition hover:border-mint-400/25 hover:text-mint-200"
            >
              <span className="truncate">{artifact.name}</span>
              <span className="flex shrink-0 items-center gap-2 text-white/30">
                {formatBytes(artifact.bytes)}
                <Download className="h-3 w-3" />
              </span>
            </a>
          ))}
        </div>
      )}

      {report && report.logs.length > 0 && (
        <div>
          <div className="mb-1 flex items-center gap-1.5 text-[9px] uppercase tracking-[0.14em] text-white/25">
            <Terminal className="h-2.5 w-2.5" /> Journaux
          </div>
          <pre
            ref={logRef}
            className="max-h-56 overflow-auto rounded-xl border border-white/[0.06] bg-ink-950/70 px-2.5 py-2 font-mono text-[9.5px] leading-4 whitespace-pre-wrap text-white/45"
          >
            {report.logs.join("\n")}
          </pre>
        </div>
      )}
    </div>
  );
}
