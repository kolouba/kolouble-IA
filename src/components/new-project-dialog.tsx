"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  Check,
  Cpu,
  Figma,
  FileUp,
  Github,
  Globe2,
  Layers,
  Loader2,
  Mic,
  MicOff,
  Sparkles,
  Wand2,
  X,
  Zap,
} from "lucide-react";
import { apiFetch, ApiRequestError } from "@/lib/client-api";
import { cn } from "@/lib/cn";
import { DEPLOY_TARGETS, DEPLOY_TARGET_LABELS, type DeployTarget } from "@/lib/deployment";
import { MARKETPLACE_TEMPLATES } from "@/lib/templates";

type Mode = "scaffold" | "standard" | "max";

const EXAMPLES = [
  "Crée une application de gestion de projets avec Android, iPhone, Web, Windows, mode offline et synchronisation cloud",
  "Une application CRM pour une ONG avec contacts, dons, activités terrain et rapports mensuels",
  "Application de facturation avec clients, factures, paiements et export des impayés",
  "Gestion de stock multi-boutiques avec produits, fournisseurs, inventaires et alertes",
];

const MODES: Array<{ id: Mode; title: string; description: string; icon: typeof Cpu; badge?: string }> = [
  {
    id: "scaffold",
    title: "Gabarits",
    description: "Rapide, sans Ollama. Projet complet garanti.",
    icon: Layers,
  },
  {
    id: "standard",
    title: "Hybride",
    description: "IA pour l'identité et les contenus + gabarits.",
    icon: Wand2,
    badge: "Conseillé",
  },
  {
    id: "max",
    title: "IA renforcée",
    description: "Documentation IA et auto-réparation des fichiers.",
    icon: Zap,
  },
];

interface ProviderOption {
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
  models: Array<{ name: string }>;
  defaultModel: string;
  providers?: ProviderOption[];
  defaultProvider?: string;
  selectedProvider?: string;
  error?: string;
}

interface SpeechResultLike {
  resultIndex: number;
  results: ArrayLike<ArrayLike<{ transcript: string }>>;
}

interface SpeechRecognitionLike {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onresult: ((event: SpeechResultLike) => void) | null;
  onerror: (() => void) | null;
  onend: (() => void) | null;
  start(): void;
  stop(): void;
}

type SpeechRecognitionCtor = new () => SpeechRecognitionLike;

