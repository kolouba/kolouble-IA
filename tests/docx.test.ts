import { deflateRawSync } from "node:zlib";
import { describe, expect, it } from "vitest";
import { DocxError, extractDocxText } from "@/lib/docx";

function buildZip(files: Array<{ name: string; content: string; store?: boolean }>): Buffer {
  const locals: Buffer[] = [];
  const centrals: Buffer[] = [];
  let offset = 0;
  for (const file of files) {
    const name = Buffer.from(file.name, "utf8");
    const raw = Buffer.from(file.content, "utf8");
    const data = file.store ? raw : deflateRawSync(raw);
    const method = file.store ? 0 : 8;

    const local = Buffer.alloc(30);
    local.writeUInt32LE(0x04034b50, 0);
    local.writeUInt16LE(20, 4);
    local.writeUInt16LE(0, 6);
    local.writeUInt16LE(method, 8);
    local.writeUInt32LE(0, 10);
    local.writeUInt32LE(0, 14);
    local.writeUInt32LE(data.length, 18);
    local.writeUInt32LE(raw.length, 22);
    local.writeUInt16LE(name.length, 26);
    local.writeUInt16LE(0, 28);
    locals.push(local, name, data);

    const central = Buffer.alloc(46);
    central.writeUInt32LE(0x02014b50, 0);
    central.writeUInt16LE(20, 4);
    central.writeUInt16LE(20, 6);
    central.writeUInt16LE(0, 8);
    central.writeUInt16LE(method, 10);
    central.writeUInt32LE(0, 12);
    central.writeUInt32LE(0, 16);
    central.writeUInt32LE(data.length, 20);
    central.writeUInt32LE(raw.length, 24);
    central.writeUInt16LE(name.length, 28);
    central.writeUInt16LE(0, 30);
    central.writeUInt16LE(0, 32);
    central.writeUInt16LE(0, 34);
    central.writeUInt16LE(0, 36);
    central.writeUInt32LE(0, 38);
    central.writeUInt32LE(offset, 42);
    centrals.push(central, name);

    offset += local.length + name.length + data.length;
  }

  const centralBuffer = Buffer.concat(centrals);
  const eocd = Buffer.alloc(22);
  eocd.writeUInt32LE(0x06054b50, 0);
  eocd.writeUInt16LE(0, 4);
  eocd.writeUInt16LE(0, 6);
  eocd.writeUInt16LE(files.length, 8);
  eocd.writeUInt16LE(files.length, 10);
  eocd.writeUInt32LE(centralBuffer.length, 12);
  eocd.writeUInt32LE(offset, 16);
  eocd.writeUInt16LE(0, 20);

  return Buffer.concat([...locals, centralBuffer, eocd]);
}

function documentXml(body: string): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
<w:body>${body}</w:body></w:document>`;
}

describe("extractDocxText", () => {
  it("extrait les paragraphes et décode les entités", () => {
    const buffer = buildZip([
      { name: "[Content_Types].xml", content: "<Types/>", store: true },
      {
        name: "word/document.xml",
        content: documentXml(
          "<w:p><w:r><w:t>Application de gestion</w:t></w:r></w:p>" +
            "<w:p><w:r><w:t>Clients &amp; factures</w:t></w:r><w:tab/><w:r><w:t>2026</w:t></w:r></w:p>" +
            "<w:p><w:r><w:t>Suivi des dons &lt;ONG&gt;</w:t></w:r></w:p>",
        ),
      },
    ]);
    const result = extractDocxText(buffer);
    expect(result.text).toContain("Application de gestion");
    expect(result.text).toContain("Clients & factures\t2026");
    expect(result.text).toContain("Suivi des dons <ONG>");
    expect(result.paragraphs).toBe(3);
  });

  it("refuse un fichier qui n'est pas une archive", () => {
    expect(() => extractDocxText(Buffer.from("pas un docx"))).toThrow(DocxError);
  });

  it("refuse une archive sans document principal", () => {
    const buffer = buildZip([{ name: "word/styles.xml", content: "<styles/>" }]);
    expect(() => extractDocxText(buffer)).toThrow(DocxError);
  });

  it("refuse un document vide", () => {
    const buffer = buildZip([{ name: "word/document.xml", content: documentXml("<w:p/>") }]);
    expect(() => extractDocxText(buffer)).toThrow(DocxError);
  });
});
