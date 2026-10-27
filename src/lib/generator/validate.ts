import path from "node:path";
import { normalizeProjectPath, UnsafePathError } from "@/lib/path-safety";
import type { AppSpec } from "@/lib/spec";
import { allEntityMeta } from "./entity-meta";
import type { GeneratedFile, GenerationIssue } from "./types";

const REQUIRED_PATHS = [
  "lib/main.dart",
  "lib/app.dart",
  "lib/core/router/app_router.dart",
  "lib/core/storage/local_store.dart",
  "lib/core/sync/sync_service.dart",
  "lib/core/auth/auth_service.dart",
  "pubspec.yaml",
  "analysis_options.yaml",
  "README.md",
  "web/index.html",
  "web/manifest.json",
  "supabase/schema.sql",
  "prototype/index.html",
  "test/validators_test.dart",
  ".github/workflows/flutter.yml",
  "Dockerfile",
  "docker-compose.yml",
  "nginx.conf",
  "Caddyfile",
  "vercel.json",
  "netlify.toml",
  "scripts/vercel-install.sh",
  "scripts/vercel-build.sh",
  "scripts/netlify-build.sh",
  ".github/workflows/deploy.yml",
  "DEPLOYMENT.md",
  ".env.example",
  ".gitignore",
  ".dockerignore",
];

