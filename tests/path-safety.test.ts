import { describe, expect, it } from "vitest";
import {
  isPreviewPath,
  languageForPath,
  normalizeProjectPath,
  UnsafePathError,
} from "@/lib/path-safety";

describe("normalizeProjectPath", () => {
  it("normalise les chemins relatifs autorisés", () => {
    expect(normalizeProjectPath("lib/main.dart")).toBe("lib/main.dart");
    expect(normalizeProjectPath("lib//features//projects/page.dart")).toBe("lib/features/projects/page.dart");
    expect(normalizeProjectPath("lib\\core\\router\\app_router.dart")).toBe("lib/core/router/app_router.dart");
    expect(normalizeProjectPath("  README.md  ")).toBe("README.md");
  });

  it("accepte les fichiers sans extension explicitement autorisés", () => {
    expect(normalizeProjectPath("Dockerfile")).toBe("Dockerfile");
    expect(normalizeProjectPath(".env.example")).toBe(".env.example");
    expect(normalizeProjectPath(".gitignore")).toBe(".gitignore");
    expect(normalizeProjectPath("web/CNAME")).toBe("web/CNAME");
    expect(normalizeProjectPath(".github/workflows/flutter.yml")).toBe(".github/workflows/flutter.yml");
  });

  it("refuse les chemins absolus et les traversées", () => {
    for (const candidate of [
      "/etc/passwd",
      "C:/Windows/system.ini",
      "../secret.txt",
      "lib/../../secret.dart",
      "..\\secret.dart",
      "lib/./main.dart",
    ]) {
      expect(() => normalizeProjectPath(candidate)).toThrow(UnsafePathError);
    }
  });

  it("refuse les caractères et extensions dangereux", () => {
    expect(() => normalizeProjectPath("lib/main.exe")).toThrow(/Extension non autorisée/);
    expect(() => normalizeProjectPath("lib/main")).toThrow(/Extension de fichier requise/);
    expect(() => normalizeProjectPath("lib/évil.dart")).toThrow(/Segment de chemin interdit/);
    expect(() => normalizeProjectPath("lib/.secret.dart")).toThrow(/Fichier caché non autorisé/);
    expect(() => normalizeProjectPath(".env")).toThrow(/Fichier caché non autorisé/);
    expect(() => normalizeProjectPath("lib/\u0000main.dart")).toThrow(/Caractère nul/);
    expect(() => normalizeProjectPath(42)).toThrow(/chaîne/);
    expect(() => normalizeProjectPath("   ")).toThrow(/Chemin vide/);
  });

  it("limite la longueur et la profondeur", () => {
    expect(() => normalizeProjectPath(`${"a".repeat(200)}.dart`)).toThrow(/trop long/);
    const deep = Array.from({ length: 12 }, (_, index) => `d${index}`).join("/");
    expect(() => normalizeProjectPath(`${deep}/main.dart`)).toThrow(/Trop de niveaux/);
  });
});

describe("helpers de fichiers", () => {
  it("associe les langages", () => {
    expect(languageForPath("lib/main.dart")).toBe("dart");
    expect(languageForPath("pubspec.yaml")).toBe("yaml");
    expect(languageForPath("README.md")).toBe("markdown");
    expect(languageForPath("scripts/build.sh")).toBe("shell");
    expect(languageForPath("config")).toBe("text");
  });

  it("identifie le dossier de preview", () => {
    expect(isPreviewPath("prototype/index.html")).toBe(true);
    expect(isPreviewPath("lib/main.dart")).toBe(false);
  });
});
