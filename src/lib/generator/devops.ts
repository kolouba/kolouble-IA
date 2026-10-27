import type { AppSpec } from "@/lib/spec";
import { resolveDeployment } from "@/lib/spec";
import { DEPLOY_TARGET_LABELS, buildSettingsFor } from "@/lib/deployment";
import { escapeDartString as d } from "@/lib/naming";
import type { GeneratedFile } from "./types";

function f(path: string, content: string, language: string): GeneratedFile {
  return { path, content, language, source: "scaffold" };
}

function pubspec(spec: AppSpec): string {
  return `name: ${spec.packageName}
description: "${spec.appName} — ${spec.summary.replace(/"/g, "'")}"
publish_to: "none"
version: 1.0.0+1

environment:
  sdk: ">=3.4.0 <4.0.0"

dependencies:
  flutter:
    sdk: flutter
  cupertino_icons: ^1.0.8
  flutter_riverpod: ^2.5.1
  go_router: ^14.2.7
  hive: ^2.2.3
  hive_flutter: ^1.1.0
  supabase_flutter: ^2.8.1
  connectivity_plus: ^6.0.5
  uuid: ^4.4.2
  intl: ^0.19.0

dev_dependencies:
  flutter_test:
    sdk: flutter
  flutter_lints: ^4.0.0

flutter:
  uses-material-design: true
`;
}

function readme(spec: AppSpec): string {
  const tables = spec.entities
    .map((entity) => {
      const columns = entity.fields.map((field) => `\`${field.key}\``).join(", ");
      return `| \`${entity.key}\` | ${entity.label} | ${columns} |`;
    })
    .join("\n");
  const features = spec.features.map((feature) => `- ${feature}`).join("\n");
  const pkg = spec.packageName;
  const deployment = resolveDeployment(spec);
  const deployTarget = deployment.target;
  const deployRepo = deployment.repoName;
  const deployDomain = deployment.customDomain;

  return `# ${spec.appName}

${spec.summary}

Généré par **Kôloublé IA** — studio d'applications offline-first propulsé par Ollama.

## Ce que contient ce projet

- Flutter 3.x, responsive Web / Android / iOS / Windows
- Architecture Clean Architecture, organisation **feature-first**
- Stockage local **Hive** + journal de synchronisation
- Backend **Supabase** : Postgres, Auth e-mail + Google + Facebook, RLS
- Synchronisation **Offline → Cloud** automatique (démarrage, retour réseau, toutes les 5 minutes)
- Tableau de bord, recherche, formulaires, tests
- Déploiement prêt : GitHub, Vercel, Netlify, Cloudflare Pages, GitHub Pages, Docker + Caddy

### Entités générées

| Table Supabase | Modèle | Champs |
| --- | --- | --- |
${tables}

### Fonctionnalités

${features}

## Démarrage rapide

Prérequis : Flutter 3.24+ et, pour le cloud, un projet Supabase.

~~~bash
cd ${pkg}
flutter create . --platforms=android,ios,web,windows --project-name ${pkg}
flutter pub get
~~~

1. Créez un projet sur [supabase.com](https://supabase.com).
2. Ouvrez **SQL Editor** et exécutez intégralement \`supabase/schema.sql\`.
3. Récupérez l'URL du projet et la clé **anon** (Settings → API).
4. Lancez l'application :

~~~bash
flutter run -d chrome \\
  --dart-define=SUPABASE_URL=https://VOTRE-PROJET.supabase.co \\
  --dart-define=SUPABASE_ANON_KEY=VOTRE_CLE_ANON
~~~

Sans variables Supabase, l'application démarre en **mode hors ligne** : session
locale persistée dans Hive, navigation et CRUD complets. Ajoutez les deux
variables ci-dessus pour activer l'authentification cloud et la synchronisation.

## Authentification

Dans Supabase → **Authentication → Providers** :

- **Email** : activé par défaut.
- **Google** : ajoutez Client ID / Secret, puis l'URL de redirection \`https://VOTRE-PROJET.supabase.co/auth/v1/callback\`.
- **Facebook** : même principe, avec l'URL de callback Supabase.

URLs de redirection à déclarer côté fournisseur :

- Web : \`http://localhost:3000\` (dev) et votre domaine de production.
- Mobile / Windows : \`${pkg.replace(/_/g, "-")}://login-callback\`.
  Ajoutez ce deep link côté Android (\`intent-filter\`), iOS (URL scheme) et Supabase.

Le schéma SQL active **Row Level Security** : chaque utilisateur ne voit que ses lignes (\`auth.uid() = user_id\`).

## Mode hors ligne et synchronisation

Chaque écriture est immédiatement persistée dans Hive avec \`_sync_state = pending\`.
En mode hors ligne, la session locale est conservée dans la boîte \`meta\` et
aucune donnée ne quitte l'appareil. Dès que Supabase est configuré, \`SyncService\` :

1. pousse les enregistrements en attente vers Supabase (upsert ou suppression) ;
2. récupère les lignes distantes modifiées depuis le dernier curseur ;
3. conserve les modifications locales en attente en cas de conflit ;
4. se déclenche au démarrage, au retour du réseau et toutes les 5 minutes.

Pour forcer une synchronisation : bouton **Synchroniser** (tableau de bord ou paramètres).

## Tests et qualité

~~~bash
flutter analyze
flutter test
~~~

Les tests fournis couvrent la sérialisation des modèles et les validateurs, sans dépendre de Supabase.

## Déploiement

Cible choisie : **${DEPLOY_TARGET_LABELS[deployTarget]}** · dépôt suggéré :
\`${deployRepo}\`${deployDomain ? ` · domaine : \`${deployDomain}\`` : ""}.