const PLACEHOLDER_MARKERS = ["__DATA__", "__APP_NAME__", "PACKAGE_NAME", "YOUR_APP_NAME", "class Todo"];
const MAX_FILE_BYTES = 600_000;
const SECRET_PATTERNS: Array<{ code: string; label: string; pattern: RegExp }> = [
  { code: "secret.jwt", label: "JWT/secret exposé", pattern: /eyJ[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{10,}/ },
  { code: "secret.openai", label: "clé API de type sk-…", pattern: /\bsk-[A-Za-z0-9]{24,}\b/ },
  { code: "secret.private-key", label: "clé privée PEM", pattern: /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/ },
  { code: "secret.service-role", label: "clé service_role Supabase", pattern: /SUPABASE_SERVICE_ROLE_KEY\s*=\s*(?!YOUR|VOTRE|<)[A-Za-z0-9._-]{20,}/ },
  { code: "secret.github", label: "token GitHub", pattern: /\bgh[pousr]_[A-Za-z0-9]{30,}\b/ },
];

interface ImportRef {
  specifier: string;
  line: number;
}

export function validateFiles(files: GeneratedFile[], spec: AppSpec): GenerationIssue[] {
  const issues: GenerationIssue[] = [];
  const byPath = new Map<string, GeneratedFile>();

  for (const file of files) {
    let normalized: string;
    try {
      normalized = normalizeProjectPath(file.path);
    } catch (error) {
      issues.push({
        path: file.path,
        code: "path.unsafe",
        message: error instanceof UnsafePathError ? error.message : "Chemin de fichier invalide.",
        severity: "error",
      });
      continue;
    }
    if (normalized !== file.path) {
      issues.push({
        path: file.path,
        code: "path.normalization",
        message: `Le chemin devrait être normalisé en « ${normalized} ».`,
        severity: "warning",
      });
    }
    if (byPath.has(normalized)) {
      issues.push({
        path: normalized,
        code: "file.duplicate",
        message: "Ce chemin est généré plusieurs fois.",
        severity: "error",
      });
      continue;
    }
    byPath.set(normalized, file);
    issues.push(...validateSingleFile(normalized, file, spec));
  }

  for (const required of REQUIRED_PATHS) {
    if (!byPath.has(required)) {
      issues.push({
        path: required,
        code: "file.missing",
        message: `Fichier obligatoire absent : ${required}.`,
        severity: "error",
      });
    }
  }

  for (const meta of allEntityMeta(spec.entities)) {
    const expected = [
      meta.modelPath,
      meta.repositoryPath,
      meta.providerPath,
      meta.listPagePath,
      meta.formPagePath,
      `test/models/${meta.singularKey}_model_test.dart`,
    ];
    for (const target of expected) {
      if (!byPath.has(target)) {
        issues.push({
          path: target,
          code: "entity.missing",
          message: `Fichier attendu pour l'entité « ${meta.label} » absent.`,
          severity: "error",
        });
      }
    }
  }

  const dartFiles = [...byPath.entries()].filter(([filePath, file]) => filePath.endsWith(".dart") && file.language === "dart");
  for (const [filePath, file] of dartFiles) {
    issues.push(...validateDartImports(filePath, file.content, byPath, spec));
  }

  const pubspec = byPath.get("pubspec.yaml");
  if (pubspec) issues.push(...validatePubspec(pubspec.content, spec));
  const sql = byPath.get("supabase/schema.sql");
  if (sql) issues.push(...validateSql(sql.content, spec));
  const workflow = byPath.get(".github/workflows/flutter.yml");
  if (workflow) issues.push(...validateWorkflow(workflow.content));
  const preview = byPath.get("prototype/index.html");
  if (preview) issues.push(...validatePreview(preview.content, spec));

  return issues;
}

function validateSingleFile(filePath: string, file: GeneratedFile, spec: AppSpec): GenerationIssue[] {
  const issues: GenerationIssue[] = [];
  const bytes = Buffer.byteLength(file.content, "utf8");
  if (file.content.trim().length === 0) {
    issues.push({ path: filePath, code: "file.empty", message: "Le fichier généré est vide.", severity: "error" });
    return issues;
  }
  if (bytes > MAX_FILE_BYTES) {
    issues.push({
      path: filePath,
      code: "file.too-large",
      message: `Fichier trop volumineux (${Math.round(bytes / 1024)} Ko).`,
      severity: "error",
    });
  }
  for (const marker of PLACEHOLDER_MARKERS) {
    if (file.content.includes(marker)) {
      issues.push({
        path: filePath,
        code: "file.placeholder",
        message: `Marqueur de gabarit non résolu : « ${marker} ».`,
        severity: "error",
      });
    }
  }
  for (const rule of SECRET_PATTERNS) {
    if (rule.pattern.test(file.content)) {
      issues.push({
        path: filePath,
        code: rule.code,
        message: `Secret potentiel détecté (${rule.label}) : retirez-le du fichier généré.`,
        severity: "error",
      });
    }
  }
  if (filePath.endsWith(".dart")) {
    const balance = checkBracketBalance(file.content);
    if (balance) {
      issues.push({
        path: filePath,
        code: "dart.brackets",
        message: `Délimiteurs déséquilibrés ligne ${balance.line} : ${balance.message}`,
        severity: "error",
      });
    }
    if (filePath === "lib/main.dart" && !/(?:Future<void>|void)\s+main\s*\(/.test(file.content)) {
      issues.push({ path: filePath, code: "dart.main", message: "main.dart ne définit pas void main().", severity: "error" });
    }
    if (filePath === "lib/app.dart" && !/MaterialApp|MaterialApp\.router/.test(file.content)) {
      issues.push({ path: filePath, code: "dart.app", message: "app.dart n'expose pas de MaterialApp.", severity: "error" });
    }
  }
  if (filePath === "lib/core/auth/auth_service.dart" && spec.auth.google && !/signInWithOAuth/.test(file.content)) {
    issues.push({
      path: filePath,
      code: "auth.oauth",
      message: "Le service d'authentification n'implémente pas OAuth alors que Google/Facebook est demandé.",
      severity: "warning",
    });
  }
  return issues;
}

function checkBracketBalance(content: string): { line: number; message: string } | null {
  const stack: Array<{ char: string; line: number }> = [];
  const pairs: Record<string, string> = { ")": "(", "]": "[", "}": "{" };
  let line = 1;
  let i = 0;

  while (i < content.length) {
    const char = content[i]!;
    const next = content[i + 1];

    if (char === "\n") {
      line += 1;
      i += 1;
      continue;
    }
    if (char === "/" && next === "/") {
      while (i < content.length && content[i] !== "\n") i += 1;
      continue;
    }
    if (char === "/" && next === "*") {
      i += 2;
      let depth = 1;
      while (i < content.length && depth > 0) {
        if (content[i] === "\n") line += 1;
        if (content[i] === "/" && content[i + 1] === "*") {
          depth += 1;
          i += 2;
          continue;
        }
        if (content[i] === "*" && content[i + 1] === "/") {
          depth -= 1;
          i += 2;
          continue;
        }
        i += 1;
      }
      continue;
    }
    if (char === "'" || char === '"') {
      const triple = content.slice(i, i + 3);
      if (triple === "'''" || triple === '"""') {
        const quote = char.repeat(3);
        i += 3;
        while (i < content.length) {
          if (content[i] === "\n") line += 1;
          if (content.startsWith(quote, i)) {
            i += 3;
            break;
          }
          i += 1;
        }
        continue;
      }
      const raw = i > 0 && (content[i - 1] === "r" || content[i - 1] === "R");
      i += 1;
      while (i < content.length) {
        if (content[i] === "\n") {
          line += 1;
          break;
        }
        if (!raw && content[i] === "\\") {
          i += 2;
          continue;
        }
        if (content[i] === char) {
          i += 1;
          break;
        }
        i += 1;
      }
      continue;
    }
    if (char === "(" || char === "[" || char === "{") {
      stack.push({ char, line });
      i += 1;
      continue;
    }
    if (char === ")" || char === "]" || char === "}") {
      const open = stack.pop();
      if (!open) return { line, message: `« ${char} » fermant sans ouverture.` };
      if (open.char !== pairs[char]) {
        return { line, message: `« ${char} » ferme « ${open.char} » ouvert ligne ${open.line}.` };
      }
      i += 1;
      continue;
    }
    i += 1;
  }

  if (stack.length > 0) {
    const last = stack[stack.length - 1]!;
    return { line: last.line, message: `« ${last.char} » n'est jamais fermé.` };
  }
  return null;
}

function parseImports(content: string): ImportRef[] {
  const refs: ImportRef[] = [];
  const regex = /^\s*import\s+['"]([^'"]+)['"]/gm;
  let match: RegExpExecArray | null;
  while ((match = regex.exec(content))) {
    const line = content.slice(0, match.index).split("\n").length;
    refs.push({ specifier: match[1]!, line });
  }
  return refs;
}

function validateDartImports(
  filePath: string,
  content: string,
  byPath: Map<string, GeneratedFile>,
  spec: AppSpec,
): GenerationIssue[] {
  const issues: GenerationIssue[] = [];
  for (const ref of parseImports(content)) {
    if (ref.specifier.startsWith("dart:")) continue;
    let target: string | null = null;
    if (ref.specifier.startsWith("package:")) {
      const rest = ref.specifier.slice(8);
      const slash = rest.indexOf("/");
      if (slash < 0) continue;
      const pkg = rest.slice(0, slash);
      const rel = rest.slice(slash + 1);
      if (pkg !== spec.packageName) continue;
      target = `lib/${rel}`;
    } else if (ref.specifier.startsWith("./") || ref.specifier.startsWith("../")) {
      target = path.posix.normalize(path.posix.join(path.posix.dirname(filePath), ref.specifier));
    } else {
      continue;
    }
    if (target.endsWith(".dart") && !byPath.has(target)) {
      issues.push({
        path: filePath,
        code: "dart.import",
        message: `Import introuvable ligne ${ref.line} : ${ref.specifier} → ${target}.`,
        severity: "error",
      });
    }
  }
  return issues;
}

function validatePubspec(content: string, spec: AppSpec): GenerationIssue[] {
  const issues: GenerationIssue[] = [];
  if (!new RegExp(`^name:\\s*${spec.packageName}\\s*$`, "m").test(content)) {
    issues.push({
      path: "pubspec.yaml",
      code: "pubspec.name",
      message: `Le nom du paquet devrait être « ${spec.packageName} ».`,
      severity: "error",
    });
  }
  const dependencies = ["flutter_riverpod", "go_router", "hive_flutter", "supabase_flutter"];
  for (const dependency of dependencies) {
    if (!new RegExp(`^\\s{2}${dependency}:\\s*\\S+`, "m").test(content)) {
      issues.push({
        path: "pubspec.yaml",
        code: "pubspec.dependency",
        message: `Dépendance manquante : ${dependency}.`,
        severity: "error",
      });
    }
  }
  return issues;
}

function validateSql(content: string, spec: AppSpec): GenerationIssue[] {
  const issues: GenerationIssue[] = [];
  const tables = spec.entities.map((entity) => entity.key);
  for (const table of tables) {
    if (!new RegExp(`create table if not exists public\\.${table}\\b`, "i").test(content)) {
      issues.push({ path: "supabase/schema.sql", code: "sql.table", message: `Table « ${table} » absente.`, severity: "error" });
    }
    const policyPattern = spec.saas
      ? new RegExp(
          `create policy "[^"]+" on public\\.${table}\\b[\\s\\S]{0,200}?kolouble_is_member\\(organization_id\\)`,
          "gi",
        )
      : new RegExp(
          `create policy "[^"]+" on public\\.${table}\\b[\\s\\S]{0,160}?auth\\.uid\\(\\) = user_id`,
          "gi",
        );
    const policies = content.match(policyPattern) ?? [];
    if (policies.length < 4) {
      issues.push({
        path: "supabase/schema.sql",
        code: "sql.rls",
        message: `Politiques RLS incomplètes pour « ${table} » (${policies.length}/4).`,
        severity: "error",
      });
    }
  }
  const rlsCount = (content.match(/enable row level security/gi) ?? []).length;
  if (rlsCount < tables.length) {
    issues.push({
      path: "supabase/schema.sql",
      code: "sql.rls-count",
      message: `RLS activé sur ${rlsCount} table(s) pour ${tables.length} entité(s).`,
      severity: "error",
    });
  }
  if (spec.saas) {
    if (!/kolouble_is_member\(organization_id\)/.test(content)) {
      issues.push({
        path: "supabase/schema.sql",
        code: "sql.owner",
        message: "Aucune politique organisationnelle kolouble_is_member().",
        severity: "error",
      });
    }
  } else if (!/auth\.uid\(\) = user_id/.test(content)) {
    issues.push({ path: "supabase/schema.sql", code: "sql.owner", message: "Aucune politique propriétaire user_id.", severity: "error" });
  }
  return issues;
}

function validateWorkflow(content: string): GenerationIssue[] {
  const issues: GenerationIssue[] = [];
  if (!/^on:/m.test(content) || !/^jobs:/m.test(content)) {
    issues.push({
      path: ".github/workflows/flutter.yml",
      code: "workflow.structure",
      message: "Le workflow GitHub Actions doit déclarer « on » et « jobs ».",
      severity: "error",
    });
  }
  if (!/flutter-action/.test(content)) {
    issues.push({
      path: ".github/workflows/flutter.yml",
      code: "workflow.flutter",
      message: "Le workflow ne configure pas Flutter.",
      severity: "warning",
    });
  }
  if (/\bpassword\s*:\s*(?!\$\{\{)/i.test(content)) {
    issues.push({
      path: ".github/workflows/flutter.yml",
      code: "workflow.secret",
      message: "Mot de passe littéral détecté dans le workflow.",
      severity: "error",
    });
  }
  return issues;
}

function validatePreview(content: string, spec: AppSpec): GenerationIssue[] {
  const issues: GenerationIssue[] = [];
  if (!/^\s*<!doctype html>/i.test(content)) {
    issues.push({ path: "prototype/index.html", code: "preview.doctype", message: "Le prototype doit être un document HTML autonome.", severity: "error" });
  }
  if (/<script[^>]+src=/i.test(content) || /<link[^>]+href=["']https?:/i.test(content)) {
    issues.push({
      path: "prototype/index.html",
      code: "preview.external",
      message: "Le prototype ne doit charger aucune ressource externe.",
      severity: "error",
    });
  }
  if (/@import|url\(\s*["']?https?:/i.test(content)) {
    issues.push({
      path: "prototype/index.html",
      code: "preview.network",
      message: "Le prototype contient une ressource réseau non autorisée.",
      severity: "error",
    });
  }
  if (!content.includes(spec.appName.replace(/&/g, "&amp;")) && !content.includes(spec.appName)) {
    issues.push({ path: "prototype/index.html", code: "preview.name", message: "Le nom de l'application n'apparaît pas dans le prototype.", severity: "warning" });
  }
  if (!/data-view=/.test(content)) {
    issues.push({ path: "prototype/index.html", code: "preview.nav", message: "La navigation du prototype est absente.", severity: "error" });
  }
  return issues;
}

export function summarizeIssues(issues: GenerationIssue[]): { errors: number; warnings: number; messages: string[] } {
  const errors = issues.filter((issue) => issue.severity === "error").length;
  const warnings = issues.filter((issue) => issue.severity === "warning").length;
  return {
    errors,
    warnings,
    messages: issues.slice(0, 12).map((issue) => `${issue.path} · ${issue.message}`),
  };
}
