import type { AppSpec, EntitySpec, FieldSpec } from "@/lib/spec";
import { escapeSqlString as s } from "@/lib/naming";
import type { GeneratedFile } from "./types";

function columnType(field: FieldSpec): string {
  switch (field.type) {
    case "number":
      return "numeric(14, 2)";
    case "boolean":
      return "boolean not null default false";
    case "date":
      return "timestamptz";
    case "longtext":
      return "text";
    default:
      return "text";
  }
}

function columnDefinition(field: FieldSpec): string {
  const base = `  ${field.key} ${columnType(field)}`;
  if (field.type === "status") {
    const options = field.options ?? ["Actif"];
    const defaultValue = s(options[0] ?? "Actif");
    const allowed = options.map((option) => `'${s(option)}'`).join(", ");
    return `${base} not null default '${defaultValue}' check (${field.key} in (${allowed}))`;
  }
  if (field.type === "text" && field.required) return `${base} not null`;
  if (field.type === "number" && field.required) return `${base} not null`;
  if (field.type === "date" && field.required) return `${base} not null`;
  return base;
}

function tableSql(entity: EntitySpec, saas: boolean): string {
  const columns = entity.fields.map((field) => columnDefinition(field)).join(",\n");
  const organizationColumn = saas
    ? `  organization_id uuid references public.organizations (id) on delete cascade,\n`
    : "";
  const organizationPolicies = saas
    ? ["select", "insert", "update", "delete"]
        .map((operation) => {
          const name = `${entity.key}_${operation}_org`;
          if (operation === "insert") {
            return `drop policy if exists "${name}" on public.${entity.key};
create policy "${name}" on public.${entity.key}
  for insert with check (public.kolouble_is_member(organization_id) and user_id = auth.uid());`;
          }
          if (operation === "update") {
            return `drop policy if exists "${name}" on public.${entity.key};
create policy "${name}" on public.${entity.key}
  for update using (public.kolouble_is_member(organization_id))
  with check (public.kolouble_is_member(organization_id));`;
          }
          return `drop policy if exists "${name}" on public.${entity.key};
create policy "${name}" on public.${entity.key}
  for ${operation} using (public.kolouble_is_member(organization_id));`;
        })
        .join("\n")
    : "";
  const ownPolicies = saas ? "" : ["select", "insert", "update", "delete"]
    .map((operation) => {
      const name = `${entity.key}_${operation}_own`;
      if (operation === "insert") {
        return `drop policy if exists "${name}" on public.${entity.key};
create policy "${name}" on public.${entity.key}
  for insert with check (auth.uid() = user_id);`;
      }
      if (operation === "update") {
        return `drop policy if exists "${name}" on public.${entity.key};
create policy "${name}" on public.${entity.key}
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);`;
      }
      return `drop policy if exists "${name}" on public.${entity.key};
create policy "${name}" on public.${entity.key}
  for ${operation} using (auth.uid() = user_id);`;
    })
    .join("\n");

  return `-- ── ${entity.plural} ─────────────────────────────────────────────────────────
create table if not exists public.${entity.key} (
  id uuid primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
${organizationColumn}${columns},
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted boolean not null default false
);

create index if not exists ${entity.key}_user_idx on public.${entity.key} (user_id);${saas ? `\ncreate index if not exists ${entity.key}_organization_idx on public.${entity.key} (organization_id);` : ""}
create index if not exists ${entity.key}_updated_idx on public.${entity.key} (updated_at);

alter table public.${entity.key} enable row level security;
${ownPolicies}
${organizationPolicies}

drop trigger if exists ${entity.key}_touch_updated_at on public.${entity.key};
create trigger ${entity.key}_touch_updated_at
  before update on public.${entity.key}
  for each row execute function public.kolouble_touch_updated_at();${saas ? `

drop trigger if exists ${entity.key}_assign_organization on public.${entity.key};
create trigger ${entity.key}_assign_organization
  before insert on public.${entity.key}
  for each row execute function public.kolouble_assign_organization();` : ""}`;
}

export function buildSupabaseSql(spec: AppSpec): string {
  const tables = spec.entities.map((entity) => tableSql(entity, spec.saas)).join("\n\n");
  const saas = spec.saas ? `${saasSql(spec)}\n\n` : "";
  return `-- =============================================================================
-- ${spec.appName} — schéma Supabase généré par Kôloublé IA
-- À exécuter dans Supabase → SQL Editor, puis activer les providers d'auth.
-- Chaque ligne est protégée par RLS : auth.uid() = user_id.${spec.saas ? "\n-- Mode SaaS : organisation_id + appartenance vérifiée par kolouble_is_member()." : ""}
-- =============================================================================

create or replace function public.kolouble_touch_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

${saas}${tables}

-- Les politiques RLS s'appliquent aux clients anon/authenticated.
-- La clé service_role reste réservée aux scripts serveur de confiance.
`;
}

