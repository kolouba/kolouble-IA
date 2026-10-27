import NextAuth, { type NextAuthConfig } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import Facebook from "next-auth/providers/facebook";
import GitHub from "next-auth/providers/github";
import bcrypt from "bcryptjs";
import { z } from "zod";

import { prisma } from "@/lib/db";
import { env } from "@/lib/env";

const credentialsSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(8).max(72),
});

const providers: NextAuthConfig["providers"] = [
  Credentials({
    name: "Email",
    credentials: {
      email: { label: "Email", type: "email" },
      password: { label: "Mot de passe", type: "password" },
    },
    async authorize(credentials) {
      const parsed = credentialsSchema.safeParse(credentials);
      if (!parsed.success) return null;
      const user = await prisma.user.findUnique({
        where: { email: parsed.data.email },
        select: { id: true, email: true, name: true, image: true, passwordHash: true },
      });
      if (!user?.passwordHash) return null;
      const valid = await bcrypt.compare(parsed.data.password, user.passwordHash);
      if (!valid) return null;
      return { id: user.id, email: user.email, name: user.name, image: user.image };
    },
  }),
];

if (env.googleEnabled) {
  providers.push(
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  );
}

if (env.facebookEnabled) {
  providers.push(
    Facebook({
      clientId: process.env.FACEBOOK_CLIENT_ID!,
      clientSecret: process.env.FACEBOOK_CLIENT_SECRET!,
    }),
  );
}

if (env.githubEnabled) {
  providers.push(
    GitHub({
      clientId: process.env.GITHUB_CLIENT_ID!,
      clientSecret: process.env.GITHUB_CLIENT_SECRET!,
    }),
  );
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  trustHost: true,
  session: { strategy: "jwt", maxAge: 60 * 60 * 24 * 30 },
  pages: { signIn: "/login", error: "/login" },
  providers,
  callbacks: {
    async signIn({ user, account }) {
      if (!account || account.provider === "credentials") return true;
      const email = user.email?.trim().toLowerCase();
      if (!email) return false;
      try {
        await prisma.user.upsert({
          where: { email },
          update: { name: user.name ?? undefined, image: user.image ?? undefined },
          create: { email, name: user.name ?? null, image: user.image ?? null },
        });
        return true;
      } catch (error) {
        console.error("[kolouble] oauth upsert failed", error);
        return false;
      }
    },
    async jwt({ token, user }) {
      if (typeof token.uid === "string" && token.uid.length > 0) return token;
      const email = (user?.email || token.email)?.toString().trim().toLowerCase();
      if (!email) return token;
      const dbUser = await prisma.user.findUnique({
        where: { email },
        select: { id: true },
      });
      if (dbUser) token.uid = dbUser.id;
      return token;
    },
    async session({ session, token }) {
      if (session.user && typeof token.uid === "string") {
        session.user.id = token.uid;
      }
      return session;
    },
  },
});
