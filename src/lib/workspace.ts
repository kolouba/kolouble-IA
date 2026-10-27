import { promises as fs } from "node:fs";
import path from "node:path";
import { env } from "@/lib/env";
import { normalizeProjectPath } from "@/lib/path-safety";
import type { GeneratedFile } from "@/lib/generator/types";

const PROJECT_ID_PATTERN = /^[a-z0-9]{10,40}$/i;

function assertProjectId(projectId: string): string {
  if (!PROJECT_ID_PATTERN.test(projectId)) {
    throw new Error("Identifiant de projet invalide pour l'espace de travail.");
  }
  return projectId;
}

export function workspaceRoot(): string {
  return path.resolve(process.cwd(), env.workspaceRoot);
}

export function projectWorkspacePath(projectId: string): string {
  return path.join(workspaceRoot(), assertProjectId(projectId));
}

async function ensureRealDirectory(dir: string): Promise<void> {
  await fs.mkdir(dir, { recursive: true });
  const stat = await fs.lstat(dir);
  if (!stat.isDirectory() || stat.isSymbolicLink()) {
    throw new Error("Le dossier d'espace de travail est compromis.");
  }
}

async function writeAtomic(target: string, content: string): Promise<boolean> {
  try {
    const existing = await fs.readFile(target, "utf8");
    if (existing === content) return false;
  } catch {
    // fichier absent ou illisible : on le réécrit
  }
  await fs.mkdir(path.dirname(target), { recursive: true });
  const temporary = `${target}.${process.pid}.${Date.now()}.tmp`;
  await fs.writeFile(temporary, content, "utf8");
  await fs.rename(temporary, target);
  return true;
}

async function listFiles(dir: string, base = dir): Promise<string[]> {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const files: string[] = [];
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isSymbolicLink()) continue;
    if (entry.isDirectory()) {
      files.push(...(await listFiles(full, base)));
    } else if (entry.isFile()) {
      files.push(path.relative(base, full).split(path.sep).join("/"));
    }
  }
  return files;
}

export interface MirrorResult {
  written: number;
  unchanged: number;
  removed: number;
  root: string;
}

export async function mirrorProjectWorkspace(projectId: string, files: GeneratedFile[]): Promise<MirrorResult> {
  const root = projectWorkspacePath(projectId);
  await ensureRealDirectory(root);
  const wanted = new Map<string, GeneratedFile>();
  for (const file of files) {
    wanted.set(normalizeProjectPath(file.path), file);
  }

  let written = 0;
  let unchanged = 0;
  for (const [relative, file] of wanted) {
    const absolute = path.resolve(root, ...relative.split("/"));
    if (!absolute.startsWith(root + path.sep)) {
      throw new Error(`Chemin hors espace de travail refusé : ${relative}`);
    }
    const changed = await writeAtomic(absolute, file.content);
    if (changed) written += 1;
    else unchanged += 1;
  }

  let removed = 0;
  for (const relative of await listFiles(root)) {
    if (wanted.has(relative)) continue;
    try {
      normalizeProjectPath(relative);
    } catch {
      continue;
    }
    await fs.unlink(path.join(root, ...relative.split("/"))).then(() => {
      removed += 1;
    }).catch(() => undefined);
  }

  await pruneEmptyDirectories(root);
  return { written, unchanged, removed, root };
}

async function pruneEmptyDirectories(root: string): Promise<void> {
  const walk = async (dir: string): Promise<boolean> => {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    let empty = true;
    for (const entry of entries) {
      if (entry.isDirectory() && !entry.isSymbolicLink()) {
        const childEmpty = await walk(path.join(dir, entry.name));
        if (!childEmpty) empty = false;
      } else {
        empty = false;
      }
    }
    if (empty && dir !== root) {
      await fs.rmdir(dir).catch(() => undefined);
      return true;
    }
    return empty;
  };
  await walk(root).catch(() => undefined);
}

export async function removeProjectWorkspace(projectId: string): Promise<void> {
  const root = projectWorkspacePath(projectId);
  if (!root.startsWith(workspaceRoot() + path.sep)) return;
  await fs.rm(root, { recursive: true, force: true });
}

export async function workspaceStatus(): Promise<{
  root: string;
  available: boolean;
  projects: number;
  disabledOnVercel: boolean;
}> {
  if (env.isVercel) {
    return { root: workspaceRoot(), available: false, projects: 0, disabledOnVercel: true };
  }
  try {
    await fs.mkdir(workspaceRoot(), { recursive: true });
    const entries = await fs.readdir(workspaceRoot(), { withFileTypes: true });
    return {
      root: workspaceRoot(),
      available: true,
      projects: entries.filter((entry) => entry.isDirectory()).length,
      disabledOnVercel: false,
    };
  } catch {
    return { root: workspaceRoot(), available: false, projects: 0, disabledOnVercel: false };
  }
}
