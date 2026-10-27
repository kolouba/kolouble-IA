-- Migration initiale Kôloublé IA — PostgreSQL / Supabase
-- Appliquer avec : npm run pg:deploy

CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "image" TEXT,
    "passwordHash" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Project" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "prompt" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "model" TEXT,
    "mode" TEXT NOT NULL DEFAULT 'standard',
    "stack" TEXT NOT NULL DEFAULT 'flutter-supabase',
    "spec" TEXT,
    "autoNamed" BOOLEAN NOT NULL DEFAULT true,
    "lastGenerationAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Project_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ProjectFile" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "path" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "language" TEXT NOT NULL DEFAULT 'text',
    "bytes" INTEGER NOT NULL DEFAULT 0,
    "source" TEXT NOT NULL DEFAULT 'scaffold',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProjectFile_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Generation" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "prompt" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "mode" TEXT NOT NULL DEFAULT 'standard',
    "status" TEXT NOT NULL DEFAULT 'running',
    "error" TEXT,
    "summary" TEXT,
    "durationMs" INTEGER,
    "filesWritten" INTEGER NOT NULL DEFAULT 0,
    "warnings" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "Generation_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "GenerationStep" (
    "id" TEXT NOT NULL,
    "generationId" TEXT NOT NULL,
    "agent" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "detail" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    "startedAt" TIMESTAMP(3),
    "finishedAt" TIMESTAMP(3),

    CONSTRAINT "GenerationStep_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
CREATE INDEX "Project_ownerId_updatedAt_idx" ON "Project"("ownerId", "updatedAt");
CREATE UNIQUE INDEX "ProjectFile_projectId_path_key" ON "ProjectFile"("projectId", "path");
CREATE INDEX "ProjectFile_projectId_idx" ON "ProjectFile"("projectId");
CREATE INDEX "Generation_projectId_createdAt_idx" ON "Generation"("projectId", "createdAt");
CREATE INDEX "GenerationStep_generationId_order_idx" ON "GenerationStep"("generationId", "order");

ALTER TABLE "Project" ADD CONSTRAINT "Project_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ProjectFile" ADD CONSTRAINT "ProjectFile_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Generation" ADD CONSTRAINT "Generation_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "GenerationStep" ADD CONSTRAINT "GenerationStep_generationId_fkey" FOREIGN KEY ("generationId") REFERENCES "Generation"("id") ON DELETE CASCADE ON UPDATE CASCADE;