function saasSql(spec: AppSpec): string {
  const providers = spec.billing.providers.map((provider) => `'${s(provider)}'`).join(", ");
  const planValues = spec.billing.plans
    .map(
      (plan) =>
        `  ('${s(plan.key)}', '${s(plan.label)}', ${Number.isFinite(plan.price) ? plan.price : 0}, '${s(
          plan.interval,
        )}', '${s(JSON.stringify(plan.features))}'::jsonb)`,
    )
    .join(",\n");

  return `-- ── SaaS multi-tenant ───────────────────────────────────────────────────────
create extension if not exists pgcrypto;

create table if not exists public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  owner_id uuid not null references auth.users (id) on delete cascade,
  plan_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.organization_members (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  role text not null default 'member' check (role in ('owner', 'admin', 'member')),
  created_at timestamptz not null default now(),
  unique (organization_id, user_id)
);
create index if not exists organization_members_user_idx on public.organization_members (user_id);

create table if not exists public.plans (
  id text primary key,
  label text not null,
  price numeric(14, 2) not null default 0,
  interval text not null default 'month' check (interval in ('month', 'year')),
  features jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);

insert into public.plans (id, label, price, interval, features) values
${planValues}
on conflict (id) do nothing;

create table if not exists public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  plan_id text not null references public.plans (id),
  status text not null default 'trialing'
    check (status in ('trialing', 'active', 'past_due', 'canceled')),
  provider text not null check (provider in (${providers})),
  external_ref text,
  current_period_end timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists subscriptions_org_idx on public.subscriptions (organization_id);

create table if not exists public.payment_transactions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  subscription_id uuid references public.subscriptions (id) on delete set null,
  provider text not null check (provider in (${providers})),
  amount numeric(14, 2) not null check (amount >= 0),
  currency text not null default '${s(spec.billing.currency)}',
  status text not null default 'pending'
    check (status in ('pending', 'succeeded', 'failed', 'refunded')),
  reference text,
  created_at timestamptz not null default now()
);
create index if not exists payment_transactions_org_idx on public.payment_transactions (organization_id);

create or replace function public.kolouble_is_member(org uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.organization_members
    where organization_id = org and user_id = auth.uid()
  );
$$;

create or replace function public.kolouble_is_org_owner(org uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.organizations
    where id = org and owner_id = auth.uid()
  );
$$;

create or replace function public.kolouble_assign_organization()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.organization_id is null then
    select member.organization_id into new.organization_id
    from public.organization_members member
    where member.user_id = auth.uid()
    order by member.created_at asc
    limit 1;
  end if;
  return new;
end;
$$;

create or replace function public.kolouble_bootstrap_organization()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  organization_id uuid;
  display_name text;
begin
  display_name := coalesce(
    nullif(new.raw_user_meta_data ->> 'full_name', ''),
    nullif(new.raw_user_meta_data ->> 'name', ''),
    split_part(new.email, '@', 1),
    'Mon organisation'
  );
  insert into public.organizations (name, slug, owner_id)
  values (
    display_name,
    lower(regexp_replace(display_name, '[^a-zA-Z0-9]+', '-', 'g')) || '-' || new.id::text,
    new.id
  )
  returning id into organization_id;
  insert into public.organization_members (organization_id, user_id, role)
  values (organization_id, new.id, 'owner')
  on conflict (organization_id, user_id) do nothing;
  return new;
end;
$$;

drop trigger if exists kolouble_bootstrap_organization on auth.users;
create trigger kolouble_bootstrap_organization
  after insert on auth.users
  for each row execute function public.kolouble_bootstrap_organization();

alter table public.organizations enable row level security;
alter table public.organization_members enable row level security;
alter table public.plans enable row level security;
alter table public.subscriptions enable row level security;
alter table public.payment_transactions enable row level security;

drop policy if exists organizations_select_member on public.organizations;
create policy organizations_select_member on public.organizations
  for select using (public.kolouble_is_member(id));
drop policy if exists organizations_insert_owner on public.organizations;
create policy organizations_insert_owner on public.organizations
  for insert with check (owner_id = auth.uid());
drop policy if exists organizations_update_owner on public.organizations;
create policy organizations_update_owner on public.organizations
  for update using (public.kolouble_is_org_owner(id))
  with check (public.kolouble_is_org_owner(id));
drop policy if exists organizations_delete_owner on public.organizations;
create policy organizations_delete_owner on public.organizations
  for delete using (public.kolouble_is_org_owner(id));

drop policy if exists organization_members_select on public.organization_members;
create policy organization_members_select on public.organization_members
  for select using (user_id = auth.uid() or public.kolouble_is_member(organization_id));
drop policy if exists organization_members_insert_owner on public.organization_members;
create policy organization_members_insert_owner on public.organization_members
  for insert with check (public.kolouble_is_org_owner(organization_id));
drop policy if exists organization_members_update_owner on public.organization_members;
create policy organization_members_update_owner on public.organization_members
  for update using (public.kolouble_is_org_owner(organization_id))
  with check (public.kolouble_is_org_owner(organization_id));
drop policy if exists organization_members_delete_owner on public.organization_members;
create policy organization_members_delete_owner on public.organization_members
  for delete using (public.kolouble_is_org_owner(organization_id));

drop policy if exists plans_select_authenticated on public.plans;
create policy plans_select_authenticated on public.plans
  for select to authenticated using (true);

drop policy if exists subscriptions_select_member on public.subscriptions;
create policy subscriptions_select_member on public.subscriptions
  for select using (public.kolouble_is_member(organization_id));
drop policy if exists subscriptions_write_owner on public.subscriptions;
create policy subscriptions_write_owner on public.subscriptions
  for insert with check (public.kolouble_is_org_owner(organization_id));
drop policy if exists subscriptions_update_owner on public.subscriptions;
create policy subscriptions_update_owner on public.subscriptions
  for update using (public.kolouble_is_org_owner(organization_id))
  with check (public.kolouble_is_org_owner(organization_id));
drop policy if exists subscriptions_delete_owner on public.subscriptions;
create policy subscriptions_delete_owner on public.subscriptions
  for delete using (public.kolouble_is_org_owner(organization_id));

drop policy if exists payment_transactions_select_member on public.payment_transactions;
create policy payment_transactions_select_member on public.payment_transactions
  for select using (public.kolouble_is_member(organization_id));
drop policy if exists payment_transactions_insert_owner on public.payment_transactions;
create policy payment_transactions_insert_owner on public.payment_transactions
  for insert with check (public.kolouble_is_org_owner(organization_id));

drop trigger if exists organizations_touch_updated_at on public.organizations;
create trigger organizations_touch_updated_at
  before update on public.organizations
  for each row execute function public.kolouble_touch_updated_at();

drop trigger if exists subscriptions_touch_updated_at on public.subscriptions;
create trigger subscriptions_touch_updated_at
  before update on public.subscriptions
  for each row execute function public.kolouble_touch_updated_at();`;
}

