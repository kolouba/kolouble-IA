import { createWriteStream } from "node:fs";
import { promises as fs } from "node:fs";
import path from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import archiver from "archiver";
import { env } from "@/lib/env";
import { projectWorkspacePath, workspaceRoot } from "@/lib/workspace";

const execFileAsync = promisify(execFile);
const MAX_BUFFER = 8_000_000;
const PUB_GET_TIMEOUT_MS = 300_000;
const CREATE_TIMEOUT_MS = 240_000;

export type BuildTarget = "web" | "apk" | "all";

export interface BuildArtifact {
  name: string;
  bytes: number;
  url: string;
  createdAt: string;
}

export interface BuildReport {
  ok: boolean;
  target: BuildTarget;
  logs: string[];
  artifacts: BuildArtifact[];
  durationMs: number;
  error?: string;
}

export interface FlutterCapability {
  enabled: boolean;
  available: boolean;
  version: string | null;
  error: string | null;
}

let capabilityCache: { at: number; value: FlutterCapability } | null = null;
let resolvedFlutterBin: string | null = null;

const FLUTTER_FALLBACKS =
  process.platform === "win32"
    ? [
        "C:\\src\\flutter\\bin\\flutter.bat",
        "C:\\flutter\\bin\\flutter.bat",
        path.join(process.env.USERPROFILE ?? "", "flutter", "bin", "flutter.bat"),
        path.join(process.env.LOCALAPPDATA ?? "", "flutter", "bin", "flutter.bat"),
      ]
    : [
        "/opt/homebrew/bin/flutter",
        "/usr/local/bin/flutter",
        path.join(process.env.HOME ?? "", "flutter", "bin", "flutter"),
      ];

function runBinary(bin: string, args: string[], cwd: string, timeout: number) {
  return execFileAsync(bin, args, {
    cwd,
    timeout,
    maxBuffer: MAX_BUFFER,
    windowsHide: true,
    shell: process.platform === "win32",
    encoding: "utf8",
  });
}

async function executableExists(candidate: string): Promise<boolean> {
  if (candidate === "flutter") return true;
  try {
    await fs.access(candidate);
    return true;
  } catch {
    return false;
  }
}

async function resolveFlutterBin(): Promise<string> {
  if (resolvedFlutterBin) return resolvedFlutterBin;
  const candidates = [env.flutterBin, ...FLUTTER_FALLBACKS].filter(
    (candidate, index, all) => candidate && all.indexOf(candidate) === index,
  );
  for (const candidate of candidates) {
    if (!(await executableExists(candidate))) continue;
    try {
      await runBinary(candidate, ["--version"], workspaceRoot(), 20_000);
      resolvedFlutterBin = candidate;
      return candidate;
    } catch {
      continue;
    }
  }
  return env.flutterBin;
}

function errorText(error: unknown): string {
  if (!error || typeof error !== "object") return String(error);
  const record = error as { stdout?: unknown; stderr?: unknown; message?: unknown; killed?: unknown };
  const parts: string[] = [];
  if (typeof record.stderr === "string" && record.stderr.trim()) parts.push(record.stderr.trim());
  if (typeof record.stdout === "string" && record.stdout.trim()) parts.push(record.stdout.trim());
  if (typeof record.message === "string" && record.message.trim()) parts.push(record.message.trim());
  if (record.killed) parts.push("Processus interrompu (délai dépassé).");
  return parts.join("\n").slice(-4_000) || "Échec inconnu.";
}

async function runFlutter(args: string[], cwd: string, timeout: number): Promise<string> {
  try {
    const bin = await resolveFlutterBin();
    const { stdout, stderr } = await runBinary(bin, args, cwd, timeout);
    return [stdout, stderr].filter((value) => value?.trim()).join("\n").trim();
  } catch (error) {
    throw new Error(errorText(error));
  }
}

export async function flutterCapability(force = false): Promise<FlutterCapability> {
  if (!env.buildEnabled) {
    return {
      enabled: false,
      available: false,
      version: null,
      error: "La compilation locale est désactivée (BUILD_ENABLED=false ou déploiement Vercel).",
    };
  }
  if (!force && capabilityCache && Date.now() - capabilityCache.at < 60_000) {
    return capabilityCache.value;
  }
  if (force) resolvedFlutterBin = null;
  try {
    await fs.mkdir(workspaceRoot(), { recursive: true });
    const bin = await resolveFlutterBin();
    const output = await runFlutter(["--version"], workspaceRoot(), 20_000);
    const version = output.split(/\r?\n/).find((line) => line.trim().length > 0)?.trim() ?? null;
    const value: FlutterCapability = { enabled: true, available: true, version, error: null };
    resolvedFlutterBin = bin;
    capabilityCache = { at: Date.now(), value };
    return value;
  } catch (error) {
    const value: FlutterCapability = {
      enabled: true,
      available: false,
      version: null,
      error: error instanceof Error ? error.message.slice(-1_000) : "Flutter introuvable.",
    };
    capabilityCache = { at: Date.now(), value };
    return value;
  }
}

export function buildArtifactsDir(projectId: string): string {
  // Valide l'identifiant via projectWorkspacePath avant de construire le chemin.
  projectWorkspacePath(projectId);
  return path.resolve(workspaceRoot(), ".artifacts", projectId);
}

function artifactUrl(projectId: string, name: string): string {
  return `/api/projects/${projectId}/build/artifacts/${encodeURIComponent(name)}`;
}