Le guide complet (GitHub, Vercel, Netlify, Cloudflare Pages, GitHub Pages,
domaine personnalisé, DNS et dépannage) se trouve dans **DEPLOYMENT.md**.

### GitHub

~~~bash
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/VOTRE-COMPTE/${deployRepo}.git
git push -u origin main
~~~

Les workflows **.github/workflows/flutter.yml** (qualité) et
**.github/workflows/deploy.yml** (publication) s'exécutent automatiquement.

### Vercel

Importez le dépôt : Vercel lit **vercel.json** (scripts Flutter, sortie
\`build/web\`). Ajoutez \`SUPABASE_URL\` et \`SUPABASE_ANON_KEY\`, puis votre domaine
dans **Settings → Domains**.

### Netlify

Importez le dépôt : **netlify.toml** lance \`scripts/netlify-build.sh\` et publie
\`build/web\`. Ajoutez les deux variables Supabase, puis votre domaine.

### Cloudflare Pages

Connectez le dépôt, build command \`bash scripts/netlify-build.sh\`, sortie
\`build/web\`, variables Supabase.

### GitHub Pages

**Settings → Pages → Source : GitHub Actions**. Le site est publié à chaque
push sur \`main\`, avec la bonne base href (sous-chemin ou domaine personnalisé).

### Docker + domaine propre

~~~bash
cp .env.example .env
# renseignez SUPABASE_URL, SUPABASE_ANON_KEY et DOMAIN
docker compose up -d --build
~~~

Caddy obtient automatiquement un certificat TLS pour \`DOMAIN\`.
L'image applicative tourne en lecture seule, sans privilèges, sous UID non-root.

Test local sans domaine : \`DOMAIN=localhost docker compose up --build\`.

## Applications mobiles et Windows

~~~bash
flutter build apk --release --dart-define=SUPABASE_URL=... --dart-define=SUPABASE_ANON_KEY=...
flutter build ios --release --no-codesign --dart-define=...
flutter build windows --release --dart-define=...
~~~

Ajoutez la permission réseau Android dans \`android/app/src/main/AndroidManifest.xml\` :

~~~xml
<uses-permission android:name="android.permission.INTERNET" />
~~~

Le workflow GitHub Actions construit automatiquement Web, Android, Windows et iOS.

## Structure

~~~text
lib/
  main.dart
  app.dart
  core/
    auth/ config/ constants/ providers/ router/ storage/ sync/ theme/ utils/ widgets/
  features/
    auth/ dashboard/ settings/
${spec.entities.map((entity) => `    ${entity.key}/`).join("\n")}
supabase/schema.sql
Dockerfile · docker-compose.yml · Caddyfile · nginx.conf
vercel.json · netlify.toml · web/CNAME
DEPLOYMENT.md
.github/workflows/flutter.yml · .github/workflows/deploy.yml
~~~

## Sécurité

- Aucune clé \`service_role\` dans l'application : la clé anon est publique et RLS protège les données.
- Les fichiers \`.env\` ne doivent jamais être commités.
- Le mode hors ligne conserve les données sur l'appareil : protégez les postes en environnement sensible.
- Les migrations SQL sont idempotentes, mais relisez-les avant production.

---

Généré le ${new Date().toISOString().slice(0, 10)} par **Kôloublé IA** pour ${d(spec.domain)}.
`;
}

