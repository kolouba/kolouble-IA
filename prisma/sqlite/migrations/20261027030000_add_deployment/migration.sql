-- CreateTable
CREATE TABLE "Deployment" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "projectId" TEXT NOT NULL,
    "target" TEXT NOT NULL DEFAULT 'vercel',
    "repoName" TEXT,
    "repositoryUrl" TEXT,
    "customDomain" TEXT,
    "productionUrl" TEXT,
    "status" TEXT NOT NULL DEFAULT 'planned',
    "checkMessage" TEXT,
    "lastCheckAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Deployment_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "Deployment_projectId_key" ON "Deployment"("projectId");
