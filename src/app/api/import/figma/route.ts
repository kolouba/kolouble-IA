import { NextResponse } from "next/server";
import { z } from "zod";
import { env } from "@/lib/env";
import { requireUser } from "@/lib/guard";
import { ApiError, assertSameOrigin, jsonError, readJson } from "@/lib/http";
import { enforceRateLimit } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const figmaSchema = z.object({
  url: z.string().trim().min(10, "Lien Figma requis.").max(600, "Lien Figma trop long."),
});

const MAX_PROMPT_CHARS = 4000;
const MAX_RESPONSE_CHARS = 8_000_000;

interface FigmaNode {
  type?: string;
  name?: string;
  characters?: string;
  children?: FigmaNode[];
}

function parseFigmaUrl(raw: string): { fileKey: string; nodeId: string | null } {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    throw new ApiError(400, "Lien Figma invalide.", "invalid_figma_url");
  }
  if (url.protocol !== "https:" || !["figma.com", "www.figma.com"].includes(url.hostname)) {
    throw new ApiError(400, "Seuls les liens https://figma.com sont acceptés.", "invalid_figma_url");
  }
  const match = url.pathname.match(/^\/(?:file|design|proto)\/([A-Za-z0-9]{8,64})(?:\/|$)/);
  if (!match?.[1]) {
    throw new ApiError(400, "Lien Figma invalide : fichier introuvable dans l'URL.", "invalid_figma_url");
  }
  const rawNode = url.searchParams.get("node-id");
  const nodeId = rawNode && /^\d+[-:]\d+$/.test(rawNode) ? rawNode.replace("-", ":") : null;
  return { fileKey: match[1], nodeId };
}

async function figmaFetch(path: string, token: string): Promise<unknown> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 20_000);
  let response: Response;
  try {
    response = await fetch(`https://api.figma.com${path}`, {
      headers: { "X-Figma-Token": token },
      signal: controller.signal,
      cache: "no-store",
    });
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new ApiError(504, "Figma n'a pas répondu dans le délai imparti.", "figma_timeout");
    }
    throw new ApiError(502, "Impossible de joindre l'API Figma.", "figma_unreachable");
  } finally {
    clearTimeout(timer);
  }
  const raw = await response.text();
  if (raw.length > MAX_RESPONSE_CHARS) {
    throw new ApiError(502, "Réponse Figma trop volumineuse.", "figma_too_large");
  }
  if (!response.ok) {
    const message =
      response.status === 403
        ? "Jeton Figma invalide ou accès refusé à ce fichier."
        : response.status === 404
          ? "Fichier Figma introuvable."
          : `Figma a répondu ${response.status}.`;
    throw new ApiError(502, message, "figma_error");
  }
  try {
    return JSON.parse(raw) as unknown;
  } catch {
    throw new ApiError(502, "Réponse Figma illisible.", "figma_error");
  }
}

function collectNodes(root: FigmaNode): { screens: string[]; texts: string[] } {
  const screens: string[] = [];
  const texts: string[] = [];
  const stack: FigmaNode[] = [root];
  let visited = 0;
  while (stack.length > 0 && visited < 2_000) {
    const node = stack.pop();
    if (!node) break;
    visited += 1;
    if (node.type === "TEXT" && typeof node.characters === "string") {
      const label = node.characters.replace(/\s+/g, " ").trim();
      if (label && label.length <= 90 && texts.length < 50 && !texts.includes(label)) texts.push(label);
    } else if (
      ["FRAME", "COMPONENT", "SECTION", "PAGE"].includes(node.type ?? "") &&
      typeof node.name === "string" &&
      node.name.trim() &&
      screens.length < 20
    ) {
      const name = node.name.trim();
      if (!screens.includes(name)) screens.push(name);
    }
    if (Array.isArray(node.children)) stack.push(...node.children);
  }
  return { screens, texts };
}

export async function POST(request: Request) {
  try {
    const user = await requireUser();
    assertSameOrigin(request);
    enforceRateLimit(`import:figma:${user.id}`, 10, 10 * 60 * 1000);

    if (!env.figmaEnabled) {
      throw new ApiError(
        503,
        "Import Figma non configuré : ajoutez FIGMA_TOKEN dans l'environnement du serveur.",
        "figma_disabled",
      );
    }
    const payload = await readJson(request, figmaSchema);
    const { fileKey, nodeId } = parseFigmaUrl(payload.url);
    const token = (process.env.FIGMA_TOKEN || "").trim();

    const endpoint = nodeId
      ? `/v1/files/${fileKey}/nodes?ids=${encodeURIComponent(nodeId)}&depth=3`
      : `/v1/files/${fileKey}?depth=2`;
    const data = (await figmaFetch(endpoint, token)) as {
      name?: string;
      document?: FigmaNode;
      nodes?: Record<string, { document?: FigmaNode }>;
    };

    let root: FigmaNode | undefined;
    let fileName = typeof data.name === "string" ? data.name : "Maquette Figma";
    if (nodeId) {
      const entry = data.nodes?.[nodeId];
      root = entry?.document;
      if (root?.name) fileName = data.name || root.name;
    } else {
      root = data.document;
    }
    if (!root) {
      throw new ApiError(404, "Aucun cadre Figma trouvé dans ce fichier.", "figma_empty");
    }

    const { screens, texts } = collectNodes(root);
    const parts = [
      `Concevoir une application Flutter responsive à partir de la maquette Figma « ${fileName} ».`,
      screens.length > 0
        ? `Écrans et sections : ${screens.slice(0, 12).join(", ")}.`
        : "Reproduire la structure visuelle de la maquette.",
      texts.length > 0
        ? `Libellés et contenus : ${texts.slice(0, 40).join(" · ")}.`
        : "",
      "Prévoir la navigation entre les écrans, un design fidèle aux couleurs de la maquette et un fonctionnement hors ligne.",
    ].filter(Boolean);

    const prompt = parts.join(" ").slice(0, MAX_PROMPT_CHARS);
    return NextResponse.json({
      prompt,
      name: fileName.slice(0, 80),
      screens,
      texts: texts.slice(0, 40),
      nodeId,
    });
  } catch (error) {
    return jsonError(error);
  }
}