function githubActions(spec: AppSpec): string {
  const pkg = spec.packageName;
  return `name: Flutter CI

on:
  push:
    branches: [main]
  pull_request:

permissions:
  contents: read

concurrency:
  group: flutter-\${{ github.ref }}
  cancel-in-progress: true

env:
  SUPABASE_URL: \${{ secrets.SUPABASE_URL }}
  SUPABASE_ANON_KEY: \${{ secrets.SUPABASE_ANON_KEY }}

jobs:
  quality:
    name: Analyse & tests
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: subosito/flutter-action@v2
        with:
          channel: stable
          cache: true
      - name: Bootstrap des dossiers plateformes
        run: flutter create --platforms=android,ios,web,windows --project-name ${pkg} .
      - run: flutter pub get
      - run: flutter analyze
      - run: flutter test --coverage
      - uses: actions/upload-artifact@v4
        if: always()
        with:
          name: coverage
          path: coverage/lcov.info
          if-no-files-found: ignore

  build-web:
    name: Build Web
    needs: quality
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: subosito/flutter-action@v2
        with:
          channel: stable
          cache: true
      - run: flutter create --platforms=web --project-name ${pkg} .
      - run: flutter pub get
      - run: flutter build web --release --dart-define=SUPABASE_URL="\$SUPABASE_URL" --dart-define=SUPABASE_ANON_KEY="\$SUPABASE_ANON_KEY"
      - uses: actions/upload-artifact@v4
        with:
          name: web-build
          path: build/web

  build-android:
    name: Build Android
    needs: quality
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-java@v4
        with:
          distribution: temurin
          java-version: "17"
      - uses: subosito/flutter-action@v2
        with:
          channel: stable
          cache: true
      - run: flutter create --platforms=android --project-name ${pkg} .
      - name: Autoriser le réseau
        run: sed -i '/<application/i\\    <uses-permission android:name="android.permission.INTERNET"/>' android/app/src/main/AndroidManifest.xml
      - run: flutter pub get
      - run: flutter build apk --release --dart-define=SUPABASE_URL="\$SUPABASE_URL" --dart-define=SUPABASE_ANON_KEY="\$SUPABASE_ANON_KEY"
      - uses: actions/upload-artifact@v4
        with:
          name: android-apk
          path: build/app/outputs/flutter-apk/app-release.apk

  build-windows:
    name: Build Windows
    needs: quality
    runs-on: windows-latest
    steps:
      - uses: actions/checkout@v4
      - uses: subosito/flutter-action@v2
        with:
          channel: stable
          cache: true
      - run: flutter create --platforms=windows --project-name ${pkg} .
      - run: flutter pub get
      - run: flutter build windows --release --dart-define=SUPABASE_URL="\$env:SUPABASE_URL" --dart-define=SUPABASE_ANON_KEY="\$env:SUPABASE_ANON_KEY"
      - uses: actions/upload-artifact@v4
        with:
          name: windows-build
          path: build/windows/x64/runner/Release

  build-ios:
    name: Build iOS
    needs: quality
    runs-on: macos-latest
    steps:
      - uses: actions/checkout@v4
      - uses: subosito/flutter-action@v2
        with:
          channel: stable
          cache: true
      - run: flutter create --platforms=ios --project-name ${pkg} .
      - run: flutter pub get
      - run: flutter build ios --release --no-codesign --dart-define=SUPABASE_URL="\$SUPABASE_URL" --dart-define=SUPABASE_ANON_KEY="\$SUPABASE_ANON_KEY"
      - uses: actions/upload-artifact@v4
        with:
          name: ios-build
          path: build/ios/iphoneos
          if-no-files-found: ignore
`;
}

