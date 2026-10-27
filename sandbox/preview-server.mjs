#!/usr/bin/env node
import { createServer } from "node:http";
import { lstat, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(process.env.SANDBOX_ROOT || path.join(HERE, "site"));
const HOST = process.env.SANDBOX_HOST || "127.0.0.1";
const PARSED_PORT = Number.parseInt(process.env.SANDBOX_PORT || "4300", 10);
const PORT = Number.isInteger(PARSED_PORT) && PARSED_PORT > 0 && PARSED_PORT < 65536 ? PARSED_PORT : 4300;
const MAX_BYTES = 4 * 1024 * 1024;

const PREVIEW_CSP = [
  "sandbox allow-scripts",
  "default-src 'none'",
  "script-src 'unsafe-inline'",
  "style-src 'unsafe-inline'",
  "img-src data:",
  "font-src data:",
  "connect-src 'none'",
  "media-src 'none'",
  "object-src 'none'",
  "frame-src 'none'",
  "form-action 'none'",
  "base-uri 'none'",
  "frame-ancestors 'none'",
].join("; ");

function headers(contentType, extra = {}) {
  return {
    "Content-Type": contentType,
    "Content-Security-Policy": PREVIEW_CSP,
    "Cache-Control": "no-store, max-age=0",
    "X-Content-Type-Options": "nosniff",
    "Referrer-Policy": "no-referrer",
    "X-Robots-Tag": "noindex, nofollow",
    "Cross-Origin-Opener-Policy": "same-origin",
    "Cross-Origin-Resource-Policy": "same-origin",
    "Permissions-Policy": "camera=(), microphone=(), geolocation=(), payment=(), usb=()",
    ...extra,
  };
}

function reply(response, status, body, contentType = "text/html; charset=utf-8", extra = {}) {
  const payload = Buffer.from(body, "utf8");
  response.writeHead(status, headers(contentType, { "Content-Length": payload.byteLength, ...extra }));
  response.end(payload);
}

function messagePage(title, text) {
  return `<!doctype html>
<html lang="fr">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${title}</title>
<style>html,body{height:100%;margin:0}body{display:grid;place-items:center;background:#07100d;color:#e8f5ee;font-family:system-ui,sans-serif;text-align:center;padding:24px}.card{max-width:460px;border:1px dashed #2a4a3c;border-radius:18px;padding:28px}h1{font-size:18px;margin:0 0 10px}p{margin:0;color:#8eb3a0;font-size:14px;line-height:1.6}</style>
</head>
<body><div class="card"><h1>${title}</h1><p>${text}</p></div></body>
</html>`;
}

async function loadPrototype() {
  const target = path.join(ROOT, "index.html");
  const info = await lstat(target);
  if (!info.isFile() || info.isSymbolicLink()) {
    throw new Error("not-a-file");
  }
  if (info.size > MAX_BYTES) {
    throw new Error("too-large");
  }
  return readFile(target, "utf8");
}

const server = createServer(async (request, response) => {
  let pathname;
  try {
    pathname = new URL(request.url || "/", "http://sandbox.local").pathname;
  } catch {
    reply(response, 400, messagePage("Requête invalide", "L'adresse demandée est illisible."));
    return;
  }

  if (pathname === "/healthz") {
    reply(
      response,
      200,
      JSON.stringify({ status: "ok", service: "kolouble-sandbox", timestamp: new Date().toISOString() }),
      "application/json; charset=utf-8",
    );
    return;
  }

  if (pathname !== "/" && pathname !== "/index.html") {
    reply(response, 404, messagePage("Aperçu introuvable", "Ce serveur ne sert que le prototype généré à la racine."));
    return;
  }

  if (request.method !== "GET" && request.method !== "HEAD") {
    reply(response, 405, messagePage("Méthode refusée", "Seules les lectures GET et HEAD sont autorisées."), "text/html; charset=utf-8", { Allow: "GET, HEAD" });
    return;
  }

  let html;
  try {
    html = await loadPrototype();
  } catch (error) {
    const code = error instanceof Error ? error.message : "";
    if (code === "too-large") {
      reply(response, 413, messagePage("Aperçu trop volumineux", "Le prototype dépasse la limite de 4 Mo du bac à sable."));
    } else {
      reply(
        response,
        404,
        messagePage(
          "Prototype non disponible",
          "Placez le fichier prototype/index.html généré dans le dossier monté (sandbox/site/index.html).",
        ),
      );
    }
    return;
  }

  const payload = Buffer.from(html, "utf8");
  response.writeHead(200, headers("text/html; charset=utf-8", { "Content-Length": payload.byteLength }));
  response.end(request.method === "HEAD" ? undefined : payload);
});

server.listen(PORT, HOST, () => {
  console.log(`[sandbox] prototype servi sur http://${HOST}:${PORT} (racine : ${ROOT})`);
});

function shutdown(signal) {
  console.log(`[sandbox] arrêt demandé (${signal})`);
  server.close(() => process.exit(0));
}

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));
