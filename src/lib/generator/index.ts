import { generateWithAi } from "@/lib/ai";
import { extractJsonObject } from "@/lib/ollama";
import {
  aiArchitectSchema,
  mergeAiEnhancements,
  normalizeCustomDomain,
  parsePrompt,
  repoNameFor,
  resolveDeployment,
  type AppSpec,
  type DeployTarget,
} from "@/lib/spec";
import { buildDevopsFiles } from "./devops";
import { buildFlutterCoreFiles } from "./flutter-core";
import { buildFlutterEntityFiles } from "./flutter-entities";
import { buildPrototypeFile } from "./preview";
import { repairFiles } from "./repair";
import { buildSupabaseFiles } from "./supabase";
import type {
  GenerationMode,
  GenerationOutcome,
  GeneratedFile,
  StreamEvent,
} from "./types";
import { summarizeIssues, validateFiles } from "./validate";

export type EventSink = (event: StreamEvent) => void | Promise<void>;
export { AGENTS } from "./types";

export interface RunGenerationOptions {
  prompt: string;
  model?: string | null;
  mode: GenerationMode;
  appName?: string | null;
  templateKey?: string | null;
  saas?: boolean;
  provider?: string | null;
  deployment?: {
    target?: DeployTarget;
    repoName?: string;
    customDomain?: string | null;
  } | null;
  generationId?: string;
  onEvent?: EventSink;
}

const MODE_LABEL: Record<GenerationMode, string> = {
  scaffold: "gabarits déterministes",
  standard: "hybride IA + gabarits",
  max: "IA renforcée + auto-réparation",
};

