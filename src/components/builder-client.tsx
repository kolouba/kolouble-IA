"use client";

import { useEffect, useMemo, useRef, useState, type ComponentType, type KeyboardEvent as ReactKeyboardEvent, type ReactNode } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  ArrowLeft,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Circle,
  CloudOff,
  Code2,
  Copy,
  Hammer,
  Database,
  Download,
  ExternalLink,
  FileCode2,
  Folder,
  FolderOpen,
  Globe2,
  History,
  Info,
  Layers,
  Loader2,
  Monitor,
  Palette,
  Play,
  RefreshCw,
  Rocket,
  Save,
  Search,
  ShieldCheck,
  Smartphone,
  Sparkles,
  Tablet,
  Terminal,
  Wrench,
  XCircle,
} from "lucide-react";
import { AGENTS } from "@/lib/generator/types";
import type { GenerationIssue, StreamEvent } from "@/lib/generator/types";
import { apiFetch, ApiRequestError } from "@/lib/client-api";
import { cn } from "@/lib/cn";
import { DeploymentPanel } from "@/components/deployment-panel";
import { BuildPanel } from "@/components/build-panel";
import type { DeploymentState } from "@/lib/deployment";
import { MARKETPLACE_TEMPLATES } from "@/lib/templates";

export interface BuilderProject {
  id: string;
  name: string;
  description: string | null;
  prompt: string;
  status: string;
  mode: string;
  model: string | null;
  provider: string | null;
  templateKey: string | null;
  saas: boolean;
  autoNamed: boolean;
  spec: {
    appName: string;
    packageName?: string;
    tagline?: string;
    summary?: string;
    entities: Array<{ key: string; label: string; plural: string }>;
    platforms: string[];
  } | null;
  createdAt: string;
  updatedAt: string;
  lastGenerationAt: string | null;
}

export interface BuilderFile {
  path: string;
  bytes: number;
  language: string;
  source: string;
  updatedAt: string;
}

export interface BuilderGeneration {
  id: string;
  status: string;
  mode: string;
  model: string;
  summary: string | null;
  error: string | null;
  durationMs: number | null;
  filesWritten: number;
  warnings: string[];
  createdAt: string;
  completedAt: string | null;
  steps: Array<{
    agent: string;
    title: string;
    status: string;
    detail: string | null;
    order: number;
    startedAt: string | null;
    finishedAt: string | null;
  }>;
}

type Mode = "scaffold" | "standard" | "max";
type Device = "desktop" | "tablet" | "mobile";
type LogLevel = "info" | "warn" | "error";
type AgentStatus = "pending" | "running" | "done" | "warning" | "error";

const TEMPLATE_LABELS = new Map(MARKETPLACE_TEMPLATES.map((template) => [template.key, template.name]));

interface BuilderProvider {
  id: string;
  label: string;
  enabled: boolean;
  online: boolean;
  models: string[];
  defaultModel: string;
}

interface StepView {
  agent: string;
  title: string;
  description: string;
  status: AgentStatus;
  detail: string | null;
}

interface LogEntry {
  level: LogLevel;
  message: string;
  at: number;
}

interface SelectedFile {
  path: string;
  content: string;
  language: string;
  bytes: number;
  source: string;
}

interface ApiGeneration extends Omit<BuilderGeneration, "warnings"> {
  warnings: string | string[] | null;
}

interface ProjectResponse {
  project: BuilderProject & { fileCount: number; totalBytes: number };
  files: BuilderFile[];
  generations: ApiGeneration[];
}

const AGENT_ICONS: Record<string, ComponentType<{ className?: string }>> = {
  architect: Layers,
  designer: Palette,
  flutter: Smartphone,
  supabase: Database,
  devops: Rocket,
  tester: ShieldCheck,
};

const PROJECT_STATUS: Record<string, { label: string; className: string; dot: string }> = {
  draft: { label: "Brouillon", className: "border-white/10 bg-white/[0.03] text-white/45", dot: "bg-white/30" },
  generating: { label: "Génération…", className: "border-gold/25 bg-gold/[0.06] text-gold", dot: "bg-gold animate-pulseSoft" },
  ready: { label: "Prêt", className: "border-mint-400/25 bg-mint-400/[0.06] text-mint-300", dot: "bg-mint-400" },
  partial: { label: "À vérifier", className: "border-sky-400/25 bg-sky-400/[0.06] text-sky-400", dot: "bg-sky-400" },
  error: { label: "Erreur", className: "border-red-400/25 bg-red-400/[0.06] text-red-300", dot: "bg-red-400" },
};

const GENERATION_STATUS: Record<string, { label: string; className: string; dot: string }> = {
  running: { label: "En cours", className: "text-gold", dot: "bg-gold animate-pulseSoft" },
  success: { label: "Succès", className: "text-mint-300", dot: "bg-mint-400" },
  partial: { label: "Partiel", className: "text-sky-400", dot: "bg-sky-400" },
  error: { label: "Erreur", className: "text-red-300", dot: "bg-red-400" },
};

const STEP_STATUS_LABEL: Record<AgentStatus, string> = {
  pending: "En attente",
  running: "En cours",
  done: "Terminé",
  warning: "Attention",
  error: "Erreur",
};

const SOURCE_LABEL: Record<string, { label: string; className: string }> = {
  user: { label: "Vous", className: "border-mint-400/25 bg-mint-400/[0.07] text-mint-300" },
  ai: { label: "IA", className: "border-gold/25 bg-gold/[0.07] text-gold" },
  scaffold: { label: "Gabarit", className: "border-white/10 bg-white/[0.03] text-white/35" },
};

const MODES: Array<{ id: Mode; label: string }> = [
  { id: "scaffold", label: "Gabarits" },
  { id: "standard", label: "Hybride" },
  { id: "max", label: "IA renforcée" },
];

function isMode(value: string): value is Mode {
  return value === "scaffold" || value === "standard" || value === "max";
}

