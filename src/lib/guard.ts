import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { ApiError } from "@/lib/http";

export interface SessionUser {
  id: string;
  email: string | null;
  name: string | null;
}

export async function requireUser(): Promise<SessionUser> {
  const session = await auth();
  const id = session?.user?.id;
  if (!id) {
    throw new ApiError(401, "Authentification requise.", "unauthorized");
  }
  return {
    id,
    email: session.user.email ?? null,
    name: session.user.name ?? null,
  };
}

export async function requireProject(userId: string, projectId: string) {
  if (!/^[a-z0-9]{10,40}$/i.test(projectId)) {
    throw new ApiError(404, "Projet introuvable.", "not_found");
  }
  const project = await prisma.project.findFirst({
    where: { id: projectId, ownerId: userId },
  });
  if (!project) {
    throw new ApiError(404, "Projet introuvable.", "not_found");
  }
  return project;
}
