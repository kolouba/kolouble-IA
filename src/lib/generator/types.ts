import type { AppSpec } from "@/lib/spec";

export type GenerationMode = "scaffold" | "standard" | "max";

export interface GeneratedFile {
  path: string;
  content: string;
  language: string;
  source: "scaffold" | "ai" | "user";
}

export interface GenerationIssue {
  path: string;
  code: string;
  message: string;
  severity: "error" | "warning";
}

export type StreamEvent =
  | {
      type: "step";
      agent: string;
      title: string;
      status: "start" | "done" | "warning" | "error";
      detail?: string;
    }
  | { type: "file"; path: string; bytes: number; source: string }
  | { type: "log"; level: "info" | "warn" | "error"; message: string }
  | { type: "issue"; issue: GenerationIssue }
  | {
      type: "done";
      generationId: string;
      status: string;
      files: number;
      warnings: string[];
      summary: string;
    }
  | { type: "error"; message: string }
  | { type: "ping"; at: number };

export interface BuildContext {
  spec: AppSpec;
  aiCopy?: string | null;
  aiSummary?: string | null;
}

export interface GenerationOutcome {
  generationId: string;
  status: "success" | "partial" | "error";
  files: GeneratedFile[];
  issues: GenerationIssue[];
  warnings: string[];
  summary: string;
  spec: AppSpec;
}

export interface AgentDefinition {
  id: string;
  title: string;
  description: string;
}

export const AGENTS: AgentDefinition[] = [
  {
    id: "architect",
    title: "Architecte logiciel",
    description: "Analyse le besoin, détecte les entités métier et fige la spécification.",
  },
  {
    id: "designer",
    title: "Designer UI/UX",
    description: "Définit la palette, la hiérarchie visuelle et le prototype web interactif.",
  },
  {
    id: "flutter",
    title: "Développeur Flutter",
    description: "Génère l'architecture feature-first, Hive, Supabase et les écrans.",
  },
  {
    id: "supabase",
    title: "Expert Supabase",
    description: "Produit le schéma PostgreSQL, les politiques RLS et les triggers.",
  },
  {
    id: "devops",
    title: "DevOps",
    description: "Prépare Vercel, Docker, Caddy et le pipeline GitHub Actions.",
  },
  {
    id: "tester",
    title: "Ingénieur QA",
    description: "Ajoute les tests, valide la structure et répare les fichiers incohérents.",
  },
];