function deployWorkflow(spec: AppSpec): string {
  const pkg = spec.packageName;
  return `name: Déploiement

on:
  push:
    branches: [main]
  workflow_dispatch:

permissions:
  contents: read
  pages: write
  id-token: write

concurrency:
  group: deploy-\${{ github.ref }}
  cancel-in-progress: true

env:
  SUPABASE_URL: \${{ secrets.SUPABASE_URL }}
  SUPABASE_ANON_KEY: \${{ secrets.SUPABASE_ANON_KEY }}

jobs:
  build:
    name: Build Web
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: subosito/flutter-action@v2
        with:
          channel: stable
          cache: true
      - name: Bootstrap de la plateforme web
        run: flutter create --platforms=web --project-name ${pkg} .
      - run: flutter pub get
      - name: Compiler le site
        run: |
          flutter build web --release --base-href "/" \\
            --dart-define=SUPABASE_URL="\$SUPABASE_URL" \\
            --dart-define=SUPABASE_ANON_KEY="\$SUPABASE_ANON_KEY"
      - uses: actions/upload-artifact@v4
        with:
          name: web-root
          path: build/web
          retention-days: 7

  pages:
    name: GitHub Pages
    needs: build
    runs-on: ubuntu-latest
    environment:
      name: github-pages
      url: \${{ steps.deployment.outputs.page_url }}
    steps:
      - uses: actions/checkout@v4
      - uses: actions/download-artifact@v4
        with:
          name: web-root
          path: build/web
      - name: Détecter le domaine personnalisé
        id: domain
        run: |
          if [ -f web/CNAME ]; then
            echo "custom=true" >> "\$GITHUB_OUTPUT"
          else
            echo "custom=false" >> "\$GITHUB_OUTPUT"
          fi
      - uses: subosito/flutter-action@v2
        if: steps.domain.outputs.custom == 'false'
        with:
          channel: stable
          cache: true
      - name: Reconstruire pour le sous-chemin Pages
        if: steps.domain.outputs.custom == 'false'
        run: |
          flutter create --platforms=web --project-name ${pkg} .
          flutter pub get
          flutter build web --release --base-href "/\${{ github.event.repository.name }}/" \\
            --dart-define=SUPABASE_URL="\$SUPABASE_URL" \\
            --dart-define=SUPABASE_ANON_KEY="\$SUPABASE_ANON_KEY"
      - uses: actions/upload-pages-artifact@v3
        with:
          path: build/web
      - id: deployment
        uses: actions/deploy-pages@v4

  netlify:
    name: Netlify
    needs: build
    if: vars.ENABLE_NETLIFY == 'true'
    runs-on: ubuntu-latest
    steps:
      - uses: actions/download-artifact@v4
        with:
          name: web-root
          path: build/web
      - uses: nwtgck/actions-netlify@v3
        with:
          publish-dir: ./build/web
          production-deploy: true
          github-token: \${{ secrets.GITHUB_TOKEN }}
        env:
          NETLIFY_AUTH_TOKEN: \${{ secrets.NETLIFY_AUTH_TOKEN }}
          NETLIFY_SITE_ID: \${{ secrets.NETLIFY_SITE_ID }}

  cloudflare:
    name: Cloudflare Pages
    needs: build
    if: vars.ENABLE_CLOUDFLARE == 'true'
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/download-artifact@v4
        with:
          name: web-root
          path: build/web
      - uses: cloudflare/wrangler-action@v3
        with:
          apiToken: \${{ secrets.CLOUDFLARE_API_TOKEN }}
          accountId: \${{ secrets.CLOUDFLARE_ACCOUNT_ID }}
          command: pages deploy build/web --project-name=\${{ vars.CLOUDFLARE_PROJECT }}

  vercel:
    name: Vercel
    needs: build
    if: vars.ENABLE_VERCEL == 'true'
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: amondnet/vercel-action@v25
        with:
          vercel-token: \${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: \${{ secrets.VERCEL_ORG_ID }}
          vercel-project-id: \${{ secrets.VERCEL_PROJECT_ID }}
          vercel-args: "--prod"
`;
}

