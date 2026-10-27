import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireProject, requireUser } from "@/lib/guard";
import { ApiError, assertSameOrigin, jsonError, readJson } from "@/lib/http";
import { languageForPath, normalizeProjectPath, UnsafePathError } from "@/lib/path-safety";
import { enforceRateLimit } from "@/lib/rate-limit";
import { fileUpdateSchema } from "@/lib/validation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function safePath(segments: string[]): string {
  try {
    return normalizeProjectPath(segments.join("/"));
  } catch (error) {
    throw new ApiError(
      400,
      error instanceof UnsafePathError ? error.message : "Chemin de fichier invalide.",
      "unsafe_path",
    );
  }
}

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string; path: string[] }> },
) {
  try {
    const user = await requireUser();
    const { id, path: segments } = await context.params;
    await requireProject(user.id, id);
    const filePath = safePath(segments);
    enforceRateLimit(`files:get:${user.id}`, 240, 60_000);
    const file = await prisma.projectFile.findUnique({
      where: { projectId_path: { projectId: id, path: filePath } },
      select: {
        path: true,
        content: true,
        language: true,
        bytes: true,
        source: true,
        updatedAt: true,
      },
    });
    if (!file) throw new ApiError(404, "Fichier introuvable.", "not_found");
    return NextResponse.json({ file }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return jsonError(error);
  }
}

export async function PUT(
  request: Request,
  context: { params: Promise<{ id: string; path: string[] }> },
) {
  try {
    const user = await requireUser();
    assertSameOrigin(request);
    const { id, path: segments } = await context.params;
    await requireProject(user.id, id);
    enforceRateLimit(`files:put:${user.id}`, 120, 60_000);
    const filePath = safePath(segments);
    const payload = await readJson(request, fileUpdateSchema);

    const file = await prisma.projectFile.upsert({
      where: { projectId_path: { projectId: id, path: filePath } },
      create: {
        projectId: id,
        path: filePath,
        content: payload.content,
        language: languageForPath(filePath),
        bytes: Buffer.byteLength(payload.content, "utf8"),
        source: "user",
      },
      update: {
        content: payload.content,
        language: languageForPath(filePath),
        bytes: Buffer.byteLength(payload.content, "utf8"),
        source: "user",
      },
      select: {
        path: true,
        language: true,
        bytes: true,
        source: true,
        updatedAt: true,
      },
    });
    await prisma.project.update({ where: { id }, data: { updatedAt: new Date() } });
    return NextResponse.json({ file });
  } catch (error) {
    return jsonError(error);
  }
}
