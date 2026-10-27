import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/guard";
import { ApiError, assertSameOrigin, isPrismaError, jsonError, readJson } from "@/lib/http";
import { createProjectForUser } from "@/lib/project-create";
import { enforceRateLimit } from "@/lib/rate-limit";
import { createProjectSchema, projectListQuerySchema } from "@/lib/validation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const user = await requireUser();
    enforceRateLimit(`projects:list:${user.id}`, 120, 60_000);
    const url = new URL(request.url);
    const parsed = projectListQuerySchema.safeParse({
      limit: url.searchParams.get("limit") ?? undefined,
    });
    if (!parsed.success) {
      throw new ApiError(400, "Paramètre limit invalide.", "validation_error");
    }
    const projects = await prisma.project.findMany({
      where: { ownerId: user.id },
      orderBy: { updatedAt: "desc" },
      take: parsed.data.limit,
      select: {
        id: true,
        name: true,
        description: true,
        prompt: true,
        status: true,
        model: true,
        provider: true,
        mode: true,
        stack: true,
        templateKey: true,
        saas: true,
        zipUrl: true,
        autoNamed: true,
        lastGenerationAt: true,
        createdAt: true,
        updatedAt: true,
        _count: { select: { files: true, generations: true } },
      },
    });
    return NextResponse.json({ projects }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return jsonError(error);
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireUser();
    assertSameOrigin(request);
    enforceRateLimit(`projects:create:${user.id}`, 20, 10 * 60 * 1000);
    const payload = await readJson(request, createProjectSchema);
    const { project, spec } = await createProjectForUser(user.id, payload);

    return NextResponse.json(
      {
        project,
        spec: {
          appName: spec.appName,
          packageName: spec.packageName,
          tagline: spec.tagline,
          entities: spec.entities.map((entity) => ({ key: entity.key, label: entity.label, plural: entity.plural })),
          platforms: spec.platforms,
        },
      },
      { status: 201 },
    );
  } catch (error) {
    if (isPrismaError(error, "P2002")) {
      return NextResponse.json(
        { error: "Un projet identique existe déjà.", code: "project_conflict" },
        { status: 409 },
      );
    }
    if (isPrismaError(error, "P2025")) {
      return NextResponse.json(
        { error: "Le propriétaire du projet est introuvable.", code: "owner_missing" },
        { status: 409 },
      );
    }
    return jsonError(error);
  }
}