function formatDate(value: string | null): string {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("fr-FR", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function formatDuration(ms: number | null): string {
  if (!ms || ms < 1000) return "< 1 s";
  if (ms < 60_000) return `${(ms / 1000).toFixed(1)} s`;
  return `${Math.floor(ms / 60_000)} min ${Math.round((ms % 60_000) / 1000)} s`;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} o`;
  return `${(bytes / 1024).toFixed(1)} Ko`;
}

function parseWarnings(value: string | string[] | null): string[] {
  if (!value) return [];
  if (Array.isArray(value)) return value;
  try {
    const parsed = JSON.parse(value);
    if (Array.isArray(parsed)) return parsed.map(String);
  } catch {
    // valeur texte libre
  }
  return value.split("\n").filter(Boolean);
}

function initialSteps(generation?: BuilderGeneration): StepView[] {
  return AGENTS.map((agent) => {
    const record = generation?.steps.find((step) => step.agent === agent.id);
    return {
      agent: agent.id,
      title: agent.title,
      description: agent.description,
      status: (record?.status as AgentStatus) ?? "pending",
      detail: record?.detail ?? null,
    };
  });
}

function initialLogs(project: BuilderProject, generation?: BuilderGeneration): LogEntry[] {
  if (generation) {
    return [
      {
        level: generation.status === "error" ? "error" : generation.status === "partial" ? "warn" : "info",
        message: `Dernière génération · ${GENERATION_STATUS[generation.status]?.label ?? generation.status} · ${generation.filesWritten} fichiers · ${formatDuration(generation.durationMs)}`,
        at: new Date(generation.createdAt).getTime(),
      },
      ...(generation.error ? [{ level: "error" as const, message: generation.error, at: Date.now() }] : []),
    ];
  }
  return [
    {
      level: "info",
      message: `Pipeline prêt pour « ${project.name} ». Lancez une génération pour créer les fichiers.`,
      at: Date.now(),
    },
  ];
}

function statusIcon(status: AgentStatus) {
  switch (status) {
    case "running":
      return <Loader2 className="h-4 w-4 animate-spin text-gold" />;
    case "done":
      return <CheckCircle2 className="h-4 w-4 text-mint-400" />;
    case "warning":
      return <AlertTriangle className="h-4 w-4 text-gold" />;
    case "error":
      return <XCircle className="h-4 w-4 text-red-400" />;
    default:
      return <Circle className="h-4 w-4 text-white/15" />;
  }
}

interface TreeNode {
  name: string;
  path: string;
  children: Map<string, TreeNode>;
  file?: BuilderFile;
}

function buildTree(files: BuilderFile[]): TreeNode {
  const root: TreeNode = { name: "", path: "", children: new Map() };
  for (const file of files) {
    const parts = file.path.split("/");
    let node = root;
    let current = "";
    parts.forEach((part, index) => {
      current = current ? `${current}/${part}` : part;
      let child = node.children.get(part);
      if (!child) {
        child = { name: part, path: current, children: new Map() };
        node.children.set(part, child);
      }
      if (index === parts.length - 1) child.file = file;
      node = child;
    });
  }
  return root;
}

function CopyButton({ value, label = "Copier" }: { value: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(value);
          setCopied(true);
          setTimeout(() => setCopied(false), 2000);
        } catch {
          setCopied(false);
        }
      }}
      className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/[0.03] px-2 py-1 text-[10px] text-white/45 transition hover:border-mint-400/30 hover:text-mint-200"
    >
      {copied ? <Check className="h-3 w-3 text-mint-400" /> : <Copy className="h-3 w-3" />}
      {copied ? "Copié" : label}
    </button>
  );
}

export function BuilderClient({
  initialProject,
  initialFiles,
  initialGenerations,
  initialGenerate,
  initialDeployment,
  defaultModel,
}: {
  initialProject: BuilderProject;
  initialFiles: BuilderFile[];
  initialGenerations: BuilderGeneration[];
  initialGenerate: boolean;
  initialDeployment: DeploymentState;
  defaultModel: string;
}) {
  const [project, setProject] = useState(initialProject);
  const [files, setFiles] = useState(initialFiles);
  const [generations, setGenerations] = useState(initialGenerations);
  const [prompt, setPrompt] = useState(initialProject.prompt);
  const [mode, setMode] = useState<Mode>(isMode(initialProject.mode) ? initialProject.mode : "standard");
  const [model, setModel] = useState(initialProject.model ?? defaultModel);
  const [modelOptions, setModelOptions] = useState<string[]>([initialProject.model ?? defaultModel]);
  const [provider, setProvider] = useState(initialProject.provider ?? "ollama");
  const [providerOptions, setProviderOptions] = useState<BuilderProvider[]>([]);
  const [preserveEdits, setPreserveEdits] = useState(true);
  const [streaming, setStreaming] = useState(false);
  const [steps, setSteps] = useState<StepView[]>(() => initialSteps(initialGenerations[0]));
  const [logs, setLogs] = useState<LogEntry[]>(() => initialLogs(initialProject, initialGenerations[0]));
  const [issues, setIssues] = useState<GenerationIssue[]>([]);
  const [warnings, setWarnings] = useState<string[]>(initialGenerations[0]?.warnings ?? []);
  const [generatedCount, setGeneratedCount] = useState(initialFiles.length);
  const [previewVersion, setPreviewVersion] = useState(0);
  const [device, setDevice] = useState<Device>("desktop");
  const [centerTab, setCenterTab] = useState<"preview" | "code">("preview");
  const [rightTab, setRightTab] = useState<"pipeline" | "history" | "deploy" | "build">("pipeline");
  const [selectedPath, setSelectedPath] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<SelectedFile | null>(null);
  const [draft, setDraft] = useState("");
  const [dirty, setDirty] = useState(false);
  const [fileLoading, setFileLoading] = useState(false);
  const [fileRevision, setFileRevision] = useState(0);
  const [saving, setSaving] = useState(false);
  const [repairing, setRepairing] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [fileQuery, setFileQuery] = useState("");
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());

  const autoStarted = useRef(false);
  const dirtyRef = useRef(false);
  const noticeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const logRef = useRef<HTMLDivElement>(null);
  const startRef = useRef<() => void>(() => undefined);
  const activeProvider = providerOptions.find((item) => item.id === provider) ?? null;

  useEffect(() => {
    dirtyRef.current = dirty;
  }, [dirty]);

  useEffect(() => {
    return () => {
      if (noticeTimer.current) clearTimeout(noticeTimer.current);
    };
  }, []);

  useEffect(() => {
    logRef.current?.scrollTo({ top: logRef.current.scrollHeight, behavior: "smooth" });
  }, [logs]);

  useEffect(() => {
    let active = true;
    apiFetch<{
      online: boolean;
      models: Array<{ name: string }>;
      defaultModel: string;
      providers?: BuilderProvider[];
      selectedProvider?: string;
    }>("/api/models")
      .then((data) => {
        if (!active) return;
        const options = data.providers ?? [];
        setProviderOptions(options);
        const preferred =
          options.find((item) => item.id === data.selectedProvider && item.enabled) ??
          options.find((item) => item.enabled) ??
          options[0] ??
          null;
        if (preferred) {
          setProvider((current) => (options.some((item) => item.id === current) ? current : preferred.id));
          const names = preferred.models.length > 0 ? preferred.models : [preferred.defaultModel];
          setModelOptions(names);
          setModel((current) => (names.includes(current) ? current : preferred.defaultModel));
        } else {
          const names = data.models.map((item) => item.name).filter(Boolean);
          if (names.length > 0) {
            setModelOptions(names);
            setModel((current) => (names.includes(current) ? current : names[0]!));
          }
        }
      })
      .catch(() => {
        if (active) setProviderOptions([]);
      });
    return () => {
      active = false;
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

  useEffect(() => {
    if (selectedPath && files.some((file) => file.path === selectedPath)) return;
    const preferred = files.find((file) => file.path === "lib/main.dart") ?? files[0];
    setSelectedPath(preferred?.path ?? null);
  }, [files, selectedPath]);

  useEffect(() => {
    if (!selectedPath) {
      setSelectedFile(null);
      setDraft("");
      setDirty(false);
      return;
    }
    const controller = new AbortController();
    setFileLoading(true);
    const encoded = selectedPath.split("/").map(encodeURIComponent).join("/");
    apiFetch<{ file: SelectedFile }>(`/api/projects/${project.id}/files/${encoded}`, {
      signal: controller.signal,
    })
      .then((data) => {
        setSelectedFile(data.file);
        setDraft(data.file.content);
        setDirty(false);
      })
      .catch((error) => {
        if (controller.signal.aborted) return;
        addLog("error", `Lecture impossible de ${selectedPath} : ${error instanceof Error ? error.message : "erreur"}`);
      })
      .finally(() => {
        if (!controller.signal.aborted) setFileLoading(false);
      });
    return () => controller.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedPath, project.id, fileRevision]);

  useEffect(() => {
    if (!dirty) return;
    const handler = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [dirty]);

  const tree = useMemo(() => buildTree(files), [files]);
  const filteredFiles = useMemo(() => {
    const query = fileQuery.trim().toLowerCase();
    if (!query) return null;
    return files.filter((file) => file.path.toLowerCase().includes(query));
  }, [files, fileQuery]);

  const stepsDone = steps.filter((step) => step.status === "done").length;
  const projectStatus = PROJECT_STATUS[project.status] ?? PROJECT_STATUS.draft!;
  const source = selectedFile?.source ?? "scaffold";
  const sourceMeta = SOURCE_LABEL[source] ?? SOURCE_LABEL.scaffold!;
  const lineCount = draft ? draft.split("\n").length : 0;

  function showNotice(message: string) {
    setNotice(message);
    if (noticeTimer.current) clearTimeout(noticeTimer.current);
    noticeTimer.current = setTimeout(() => setNotice(null), 5000);
  }

  function addLog(level: LogLevel, message: string) {
    setLogs((current) => [...current.slice(-249), { level, message, at: Date.now() }]);
  }

  async function refreshProject(reloadSelected = true) {
    try {
      const data = await apiFetch<ProjectResponse>(`/api/projects/${project.id}`);
      setProject(data.project);
      setFiles(data.files);
      setGenerations(
        data.generations.map((generation) => ({
          ...generation,
          warnings: parseWarnings(generation.warnings),
        })),
      );
      setPreviewVersion((value) => value + 1);
      const paths = new Set(data.files.map((file) => file.path));
      if (selectedPath && !paths.has(selectedPath)) {
        const preferred = data.files.find((file) => file.path === "lib/main.dart") ?? data.files[0];
        setSelectedPath(preferred?.path ?? null);
        setSelectedFile(null);
      }
      if (reloadSelected && !dirtyRef.current) setFileRevision((value) => value + 1);
    } catch (error) {
      addLog("warn", `Rafraîchissement impossible : ${error instanceof Error ? error.message : "erreur"}`);
    }
  }

  function selectFile(path: string) {
    if (path === selectedPath) {
      setCenterTab("code");
      return;
    }
    if (dirty && !window.confirm("Des modifications ne sont pas enregistrées. Changer de fichier les perdra. Continuer ?")) {
      return;
    }
    setDirty(false);
    setSelectedFile(null);
    setDraft("");
    setSelectedPath(path);
    setCenterTab("code");
  }

  async function saveFile() {
    if (!selectedFile || saving) return;
    setSaving(true);
    try {
      const encoded = selectedFile.path.split("/").map(encodeURIComponent).join("/");
      const data = await apiFetch<{ file: { bytes: number; source: string; language: string } }>(
        `/api/projects/${project.id}/files/${encoded}`,
        { method: "PUT", body: JSON.stringify({ content: draft }) },
      );
      setSelectedFile({
        ...selectedFile,
        content: draft,
        bytes: data.file.bytes,
        source: data.file.source,
        language: data.file.language,
      });
      setFiles((current) =>
        current.map((file) =>
          file.path === selectedFile.path
            ? { ...file, bytes: data.file.bytes, source: data.file.source, language: data.file.language }
            : file,
        ),
      );
      setDirty(false);
      showNotice(`${selectedFile.path} enregistré.`);
    } catch (error) {
      showNotice(error instanceof Error ? error.message : "Enregistrement impossible.");
    } finally {
      setSaving(false);
    }
  }

  async function startGeneration(options?: { skipConfirm?: boolean }) {
    if (streaming) return;
    const cleanPrompt = prompt.trim();
    if (cleanPrompt.length < 15) {
      showNotice("Décrivez votre application en 15 caractères minimum.");
      return;
    }
    if (!options?.skipConfirm && files.length > 0) {
      const confirmed = window.confirm(
        preserveEdits
          ? "Régénérer le projet ? Les fichiers non modifiés par vous seront remplacés ; vos modifications sont conservées."
          : "Régénérer le projet ? Tous les fichiers, y compris vos modifications, seront remplacés.",
      );
      if (!confirmed) return;
    }

    setStreaming(true);
    setIssues([]);
    setWarnings([]);
    setGeneratedCount(0);
    setSteps(initialSteps());
    setLogs([
      {
        level: "info",
        message: `Connexion au pipeline · mode ${MODES.find((item) => item.id === mode)?.label ?? mode} · ${activeProvider?.label ?? provider} · ${model}`,
        at: Date.now(),
      },
    ]);
    setRightTab("pipeline");
    setCenterTab("preview");

    let doneReceived = false;
    let errorReceived = false;

    try {
      const response = await fetch(`/api/projects/${project.id}/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/x-ndjson" },
        body: JSON.stringify({ prompt: cleanPrompt, mode, model, provider, preserveEdits }),
      });
      if (!response.ok) {
        const data = (await response.json().catch(() => null)) as { error?: string } | null;
        throw new Error(data?.error || `La génération a échoué (${response.status}).`);
      }
      if (!response.body) throw new Error("Flux de génération indisponible.");

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      const handleEvent = async (event: StreamEvent) => {
        switch (event.type) {
          case "step":
            setSteps((current) =>
              current.map((step) =>
                step.agent === event.agent
                  ? {
                      ...step,
                      status:
                        event.status === "start"
                          ? "running"
                          : event.status === "done"
                            ? "done"
                            : event.status,
                      detail: event.detail ?? step.detail,
                    }
                  : step,
              ),
            );
            break;
          case "file":
            setGeneratedCount((count) => count + 1);
            break;
          case "log":
            addLog(event.level, event.message);
            break;
          case "issue":
            setIssues((current) =>
              current.some(
                (issue) =>
                  issue.path === event.issue.path &&
                  issue.code === event.issue.code &&
                  issue.message === event.issue.message,
              )
                ? current
                : [...current, event.issue],
            );
            break;
          case "done":
            doneReceived = true;
            setStreaming(false);
            setGeneratedCount(event.files);
            setWarnings(event.warnings);
            addLog(
              event.status === "success" ? "info" : "warn",
              `${event.summary} · ${event.files} fichiers dans le projet.`,
            );
            showNotice(event.status === "success" ? "Application générée avec succès." : "Génération terminée avec des avertissements.");
            await refreshProject(true);
            break;
          case "error":
            errorReceived = true;
            setStreaming(false);
            addLog("error", event.message);
            showNotice(event.message);
            await refreshProject(false);
            break;
          case "ping":
            break;
          default:
            break;
        }
      };

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        let newline = buffer.indexOf("\n");
        while (newline >= 0) {
          const line = buffer.slice(0, newline).trim();
          buffer = buffer.slice(newline + 1);
          if (line) {
            try {
              await handleEvent(JSON.parse(line) as StreamEvent);
            } catch (error) {
              if (error instanceof SyntaxError) {
                addLog("warn", "Événement de génération illisible ignoré.");
              } else {
                throw error;
              }
            }
          }
          newline = buffer.indexOf("\n");
        }
      }
      if (buffer.trim()) {
        try {
          await handleEvent(JSON.parse(buffer) as StreamEvent);
        } catch {
          addLog("warn", "Dernier événement de génération illisible.");
        }
      }
      if (!doneReceived && !errorReceived) {
        addLog("warn", "Le flux s'est terminé sans confirmation du serveur.");
        await refreshProject(false);
      }
    } catch (error) {
      addLog("error", error instanceof Error ? error.message : "Génération interrompue.");
      showNotice(error instanceof Error ? error.message : "Génération interrompue.");
      await refreshProject(false);
    } finally {
      setStreaming(false);
    }
  }

  startRef.current = () => {
    void startGeneration();
  };

  useEffect(() => {
    if (!initialGenerate || autoStarted.current) return;
    autoStarted.current = true;
    window.history.replaceState(null, "", `/projects/${project.id}`);
    if (files.length === 0) {
      void startGeneration({ skipConfirm: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialGenerate, project.id]);

  async function repairProject() {
    if (repairing || streaming || files.length === 0) return;
    const confirmed = window.confirm(
      "Lancer la réparation ? Les fichiers incohérents seront corrigés, et le modèle local peut être sollicité.",
    );
    if (!confirmed) return;
    setRepairing(true);
    setRightTab("pipeline");
    addLog("info", "Analyse et réparation des fichiers…");
    try {
      const result = await apiFetch<{
        repaired: string[];
        summary: string;
        warnings: string[];
        issues: GenerationIssue[];
      }>(`/api/projects/${project.id}/repair`, {
        method: "POST",
        body: JSON.stringify({ useAi: true, model, provider }),
      });
      setIssues(result.issues);
      if (result.warnings.length > 0) setWarnings(result.warnings);
      addLog(result.issues.some((issue) => issue.severity === "error") ? "warn" : "info", result.summary);
      showNotice(result.summary);
      await refreshProject(true);
    } catch (error) {
      const message = error instanceof ApiRequestError ? error.message : "Réparation impossible.";
      addLog("error", message);
      showNotice(message);
    } finally {
      setRepairing(false);
    }
  }

  function handleEditorKeyDown(event: ReactKeyboardEvent<HTMLTextAreaElement>) {
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "s") {
      event.preventDefault();
      void saveFile();
    }
  }

  function toggleFolder(path: string) {
    setCollapsed((current) => {
      const next = new Set(current);
      if (next.has(path)) next.delete(path);
      else next.add(path);
      return next;
    });
  }

  function renderNode(node: TreeNode, depth = 0): ReactNode {
    const entries = Array.from(node.children.values()).sort((a, b) => {
      const aDir = a.children.size > 0;
      const bDir = b.children.size > 0;
      if (aDir !== bDir) return aDir ? -1 : 1;
      return a.name.localeCompare(b.name);
    });
    return entries.map((child) => {
      const isDir = child.children.size > 0;
      if (isDir) {
        const open = !collapsed.has(child.path);
        return (
          <div key={child.path}>
            <button
              type="button"
              onClick={() => toggleFolder(child.path)}
              className="flex w-full items-center gap-1.5 rounded-lg px-2 py-1.5 text-left text-[11.5px] text-white/55 transition hover:bg-white/[0.04] hover:text-white/80"
              style={{ paddingLeft: `${8 + depth * 12}px` }}
            >
              {open ? <ChevronDown className="h-3 w-3 text-white/30" /> : <ChevronRight className="h-3 w-3 text-white/30" />}
              {open ? <FolderOpen className="h-3.5 w-3.5 text-gold/60" /> : <Folder className="h-3.5 w-3.5 text-gold/60" />}
              <span className="truncate font-medium">{child.name}</span>
            </button>
            {open && renderNode(child, depth + 1)}
          </div>
        );
      }
      if (!child.file) return null;
      const file = child.file;
      const sourceInfo = SOURCE_LABEL[file.source] ?? SOURCE_LABEL.scaffold!;
      const active = selectedPath === child.path;
      return (
        <button
          key={child.path}
          type="button"
          onClick={() => selectFile(child.path)}
          title={child.path}
          className={cn(
            "group flex w-full items-center gap-1.5 rounded-lg px-2 py-1.5 text-left text-[11px] transition",
            active ? "bg-mint-400/[0.09] text-mint-100" : "text-white/40 hover:bg-white/[0.04] hover:text-white/70",
          )}
          style={{ paddingLeft: `${20 + depth * 12}px` }}
        >
          <FileCode2 className={cn("h-3.5 w-3.5 shrink-0", active ? "text-mint-300" : "text-white/25")} />
          <span className="truncate">{child.name}</span>
          <span
            title={sourceInfo.label}
            className={cn(
              "ml-auto h-1.5 w-1.5 shrink-0 rounded-full",
              file.source === "user" ? "bg-mint-400" : file.source === "ai" ? "bg-gold" : "bg-white/15",
            )}
          />
        </button>
      );
    });
  }

  const completed = stepsDone;
  const generationBusy = streaming;

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-40 border-b border-white/[0.06] bg-ink-950/80 backdrop-blur-xl">
        <div className="flex flex-wrap items-center gap-3 px-4 py-3 lg:h-16 lg:flex-nowrap lg:px-6 lg:py-0">
          <Link href="/dashboard" className="btn-ghost -ml-1 shrink-0 px-2.5" aria-label="Retour au studio">
            <ArrowLeft className="h-4 w-4" />
            <span className="hidden text-[11.5px] sm:inline">Studio</span>
          </Link>
          <span className="hidden h-7 w-px bg-white/[0.08] sm:block" />
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <h1 className="truncate font-display text-[15px] font-semibold tracking-tight sm:text-[17px]">{project.name}</h1>
              <span className={cn("chip shrink-0 py-0.5 text-[9.5px]", projectStatus.className)}>
                <span className={cn("status-dot", projectStatus.dot)} />
                {projectStatus.label}
              </span>
            </div>
            <div className="mt-0.5 hidden items-center gap-2 text-[10px] text-white/30 sm:flex">
              <span>{project.spec?.entities.length ?? 0} modules métier</span>
              <span>·</span>
              <span>{files.length} fichiers</span>
              {project.spec?.platforms && (
                <>
                  <span>·</span>
                  <span className="truncate">{project.spec.platforms.join(" · ")}</span>
                </>
              )}
              {project.templateKey && (
                <>
                  <span>·</span>
                  <span>{TEMPLATE_LABELS.get(project.templateKey) ?? project.templateKey}</span>
                </>
              )}
              {project.saas && (
                <>
                  <span>·</span>
                  <span className="text-gold/60">SaaS</span>
                </>
              )}
            </div>
          </div>

          <div className="ml-auto flex items-center gap-1.5 sm:gap-2">
            <button
              type="button"
              onClick={repairProject}
              disabled={repairing || streaming || files.length === 0}
              className="btn-secondary px-3 py-2 text-[11.5px]"
              title="Analyser et réparer les fichiers"
            >
              {repairing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Wrench className="h-3.5 w-3.5" />}
              <span className="hidden md:inline">Réparer</span>
            </button>
            {files.length > 0 ? (
              <a
                href={`/api/projects/${project.id}/export`}
                className="btn-secondary px-3 py-2 text-[11.5px]"
                title="Télécharger le projet en ZIP"
              >
                <Download className="h-3.5 w-3.5" />
                <span className="hidden md:inline">ZIP</span>
              </a>
            ) : (
              <span className="btn-secondary cursor-not-allowed px-3 py-2 text-[11.5px] opacity-40">
                <Download className="h-3.5 w-3.5" />
                <span className="hidden md:inline">ZIP</span>
              </span>
            )}
            <button
              type="button"
              onClick={() => startRef.current()}
              disabled={generationBusy}
              className="btn-primary px-4 py-2 text-[11.5px]"
            >
              {generationBusy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
              <span className="hidden sm:inline">{generationBusy ? "Génération…" : files.length > 0 ? "Régénérer" : "Générer"}</span>
              <span className="sm:hidden">{generationBusy ? "…" : "Générer"}</span>
            </button>
          </div>
        </div>
      </header>

      <main className="grid gap-3 p-3 lg:grid-cols-[minmax(0,1fr)_380px] xl:grid-cols-[280px_minmax(0,1fr)_400px] lg:p-4">
        {/* Fichiers */}
        <aside className="order-3 xl:order-1 xl:sticky xl:top-[76px] xl:max-h-[calc(100vh-92px)]">
          <div className="card flex max-h-[520px] flex-col overflow-hidden xl:max-h-[calc(100vh-92px)]">
            <div className="border-b border-white/[0.06] p-3.5">
              <div className="flex items-center justify-between">
                <h2 className="inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-white/45">
                  <FileCode2 className="h-3.5 w-3.5 text-mint-400" /> Fichiers
                </h2>
                <span className="chip py-0.5 text-[9.5px]">{files.length}</span>
              </div>
              <div className="relative mt-2.5">
                <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-white/20" />
                <input
                  value={fileQuery}
                  onChange={(event) => setFileQuery(event.target.value)}
                  placeholder="Filtrer les chemins…"
                  className="w-full rounded-lg border border-white/[0.07] bg-ink-950/60 py-1.5 pl-8 pr-2.5 text-[11px] text-white/70 placeholder:text-white/20 focus:border-mint-400/40 focus:outline-none"
                />
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-2">
              {files.length === 0 ? (
                <div className="px-3 py-10 text-center">
                  <CloudOff className="mx-auto h-5 w-5 text-white/15" />
                  <p className="mt-2 text-[11px] leading-5 text-white/30">Aucun fichier. Lancez la génération.</p>
                </div>
              ) : filteredFiles ? (
                filteredFiles.length === 0 ? (
                  <p className="px-3 py-8 text-center text-[11px] text-white/30">Aucun résultat.</p>
                ) : (
                  filteredFiles.map((file) => {
                    const sourceInfo = SOURCE_LABEL[file.source] ?? SOURCE_LABEL.scaffold!;
                    return (
                      <button
                        key={file.path}
                        type="button"
                        onClick={() => selectFile(file.path)}
                        className={cn(
                          "flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-[11px] transition",
                          selectedPath === file.path ? "bg-mint-400/[0.09] text-mint-100" : "text-white/40 hover:bg-white/[0.04]",
                        )}
                      >
                        <FileCode2 className="h-3.5 w-3.5 shrink-0 text-white/25" />
                        <span className="truncate">{file.path}</span>
                        <span className={cn("ml-auto shrink-0 rounded px-1 py-0.5 text-[8px]", sourceInfo.className)}>
                          {sourceInfo.label}
                        </span>
                      </button>
                    );
                  })
                )
              ) : (
                renderNode(tree)
              )}
            </div>
            <div className="flex items-center gap-3 border-t border-white/[0.06] px-3.5 py-2.5 text-[9px] text-white/25">
              <span className="inline-flex items-center gap-1"><span className="h-1.5 w-1.5 rounded-full bg-mint-400" /> Vous</span>
              <span className="inline-flex items-center gap-1"><span className="h-1.5 w-1.5 rounded-full bg-gold" /> IA</span>
              <span className="inline-flex items-center gap-1"><span className="h-1.5 w-1.5 rounded-full bg-white/20" /> Gabarit</span>
            </div>
          </div>
        </aside>

        {/* Aperçu / Éditeur */}
        <section className="order-1 min-w-0 xl:order-2">
          <div className="card overflow-hidden">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/[0.06] px-3 py-2.5">
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setCenterTab("preview")}
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[11.5px] font-medium transition",
                    centerTab === "preview" ? "bg-white/[0.06] text-white" : "text-white/40 hover:text-white/70",
                  )}
                >
                  <Monitor className="h-3.5 w-3.5" /> Aperçu
                </button>
                <button
                  type="button"
                  onClick={() => setCenterTab("code")}
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[11.5px] font-medium transition",
                    centerTab === "code" ? "bg-white/[0.06] text-white" : "text-white/40 hover:text-white/70",
                  )}
                >
                  <Code2 className="h-3.5 w-3.5" /> Éditeur
                </button>
              </div>

              {centerTab === "preview" ? (
                <div className="flex items-center gap-1.5">
                  <div className="flex rounded-lg border border-white/[0.07] bg-ink-950/60 p-0.5">
                    {([
                      ["desktop", Monitor, "Bureau"],
                      ["tablet", Tablet, "Tablette"],
                      ["mobile", Smartphone, "Mobile"],
                    ] as const).map(([value, Icon, label]) => (
                      <button
                        key={value}
                        type="button"
                        onClick={() => setDevice(value)}
                        className={cn(
                          "rounded-md p-1.5 transition",
                          device === value ? "bg-white/[0.08] text-mint-300" : "text-white/30 hover:text-white/65",
                        )}
                        aria-label={label}
                        title={label}
                      >
                        <Icon className="h-3.5 w-3.5" />
                      </button>
                    ))}
                  </div>
                  <button
                    type="button"
                    onClick={() => setPreviewVersion((value) => value + 1)}
                    className="btn-ghost p-1.5"
                    aria-label="Actualiser l'aperçu"
                    title="Actualiser"
                  >
                    <RefreshCw className="h-3.5 w-3.5" />
                  </button>
                  <a
                    href={`/api/preview/${project.id}`}
                    target="_blank"
                    rel="noreferrer"
                    className="btn-ghost p-1.5"
                    aria-label="Ouvrir l'aperçu dans un onglet"
                    title="Ouvrir dans un onglet"
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                </div>
              ) : (
                <div className="flex items-center gap-1.5">
                  {selectedFile && (
                    <>
                      <span className={cn("chip py-0.5 text-[9px]", sourceMeta.className)}>{sourceMeta.label}</span>
                      <button type="button" onClick={() => setFileRevision((value) => value + 1)} className="btn-ghost p-1.5" title="Recharger le fichier">
                        <RefreshCw className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => void saveFile()}
                        disabled={saving || !dirty}
                        className="btn-primary px-3 py-1.5 text-[10.5px]"
                      >
                        {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />}
                        Enregistrer
                      </button>
                    </>
                  )}
                </div>
              )}
            </div>

            {centerTab === "preview" ? (
              <div className="bg-[#0b1411] p-3 sm:p-4">
                {files.length === 0 ? (
                  <div className="flex h-[420px] flex-col items-center justify-center rounded-2xl border border-dashed border-white/10 bg-ink-900/40 text-center">
                    {streaming ? (
                      <>
                        <Loader2 className="h-7 w-7 animate-spin text-gold" />
                        <p className="mt-3 text-[13px] font-medium text-white/70">Les agents construisent votre application…</p>
                        <p className="mt-1 text-[11px] text-white/30">{generatedCount} fichier(s) produit(s)</p>
                      </>
                    ) : (
                      <>
                        <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-mint-400/20 bg-mint-400/[0.06]">
                          <Play className="h-5 w-5 text-mint-300" />
                        </div>
                        <p className="mt-4 text-[13px] font-medium text-white/70">Le prototype web apparaîtra ici.</p>
                        <p className="mt-1 max-w-xs text-[11px] leading-5 text-white/30">
                          Lancez la génération pour créer l'aperçu interactif, les fichiers Flutter et le schéma Supabase.
                        </p>
                        <button type="button" onClick={() => startRef.current()} className="btn-primary mt-4 px-4 py-2 text-[11.5px]">
                          <Sparkles className="h-3.5 w-3.5" /> Générer maintenant
                        </button>
                      </>
                    )}
                  </div>
                ) : (
                  <div className="flex justify-center">
                    <div
                      className={cn(
                        "w-full overflow-hidden rounded-xl border border-white/[0.08] bg-white shadow-2xl transition-all duration-300",
                        device === "tablet" ? "max-w-[820px]" : device === "mobile" ? "max-w-[390px]" : "max-w-full",
                      )}
                    >
                      <div className="flex items-center gap-1.5 border-b border-black/10 bg-[#f4f1ea] px-3 py-2">
                        <span className="h-2 w-2 rounded-full bg-red-400/80" />
                        <span className="h-2 w-2 rounded-full bg-amber-400/80" />
                        <span className="h-2 w-2 rounded-full bg-emerald-500/80" />
                        <span className="mx-auto max-w-[55%] truncate rounded-full bg-white/80 px-3 py-0.5 font-mono text-[8.5px] text-black/45">
                          {project.name} · aperçu local
                        </span>
                        {streaming && <Loader2 className="h-3 w-3 animate-spin text-black/40" />}
                      </div>
                      <iframe
                        key={previewVersion}
                        src={`/api/preview/${project.id}?v=${previewVersion}`}
                        title={`Aperçu interactif de ${project.name}`}
                        sandbox="allow-scripts"
                        referrerPolicy="no-referrer"
                        className="h-[540px] w-full bg-white sm:h-[640px]"
                      />
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="bg-[#0a1110]">
                {fileLoading ? (
                  <div className="flex h-[520px] items-center justify-center">
                    <Loader2 className="h-6 w-6 animate-spin text-mint-400/60" />
                  </div>
                ) : selectedFile ? (
                  <>
                    <div className="flex items-center justify-between gap-3 border-b border-white/[0.06] px-4 py-2">
                      <div className="min-w-0">
                        <div className="truncate font-mono text-[11px] text-white/65">{selectedFile.path}</div>
                        <div className="mt-0.5 text-[9.5px] text-white/25">
                          {selectedFile.language} · {formatBytes(selectedFile.bytes)} · {lineCount} lignes
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {dirty && <span className="text-[9.5px] text-gold">Non enregistré</span>}
                        <CopyButton value={draft} label="Copier" />
                      </div>
                    </div>
                    <textarea
                      value={draft}
                      onChange={(event) => {
                        setDraft(event.target.value);
                        setDirty(true);
                      }}
                      onKeyDown={handleEditorKeyDown}
                      spellCheck={false}
                      wrap="off"
                      aria-label={`Éditeur de ${selectedFile.path}`}
                      className="h-[540px] w-full resize-none bg-transparent p-4 font-mono text-[11.5px] leading-5 text-mint-50/80 focus:outline-none sm:h-[640px]"
                    />
                    <div className="flex items-center justify-between border-t border-white/[0.06] px-4 py-2 text-[9px] text-white/25">
                      <span>Ctrl/⌘ + S pour enregistrer · vos modifications sont prioritaires</span>
                      <span>{dirty ? "Modifié" : "Synchronisé"}</span>
                    </div>
                  </>
                ) : (
                  <div className="flex h-[520px] flex-col items-center justify-center text-center">
                    <Code2 className="h-6 w-6 text-white/15" />
                    <p className="mt-3 text-[12px] text-white/35">
                      {files.length === 0 ? "Aucun fichier à éditer." : "Sélectionnez un fichier dans l'arborescence."}
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        </section>

        {/* Console */}
        <aside className="order-2 min-w-0 space-y-3 xl:order-3">
          <div className="card p-4">
            <div className="flex items-center justify-between">
              <label htmlFor="builder-prompt" className="text-[10px] font-semibold uppercase tracking-[0.16em] text-white/40">
                Prompt de génération
              </label>
              <span className="text-[9px] text-white/20">{prompt.length}/4000</span>
            </div>
            <textarea
              id="builder-prompt"
              value={prompt}
              onChange={(event) => setPrompt(event.target.value)}
              rows={3}
              maxLength={4000}
              disabled={streaming}
              className="mt-2 w-full resize-y rounded-xl border border-white/[0.08] bg-ink-950/60 px-3 py-2.5 text-[11.5px] leading-5 text-white/75 focus:border-mint-400/40 focus:outline-none disabled:opacity-60"
            />
            <div className="mt-2 grid grid-cols-3 gap-2">
              <div>
                <label htmlFor="builder-mode" className="mb-1 block text-[9px] uppercase tracking-[0.12em] text-white/25">Mode</label>
                <select
                  id="builder-mode"
                  value={mode}
                  onChange={(event) => setMode(event.target.value as Mode)}
                  disabled={streaming}
                  className="w-full rounded-lg border border-white/[0.08] bg-ink-950/60 px-2 py-1.5 text-[10.5px] text-white/65 focus:border-mint-400/40 focus:outline-none disabled:opacity-60"
                >
                  {MODES.map((item) => (
                    <option key={item.id} value={item.id}>{item.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="builder-provider" className="mb-1 flex items-center justify-between text-[9px] uppercase tracking-[0.12em] text-white/25">
                  Moteur
                  <span className={cn("h-1.5 w-1.5 rounded-full", activeProvider?.online ? "bg-mint-400" : "bg-gold")} />
                </label>
                <select
                  id="builder-provider"
                  value={provider}
                  onChange={(event) => chooseProvider(event.target.value)}
                  disabled={streaming}
                  className="w-full rounded-lg border border-white/[0.08] bg-ink-950/60 px-2 py-1.5 text-[10.5px] text-white/65 focus:border-mint-400/40 focus:outline-none disabled:opacity-60"
                >
                  {providerOptions.length === 0 && <option value="ollama">Ollama</option>}
                  {providerOptions.map((option) => (
                    <option key={option.id} value={option.id} disabled={!option.enabled}>
                      {option.label}{option.enabled ? "" : " (clé absente)"}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="builder-model" className="mb-1 block text-[9px] uppercase tracking-[0.12em] text-white/25">
                  Modèle
                </label>
                <select
                  id="builder-model"
                  value={model}
                  onChange={(event) => setModel(event.target.value)}
                  disabled={streaming}
                  className="w-full rounded-lg border border-white/[0.08] bg-ink-950/60 px-2 py-1.5 text-[10.5px] text-white/65 focus:border-mint-400/40 focus:outline-none disabled:opacity-60"
                >
                  {modelOptions.map((option) => (
                    <option key={option} value={option}>{option}</option>
                  ))}
                </select>
              </div>
            </div>
            <label className="mt-2 flex cursor-pointer items-center gap-2 text-[10px] text-white/40">
              <input
                type="checkbox"
                checked={preserveEdits}
                onChange={(event) => setPreserveEdits(event.target.checked)}
                disabled={streaming}
                className="h-3.5 w-3.5 rounded border-white/20 bg-ink-900 accent-mint-400"
              />
              Conserver mes fichiers modifiés
            </label>
            <button
              type="button"
              onClick={() => startRef.current()}
              disabled={streaming || prompt.trim().length < 15}
              className="btn-primary mt-3 w-full justify-center py-2.5 text-[12px]"
            >
              {streaming ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" /> Génération des 6 agents…
                </>
              ) : (
                <>
                  <Sparkles className="h-3.5 w-3.5" /> {files.length > 0 ? "Régénérer le projet" : "Lancer la génération"}
                </>
              )}
            </button>
            {streaming && (
              <div className="mt-2.5">
                <div className="flex items-center justify-between text-[9px] text-white/30">
                  <span>{completed}/6 agents</span>
                  <span>{generatedCount} fichiers</span>
                </div>
                <div className="mt-1 h-1 overflow-hidden rounded-full bg-white/[0.06]">
                  <div className="h-full rounded-full bg-mint-400/70 transition-all" style={{ width: `${(completed / 6) * 100}%` }} />
                </div>
              </div>
            )}
            {activeProvider && !activeProvider.online && (
              <p className="mt-2 flex items-start gap-1.5 text-[9px] leading-4 text-gold/65">
                <Info className="mt-0.5 h-2.5 w-2.5 shrink-0" />
                {activeProvider.label} indisponible : les gabarits génèrent quand même le projet complet.
              </p>
            )}
          </div>

          <div className="card overflow-hidden">
            <div className="flex items-center gap-0.5 border-b border-white/[0.06] p-1.5">
              {([
                ["pipeline", Terminal, "Pipeline"],
                ["history", History, "Historique"],
                ["build", Hammer, "Build"],
                ["deploy", Rocket, "Déploiement"],
              ] as const).map(([value, Icon, label]) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setRightTab(value)}
                  className={cn(
                    "flex flex-1 items-center justify-center gap-1.5 rounded-lg px-2 py-1.5 text-[10.5px] font-medium transition",
                    rightTab === value ? "bg-white/[0.06] text-white" : "text-white/35 hover:text-white/65",
                  )}
                >
                  <Icon className="h-3 w-3" /> {label}
                  {value === "history" && generations.length > 0 && (
                    <span className="rounded-full bg-white/[0.06] px-1 text-[8px] text-white/40">{generations.length}</span>
                  )}
                </button>
              ))}
            </div>

            {rightTab === "pipeline" && (
              <div>
                <div className="space-y-0.5 px-3 py-2">
                  {steps.map((step) => {
                    const Icon = AGENT_ICONS[step.agent] ?? Sparkles;
                    return (
                      <div key={step.agent} className={cn("flex gap-2.5 rounded-lg px-2 py-2 transition", step.status === "running" && "bg-gold/[0.035]")}>
                        <div className="flex flex-col items-center pt-0.5">
                          {statusIcon(step.status)}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-2">
                            <span className="inline-flex items-center gap-1.5 truncate text-[11px] font-medium text-white/70">
                              <Icon className="h-3 w-3 text-white/30" /> {step.title}
                            </span>
                            <span className={cn(
                              "shrink-0 text-[8.5px]",
                              step.status === "done" ? "text-mint-400/70" : step.status === "running" ? "text-gold" : step.status === "error" ? "text-red-300" : "text-white/25",
                            )}>
                              {STEP_STATUS_LABEL[step.status]}
                            </span>
                          </div>
                          {step.detail && <p className="mt-0.5 line-clamp-2 text-[9.5px] leading-4 text-white/30">{step.detail}</p>}
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="border-t border-white/[0.06] p-2">
                  <div className="flex items-center justify-between px-1.5 pb-1.5">
                    <span className="inline-flex items-center gap-1.5 text-[9px] font-semibold uppercase tracking-[0.14em] text-white/25">
                      <Terminal className="h-3 w-3" /> Journal
                    </span>
                    {streaming && (
                      <span className="inline-flex items-center gap-1 text-[8.5px] text-gold">
                        <span className="status-dot animate-pulseSoft bg-gold" /> en direct
                      </span>
                    )}
                  </div>
                  <div ref={logRef} className="max-h-[180px] min-h-[110px] overflow-y-auto rounded-xl border border-white/[0.05] bg-ink-950/70 p-2.5 font-mono text-[9.5px] leading-5">
                    {logs.map((entry, index) => (
                      <div
                        key={`${entry.at}-${index}`}
                        className={cn(
                          "flex gap-1.5",
                          entry.level === "error" ? "text-red-300/80" : entry.level === "warn" ? "text-gold/75" : "text-white/40",
                        )}
                        suppressHydrationWarning
                      >
                        <span className="shrink-0 text-white/15" suppressHydrationWarning>{new Date(entry.at).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}</span>
                        <span className="break-words" suppressHydrationWarning>{entry.message}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {(issues.length > 0 || warnings.length > 0) && (
                  <div className="border-t border-white/[0.06] p-3">
                    <div className="mb-1.5 flex items-center gap-1.5 text-[9px] font-semibold uppercase tracking-[0.14em] text-gold/70">
                      <AlertTriangle className="h-3 w-3" /> Points d'attention
                    </div>
                    <div className="max-h-[140px] space-y-1.5 overflow-y-auto">
                      {issues.map((issue, index) => (
                        <div key={`${issue.path}-${issue.code}-${index}`} className="rounded-lg border border-white/[0.05] bg-white/[0.02] px-2 py-1.5">
                          <div className="flex items-center justify-between gap-2">
                            <span className="truncate font-mono text-[9px] text-white/45">{issue.path}</span>
                            <span className={cn("shrink-0 text-[8px] uppercase", issue.severity === "error" ? "text-red-300" : "text-gold")}>
                              {issue.severity}
                            </span>
                          </div>
                          <p className="mt-0.5 text-[9.5px] leading-4 text-white/30">{issue.message}</p>
                        </div>
                      ))}
                      {warnings.slice(0, 4).map((warning, index) => (
                        <p key={`warning-${index}`} className="text-[9.5px] leading-4 text-white/30">· {warning}</p>
                      ))}
                      {warnings.length > 4 && <p className="text-[9px] text-white/20">+ {warnings.length - 4} autre(s) avertissement(s)</p>}
                    </div>
                  </div>
                )}
              </div>
            )}

            {rightTab === "history" && (
              <div className="max-h-[560px] overflow-y-auto p-3">
                {generations.length === 0 ? (
                  <div className="px-2 py-10 text-center text-[11px] text-white/30">Aucune génération pour l'instant.</div>
                ) : (
                  <div className="space-y-2">
                    {generations.map((generation) => {
                      const info = GENERATION_STATUS[generation.status] ?? GENERATION_STATUS.partial!;
                      return (
                        <details key={generation.id} className="group rounded-xl border border-white/[0.06] bg-white/[0.02] px-3 py-2.5">
                          <summary className="flex cursor-pointer list-none items-center justify-between gap-2">
                            <span className="inline-flex items-center gap-1.5 text-[10px] font-medium">
                              <span className={cn("status-dot", info.dot)} />
                              <span className={info.className}>{info.label}</span>
                            </span>
                            <span className="text-[9px] text-white/25" suppressHydrationWarning>{formatDate(generation.createdAt)}</span>
                          </summary>
                          <div className="mt-2 flex flex-wrap gap-2 text-[9px] text-white/30">
                            <span>{generation.filesWritten} fichiers</span>
                            <span>· {formatDuration(generation.durationMs)}</span>
                            <span>· {generation.mode}</span>
                          </div>
                          {generation.summary && <p className="mt-1.5 text-[9.5px] leading-4 text-white/40">{generation.summary}</p>}
                          {generation.error && <p className="mt-1 text-[9.5px] leading-4 text-red-300/70">{generation.error}</p>}
                          {generation.warnings.length > 0 && (
                            <p className="mt-1 text-[9px] text-gold/60">{generation.warnings.length} avertissement(s)</p>
                          )}
                          <div className="mt-2 space-y-1 border-t border-white/[0.05] pt-2">
                            {generation.steps.map((step) => (
                              <div key={step.agent} className="flex items-center justify-between gap-2 text-[9px]">
                                <span className="truncate text-white/35">{step.title}</span>
                                <span className={cn(
                                  step.status === "done" ? "text-mint-400/70" : step.status === "error" ? "text-red-300/70" : "text-white/25",
                                )}>
                                  {step.status}
                                </span>
                              </div>
                            ))}
                          </div>
                        </details>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {rightTab === "build" && (
              <div className="px-3 py-3">
                <BuildPanel projectId={project.id} />
              </div>
            )}

            {rightTab === "deploy" && (
              <DeploymentPanel
                projectId={project.id}
                projectName={project.name}
                files={files.map((file) => file.path)}
                initial={initialDeployment}
              />
            )}
          </div>

          {project.spec && (
            <div className="card-tight p-3.5">
              <div className="flex items-center justify-between">
                <h3 className="text-[9px] font-semibold uppercase tracking-[0.14em] text-white/25">Spécification</h3>
                <span className="text-[8.5px] text-white/20">{project.spec.packageName ?? ""}</span>
              </div>
              <div className="mt-2 flex flex-wrap gap-1">
                {project.spec.entities.map((entity) => (
                  <span key={entity.key} className="chip py-0.5 text-[9px]">{entity.label}</span>
                ))}
                {project.spec.platforms.map((platform) => (
                  <span key={platform} className="chip border-sky-400/15 py-0.5 text-[9px] text-sky-400/70">{platform}</span>
                ))}
              </div>
            </div>
          )}

          <div className="flex items-center gap-2 px-1 text-[9px] text-white/20">
            <CloudOff className="h-3 w-3" />
            Hors ligne d'abord · Hive + Supabase
            <span className="ml-auto inline-flex items-center gap-1">
              <Globe2 className="h-3 w-3" /> {project.spec?.platforms.length ?? 0} plateformes
            </span>
          </div>
        </aside>
      </main>

      {notice && (
        <div className="fixed bottom-5 left-1/2 z-50 w-[calc(100%-2rem)] max-w-md -translate-x-1/2 rounded-2xl border border-white/10 bg-ink-800/95 px-4 py-3 text-center text-[11.5px] leading-5 text-white/70 shadow-panel backdrop-blur">
          {notice}
        </div>
      )}
    </div>
  );
}
