import { resolveAiSelection } from "@/lib/ai";
import { prisma } from "@/lib/db";
import { env } from "@/lib/env";
import { parsePrompt, repoNameFor } from "@/lib/spec";
import type { CreateProjectInput } from "@/lib/validation";

export async function createProjectForUser(userId: string, payload: CreateProjectInput) {
  const spec = parsePrompt(payload.prompt, payload.name ?? null, {
    templateKey: payload.templateKey ?? null,
    saas: payload.saas,
  });
  const customName = Boolean(payload.name?.trim());

  const defaultDeployment = spec.deployment ?? {
    target: "vercel" as const,
    repoName: repoNameFor(spec.packageName),
    customDomain: null,
  };
  const deployment = {
    target: payload.deployment?.target ?? defaultDeployment.target,
    repoName: repoNameFor(payload.deployment?.repoName ?? defaultDeployment.repoName),
    customDomain: payload.deployment?.customDomain ?? defaultDeployment.customDomain,
    repositoryUrl: payload.deployment?.repositoryUrl ?? null,
    productionUrl: payload.deployment?.productionUrl ?? null,
  };
  spec.deployment = {
    target: deployment.target,
    repoName: deployment.repoName,
    customDomain: deployment.customDomain,
  };

  const aiSelection = payload.provider
    ? resolveAiSelection(payload.provider, payload.model)
    : { provider: null, model: payload.model ?? env.defaultModel };

  const project = await prisma.project.create({
    data: {
      name: customName ? payload.name!.trim() : spec.appName,
      description: spec.tagline,
      prompt: payload.prompt,
      ownerId: userId,
      model: aiSelection.model,
      provider: aiSelection.provider,
      mode: payload.mode ?? "standard",
      templateKey: spec.templateKey,
      saas: spec.saas,
      spec: JSON.stringify(spec),
      autoNamed: !customName,
      status: "draft",
      deployment: {
        create: {
          target: deployment.target,
          repoName: deployment.repoName,
          customDomain: deployment.customDomain,
          repositoryUrl: deployment.repositoryUrl,
          productionUrl: deployment.productionUrl,
        },
      },
    },
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
      autoNamed: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  return { project, spec, deployment };
}
