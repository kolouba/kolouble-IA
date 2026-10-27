export class UnsafePathError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "UnsafePathError";
  }
}

const ALLOWED_EXTENSIONS = new Set([
  "dart",
  "yaml",
  "yml",
  "json",
  "sql",
  "md",
  "html",
  "css",
  "js",
  "mjs",
  "ts",
  "tsx",
  "txt",
  "toml",
  "xml",
  "plist",
  "gradle",
  "properties",
  "sh",
  "conf",
  "ini",
  "png",
  "jpg",
  "jpeg",
  "webp",
  "svg",
  "ico",
  "example",
]);

const ALLOWED_EXTENSIONLESS = new Set([
  "README",
  "Dockerfile",
  "Procfile",
  "Makefile",
  "Caddyfile",
  "CNAME",
  "LICENSE",
  ".gitignore",
  ".dockerignore",
  ".env.example",
]);

const ALLOWED_DOT_DIRECTORIES = new Set([".github", ".well-known"]);

const MAX_PATH_LENGTH = 180;
const MAX_SEGMENTS = 10;
const SEGMENT_PATTERN = /^[A-Za-z0-9._@+-]+$/;

export function normalizeProjectPath(input: unknown): string {
  if (typeof input !== "string") {
    throw new UnsafePathError("Le chemin doit être une chaîne de caractères.");
  }
  const candidate = input.trim().replace(/\\/g, "/");
  if (!candidate) throw new UnsafePathError("Chemin vide.");
  if (candidate.length > MAX_PATH_LENGTH) throw new UnsafePathError("Chemin trop long.");
  if (candidate.startsWith("/") || /^[A-Za-z]:/.test(candidate)) {
    throw new UnsafePathError("Les chemins absolus sont interdits.");
  }
  if (candidate.includes("\0")) throw new UnsafePathError("Caractère nul interdit.");

  const segments = candidate.split("/").filter((segment) => segment.length > 0);
  if (segments.length === 0) throw new UnsafePathError("Chemin vide.");
  if (segments.length > MAX_SEGMENTS) throw new UnsafePathError("Trop de niveaux de dossier.");

  for (const segment of segments) {
    if (segment === "." || segment === "..") {
      throw new UnsafePathError("Traversée de dossier interdite.");
    }
    if (!SEGMENT_PATTERN.test(segment)) {
      throw new UnsafePathError(`Segment de chemin interdit : « ${segment} ».`);
    }
    if (segment.startsWith(".") && !ALLOWED_DOT_DIRECTORIES.has(segment)) {
      const full = segments.join("/");
      if (ALLOWED_EXTENSIONLESS.has(full)) continue;
      throw new UnsafePathError(`Fichier caché non autorisé : « ${segment} ».`);
    }
  }

  const normalized = segments.join("/");
  if (ALLOWED_EXTENSIONLESS.has(normalized) || ALLOWED_EXTENSIONLESS.has(segments.at(-1)!)) {
    return normalized;
  }
  const basename = segments.at(-1)!;
  const dotIndex = basename.lastIndexOf(".");
  if (dotIndex <= 0) {
    throw new UnsafePathError("Extension de fichier requise.");
  }
  const extension = basename.slice(dotIndex + 1).toLowerCase();
  if (!ALLOWED_EXTENSIONS.has(extension)) {
    throw new UnsafePathError(`Extension non autorisée : « .${extension} ».`);
  }
  return normalized;
}

export function languageForPath(path: string): string {
  const extension = path.split(".").pop()?.toLowerCase() ?? "";
  const map: Record<string, string> = {
    dart: "dart",
    yaml: "yaml",
    yml: "yaml",
    json: "json",
    sql: "sql",
    md: "markdown",
    html: "html",
    css: "css",
    js: "javascript",
    mjs: "javascript",
    ts: "typescript",
    tsx: "tsx",
    xml: "xml",
    toml: "toml",
    sh: "shell",
  };
  return map[extension] ?? "text";
}

export function isPreviewPath(path: string): boolean {
  return path.startsWith("prototype/");
}
