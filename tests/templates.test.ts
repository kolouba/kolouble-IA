import { describe, expect, it } from "vitest";
import { isTemplateKey, parsePrompt, TEMPLATE_KEYS } from "@/lib/spec";
import { MARKETPLACE_TEMPLATES, TEMPLATE_CATEGORIES, templatesByCategory } from "@/lib/templates";

describe("catalogue de modèles métier", () => {
  it("expose les douze secteurs annoncés", () => {
    expect(MARKETPLACE_TEMPLATES).toHaveLength(12);
    expect(new Set(MARKETPLACE_TEMPLATES.map((template) => template.key)).size).toBe(12);
    expect(MARKETPLACE_TEMPLATES.map((template) => template.key)).toEqual(
      expect.arrayContaining([
        "crm",
        "erp",
        "billing",
        "hr",
        "commerce",
        "education",
        "health",
        "mairie",
        "association",
        "church",
        "community",
        "funeral",
      ]),
    );
  });

  it("relie chaque modèle à un blueprint générable", () => {
    for (const template of MARKETPLACE_TEMPLATES) {
      expect(isTemplateKey(template.key)).toBe(true);
      expect(template.prompt.trim().length).toBeGreaterThanOrEqual(15);
      expect(template.entities.length).toBeGreaterThan(0);
      expect(TEMPLATE_CATEGORIES).toContain(template.category);
      expect(TEMPLATE_KEYS).toContain(template.key);
    }
  });

  it("regroupe les modèles par catégorie", () => {
    const total = TEMPLATE_CATEGORIES.reduce(
      (count, category) => count + templatesByCategory(category).length,
      0,
    );
    expect(total).toBe(MARKETPLACE_TEMPLATES.length);
    expect(templatesByCategory("Public & territoire").map((template) => template.key)).toContain("mairie");
  });
});

describe("parsePrompt avec modèle imposé", () => {
  it("respecte le modèle choisi plutôt que les mots-clés", () => {
    const spec = parsePrompt("Application de facturation pour une école", null, { templateKey: "mairie" });
    expect(spec.templateKey).toBe("mairie");
    expect(spec.appName).toBe("Kôloublé Mairie");
    expect(spec.entities.map((entity) => entity.key)).toEqual(
      expect.arrayContaining(["citizens", "requests"]),
    );
  });

  it("ignore un modèle inconnu", () => {
    const spec = parsePrompt("Un carnet pour consigner mes pensées", null, { templateKey: "inexistant" });
    expect(spec.templateKey).toBe("custom");
  });

  it("active la facturation SaaS et les moyens de paiement locaux", () => {
    const spec = parsePrompt("Une plateforme de gestion pour plusieurs entreprises", null, { saas: true });
    expect(spec.saas).toBe(true);
    expect(spec.billing.enabled).toBe(true);
    expect(spec.billing.currency).toBe("FCFA");
    expect(spec.billing.plans).toHaveLength(3);
    expect(spec.billing.providers).toEqual(
      expect.arrayContaining(["stripe", "orange-money", "mtn-money", "wave", "moov-money"]),
    );
    expect(spec.features).toEqual(expect.arrayContaining(["Multi-tenant & abonnements"]));
  });

  it("laisse la facturation désactivée sans option SaaS", () => {
    const spec = parsePrompt("Une application CRM pour une ONG");
    expect(spec.saas).toBe(false);
    expect(spec.billing.enabled).toBe(false);
    expect(spec.billing.providers).toContain("stripe");
  });
});