function dartString(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/'/g, "\\'").replace(/\$/g, "\\$");
}

function buildBillingDart(spec: AppSpec): string {
  const plans = spec.billing.plans
    .map(
      (plan) => `  BillingPlan(
    key: '${dartString(plan.key)}',
    label: '${dartString(plan.label)}',
    price: ${Number.isFinite(plan.price) ? plan.price : 0},
    interval: '${dartString(plan.interval)}',
    features: const [${plan.features.map((feature) => `'${dartString(feature)}'`).join(", ")}],
  ),`,
    )
    .join("\n");
  const providers = spec.billing.providers.map((provider) => `'${dartString(provider)}'`).join(", ");
  return `// Généré par Kôloublé IA — configuration de facturation SaaS.
// Ne stockez aucune clé secrète dans ce fichier : utilisez les variables
// d'environnement de votre backend ou les secrets Supabase.

class BillingPlan {
  const BillingPlan({
    required this.key,
    required this.label,
    required this.price,
    required this.interval,
    required this.features,
  });

  final String key;
  final String label;
  final double price;
  final String interval;
  final List<String> features;

  String get priceLabel => '\${price.toStringAsFixed(0)} \${BillingConfig.currency}';
}

class BillingConfig {
  static const String currency = '${dartString(spec.billing.currency)}';
  static const bool enabled = ${spec.billing.enabled ? "true" : "false"};

  static const List<BillingPlan> plans = [
${plans}
  ];

  static const List<String> providers = [${providers}];

  static const Map<String, String> providerLabels = {
${spec.billing.providers
  .map((provider) => {
    const labels: Record<string, string> = {
      stripe: "Carte bancaire (Stripe)",
      "orange-money": "Orange Money",
      "mtn-money": "MTN Money",
      wave: "Wave",
      "moov-money": "Moov Money",
    };
    return `    '${dartString(provider)}': '${dartString(labels[provider] ?? provider)}',`;
  })
  .join("\n")}
  };

  static const Map<String, String> providerSecretNames = {
${spec.billing.providers
  .map((provider) => {
    const names: Record<string, string> = {
      stripe: "STRIPE_SECRET_KEY",
      "orange-money": "ORANGE_MONEY_API_KEY",
      "mtn-money": "MTN_MONEY_API_KEY",
      wave: "WAVE_API_KEY",
      "moov-money": "MOOV_MONEY_API_KEY",
    };
    return `    '${dartString(provider)}': '${dartString(names[provider] ?? `${provider.toUpperCase()}_API_KEY`)}',`;
  })
  .join("\n")}
  };
}

class SubscriptionState {
  const SubscriptionState({
    required this.organizationId,
    required this.planKey,
    required this.status,
    this.currentPeriodEnd,
  });

  final String organizationId;
  final String planKey;
  final String status;
  final DateTime? currentPeriodEnd;

  bool get isActive => status == 'active' || status == 'trialing';
}
`;
}

