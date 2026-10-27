import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth";
import { BuilderClient, type BuilderFile, type BuilderGeneration, type BuilderProject } from "@/components/builder-client";
import { prisma } from "@/lib/db";
import { deploymentDefaultsFor, toDeploymentView } from "@/lib/deployment-server";
import { env } from "@/lib/env";

export const dynamic = "force-dynamic";

function parseWarnings(value: string | null): string[] {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    if (Array.isArray(parsed)) return parsed.map(String);
  } catch {
    // ancienne valeur texte
  }
  return value.split("\n").filter(Boolean);
}

function parseSpec(value: string | null): BuilderProject["spec"] {
  if (!value) return null;
  try {
    const spec = JSON.parse(value) as BuilderProject["spec"];
    if (!spec || typeof spec.appName !== "string" || !Array.isArray(spec.entities)) return null;
    return spec;
  } catch {
    return null;
  }
}

export default async function ProjectPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ generate?: string | string[] }>;
}) {
  const session = await auth();
  const { id } = await params;
  if (!session?.user?.id) redirect(`/login?next=/projects/${encodeURIComponent(id)}`);
  if (!/^[a-z0-9]{10,40}$/i.test(id)) notFound();

  const project = await prisma.project.findFirst({
    where: { id, ownerId: session.user.id },
    include: {
      files: {
        orderBy: { path: "asc" },
        select: { path: true, bytes: true, language: true, source: true, updatedAt: true },
      },
      generations: {
        orderBy: { createdAt: "desc" },
        take: 10,
        include: { steps: { orderBy: { order: "asc" } } },
      },
      deployment: true,
    },
  });
  if (!project) notFound();

  const paramsQuery = await searchParams;
  const generateFlag = (Array.isArray(paramsQuery.generate) ? paramsQuery.generate[0] : paramsQuery.generate) === "1";

  const initialProject: BuilderProject = {
    id: project.id,
    name: project.name,
    description: project.description,
    prompt: project.prompt,
    status: project.status,
    mode: project.mode,
    model: project.model,
    provider: project.provider,
    templateKey: project.templateKey,
    saas: project.saas,
    autoNamed: project.autoNamed,
    spec: parseSpec(project.spec),
    createdAt: project.createdAt.toISOString(),
    updatedAt: project.updatedAt.toISOString(),
    lastGenerationAt: project.lastGenerationAt?.toISOString() ?? null,
  };

  const initialFiles: BuilderFile[] = project.files.map((file) => ({
    path: file.path,
    bytes: file.bytes,
    language: file.language,
    source: file.source,
    updatedAt: file.updatedAt.toISOString(),
  }));

  const initialDeployment = project.deployment
    ? toDeploymentView(project.deployment)
    : deploymentDefaultsFor({ name: project.name, spec: project.spec });

  const initialGenerations: BuilderGeneration[] = project.generations.map((generation) => ({    id: generation.id,
    status: generation.status,
    mode: generation.mode,
    model: generation.model,
    summary: generation.summary,
    error: generation.error,
    durationMs: generation.durationMs,
    filesWritten: generation.filesWritten,
    warnings: parseWarnings(generation.warnings),
    createdAt: generation.createdAt.toISOString(),
    completedAt: generation.completedAt?.toISOString() ?? null,
    steps: generation.steps.map((step) => ({
      agent: step.agent,
      title: step.title,
      status: step.status,
      detail: step.detail,
      order: step.order,
      startedAt: step.startedAt?.toISOString() ?? null,
      finishedAt: step.finishedAt?.toISOString() ?? null,
    })),
  }));

  return (
    <BuilderClient
      initialProject={initialProject}
      initialFiles={initialFiles}
      initialGenerations={initialGenerations}
      initialDeployment={initialDeployment}
      initialGenerate={generateFlag}
      defaultModel={env.defaultModel}
    />
  );
}
