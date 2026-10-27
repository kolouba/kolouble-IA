# Kôloublé IA

Studio local de génération d'applications **Flutter 3 + Supabase**, piloté par
**Ollama** (DeepSeek-Coder ou Qwen2.5-Coder). Décrivez une application en
français ; six agents produisent une spécification, le code Flutter complet, le
schéma SQL Supabase, l'infrastructure de déploiement et les tests.

L'interface web permet de créer des projets, lancer une génération en direct,
éditer les fichiers, prévisualiser le prototype, réparer le code et exporter une
archive ZIP. Les données du studio sont stockées avec Prisma (SQLite en local,
PostgreSQL sur Supabase/Vercel).

---

## Sommaire

1. [Fonctionnalités](#fonctionnalités)
2. [Architecture](#architecture)
3. [Installation locale](#installation-locale)
4. [Variables d'environnement](#variables-denvironnement)
5. [Ollama et modèles](#ollama-et-modèles)
6. [Utilisation](#utilisation)
7. [Ce que contient une application générée](#ce-que-contient-une-application-générée)
8. [API du studio](#api-du-studio)
9. [Tests, lint et CI](#tests-lint-et-ci)
10. [Déploiement Vercel](#déploiement-vercel)
11. [Auto-hébergement Docker + domaine](#auto-hébergement-docker--domaine)
12. [Serveur de prévisualisation sandbox](#serveur-de-prévisualisation-sandbox)
13. [Sécurité](#sécurité)
14. [Dépannage](#dépannage)

---

## Fonctionnalités

- **Pipeline multi-agents** : architecte, designer, Flutter, Supabase, DevOps,
  testeur. Les étapes et fichiers sont diffusés en temps réel (NDJSON).
- **Génération déterministe** : sans Ollama, les gabarits produisent déjà une
  application complète et cohérente. L'IA enrichit ensuite la spécification et
  la documentation ; les erreurs détectées sont réparées automatiquement.
- **Flutter 3 multiplateforme** : Web, Android, iOS et Windows, avec Riverpod,
  go_router, thème sombre responsive, CRUD et validateurs.
- **Offline-first** : Hive conserve chaque écriture, une file `_sync_state`
  rejoue les opérations vers Supabase au retour du réseau, au démarrage et
  toutes les 5 minutes.
- **Mode local sans Supabase** : session locale persistée dans Hive, navigation
  et CRUD entièrement fonctionnels. Supabase est optionnel.
- **Supabase** : authentification e-mail, Google et Facebook, schéma SQL avec
  Row Level Security par propriétaire.
- **Export ZIP en streaming**, édition de fichiers protégée, aperçu HTML
  sandboxé, réparation ciblée, téléchargement sécurisé.
- **Déploiement** : fichiers Vercel, Docker, Caddy, Nginx et GitHub Actions
  générés ; le studio lui-même se déploie sur Vercel ou votre domaine.
- **Qualité** : Vitest, couverture V8, ESLint, TypeScript strict, GitHub Actions
  et Codecov.

## Architecture

### Le studio (cette application)

~~~text
src/
  app/                    Pages App Router + routes API
  components/             Landing, auth, dashboard, builder, paramètres
  lib/
    generator/            Six agents, gabarits Flutter/Supabase/DevOps, validation
    auth.ts, guard.ts     NextAuth v5 + contrôle de propriété
    http.ts, rate-limit   Erreurs JSON, CSRF same-origin, limitation de débit
    path-safety.ts        Normalisation des chemins générés
    workspace.ts          Miroir disque local optionnel
prisma/
  sqlite/                 Schéma + migration locale
  postgres/               Schéma + migration Supabase
sandbox/                  Serveur d'aperçu autonome durci + Dockerfile
docker/                   Entrypoint du conteneur applicatif
~~~

### Une application générée

~~~text
lib/
  main.dart, app.dart
  core/                   auth, config, thème, routeur, stockage Hive, sync
  features/               auth, dashboard, paramètres + une feature par entité
supabase/schema.sql       Tables, index, triggers, RLS
test/                     Tests des modèles et validateurs
prototype/index.html      Aperçu autonome sans compilation Flutter
.github/workflows/        Build Web, Android, Windows, iOS
Dockerfile · docker-compose.yml · Caddyfile · vercel.json
~~~

## Installation locale

Prérequis :

- Node.js **20.9+** (22 recommandé) et npm ;
- [Ollama](https://ollama.com) pour la génération IA (optionnel) ;
- Flutter **3.24+** uniquement pour compiler une application générée.

~~~bash
npm install
cp .env.example .env
node -e "console.log(require('crypto').randomBytes(32).toString('base64url'))"
# Copiez la valeur obtenue dans AUTH_SECRET du fichier .env
npm run db:deploy      # applique la migration SQLite locale
npm run dev            # http://localhost:3000
~~~

Créez un compte via `/register`, puis lancez une génération depuis le tableau de
bord. La base locale est créée dans `prisma/sqlite/dev.db`.

Commandes utiles :

| Commande | Rôle |
| --- | --- |
| `npm run dev` | Serveur de développement |
| `npm run build` | Build de production |
| `npm start` | Démarre le build |
| `npm run lint` | ESLint |
| `npm run typecheck` | TypeScript strict |
| `npm run test` | Tests Vitest |
| `npm run coverage` | Couverture V8 + seuils |
| `npm run db:deploy` | Migrations SQLite |
| `npm run pg:deploy` | Migrations PostgreSQL/Supabase |
| `npm run sandbox` | Serveur d'aperçu local |

## Variables d'environnement

Copiez `.env.example` vers `.env`. Ne commitez jamais `.env`.

| Variable | Obligatoire | Description |
| --- | --- | --- |
| `AUTH_SECRET` | Oui | Secret NextAuth (32 octets aléatoires) |
| `DATABASE_URL` | Oui | `file:./dev.db` en local, URL Supabase en production |
| `AUTH_URL` | Production | URL publique exacte du studio |
| `AUTH_TRUST_HOST` | Derrière proxy | `true` pour Vercel, Docker, Caddy |
| `OLLAMA_BASE_URL` | Non | Par défaut `http://localhost:11434` |
| `OLLAMA_MODEL` | Non | Modèle principal, ex. `deepseek-coder:latest` |
| `OLLAMA_MODELS` | Non | Liste proposée dans l'interface, séparée par des virgules |
| `OLLAMA_TIMEOUT_MS` | Non | Timeout IA, 10 s à 600 s |
| `GOOGLE_CLIENT_ID` / `_SECRET` | Non | Active la connexion Google |
| `FACEBOOK_CLIENT_ID` / `_SECRET` | Non | Active la connexion Facebook |
| `WORKSPACE_ROOT` | Non | Miroir disque local des projets (désactivé sur Vercel) |
| `MAX_UPLOAD_BYTES` | Non | Taille maximale d'un fichier édité |
| `SITE_DOMAIN` | Docker + Caddy | Domaine public, ex. `apps.exemple.ci` |
| `ACME_EMAIL` | Docker + Caddy | E-mail Let's Encrypt |

## Ollama et modèles

~~~bash
ollama serve
ollama pull deepseek-coder:latest
# ou
ollama pull qwen2.5-coder:7b
~~~

L'interface `/settings` liste les modèles détectés et permet de tester la
connexion. En cas d'indisponibilité, la génération continue en mode gabarits :
l'application reste complète, mais sans enrichissement IA.

Pour Docker, `OLLAMA_BASE_URL` doit pointer vers la machine hôte :
`http://host.docker.internal:11434` (valeur par défaut de Compose). Sur Vercel,
Ollama doit être exposé sur une URL HTTPS accessible publiquement ; sinon le
studio fonctionne en mode déterministe.

## Utilisation

1. Créez un compte ou connectez-vous avec Google/Facebook si configuré.
2. **Nouveau projet** : décrivez l'application, choisissez le mode
   (`scaffold`, `standard`, `expert`) et éventuellement le modèle.
3. La génération diffuse les six étapes, les fichiers et les avertissements.
4. Onglets du builder : **Aperçu**, **Fichiers**, **Génération**, **Réparation**.
5. Éditez un fichier puis enregistrez : les fichiers utilisateur ne sont jamais
   écrasés par une réparation.
6. Téléchargez le ZIP, ou clonez le projet pour compiler avec Flutter.
7. `/settings` : santé du système, modèles Ollama, état de l'espace de travail.

Exemple de prompt :

> Crée une application de gestion de projets avec Android, iPhone, Web,
> Windows, mode offline et synchronisation cloud.

## Ce que contient une application générée

- Spécification exécutable : entités, champs, relations, écrans, thème, copie.
- Flutter : `main.dart`, routeur, thème, coquille responsive, dashboard,
  paramètres, login, liste et formulaire par entité, validators, tests.
- Hive : magasin local, file de synchronisation, résolution de conflits simple
  (une modification locale en attente n'est pas écrasée).
- Supabase : `schema.sql` idempotent, index, triggers `updated_at`, RLS
  `auth.uid() = user_id`, instructions Google/Facebook.
- DevOps : `Dockerfile`, `docker-compose.yml`, `Caddyfile`, `vercel.json`,
  workflow GitHub Actions, `README.md` détaillé.
- Prototype HTML autonome, sans dépendance réseau, pour l'aperçu immédiat.

Sans variables `SUPABASE_URL` / `SUPABASE_ANON_KEY`, l'application générée
démarre en mode hors ligne avec une session locale. Avec ces variables, elle
active l'authentification cloud et la synchronisation.

## API du studio

Toutes les routes sont sous `/api`, en JSON, avec vérification de session,
contrôle de propriété, limitation de débit et protection same-origin pour les
écritures.

| Méthode | Route | Rôle |
| --- | --- | --- |
| `POST` | `/api/register` | Création de compte (rate limité) |
| `GET/POST` | `/api/projects` | Liste / création de projets |
| `GET/PATCH/DELETE` | `/api/projects/:id` | Détail, renommage, suppression |
| `POST` | `/api/projects/:id/generate` | Génération NDJSON en streaming |
| `GET/PUT` | `/api/projects/:id/files/*` | Lecture / édition d'un fichier |
| `POST` | `/api/projects/:id/repair` | Réparation ciblée |
| `GET` | `/api/projects/:id/export` | ZIP en streaming |
| `GET` | `/api/preview/:id` | Prototype HTML sandboxé |
| `GET` | `/api/health` | Santé base de données et configuration |
| `GET` | `/api/models` | Modèles Ollama disponibles |
| `POST` | `/api/ai/enhance` | Enrichissement de spécification |

Formats invalides → `400`, non authentifié → `401`, ressource d'un autre
utilisateur → `404`, limite atteinte → `429`, conflit → `409`.

## Tests, lint et CI

~~~bash
npm run lint
npm run typecheck
npm run test
npm run coverage
npm run build
~~~

La CI GitHub Actions installe les dépendances, génère le client Prisma, valide
les deux schémas, lance lint, TypeScript, tests, couverture et build. **Aucune
migration n'est exécutée en CI.** Les rapports sont envoyés à Codecov
(`codecov.yml`). Pour un dépôt privé, ajoutez le secret `CODECOV_TOKEN`.

## Déploiement Vercel

1. Créez un projet Supabase et récupérez l'URL PostgreSQL (port 6543,
   `pgbouncer=true`) ainsi que la clé anon pour les applications générées.
2. Appliquez les migrations du studio depuis votre machine :

   ~~~bash
   DATABASE_URL="postgresql://..." npm run pg:deploy
   ~~~

3. Importez le dépôt dans Vercel. `vercel.json` impose `npm ci` et
   `npm run build:vercel` (génération du client PostgreSQL).
4. Variables Vercel : `AUTH_SECRET`, `AUTH_URL` (domaine final),
   `AUTH_TRUST_HOST=true`, `DATABASE_URL`, `NEXT_PUBLIC_APP_URL`, et Ollama si
   une URL publique existe.
5. Déployez avec `vercel --prod` ou via l'intégration Git.
6. Ajoutez votre domaine dans **Settings → Domains**, puis créez les
   enregistrements DNS demandés (A/CNAME). Mettez à jour `AUTH_URL` et
   `NEXT_PUBLIC_APP_URL` avec `https://votre-domaine`.

### Déploiement automatique depuis GitHub

Le dépôt `https://github.com/kolouba/kolouble-IA` est prêt pour l'intégration
Git de Vercel :

1. Sur [vercel.com/new](https://vercel.com/new), importez
   `kolouba/kolouble-IA` (branche de production : `main`).
2. Conservez le preset **Next.js** : `vercel.json` impose `npm ci`,
   `npm run build:vercel` (client Prisma PostgreSQL) et la région `cdg1`.
3. Dans **Settings → Environment Variables**, ajoutez pour Production et
   Preview :
   - obligatoires : `DATABASE_URL` (Supabase, port 6543,
     `pgbouncer=true`), `AUTH_SECRET` (`openssl rand -base64 32`),
     `AUTH_TRUST_HOST=true`, `AUTH_URL`, `NEXT_PUBLIC_APP_URL` ;
   - facultatives : `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET`,
     `FACEBOOK_CLIENT_ID` / `FACEBOOK_CLIENT_SECRET`, `GITHUB_CLIENT_ID` /
     `GITHUB_CLIENT_SECRET`, clés IA, `FIGMA_TOKEN`.
4. Appliquez les migrations PostgreSQL avant le premier déploiement
   (`npm run pg:deploy`, étape 2 ci-dessus).
5. Chaque push sur `main` redéploie automatiquement. Après l'ajout du domaine,
   mettez à jour `AUTH_URL` et `NEXT_PUBLIC_APP_URL` puis relancez un
   déploiement.

`.vercelignore` exclut les secrets, bases SQLite, journaux et espaces de
travail locaux de l'envoi vers Vercel.

En ligne de commande, après `npx vercel login` :

~~~bash
npx vercel link
npx vercel --prod
~~~

Sur Vercel, le miroir disque `WORKSPACE_ROOT` est désactivé : la base de données
reste la source de vérité, l'export ZIP est généré à la demande.

## Auto-hébergement Docker + domaine

~~~bash
cp .env.example .env
# Renseignez AUTH_SECRET, SITE_DOMAIN et ACME_EMAIL
docker compose up -d --build
curl -fsS http://127.0.0.1:3000/api/health
~~~

Le studio est publié sur `127.0.0.1:3000` et le bac à sable sur
`127.0.0.1:4300`. Les deux conteneurs tournent en utilisateur non privilégié,
avec `no-new-privileges` et toutes les capacités supprimées. Les données SQLite
et l'espace de travail sont conservés dans le volume `kolouble-data`.

Pour HTTPS automatique avec Caddy :

~~~bash
SITE_DOMAIN=apps.exemple.ci ACME_EMAIL=admin@exemple.ci \
  docker compose --profile proxy up -d
~~~

Pointez le DNS du domaine vers le serveur, ouvrez les ports 80/443 et vérifiez
`https://apps.exemple.ci/api/health`. Caddy obtient et renouvelle le certificat.

Mise à jour :

~~~bash
docker compose build --pull
docker compose up -d
~~~

Sauvegarde de la base :

~~~bash
docker run --rm -v kolouble-ia_kolouble-data:/data -v "$PWD":/backup alpine \
  tar czf /backup/kolouble-data.tgz -C /data .
~~~

Le nom exact du volume peut varier : `docker volume ls`.

## Serveur de prévisualisation sandbox

Le studio possède déjà un aperçu intégré (`/api/preview/:id`) protégé par une CSP
`sandbox allow-scripts`. Pour prévisualiser un prototype exporté dans un
conteneur isolé :

~~~bash
mkdir -p sandbox/site
# Depuis le ZIP exporté, copiez prototype/index.html
cp /chemin/vers/prototype/index.html sandbox/site/index.html

docker compose up -d sandbox
# http://127.0.0.1:4300
~~~

Ou sans Docker :

~~~bash
SANDBOX_ROOT=./sandbox/site npm run sandbox
~~~

Le serveur ne lit que `index.html` (4 Mo maximum), refuse les méthodes autres
que GET/HEAD, interdit les liens symboliques, ajoute une CSP sans réseau,
`noindex`, `no-store` et ne s'écoute que sur la boucle locale par défaut.

## Sécurité

- Aucun secret n'est écrit dans les applications générées ; seule la clé
  **anon** Supabase est destinée au client, jamais `service_role`.
- `.env` est ignoré par Git et Docker (`.dockerignore`).
- Les chemins générés sont normalisés ; `..`, liens symboliques et fichiers hors
  espace de travail sont refusés.
- Les écritures vérifient l'origine, la session et la propriété du projet.
- Les routes sensibles sont limitées en débit (mémoire du processus).
- Les ZIP et aperçus utilisent `no-store`, `nosniff` et une CSP restrictive.
- Les conteneurs s'exécutent sans privilèges, avec les capacités supprimées.
- Limite connue : la limitation de débit en mémoire n'est pas distribuée entre
  plusieurs instances serverless.

## Dépannage

| Symptôme | Piste |
| --- | --- |
| `@prisma/client did not initialize` | `npm run prisma:generate` |
| Base locale absente ou obsolète | `npm run db:deploy` |
| Ollama indisponible | Vérifiez `ollama serve` et `OLLAMA_BASE_URL` |
| Modèles absents dans `/settings` | `ollama pull <modèle>`, puis rechargez |
| Aperçu vide | Regénérez le projet ; vérifiez la CSP dans la console |
| Connexion impossible en production | `AUTH_URL`, `AUTH_TRUST_HOST` et DNS |
| Conteneur bloqué au démarrage | `AUTH_SECRET` absent ou volume `/data` non inscriptible |
| Permission refusée sur le volume Docker | Adaptez les droits du volume à l'UID 1001 |

---

Généré et maintenu pour un usage local et auto-hébergé. Les applications
produites restent votre propriété ; relisez toujours le code généré avant une
mise en production.

---

Propulsé par [On-Brade.Com](https://www.on-brade.com) · +225 07 47 70 04 04 · 05 55 56 57 80
