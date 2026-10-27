import { describe, expect, it } from "vitest";
import {
  aiArchitectSchema,
  entityByKey,
  mergeAiEnhancements,
  normalizeEntityKey,
  parsePrompt,
  primaryField,
  sampleRows,
  sampleValue,
  specRoute,
  subtitleFields,
} from "@/lib/spec";

describe("parsePrompt", () => {
  it("détecte le blueprint gestion de projets", () => {
    const spec = parsePrompt(
      "Crée une application de gestion de projets avec Android, iPhone, Web, Windows, mode offline et synchronisation cloud",
    );
    expect(spec.appName).toContain("Projets");
    expect(spec.packageName).toMatch(/^[a-z0-9_]+$/);
    expect(spec.platforms).toEqual(["Web", "Android", "iOS", "Windows"]);
    expect(spec.entities.map((entity) => entity.key)).toEqual(
      expect.arrayContaining(["projects", "clients"]),
    );
    expect(spec.offline).toBe(true);
    expect(spec.features).toEqual(expect.arrayContaining(["Mode hors ligne (Hive)"]));
    expect(spec.copy.welcomeTitle.length).toBeGreaterThan(4);
    expect(spec.entities[0]?.fields.find((field) => field.key === "name")?.dartName).toBe("name");
  });

  it("normalise les sigles dans le nom de package", () => {
    const spec = parsePrompt("Application CRM pour les ventes", "CRM SaaS");
    expect(spec.packageName).toBe("crm_saas");
  });

  it("détecte la facturation et les fonctionnalités additionnelles", () => {
    const spec = parsePrompt("Application de facturation avec PDF, notifications et rôles administrateur");
    expect(spec.domain).toBe("Facturation");
    expect(spec.entities.map((entity) => entity.key)).toContain("invoices");
    expect(spec.features).toEqual(
      expect.arrayContaining(["Notifications", "Export documentaire", "Rôles & permissions"]),
    );
  });

  it("extrait un nom demandé et respecte la surcharge", () => {
    expect(parsePrompt('Crée une application nommée "Terrain Plus" pour gérer des projets').appName).toBe(
      "Terrain Plus",
    );
    expect(parsePrompt("Une application de stock", "Stock OBC").appName).toBe("Stock OBC");
    expect(parsePrompt("Une application appelée « Kossi CRM » pour le suivi client").appName).toBe(
      "Kossi CRM",
    );
  });

  it("nettoie les noms invalides", () => {
    const spec = parsePrompt("Une application de tâches", "  <script>alert(1)</script>  ");
    expect(spec.appName).not.toContain("<");
    expect(spec.appName.length).toBeGreaterThan(2);
  });

  it("retombe sur un modèle générique", () => {
    const spec = parsePrompt("Un carnet pour consigner mes pensées et mes découvertes");
    expect(spec.entities).toHaveLength(1);
    expect(spec.entities[0]?.key).toBe("items");
    expect(spec.domain).toBe("Sur mesure");
  });

  it("limite à quatre entités et déduplique", () => {
    const spec = parsePrompt(
      "Application de commerce avec commandes, produits, clients, factures, stock et tâches",
    );
    expect(spec.entities.length).toBeLessThanOrEqual(4);
    const keys = spec.entities.map((entity) => entity.key);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it("ajoute les fonctionnalités statistiques et recherche", () => {
    const spec = parsePrompt("Application de CRM avec rapports KPI, recherche et filtres avancés");
    expect(spec.features).toEqual(expect.arrayContaining(["Indicateurs & rapports", "Recherche & filtres"]));
  });
});

describe("helpers de spécification", () => {
  it("expose les champs principaux et sous-titres", () => {
    const spec = parsePrompt("Une application de gestion de projets");
    const projects = entityByKey(spec, "projects")!;
    expect(primaryField(projects).key).toBe("name");
    expect(subtitleFields(projects).length).toBeGreaterThan(0);
    expect(specRoute(projects)).toBe("/projects");
  });

  it("génère des lignes de démonstration variées", () => {
    const spec = parsePrompt("Une application de facturation");
    const invoices = entityByKey(spec, "invoices")!;
    const rows = sampleRows(invoices, 3);
    expect(rows).toHaveLength(3);
    expect(rows[0]?.id).toBe("invoices-1");
    for (const field of invoices.fields) {
      expect(rows[0]).toHaveProperty(field.key);
    }
  });

  it("génère des valeurs adaptées aux types", () => {
    const spec = parsePrompt("Une application de gestion de projets");
    const projects = entityByKey(spec, "projects")!;
    const status = projects.fields.find((field) => field.type === "status")!;
    const date = projects.fields.find((field) => field.type === "date")!;
    const number = projects.fields.find((field) => field.type === "number")!;
    expect(sampleValue(projects, status, 1)).toBeTypeOf("string");
    expect(sampleValue(projects, date, 1)).toBe("2026-11-18");
    expect(sampleValue(projects, number, 2)).toBe(320000);
    expect(sampleValue(projects, { ...status, type: "boolean" }, 1)).toBe(false);
  });

  it("normalise les clés d'entités", () => {
    expect(normalizeEntityKey("Éléments du projet")).toBe("elements_du_projet");
  });
});

describe("enrichissement IA", () => {
  it("valide un payload architecte", () => {
    const payload = aiArchitectSchema.parse({
      appName: "Kôloublé Terrain",
      tagline: "Le suivi terrain, même hors connexion.",
      primaryColor: "#3DDC97",
      copy: { welcomeTitle: "Bienvenue sur le terrain" },
    });
    expect(payload.appName).toBe("Kôloublé Terrain");
  });

  it("refuse une couleur ou un nom invalides", () => {
    expect(aiArchitectSchema.safeParse({ primaryColor: "red" }).success).toBe(false);
    expect(aiArchitectSchema.safeParse({ appName: "A" }).success).toBe(false);
  });

  it("fusionne les contenus IA avec la spécification", () => {
    const base = parsePrompt("Une application de gestion de projets");
    const merged = mergeAiEnhancements(base, {
      appName: "Kôloublé Chantier",
      tagline: "Suivez vos chantiers au quotidien.",
      summary: "Une application de suivi de chantiers.",
      primaryColor: "#ffcc66",
      copy: {
        welcomeTitle: "Vos chantiers en un regard",
        welcomeMessage: "Tout est là, même hors connexion.",
        emptyState: "Aucun chantier pour le moment.",
        syncMessage: "Synchronisation dès que possible.",
      },
    });
    expect(merged.appName).toBe("Kôloublé Chantier");
    expect(merged.packageName).toBe("kolouble_chantier");
    expect(merged.theme.primary).toBe("#FFCC66");
    expect(merged.aiGenerated).toBe(true);
    expect(merged.copy.welcomeTitle).toBe("Vos chantiers en un regard");
  });

  it("conserve la spécification sans payload", () => {
    const base = parsePrompt("Une application de gestion de projets");
    expect(mergeAiEnhancements(base, null)).toBe(base);
  });
});
