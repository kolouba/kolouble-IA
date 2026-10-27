import { repoNameFor, resolveDeployment, type AppSpec, type DeployTarget } from "@/lib/spec";
import type { DeploymentState } from "@/lib/deployment";

export type DeploymentView = DeploymentState;

interface DeploymentRow {
  target: string;
  repoName: string | null;
  repositoryUrl: string | null;
  customDomain: string | null;
  productionUrl: string | null;
  status: string;
  checkMessage: string | null;
  lastCheckAt: Date | null;
}

const TARGETS = new Set<string>([
  "vercel",
  "netlify",
  "github-pages",
  "cloudflare-pages",
  "self-hosted",
]);

function isTarget(value: string): value is DeployTarget {
  return TARGETS.has(value);
}

export function deploymentDefaultsFor(project: { name: string; spec: string | null }): DeploymentView {
  let spec: Partial<AppSpec> | null = null;
  try {
    spec = project.spec ? (JSON.parse(project.spec) as Partial<AppSpec>) : null;
  } catch {
    spec = null;
  }
  const packageName =
    typeof spec?.packageName === "string" && spec.packageName.length > 0
      ? spec.packageName
      : repoNameFor(project.name);
  const resolved = resolveDeployment({ packageName, deployment: spec?.deployment });
  return {
    target: resolved.target,
    repoName: resolved.repoName,
    repositoryUrl: null,
    customDomain: resolved.customDomain,
    productionUrl: null,
    status: "planned",
    checkMessage: null,
    lastCheckAt: null,
  };
}

export function toDeploymentView(row: DeploymentRow): DeploymentView {
  return {
    target: isTarget(row.target) ? row.target : "vercel",
    repoName: row.repoName ?? "application",
    repositoryUrl: row.repositoryUrl,
    customDomain: row.customDomain,
    productionUrl: row.productionUrl,
    status: row.status,
    checkMessage: row.checkMessage,
    lastCheckAt: row.lastCheckAt ? row.lastCheckAt.toISOString() : null,
  };
}

export function withDeploymentSpec(
  specJson: string | null,
  deployment: { target: DeployTarget; repoName: string; customDomain: string | null },
): string | null {
  if (!specJson) return null;
  let parsed: unknown;
  try {
    parsed = JSON.parse(specJson);
  } catch {
    return null;
  }
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return null;
  return JSON.stringify({ ...(parsed as Record<string, unknown>), deployment });
}
