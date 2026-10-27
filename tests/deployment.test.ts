import { describe, expect, it } from "vitest";
import {
  DEPLOY_TARGETS,
  buildSettingsFor,
  deployConsoleUrl,
  dnsRecordsFor,
  isDeployTarget,
  repositoryUrlFor,
} from "@/lib/deployment";
import {
  UnsafeHostError,
  assertPublicHostname,
  isPrivateIPv4,
  isPrivateIPv6,
  isPublicAddress,
} from "@/lib/domain-safety";
import { deploymentSchema } from "@/lib/validation";

describe("cibles de déploiement", () => {
  it("valide uniquement les cibles connues", () => {
    expect(DEPLOY_TARGETS).toHaveLength(5);
    expect(isDeployTarget("vercel")).toBe(true);
    expect(isDeployTarget("github-pages")).toBe(true);
    expect(isDeployTarget("heroku")).toBe(false);
    expect(isDeployTarget(null)).toBe(false);
  });

  it("construit l'URL du dépôt avec ou sans URL GitHub", () => {
    expect(repositoryUrlFor(null, "gestion-projets")).toBe(
      "https://github.com/VOTRE-COMPTE/gestion-projets",
    );
    expect(repositoryUrlFor("https://github.com/obc/terrain.git", "gestion-projets")).toBe(
      "https://github.com/obc/terrain",
    );
  });

  it("ouvre la console de l'hébergeur choisi", () => {
    const url = "https://github.com/obc/terrain";
    expect(deployConsoleUrl("vercel", url, "terrain")).toContain("vercel.com/new/clone");
    expect(deployConsoleUrl("vercel", url, "terrain")).toContain(encodeURIComponent(url));
    expect(deployConsoleUrl("netlify", url, "terrain")).toContain("app.netlify.com/start");
    expect(deployConsoleUrl("github-pages", url, "terrain")).toBe(
      "https://github.com/obc/terrain/settings/pages",
    );
    expect(deployConsoleUrl("self-hosted", url, "terrain")).toBeNull();
  });

  it("fournit les bonnes configurations de build", () => {
    for (const target of DEPLOY_TARGETS) {
      const settings = buildSettingsFor(target);
      expect(settings.build.length).toBeGreaterThan(0);
      expect(settings.output.length).toBeGreaterThan(0);
      expect(settings.env.length).toBeGreaterThan(0);
    }
    expect(buildSettingsFor("vercel").build).toContain("vercel-build.sh");
    expect(buildSettingsFor("netlify").build).toContain("netlify-build.sh");
  });

  it("ne retourne aucun DNS sans domaine", () => {
    for (const target of DEPLOY_TARGETS) {
      expect(dnsRecordsFor(target, null)).toEqual([]);
    }
  });

  it("retourne les enregistrements DNS de chaque hébergeur", () => {
    const vercel = dnsRecordsFor("vercel", "app.exemple.ci");
    expect(vercel.some((record) => record.type === "CNAME" && record.value === "cname.vercel-dns.com")).toBe(true);
    expect(vercel.some((record) => record.type === "A" && record.value === "76.76.21.21")).toBe(true);

    const pages = dnsRecordsFor("github-pages", "app.exemple.ci");
    expect(pages.filter((record) => record.type === "A")).toHaveLength(4);
    expect(pages.some((record) => record.type === "TXT")).toBe(true);

    expect(dnsRecordsFor("netlify", "app.exemple.ci").some((record) => record.type === "A")).toBe(true);
    expect(dnsRecordsFor("cloudflare-pages", "app.exemple.ci")).toHaveLength(2);
    expect(dnsRecordsFor("self-hosted", "app.exemple.ci")).toHaveLength(2);
  });
});

describe("sécurité des domaines", () => {
  it("reconnaît les plages IPv4 privées", () => {
    for (const address of ["0.0.0.0", "10.0.0.1", "127.0.0.1", "169.254.1.1", "172.16.4.2", "192.168.1.10", "224.0.0.1", "100.64.0.1"]) {
      expect(isPrivateIPv4(address), address).toBe(true);
    }
    for (const address of ["8.8.8.8", "1.1.1.1", "172.32.0.1", "76.76.21.21"]) {
      expect(isPrivateIPv4(address), address).toBe(false);
    }
  });

  it("reconnaît les adresses IPv6 privées", () => {
    for (const address of ["::1", "::", "fd00::1", "fe80::1", "ff02::1", "2001:db8::1", "::ffff:127.0.0.1"]) {
      expect(isPrivateIPv6(address), address).toBe(true);
    }
    expect(isPrivateIPv6("2606:4700:4700::1111")).toBe(false);
  });

  it("classe les adresses publiques", () => {
    expect(isPublicAddress("8.8.8.8")).toBe(true);
    expect(isPublicAddress("127.0.0.1")).toBe(false);
    expect(isPublicAddress("2606:4700:4700::1111")).toBe(true);
    expect(isPublicAddress("pas-une-ip")).toBe(false);
  });

  it("refuse localhost, suffixes locaux et IP privées", async () => {
    await expect(assertPublicHostname("localhost")).rejects.toBeInstanceOf(UnsafeHostError);
    await expect(assertPublicHostname("mon-app.local")).rejects.toBeInstanceOf(UnsafeHostError);
    await expect(assertPublicHostname("service.internal")).rejects.toBeInstanceOf(UnsafeHostError);
    await expect(assertPublicHostname("192.168.1.20")).rejects.toBeInstanceOf(UnsafeHostError);
    await expect(assertPublicHostname("::1")).rejects.toBeInstanceOf(UnsafeHostError);
    await expect(assertPublicHostname("")).rejects.toBeInstanceOf(UnsafeHostError);
    await expect(assertPublicHostname("8.8.8.8")).resolves.toBeUndefined();
  });
});

describe("deploymentSchema", () => {
  it("normalise le domaine et les URL", () => {
    const parsed = deploymentSchema.parse({
      target: "netlify",
      repoName: "Gestion-Projets",
      customDomain: "App.Exemple.CI",
      repositoryUrl: "https://github.com/obc/terrain.git/",
      productionUrl: "https://app.exemple.ci/",
    });
    expect(parsed).toEqual({
      target: "netlify",
      repoName: "gestion-projets",
      customDomain: "app.exemple.ci",
      repositoryUrl: "https://github.com/obc/terrain",
      productionUrl: "https://app.exemple.ci",
    });
  });

  it("refuse un domaine ou un dépôt invalide", () => {
    expect(deploymentSchema.safeParse({ customDomain: "pas un domaine" }).success).toBe(false);
    expect(deploymentSchema.safeParse({ customDomain: "localhost" }).success).toBe(false);
    expect(deploymentSchema.safeParse({ repoName: "-depot" }).success).toBe(false);
    expect(deploymentSchema.safeParse({ repositoryUrl: "http://github.com/obc/terrain" }).success).toBe(false);
    expect(deploymentSchema.safeParse({ productionUrl: "javascript:alert(1)" }).success).toBe(false);
    expect(deploymentSchema.safeParse({ target: "heroku" }).success).toBe(false);
  });

  it("accepte une configuration vide", () => {
    expect(deploymentSchema.parse({})).toEqual({});
  });
});