export function NewProjectDialog({
  open,
  onClose,
  initialPrompt = "",
  initialTemplateKey = null,
  defaultModel,
  figmaEnabled = false,
}: {
  open: boolean;
  onClose: () => void;
  initialPrompt?: string;
  initialTemplateKey?: string | null;
  defaultModel: string;
  figmaEnabled?: boolean;
}) {
  const router = useRouter();
  const [prompt, setPrompt] = useState(initialPrompt);
  const [name, setName] = useState("");
  const [mode, setMode] = useState<Mode>("standard");
  const [provider, setProvider] = useState("ollama");
  const [providerOptions, setProviderOptions] = useState<ProviderOption[]>([]);
  const [model, setModel] = useState(defaultModel);
  const [templateKey, setTemplateKey] = useState(initialTemplateKey ?? "");
  const [saas, setSaas] = useState(false);
  const [target, setTarget] = useState<DeployTarget>("vercel");
  const [repoName, setRepoName] = useState("");
  const [customDomain, setCustomDomain] = useState("");
  const [modelOptions, setModelOptions] = useState<string[]>([defaultModel]);
  const [modelsLoading, setModelsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [listening, setListening] = useState(false);
  const [importing, setImporting] = useState<"word" | "figma" | null>(null);
  const [figmaUrl, setFigmaUrl] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const selectedTemplate = templateKey ? MARKETPLACE_TEMPLATES.find((item) => item.key === templateKey) ?? null : null;
  const activeProvider = providerOptions.find((item) => item.id === provider) ?? null;

  useEffect(() => {
    if (!open) return;
    const template = initialTemplateKey
      ? MARKETPLACE_TEMPLATES.find((item) => item.key === initialTemplateKey) ?? null
      : null;
    setTemplateKey(template?.key ?? "");
    setPrompt(template?.prompt ?? initialPrompt);
    setName("");
    setSaas(false);
    setError(null);
  }, [open, initialPrompt, initialTemplateKey]);

  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const timer = setTimeout(() => textareaRef.current?.focus(), 60);
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !pending) onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = previous;
      clearTimeout(timer);
      window.removeEventListener("keydown", onKey);
    };
  }, [open, onClose, pending]);

  useEffect(() => {
    if (!open) return;
    const controller = new AbortController();
    setModelsLoading(true);
    apiFetch<ModelsResponse>("/api/models", { signal: controller.signal })
      .then((data) => {
        const options = data.providers ?? [];
        setProviderOptions(options);
        const preferred =
          options.find((item) => item.id === data.selectedProvider && item.enabled) ??
          options.find((item) => item.enabled) ??
          options[0] ??
          null;
        if (preferred) {
          setProvider(preferred.id);
          const names = preferred.models.length > 0 ? preferred.models : [preferred.defaultModel];
          setModelOptions(names);
          setModel(preferred.defaultModel);
        } else {
          const names = data.models.map((item) => item.name).filter(Boolean);
          if (names.length > 0) {
            setModelOptions(names);
            setModel((current) => (names.includes(current) ? current : names[0]!));
          }
        }
      })
      .catch(() => {
        setProviderOptions([]);
      })
      .finally(() => {
        if (!controller.signal.aborted) setModelsLoading(false);
      });
    return () => controller.abort();
  }, [open]);

  useEffect(() => {
    if (open) return;
    try {
      recognitionRef.current?.stop();
    } catch {
      // déjà arrêtée
    }
    recognitionRef.current = null;
    setListening(false);
  }, [open]);

  useEffect(() => {
    return () => {
      try {
        recognitionRef.current?.stop();
      } catch {
        // déjà arrêtée
      }
    };
  }, []);

  function chooseProvider(id: string) {
    setProvider(id);
    const info = providerOptions.find((item) => item.id === id);
    if (!info) return;
    const names = info.models.length > 0 ? info.models : [info.defaultModel];
    setModelOptions(names);
    setModel(info.defaultModel);
  }

  function chooseTemplate(key: string) {
    setTemplateKey(key);
    const template = MARKETPLACE_TEMPLATES.find((item) => item.key === key);
    if (template) {
      setPrompt(template.prompt);
      setError(null);
    }
  }

  function stopDictation() {
    try {
      recognitionRef.current?.stop();
    } catch {
      // reconnaissance déjà arrêtée
    }
    recognitionRef.current = null;
    setListening(false);
  }

  function toggleDictation() {
    if (listening) {
      stopDictation();
      return;
    }
    const speechWindow = window as Window & {
      SpeechRecognition?: SpeechRecognitionCtor;
      webkitSpeechRecognition?: SpeechRecognitionCtor;
    };
    const Ctor = speechWindow.SpeechRecognition ?? speechWindow.webkitSpeechRecognition;
    if (!Ctor) {
      setError("La dictée vocale n'est pas disponible dans ce navigateur. Utilisez Chrome ou Edge.");
      return;
    }
    setError(null);
    const recognition = new Ctor();
    recognition.lang = "fr-FR";
    recognition.continuous = true;
    recognition.interimResults = false;
    recognition.onresult = (event) => {
      let transcript = "";
      for (let index = event.resultIndex; index < event.results.length; index += 1) {
        const alternative = event.results[index]?.[0];
        if (alternative?.transcript) transcript += alternative.transcript;
      }
      const clean = transcript.replace(/\s+/g, " ").trim();
      if (!clean) return;
      setPrompt((current) => `${current.trim()}${current.trim() ? " " : ""}${clean}`.slice(0, 4000));
    };
    recognition.onerror = () => {
      recognitionRef.current = null;
      setListening(false);
      setError("La dictée s'est interrompue. Vérifiez l'accès au microphone.");
    };
    recognition.onend = () => {
      recognitionRef.current = null;
      setListening(false);
    };
    try {
      recognition.start();
      recognitionRef.current = recognition;
      setListening(true);
    } catch {
      setError("Impossible de démarrer la dictée.");
    }
  }

  async function importWord(file: File) {
    setError(null);
    setImporting("word");
    try {
      const body = new FormData();
      body.append("file", file);
      const response = await fetch("/api/import/word", {
        method: "POST",
        body,
        headers: { Accept: "application/json" },
      });
      const data = (await response.json().catch(() => null)) as
        | { text?: string; error?: string; truncated?: boolean }
        | null;
      if (!response.ok || !data?.text) {
        throw new Error(data?.error || "Import Word impossible.");
      }
      setPrompt(data.text.slice(0, 4000));
      if (data.truncated) {
        setError("Document tronqué à 4 000 caractères pour tenir dans le champ.");
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Import Word impossible.");
    } finally {
      setImporting(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  async function importFigma() {
    const url = figmaUrl.trim();
    if (!url) {
      setError("Collez un lien Figma (fichier ou cadre).");
      return;
    }
    setError(null);
    setImporting("figma");
    try {
      const result = await apiFetch<{ prompt: string; name?: string }>("/api/import/figma", {
        method: "POST",
        body: JSON.stringify({ url }),
      });
      setPrompt(result.prompt.slice(0, 4000));
      if (result.name && !name.trim()) setName(result.name);
    } catch (cause) {
      setError(cause instanceof ApiRequestError ? cause.message : "Import Figma impossible.");
    } finally {
      setImporting(null);
    }
  }

  if (!open) return null;

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    const cleanPrompt = prompt.trim();
    if (cleanPrompt.length < 15) {
      setError("Décrivez votre application en 15 caractères minimum.");
      textareaRef.current?.focus();
      return;
    }
    setPending(true);
    try {
      const result = await apiFetch<{ project: { id: string } }>("/api/projects", {
        method: "POST",
        body: JSON.stringify({
          prompt: cleanPrompt,
          name: name.trim() || undefined,
          mode,
          model,
          provider,
          templateKey: templateKey || undefined,
          saas,
          deployment: {
            target,
            repoName: repoName.trim() || undefined,
            customDomain: customDomain.trim() || undefined,
          },
        }),
      });
      router.push(`/projects/${result.project.id}?generate=1`);
    } catch (cause) {
      setError(cause instanceof ApiRequestError ? cause.message : "Impossible de créer le projet.");
      setPending(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-ink-950/80 px-4 py-6 backdrop-blur-md sm:items-center sm:py-10"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !pending) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="new-project-title"
        className="card border-gradient relative w-full max-w-2xl overflow-hidden bg-ink-900/95 animate-in"
      >
        <div className="flex items-start justify-between border-b border-white/[0.06] px-6 py-5">
          <div>
            <div className="flex items-center gap-2 text-mint-300">
              <Sparkles className="h-4 w-4" />
              <span className="text-[10px] font-semibold uppercase tracking-[0.2em]">Nouvelle application</span>
            </div>
            <h2 id="new-project-title" className="mt-2 font-display text-xl font-semibold tracking-tight">
              Décrivez ce que vous voulez construire.
            </h2>
            <p className="mt-1.5 text-[12px] text-white/40">
              Les six agents s'occupent de l'architecture, du code, de la base et du déploiement.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={pending}
            className="btn-ghost -mr-2 -mt-1 p-2"
            aria-label="Fermer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="max-h-[calc(100vh-14rem)] space-y-5 overflow-y-auto px-6 py-5">
          <div>
            <label htmlFor="project-template" className="label flex items-center gap-1.5">
              <Layers className="h-3 w-3" /> Modèle métier
              <span className="normal-case tracking-normal text-white/20">(optionnel)</span>
            </label>
            <div className="grid gap-2 sm:grid-cols-[1fr_auto]">
              <select
                id="project-template"
                value={templateKey}
                onChange={(event) => chooseTemplate(event.target.value)}
                className="input appearance-none bg-ink-950/60"
              >
                <option value="">Application libre — décrivez votre besoin ci-dessous</option>
                {MARKETPLACE_TEMPLATES.map((template) => (
                  <option key={template.key} value={template.key}>
                    {template.name} · {template.category}
                  </option>
                ))}
              </select>
              <label
                className={cn(
                  "flex cursor-pointer items-center gap-2 rounded-xl border px-3 py-2.5 text-[11px] transition",
                  saas
                    ? "border-gold/35 bg-gold/[0.07] text-gold/90"
                    : "border-white/[0.07] bg-white/[0.02] text-white/40 hover:border-white/15",
                )}
              >
                <input
                  type="checkbox"
                  checked={saas}
                  onChange={(event) => setSaas(event.target.checked)}
                  className="h-3.5 w-3.5 accent-[#d8b26a]"
                />
                Mode SaaS
              </label>
            </div>
            {selectedTemplate && (
              <div className="mt-2.5 rounded-2xl border border-white/[0.07] bg-white/[0.02] px-3.5 py-3">
                <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-white/50">
                  <span className="font-semibold text-white/80">{selectedTemplate.name}</span>
                  <span className="text-white/20">·</span>
                  <span>{selectedTemplate.tagline}</span>
                </div>
                <div className="mt-1.5 flex flex-wrap gap-1">
                  {selectedTemplate.entities.slice(0, 6).map((entity) => (
                    <span key={entity} className="rounded-full bg-white/[0.04] px-2 py-0.5 text-[9.5px] text-white/35">
                      {entity}
                    </span>
                  ))}
                </div>
              </div>
            )}
            <p className="mt-2 text-[10px] leading-4 text-white/30">
              Le mode SaaS ajoute les organisations, abonnements, paiements Stripe / Mobile Money et la facturation multi-tenant.
            </p>
          </div>

          <div>
            <div className="flex items-center justify-between gap-2">
              <label htmlFor="project-prompt" className="label">Votre idée</label>
              <div className="mb-2 flex items-center gap-2">
                <button
                  type="button"
                  onClick={toggleDictation}
                  aria-pressed={listening}
                  className={cn(
                    "inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[10px] transition",
                    listening
                      ? "border-red-400/40 bg-red-400/[0.08] text-red-200"
                      : "border-white/[0.07] bg-white/[0.02] text-white/40 hover:border-mint-400/30 hover:text-mint-200",
                  )}
                >
                  {listening ? <MicOff className="h-3 w-3" /> : <Mic className="h-3 w-3" />}
                  {listening ? "Arrêter" : "Dicter"}
                </button>
                <span className={cn("text-[10px]", prompt.length > 3800 ? "text-gold" : "text-white/25")}>
                  {prompt.length} / 4000
                </span>
              </div>
            </div>
            <textarea
              ref={textareaRef}
              id="project-prompt"
              value={prompt}
              onChange={(event) => setPrompt(event.target.value)}
              maxLength={4000}
              rows={4}
              placeholder="Ex. Une application de gestion de projets avec Android, iPhone, Web, Windows, mode offline et synchronisation cloud…"
              className="textarea bg-ink-950/60 text-[13.5px]"
            />
            <div className="mt-2.5 flex flex-wrap gap-1.5">
              {EXAMPLES.map((example, index) => (
                <button
                  key={example}
                  type="button"
                  onClick={() => {
                    setPrompt(example);
                    setError(null);
                  }}
                  className="rounded-full border border-white/[0.07] bg-white/[0.02] px-2.5 py-1 text-[10.5px] text-white/40 transition hover:border-mint-400/30 hover:text-mint-200"
                >
                  Exemple {index + 1}
                </button>
              ))}
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-1.5">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={importing !== null}
                className="inline-flex items-center gap-1 rounded-full border border-white/[0.07] bg-white/[0.02] px-2.5 py-1 text-[10.5px] text-white/40 transition hover:border-mint-400/30 hover:text-mint-200 disabled:opacity-50"
              >
                {importing === "word" ? <Loader2 className="h-3 w-3 animate-spin" /> : <FileUp className="h-3 w-3" />}
                Importer un Word
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept=".docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                className="hidden"
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (file) void importWord(file);
                }}
              />
              {figmaEnabled && (
                <div className="flex min-w-[240px] flex-1 items-center gap-1.5">
                  <input
                    value={figmaUrl}
                    onChange={(event) => setFigmaUrl(event.target.value)}
                    placeholder="https://figma.com/design/…"
                    aria-label="Lien Figma"
                    className="h-7 flex-1 rounded-full border border-white/[0.07] bg-white/[0.02] px-2.5 text-[10.5px] text-white/60 placeholder:text-white/20 focus:border-mint-400/30 focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => void importFigma()}
                    disabled={importing !== null}
                    className="inline-flex items-center gap-1 rounded-full border border-white/[0.07] bg-white/[0.02] px-2.5 py-1 text-[10.5px] text-white/40 transition hover:border-mint-400/30 hover:text-mint-200 disabled:opacity-50"
                  >
                    {importing === "figma" ? <Loader2 className="h-3 w-3 animate-spin" /> : <Figma className="h-3 w-3" />}
                    Figma
                  </button>
                </div>
              )}
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <label htmlFor="project-name" className="label">Nom <span className="normal-case tracking-normal text-white/20">(optionnel)</span></label>
              <input
                id="project-name"
                value={name}
                onChange={(event) => setName(event.target.value)}
                maxLength={80}
                placeholder="Détecté automatiquement"
                className="input"
              />
            </div>
            <div>
              <label htmlFor="project-provider" className="label">
                Moteur IA
                <span className="ml-2 inline-flex items-center gap-1 normal-case tracking-normal">
                  <span
                    className={cn(
                      "status-dot",
                      !activeProvider || modelsLoading ? "bg-white/25" : activeProvider.online ? "bg-mint-400" : "bg-gold/80",
                    )}
                  />
                  <span className={activeProvider?.online ? "text-mint-300/70" : "text-gold/70"}>
                    {modelsLoading ? "vérification…" : activeProvider ? (activeProvider.online ? "prêt" : "hors ligne") : "local"}
                  </span>
                </span>
              </label>
              <select
                id="project-provider"
                value={provider}
                onChange={(event) => chooseProvider(event.target.value)}
                className="input appearance-none bg-ink-950/60"
              >
                {providerOptions.length === 0 && <option value="ollama">Ollama (local)</option>}
                {providerOptions.map((option) => (
                  <option key={option.id} value={option.id} disabled={!option.enabled}>
                    {option.label}{option.enabled ? "" : " — clé absente"}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="project-model" className="label">Modèle</label>
              <select
                id="project-model"
                value={model}
                onChange={(event) => setModel(event.target.value)}
                className="input appearance-none bg-ink-950/60"
              >
                {modelOptions.map((option) => (
                  <option key={option} value={option}>{option}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <span className="label">Mode de génération</span>
            <div className="grid gap-2 sm:grid-cols-3">
              {MODES.map((item) => {
                const Icon = item.icon;
                const active = mode === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    role="radio"
                    aria-checked={active}
                    onClick={() => setMode(item.id)}
                    className={cn(
                      "relative rounded-2xl border p-3 text-left transition",
                      active
                        ? "border-mint-400/45 bg-mint-400/[0.07]"
                        : "border-white/[0.07] bg-white/[0.02] hover:border-white/15",
                    )}
                  >
                    {item.badge && (
                      <span className="absolute right-2 top-2 rounded-full bg-mint-400/15 px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-wide text-mint-300">
                        {item.badge}
                      </span>
                    )}
                    <Icon className={cn("h-4 w-4", active ? "text-mint-300" : "text-white/35")} />
                    <div className="mt-2 text-[12px] font-semibold text-white/85">{item.title}</div>
                    <div className="mt-1 text-[10px] leading-4 text-white/35">{item.description}</div>
                    {active && <Check className="absolute bottom-2.5 right-2.5 h-3.5 w-3.5 text-mint-400" />}
                  </button>
                );
              })}
            </div>
            {mode !== "scaffold" && activeProvider && !activeProvider.online && (
              <p className="mt-2 flex items-start gap-1.5 text-[10.5px] leading-4 text-gold/70">
                <AlertCircle className="mt-0.5 h-3 w-3 shrink-0" />
                {activeProvider.label} est indisponible : les gabarits produiront le projet, sans enrichissement IA.
              </p>
            )}
          </div>

          <div>
            <span className="label flex items-center gap-1.5">
              <Github className="h-3 w-3" /> Déploiement
              <span className="normal-case tracking-normal text-white/20">(modifiable ensuite)</span>
            </span>
            <div className="grid gap-2 sm:grid-cols-3">
              <select
                aria-label="Hébergeur"
                value={target}
                onChange={(event) => setTarget(event.target.value as DeployTarget)}
                className="input appearance-none bg-ink-950/60"
              >
                {DEPLOY_TARGETS.map((value) => (
                  <option key={value} value={value}>{DEPLOY_TARGET_LABELS[value]}</option>
                ))}
              </select>
              <input
                aria-label="Nom du dépôt GitHub"
                value={repoName}
                onChange={(event) => setRepoName(event.target.value.toLowerCase())}
                maxLength={80}
                placeholder="depot-github"
                className="input"
              />
              <div className="relative">
                <Globe2 className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-white/25" />
                <input
                  aria-label="Domaine personnalisé"
                  value={customDomain}
                  onChange={(event) => setCustomDomain(event.target.value.toLowerCase())}
                  placeholder="app.exemple.ci"
                  className="input pl-9"
                />
              </div>
            </div>
            <p className="mt-2 flex items-start gap-1.5 text-[10px] leading-4 text-white/30">
              <Check className="mt-0.5 h-3 w-3 shrink-0 text-mint-400" />
              Configurations GitHub, Vercel, Netlify, GitHub Pages, Cloudflare et Docker générées avec l'application.
            </p>
          </div>

          {error && (
            <div role="alert" className="flex items-start gap-2 rounded-xl border border-red-400/20 bg-red-400/[0.06] px-3.5 py-2.5 text-[12px] text-red-200/90">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" /> {error}
            </div>
          )}

          <div className="flex flex-col-reverse gap-2 border-t border-white/[0.06] pt-4 sm:flex-row sm:items-center sm:justify-between">
            <span className="inline-flex items-center gap-1.5 text-[10.5px] text-white/30">
              <Check className="h-3 w-3 text-mint-400" /> Création + première génération incluses
            </span>
            <div className="flex gap-2">
              <button type="button" onClick={onClose} disabled={pending} className="btn-secondary flex-1 px-4 py-2.5 text-[12.5px] sm:flex-none">
                Annuler
              </button>
              <button type="submit" disabled={pending} className="btn-primary flex-1 justify-center px-5 py-2.5 text-[12.5px] sm:flex-none">
                {pending ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" /> Création…
                  </>
                ) : (
                  <>
                    Créer et générer <Sparkles className="h-3.5 w-3.5" />
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
