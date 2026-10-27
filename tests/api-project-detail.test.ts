import { beforeEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({
  user: { id: "user-1", email: "owner@exemple.ci", name: "Owner" } as
    | { id: string; email: string; name: string }
    | null,
}));

const prismaMock = vi.hoisted(() => ({
  project: {
    findFirst: vi.fn(),
    delete: vi.fn(),
  },
}));

const workspaceMock = vi.hoisted(() => ({
  removeProjectWorkspace: vi.fn(async () => ({ removed: true, root: "workspace/project" })),
}));

vi.mock("@/auth", () => ({
  auth: vi.fn(async () => (state.user ? { user: state.user, expires: "2099-01-01" } : null)),
}));
vi.mock("@/lib/db", () => ({ prisma: prismaMock }));
vi.mock("@/lib/workspace", () => workspaceMock);

import { DELETE, GET } from "@/app/api/projects/[id]/route";

function context(id: string) {
  return { params: Promise.resolve({ id }) };
}

const projectId = "project1234567890";
const ownedProject = {
  id: projectId,
  name: "Terrain OBC",
  ownerId: "user-1",
  spec: JSON.stringify({ appName: "Terrain OBC", entities: [], platforms: ["Web"] }),
};

beforeEach(() => {
  state.user = { id: "user-1", email: "owner@exemple.ci", name: "Owner" };
  prismaMock.project.findFirst.mockReset();
  prismaMock.project.delete.mockReset();
  workspaceMock.removeProjectWorkspace.mockClear();
});

describe("GET /api/projects/[id]", () => {
  it("refuse les visiteurs non authentifiés", async () => {
    state.user = null;
    const response = await GET(new Request("http://localhost:3000/api/projects/x"), context(projectId));
    expect(response.status).toBe(401);
  });

  it("renvoie 404 pour un identifiant invalide", async () => {
    const response = await GET(new Request("http://localhost:3000/api/projects/x"), context("abc"));
    expect(response.status).toBe(404);
    expect(prismaMock.project.findFirst).not.toHaveBeenCalled();
  });

  it("renvoie 404 si le projet n'appartient pas à l'utilisateur", async () => {
    prismaMock.project.findFirst.mockResolvedValueOnce(null);
    const response = await GET(new Request("http://localhost:3000/api/projects/x"), context(projectId));
    expect(response.status).toBe(404);
  });

  it("sérialise le projet, ses fichiers et son historique", async () => {
    prismaMock.project.findFirst
      .mockResolvedValueOnce(ownedProject)
      .mockResolvedValueOnce({
        ...ownedProject,
        files: [
          { path: "lib/main.dart", bytes: 120, language: "dart", source: "scaffold", updatedAt: new Date() },
          { path: "README.md", bytes: 80, language: "markdown", source: "ai", updatedAt: new Date() },
        ],
        generations: [{ id: "gen-1", steps: [] }],
      });
    const response = await GET(new Request("http://localhost:3000/api/projects/x"), context(projectId));
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.project.fileCount).toBe(2);
    expect(body.project.totalBytes).toBe(200);
    expect(body.project.spec.appName).toBe("Terrain OBC");
    expect(body.files).toHaveLength(2);
    expect(body.generations).toHaveLength(1);
  });

  it("tolère une spécification corrompue", async () => {
    prismaMock.project.findFirst
      .mockResolvedValueOnce(ownedProject)
      .mockResolvedValueOnce({ ...ownedProject, spec: "{invalide", files: [], generations: [] });
    const response = await GET(new Request("http://localhost:3000/api/projects/x"), context(projectId));
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.project.spec).toBeNull();
  });
});

describe("DELETE /api/projects/[id]", () => {
  it("supprime un projet et son workspace", async () => {
    prismaMock.project.findFirst.mockResolvedValueOnce(ownedProject);
    prismaMock.project.delete.mockResolvedValue(ownedProject);
    const response = await DELETE(new Request("http://localhost:3000/api/projects/x", { method: "DELETE" }), context(projectId));
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({ deleted: true, id: projectId });
    expect(workspaceMock.removeProjectWorkspace).toHaveBeenCalledWith(projectId);
  });

  it("retourne 404 si Prisma ne trouve plus le projet", async () => {
    prismaMock.project.findFirst.mockResolvedValueOnce(ownedProject);
    prismaMock.project.delete.mockRejectedValue({ code: "P2025" });
    const response = await DELETE(new Request("http://localhost:3000/api/projects/x", { method: "DELETE" }), context(projectId));
    expect(response.status).toBe(404);
  });
});
