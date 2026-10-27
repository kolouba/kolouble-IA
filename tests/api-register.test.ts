import { beforeEach, describe, expect, it, vi } from "vitest";

const prismaMock = vi.hoisted(() => ({
  user: {
    findUnique: vi.fn(),
    create: vi.fn(),
  },
}));

vi.mock("@/lib/db", () => ({ prisma: prismaMock }));

import { POST } from "@/app/api/register/route";

function registerRequest(body: unknown, headers: Record<string, string> = {}): Request {
  return new Request("http://localhost:3000/api/register", {
    method: "POST",
    headers: { "content-type": "application/json", ...headers },
    body: JSON.stringify(body),
  });
}

const validPayload = {
  name: "Aminata Koné",
  email: "aminata@exemple.ci",
  password: "Terrain2026",
};

beforeEach(() => {
  prismaMock.user.findUnique.mockReset();
  prismaMock.user.create.mockReset();
});

describe("POST /api/register", () => {
  it("crée un compte avec un mot de passe haché", async () => {
    prismaMock.user.findUnique.mockResolvedValue(null);
    prismaMock.user.create.mockResolvedValue({
      id: "user-1",
      email: validPayload.email,
      name: validPayload.name,
      createdAt: new Date(),
    });

    const response = await POST(registerRequest(validPayload));
    expect(response.status).toBe(201);
    const body = await response.json();
    expect(body.user.email).toBe(validPayload.email);
    const createArgs = prismaMock.user.create.mock.calls[0]![0].data;
    expect(createArgs.passwordHash).not.toBe(validPayload.password);
    expect(createArgs.passwordHash).toMatch(/^\$2[aby]\$/);
  });

  it("refuse un e-mail déjà utilisé", async () => {
    prismaMock.user.findUnique.mockResolvedValue({ id: "user-1" });
    const response = await POST(registerRequest(validPayload));
    expect(response.status).toBe(409);
    await expect(response.json()).resolves.toMatchObject({ code: "email_taken" });
    expect(prismaMock.user.create).not.toHaveBeenCalled();
  });

  it("gère une collision concurrente", async () => {
    prismaMock.user.findUnique.mockResolvedValue(null);
    prismaMock.user.create.mockRejectedValue({ code: "P2002" });
    const response = await POST(registerRequest(validPayload));
    expect(response.status).toBe(409);
  });

  it("valide le corps de la requête", async () => {
    const response = await POST(
      registerRequest({ name: "A", email: "invalide", password: "1234" }),
    );
    expect(response.status).toBe(400);
    expect(prismaMock.user.findUnique).not.toHaveBeenCalled();
  });

  it("refuse les requêtes cross-origin", async () => {
    const response = await POST(
      registerRequest(validPayload, { origin: "https://evil.example", host: "localhost:3000" }),
    );
    expect(response.status).toBe(403);
  });

  it("limite les inscriptions abusives", async () => {
    prismaMock.user.findUnique.mockResolvedValue(null);
    prismaMock.user.create.mockResolvedValue({
      id: "user-1",
      email: validPayload.email,
      name: validPayload.name,
      createdAt: new Date(),
    });
    for (let index = 0; index < 5; index += 1) {
      const response = await POST(
        registerRequest({ ...validPayload, email: `test${index}@exemple.ci` }),
      );
      expect(response.status).toBe(201);
    }
    const blocked = await POST(registerRequest({ ...validPayload, email: "autre@exemple.ci" }));
    expect(blocked.status).toBe(429);
  }, 20000);
});
