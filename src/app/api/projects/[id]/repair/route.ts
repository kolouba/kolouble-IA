import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { env } from "@/lib/env";
import { collectFallbackFiles } from "@/lib/generator";
import { repairFiles } from "@/lib/generator/repair";
import type { GeneratedFile } from "@/lib/generator/types";
import { validateFiles } from "@/lib/generator/validate";
import { requireUser } from "@/lib/guard";
import { ApiError, assertSameOrigin, jsonError } from "@/lib/http";
import { enforceRateLimit } from "@/lib/rate-limit";
import { parsePrompt, type AppSpec } from "@/lib/spec";
import { repairSchema } from "@/lib/validation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

function resolveSpec(project: {
  prompt: string;
  name: string;
  autoNamed: boolean;
  spec: string | null;
  templateKey: string | null;
  saas: boolean;
}): AppSpec {
  if (project.spec) {
    try {
      const parsed = JSON.parse(project.spec) as AppSpec;
      if (parsed && Array.isArray(parsed.entities) && typeof parsed.appName === "string" && Array.isArray(parsed.platforms)) {
        return parsed;
      }
    } catch {
      // spécification illisible : on retombe sur l'analyse du prompt
    }
  }
  return parsePrompt(project.prompt, project.autoNamed ? null : project.name, {
    templateKey: project.templateKey,
    saas: project.saas,
  });
}

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser();
    assertSameOrigin(request);
    const { id } = await context.params;
    const project = await prisma.project.findFirst({ where: { id, ownerId: user.id } });
    if (!project) throw new ApiError(404, "Projet introuvable.", "not_found");
    enforceRateLimit(`repair:${user.id}`, 6, 10 * 60 * 1000);

    let payload: { useAi?: boolean; model?: string; provider?: string } = {};
    const raw = await request.text();
    if (raw.trim()) {
      let parsed: unknown;
      try {
        parsed = JSON.parse(raw);
      } catch {
        throw new ApiError(400, "Corps JSON invalide.", "invalid_json");
      }
      const result = repairSchema.safeParse(parsed);
      if (!result.success) throw new ApiError(400, "Paramètres de réparation invalides.", "validation_error");
      payload = result.data;
    }

    const dbFiles = await prisma.projectFile.findMany({ where: { projectId: id } });
    if (dbFiles.length === 0) {
      throw new ApiError(409, "Générez d'abord le projet avant de le réparer.", "no_files");
    }
    const spec = resolveSpec(project);
    const files: GeneratedFile[] = dbFiles.map((file) => ({
      path: file.path,
      content: file.content,
      language: file.language,
      source: file.source as GeneratedFile["source"],
    }));

    const issues = validateFiles(files, spec);
    const errors = issues.filter((issue) => issue.severity === "error");
    if (errors.length === 0) {
      return NextResponse.json({
        repaired: [],
        issues,
        warnings: [],
        summary: "Aucune erreur bloquante détectée : le projet est cohérent.",
      });
    }

    const fallbacks = new Map(collectFallbackFiles(spec).map((file) => [file.path, file]));
    const result = await repairFiles({
      files,
      spec,
      issues,
      fallbacks,
      model: payload.model ?? project.model ?? env.defaultModel,
      provider: payload.provider ?? project.provider,
      useAi: payload.useAi !== false,
    });

    for (const filePath of result.repaired) {
      const file = result.files.find((item) => item.path === filePath);
      if (!file) continue;
      await prisma.projectFile.upsert({
        where: { projectId_path: { projectId: id, path: file.path } },
        create: {
          projectId: id,
          path: file.path,
          content: file.content,
          language: file.language,
          bytes: Buffer.byteLength(file.content, "utf8"),
          source: file.source,
        },
        update: {
          content: file.content,
          language: file.language,
          bytes: Buffer.byteLength(file.content, "utf8"),
          source: file.source,
        },
      });
    }

    const remainingErrors = result.issues.filter((issue) => issue.severity === "error").length;
    await prisma.project.update({
      where: { id },
      data: { status: remainingErrors === 0 ? "ready" : "partial", spec: JSON.stringify(spec) },
    });

    return NextResponse.json({
      repaired: result.repaired,
      issues: result.issues,
      warnings: result.warnings,
      summary:
        remainingErrors === 0
          ? `${result.repaired.length} fichier(s) réparé(s), plus aucune erreur bloquante.`
          : `${result.repaired.length} fichier(s) réparé(s), ${remainingErrors} erreur(s) restante(s).`,
    });
  } catch (error) {
    return jsonError(error);
  }
}
