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
    findUnique: vi.fn(),
    findMany: vi.fn(),
    upsert: vi.fn(),
  },
}));

vi.mock("@/auth", () => ({
  auth: vi.fn(async () => (state.user ? { user: state.user, expires: "2099-01-01" } : null)),
}));
vi.mock("@/lib/db", () => ({ prisma: prismaMock }));

import { GET, PUT } from "@/app/api/projects/[id]/files/[...path]/route";

const projectId = "project1234567890";
const ownedProject = { id: projectId, name: "Terrain", ownerId: "user-1" };

function context(path: string[]) {
  return { params: Promise.resolve({ id: projectId, path }) };
}

beforeEach(() => {
  state.user = { id: "user-1", email: "owner@exemple.ci", name: "Owner" };
  prismaMock.project.findFirst.mockReset();
  prismaMock.project.update.mockReset();
  prismaMock.projectFile.findUnique.mockReset();
  prismaMock.projectFile.findMany.mockReset();
  prismaMock.projectFile.upsert.mockReset();
});

describe("GET /api/projects/[id]/files/[...path]", () => {
  it("refuse les visiteurs non authentifiés", async () => {
    state.user = null;
    const response = await GET(new Request("http://localhost:3000/api"), context(["lib", "main.dart"]));
    expect(response.status).toBe(401);
  });

  it("refuse une traversée de dossier", async () => {
    prismaMock.project.findFirst.mockResolvedValueOnce(ownedProject);
    const response = await GET(new Request("http://localhost:3000/api"), context(["..", "secret.env"]));
    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({ code: "unsafe_path" });
  });

  it("refuse les extensions non autorisées", async () => {
    prismaMock.project.findFirst.mockResolvedValueOnce(ownedProject);
    const response = await GET(new Request("http://localhost:3000/api"), context(["bin", "payload.exe"]));
    expect(response.status).toBe(400);
  });

  it("retourne 404 si le fichier est absent", async () => {
    prismaMock.project.findFirst.mockResolvedValueOnce(ownedProject);
    prismaMock.projectFile.findUnique.mockResolvedValue(null);
    const response = await GET(new Request("http://localhost:3000/api"), context(["lib", "main.dart"]));
    expect(response.status).toBe(404);
  });

  it("retourne le fichier demandé", async () => {
    prismaMock.project.findFirst.mockResolvedValueOnce(ownedProject);
    prismaMock.projectFile.findUnique.mockResolvedValue({
      path: "lib/main.dart",
      content: "void main() {}",
      language: "dart",
      bytes: 14,
      source: "scaffold",
      updatedAt: new Date(),
    });
    const response = await GET(new Request("http://localhost:3000/api"), context(["lib", "main.dart"]));
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.file.path).toBe("lib/main.dart");
    expect(prismaMock.projectFile.findUnique).toHaveBeenCalledWith({
      where: { projectId_path: { projectId, path: "lib/main.dart" } },
      select: expect.any(Object),
    });
  });
});

describe("PUT /api/projects/[id]/files/[...path]", () => {
  function putRequest(content: string, headers: Record<string, string> = {}): Request {
    return new Request("http://localhost:3000/api/projects/x/files/lib/main.dart", {
      method: "PUT",
      headers: { "content-type": "application/json", ...headers },
      body: JSON.stringify({ content }),
    });
  }

  it("enregistre une modification utilisateur", async () => {
    prismaMock.project.findFirst.mockResolvedValueOnce(ownedProject);
    prismaMock.projectFile.upsert.mockResolvedValue({
      path: "lib/main.dart",
      language: "dart",
      bytes: 20,
      source: "user",
      updatedAt: new Date(),
    });
    const response = await PUT(putRequest("void main() { runApp(); }"), context(["lib", "main.dart"]));
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.file.source).toBe("user");
    const args = prismaMock.projectFile.upsert.mock.calls[0]![0];
    expect(args.update.source).toBe("user");
    expect(args.update.bytes).toBe(Buffer.byteLength("void main() { runApp(); }", "utf8"));
    expect(prismaMock.project.update).toHaveBeenCalled();
  });

  it("refuse les requêtes cross-origin", async () => {
    prismaMock.project.findFirst.mockResolvedValueOnce(ownedProject);
    const response = await PUT(
      putRequest("void main() {}", { origin: "https://evil.example", host: "localhost:3000" }),
      context(["lib", "main.dart"]),
    );
    expect(response.status).toBe(403);
    expect(prismaMock.projectFile.upsert).not.toHaveBeenCalled();
  });

  it("refuse un contenu trop volumineux", async () => {
    prismaMock.project.findFirst.mockResolvedValueOnce(ownedProject);
    const response = await PUT(putRequest("x".repeat(600_001)), context(["lib", "main.dart"]));
    expect(response.status).toBe(400);
  });

  it("refuse les chemins interdits", async () => {
    prismaMock.project.findFirst.mockResolvedValueOnce(ownedProject);
    const response = await PUT(putRequest("contenu"), context([".env"]));
    expect(response.status).toBe(400);
    expect(prismaMock.projectFile.upsert).not.toHaveBeenCalled();
  });
});
