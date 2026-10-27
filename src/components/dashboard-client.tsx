"use client";

import { useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  ArrowUpRight,
  CheckCircle2,
  Clock3,
  Cpu,
  FileCode2,
  FolderKanban,
  History,
  Layers,
  Loader2,
  Plus,
  Rocket,
  Sparkles,
  Trash2,
} from "lucide-react";
import { NewProjectDialog } from "@/components/new-project-dialog";
import { apiFetch } from "@/lib/client-api";
import { cn } from "@/lib/cn";
import { MARKETPLACE_TEMPLATES } from "@/lib/templates";

export interface DashboardProject {
  id: string;
  name: string;
  description: string | null;
  prompt: string;
  status: string;
  mode: string;
  model: string | null;
  templateKey: string | null;
  saas: boolean;
  updatedAt: string;
  lastGenerationAt: string | null;
  fileCount: number;
  generationCount: number;
}

const TEMPLATE_LABELS = new Map(MARKETPLACE_TEMPLATES.map((template) => [template.key, template.name]));

const STATUS: Record<string, { label: string; className: string; dot: string }> = {
  draft: { label: "Brouillon", className: "text-white/45 border-white/10 bg-white/[0.03]", dot: "bg-white/30" },
  generating: { label: "Génération…", className: "text-gold border-gold/25 bg-gold/[0.06]", dot: "bg-gold animate-pulseSoft" },
  ready: { label: "Prêt", className: "text-mint-300 border-mint-400/25 bg-mint-400/[0.06]", dot: "bg-mint-400" },
  partial: { label: "À vérifier", className: "text-sky-400 border-sky-400/25 bg-sky-400/[0.06]", dot: "bg-sky-400" },
  error: { label: "Erreur", className: "text-red-300 border-red-400/25 bg-red-400/[0.06]", dot: "bg-red-400" },
};

const MODE_LABEL: Record<string, string> = {
  scaffold: "Gabarits",
  standard: "Hybride",
  max: "IA renforcée",
};

const EXAMPLES = [
  "Crée une application de gestion de projets avec Android, iPhone, Web, Windows, mode offline et synchronisation cloud",
  "Une application CRM pour une ONG avec contacts, dons et activités terrain",
  "Application de facturation avec clients, factures et paiements",
];

