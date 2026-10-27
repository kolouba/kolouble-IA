export const DEPLOY_TARGETS = [
  "vercel",
  "netlify",
  "github-pages",
  "cloudflare-pages",
  "self-hosted",
] as const;

export type DeployTarget = (typeof DEPLOY_TARGETS)[number];

export const DEPLOY_TARGET_LABELS: Record<DeployTarget, string> = {
  vercel: "Vercel",
  netlify: "Netlify",
  "github-pages": "GitHub Pages",
  "cloudflare-pages": "Cloudflare Pages",
  "self-hosted": "Auto-hébergé (Docker + Caddy)",
};

export const DEPLOY_TARGET_HINTS: Record<DeployTarget, string> = {
  vercel: "Importez le dépôt, Vercel lit vercel.json et compile Flutter.",
  netlify: "Importez le dépôt, netlify.toml lance le script de build Flutter.",
  "github-pages": "Gratuit et sans secret : le workflow deploy.yml publie le site.",
  "cloudflare-pages": "Connectez le dépôt, publiez build/web sur le réseau Cloudflare.",
  "self-hosted": "Docker + Caddy : TLS automatique sur votre propre serveur.",
};

export interface DnsRecord {
  type: "A" | "CNAME" | "TXT";
  name: string;
  value: string;
  note?: string;
}

export interface DeployPreferences {
  target: DeployTarget;
  repoName: string;
  customDomain: string | null;
}

export interface DeploymentState {
  target: DeployTarget;
  repoName: string;
  repositoryUrl: string | null;
  customDomain: string | null;
  productionUrl: string | null;
  status: string;
  checkMessage: string | null;
  lastCheckAt: string | null;
}

export function isDeployTarget(value: unknown): value is DeployTarget {
  return typeof value === "string" && (DEPLOY_TARGETS as readonly string[]).includes(value);
}

export function gitHubOwner(repositoryUrl: string | null | undefined): string | null {
  if (!repositoryUrl) return null;
  const match = /^https:\/\/github\.com\/([A-Za-z0-9_.-]+)\//.exec(repositoryUrl);
  return match ? match[1]! : null;
}

export function gitHubRepoSlug(repositoryUrl: string | null | undefined): string | null {
  if (!repositoryUrl) return null;
  const match = /^https:\/\/github\.com\/([A-Za-z0-9_.-]+)\/([A-Za-z0-9_.-]+)$/.exec(
    repositoryUrl.replace(/\/+$/, "").replace(/\.git$/, ""),
  );
  return match ? `${match[1]}/${match[2]}` : null;
}

export function repositoryUrlFor(
  repositoryUrl: string | null | undefined,
  repoName: string,
): string {
  const slug = gitHubRepoSlug(repositoryUrl);
  if (slug) return `https://github.com/${slug}`;
  return `https://github.com/VOTRE-COMPTE/${repoName}`;
}

export function deployConsoleUrl(
  target: DeployTarget,
  repositoryUrl: string | null | undefined,
  repoName: string,
): string | null {
  const url = repositoryUrl && gitHubRepoSlug(repositoryUrl) ? repositoryUrl.replace(/\.git$/, "") : null;
  const encoded = url ? encodeURIComponent(url) : null;
  switch (target) {
    case "vercel":
      return encoded ? `https://vercel.com/new/clone?repository-url=${encoded}` : "https://vercel.com/new";
    case "netlify":
      return encoded ? `https://app.netlify.com/start/deploy?repository=${encoded}` : "https://app.netlify.com/start";
    case "cloudflare-pages":
      return "https://dash.cloudflare.com/?to=/:account/pages/new/provider/github";
    case "github-pages": {
      const slug = gitHubRepoSlug(repositoryUrl);
      return slug ? `https://github.com/${slug}/settings/pages` : `https://github.com/new?name=${encodeURIComponent(repoName)}`;
    }
    case "self-hosted":
      return null;
  }
}

export function dnsRecordsFor(target: DeployTarget, domain: string | null): DnsRecord[] {
  if (!domain) return [];
  switch (target) {
    case "vercel":
      return [
        { type: "CNAME", name: "www", value: "cname.vercel-dns.com", note: "Sous-domaine www" },
        { type: "A", name: "@", value: "76.76.21.21", note: "Domaine racine" },
      ];
    case "netlify":
      return [
        { type: "CNAME", name: "www", value: "votre-site.netlify.app", note: "Valeur fournie par Netlify" },
        { type: "A", name: "@", value: "75.2.60.5", note: "Domaine racine" },
      ];
    case "github-pages":
      return [
        { type: "A", name: "@", value: "185.199.108.153" },
        { type: "A", name: "@", value: "185.199.109.153" },
        { type: "A", name: "@", value: "185.199.110.153" },
        { type: "A", name: "@", value: "185.199.111.153" },
        { type: "CNAME", name: "www", value: "VOTRE-COMPTE.github.io", note: "Sous-domaine www" },
        { type: "TXT", name: "_github-pages-challenge", value: "jeton fourni par GitHub", note: "Vérification du domaine" },
      ];
    case "cloudflare-pages":
      return [
        { type: "CNAME", name: "www", value: "votre-projet.pages.dev", note: "Sous-domaine www" },
        { type: "CNAME", name: "@", value: "votre-projet.pages.dev", note: "Si le DNS est chez Cloudflare" },
      ];
    case "self-hosted":
      return [
        { type: "A", name: "@", value: "IP-DE-VOTRE-SERVEUR" },
        { type: "A", name: "www", value: "IP-DE-VOTRE-SERVEUR" },
      ];
  }
}

export function buildSettingsFor(target: DeployTarget): {
  install: string;
  build: string;
  output: string;
  env: string[];
} {
  const env = ["SUPABASE_URL", "SUPABASE_ANON_KEY"];
  switch (target) {
    case "vercel":
      return { install: "bash scripts/vercel-install.sh", build: "bash scripts/vercel-build.sh", output: "build/web", env };
    case "netlify":
      return { install: "automatique", build: "bash scripts/netlify-build.sh", output: "build/web", env };
    case "cloudflare-pages":
      return { install: "automatique", build: "bash scripts/netlify-build.sh", output: "build/web", env };
    case "github-pages":
      return { install: "flutter pub get", build: "flutter build web --release", output: "build/web", env: ["secrets GitHub"] };
    case "self-hosted":
      return { install: "docker compose build", build: "docker compose up -d", output: "conteneur nginx", env: [".env"] };
  }
}
