import { prisma } from "@/lib/db";
import { requireProject, requireUser } from "@/lib/guard";
import { jsonError } from "@/lib/http";
import { enforceRateLimit } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const PREVIEW_CSP = [
  "sandbox allow-scripts",
  "default-src 'none'",
  "script-src 'unsafe-inline'",
  "style-src 'unsafe-inline'",
  "img-src data:",
  "font-src data:",
  "connect-src 'none'",
  "media-src 'none'",
  "frame-src 'none'",
  "form-action 'none'",
  "base-uri 'none'",
  "frame-ancestors 'self'",
].join("; ");

function previewHeaders(extra?: Record<string, string>): Record<string, string> {
  return {
    "Content-Security-Policy": PREVIEW_CSP,
    "Cache-Control": "no-store",
    "X-Content-Type-Options": "nosniff",
    "Referrer-Policy": "no-referrer",
    "Permissions-Policy": "camera=(), microphone=(), geolocation=(), payment=(), usb=()",
    "Cross-Origin-Resource-Policy": "same-origin",
    ...extra,
  };
}

function missingPreview(name: string): Response {
  const safeName = name.replace(/[<>&"']/g, " ");
  const html = `<!doctype html>
<html lang="fr">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Prototype indisponible</title>
<style>html,body{height:100%;margin:0}body{display:grid;place-items:center;background:#07100d;color:#e8f5ee;font-family:system-ui,sans-serif;text-align:center;padding:24px}.card{max-width:420px;border:1px dashed #2a4a3c;border-radius:18px;padding:28px}h1{font-size:18px;margin:0 0 10px}p{margin:0;color:#8eb3a0;font-size:14px;line-height:1.6}</style>
</head>
<body><div class="card"><h1>Prototype non généré</h1><p>${safeName} n'a pas encore de prototype web. Lancez la génération pour l'afficher ici.</p></div></body>
</html>`;
  return new Response(html, {
    status: 404,
    headers: previewHeaders({ "Content-Type": "text/html; charset=utf-8" }),
  });
}

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser();
    const { id } = await context.params;
    const project = await requireProject(user.id, id);
    enforceRateLimit(`preview:${user.id}`, 120, 60_000);

    const file = await prisma.projectFile.findUnique({
      where: { projectId_path: { projectId: id, path: "prototype/index.html" } },
      select: { content: true },
    });
    if (!file) return missingPreview(project.name);

    return new Response(file.content, {
      status: 200,
      headers: previewHeaders({
        "Content-Type": "text/html; charset=utf-8",
        "X-Kolouble-Preview": id,
      }),
    });
  } catch (error) {
    if (error instanceof Error && error.name === "ApiError") {
      return jsonError(error);
    }
    return jsonError(error);
  }
}
