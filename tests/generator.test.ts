import { describe, expect, it } from "vitest";
import { collectFallbackFiles, runGeneration } from "@/lib/generator";
import { repairFiles } from "@/lib/generator/repair";
import type { GeneratedFile, StreamEvent } from "@/lib/generator/types";
import { validateFiles } from "@/lib/generator/validate";
import { parsePrompt } from "@/lib/spec";

const PROMPT =
  "Crée une application de gestion de projets avec Android, iPhone, Web, Windows, mode offline et synchronisation cloud";

describe("runGeneration en mode gabarits", () => {
  it("produit un projet Flutter complet et cohérent sans Ollama", async () => {
    const events: StreamEvent[] = [];
    const outcome = await runGeneration({
      prompt: PROMPT,
      mode: "scaffold",
      appName: "Terrain OBC",
      generationId: "gen-test",
      onEvent: (event) => {
        events.push(event);
      },
    });

    const errors = outcome.issues.filter((issue) => issue.severity === "error");
    expect(errors, JSON.stringify(errors, null, 2)).toHaveLength(0);
    expect(outcome.status).not.toBe("error");
    expect(outcome.files.length).toBeGreaterThan(30);
    expect(outcome.spec.appName).toBe("Terrain OBC");
    expect(outcome.summary).toContain("Terrain OBC");

    const paths = new Set(outcome.files.map((file) => file.path));
    for (const required of [
      "lib/main.dart",
      "lib/core/router/app_router.dart",
      "lib/core/sync/sync_service.dart",
      "lib/features/projects/domain/models/project.dart",
      "lib/features/projects/data/project_repository.dart",
      "supabase/schema.sql",
      ".github/workflows/flutter.yml",
      "prototype/index.html",
      "pubspec.yaml",
      "Dockerfile",
      "docker-compose.yml",
      "vercel.json",
      "Caddyfile",
      "netlify.toml",
      "scripts/netlify-build.sh",
      ".github/workflows/deploy.yml",
      "DEPLOYMENT.md",
    ]) {
      expect(paths.has(required), `fichier manquant : ${required}`).toBe(true);
    }
    expect(paths.has("web/CNAME")).toBe(false);

    const deployWorkflow = outcome.files.find((file) => file.path === ".github/workflows/deploy.yml")!;
    expect(deployWorkflow.content).toContain("actions/deploy-pages");
    expect(deployWorkflow.content).toContain("ENABLE_VERCEL");
    expect(deployWorkflow.content).toContain("ENABLE_NETLIFY");
    expect(deployWorkflow.content).toContain("ENABLE_CLOUDFLARE");

    const netlify = outcome.files.find((file) => file.path === "netlify.toml")!;
    expect(netlify.content).toContain("bash scripts/netlify-build.sh");
    expect(netlify.content).toContain("build/web");

    const guide = outcome.files.find((file) => file.path === "DEPLOYMENT.md")!;
    expect(guide.content).toContain("GitHub Pages");
    expect(guide.content).toContain("Vercel");
    expect(guide.content).toContain("Netlify");

    const main = outcome.files.find((file) => file.path === "lib/main.dart")!;
    expect(main.content).toContain("Hive.initFlutter()");
    expect(main.content).toContain("Supabase.initialize");

    const router = outcome.files.find((file) => file.path === "lib/core/router/app_router.dart")!;
    expect(router.content).not.toContain("$entityRouteList");
    expect(router.content).toContain("GoRoute(");
    expect(router.content).toContain("auth.isSignedIn");
    expect(router.content).not.toContain("Supabase.instance");

    const auth = outcome.files.find((file) => file.path === "lib/core/auth/auth_service.dart")!;
    expect(auth.content).toContain("signInLocal");
    expect(auth.content).toContain("SupabaseClient?");

    const app = outcome.files.find((file) => file.path === "lib/app.dart")!;
    expect(app.content).not.toContain("SetupPage");
    expect(paths.has("lib/features/setup/presentation/pages/setup_page.dart")).toBe(false);

    const providers = outcome.files.find((file) => file.path === "lib/core/providers/core_providers.dart")!;
    expect(providers.content).toContain("cloudReadyProvider");
    expect(providers.content).toContain("SyncService?");

    const shell = outcome.files.find((file) => file.path === "lib/core/widgets/app_shell.dart")!;
    expect(shell.content).toContain("const List<String> _entityRoutes = <String>['/projects', '/clients'];");

    const sql = outcome.files.find((file) => file.path === "supabase/schema.sql")!;
    expect(sql.content).toContain("enable row level security");
    expect(sql.content).toContain("auth.uid() = user_id");

    const preview = outcome.files.find((file) => file.path === "prototype/index.html")!;
    expect(preview.content).toContain("data-view=");
    expect(preview.content).not.toContain("__DATA__");

    const eventTypes = new Set(events.map((event) => event.type));
    expect(eventTypes.has("step")).toBe(true);
    expect(eventTypes.has("file")).toBe(true);
    expect(eventTypes.has("log")).toBe(true);
    expect(eventTypes.has("done") || eventTypes.has("error")).toBe(false);
    expect(events.filter((event) => event.type === "step")).toHaveLength(12);
  });

  it("est déterministe pour une même demande", async () => {
    const first = await runGeneration({ prompt: PROMPT, mode: "scaffold", appName: "Terrain OBC" });
    const second = await runGeneration({ prompt: PROMPT, mode: "scaffold", appName: "Terrain OBC" });
    const firstPaths = first.files.map((file) => file.path);
    const secondPaths = second.files.map((file) => file.path);
    expect(secondPaths).toEqual(firstPaths);
  });

  it("applique les préférences GitHub et domaine personnalisé", async () => {
    const outcome = await runGeneration({
      prompt: PROMPT,
      mode: "scaffold",
      appName: "Terrain OBC",
      generationId: "gen-deploy",
      deployment: {
        target: "github-pages",
        repoName: "Suivi Terrain",
        customDomain: "https://App.Exemple.CI/",
      },
    });

    const paths = new Map(outcome.files.map((file) => [file.path, file]));
    expect(outcome.spec.deployment).toEqual({
      target: "github-pages",
      repoName: "suivi-terrain",
      customDomain: "app.exemple.ci",
    });
    expect(paths.get("web/CNAME")?.content).toBe("app.exemple.ci\n");
    expect(paths.get("DEPLOYMENT.md")?.content).toContain("app.exemple.ci");
    expect(paths.get(".github/workflows/deploy.yml")?.content).toContain("actions/deploy-pages");
    expect(outcome.issues.filter((issue) => issue.severity === "error")).toHaveLength(0);
  });
});

