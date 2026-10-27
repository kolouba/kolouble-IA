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
  deployment: {
    findUnique: vi.fn(),
    upsert: vi.fn(),
    update: vi.fn(),
  },
}));

vi.mock("@/auth", () => ({
  auth: vi.fn(async () => (state.user ? { user: state.user, expires: "2099-01-01" } : null)),
}));

vi.mock("@/lib/db", () => ({ prisma: prismaMock }));

import { GET, PUT } from "@/app/api/projects/[id]/deployment/route";
import { POST as CHECK } from "@/app/api/projects/[id]/deployment/check/route";
import { resetRateLimitsForTests } from "@/lib/rate-limit";

const PROJECT_ID = "project1234567890";
const SPEC = JSON.stringify({
  packageName: "terrain_obc",
  appName: "Terrain OBC",
  deployment: { target: "vercel", repoName: "terrain-obc", customDomain: null },
});

function context(id = PROJECT_ID) {
  return { params: Promise.resolve({ id }) };
}

function request(init?: RequestInit): Request {
  return new Request(`http://localhost:3000/api/projects/${PROJECT_ID}/deployment`, init);
}

function put(body: unknown, headers: Record<string, string> = {}): Request {
  return request({
    method: "PUT",
    headers: { "content-type": "application/json", ...headers },
    body: JSON.stringify(body),
  });
}

function row(overrides: Record<string, unknown> = {}) {
  return {
    projectId: PROJECT_ID,
    target: "vercel",
    repoName: "terrain-obc",
    repositoryUrl: null,
    customDomain: null,
    productionUrl: null,
    status: "planned",
    checkMessage: null,
    lastCheckAt: null,
    ...overrides,
  };
}

beforeEach(() => {
  state.user = { id: "user-1", email: "owner@exemple.ci", name: "Owner" };
  resetRateLimitsForTests();
  prismaMock.project.findFirst.mockReset();
  prismaMock.project.update.mockReset();
  prismaMock.deployment.findUnique.mockReset();
  prismaMock.deployment.upsert.mockReset();
  prismaMock.deployment.update.mockReset();
  prismaMock.project.findFirst.mockResolvedValue({ id: PROJECT_ID, name: "Terrain OBC", spec: SPEC });
});

describe("GET /api/projects/[id]/deployment", () => {
  it("refuse les requêtes non authentifiées", async () => {
    state.user = null;
    const response = await GET(request(), context());
    expect(response.status).toBe(401);
  });

  it("retourne les préférences enregistrées", async () => {
    prismaMock.deployment.findUnique.mockResolvedValue(
      row({
        target: "github-pages",
        repositoryUrl: "https://github.com/obc/terrain",
        customDomain: "app.exemple.ci",
        productionUrl: "https://app.exemple.ci",
        status: "live",
        checkMessage: "HTTP 200",
        lastCheckAt: new Date("2026-10-27T08:00:00.000Z"),
      }),
    );
    const response = await GET(request(), context());
    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toContain("no-store");
    await expect(response.json()).resolves.toMatchObject({
      deployment: {
        target: "github-pages",
        repoName: "terrain-obc",
        customDomain: "app.exemple.ci",
        status: "live",
        lastCheckAt: "2026-10-27T08:00:00.000Z",
      },
    });
  });

  it("déduit les valeurs par défaut depuis la spécification", async () => {
    prismaMock.deployment.findUnique.mockResolvedValue(null);
    prismaMock.project.findFirst.mockResolvedValue({
      id: PROJECT_ID,
      name: "Terrain OBC",
      spec: JSON.stringify({ packageName: "suivi_terrain", deployment: { target: "netlify", repoName: "suivi-terrain" } }),
    });
    const response = await GET(request(), context());
    const body = await response.json();
    expect(body.deployment).toMatchObject({
      target: "netlify",
      repoName: "suivi-terrain",
      status: "planned",
    });
  });

  it("renvoie 404 pour un identifiant de projet invalide", async () => {
    const response = await GET(request(), context("../secret"));
    expect(response.status).toBe(404);
    expect(prismaMock.project.findFirst).not.toHaveBeenCalled();
  });
});

