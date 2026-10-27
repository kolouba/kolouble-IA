import { describe, expect, it } from "vitest";
import { collectFallbackFiles } from "@/lib/generator";
import { buildSupabaseFiles, buildSupabaseSql } from "@/lib/generator/supabase";
import { validateFiles } from "@/lib/generator/validate";
import { parsePrompt } from "@/lib/spec";

const SAAS_SPEC = parsePrompt("Gestion des demandes citoyennes", "Kôloublé Mairie", {
  templateKey: "mairie",
  saas: true,
});

describe("génération Supabase en mode SaaS", () => {
  it("crée les tables multi-tenant avant les tables métier", () => {
    const sql = buildSupabaseSql(SAAS_SPEC);
    for (const table of [
      "organizations",
      "organization_members",
      "plans",
      "subscriptions",
      "payment_transactions",
    ]) {
      expect(sql).toContain(`create table if not exists public.${table}`);
    }
    const organizationIndex = sql.indexOf("create table if not exists public.organizations");
    const firstEntity = SAAS_SPEC.entities[0]!;
    expect(sql.indexOf(`create table if not exists public.${firstEntity.key}`)).toBeGreaterThan(
      organizationIndex,
    );
    expect(sql).toContain("kolouble_is_member");
    expect(sql).toContain("organization_id uuid references public.organizations");
    expect(sql).toContain("create table if not exists public.organizations");
    expect(sql).toContain("kolouble_assign_organization");
    expect(sql).toContain("kolouble_bootstrap_organization");
    expect(sql).toContain("after insert on auth.users");
    expect(sql).toContain(`${firstEntity.key}_assign_organization`);
  });

  it("isole les données par organisation", () => {
    const sql = buildSupabaseSql(SAAS_SPEC);
    const entity = SAAS_SPEC.entities[0]!;
    expect(sql).toContain(`create policy "${entity.key}_select_org"`);
    expect(sql).not.toContain(`"${entity.key}_select_own"`);
    expect(sql).toContain("public.kolouble_is_member(organization_id)");
    expect(sql).toContain("user_id = auth.uid()");
  });

  it("fournit la configuration de facturation et la documentation", () => {
    const files = buildSupabaseFiles(SAAS_SPEC);
    const billing = files.find((file) => file.path === "lib/config/billing.dart");
    const doc = files.find((file) => file.path === "docs/SAAS.md");
    expect(billing).toBeDefined();
    expect(doc).toBeDefined();
    expect(billing!.content).toContain("class BillingConfig");
    expect(billing!.content).toContain("static const bool enabled = true;");
    expect(billing!.content).toContain("'orange-money'");
    expect(billing!.content).toContain("15000");
    expect(billing!.content).toContain("STRIPE_SECRET_KEY");
    expect(billing!.content).not.toMatch(/sk_live_\w+/);
    expect(doc!.content).toContain("multi-tenant");
    expect(doc!.content).toContain("service_role");
  });

  it("échappe les valeurs injectées dans le Dart", () => {
    const spec = {
      ...SAAS_SPEC,
      billing: {
        ...SAAS_SPEC.billing,
        plans: [
          {
            key: "x",
            label: "L'offre $peciale",
            price: 1000,
            interval: "month" as const,
            features: ["un 'test'"],
          },
        ],
      },
    };
    const billing = buildSupabaseFiles(spec).find((file) => file.path === "lib/config/billing.dart")!;
    expect(billing.content).toContain("L\\'offre \\$peciale");
    expect(billing.content).toContain("un \\'test\\'");
  });

  it("passe la validation du générateur sans erreur", () => {
    const issues = validateFiles(collectFallbackFiles(SAAS_SPEC), SAAS_SPEC);
    expect(issues.filter((issue) => issue.severity === "error")).toEqual([]);
  });

  it("laisse les projets classiques sans tables SaaS", () => {
    const spec = parsePrompt("Gestion de projets", "Terrain OBC");
    const sql = buildSupabaseSql(spec);
    const files = buildSupabaseFiles(spec);
    expect(sql).not.toContain("create table if not exists public.organizations");
    expect(sql).toContain("auth.uid() = user_id");
    expect(files.map((file) => file.path)).toEqual(["supabase/schema.sql"]);
  });
});
