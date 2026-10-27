import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireProject, requireUser } from "@/lib/guard";
import { jsonError, isPrismaError } from "@/lib/http";
import { removeProjectWorkspace } from "@/lib/workspace";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser();
    const { id } = await context.params;
    await requireProject(user.id, id);
    const project = await prisma.project.findFirst({
      where: { id, ownerId: user.id },
      include: {
        files: {
          orderBy: { path: "asc" },
          select: { path: true, bytes: true, language: true, source: true, updatedAt: true },
        },
        generations: {
          orderBy: { createdAt: "desc" },
          take: 8,
          include: { steps: { orderBy: { order: "asc" } } },
        },
      },
    });
    if (!project) {
      return NextResponse.json({ error: "Projet introuvable.", code: "not_found" }, { status: 404 });
    }
    const { spec, files, generations, ...rest } = project;
    let parsedSpec: unknown = null;
    if (spec) {
      try {
        parsedSpec = JSON.parse(spec);
      } catch {
        parsedSpec = null;
      }
    }
    return NextResponse.json(
      {
        project: {
          ...rest,
          spec: parsedSpec,
          fileCount: files.length,
          totalBytes: files.reduce((total, file) => total + file.bytes, 0),
        },
        files,
        generations,
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return jsonError(error);
  }
}

export async function DELETE(_request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser();
    const { id } = await context.params;
    await requireProject(user.id, id);
    await prisma.project.delete({ where: { id } });
    await removeProjectWorkspace(id).catch((error) => {
      console.warn("[kolouble] workspace cleanup failed", error);
    });
    return NextResponse.json({ deleted: true, id });
  } catch (error) {
    if (isPrismaError(error, "P2025")) {
      return NextResponse.json({ error: "Projet introuvable.", code: "not_found" }, { status: 404 });
    }
    return jsonError(error);
  }
}
