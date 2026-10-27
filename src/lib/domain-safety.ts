import { lookup } from "node:dns/promises";
import { isIP } from "node:net";

export class UnsafeHostError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "UnsafeHostError";
  }
}

export function isPrivateIPv4(address: string): boolean {
  const parts = address.split(".").map((part) => Number(part));
  if (parts.length !== 4 || parts.some((part) => !Number.isInteger(part) || part < 0 || part > 255)) {
    return true;
  }
  const [a, b] = parts as [number, number, number, number];
  return (
    a === 0 ||
    a === 10 ||
    a === 127 ||
    (a === 100 && b >= 64 && b <= 127) ||
    (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 0) ||
    (a === 192 && b === 168) ||
    (a === 198 && (b === 18 || b === 19)) ||
    a >= 224
  );
}

export function isPrivateIPv6(address: string): boolean {
  const value = address.trim().toLowerCase().replace(/^\[|\]$/g, "").replace(/%.+$/, "");
  if (value === "::" || value === "::1" || value === "0:0:0:0:0:0:0:0" || value === "0:0:0:0:0:0:0:1") {
    return true;
  }
  if (value.startsWith("::ffff:")) {
    return isPrivateIPv4(value.slice(7));
  }
  if (/^f[cd][0-9a-f]{2}:/.test(value)) return true;
  if (/^fe[89ab][0-9a-f]:/.test(value)) return true;
  if (/^ff[0-9a-f]{2}:/.test(value)) return true;
  if (value.startsWith("2001:db8:") || value === "2001:db8::") return true;
  return false;
}

export function isPublicAddress(address: string): boolean {
  const family = isIP(address);
  if (family === 4) return !isPrivateIPv4(address);
  if (family === 6) return !isPrivateIPv6(address);
  return false;
}

const BLOCKED_SUFFIXES = [".localhost", ".local", ".internal", ".home.arpa", ".lan", ".test", ".invalid"];

export async function assertPublicHostname(hostname: string): Promise<void> {
  const host = hostname.trim().toLowerCase().replace(/\.$/, "");
  if (!host) throw new UnsafeHostError("Nom d'hôte vide.");
  if (host === "localhost" || BLOCKED_SUFFIXES.some((suffix) => host.endsWith(suffix))) {
    throw new UnsafeHostError("Les domaines locaux ne peuvent pas être vérifiés.");
  }
  if (isIP(host)) {
    if (!isPublicAddress(host)) throw new UnsafeHostError("Adresse IP privée refusée.");
    return;
  }
  let records: Array<{ address: string }>;
  try {
    records = await lookup(host, { all: true, verbatim: true });
  } catch {
    throw new UnsafeHostError("Domaine introuvable dans le DNS.");
  }
  if (records.length === 0) throw new UnsafeHostError("Aucune adresse DNS pour ce domaine.");
  for (const record of records) {
    if (!isPublicAddress(record.address)) {
      throw new UnsafeHostError("Ce domaine pointe vers une adresse privée.");
    }
  }
}
