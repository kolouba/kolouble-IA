import { env, MODEL_PATTERN } from "@/lib/env";
import {
  generateWithOllama,
  type GenerateOptions,
  type GenerateResult,
} from "@/lib/ollama";

export const AI_PROVIDER_IDS = ["ollama", "openai", "anthropic", "google", "mistral", "deepseek"] as const;
export type AiProvider = (typeof AI_PROVIDER_IDS)[number];

export const AI_PROVIDER_LABELS: Record<AiProvider, string> = {
  ollama: "Ollama (local)",
  openai: "OpenAI",
  anthropic: "Anthropic Claude",
  google: "Google Gemini",
  mistral: "Mistral AI",
  deepseek: "DeepSeek",
};

export const AI_PROVIDER_HINTS: Record<AiProvider, string> = {
  ollama: "Modèles exécutés sur votre machine, sans clé.",
  openai: "GPT via OPENAI_API_KEY.",
  anthropic: "Claude via ANTHROPIC_API_KEY.",
  google: "Gemini via GOOGLE_AI_API_KEY.",
  mistral: "Mistral via MISTRAL_API_KEY.",
  deepseek: "DeepSeek via DEEPSEEK_API_KEY.",
};

const CLOUD_MODEL_KEYS: Record<Exclude<AiProvider, "ollama">, string> = {
  openai: "OPENAI_MODELS",
  anthropic: "ANTHROPIC_MODELS",
  google: "GOOGLE_AI_MODELS",
  mistral: "MISTRAL_MODELS",
  deepseek: "DEEPSEEK_MODELS",
};

const CLOUD_MODEL_DEFAULTS: Record<Exclude<AiProvider, "ollama">, string> = {
  openai: "gpt-4o-mini",
  anthropic: "claude-3-5-sonnet-latest",
  google: "gemini-2.0-flash",
  mistral: "mistral-large-latest",
  deepseek: "deepseek-chat",
};

const OPENAI_COMPATIBLE_URLS: Record<"openai" | "mistral" | "deepseek", string> = {
  openai: "https://api.openai.com/v1/chat/completions",
  mistral: "https://api.mistral.ai/v1/chat/completions",
  deepseek: "https://api.deepseek.com/chat/completions",
};

export class AiError extends Error {
  readonly status: number;
  readonly code: string;

  constructor(message: string, code: string, status = 502) {
    super(message);
    this.name = "AiError";
    this.status = status;
    this.code = code;
  }
}

export interface AiProviderInfo {
  id: AiProvider;
  label: string;
  hint: string;
  enabled: boolean;
  models: string[];
  defaultModel: string;
}

export function isAiProvider(value: unknown): value is AiProvider {
  return typeof value === "string" && (AI_PROVIDER_IDS as readonly string[]).includes(value);
}

function apiKeyFor(provider: AiProvider): string {
  switch (provider) {
    case "openai":
      return env.openaiApiKey;
    case "anthropic":
      return env.anthropicApiKey;
    case "google":
      return env.googleAiApiKey;
    case "mistral":
      return env.mistralApiKey;
    case "deepseek":
      return env.deepseekApiKey;
    default:
      return "";
  }
}

export function isProviderEnabled(provider: AiProvider): boolean {
  return provider === "ollama" || Boolean(apiKeyFor(provider));
}

function splitModels(raw: string | undefined, fallback: string): string[] {
  const list = (raw || "")
    .split(",")
    .map((value) => value.trim())
    .filter((value) => MODEL_PATTERN.test(value));
  return [...new Set(list.length > 0 ? list : [fallback])];
}

export function modelsForProvider(provider: AiProvider, ollamaModels: string[] = []): string[] {
  if (provider === "ollama") {
    return [...new Set([...ollamaModels, ...env.models, env.defaultModel].filter((name) => MODEL_PATTERN.test(name)))];
  }
  return splitModels(process.env[CLOUD_MODEL_KEYS[provider]], CLOUD_MODEL_DEFAULTS[provider]);
}

export function defaultModelForProvider(provider: AiProvider): string {
  if (provider === "ollama") return env.defaultModel;
  return modelsForProvider(provider)[0] ?? CLOUD_MODEL_DEFAULTS[provider];
}