describe("PUT /api/projects/[id]/deployment", () => {
  it("enregistre la cible, le dépôt et le domaine", async () => {
    prismaMock.deployment.findUnique.mockResolvedValue(null);
    prismaMock.deployment.upsert.mockResolvedValue(
      row({
        target: "netlify",
        repoName: "gestion-projets",
        repositoryUrl: "https://github.com/obc/gestion-projets",
        customDomain: "app.exemple.ci",
        productionUrl: "https://app.exemple.ci",
      }),
    );

    const response = await PUT(
      put({
        target: "netlify",
        repoName: "Gestion-Projets",
        repositoryUrl: "https://github.com/obc/gestion-projets.git",
        customDomain: "App.Exemple.CI",
        productionUrl: "https://app.exemple.ci/",
      }),
      context(),
    );

    expect(response.status).toBe(200);
    const saved = prismaMock.deployment.upsert.mock.calls[0]![0];
    expect(saved.create).toMatchObject({
      projectId: PROJECT_ID,
      target: "netlify",
      repoName: "gestion-projets",
      repositoryUrl: "https://github.com/obc/gestion-projets",
      customDomain: "app.exemple.ci",
      productionUrl: "https://app.exemple.ci",
      status: "planned",
    });

    const spec = JSON.parse(prismaMock.project.update.mock.calls[0]![0].data.spec);
    expect(spec.packageName).toBe("terrain_obc");
    expect(spec.deployment).toEqual({
      target: "netlify",
      repoName: "gestion-projets",
      customDomain: "app.exemple.ci",
    });
  });

  it("réinitialise la vérification quand le domaine change", async () => {
    prismaMock.deployment.findUnique.mockResolvedValue(
      row({
        target: "vercel",
        customDomain: "ancien.exemple.ci",
        status: "live",
        checkMessage: "HTTP 200",
        lastCheckAt: new Date("2026-10-26T10:00:00.000Z"),
      }),
    );
    prismaMock.deployment.upsert.mockResolvedValue(row({ customDomain: "nouveau.exemple.ci" }));

    const response = await PUT(put({ customDomain: "nouveau.exemple.ci" }), context());
    expect(response.status).toBe(200);
    const update = prismaMock.deployment.upsert.mock.calls[0]![0].update;
    expect(update).toMatchObject({
      target: "vercel",
      customDomain: "nouveau.exemple.ci",
      status: "planned",
      checkMessage: null,
      lastCheckAt: null,
    });
  });

  it("refuse un domaine invalide", async () => {
    const response = await PUT(put({ customDomain: "localhost" }), context());
    expect(response.status).toBe(400);
    expect(prismaMock.deployment.upsert).not.toHaveBeenCalled();
  });

  it("refuse une requête cross-origin", async () => {
    const response = await PUT(
      put({ target: "vercel" }, { origin: "https://evil.example", host: "localhost:3000" }),
      context(),
    );
    expect(response.status).toBe(403);
    expect(prismaMock.deployment.upsert).not.toHaveBeenCalled();
  });

  it("refuse les utilisateurs non authentifiés", async () => {
    state.user = null;
    const response = await PUT(put({ target: "vercel" }), context());
    expect(response.status).toBe(401);
  });
});

describe("POST /api/projects/[id]/deployment/check", () => {
  it("exige une URL ou un domaine enregistré", async () => {
    prismaMock.deployment.findUnique.mockResolvedValue(null);
    const response = await CHECK(request({ method: "POST" }), context());
    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({ code: "deployment_missing_url" });
  });

  it("refuse un domaine local sans effectuer de requête", async () => {
    prismaMock.deployment.findUnique.mockResolvedValue(row({ customDomain: "localhost" }));
    prismaMock.deployment.update.mockResolvedValue(
      row({ customDomain: "localhost", status: "error", checkMessage: "Les domaines locaux ne peuvent pas être vérifiés." }),
    );
    const fetchSpy = vi.spyOn(globalThis, "fetch");

    const response = await CHECK(request({ method: "POST" }), context());
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.check.ok).toBe(false);
    expect(body.check.message).toContain("domaines locaux");
    expect(fetchSpy).not.toHaveBeenCalled();
    expect(prismaMock.deployment.update.mock.calls[0]![0].data).toMatchObject({ status: "error" });
    fetchSpy.mockRestore();
  });

  it("refuse les URL non HTTPS", async () => {
    prismaMock.deployment.findUnique.mockResolvedValue(row({ productionUrl: "http://app.exemple.ci" }));
    const response = await CHECK(request({ method: "POST" }), context());
    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({ code: "deployment_insecure_url" });
  });

  it("refuse les ports non standard", async () => {
    prismaMock.deployment.findUnique.mockResolvedValue(row({ productionUrl: "https://app.exemple.ci:8443" }));
    const response = await CHECK(request({ method: "POST" }), context());
    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({ code: "deployment_invalid_port" });
  });
});