export async function listBuildArtifacts(projectId: string): Promise<BuildArtifact[]> {
  const dir = buildArtifactsDir(projectId);
  let names: string[];
  try {
    names = await fs.readdir(dir);
  } catch {
    return [];
  }
  const artifacts: BuildArtifact[] = [];
  for (const name of names) {
    if (!/^[A-Za-z0-9][A-Za-z0-9._-]{0,120}$/.test(name)) continue;
    try {
      const stat = await fs.stat(path.join(dir, name));
      if (!stat.isFile()) continue;
      artifacts.push({
        name,
        bytes: stat.size,
        url: artifactUrl(projectId, name),
        createdAt: stat.mtime.toISOString(),
      });
    } catch {
      continue;
    }
  }
  return artifacts.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

async function zipDirectory(source: string, target: string): Promise<number> {
  await fs.mkdir(path.dirname(target), { recursive: true });
  return new Promise<number>((resolve, reject) => {
    const output = createWriteStream(target);
    const archive = archiver("zip", { zlib: { level: 9 } });
    output.on("close", () => resolve(archive.pointer()));
    output.on("error", reject);
    archive.on("warning", (error) => console.warn("[kolouble] build zip warning", error));
    archive.on("error", reject);
    archive.pipe(output);
    archive.directory(source, false);
    void archive.finalize();
  });
}

export async function runFlutterBuild(projectId: string, target: BuildTarget): Promise<BuildReport> {
  const startedAt = Date.now();
  const logs: string[] = [];
  const artifacts: BuildArtifact[] = [];
  const log = (message: string) => {
    logs.push(message.slice(0, 12_000));
  };

  const capability = await flutterCapability(true);
  if (!capability.available) {
    return {
      ok: false,
      target,
      logs,
      artifacts,
      durationMs: Date.now() - startedAt,
      error: capability.error ?? "Flutter indisponible.",
    };
  }
  log(capability.version ? `Flutter détecté : ${capability.version}` : "Flutter détecté.");

  const root = projectWorkspacePath(projectId);
  try {
    await fs.access(path.join(root, "pubspec.yaml"));
  } catch {
    return {
      ok: false,
      target,
      logs,
      artifacts,
      durationMs: Date.now() - startedAt,
      error: "Espace de travail introuvable. Lancez une génération avant de compiler.",
    };
  }
  const artifactsDir = buildArtifactsDir(projectId);
  await fs.mkdir(artifactsDir, { recursive: true });

  try {
    log("$ flutter pub get");
    const pubOutput = await runFlutter(["pub", "get"], root, PUB_GET_TIMEOUT_MS);
    if (pubOutput) log(pubOutput);

    if (target === "web" || target === "all") {
      log("$ flutter build web --release");
      const webOutput = await runFlutter(["build", "web", "--release"], root, env.buildTimeoutMs);
      if (webOutput) log(webOutput);
      const webDir = path.join(root, "build", "web");
      await fs.access(webDir);
      const zipPath = path.join(artifactsDir, "web.zip");
      const bytes = await zipDirectory(webDir, zipPath);
      log(`Archive web prête (${(bytes / 1024 / 1024).toFixed(2)} Mo).`);
      artifacts.push({
        name: "web.zip",
        bytes,
        url: artifactUrl(projectId, "web.zip"),
        createdAt: new Date().toISOString(),
      });
    }

    if (target === "apk" || target === "all") {
      const androidDir = path.join(root, "android");
      const hasAndroid = await fs
        .access(androidDir)
        .then(() => true)
        .catch(() => false);
      if (!hasAndroid) {
        log("$ flutter create --platforms=android .");
        const createOutput = await runFlutter(["create", "--platforms=android", "."], root, CREATE_TIMEOUT_MS);
        if (createOutput) log(createOutput);
      }
      log("$ flutter build apk --debug");
      const apkOutput = await runFlutter(["build", "apk", "--debug"], root, env.buildTimeoutMs);
      if (apkOutput) log(apkOutput);
      const apkPath = path.join(root, "build", "app", "outputs", "flutter-apk", "app-debug.apk");
      const stat = await fs.stat(apkPath);
      const destination = path.join(artifactsDir, "app-debug.apk");
      await fs.copyFile(apkPath, destination);
      log(`APK prêt (${(stat.size / 1024 / 1024).toFixed(2)} Mo).`);
      artifacts.push({
        name: "app-debug.apk",
        bytes: stat.size,
        url: artifactUrl(projectId, "app-debug.apk"),
        createdAt: new Date().toISOString(),
      });
    }

    return { ok: true, target, logs, artifacts, durationMs: Date.now() - startedAt };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Compilation échouée.";
    log(`Échec : ${message}`);
    return {
      ok: false,
      target,
      logs,
      artifacts,
      durationMs: Date.now() - startedAt,
      error: message.slice(-2_000),
    };
  }
}

export async function resolveArtifactPath(projectId: string, name: string): Promise<string> {
  if (!/^[A-Za-z0-9][A-Za-z0-9._-]{0,120}$/.test(name) || !/\.(zip|apk)$/i.test(name)) {
    throw new Error("Artefact inconnu.");
  }
  const dir = buildArtifactsDir(projectId);
  const resolved = path.resolve(dir, name);
  if (!resolved.startsWith(dir + path.sep)) {
    throw new Error("Nom d'artefact invalide.");
  }
  const stat = await fs.stat(resolved);
  if (!stat.isFile()) throw new Error("Artefact introuvable.");
  return resolved;
}
