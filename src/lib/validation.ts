import { z } from "zod";
import { AI_PROVIDER_IDS } from "@/lib/ai";
import { MODEL_PATTERN } from "@/lib/env";
import { DEPLOY_TARGETS, isTemplateKey } from "@/lib/spec";

export const promptSchema = z
  .string()
  .trim()
  .min(15, "Décrivez votre application en 15 caractères minimum.")
  .max(4000, "La description ne doit pas dépasser 4 000 caractères.");

export const modelSchema = z
  .string()
  .trim()
  .max(100)
  .regex(MODEL_PATTERN, "Nom de modèle Ollama invalide.");

export const modeSchema = z.enum(["scaffold", "standard", "max"]);

export const providerSchema = z.enum(AI_PROVIDER_IDS);

export const hostnameSchema = z
  .string()
  .trim()
  .toLowerCase()
  .min(3, "Domaine trop court.")
  .max(253, "Domaine trop long.")
  .regex(
    /^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/,
    "Domaine invalide — utilisez un nom public comme app.exemple.ci.",
  );

export const repoNameSchema = z
  .string()
  .trim()
  .toLowerCase()
  .transform((value) =>
    value
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-"),
  )
  .pipe(
    z
      .string()
      .min(2, "Nom de dépôt trop court.")
      .max(80, "Nom de dépôt trop long.")
      .regex(/^[a-z0-9][a-z0-9._-]*$/, "Nom de dépôt invalide (lettres, chiffres, . _ -)."),
  );

export const githubRepoUrlSchema = z
  .string()
  .trim()
  .max(300)
  .regex(
    /^https:\/\/github\.com\/[A-Za-z0-9_.-]{1,80}\/[A-Za-z0-9_.-]{1,100}\/?$/,
    "URL GitHub attendue : https://github.com/utilisateur/depot",
  )
  .nullable()
  .optional()
  .transform((value) => (value ? value.replace(/\/+$/, "").replace(/\.git$/, "") : null));

export const httpsUrlSchema = z
  .string()
  .trim()
  .max(500)
  .regex(/^https:\/\/[^\s/]+(?:\/[^\s]*)?$/, "URL https attendue.")
  .nullable()
  .optional()
  .transform((value) => (value ? value.replace(/\/+$/, "") : null));

export const deploymentTargetSchema = z.enum(DEPLOY_TARGETS);

export const deploymentSchema = z.object({
  target: deploymentTargetSchema.optional(),
  repoName: repoNameSchema.optional(),
  customDomain: hostnameSchema.nullable().optional(),
  repositoryUrl: githubRepoUrlSchema.optional(),
  productionUrl: httpsUrlSchema.optional(),
});

export const templateKeySchema = z
  .string()
  .trim()
  .max(40)
  .refine(isTemplateKey, "Modèle d'application inconnu.");

export const createProjectSchema = z.object({
  prompt: promptSchema,
  name: z.string().trim().min(2).max(80).optional(),
  model: modelSchema.optional(),
  provider: providerSchema.optional(),
  mode: modeSchema.optional(),
  templateKey: templateKeySchema.optional(),
  saas: z.boolean().optional(),
  deployment: deploymentSchema.optional(),
});

export const generateSchema = z.object({
  prompt: promptSchema.optional(),
  model: modelSchema.optional(),
  provider: providerSchema.optional(),
  mode: modeSchema.optional(),
  preserveEdits: z.boolean().optional(),
});

export const repairSchema = z.object({
  useAi: z.boolean().optional(),
  model: modelSchema.optional(),
  provider: providerSchema.optional(),
});

export const enhanceSchema = z.object({
  prompt: promptSchema,
  model: modelSchema.optional(),
  provider: providerSchema.optional(),
});

export const registerSchema = z.object({
  name: z.string().trim().min(2, "Votre nom est requis.").max(60),
  email: z.string().trim().toLowerCase().email("Adresse e-mail invalide.").max(180),
  password: z
    .string()
    .min(8, "8 caractères minimum.")
    .max(72)
    .regex(/[A-Za-z]/, "Ajoutez au moins une lettre.")
    .regex(/[0-9]/, "Ajoutez au moins un chiffre."),
});

export const fileUpdateSchema = z.object({
  content: z.string().max(600_000, "Fichier trop volumineux."),
});

export const projectListQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(30),
});

export type CreateProjectInput = z.infer<typeof createProjectSchema>;
export type DeploymentInput = z.infer<typeof deploymentSchema>;
export type GenerateInput = z.infer<typeof generateSchema>;
export type GenerationMode = z.infer<typeof modeSchema>;
