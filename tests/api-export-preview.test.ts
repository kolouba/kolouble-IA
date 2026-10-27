import { beforeEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({
  user: { id: "user-1", email: "owner@exemple.ci", name: "Owner" } as
    | { id: string; email: string; name: string }
    | null,
}));

const prismaMock = vi.hoisted(() => ({
  project: {
    findFirst: vi.fn(),
    update: vi.fn(),
  },
  projectFile: {
    findMany: vi.fn(),
    findUnique: vi.fn(),
  },
}));

vi.mock("@/auth", () => ({
  auth: vi.fn(async () => (state.user ? { user: state.user, expires: "2099-01-01" } : null)),
}));
vi.mock("@/lib/db", () => ({ prisma: prismaMock }));

import { GET as exportProject } from "@/app/api/projects/[id]/export/route";
import { GET as previewProject } from "@/app/api/preview/[id]/route";

const projectId = "project1234567890";
const ownedProject = { id: projectId, name: "Terrain OBC", ownerId: "user-1", prompt: "projet" };

function context() {
  return { params: Promise.resolve({ id: projectId }) };
}

beforeEach(() => {
  state.user = { id: "user-1", email: "owner@exemple.ci", name: "Owner" };
  prismaMock.project.findFirst.mockReset();
  prismaMock.project.update.mockReset();
  prismaMock.project.update.mockResolvedValue({});
  prismaMock.projectFile.findMany.mockReset();
  prismaMock.projectFile.findUnique.mockReset();
});

describe("GET /api/projects/[id]/export", () => {
  it("refuse les visiteurs non authentifiés", async () => {
    state.user = null;
    const response = await exportProject(new Request("http://localhost:3000/api/export"), context());
    expect(response.status).toBe(401);
  });

  it("renvoie 409 sans fichiers", async () => {
    prismaMock.project.findFirst.mockResolvedValueOnce(ownedProject);
    prismaMock.projectFile.findMany.mockResolvedValue([]);
    const response = await exportProject(new Request("http://localhost:3000/api/export"), context());
    expect(response.status).toBe(409);
  });

  it("streame une archive ZIP avec un nom de fichier sûr", async () => {
    prismaMock.project.findFirst.mockResolvedValueOnce(ownedProject);
    prismaMock.projectFile.findMany.mockResolvedValue([
      { path: "lib/main.dart", content: "void main() {}" },
      { path: "README.md", content: "# Projet" },
    ]);
    const response = await exportProject(new Request("http://localhost:3000/api/export"), context());
    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toBe("application/zip");
    expect(response.headers.get("content-disposition")).toContain("terrain-obc.zip");
    const bytes = new Uint8Array(await response.arrayBuffer());
    expect(bytes.length).toBeGreaterThan(100);
    expect(String.fromCharCode(bytes[0]!, bytes[1]!)).toBe("PK");
  });
});

describe("GET /api/preview/[id]", () => {
  it("sert le prototype avec une CSP sandboxée", async () => {
    prismaMock.project.findFirst.mockResolvedValueOnce(ownedProject);
    prismaMock.projectFile.findUnique.mockResolvedValue({
      content: "<!doctype html><html><body><div data-view='dashboard'></div></body></html>",
    });
    const response = await previewProject(new Request("http://localhost:3000/api/preview/x"), context());
    expect(response.status).toBe(200);
    const csp = response.headers.get("content-security-policy") ?? "";
    expect(csp).toContain("sandbox allow-scripts");
    expect(csp).toContain("connect-src 'none'");
    expect(csp).toContain("frame-src 'none'");
    expect(response.headers.get("cache-control")).toBe("no-store");
    await expect(response.text()).resolves.toContain("data-view='dashboard'");
  });

  it("renvoie un écran 404 sûr quand le prototype est absent", async () => {
    prismaMock.project.findFirst.mockResolvedValueOnce(ownedProject);
    prismaMock.projectFile.findUnique.mockResolvedValue(null);
    const response = await previewProject(new Request("http://localhost:3000/api/preview/x"), context());
    expect(response.status).toBe(404);
    expect(response.headers.get("content-security-policy")).toContain("sandbox allow-scripts");
    await expect(response.text()).resolves.toContain("Prototype non généré");
  });

  it("refuse les visiteurs non authentifiés", async () => {
    state.user = null;
    const response = await previewProject(new Request("http://localhost:3000/api/preview/x"), context());
    expect(response.status).toBe(401);
  });
});
