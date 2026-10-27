import { afterEach, describe, expect, it } from "vitest";
import {
  defaultModelForProvider,
  defaultProvider,
  isAiProvider,
  isProviderEnabled,
  modelsForProvider,
  providerInfos,
  resolveAiSelection,
} from "@/lib/ai";

const TOUCHED = [
  "AI_PROVIDER",
  "OPENAI_API_KEY",
  "OPENAI_MODELS",
  "ANTHROPIC_API_KEY",
  "ANTHROPIC_MODELS",
  "GOOGLE_AI_API_KEY",
  "MISTRAL_API_KEY",
  "DEEPSEEK_API_KEY",
] as const;

const saved = new Map<string, string | undefined>();

function setEnv(values: Record<string, string | undefined>) {
  for (const [key, value] of Object.entries(values)) {
    if (!saved.has(key)) saved.set(key, process.env[key]);
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
}

afterEach(() => {
  for (const key of TOUCHED) {
    const value = saved.get(key);
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
  saved.clear();
});

describe("sélection multi-IA", () => {
  it("reconnaît les fournisseurs pris en charge", () => {
    expect(isAiProvider("openai")).toBe(true);
    expect(isAiProvider("anthropic")).toBe(true);
    expect(isAiProvider("google")).toBe(true);
    expect(isAiProvider("mistral")).toBe(true);
    expect(isAiProvider("deepseek")).toBe(true);
    expect(isAiProvider("ollama")).toBe(true);
    expect(isAiProvider("inconnu")).toBe(false);
    expect(isAiProvider(null)).toBe(false);
  });

  it("active un fournisseur cloud uniquement lorsqu'une clé est présente", () => {
    setEnv({ OPENAI_API_KEY: undefined, ANTHROPIC_API_KEY: undefined });
    expect(isProviderEnabled("openai")).toBe(false);
    setEnv({ OPENAI_API_KEY: "sk-test-local" });
    expect(isProviderEnabled("openai")).toBe(true);
    expect(isProviderEnabled("anthropic")).toBe(false);
    expect(isProviderEnabled("ollama")).toBe(true);
  });

  it("retombe sur Ollama quand la clé du fournisseur demandé manque", () => {
    setEnv({ AI_PROVIDER: "openai", OPENAI_API_KEY: undefined });
    expect(defaultProvider()).toBe("ollama");
    expect(resolveAiSelection("openai", "gpt-4o-mini")).toEqual({
      provider: "ollama",
      model: "test-coder:latest",
    });
  });
  it("respecte un fournisseur configuré par l'environnement", () => {
    setEnv({ AI_PROVIDER: "openai", OPENAI_API_KEY: "sk-test-local", OPENAI_MODELS: "gpt-4o,gpt-4o-mini" });
    expect(defaultProvider()).toBe("openai");
    expect(defaultModelForProvider("openai")).toBe("gpt-4o");
    expect(modelsForProvider("openai")).toEqual(["gpt-4o", "gpt-4o-mini"]);
    expect(resolveAiSelection(undefined, "mon-modele-ollama:latest")).toEqual({
      provider: "openai",
      model: "gpt-4o",
    });
    expect(resolveAiSelection("openai", "gpt-4o-mini")).toEqual({
      provider: "openai",
      model: "gpt-4o-mini",
    });
  });

  it("liste les six fournisseurs avec leurs modèles et leur état", () => {
    setEnv({ OPENAI_API_KEY: "sk-test-local" });
    const providers = providerInfos(["test-coder:latest"]);
    expect(providers.map((provider) => provider.id)).toEqual([
      "ollama",
      "openai",
      "anthropic",
      "google",
      "mistral",
      "deepseek",
    ]);
    const openai = providers.find((provider) => provider.id === "openai");
    expect(openai?.enabled).toBe(true);
    expect(openai?.models.length).toBeGreaterThan(0);
    const ollama = providers.find((provider) => provider.id === "ollama");
    expect(ollama?.models).toContain("test-coder:latest");
  });
});