function deploymentGuide(spec: AppSpec): string {
  const deploy = resolveDeployment(spec);
  const repo = deploy.repoName;
  const domain = deploy.customDomain ?? "app.votre-domaine.ci";
  const targetLabel = DEPLOY_TARGET_LABELS[deploy.target];
  const settings = buildSettingsFor(deploy.target);
  const pkg = spec.packageName;
  const cnameNote = deploy.customDomain
    ? `Le fichier **web/CNAME** contient déjà \`${deploy.customDomain}\` : GitHub Pages le reconnaît automatiquement.`
    : `Aucun domaine personnalisé n'a été choisi à la création. Ajoutez **web/CNAME** (une ligne avec votre domaine) avant de pousser le dépôt.`;

  return `# Déploiement — ${spec.appName}

Cible recommandée : **${targetLabel}** · dépôt **${repo}** · domaine **${deploy.customDomain ?? "à définir"}**

Ce projet est prêt pour GitHub, Vercel, Netlify, Cloudflare Pages, GitHub Pages
et un hébergement auto-hébergé (Docker + Caddy).

## 1. Préparer Supabase

1. Créez un projet sur [supabase.com](https://supabase.com).
2. Dans **SQL Editor**, exécutez **supabase/schema.sql**.
3. Récupérez **Project URL** et la clé **anon** (Settings → API).
4. Déclarez les URL de redirection : votre domaine de production, le domaine
   de préversion de l'hébergeur et \`http://localhost:3000\`.

Ne placez jamais la clé **service_role** dans l'application : la clé anon est
publique et protégée par Row Level Security.

## 2. Publier sur GitHub

~~~bash
cd ${pkg}
git init
git add .
git commit -m "Initial commit — ${spec.appName}"
git branch -M main
git remote add origin https://github.com/VOTRE-COMPTE/${repo}.git
git push -u origin main
~~~

Variante GitHub CLI :

~~~bash
gh repo create ${repo} --public --source=. --remote=origin --push
~~~

Secrets à ajouter dans **Settings → Secrets and variables → Actions** :

| Secret | Rôle |
| --- | --- |
| SUPABASE_URL | URL du projet Supabase |
| SUPABASE_ANON_KEY | Clé anon publique |
| VERCEL_TOKEN, VERCEL_ORG_ID, VERCEL_PROJECT_ID | Déploiement Vercel en CI |
| NETLIFY_AUTH_TOKEN, NETLIFY_SITE_ID | Déploiement Netlify en CI |
| CLOUDFLARE_API_TOKEN, CLOUDFLARE_ACCOUNT_ID | Déploiement Cloudflare en CI |

Les déploiements Vercel, Netlify et Cloudflare depuis la CI sont désactivés par
défaut. Activez-les avec les variables de dépôt **ENABLE_VERCEL**,
**ENABLE_NETLIFY**, **ENABLE_CLOUDFLARE** (valeur \`true\`). GitHub Pages est
toujours publié par **.github/workflows/deploy.yml**.

## 3. Comparatif des hébergeurs gratuits

| Hébergeur | Offre gratuite | Domaine personnalisé | TLS | Configuration |
| --- | --- | --- | --- | --- |
| Vercel | 100 Go / mois, préversions par branche | Oui | Automatique | vercel.json |
| Netlify | 100 Go / mois, formulaires inclus | Oui | Automatique | netlify.toml |
| Cloudflare Pages | Requêtes illimitées, 500 builds / mois | Oui | Automatique | scripts/netlify-build.sh |
| GitHub Pages | 1 Go, 100 Go / mois | Oui | Automatique | .github/workflows/deploy.yml |
| Docker + Caddy | Votre serveur | Oui | Let's Encrypt | docker-compose.yml |

## 4. Vercel

1. **Add New → Project** puis importez le dépôt GitHub.
2. Vercel lit **vercel.json** : installation \`${settings.install}\`, build
   \`${settings.build}\`, sortie \`${settings.output}\`.
3. Ajoutez les variables \`SUPABASE_URL\` et \`SUPABASE_ANON_KEY\` (Production,
   Preview, Development).
4. Déployez. Chaque branche obtient une URL de préversion.
5. **Settings → Domains** : ajoutez votre domaine, puis créez les enregistrements
   DNS indiqués en section 8.
6. Pour déployer depuis GitHub Actions, renseignez les trois secrets Vercel et
   la variable **ENABLE_VERCEL**.

## 5. Netlify

1. **Add new site → Import an existing project**, choisissez GitHub.
2. **netlify.toml** définit le build \`${settings.build}\` et la sortie
   \`${settings.output}\`.
3. Variables d'environnement : \`SUPABASE_URL\`, \`SUPABASE_ANON_KEY\`.
4. Déployez, puis **Domain management → Add custom domain**.
5. Pour la CI : secrets **NETLIFY_AUTH_TOKEN**, **NETLIFY_SITE_ID** et variable
   **ENABLE_NETLIFY**.

## 6. Cloudflare Pages

1. **Workers & Pages → Create → Pages → Connect to Git**.
2. Build command : \`bash scripts/netlify-build.sh\` — Output : \`build/web\`.
3. Variables : \`SUPABASE_URL\`, \`SUPABASE_ANON_KEY\`.
4. **Custom domains** : Cloudflare gère le DNS et le certificat si le domaine
   est hébergé chez Cloudflare.
5. Pour la CI : **CLOUDFLARE_API_TOKEN**, **CLOUDFLARE_ACCOUNT_ID** et variables
   **ENABLE_CLOUDFLARE**, **CLOUDFLARE_PROJECT**.

## 7. GitHub Pages

1. Poussez sur la branche \`main\`.
2. **Settings → Pages → Build and deployment → Source : GitHub Actions**.
3. Le workflow **deploy.yml** compile Flutter et publie le site.
4. URL par défaut : \`https://VOTRE-COMPTE.github.io/${repo}/\`.
5. ${cnameNote}

Sans domaine personnalisé, le workflow compile avec
\`--base-href "/${repo}/"\` pour que les assets fonctionnent sous le sous-chemin.
Avec un domaine personnalisé, la base reste \`/\`.

## 8. Domaine personnalisé — enregistrements DNS

Domaine visé : **${domain}**. Remplacez les valeurs par celles affichées par
votre hébergeur.

**Vercel**

| Type | Nom | Valeur |
| --- | --- | --- |
| CNAME | www | cname.vercel-dns.com |
| A | @ | 76.76.21.21 |

**Netlify**

| Type | Nom | Valeur |
| --- | --- | --- |
| CNAME | www | votre-site.netlify.app |
| A | @ | 75.2.60.5 |

**Cloudflare Pages**

| Type | Nom | Valeur |
| --- | --- | --- |
| CNAME | www | votre-projet.pages.dev |
| CNAME | @ | votre-projet.pages.dev |

**GitHub Pages**

| Type | Nom | Valeur |
| --- | --- | --- |
| A | @ | 185.199.108.153 |
| A | @ | 185.199.109.153 |
| A | @ | 185.199.110.153 |
| A | @ | 185.199.111.153 |
| CNAME | www | VOTRE-COMPTE.github.io |

**Auto-hébergé**

| Type | Nom | Valeur |
| --- | --- | --- |
| A | @ | IP-DE-VOTRE-SERVEUR |
| A | www | IP-DE-VOTRE-SERVEUR |

Après la propagation DNS (5 min à 24 h), activez **Enforce HTTPS** et vérifiez
que l'URL Supabase de redirection correspond bien au domaine final.

## 9. Auto-hébergement Docker + Caddy

~~~bash
cp .env.example .env
# renseignez SUPABASE_URL, SUPABASE_ANON_KEY et DOMAIN
docker compose up -d --build
~~~

Caddy obtient automatiquement le certificat TLS pour \`DOMAIN\`. Test local :
\`DOMAIN=localhost docker compose up --build\`.

## 10. Vérifications après déploiement

~~~bash
curl -I https://${domain}
curl -I https://${domain}/#/login
~~~

- La page se charge et la navigation profonde (rafraîchissement) fonctionne.
- Les en-têtes \`X-Content-Type-Options\`, \`Referrer-Policy\` et
  \`Permissions-Policy\` sont présents.
- La connexion Supabase fonctionne (e-mail, Google, Facebook).
- La synchronisation repasse en ligne après une coupure réseau.

## 11. Dépannage

| Symptôme | Cause probable | Correction |
| --- | --- | --- |
| Page blanche sur GitHub Pages | Base href incorrecte | Vérifiez CNAME et le paramètre \`--base-href\` |
| \`flutter: command not found\` | SDK absent de l'image | Utilisez les scripts fournis |
| 404 au rafraîchissement | Réécriture SPA absente | vercel.json, netlify.toml ou nginx.conf |
| CORS Supabase | Domaine non déclaré | Ajoutez l'URL dans Supabase → Auth → URL Configuration |
| Ancienne version servie | Cache navigateur / CDN | Purgez le cache de l'hébergeur |

---

Guide généré le ${new Date().toISOString().slice(0, 10)} par **Kôloublé IA**.
`;
}

