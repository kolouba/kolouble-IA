import { beforeEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({
  user: { id: "user-1", email: "owner@exemple.ci", name: "Owner" } as
    | { id: string; email: string; name: string }
    | null,
}));

const prismaMock = vi.hoisted(() => ({
  project: {
    findMany: vi.fn(),
    create: vi.fn(),
    findFirst: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
}));

vi.mock("@/auth", () => ({
  auth: vi.fn(async () => (state.user ? { user: state.user, expires: "2099-01-01" } : null)),
}));

vi.mock("@/lib/db", () => ({ prisma: prismaMock }));

import { GET, POST } from "@/app/api/projects/route";

function request(path = "http://localhost:3000/api/projects", init?: RequestInit): Request {
  return new Request(path, init);
}

beforeEach(() => {
  state.user = { id: "user-1", email: "owner@exemple.ci", name: "Owner" };
  prismaMock.project.findMany.mockReset();
  prismaMock.project.create.mockReset();
  prismaMock.project.findFirst.mockReset();
  prismaMock.project.update.mockReset();
  prismaMock.project.delete.mockReset();
});

describe("GET /api/projects", () => {
  it("refuse les requêtes non authentifiées", async () => {
    state.user = null;
    const response = await GET(request());
    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toMatchObject({ code: "unauthorized" });
  });

  it("retourne la liste des projets du propriétaire", async () => {
    prismaMock.project.findMany.mockResolvedValue([
      {
        id: "project1234567890",
        name: "Projets OBC",
        status: "ready",
        _count: { files: 42, generations: 3 },
      },
    ]);
    const response = await GET(request("http://localhost:3000/api/projects?limit=10"));
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.projects).toHaveLength(1);
    expect(prismaMock.project.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { ownerId: "user-1" },
        take: 10,
      }),
    );
    expect(response.headers.get("cache-control")).toContain("no-store");
  });

  it("rejette une limite invalide", async () => {
    const response = await GET(request("http://localhost:3000/api/projects?limit=0"));
    expect(response.status).toBe(400);
    expect(prismaMock.project.findMany).not.toHaveBeenCalled();
  });

  it("renvoie 500 sans fuite d'information", async () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => undefined);
    prismaMock.project.findMany.mockRejectedValue(new Error("SQLITE_BUSY"));
    const response = await GET(request());
    expect(response.status).toBe(500);
    const body = await response.json();
    expect(body.error).not.toContain("SQLITE_BUSY");
    expect(spy).toHaveBeenCalled();
  });
});

describe("POST /api/projects", () => {
  const payload = {
    prompt: "Crée une application de gestion de projets avec un mode hors ligne et une synchronisation cloud",
    name: "Terrain OBC",
    model: "qwen2.5-coder:7b",
    mode: "standard",
  };

  it("crée un projet et une spécification", async () => {
    prismaMock.project.create.mockImplementation(async ({ data }: { data: Record<string, unknown> }) => ({
      id: "project1234567890",
      name: data.name,
      description: data.description,
      status: "draft",
      prompt: data.prompt,
      model: data.model,
      mode: data.mode,
      stack: "flutter-supabase",
      autoNamed: data.autoNamed,
      createdAt: new Date(),
      updatedAt: new Date(),
    }));

    const response = await POST(
      request("http://localhost:3000/api/projects", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      }),
    );
    expect(response.status).toBe(201);
    const body = await response.json();
    expect(body.project.name).toBe("Terrain OBC");
    expect(body.spec.entities.map((entity: { key: string }) => entity.key)).toContain("projects");
    const created = prismaMock.project.create.mock.calls[0]![0].data;
    expect(created.ownerId).toBe("user-1");
    expect(created.autoNamed).toBe(false);
    expect(JSON.parse(created.spec).packageName).toBeTruthy();
  });

  it("enregistre les préférences GitHub et domaine à la création", async () => {
    prismaMock.project.create.mockImplementation(async ({ data }: { data: Record<string, unknown> }) => ({
      id: "project1234567890",
      name: data.name,
      description: data.description,
      status: "draft",
      prompt: data.prompt,
      model: data.model,
      mode: data.mode,
      stack: "flutter-supabase",
      autoNamed: data.autoNamed,
      createdAt: new Date(),
      updatedAt: new Date(),
    }));

    const response = await POST(
      request("http://localhost:3000/api/projects", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          ...payload,
          deployment: {
            target: "github-pages",
            repoName: "Suivi Terrain",
            customDomain: "App.Exemple.CI",
            repositoryUrl: "https://github.com/obc/suivi-terrain",
          },
        }),
      }),
    );
    expect(response.status).toBe(201);
    const created = prismaMock.project.create.mock.calls[0]![0].data;
    expect(created.deployment.create).toMatchObject({
      target: "github-pages",
      repoName: "suivi-terrain",
      customDomain: "app.exemple.ci",
      repositoryUrl: "https://github.com/obc/suivi-terrain",
    });
    expect(JSON.parse(created.spec).deployment).toEqual({
      target: "github-pages",
      repoName: "suivi-terrain",
      customDomain: "app.exemple.ci",
    });
  });

  it("refuse une description invalide", async () => {
    const response = await POST(
      request("http://localhost:3000/api/projects", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ prompt: "court" }),
      }),
    );
    expect(response.status).toBe(400);
    expect(prismaMock.project.create).not.toHaveBeenCalled();
  });

  it("refuse une requête cross-origin", async () => {
    const response = await POST(
      request("http://localhost:3000/api/projects", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          origin: "https://evil.example",
          host: "localhost:3000",
        },
        body: JSON.stringify(payload),
      }),
    );
    expect(response.status).toBe(403);
  });

  it("convertit une collision Prisma en 409", async () => {
    prismaMock.project.create.mockRejectedValue({ code: "P2002" });
    const response = await POST(
      request("http://localhost:3000/api/projects", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      }),
    );
    expect(response.status).toBe(409);
    await expect(response.json()).resolves.toMatchObject({ code: "project_conflict" });
  });

  it("convertit un propriétaire manquant en 409", async () => {
    prismaMock.project.create.mockRejectedValue({ code: "P2025" });
    const response = await POST(
      request("http://localhost:3000/api/projects", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      }),
    );
    expect(response.status).toBe(409);
    await expect(response.json()).resolves.toMatchObject({ code: "owner_missing" });
  });
});
