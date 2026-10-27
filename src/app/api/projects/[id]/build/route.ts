import { NextResponse } from "next/server";
import { z } from "zod";
import { flutterCapability, listBuildArtifacts, runFlutterBuild } from "@/lib/build";
import { prisma } from "@/lib/db";
import { requireProject, requireUser } from "@/lib/guard";
import { ApiError, assertSameOrigin, jsonError } from "@/lib/http";
import { enforceRateLimit } from "@/lib/rate-limit";
import { mirrorProjectWorkspace } from "@/lib/workspace";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

const buildSchema = z.object({
  target: z.enum(["web", "apk", "all"]).default("web"),
});

const activeBuilds = new Set<string>();

async function readTarget(request: Request): Promise<"web" | "apk" | "all"> {
  const raw = await request.text();
  if (!raw.trim()) return "web";
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new ApiError(400, "Corps JSON invalide.", "invalid_json");
  }
  const result = buildSchema.safeParse(parsed);
  if (!result.success) {
    throw new ApiError(400, "Cible de compilation invalide (web, apk ou all).", "validation_error");
  }
  return result.data.target;
}

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser();
    const { id } = await context.params;
    await requireProject(user.id, id);
    const capability = await flutterCapability();
    return NextResponse.json(
      {
        ...capability,
        artifacts: await listBuildArtifacts(id),
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return jsonError(error);
  }
}

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser();
    assertSameOrigin(request);
    const { id } = await context.params;
    await requireProject(user.id, id);
    enforceRateLimit(`build:user:${user.id}`, 6, 30 * 60 * 1000);
    enforceRateLimit(`build:project:${id}`, 4, 30 * 60 * 1000);
    if (activeBuilds.has(id)) {
      throw new ApiError(409, "Une compilation est déjà en cours pour ce projet.", "build_running");
    }

    const target = await readTarget(request);
    const capability = await flutterCapability();
    if (!capability.enabled) {
      throw new ApiError(503, capability.error ?? "Compilation locale désactivée.", "build_disabled");
    }
    if (!capability.available) {
      throw new ApiError(503, capability.error ?? "Flutter indisponible.", "flutter_missing");
    }

    const files = await prisma.projectFile.findMany({
      where: { projectId: id },
      select: { path: true, content: true, language: true, source: true },
    });
    if (files.length === 0) {
      throw new ApiError(409, "Aucun fichier à compiler. Générez d'abord l'application.", "no_files");
    }

    activeBuilds.add(id);
    try {
      await mirrorProjectWorkspace(
        id,
        files.map((file) => ({
          ...file,
          source: file.source as "scaffold" | "ai" | "user",
        })),
      );
      const report = await runFlutterBuild(id, target);
      return NextResponse.json(
        { ...report, flutterVersion: capability.version },
        { status: report.ok ? 200 : 422 },
      );
    } finally {
      activeBuilds.delete(id);
    }
  } catch (error) {
    return jsonError(error);
  }
}
