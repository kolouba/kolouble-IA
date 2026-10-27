import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { buildProjectZip, markProjectZipUrl } from "@/lib/export";
import { requireProject, requireUser } from "@/lib/guard";
import { ApiError, assertSameOrigin, jsonError } from "@/lib/http";
import { enforceRateLimit } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const exportRequestSchema = z.object({
  projectId: z
    .string()
    .trim()
    .regex(/^[a-z0-9]{10,40}$/i, "Identifiant de projet invalide.")
    .optional(),
});

export async function POST(request: Request) {
  try {
    const user = await requireUser();
    assertSameOrigin(request);
    enforceRateLimit(`export:${user.id}`, 10, 60_000);

    let projectId: string | undefined;
    const raw = await request.text();
    if (raw.trim()) {
      let parsed: unknown;
      try {
        parsed = JSON.parse(raw);
      } catch {
        throw new ApiError(400, "Corps JSON invalide.", "invalid_json");
      }
      const result = exportRequestSchema.safeParse(parsed);
      if (!result.success) {
        throw new ApiError(
          400,
          result.error.issues.map((issue) => issue.message).join(" · ") || "Requête invalide.",
          "validation_error",
        );
      }
      projectId = result.data.projectId;
    }

    let project: { id: string; name: string } | null;
    if (projectId) {
      await requireProject(user.id, projectId);
      project = await prisma.project.findUnique({
        where: { id: projectId },
        select: { id: true, name: true },
      });
    } else {
      project = await prisma.project.findFirst({
        where: { ownerId: user.id, files: { some: {} } },
        orderBy: { updatedAt: "desc" },
        select: { id: true, name: true },
      });
    }
    if (!project) {
      throw new ApiError(404, "Aucun projet exportable. Générez d'abord une application.", "no_project");
    }

    const files = await prisma.projectFile.findMany({
      where: { projectId: project.id },
      orderBy: { path: "asc" },
      select: { path: true, content: true },
    });
    if (files.length === 0) {
      throw new ApiError(409, "Aucun fichier à exporter. Générez d'abord l'application.", "no_files");
    }

    const zipUrl = await markProjectZipUrl(project.id);
    const response = buildProjectZip(project, files);
    response.headers.set("X-Project-Id", project.id);
    response.headers.set("X-Zip-Url", zipUrl);
    return response;
  } catch (error) {
    return jsonError(error);
  }
}

export async function GET() {
  return NextResponse.json(
    {
      error: "Utilisez POST /api/export avec { projectId } ou sans corps pour exporter le projet le plus récent.",
      code: "method_not_allowed",
    },
    { status: 405, headers: { Allow: "POST" } },
  );
}
