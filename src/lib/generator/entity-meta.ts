import type { EntitySpec, FieldSpec } from "@/lib/spec";
import { primaryField } from "@/lib/spec";
import { camelCase, pascalCase, snakeCase } from "@/lib/naming";

const ICONS: Record<string, string> = {
  folder: "Icons.folder_outlined",
  users: "Icons.people_outline",
  task: "Icons.task_alt_outlined",
  invoice: "Icons.receipt_long_outlined",
  box: "Icons.inventory_2_outlined",
  cart: "Icons.shopping_bag_outlined",
  calendar: "Icons.event_outlined",
  badge: "Icons.badge_outlined",
  wallet: "Icons.account_balance_wallet_outlined",
  school: "Icons.school_outlined",
  health: "Icons.medical_services_outlined",
  event: "Icons.celebration_outlined",
  support: "Icons.support_agent_outlined",
  sparkles: "Icons.auto_awesome_outlined",
};

export interface EntityMeta {
  key: string;
  singularKey: string;
  className: string;
  featureDir: string;
  modelPath: string;
  modelImport: string;
  repositoryClass: string;
  repositoryPath: string;
  providerName: string;
  providerPath: string;
  listPageClass: string;
  formPageClass: string;
  listPagePath: string;
  formPagePath: string;
  route: string;
  icon: string;
  primary: FieldSpec;
  table: string;
  label: string;
  plural: string;
}

export function entityMeta(entity: EntitySpec): EntityMeta {
  const singularKey = entity.key.replace(/s$/, "") || entity.key;
  const className = pascalCase(singularKey);
  const providerName = `${camelCase(singularKey)}RepositoryProvider`;
  const featureDir = `lib/features/${entity.key}`;
  return {
    key: entity.key,
    singularKey,
    className,
    featureDir,
    modelPath: `${featureDir}/domain/models/${snakeCase(singularKey)}.dart`,
    modelImport: `../../domain/models/${snakeCase(singularKey)}.dart`,
    repositoryClass: `${className}Repository`,
    repositoryPath: `${featureDir}/data/${snakeCase(singularKey)}_repository.dart`,
    providerName,
    providerPath: `${featureDir}/presentation/providers/${snakeCase(singularKey)}_providers.dart`,
    listPageClass: `${className}ListPage`,
    formPageClass: `${className}FormPage`,
    listPagePath: `${featureDir}/presentation/pages/${snakeCase(singularKey)}_list_page.dart`,
    formPagePath: `${featureDir}/presentation/pages/${snakeCase(singularKey)}_form_page.dart`,
    route: `/${entity.key}`,
    icon: ICONS[entity.icon] ?? ICONS.sparkles!,
    primary: primaryField(entity),
    table: entity.key,
    label: entity.label,
    plural: entity.plural,
  };
}

export function allEntityMeta(entityList: EntitySpec[]): EntityMeta[] {
  return entityList.map(entityMeta);
}

export function dartColor(hex: string): string {
  return `0xFF${hex.replace("#", "").toUpperCase()}`;
}
