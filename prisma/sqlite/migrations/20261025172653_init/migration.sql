-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "image" TEXT,
    "passwordHash" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Project" (
    "id" TEXT NOT NULL PRIMARY KEY,
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
    "lastGenerationAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Project_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ProjectFile" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "projectId" TEXT NOT NULL,
    "path" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "language" TEXT NOT NULL DEFAULT 'text',
    "bytes" INTEGER NOT NULL DEFAULT 0,
    "source" TEXT NOT NULL DEFAULT 'scaffold',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ProjectFile_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Generation" (
    "id" TEXT NOT NULL PRIMARY KEY,
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
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" DATETIME,
    CONSTRAINT "Generation_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "GenerationStep" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "generationId" TEXT NOT NULL,
    "agent" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "detail" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    "startedAt" DATETIME,
    "finishedAt" DATETIME,
    CONSTRAINT "GenerationStep_generationId_fkey" FOREIGN KEY ("generationId") REFERENCES "Generation" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "Project_ownerId_updatedAt_idx" ON "Project"("ownerId", "updatedAt");

-- CreateIndex
CREATE INDEX "ProjectFile_projectId_idx" ON "ProjectFile"("projectId");

-- CreateIndex
CREATE UNIQUE INDEX "ProjectFile_projectId_path_key" ON "ProjectFile"("projectId", "path");

-- CreateIndex
CREATE INDEX "Generation_projectId_createdAt_idx" ON "Generation"("projectId", "createdAt");

-- CreateIndex
CREATE INDEX "GenerationStep_generationId_order_idx" ON "GenerationStep"("generationId", "order");
