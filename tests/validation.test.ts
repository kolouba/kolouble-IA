import { describe, expect, it } from "vitest";
import {
  createProjectSchema,
  enhanceSchema,
  fileUpdateSchema,
  generateSchema,
  modelSchema,
  projectListQuerySchema,
  registerSchema,
} from "@/lib/validation";

describe("schemas de projet", () => {
  it("valide une description suffisante", () => {
    const parsed = createProjectSchema.safeParse({
      prompt: "Créer une application de gestion de projets pour une ONG",
      name: "OBC Terrain",
      model: "qwen2.5-coder:7b",
      mode: "max",
    });
    expect(parsed.success).toBe(true);
  });

  it("refuse une description trop courte ou trop longue", () => {
    expect(createProjectSchema.safeParse({ prompt: "trop court" }).success).toBe(false);
    expect(createProjectSchema.safeParse({ prompt: "a".repeat(4001) }).success).toBe(false);
  });

  it("nettoie les espaces et le nom", () => {
    const parsed = createProjectSchema.parse({
      prompt: "  Créer une application de suivi terrain complète  ",
      name: "  Mon Projet  ",
    });
    expect(parsed.prompt).toBe("Créer une application de suivi terrain complète");
    expect(parsed.name).toBe("Mon Projet");
  });

  it("valide les noms de modèles Ollama", () => {
    expect(modelSchema.safeParse("deepseek-coder:latest").success).toBe(true);
    expect(modelSchema.safeParse("qwen2.5-coder:14b").success).toBe(true);
    expect(modelSchema.safeParse("../../etc/passwd").success).toBe(false);
    expect(modelSchema.safeParse("--rm").success).toBe(false);
    expect(modelSchema.safeParse("modèle avec espaces").success).toBe(false);
  });

  it("accepte les options de génération", () => {
    expect(generateSchema.parse({})).toEqual({});
    expect(generateSchema.safeParse({ preserveEdits: false, mode: "scaffold" }).success).toBe(true);
    expect(generateSchema.safeParse({ mode: "turbo" }).success).toBe(false);
    expect(enhanceSchema.safeParse({ prompt: "Une application de facturation complète" }).success).toBe(true);
  });
});

describe("schemas d'authentification et fichiers", () => {
  it("valide une inscription robuste", () => {
    const valid = registerSchema.safeParse({
      name: "Aminata Koné",
      email: "AMINATA@exemple.ci",
      password: "MotDePasse2026",
    });
    expect(valid.success).toBe(true);
    if (valid.success) expect(valid.data.email).toBe("aminata@exemple.ci");
  });

  it("refuse les mots de passe et e-mails faibles", () => {
    expect(
      registerSchema.safeParse({ name: "A", email: "x", password: "court" }).success,
    ).toBe(false);
    expect(
      registerSchema.safeParse({ name: "Aminata", email: "a@b.ci", password: "lettres seulement" }).success,
    ).toBe(false);
    expect(
      registerSchema.safeParse({ name: "Aminata", email: "a@b.ci", password: "12345678" }).success,
    ).toBe(false);
  });

  it("borne le contenu des fichiers", () => {
    expect(fileUpdateSchema.parse({ content: "void main() {}" }).content).toBe("void main() {}");
    expect(fileUpdateSchema.safeParse({ content: "x".repeat(600_001) }).success).toBe(false);
  });

  it("normalise la limite de liste", () => {
    expect(projectListQuerySchema.parse({})).toEqual({ limit: 30 });
    expect(projectListQuerySchema.parse({ limit: "12" })).toEqual({ limit: 12 });
    expect(projectListQuerySchema.safeParse({ limit: "0" }).success).toBe(false);
    expect(projectListQuerySchema.safeParse({ limit: "101" }).success).toBe(false);
  });
});
