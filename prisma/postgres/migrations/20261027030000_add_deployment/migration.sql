-- Déploiement GitHub / hébergeurs — PostgreSQL / Supabase
-- Appliquer avec : npm run pg:deploy

CREATE TABLE "Deployment" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "target" TEXT NOT NULL DEFAULT 'vercel',
    "repoName" TEXT,
    "repositoryUrl" TEXT,
    "customDomain" TEXT,
    "productionUrl" TEXT,
    "status" TEXT NOT NULL DEFAULT 'planned',
    "checkMessage" TEXT,
    "lastCheckAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Deployment_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Deployment_projectId_key" ON "Deployment"("projectId");

ALTER TABLE "Deployment" ADD CONSTRAINT "Deployment_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;