function netlifyConfig(): string {
  return `[build]
  command = "bash scripts/netlify-build.sh"
  publish = "build/web"

[build.environment]
  FLUTTER_VERSION = "stable"

[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200

[[headers]]
  for = "/*"
  [headers.values]
    X-Content-Type-Options = "nosniff"
    Referrer-Policy = "strict-origin-when-cross-origin"
    Permissions-Policy = "camera=(), microphone=(), geolocation=()"
`;
}

function netlifyBuildScript(): string {
  return `#!/usr/bin/env bash
set -euo pipefail

if ! command -v flutter >/dev/null 2>&1; then
  if [ ! -d "$HOME/flutter" ]; then
    git clone --depth 1 --branch stable https://github.com/flutter/flutter.git "$HOME/flutter"
  fi
  export PATH="$HOME/flutter/bin:$PATH"
fi

: "\${SUPABASE_URL:?SUPABASE_URL est requis}"
: "\${SUPABASE_ANON_KEY:?SUPABASE_ANON_KEY est requis}"

flutter --version
flutter pub get
flutter build web --release \\
  --base-href "/" \\
  --dart-define=SUPABASE_URL="$SUPABASE_URL" \\
  --dart-define=SUPABASE_ANON_KEY="$SUPABASE_ANON_KEY"
`;
}

