export function stripAccents(input: string): string {
  return input
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/œ/g, "oe")
    .replace(/æ/g, "ae")
    .replace(/[:]/g, " ")
    .replace(/['’]/g, " ");
}

export function slugify(input: string): string {
  return stripAccents(input)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60) || "application";
}

export function snakeCase(input: string): string {
  return stripAccents(input)
    .replace(/([a-z0-9])([A-Z])/g, "$1_$2")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .replace(/^(\d)/, "x$1") || "item";
}

export function camelCase(input: string): string {
  const snake = snakeCase(input);
  return snake.replace(/_([a-z0-9])/g, (_, char: string) => char.toUpperCase());
}

export function pascalCase(input: string): string {
  const camel = camelCase(input);
  return camel.charAt(0).toUpperCase() + camel.slice(1);
}

export function packageNameFor(input: string): string {
  const base = snakeCase(stripAccents(input).toLowerCase());
  return (base.length > 2 ? base : "kolouble_app").slice(0, 40);
}

export function escapeDartString(input: string): string {
  return input
    .replace(/\\/g, "\\\\")
    .replace(/'/g, "\\'")
    .replace(/\$/g, "\\$")
    .replace(/\r?\n/g, " ");
}

export function escapeSqlString(input: string): string {
  return input.replace(/'/g, "''");
}

export function truncate(input: string, max: number): string {
  if (input.length <= max) return input;
  return `${input.slice(0, Math.max(0, max - 1)).trimEnd()}…`;
}
