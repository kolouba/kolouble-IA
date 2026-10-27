import { env, MODEL_PATTERN } from "@/lib/env";

export interface OllamaModelInfo {
  name: string;
  size: number;
  modifiedAt: string | null;
  family: string | null;
  parameterSize: string | null;
}

export interface OllamaStatus {
  online: boolean;
  baseUrl: string;
  models: OllamaModelInfo[];
  error: string | null;
}

export interface GenerateOptions {
  prompt: string;
  system?: string;
  model?: string | null;
  format?: "json" | null;
  temperature?: number;
  numPredict?: number;
  timeoutMs?: number;
}

export interface GenerateResult {
  text: string;
  model: string;
  durationMs: number;
}

export class OllamaError extends Error {
  readonly status: number;
  readonly code: string;

  constructor(message: string, code: string, status = 502) {
    super(message);
    this.name = "OllamaError";
    this.code = code;
    this.status = status;
  }
}

interface TagsResponse {
  models?: Array<{
    name?: string;
    model?: string;
    size?: number;
    modified_at?: string;
    details?: { family?: string; parameter_size?: string };
  }>;
}

interface GenerateResponse {
  response?: string;
  done?: boolean;
  error?: string;
  model?: string;
}

const MAX_PROMPT_CHARS = 48_000;

function assertModelName(model: string): string {
  if (!MODEL_PATTERN.test(model)) {
    throw new OllamaError("Nom de modèle Ollama invalide.", "INVALID_MODEL", 400);
  }
  return model;
}

function safeModels(): string[] {
  const candidates = [...env.models, env.defaultModel]
    .map((value) => value.trim())
    .filter((value) => MODEL_PATTERN.test(value));
  return [...new Set(candidates)];
}

async function fetchWithTimeout(url: string, init: RequestInit, timeoutMs: number): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: controller.signal, cache: "no-store" });
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new OllamaError(
        `Ollama n'a pas répondu dans le délai imparti (${Math.round(timeoutMs / 1000)} s).`,
        "OLLAMA_TIMEOUT",
        504,
      );
    }
    throw new OllamaError(
      "Impossible de joindre Ollama. Vérifiez que le service local est démarré.",
      "OLLAMA_UNREACHABLE",
      502,
    );
  } finally {
    clearTimeout(timer);
  }
}

export async function listOllamaModels(timeoutMs = 8_000): Promise<OllamaModelInfo[]> {
  const response = await fetchWithTimeout(`${env.ollamaBaseUrl}/api/tags`, { method: "GET" }, timeoutMs);
  if (!response.ok) {
    throw new OllamaError(`Ollama a répondu ${response.status}.`, "OLLAMA_BAD_STATUS", 502);
  }
  const payload = (await response.json().catch(() => null)) as TagsResponse | null;
  if (!payload || !Array.isArray(payload.models)) {
    throw new OllamaError("Réponse Ollama illisible.", "OLLAMA_BAD_PAYLOAD", 502);
  }
  return payload.models
    .filter((item): item is NonNullable<typeof item> => typeof (item?.name ?? item?.model) === "string")
    .map((item) => ({
      name: String(item.name ?? item.model),
      size: typeof item.size === "number" ? item.size : 0,
      modifiedAt: item.modified_at ?? null,
      family: item.details?.family ?? null,
      parameterSize: item.details?.parameter_size ?? null,
    }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

export async function checkOllama(): Promise<OllamaStatus> {
  try {
    const models = await listOllamaModels();
    return { online: true, baseUrl: env.ollamaBaseUrl, models, error: null };
  } catch (error) {
    return {
      online: false,
      baseUrl: env.ollamaBaseUrl,
      models: [],
      error: error instanceof Error ? error.message : "Ollama indisponible.",
    };
  }
}

async function generateOnce(model: string, options: GenerateOptions): Promise<GenerateResult> {
  const started = Date.now();
  const prompt = options.prompt.slice(0, MAX_PROMPT_CHARS);
  const body = {
    model,
    prompt,
    system: options.system,
    stream: false,
    format: options.format ?? undefined,
    options: {
      temperature: options.temperature ?? 0.3,
      num_predict: options.numPredict ?? 1_800,
    },
  };
  const response = await fetchWithTimeout(
    `${env.ollamaBaseUrl}/api/generate`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    },
    options.timeoutMs ?? env.ollamaTimeoutMs,
  );

  const raw = await response.text();
  let payload: GenerateResponse | null = null;
  try {
    payload = raw ? (JSON.parse(raw) as GenerateResponse) : null;
  } catch {
    payload = null;
  }

  if (!response.ok) {
    const detail = payload?.error || raw.slice(0, 300);
    if (response.status === 404 || /not found|pull/i.test(detail)) {
      throw new OllamaError(`Modèle « ${model} » introuvable dans Ollama.`, "MODEL_NOT_FOUND", 404);
    }
    throw new OllamaError(`Ollama a échoué (${response.status}) : ${detail || "sans détail"}.`, "OLLAMA_ERROR", 502);
  }

  const text = (payload?.response ?? "").trim();
  if (!text) {
    throw new OllamaError("Ollama a renvoyé une réponse vide.", "EMPTY_RESPONSE", 502);
  }
  return { text, model: payload?.model || model, durationMs: Date.now() - started };
}

export async function generateWithOllama(options: GenerateOptions): Promise<GenerateResult> {
  const requested = options.model && MODEL_PATTERN.test(options.model) ? options.model : null;
  const candidates = requested ? [requested, ...safeModels().filter((name) => name !== requested)] : safeModels();
  let lastError: Error | null = null;

  for (const model of candidates.slice(0, 4)) {
    try {
      return await generateOnce(assertModelName(model), options);
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      if (error instanceof OllamaError && error.code === "OLLAMA_UNREACHABLE") break;
      if (error instanceof OllamaError && error.code === "OLLAMA_TIMEOUT") break;
      if (error instanceof OllamaError && error.code === "MODEL_NOT_FOUND") continue;
      if (error instanceof OllamaError && error.code === "EMPTY_RESPONSE") continue;
      throw error;
    }
  }

  throw lastError instanceof OllamaError
    ? lastError
    : new OllamaError("Aucun modèle Ollama exploitable.", "NO_MODEL", 502);
}

export function extractJsonObject(text: string): unknown {
  const cleaned = text
    .replace(/^\s*```(?:json)?/i, "")
    .replace(/```\s*$/i, "")
    .trim();
  const direct = tryParse(cleaned);
  if (direct !== undefined) return direct;

  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  if (start >= 0 && end > start) {
    const sliced = tryParse(cleaned.slice(start, end + 1));
    if (sliced !== undefined) return sliced;
  }
  throw new OllamaError("Le modèle n'a pas renvoyé un JSON exploitable.", "INVALID_JSON", 502);
}

function tryParse(value: string): unknown {
  try {
    return JSON.parse(value);
  } catch {
    return undefined;
  }
}

export function extractCodeBlock(text: string, language?: string): string | null {
  const fence = language
    ? new RegExp("```" + language.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "\\s*\\n([\\s\\S]*?)```", "i")
    : /```[a-zA-Z0-9_+-]*\s*\n([\s\S]*?)```/;
  const match = text.match(fence) ?? text.match(/```[a-zA-Z0-9_+-]*\s*\n([\s\S]*?)```/);
  if (match?.[1]) return match[1].replace(/\s+$/, "") + "\n";
  if (language && !text.includes("```")) {
    const trimmed = text.trim();
    if (trimmed.length > 0) return trimmed + "\n";
  }
  return null;
}