export function providerInfos(ollamaModels: string[] = []): AiProviderInfo[] {
  return AI_PROVIDER_IDS.map((provider) => ({
    id: provider,
    label: AI_PROVIDER_LABELS[provider],
    hint: AI_PROVIDER_HINTS[provider],
    enabled: isProviderEnabled(provider),
    models: modelsForProvider(provider, ollamaModels),
    defaultModel: defaultModelForProvider(provider),
  }));
}

export function defaultProvider(): AiProvider {
  const configured = isAiProvider(env.aiProvider) ? env.aiProvider : "ollama";
  if (isProviderEnabled(configured)) return configured;
  return AI_PROVIDER_IDS.find((provider) => provider !== "ollama" && isProviderEnabled(provider)) ?? "ollama";
}

export function resolveAiSelection(
  providerInput?: string | null,
  modelInput?: string | null,
): { provider: AiProvider; model: string } {
  const requested = isAiProvider(providerInput) ? providerInput : null;
  const provider = requested && isProviderEnabled(requested) ? requested : defaultProvider();
  const model =
    requested && requested !== provider
      ? defaultModelForProvider(provider)
      : normalizeModel(provider, modelInput);
  return { provider, model };
}

function normalizeModel(provider: AiProvider, modelInput?: string | null): string {
  const candidate = (modelInput || "").trim();
  if (!candidate || !MODEL_PATTERN.test(candidate)) return defaultModelForProvider(provider);
  if (provider === "ollama") return candidate;
  if (candidate === env.defaultModel || candidate.includes(":")) return defaultModelForProvider(provider);
  return candidate;
}

interface CloudRequest {
  provider: Exclude<AiProvider, "ollama">;
  model: string;
  prompt: string;
  system?: string;
  format?: "json" | null;
  temperature?: number;
  numPredict?: number;
  timeoutMs?: number;
}

const MAX_PROMPT_CHARS = 48_000;

async function postJson(
  url: string,
  headers: Record<string, string>,
  body: unknown,
  timeoutMs: number,
  provider: AiProvider,
): Promise<unknown> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  let response: Response;
  try {
    response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...headers },
      body: JSON.stringify(body),
      signal: controller.signal,
      cache: "no-store",
    });
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new AiError(
        `${AI_PROVIDER_LABELS[provider]} n'a pas répondu dans le délai imparti (${Math.round(timeoutMs / 1000)} s).`,
        "AI_TIMEOUT",
        504,
      );
    }
    throw new AiError(`Impossible de joindre ${AI_PROVIDER_LABELS[provider]}.`, "AI_UNREACHABLE", 502);
  } finally {
    clearTimeout(timer);
  }

  const raw = await response.text();
  let payload: unknown = null;
  try {
    payload = raw ? JSON.parse(raw) : null;
  } catch {
    payload = null;
  }

  if (!response.ok) {
    const record = payload as { error?: { message?: string } | string; message?: string } | null;
    const detail =
      (typeof record?.error === "string" ? record.error : record?.error?.message) ||
      record?.message ||
      raw.slice(0, 240) ||
      "sans détail";
    throw new AiError(
      `${AI_PROVIDER_LABELS[provider]} a échoué (${response.status}) : ${detail.slice(0, 300)}.`,
      "AI_PROVIDER_ERROR",
      502,
    );
  }
  return payload;
}

async function generateOpenAiCompatible(options: CloudRequest): Promise<GenerateResult> {
  const started = Date.now();
  const key = apiKeyFor(options.provider);
  if (!key) throw new AiError(`${AI_PROVIDER_LABELS[options.provider]} n'est pas configuré.`, "PROVIDER_NOT_CONFIGURED", 503);

  const messages: Array<{ role: string; content: string }> = [];
  if (options.system) messages.push({ role: "system", content: options.system });
  messages.push({ role: "user", content: options.prompt.slice(0, MAX_PROMPT_CHARS) });

  const payload = (await postJson(
    OPENAI_COMPATIBLE_URLS[options.provider as keyof typeof OPENAI_COMPATIBLE_URLS],
    { Authorization: `Bearer ${key}` },
    {
      model: options.model,
      messages,
      temperature: options.temperature ?? 0.3,
      max_tokens: options.numPredict ?? 1_800,
      ...(options.format === "json" ? { response_format: { type: "json_object" } } : {}),
    },
    options.timeoutMs ?? env.ollamaTimeoutMs,
    options.provider,
  )) as {
    choices?: Array<{ message?: { content?: string } }>;
    model?: string;
  } | null;

  const text = (payload?.choices?.[0]?.message?.content ?? "").trim();
  if (!text) throw new AiError(`${AI_PROVIDER_LABELS[options.provider]} a renvoyé une réponse vide.`, "EMPTY_RESPONSE", 502);
  return { text, model: payload?.model || options.model, durationMs: Date.now() - started };
}

