import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import {
  deploymentDefaultsFor,
  toDeploymentView,
  withDeploymentSpec,
} from "@/lib/deployment-server";
import { requireProject, requireUser } from "@/lib/guard";
import { assertSameOrigin, jsonError, readJson } from "@/lib/http";
import { enforceRateLimit } from "@/lib/rate-limit";
import { repoNameFor } from "@/lib/spec";
import { deploymentSchema } from "@/lib/validation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Context = { params: Promise<{ id: string }> };

export async function GET(_request: Request, context: Context) {
  try {
    const user = await requireUser();
    const { id } = await context.params;
    const project = await requireProject(user.id, id);
    enforceRateLimit(`deployment:get:${user.id}`, 120, 60_000);

    const row = await prisma.deployment.findUnique({ where: { projectId: id } });
    const deployment = row
      ? toDeploymentView(row)
      : deploymentDefaultsFor({ name: project.name, spec: project.spec });

    return NextResponse.json({ deployment }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return jsonError(error);
  }
}

export async function PUT(request: Request, context: Context) {
  try {
    const user = await requireUser();
    assertSameOrigin(request);
    const { id } = await context.params;
    const project = await requireProject(user.id, id);
    enforceRateLimit(`deployment:put:${user.id}`, 40, 60_000);

    const payload = await readJson(request, deploymentSchema);
    const existing = await prisma.deployment.findUnique({ where: { projectId: id } });
    const fallback = deploymentDefaultsFor({ name: project.name, spec: project.spec });

    const target = payload.target ?? (existing ? toDeploymentView(existing).target : fallback.target);
    const repoName = repoNameFor(payload.repoName ?? existing?.repoName ?? fallback.repoName);
    const customDomain =
      payload.customDomain !== undefined ? payload.customDomain : existing?.customDomain ?? fallback.customDomain;
    const repositoryUrl =
      payload.repositoryUrl !== undefined ? payload.repositoryUrl : existing?.repositoryUrl ?? null;
    const productionUrl =
      payload.productionUrl !== undefined ? payload.productionUrl : existing?.productionUrl ?? null;

    const linksChanged =
      customDomain !== (existing?.customDomain ?? null) ||
      productionUrl !== (existing?.productionUrl ?? null);
    const status = linksChanged ? "planned" : existing?.status ?? "planned";
    const checkMessage = linksChanged ? null : existing?.checkMessage ?? null;
    const lastCheckAt = linksChanged ? null : existing?.lastCheckAt ?? null;

    const row = await prisma.deployment.upsert({
      where: { projectId: id },
      create: {
        projectId: id,
        target,
        repoName,
        repositoryUrl,
        customDomain,
        productionUrl,
        status,
      },
      update: {
        target,
        repoName,
        repositoryUrl,
        customDomain,
        productionUrl,
        status,
        checkMessage,
        lastCheckAt,
      },
    });

    const updatedSpec = withDeploymentSpec(project.spec, { target, repoName, customDomain });
    if (updatedSpec) {
      await prisma.project.update({ where: { id }, data: { spec: updatedSpec } });
    }

    return NextResponse.json(
      { deployment: toDeploymentView(row) },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return jsonError(error);
  }
}
