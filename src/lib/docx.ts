import { inflateRawSync } from "node:zlib";

const EOCD_SIGNATURE = 0x06054b50;
const CENTRAL_SIGNATURE = 0x02014b50;
const LOCAL_SIGNATURE = 0x04034b50;
const EOCD_MIN_SIZE = 22;
const MAX_ENTRIES = 2_000;
const MAX_DOCUMENT_BYTES = 8_000_000;

export class DocxError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "DocxError";
  }
}

interface ZipEntry {
  name: string;
  compression: number;
  compressedSize: number;
  localOffset: number;
}

function findEndOfCentralDirectory(buffer: Buffer): number {
  const start = Math.max(0, buffer.length - 65_557);
  for (let offset = buffer.length - EOCD_MIN_SIZE; offset >= start; offset -= 1) {
    if (buffer.readUInt32LE(offset) === EOCD_SIGNATURE) return offset;
  }
  return -1;
}

function readCentralEntries(buffer: Buffer): ZipEntry[] {
  const eocd = findEndOfCentralDirectory(buffer);
  if (eocd < 0) throw new DocxError("Archive Word invalide : répertoire ZIP introuvable.");
  const entryCount = buffer.readUInt16LE(eocd + 10);
  if (entryCount <= 0 || entryCount > MAX_ENTRIES) {
    throw new DocxError("Archive Word invalide : nombre de fichiers incohérent.");
  }
  let offset = buffer.readUInt32LE(eocd + 16);
  const entries: ZipEntry[] = [];
  for (let index = 0; index < entryCount; index += 1) {
    if (offset + 46 > buffer.length || buffer.readUInt32LE(offset) !== CENTRAL_SIGNATURE) {
      throw new DocxError("Archive Word invalide : entrée ZIP corrompue.");
    }
    const compression = buffer.readUInt16LE(offset + 10);
    const compressedSize = buffer.readUInt32LE(offset + 20);
    const nameLength = buffer.readUInt16LE(offset + 28);
    const extraLength = buffer.readUInt16LE(offset + 30);
    const commentLength = buffer.readUInt16LE(offset + 32);
    const localOffset = buffer.readUInt32LE(offset + 42);
    const name = buffer.toString("utf8", offset + 46, offset + 46 + nameLength);
    entries.push({ name, compression, compressedSize, localOffset });
    offset += 46 + nameLength + extraLength + commentLength;
  }
  return entries;
}

function readEntryData(buffer: Buffer, entry: ZipEntry): Buffer {
  const local = entry.localOffset;
  if (local + 30 > buffer.length || buffer.readUInt32LE(local) !== LOCAL_SIGNATURE) {
    throw new DocxError("Archive Word invalide : en-tête local corrompu.");
  }
  const flags = buffer.readUInt16LE(local + 6);
  if (flags & 0x1) throw new DocxError("Les documents Word chiffrés ne sont pas pris en charge.");
  const method = buffer.readUInt16LE(local + 8);
  const nameLength = buffer.readUInt16LE(local + 26);
  const extraLength = buffer.readUInt16LE(local + 28);
  const dataStart = local + 30 + nameLength + extraLength;
  const dataEnd = dataStart + entry.compressedSize;
  if (dataEnd > buffer.length) throw new DocxError("Archive Word invalide : données tronquées.");
  const data = buffer.subarray(dataStart, dataEnd);
  if (method === 0) return Buffer.from(data);
  if (method === 8) {
    try {
      return inflateRawSync(data, { maxOutputLength: MAX_DOCUMENT_BYTES });
    } catch {
      throw new DocxError("Archive Word invalide : contenu illisible.");
    }
  }
  throw new DocxError("Compression Word non prise en charge.");
}

function decodeXmlEntities(value: string): string {
  return value
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#(\d+);/g, (_match, code: string) => {
      const value = Number(code);
      return Number.isFinite(value) && value > 0 && value < 0x10ffff ? String.fromCodePoint(value) : "";
    })
    .replace(/&amp;/g, "&");
}

function xmlToText(xml: string): string {
  return decodeXmlEntities(
    xml
      .replace(/<w:tab\b[^>]*\/>/g, "\t")
      .replace(/<w:br\b[^>]*\/>/g, "\n")
      .replace(/<\/w:(?:p|tr|tc)>/g, "\n")
      .replace(/<[^>]+>/g, ""),
  )
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export interface DocxExtraction {
  text: string;
  paragraphs: number;
}

export function extractDocxText(buffer: Buffer): DocxExtraction {
  if (buffer.length < EOCD_MIN_SIZE || buffer.readUInt32LE(0) !== LOCAL_SIGNATURE) {
    throw new DocxError("Ce fichier n'est pas un document Word (.docx).");
  }
  const entries = readCentralEntries(buffer);
  const document = entries.find((entry) => entry.name === "word/document.xml");
  if (!document) throw new DocxError("Document Word invalide : contentu principal absent.");
  const xml = readEntryData(buffer, document).toString("utf8");
  const text = xmlToText(xml);
  if (!text) throw new DocxError("Le document Word ne contient aucun texte exploitable.");
  return { text, paragraphs: text.split(/\n+/).filter(Boolean).length };
}