async function generateAnthropic(options: CloudRequest): Promise<GenerateResult> {
  const started = Date.now();
  const key = apiKeyFor("anthropic");
  if (!key) throw new AiError("Anthropic Claude n'est pas configuré.", "PROVIDER_NOT_CONFIGURED", 503);

  const system = [
    options.system,
    options.format === "json" ? "Réponds uniquement avec un objet JSON valide, sans texte autour." : "",
  ]
    .filter(Boolean)
    .join(" ");

  const payload = (await postJson(
    "https://api.anthropic.com/v1/messages",
    { "x-api-key": key, "anthropic-version": "2023-06-01" },
    {
      model: options.model,
      max_tokens: options.numPredict ?? 1_800,
      temperature: options.temperature ?? 0.3,
      system: system || undefined,
      messages: [{ role: "user", content: options.prompt.slice(0, MAX_PROMPT_CHARS) }],
    },
    options.timeoutMs ?? env.ollamaTimeoutMs,
    "anthropic",
  )) as {
    content?: Array<{ type?: string; text?: string }>;
    model?: string;
  } | null;

  const text = (payload?.content ?? [])
    .filter((part) => part.type === "text" && typeof part.text === "string")
    .map((part) => part.text)
    .join("\n")
    .trim();
  if (!text) throw new AiError("Anthropic Claude a renvoyé une réponse vide.", "EMPTY_RESPONSE", 502);
  return { text, model: payload?.model || options.model, durationMs: Date.now() - started };
}

async function generateGemini(options: CloudRequest): Promise<GenerateResult> {
  const started = Date.now();
  const key = apiKeyFor("google");
  if (!key) throw new AiError("Google Gemini n'est pas configuré.", "PROVIDER_NOT_CONFIGURED", 503);

  const system = [
    options.system,
    options.format === "json" ? "Réponds uniquement avec un objet JSON valide, sans texte autour." : "",
  ]
    .filter(Boolean)
    .join(" ");

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(
    options.model,
  )}:generateContent?key=${encodeURIComponent(key)}`;
  const payload = (await postJson(
    url,
    {},
    {
      systemInstruction: system ? { parts: [{ text: system }] } : undefined,
      contents: [{ role: "user", parts: [{ text: options.prompt.slice(0, MAX_PROMPT_CHARS) }] }],
      generationConfig: {
        temperature: options.temperature ?? 0.3,
        maxOutputTokens: options.numPredict ?? 1_800,
        ...(options.format === "json" ? { responseMimeType: "application/json" } : {}),
      },
    },
    options.timeoutMs ?? env.ollamaTimeoutMs,
    "google",
  )) as {
    candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
    modelVersion?: string;
  } | null;

  const text = (payload?.candidates?.[0]?.content?.parts ?? [])
    .map((part) => part.text ?? "")
    .join("")
    .trim();
  if (!text) throw new AiError("Google Gemini a renvoyé une réponse vide.", "EMPTY_RESPONSE", 502);
  return { text, model: payload?.modelVersion || options.model, durationMs: Date.now() - started };
}

export interface AiGenerateOptions extends GenerateOptions {
  provider?: string | null;
}

export async function generateWithAi(options: AiGenerateOptions): Promise<GenerateResult> {
  const { provider, model } = resolveAiSelection(options.provider, options.model);
  if (provider === "ollama") {
    return generateWithOllama({ ...options, model });
  }
  const cloudOptions: CloudRequest = {
    provider,
    model,
    prompt: options.prompt,
    system: options.system,
    format: options.format,
    temperature: options.temperature,
    numPredict: options.numPredict,
    timeoutMs: options.timeoutMs,
  };
  if (provider === "anthropic") return generateAnthropic(cloudOptions);
  if (provider === "google") return generateGemini(cloudOptions);
  return generateOpenAiCompatible(cloudOptions);
}

export function configuredProviderSummary(): { provider: AiProvider; model: string; available: boolean } {
  const selection = resolveAiSelection(env.aiProvider, env.aiModel);
  return { ...selection, available: isProviderEnabled(selection.provider) };
}
