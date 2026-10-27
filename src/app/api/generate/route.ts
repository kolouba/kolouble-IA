import { NextResponse } from "next/server";
import { z } from "zod";
import { resolveAiSelection } from "@/lib/ai";
import { prisma } from "@/lib/db";
import { persistGeneratedFiles } from "@/lib/generation-store";
import { AGENTS, runGeneration } from "@/lib/generator";
import type { GenerationMode } from "@/lib/generator/types";
import { requireUser } from "@/lib/guard";
import { assertSameOrigin, jsonError, readJson } from "@/lib/http";
import { createProjectForUser } from "@/lib/project-create";
import { enforceRateLimit } from "@/lib/rate-limit";
import { createProjectSchema } from "@/lib/validation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

const generateRequestSchema = createProjectSchema.extend({
  preserveEdits: z.boolean().optional(),
});

export async function POST(request: Request) {
  try {
    const user = await requireUser();
    assertSameOrigin(request);
    enforceRateLimit(`generate-api:${user.id}`, 6, 10 * 60 * 1000);
    const payload = await readJson(request, generateRequestSchema);
    const mode: GenerationMode = payload.mode ?? "standard";
    const selection = resolveAiSelection(payload.provider, payload.model);

    const { project, spec } = await createProjectForUser(user.id, payload);
    const startedAt = Date.now();

    const generation = await prisma.generation.create({
      data: {
        projectId: project.id,
        prompt: payload.prompt,
        model: selection.model,
        provider: selection.provider,
        mode,
        status: "running",
        steps: {
          create: AGENTS.map((agent, index) => ({
            agent: agent.id,
            title: agent.title,
            status: "pending",
            order: index + 1,
          })),
        },
      },
      select: { id: true },
    });
    await prisma.project.update({
      where: { id: project.id },
      data: { status: "generating", model: selection.model, provider: selection.provider, mode },
    });

    try {
      const outcome = await runGeneration({
        prompt: payload.prompt,
        model: selection.model,
        provider: selection.provider,
        mode,
        generationId: generation.id,
        appName: project.autoNamed ? null : project.name,
        templateKey: project.templateKey,
        saas: project.saas,
        deployment: spec.deployment,
      });

      const persisted = await persistGeneratedFiles(project.id, outcome.files, {
        preserveEdits: payload.preserveEdits,
      });
      const warnings = [...new Set([...outcome.warnings, ...persisted.warnings])];
      const durationMs = Date.now() - startedAt;

      await prisma.generation.update({
        where: { id: generation.id },
        data: {
          status: outcome.status === "error" ? "error" : outcome.status === "partial" ? "partial" : "success",
          summary: outcome.summary,
          durationMs,
          filesWritten: persisted.filesWritten,
          warnings: warnings.length > 0 ? JSON.stringify(warnings) : null,
          completedAt: new Date(),
          error: outcome.status === "error" ? "Aucun fichier produit." : null,
        },
      });
      await prisma.generationStep.updateMany({
        where: { generationId: generation.id },
        data: { status: "done", finishedAt: new Date() },
      });
      await prisma.project.update({
        where: { id: project.id },
        data: {
          status: outcome.status === "error" ? "error" : outcome.status === "partial" ? "partial" : "ready",
          spec: JSON.stringify(outcome.spec),
          templateKey: outcome.spec.templateKey,
          saas: outcome.spec.saas,
          lastGenerationAt: new Date(),
          ...(project.autoNamed
            ? { name: outcome.spec.appName, description: outcome.spec.tagline }
            : {}),
        },
      });

      return NextResponse.json({
        projectId: project.id,
        generationId: generation.id,
        status: outcome.status,
        summary: outcome.summary,
        warnings,
        files: outcome.files.map((file) => ({
          path: file.path,
          bytes: Buffer.byteLength(file.content, "utf8"),
          language: file.language,
        })),
      });
    } catch (error) {
      const message = error instanceof Error ? error.message.slice(0, 400) : "Erreur de génération inconnue.";
      await prisma.generation
        .update({
          where: { id: generation.id },
          data: {
            status: "error",
            error: message,
            durationMs: Date.now() - startedAt,
            completedAt: new Date(),
          },
        })
        .catch(() => undefined);
      await prisma.generationStep
        .updateMany({
          where: { generationId: generation.id, status: { in: ["running", "pending"] } },
          data: { status: "error", finishedAt: new Date() },
        })
        .catch(() => undefined);
      await prisma.project.update({ where: { id: project.id }, data: { status: "error" } }).catch(() => undefined);
      return NextResponse.json(
        { projectId: project.id, generationId: generation.id, files: [], error: message, code: "generation_error" },
        { status: 502 },
      );
    }
  } catch (error) {
    return jsonError(error);
  }
}