export function buildDevopsFiles(spec: AppSpec): GeneratedFile[] {
  const schemaColor = spec.theme.background;
  const themeColor = spec.theme.primary;
  const customDomain = resolveDeployment(spec).customDomain;

  const vercel = `{
  "$schema": "https://openapi.vercel.sh/vercel.json",
  "framework": null,
  "installCommand": "bash scripts/vercel-install.sh",
  "buildCommand": "bash scripts/vercel-build.sh",
  "outputDirectory": "build/web",
  "routes": [
    { "handle": "filesystem" },
    { "src": "/(.*)", "dest": "/index.html" }
  ],
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        { "key": "X-Content-Type-Options", "value": "nosniff" },
        { "key": "Referrer-Policy", "value": "strict-origin-when-cross-origin" },
        { "key": "Permissions-Policy", "value": "camera=(), microphone=(), geolocation=()" }
      ]
    }
  ]
}
`;

  const vercelInstall = `#!/usr/bin/env bash
set -euo pipefail

if ! command -v flutter >/dev/null 2>&1; then
  if [ ! -d "$HOME/flutter" ]; then
    git clone --depth 1 --branch stable https://github.com/flutter/flutter.git "$HOME/flutter"
  fi
  export PATH="$HOME/flutter/bin:$PATH"
fi

flutter --version
flutter pub get
`;

  const vercelBuild = `#!/usr/bin/env bash
set -euo pipefail

if ! command -v flutter >/dev/null 2>&1; then
  export PATH="$HOME/flutter/bin:$PATH"
fi

: "\${SUPABASE_URL:?SUPABASE_URL est requis sur Vercel}"
: "\${SUPABASE_ANON_KEY:?SUPABASE_ANON_KEY est requis sur Vercel}"

flutter build web --release \\
  --dart-define=SUPABASE_URL="$SUPABASE_URL" \\
  --dart-define=SUPABASE_ANON_KEY="$SUPABASE_ANON_KEY"
`;

  const dockerfile = `# syntax=docker/dockerfile:1
FROM ghcr.io/cirruslabs/flutter:stable AS build

WORKDIR /app
COPY pubspec.yaml analysis_options.yaml ./
RUN flutter pub get
COPY . .

ARG SUPABASE_URL
ARG SUPABASE_ANON_KEY
RUN flutter build web --release \\
    --dart-define=SUPABASE_URL="$SUPABASE_URL" \\
    --dart-define=SUPABASE_ANON_KEY="$SUPABASE_ANON_KEY"

FROM nginxinc/nginx-unprivileged:1.27-alpine AS runtime

COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build --chown=101:101 /app/build/web /usr/share/nginx/html

USER 101
EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=3s CMD wget -qO- http://127.0.0.1:8080/ || exit 1
`;

  const nginxConf = `server {
  listen 8080;
  server_name _;
  root /usr/share/nginx/html;
  index index.html;

  add_header X-Content-Type-Options "nosniff" always;
  add_header Referrer-Policy "strict-origin-when-cross-origin" always;
  add_header X-Frame-Options "SAMEORIGIN" always;
  add_header Content-Security-Policy "default-src 'self'; script-src 'self' 'wasm-unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self' data:; connect-src 'self' https://*.supabase.co wss://*.supabase.co; worker-src 'self' blob:; frame-ancestors 'none'; base-uri 'self'; form-action 'self';" always;

  location / {
    try_files $uri $uri/ /index.html;
  }

  location ~* \\.(?:js|css|wasm|png|jpg|jpeg|gif|svg|ico|woff2?)$ {
    expires 7d;
    add_header Cache-Control "public, max-age=604800, immutable";
    try_files $uri =404;
  }
}
`;

  const compose = `services:
  app:
    build:
      context: .
      args:
        SUPABASE_URL: \${SUPABASE_URL:?SUPABASE_URL est requis}
        SUPABASE_ANON_KEY: \${SUPABASE_ANON_KEY:?SUPABASE_ANON_KEY est requis}
    restart: unless-stopped
    read_only: true
    tmpfs:
      - /tmp
      - /var/cache/nginx
      - /var/run
    security_opt:
      - no-new-privileges:true
    cap_drop:
      - ALL
    expose:
      - "8080"

  caddy:
    image: caddy:2-alpine
    restart: unless-stopped
    depends_on:
      - app
    env_file:
      - .env
    environment:
      DOMAIN: \${DOMAIN:-localhost}
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./Caddyfile:/etc/caddy/Caddyfile:ro
      - caddy_data:/data
      - caddy_config:/config
    security_opt:
      - no-new-privileges:true

volumes:
  caddy_data:
  caddy_config:
`;

  const caddyfile = `{$DOMAIN:localhost} {
  encode zstd gzip
  reverse_proxy app:8080
  header {
    Strict-Transport-Security "max-age=31536000; includeSubDomains"
    X-Content-Type-Options "nosniff"
    Referrer-Policy "strict-origin-when-cross-origin"
    -Server
  }
}
`;

  const envExample = `# Supabase — Settings → API
SUPABASE_URL="https://VOTRE-PROJET.supabase.co"
SUPABASE_ANON_KEY="eyJhbGciOi..."

# Domaine utilisé par Caddy (Let's Encrypt automatique)
DOMAIN="app.votre-domaine.ci"
`;

  const gitignore = `.dart_tool/
.packages
build/
coverage/
.flutter-plugins
.flutter-plugins-dependencies
*.iml
.idea/
.vscode/
android/.gradle/
android/key.properties
ios/Pods/
ios/.symlinks/
windows/flutter/ephemeral/
.env
.env.local
.DS_Store
`;

  const dockerignore = `.git
.dart_tool
build
coverage
node_modules
.env
.env.local
*.md
!README.md
`;

  return [
    f("pubspec.yaml", pubspec(spec), "yaml"),
    f("analysis_options.yaml", `include: package:flutter_lints/flutter.yaml\n`, "yaml"),
    f(
      "web/index.html",
      `<!DOCTYPE html>
<html lang="fr">
<head>
  <base href="$FLUTTER_BASE_HREF">
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="description" content="${spec.summary.replace(/"/g, "'")}">
  <meta name="theme-color" content="${themeColor}">
  <link rel="manifest" href="manifest.json">
  <title>${spec.appName}</title>
</head>
<body style="margin:0;background:${schemaColor};">
  <script src="flutter_bootstrap.js" async></script>
</body>
</html>
`,
      "html",
    ),
    f(
      "web/manifest.json",
      JSON.stringify(
        {
          name: spec.appName,
          short_name: spec.appName.slice(0, 20),
          start_url: ".",
          display: "standalone",
          background_color: schemaColor,
          theme_color: themeColor,
          description: spec.summary,
          orientation: "portrait-primary",
          lang: "fr",
        },
        null,
        2,
      ),
      "json",
    ),
    f("vercel.json", vercel, "json"),
    f("scripts/vercel-install.sh", vercelInstall, "shell"),
    f("scripts/vercel-build.sh", vercelBuild, "shell"),
    f("netlify.toml", netlifyConfig(), "text"),
    f("scripts/netlify-build.sh", netlifyBuildScript(), "shell"),
    f("Dockerfile", dockerfile, "text"),
    f("nginx.conf", nginxConf, "text"),
    f("docker-compose.yml", compose, "yaml"),
    f("Caddyfile", caddyfile, "text"),
    f(".dockerignore", dockerignore, "text"),
    f(".gitignore", gitignore, "text"),
    f(".env.example", envExample, "text"),
    f(".github/workflows/flutter.yml", githubActions(spec), "yaml"),
    f(".github/workflows/deploy.yml", deployWorkflow(spec), "yaml"),
    ...(customDomain ? [f("web/CNAME", `${customDomain}\n`, "text")] : []),
    f("DEPLOYMENT.md", deploymentGuide(spec), "markdown"),
    f("README.md", readme(spec), "markdown"),
  ];
}
