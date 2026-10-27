import { generateWithAi } from "@/lib/ai";
import { extractCodeBlock } from "@/lib/ollama";
import { languageForPath } from "@/lib/path-safety";
import type { AppSpec } from "@/lib/spec";
import type { GeneratedFile, GenerationIssue } from "./types";
import { validateFiles } from "./validate";

export interface RepairOptions {
  files: GeneratedFile[];
  spec: AppSpec;
  issues: GenerationIssue[];
  fallbacks?: Map<string, GeneratedFile>;
  model?: string | null;
  provider?: string | null;
  useAi?: boolean;
  onLog?: (level: "info" | "warn" | "error", message: string) => void;
}

export interface RepairResult {
  files: GeneratedFile[];
  issues: GenerationIssue[];
  repaired: string[];
  warnings: string[];
}

const MAX_AI_FILE_CHARS = 90_000;
const MAX_AI_REPAIRS = 4;

const SENSITIVE_CODES = new Set(["secret.jwt", "secret.openai", "secret.private-key", "secret.service-role", "secret.github"]);

export async function repairFiles(options: RepairOptions): Promise<RepairResult> {
  const files = new Map(options.files.map((file) => [file.path, { ...file }]));
  const repaired: string[] = [];
  const warnings: string[] = [];
  const errorsByPath = new Map<string, GenerationIssue[]>();

  for (const issue of options.issues) {
    if (issue.severity !== "error") continue;
    const list = errorsByPath.get(issue.path) ?? [];
    list.push(issue);
    errorsByPath.set(issue.path, list);
  }

  for (const [filePath, issues] of errorsByPath) {
    const fallback = options.fallbacks?.get(filePath);
    const current = files.get(filePath);
    if (fallback && (!current || current.source !== "user")) {
      files.set(filePath, { ...fallback });
      repaired.push(filePath);
      options.onLog?.("info", `Fichier réparé depuis le gabarit : ${filePath}.`);
      continue;
    }
    if (!current) continue;
    if (issues.some((issue) => SENSITIVE_CODES.has(issue.code))) {
      warnings.push(`${filePath} contient un secret potentiel : correction automatique refusée, action manuelle requise.`);
      continue;
    }
  }

  let currentIssues = validateFiles([...files.values()], options.spec);
  const aiCandidates = [...errorsByPath.keys()].filter(
    (filePath) =>
      options.useAi &&
      files.has(filePath) &&
      files.get(filePath)!.source !== "scaffold" &&
      (files.get(filePath)!.content.length <= MAX_AI_FILE_CHARS) &&
      currentIssues.some((issue) => issue.severity === "error" && issue.path === filePath),
  );

  for (const filePath of aiCandidates.slice(0, MAX_AI_REPAIRS)) {
    const file = files.get(filePath);
    if (!file) continue;
    const issues = currentIssues.filter((issue) => issue.path === filePath);
    try {
      const repairedFile = await repairOneWithAi(file, issues, options);
      if (!repairedFile) continue;
      const candidate = new Map(files);
      candidate.set(filePath, repairedFile);
      const candidateIssues = validateFiles([...candidate.values()], options.spec);
      const before = currentIssues.filter((issue) => issue.severity === "error" && issue.path === filePath).length;
      const after = candidateIssues.filter((issue) => issue.severity === "error" && issue.path === filePath).length;
      if (after < before) {
        files.set(filePath, repairedFile);
        repaired.push(filePath);
        currentIssues = candidateIssues;
        options.onLog?.("info", `Réparation IA appliquée à ${filePath}.`);
      } else {
        warnings.push(`La réparation IA de ${filePath} n'a pas amélioré le fichier.`);
      }
    } catch (error) {
      warnings.push(
        `Réparation IA impossible pour ${filePath} : ${error instanceof Error ? error.message : "erreur inconnue"}.`,
      );
    }
  }

  return {
    files: [...files.values()].sort((a, b) => a.path.localeCompare(b.path)),
    issues: validateFiles([...files.values()], options.spec),
    repaired: [...new Set(repaired)],
    warnings,
  };
}

async function repairOneWithAi(
  file: GeneratedFile,
  issues: GenerationIssue[],
  options: RepairOptions,
): Promise<GeneratedFile | null> {
  const language = languageForPath(file.path) === "text" ? "" : languageForPath(file.path);
  const issueList = issues.map((issue) => `- [${issue.code}] ${issue.message}`).join("\n");
  const system = [
    "Tu es un ingénieur logiciel senior spécialisé Flutter 3, Supabase et DevOps.",
    "Tu répares un fichier d'un projet existant sans changer son rôle ni son chemin.",
    "Réponds uniquement avec le contenu complet du fichier corrigé dans un bloc de code Markdown.",
    "N'introduis aucun secret, aucune clé, aucun commentaire TODO. Le code doit rester compilable.",
  ].join(" ");
  const prompt = [
    `Application : ${options.spec.appName} (package Dart ${options.spec.packageName}, Flutter + Supabase + Hive).`,
    `Fichier à corriger : ${file.path}`,
    `Problèmes détectés :\n${issueList}`,
    "Contenu actuel :",
    "```" + language,
    file.content,
    "```",
    "Renvoie la version corrigée complète.",
  ].join("\n");

  const result = await generateWithAi({
    prompt,
    system,
    model: options.model,
    provider: options.provider,
    temperature: 0.1,
    numPredict: 2_400,
    timeoutMs: 180_000,
  });
  const content = extractCodeBlock(result.text, language || undefined);
  if (!content || content.trim().length === 0) return null;
  if (content.trim() === file.content.trim()) return null;
  if (content.length > MAX_AI_FILE_CHARS) return null;
  return { ...file, content, source: "ai" };
}