export async function runGeneration(options: RunGenerationOptions): Promise<GenerationOutcome> {
  const emit: EventSink = options.onEvent ?? (() => undefined);
  const generationId = options.generationId ?? "";
  const warnings: string[] = [];
  const logs: string[] = [];

  const log = async (level: "info" | "warn" | "error", message: string) => {
    logs.push(message);
    await emit({ type: "log", level, message });
  };

  const stepStart = async (agent: string, title: string, detail?: string) => {
    await emit({ type: "step", agent, title, status: "start", detail });
  };
  const stepDone = async (agent: string, title: string, detail?: string) => {
    await emit({ type: "step", agent, title, status: "done", detail });
  };

  let spec = parsePrompt(options.prompt, options.appName, {
    templateKey: options.templateKey,
    saas: options.saas,
  });
  const useAi = options.mode !== "scaffold";

  await log(
    "info",
    `Kôloublé IA démarre « ${spec.appName} » en mode ${MODE_LABEL[options.mode]} (${spec.entities.length} entité(s)).`,
  );

  // ── 1. Architecte ──────────────────────────────────────────────────────────
  await stepStart("architect", "Architecte logiciel");
  if (useAi) {
    try {
      const enhanced = await enhanceSpec(spec, options.prompt, options.model, options.provider);
      if (enhanced) {
        spec = enhanced;
        await log("info", `Architecte IA : identité et contenus éditoriaux enrichis pour « ${spec.appName} ».`);
      } else {
        warnings.push("L'architecte IA n'a pas renvoyé de spécification exploitable.");
        await log("warn", "Réponse IA inexploitable : conservation de la spécification déterministe.");
      }
    } catch (error) {
      warnings.push(`Architecte IA indisponible : ${error instanceof Error ? error.message : "erreur inconnue"}.`);
      await log("warn", "Ollama indisponible ou trop lent : la génération continue avec les gabarits locaux.");
    }
  } else {
    await log("info", "Mode gabarits : aucune dépendance à Ollama pour cette génération.");
  }
  await stepDone(
    "architect",
    "Architecte logiciel",
    `${spec.entities.length} module(s) métier · ${spec.platforms.join(" · ")}`,
  );

  if (options.deployment) {
    const base = resolveDeployment(spec);
    const deployment = {
      target: options.deployment.target ?? base.target,
      repoName: repoNameFor(options.deployment.repoName ?? base.repoName),
      customDomain: normalizeCustomDomain(options.deployment.customDomain) ?? base.customDomain,
    };
    spec = { ...spec, deployment };
    await log("info", `Déploiement préparé : dépôt ${deployment.repoName} pour ${deployment.target}.`);
  }

  // ── 2. Designer ────────────────────────────────────────────────────────────
  await stepStart("designer", "Designer UI/UX");
  const prototype = buildPrototypeFile(spec);
  await stepDone("designer", "Designer UI/UX", "Prototype web interactif autonome et palette appliquée.");

  // ── 3. Flutter ─────────────────────────────────────────────────────────────
  await stepStart("flutter", "Développeur Flutter");
  const flutterFiles = [...buildFlutterCoreFiles(spec), ...buildFlutterEntityFiles(spec)];
  await stepDone(
    "flutter",
    "Développeur Flutter",
    `${flutterFiles.length} fichier(s) Dart · Hive, Supabase, go_router.`,
  );

  // ── 4. Supabase ────────────────────────────────────────────────────────────
  await stepStart("supabase", "Expert Supabase");
  const supabaseFiles = buildSupabaseFiles(spec);
  await stepDone(
    "supabase",
    "Expert Supabase",
    spec.saas
      ? "Schéma PostgreSQL multi-tenant, RLS par organisation, plans et abonnements."
      : "Schéma PostgreSQL, RLS par propriétaire et triggers.",
  );

  // ── 5. DevOps ──────────────────────────────────────────────────────────────
  await stepStart("devops", "DevOps");
  const devopsFiles = buildDevopsFiles(spec);
  await stepDone("devops", "DevOps", "Vercel, Docker durci, Caddy et GitHub Actions.");

  // ── 6. QA : validation, documentation IA, réparation ───────────────────────
  await stepStart("tester", "Ingénieur QA");
  const fallbacks = new Map<string, GeneratedFile>();
  const generated = new Map<string, GeneratedFile>();
  const addFile = async (file: GeneratedFile) => {
    const existing = generated.get(file.path);
    if (existing) return;
    generated.set(file.path, file);
    await emit({ type: "file", path: file.path, bytes: Buffer.byteLength(file.content, "utf8"), source: file.source });
  };

  for (const file of [...flutterFiles, ...supabaseFiles, ...devopsFiles, prototype]) {
    fallbacks.set(file.path, file);
    await addFile(file);
  }

  if (useAi) {
    const doc = await tryGenerateArchitectureDoc(spec, options.prompt, options.model, options.provider);
    if (doc) {
      await addFile(doc);
      await log("info", "Documentation d'architecture rédigée par l'IA.");
    } else {
      warnings.push("Documentation IA non générée : le README déterministe reste la référence.");
    }
  }

  let files = [...generated.values()];
  let issues = validateFiles(files, spec);
  for (const issue of issues) {
    await emit({ type: "issue", issue });
  }

  if (issues.some((issue) => issue.severity === "error")) {
    await log("warn", "Des incohérences ont été détectées : lancement de la réparation automatique.");
    const repair = await repairFiles({
      files,
      spec,
      issues,
      fallbacks,
      model: options.model,
      provider: options.provider,
      useAi: options.mode === "max",
      onLog: (level, message) => {
        logs.push(message);
        void emit({ type: "log", level, message });
      },
    });
    files = repair.files;
    issues = repair.issues;
    warnings.push(...repair.warnings);
    if (repair.repaired.length > 0) {
      for (const filePath of repair.repaired) {
        const file = files.find((item) => item.path === filePath);
        if (file) {
          await emit({ type: "file", path: file.path, bytes: Buffer.byteLength(file.content, "utf8"), source: "repaired" });
        }
      }
      await log("info", `${repair.repaired.length} fichier(s) réparé(s) automatiquement.`);
    }
    for (const issue of issues.filter((item) => item.severity === "error")) {
      await emit({ type: "issue", issue });
      warnings.push(`${issue.path} : ${issue.message}`);
    }
  }

  const summaryStats = summarizeIssues(issues);
  await stepDone(
    "tester",
    "Ingénieur QA",
    `${files.length} fichier(s) validé(s) · ${summaryStats.errors} erreur(s) · ${summaryStats.warnings} avertissement(s).`,
  );

  const status: GenerationOutcome["status"] =
    files.length === 0 ? "error" : summaryStats.errors > 0 || warnings.length > 0 ? "partial" : "success";

  const summary = [
    `${spec.appName} — ${files.length} fichiers`,
    `${spec.entities.length} module(s) métier`,
    `${spec.platforms.join(", ")}`,
    MODE_LABEL[options.mode],
    status === "success" ? "prêt à déployer" : "à vérifier",
  ].join(" · ");

  if (warnings.length > 0) {
    await log("warn", `${warnings.length} avertissement(s) de génération.`);
  }

  return {
    generationId,
    status,
    files: files.sort((a, b) => a.path.localeCompare(b.path)),
    issues,
    warnings: [...new Set(warnings)],
    summary,
    spec,
  };
}