function formatDate(value: string | null): string {
  if (!value) return "Jamais";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  const diff = Date.now() - date.getTime();
  const minutes = Math.floor(diff / 60_000);
  if (minutes < 1) return "à l'instant";
  if (minutes < 60) return `il y a ${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `il y a ${hours} h`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `il y a ${days} j`;
  return new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short", year: "numeric" }).format(date);
}

export function DashboardClient({
  initialProjects,
  defaultModel,
  initialOpen,
  initialTemplateKey = null,
  figmaEnabled = false,
  userName,
}: {
  initialProjects: DashboardProject[];
  defaultModel: string;
  initialOpen: boolean;
  initialTemplateKey?: string | null;
  figmaEnabled?: boolean;
  userName: string;
}) {
  const [projects, setProjects] = useState(initialProjects);
  const [dialogOpen, setDialogOpen] = useState(initialOpen || Boolean(initialTemplateKey));
  const [seedPrompt, setSeedPrompt] = useState("");
  const [seedTemplate, setSeedTemplate] = useState<string | null>(initialTemplateKey);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const totalFiles = projects.reduce((total, project) => total + project.fileCount, 0);
  const totalGenerations = projects.reduce((total, project) => total + project.generationCount, 0);
  const ready = projects.filter((project) => project.status === "ready").length;

  function openDialog(prompt = "") {
    setSeedPrompt(prompt);
    setSeedTemplate(null);
    setDialogOpen(true);
  }

  function closeDialog() {
    setDialogOpen(false);
    setSeedPrompt("");
    setSeedTemplate(null);
    if (typeof window !== "undefined") {
      window.history.replaceState(null, "", "/dashboard");
    }
  }

  async function removeProject(project: DashboardProject) {
    const confirmed = window.confirm(
      `Supprimer « ${project.name} » ? Les fichiers et l'historique seront définitivement supprimés.`,
    );
    if (!confirmed) return;
    setDeleting(project.id);
    try {
      await apiFetch(`/api/projects/${project.id}`, { method: "DELETE" });
      setProjects((current) => current.filter((item) => item.id !== project.id));
      setNotice(`« ${project.name} » a été supprimé.`);
      setTimeout(() => setNotice(null), 4000);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Suppression impossible.");
      setTimeout(() => setNotice(null), 5000);
    } finally {
      setDeleting(null);
    }
  }

  return (
    <>
      <main className="container-page py-10 sm:py-12">
        <div className="flex flex-col justify-between gap-6 md:flex-row md:items-end">
          <div>
            <div className="section-label">Votre studio</div>
            <h1 className="mt-2 font-display text-3xl font-semibold tracking-tight sm:text-4xl">
              Bonjour, {userName.split(" ")[0]}.
            </h1>
            <p className="mt-2 max-w-lg text-[13px] leading-6 text-white/40">
              Créez une application, reprenez une génération ou explorez le code produit par les agents.
            </p>
          </div>
          <button type="button" onClick={() => openDialog()} className="btn-primary self-start px-5 py-2.5 md:self-auto">
            <Plus className="h-4 w-4" /> Nouvelle application
          </button>
        </div>

        <section className="mt-8 grid grid-cols-2 gap-3 lg:grid-cols-4">
          {[
            { icon: FolderKanban, label: "Projets", value: projects.length, tone: "text-mint-300 bg-mint-400/10 border-mint-400/15" },
            { icon: FileCode2, label: "Fichiers générés", value: totalFiles, tone: "text-sky-400 bg-sky-400/10 border-sky-400/15" },
            { icon: Rocket, label: "Prêts à déployer", value: ready, tone: "text-gold bg-gold/10 border-gold/15" },
            { icon: History, label: "Générations", value: totalGenerations, tone: "text-white/70 bg-white/[0.05] border-white/10" },
          ].map((stat) => {
            const Icon = stat.icon;
            return (
              <div key={stat.label} className="card-tight flex items-center gap-3.5 p-4">
                <span className={cn("flex h-10 w-10 items-center justify-center rounded-xl border", stat.tone)}>
                  <Icon className="h-4 w-4" />
                </span>
                <div>
                  <div className="font-display text-xl font-semibold tracking-tight">{stat.value}</div>
                  <div className="text-[10px] uppercase tracking-[0.12em] text-white/30">{stat.label}</div>
                </div>
              </div>
            );
          })}
        </section>

        {projects.length === 0 ? (
          <section className="mt-10 overflow-hidden rounded-3xl border border-dashed border-white/12 bg-white/[0.015] px-6 py-14 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-mint-400/20 bg-mint-400/[0.07]">
              <Sparkles className="h-6 w-6 text-mint-300" />
            </div>
            <h2 className="mt-5 font-display text-xl font-semibold">Votre première application vous attend.</h2>
            <p className="mx-auto mt-2 max-w-md text-[12.5px] leading-6 text-white/40">
              Décrivez votre besoin en une phrase. Kôloublé IA produira l'architecture Flutter,
              le schéma Supabase et tous les fichiers de déploiement.
            </p>
            <div className="mx-auto mt-7 grid max-w-2xl gap-2 text-left">
              {EXAMPLES.map((example, index) => (
                <button
                  key={example}
                  type="button"
                  onClick={() => openDialog(example)}
                  className="group flex items-center gap-3 rounded-2xl border border-white/[0.07] bg-ink-850/60 px-4 py-3 transition hover:border-mint-400/25 hover:bg-mint-400/[0.03]"
                >
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-white/[0.04] font-mono text-[10px] text-white/35">
                    0{index + 1}
                  </span>
                  <span className="flex-1 text-[12px] leading-5 text-white/55 group-hover:text-white/75">{example}</span>
                  <ArrowUpRight className="h-3.5 w-3.5 shrink-0 text-white/20 transition group-hover:text-mint-300" />
                </button>
              ))}
            </div>
            <button type="button" onClick={() => openDialog()} className="btn-primary mt-6 px-5 py-2.5">
              <Plus className="h-4 w-4" /> Démarrer maintenant
            </button>
          </section>
        ) : (
          <section className="mt-10">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="font-display text-sm font-semibold uppercase tracking-[0.14em] text-white/45">
                Applications récentes
              </h2>
              <span className="text-[11px] text-white/25">{projects.length} projet{projects.length > 1 ? "s" : ""}</span>
            </div>
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {projects.map((project) => {
                const status = STATUS[project.status] ?? STATUS.draft!;
                return (
                  <article
                    key={project.id}
                    className="card group flex flex-col p-5 transition duration-300 hover:-translate-y-0.5 hover:border-mint-400/20"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <span className={cn("chip py-0.5 text-[10px]", status.className)}>
                        <span className={cn("status-dot", status.dot)} />
                        {status.label}
                      </span>
                      <button
                        type="button"
                        onClick={() => removeProject(project)}
                        disabled={deleting === project.id}
                        className="rounded-lg p-1.5 text-white/20 opacity-0 transition hover:bg-red-400/10 hover:text-red-300 focus:opacity-100 group-hover:opacity-100"
                        aria-label={`Supprimer ${project.name}`}
                      >
                        {deleting === project.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                      </button>
                    </div>

                    <Link href={`/projects/${project.id}`} className="mt-4 block">
                      <h3 className="truncate font-display text-[17px] font-semibold tracking-tight text-white/90 transition group-hover:text-mint-100">
                        {project.name}
                      </h3>
                      <p className="mt-1.5 line-clamp-2 min-h-[2.5rem] text-[11.5px] leading-5 text-white/35">
                        {project.description || project.prompt}
                      </p>
                    </Link>

                    <div className="mt-4 flex flex-wrap items-center gap-1.5">
                      <span className="chip py-0.5 text-[9.5px]">
                        <Cpu className="h-2.5 w-2.5" /> {MODE_LABEL[project.mode] ?? project.mode}
                      </span>
                      {project.templateKey && (
                        <span className="chip py-0.5 text-[9.5px]">
                          <Layers className="h-2.5 w-2.5" /> {TEMPLATE_LABELS.get(project.templateKey) ?? project.templateKey}
                        </span>
                      )}
                      {project.saas && (
                        <span className="chip border-gold/25 bg-gold/[0.06] py-0.5 text-[9.5px] text-gold/90">
                          SaaS
                        </span>
                      )}
                      <span className="chip py-0.5 text-[9.5px]">
                        <FileCode2 className="h-2.5 w-2.5" /> {project.fileCount} fichiers
                      </span>
                      <span className="chip py-0.5 text-[9.5px]">
                        <History className="h-2.5 w-2.5" /> {project.generationCount}
                      </span>
                    </div>

                    <div className="mt-auto flex items-center justify-between border-t border-white/[0.06] pt-4 mt-4">
                      <span className="inline-flex items-center gap-1.5 text-[10px] text-white/25" suppressHydrationWarning>
                        <Clock3 className="h-3 w-3" /> {formatDate(project.lastGenerationAt ?? project.updatedAt)}
                      </span>
                      <Link
                        href={`/projects/${project.id}`}
                        className="inline-flex items-center gap-1 text-[11px] font-medium text-mint-300/80 transition hover:text-mint-200"
                      >
                        Ouvrir <ArrowUpRight className="h-3 w-3" />
                      </Link>
                    </div>
                  </article>
                );
              })}
            </div>

            <div className="mt-4 flex items-start gap-2.5 rounded-2xl border border-white/[0.06] bg-white/[0.015] px-4 py-3.5">
              {ready > 0 ? (
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-mint-400" />
              ) : (
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-gold/70" />
              )}
              <p className="text-[11.5px] leading-5 text-white/35">
                {ready > 0
                  ? `${ready} projet${ready > 1 ? "s" : ""} prêt${ready > 1 ? "s" : ""} à être exporté${ready > 1 ? "s" : ""} en ZIP ou déployé${ready > 1 ? "s" : ""} sur Vercel / votre domaine.`
                  : "Ouvrez un projet pour lancer une génération, corriger les avertissements et exporter le ZIP."}
              </p>
            </div>
          </section>
        )}
      </main>

      <NewProjectDialog
        open={dialogOpen}
        onClose={closeDialog}
        initialPrompt={seedPrompt}
        initialTemplateKey={seedTemplate}
        defaultModel={defaultModel}
        figmaEnabled={figmaEnabled}
      />

      {notice && (
        <div className="fixed bottom-5 left-1/2 z-50 -translate-x-1/2 rounded-full border border-white/10 bg-ink-800/95 px-4 py-2.5 text-[12px] text-white/70 shadow-panel backdrop-blur">
          {notice}
        </div>
      )}
    </>
  );
}