describe("validateFiles", () => {
  const spec = parsePrompt(PROMPT);
  const fallbacks = collectFallbackFiles(spec);

  it("détecte les fichiers obligatoires absents", () => {
    const issues = validateFiles(
      fallbacks.filter((file) => file.path !== "lib/main.dart"),
      spec,
    );
    expect(issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: "file.missing", path: "lib/main.dart", severity: "error" }),
      ]),
    );
  });

  it("détecte les chemins dangereux, doublons et secrets", () => {
    const base = fallbacks[0]!;
    const issues = validateFiles(
      [
        base,
        { ...base, path: "lib/main.dart", content: base.content },
        {
          ...base,
          path: "lib/core/secret_token.dart",
          content: "void main() {}\n// eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.abcdefghijklmnopqrstuvwx",
        },
        { ...base, path: "../escape.dart" },
        { ...base, path: "lib/core/x.dart", content: "class Broken { void x() {" },
        { ...base, path: "lib/core/z.dart", content: "   " },
      ],
      spec,
    );
    expect(issues.some((issue) => issue.code === "file.duplicate")).toBe(true);
    expect(issues.some((issue) => issue.code === "path.unsafe")).toBe(true);
    expect(issues.some((issue) => issue.code === "secret.jwt")).toBe(true);
    expect(issues.some((issue) => issue.code === "dart.brackets")).toBe(true);
    expect(issues.some((issue) => issue.code === "file.empty")).toBe(true);
  });

  it("détecte les imports Dart internes manquants", () => {
    const main = fallbacks.find((file) => file.path === "lib/main.dart")!;
    const issues = validateFiles(
      [
        ...fallbacks,
        {
          ...main,
          path: "lib/extra.dart",
          content: `import 'package:${spec.packageName}/core/absent.dart';\nvoid main() {}`,
        },
      ],
      spec,
    );
    expect(issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: "dart.import",
          path: "lib/extra.dart",
          message: expect.stringContaining("lib/core/absent.dart"),
        }),
      ]),
    );
  });
});

describe("repairFiles", () => {
  it("restaure les fichiers manquants depuis les gabarits", async () => {
    const spec = parsePrompt(PROMPT);
    const files = collectFallbackFiles(spec).filter((file) => file.path !== "lib/app.dart");
    const issues = validateFiles(files, spec);
    const result = await repairFiles({
      files,
      spec,
      issues,
      fallbacks: new Map(collectFallbackFiles(spec).map((file) => [file.path, file])),
      useAi: false,
    });
    expect(result.repaired).toContain("lib/app.dart");
    expect(result.files.some((file) => file.path === "lib/app.dart")).toBe(true);
    expect(result.issues.filter((issue) => issue.code === "file.missing")).toHaveLength(0);
  });

  it("ne remplace jamais un fichier utilisateur", async () => {
    const spec = parsePrompt(PROMPT);
    const files = collectFallbackFiles(spec).filter((file) => file.path !== "lib/app.dart");
    const userFile: GeneratedFile = {
      path: "lib/custom.dart",
      content: "void main() {}",
      language: "dart",
      source: "user",
    };
    files.push(userFile);
    const issues = validateFiles(files, spec);
    const result = await repairFiles({
      files,
      spec,
      issues,
      fallbacks: new Map(collectFallbackFiles(spec).map((file) => [file.path, file])),
      useAi: false,
    });
    const preserved = result.files.find((file) => file.path === "lib/custom.dart");
    expect(preserved).toEqual(userFile);
  });
});