export async function enhanceSpec(
  spec: AppSpec,
  prompt: string,
  model?: string | null,
  provider?: string | null,
): Promise<AppSpec | null> {
  const skeleton = {
    appName: spec.appName,
    packageName: spec.packageName,
    entities: spec.entities.map((entity) => ({
      key: entity.key,
      label: entity.label,
      fields: entity.fields.map((field) => ({ key: field.key, type: field.type })),
    })),
    platforms: spec.platforms,
  };
  const system = [
    "Tu es un architecte produit senior pour applications mobiles Flutter et Supabase.",
    "Tu réponds uniquement en JSON valide, sans texte autour, sans secret ni clé.",
    "Tu ne modifies jamais la liste des entités ni des champs fournie.",
  ].join(" ");
  const aiPrompt = [
    "Demande utilisateur :",
    prompt.slice(0, 2_500),
    "",
    "Squelette déterministe déjà figé (ne pas changer les clés) :",
    JSON.stringify(skeleton),
    "",
    "Produis un JSON avec :",
    "- appName : nom court et professionnel (2-48 caractères),",
    "- tagline : accroche de 8-160 caractères,",
    "- summary : résumé produit de 10-400 caractères,",
    "- primaryColor : couleur principale au format #RRGGBB adaptée au métier,",
    "- copy : { welcomeTitle, welcomeMessage, emptyState, syncMessage } en français, ton chaleureux et concret.",
  ].join("\n");

  const result = await generateWithAi({
    prompt: aiPrompt,
    system,
    model,
    provider,
    format: "json",
    temperature: 0.4,
    numPredict: 700,
    timeoutMs: 90_000,
  });
  const parsed = aiArchitectSchema.safeParse(extractJsonObject(result.text));
  if (!parsed.success) return null;
  return mergeAiEnhancements(spec, parsed.data);
}

async function tryGenerateArchitectureDoc(
  spec: AppSpec,
  prompt: string,
  model?: string | null,
  provider?: string | null,
): Promise<GeneratedFile | null> {
  try {
    const entityLines = spec.entities
      .map((entity) => `- ${entity.labelPlural} (${entity.key}) : ${entity.fields.map((field) => field.label).join(", ")}`)
      .join("\n");
    const system = [
      "Tu es un architecte logiciel. Tu écris une documentation Markdown concise en français.",
      "Aucune clé, aucun secret, aucune instruction d'installation inventée.",
      "Réponds uniquement avec le Markdown, sans commentaire autour.",
    ].join(" ");
    const aiPrompt = [
      `Application : ${spec.appName}`,
      `Objectif : ${prompt.slice(0, 1_200)}`,
      `Plateformes : ${spec.platforms.join(", ")}`,
      `Architecture : Flutter feature-first, Riverpod, go_router, Hive hors ligne, synchronisation Supabase.`,
      `Entités :\n${entityLines}`,
      "",
      "Rédige docs/architecture.md avec :",
      "## Vision, ## Architecture, ## Modèle de données, ## Hors ligne et synchronisation, ## Sécurité, ## Déploiement.",
      "Maximum 550 mots. Pas de bloc de code contenant des identifiants.",
    ].join("\n");
    const result = await generateWithAi({
      prompt: aiPrompt,
      system,
      model,
      provider,
      temperature: 0.5,
      numPredict: 1_000,
      timeoutMs: 120_000,
    });
    const content = sanitizeMarkdown(result.text);
    if (content.length < 200) return null;
    return { path: "docs/architecture.md", content, language: "markdown", source: "ai" };
  } catch {
    return null;
  }
}

function sanitizeMarkdown(text: string): string {
  return text
    .replace(/eyJ[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{10,}/g, "[secret retiré]")
    .replace(/\bsk-[A-Za-z0-9]{24,}\b/g, "[secret retiré]")
    .replace(/-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----[\s\S]*?-----END (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/g, "[secret retiré]")
    .slice(0, 14_000)
    .trim()
    .concat("\n");
}

export function collectFallbackFiles(spec: AppSpec): GeneratedFile[] {
  return [
    ...buildFlutterCoreFiles(spec),
    ...buildFlutterEntityFiles(spec),
    ...buildSupabaseFiles(spec),
    ...buildDevopsFiles(spec),
    buildPrototypeFile(spec),
  ];
}
