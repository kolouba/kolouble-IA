import { NextResponse } from "next/server";
import {
  defaultModelForProvider,
  defaultProvider,
  isProviderEnabled,
  providerInfos,
  resolveAiSelection,
} from "@/lib/ai";
import { env } from "@/lib/env";
import { requireUser } from "@/lib/guard";
import { jsonError } from "@/lib/http";
import { listOllamaModels } from "@/lib/ollama";
import { enforceRateLimit } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const user = await requireUser();
    enforceRateLimit(`models:${user.id}`, 30, 60_000);

    let ollamaOnline = false;
    let ollamaError: string | null = null;
    let ollamaNames: string[] = [];
    let ollamaDetails: Array<{ name: string; parameterSize: string | null; family: string | null }> = [];

    try {
      const models = await listOllamaModels();
      ollamaOnline = true;
      ollamaNames = models.map((model) => model.name);
      ollamaDetails = models.map((model) => ({
        name: model.name,
        parameterSize: model.parameterSize,
        family: model.family,
      }));
    } catch (error) {
      ollamaError = error instanceof Error ? error.message : "Ollama indisponible.";
      ollamaNames = env.models;
      ollamaDetails = env.models.map((name) => ({ name, parameterSize: null, family: null }));
    }

    const selection = resolveAiSelection(env.aiProvider, env.aiModel);
    const providers = providerInfos(ollamaNames).map((provider) => ({
      ...provider,
      enabled: provider.enabled,
      online: provider.id === "ollama" ? ollamaOnline : isProviderEnabled(provider.id),
      defaultModel:
        provider.id === "ollama" ? env.defaultModel : defaultModelForProvider(provider.id),
    }));

    return NextResponse.json({
      online: ollamaOnline,
      baseUrl: env.ollamaBaseUrl,
      defaultModel: env.defaultModel,
      models: ollamaDetails,
      providers,
      defaultProvider: defaultProvider(),
      selectedProvider: selection.provider,
      selectedModel: selection.model,
      aiAvailable: providers.some((provider) => provider.online),
      ...(ollamaError ? { error: ollamaError } : {}),
    });
  } catch (error) {
    return jsonError(error);
  }
}
