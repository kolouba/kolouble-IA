import { z } from "zod";
import { resolveAiSelection } from "@/lib/ai";
import { prisma } from "@/lib/db";
import { env } from "@/lib/env";
import { persistGeneratedFiles } from "@/lib/generation-store";
import { AGENTS, runGeneration } from "@/lib/generator";
import type { GenerationMode, StreamEvent } from "@/lib/generator/types";
import { requireUser } from "@/lib/guard";
import { ApiError, assertSameOrigin, jsonError } from "@/lib/http";
import { enforceRateLimit } from "@/lib/rate-limit";
import { isDeployTarget, type DeployTarget } from "@/lib/spec";
import { generateSchema } from "@/lib/validation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

const activeProjects = new Set<string>();

type GeneratePayload = z.infer<typeof generateSchema>;

function storedDeployment(specJson: string | null): {
  target?: DeployTarget;
  repoName?: string;
  customDomain?: string | null;
} | null {
  if (!specJson) return null;
  try {
    const parsed = JSON.parse(specJson) as {
      deployment?: { target?: unknown; repoName?: unknown; customDomain?: unknown };
    };
    const deployment = parsed.deployment;
    if (!deployment) return null;
    return {
      target: isDeployTarget(deployment.target) ? deployment.target : undefined,
      repoName: typeof deployment.repoName === "string" ? deployment.repoName : undefined,
      customDomain: typeof deployment.customDomain === "string" ? deployment.customDomain : null,
    };
  } catch {
    return null;
  }
}

