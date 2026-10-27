import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { toDeploymentView } from "@/lib/deployment-server";
import { assertPublicHostname, UnsafeHostError } from "@/lib/domain-safety";
import { requireProject, requireUser } from "@/lib/guard";
import { ApiError, assertSameOrigin, jsonError } from "@/lib/http";
import { enforceRateLimit } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser();
    assertSameOrigin(request);
    const { id } = await context.params;
    await requireProject(user.id, id);
    enforceRateLimit(`deployment:check:${user.id}`, 15, 60_000);

    const row = await prisma.deployment.findUnique({ where: { projectId: id } });
    if (!row) {
      throw new ApiError(
        400,
        "Enregistrez d'abord un domaine ou une URL de production.",
        "deployment_missing_url",
      );
    }

    const candidate = row.productionUrl ?? (row.customDomain ? `https://${row.customDomain}` : null);
    if (!candidate) {
      throw new ApiError(
        400,
        "Aucune URL à vérifier : renseignez un domaine ou une URL de production.",
        "deployment_missing_url",
      );
    }

    let url: URL;
    try {
      url = new URL(candidate);
    } catch {
      throw new ApiError(400, "URL de production invalide.", "deployment_invalid_url");
    }
    if (url.protocol !== "https:") {
      throw new ApiError(400, "Seules les URL HTTPS sont vérifiées.", "deployment_insecure_url");
    }
    if (url.port && url.port !== "443") {
      throw new ApiError(400, "Port non standard refusé pour la vérification.", "deployment_invalid_port");
    }

    let ok = false;
    let status: number | null = null;
    let latencyMs: number | null = null;
    let message: string;

    try {
      await assertPublicHostname(url.hostname);
      const startedAt = Date.now();
      const response = await fetch(url.toString(), {
        method: "GET",
        redirect: "manual",
        cache: "no-store",
        signal: AbortSignal.timeout(8_000),
        headers: {
          "user-agent": "KoloubleDeploymentCheck/1.0",
          accept: "text/html,application/xhtml+xml",
        },
      });
      latencyMs = Date.now() - startedAt;
      status = response.status;
      await response.body?.cancel();
      ok = status >= 200 && status < 400;
      if (ok && status >= 300) {
        message = `Le site répond (HTTP ${status}, redirection) en ${latencyMs} ms.`;
      } else if (ok) {
        message = `Le site répond en HTTPS (HTTP ${status}) en ${latencyMs} ms.`;
      } else {
        message = `Le serveur a répondu HTTP ${status}. Vérifiez la configuration de l'hébergeur.`;
      }
    } catch (error) {
      if (error instanceof UnsafeHostError) {
        message = error.message;
      } else {
        console.warn("[kolouble] deployment check failed", error);
        message = "Connexion impossible : le site ne répond pas encore (DNS, TLS ou build en cours).";
      }
    }

    const updated = await prisma.deployment.update({
      where: { projectId: id },
      data: {
        status: ok ? "live" : "error",
        checkMessage: message,
        lastCheckAt: new Date(),
      },
    });

    return NextResponse.json(
      {
        deployment: toDeploymentView(updated),
        check: { ok, status, latencyMs, message, url: url.toString() },
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return jsonError(error);
  }
}
