export const env = {
  get ollamaBaseUrl() {
    return (process.env.OLLAMA_BASE_URL || "http://localhost:11434").replace(/\/+$/, "");
  },
  get defaultModel() {
    return process.env.OLLAMA_MODEL || "deepseek-coder:latest";
  },
  get models() {
    const raw = process.env.OLLAMA_MODELS || "";
    const list = raw
      .split(",")
      .map((value) => value.trim())
      .filter(Boolean);
    return list.length > 0 ? list : [this.defaultModel];
  },
  get ollamaTimeoutMs() {
    const parsed = Number(process.env.OLLAMA_TIMEOUT_MS || 240_000);
    return Number.isFinite(parsed) ? Math.min(Math.max(parsed, 10_000), 600_000) : 240_000;
  },
  get maxUploadBytes() {
    const parsed = Number(process.env.MAX_UPLOAD_BYTES || 512_000);
    return Number.isFinite(parsed) ? Math.min(Math.max(parsed, 10_000), 5_000_000) : 512_000;
  },
  get workspaceRoot() {
    return process.env.WORKSPACE_ROOT || "./workspace";
  },
  get isVercel() {
    return Boolean(process.env.VERCEL);
  },
  get googleEnabled() {
    return Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
  },
  get facebookEnabled() {
    return Boolean(process.env.FACEBOOK_CLIENT_ID && process.env.FACEBOOK_CLIENT_SECRET);
  },
  get githubEnabled() {
    return Boolean(process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET);
  },
  get aiProvider() {
    const value = (process.env.AI_PROVIDER || "ollama").trim().toLowerCase();
    return value || "ollama";
  },
  get aiModel() {
    return (process.env.AI_MODEL || "").trim();
  },
  get openaiApiKey() {
    return (process.env.OPENAI_API_KEY || "").trim();
  },
  get anthropicApiKey() {
    return (process.env.ANTHROPIC_API_KEY || "").trim();
  },
  get googleAiApiKey() {
    return (process.env.GOOGLE_AI_API_KEY || process.env.GEMINI_API_KEY || "").trim();
  },
  get mistralApiKey() {
    return (process.env.MISTRAL_API_KEY || "").trim();
  },
  get deepseekApiKey() {
    return (process.env.DEEPSEEK_API_KEY || "").trim();
  },
  get figmaEnabled() {
    return Boolean((process.env.FIGMA_TOKEN || "").trim());
  },
  get buildEnabled() {
    return !this.isVercel && process.env.BUILD_ENABLED !== "false";
  },
  get flutterBin() {
    return (process.env.FLUTTER_BIN || "flutter").trim();
  },
  get buildTimeoutMs() {
    const parsed = Number(process.env.BUILD_TIMEOUT_MS || 900_000);
    return Number.isFinite(parsed) ? Math.min(Math.max(parsed, 60_000), 1_800_000) : 900_000;
  },
};

export const MODEL_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._:/-]{0,99}$/;