async function readOptionalJson(request: Request): Promise<GeneratePayload> {
  const length = Number(request.headers.get("content-length") || 0);
  if (length > 100_000) throw new ApiError(413, "Corps de requête trop volumineux.", "payload_too_large");
  const raw = await request.text();
  if (!raw.trim()) return {};
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new ApiError(400, "Corps JSON invalide.", "invalid_json");
  }
  const result = generateSchema.safeParse(parsed);
  if (!result.success) {
    const details = result.error.issues
      .map((issue) => `${issue.path.join(".") || "payload"}: ${issue.message}`)
      .join(" · ");
    throw new ApiError(400, `Données invalides — ${details}`, "validation_error");
  }
  return result.data;
}

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser();
    assertSameOrigin(request);
    const { id } = await context.params;
    const project = await prisma.project.findFirst({ where: { id, ownerId: user.id } });
    if (!project) throw new ApiError(404, "Projet introuvable.", "not_found");
    enforceRateLimit(`generate:user:${user.id}`, 8, 10 * 60 * 1000);
    enforceRateLimit(`generate:project:${id}`, 5, 10 * 60 * 1000);
    if (activeProjects.has(id)) {
      throw new ApiError(409, "Une génération est déjà en cours pour ce projet.", "generation_running");
    }
    const recent = await prisma.generation.findFirst({
      where: {
        projectId: id,
        status: "running",
        createdAt: { gte: new Date(Date.now() - 20 * 60 * 1000) },
      },
      select: { id: true },
    });
    if (recent) {
      throw new ApiError(409, "Une génération est déjà en cours pour ce projet.", "generation_running");
    }

    const payload = await readOptionalJson(request);
    const resolvedPrompt = payload.prompt ?? project.prompt;
    const selection = resolveAiSelection(
      payload.provider ?? project.provider ?? env.aiProvider,
      payload.model ?? project.model ?? env.aiModel ?? env.defaultModel,
    );
    const resolvedProvider = selection.provider;
    const resolvedModel = selection.model;
    const modeParse = z.enum(["scaffold", "standard", "max"]).safeParse(payload.mode ?? project.mode);
    const mode: GenerationMode = modeParse.success ? modeParse.data : "standard";
    const preserveEdits = payload.preserveEdits !== false;

    activeProjects.add(id);
    let generation: { id: string; createdAt: Date };
    try {
      generation = await prisma.generation.create({
        data: {
          projectId: id,
          prompt: resolvedPrompt,
          model: resolvedModel,
          provider: resolvedProvider,
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
        select: { id: true, createdAt: true },
      });
      await prisma.project.update({
        where: { id },
        data: {
          status: "generating",
          prompt: resolvedPrompt,
          model: resolvedModel,
          provider: resolvedProvider,
          mode,
        },
      });
    } catch (error) {
      activeProjects.delete(id);
      throw error;
    }

    const startedAt = Date.now();
    const generationId = generation.id;
    const encoder = new TextEncoder();
    let clientClosed = false;

    const stream = new ReadableStream<Uint8Array>({
      async start(controller) {
        let heartbeat: ReturnType<typeof setInterval> | null = null;
        const send = (event: StreamEvent) => {
          if (clientClosed) return;
          try {
            controller.enqueue(encoder.encode(JSON.stringify(event) + "\n"));
          } catch {
            clientClosed = true;
          }
        };
        const persistStep = async (event: Extract<StreamEvent, { type: "step" }>) => {
          const now = new Date();
          try {
            if (event.status === "start") {
              await prisma.generationStep.updateMany({
                where: { generationId, agent: event.agent },
                data: { status: "running", startedAt: now, detail: event.detail ?? null },
                });
            } else {
              await prisma.generationStep.updateMany({
                where: { generationId, agent: event.agent },
                data: {
                  status: event.status === "done" ? "done" : event.status,
                  finishedAt: now,
                  detail: event.detail ?? null,
                },
              });
            }
          } catch (error) {
            console.warn("[kolouble] step persistence failed", error);
          }
        };

        heartbeat = setInterval(() => send({ type: "ping", at: Date.now() }), 15_000);

        try {
          const outcome = await runGeneration({
            prompt: resolvedPrompt,
            model: resolvedModel,
            provider: resolvedProvider,
            mode,
            generationId,
            appName: project.autoNamed ? null : project.name,
            templateKey: project.templateKey,
            saas: project.saas,
            deployment: storedDeployment(project.spec),
            onEvent: async (event) => {
              send(event);
              if (event.type === "step") await persistStep(event);
            },
          });

          const warnings = [...outcome.warnings];
          let filesWritten = 0;

          if (outcome.files.length > 0) {
            const persisted = await persistGeneratedFiles(id, outcome.files, { preserveEdits });
            warnings.push(...persisted.warnings);
            filesWritten = persisted.filesWritten;
            if (persisted.mirror) {
              send({
                type: "log",
                level: "info",
                message: `Miroir local synchronisé (${persisted.mirror.written} écrit(s), ${persisted.mirror.removed} supprimé(s)) : ${persisted.mirror.root}`,
              });
            }
          } else {
            warnings.push("Aucun fichier généré.");
          }

          await prisma.generation.update({
            where: { id: generationId },
            data: {
              status: outcome.status === "error" ? "error" : outcome.status === "partial" ? "partial" : "success",
              summary: outcome.summary,
              durationMs: Date.now() - startedAt,
              filesWritten,
              warnings: warnings.length > 0 ? JSON.stringify([...new Set(warnings)]) : null,
              completedAt: new Date(),
              error: outcome.status === "error" ? "Aucun fichier produit." : null,
            },
          });
          await prisma.project.update({
            where: { id },
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
          await prisma.generationStep.updateMany({
            where: { generationId, status: "running" },
            data: { status: "warning", finishedAt: new Date() },
          });

          send({
            type: "done",
            generationId,
            status: outcome.status,
            files: filesWritten,
            warnings: [...new Set(warnings)],
            summary: outcome.summary,
          });
        } catch (error) {
          const message = error instanceof Error ? error.message.slice(0, 400) : "Erreur de génération inconnue.";
          console.error("[kolouble] generation failed", error);
          try {
            await prisma.generation.update({
              where: { id: generationId },
              data: {
                status: "error",
                error: message,
                durationMs: Date.now() - startedAt,
                completedAt: new Date(),
              },
            });
            await prisma.project.update({ where: { id }, data: { status: "error" } });
            await prisma.generationStep.updateMany({
              where: { generationId, status: { in: ["running", "pending"] } },
              data: { status: "error", finishedAt: new Date() },
            });
          } catch (persistError) {
            console.error("[kolouble] generation error persistence failed", persistError);
          }
          send({ type: "error", message });
        } finally {
          if (heartbeat) clearInterval(heartbeat);
          activeProjects.delete(id);
          try {
            controller.close();
          } catch {
            // flux déjà fermé par le client
          }
        }
      },
      cancel() {
        clientClosed = true;
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "application/x-ndjson; charset=utf-8",
        "Cache-Control": "no-store, no-transform",
        "X-Accel-Buffering": "no",
        "X-Generation-Id": generationId,
      },
    });
  } catch (error) {
    return jsonError(error);
  }
}