function buildSaasDoc(spec: AppSpec): string {
  return `# ${spec.appName} — exploitation SaaS

Ce projet a été généré en mode SaaS multi-tenant. La base Supabase contient
les organisations, les membres, les plans, les abonnements et les transactions.

## 1. Base de données

1. Ouvrez **Supabase → SQL Editor**.
2. Exécutez intégralement \`supabase/schema.sql\`.
3. Les tables métier reçoivent une colonne \`organization_id\` et des politiques
   RLS qui vérifient l'appartenance via \`kolouble_is_member()\`.
4. À l'insertion, le trigger \`kolouble_assign_organization()\` rattache
   automatiquement la ligne à l'organisation la plus ancienne de
   l'utilisateur connecté. Pour proposer un sélecteur multi-organisations,
   renseignez explicitement \`organization_id\` depuis le client.
5. À l'inscription, \`kolouble_bootstrap_organization()\` crée une organisation
   personnelle et y rattache le nouvel utilisateur comme propriétaire. Adaptez
   ce trigger pour un parcours d'équipe ou une validation manuelle.

## 2. Plans et moyens de paiement

Plans prévus :

${spec.billing.plans.map((plan) => `- **${plan.label}** — ${plan.price} ${spec.billing.currency} / ${plan.interval}`).join("\n")}

Moyens de paiement : ${spec.billing.providers.join(", ")}.

Les noms de secrets attendus sont listés dans \`lib/config/billing.dart\`
(\`providerSecretNames\`). Configurez-les dans Supabase → Edge Functions →
Secrets, ou dans le gestionnaire de secrets de votre hébergeur. Aucune clé ne
doit être commitée ni intégrée au client Flutter.

## 3. Cycle d'abonnement

1. Créez l'organisation et ajoutez le propriétaire dans \`organization_members\`.
2. Créez un abonnement \`trialing\` rattaché au plan choisi.
3. Le backend (Edge Function ou serveur) crée la session de paiement chez le
   fournisseur, puis met à jour \`subscriptions.status\` et
   \`payment_transactions\` à réception du webhook signé.
4. Vérifiez toujours la signature du webhook côté serveur avant d'écrire en base.

## 4. Requêtes utiles

\`\`\`sql
-- Organisations de l'utilisateur connecté
select o.*
from public.organizations o
join public.organization_members m on m.organization_id = o.id
where m.user_id = auth.uid();
\`\`\`

## 5. Sécurité

- RLS activé sur les cinq tables SaaS et sur toutes les tables métier.
- Les écritures d'abonnement sont réservées au propriétaire de l'organisation.
- Les transactions ne sont lisibles que par les membres de l'organisation.
- La clé \`service_role\` ne doit jamais être exposée dans l'application Flutter.
`;
}

export function buildSupabaseFiles(spec: AppSpec): GeneratedFile[] {
  const files: GeneratedFile[] = [
    {
      path: "supabase/schema.sql",
      content: buildSupabaseSql(spec),
      language: "sql",
      source: "scaffold",
    },
  ];
  if (spec.saas) {
    files.push(
      {
        path: "lib/config/billing.dart",
        content: buildBillingDart(spec),
        language: "dart",
        source: "scaffold",
      },
      {
        path: "docs/SAAS.md",
        content: buildSaasDoc(spec),
        language: "markdown",
        source: "scaffold",
      },
    );
  }
  return files;
}
