import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
    setupFiles: ["tests/setup.ts"],
    restoreMocks: true,
    globals: false,
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "json-summary", "lcov"],
      include: [
        "src/app/api/projects/route.ts",
        "src/app/api/register/route.ts",
        "src/app/api/projects/[id]/route.ts",
        "src/app/api/projects/[id]/files/[...path]/route.ts",
        "src/lib/validation.ts",
        "src/lib/path-safety.ts",
        "src/lib/spec.ts",
        "src/lib/http.ts",
      ],
      thresholds: {
        perFile: true,
        lines: 70,
        functions: 65,
        branches: 60,
        statements: 70,
      },
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
    },
  },
});
