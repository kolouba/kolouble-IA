-- Marketplace, mode SaaS et fournisseur IA — PostgreSQL / Supabase
ALTER TABLE "Project" ADD COLUMN "templateKey" TEXT;
ALTER TABLE "Project" ADD COLUMN "saas" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Project" ADD COLUMN "provider" TEXT;
ALTER TABLE "Project" ADD COLUMN "zipUrl" TEXT;
ALTER TABLE "Generation" ADD COLUMN "provider" TEXT;
