import { beforeEach } from "vitest";

process.env.AUTH_SECRET = "kolouble-tests-secret-value-change-me";
process.env.AUTH_TRUST_HOST = "true";
process.env.DATABASE_URL = "file:./tests/test.db";
process.env.OLLAMA_BASE_URL = "http://127.0.0.1:9";
process.env.OLLAMA_MODEL = "test-coder:latest";
process.env.OLLAMA_MODELS = "test-coder:latest,qwen2.5-coder:7b";
process.env.WORKSPACE_ROOT = "./tests/.workspace";

const { resetRateLimitsForTests } = await import("@/lib/rate-limit");

beforeEach(() => {
  resetRateLimitsForTests();
});
