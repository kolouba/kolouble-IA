"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { signIn } from "next-auth/react";
import {
  AlertCircle,
  ArrowRight,
  Chrome,
  Eye,
  EyeOff,
  Facebook,
  Github,
  Loader2,
  Lock,
  Mail,
  User,
} from "lucide-react";

type Mode = "login" | "register";
type Provider = "google" | "facebook" | "github";

export function AuthForm({
  mode,
  providers,
  next = "/dashboard",
  initialError = null,
}: {
  mode: Mode;
  providers: Provider[];
  next?: string;
  initialError?: string | null;
}) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(initialError);
  const [pending, setPending] = useState(false);
  const [oauthPending, setOauthPending] = useState<Provider | null>(null);

  const isRegister = mode === "register";
  const safeNext = next.startsWith("/") && !next.startsWith("//") ? next : "/dashboard";

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setPending(true);
    try {
      if (isRegister) {
        const response = await fetch("/api/register", {
          method: "POST",
          headers: { "Content-Type": "application/json", Accept: "application/json" },
          body: JSON.stringify({ name, email, password }),
        });
        const data = (await response.json().catch(() => null)) as { error?: string } | null;
        if (!response.ok) {
          throw new Error(data?.error || "Impossible de créer le compte.");
        }
      }

      const result = await signIn("credentials", {
        email,
        password,
        redirect: false,
        callbackUrl: safeNext,
      });
      if (result?.error) {
        throw new Error(
          isRegister
            ? "Compte créé, mais la connexion automatique a échoué. Connectez-vous manuellement."
            : "E-mail ou mot de passe incorrect.",
        );
      }
      router.push(safeNext);
      router.refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Une erreur est survenue.");
    } finally {
      setPending(false);
    }
  }

  async function handleOAuth(provider: Provider) {
    setError(null);
    setOauthPending(provider);
    try {
      await signIn(provider, { callbackUrl: safeNext });
    } catch {
      setError("La connexion externe a échoué. Réessayez.");
      setOauthPending(null);
    }
  }

  return (
    <div>
      {providers.length > 0 && (
        <>
          <div className="grid gap-2.5">
            {providers.includes("google") && (
              <button
                type="button"
                onClick={() => handleOAuth("google")}
                disabled={Boolean(oauthPending) || pending}
                className="btn-secondary w-full justify-center py-3 text-[13px]"
              >
                {oauthPending === "google" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Chrome className="h-4 w-4" />}
                Continuer avec Google
              </button>
            )}
            {providers.includes("facebook") && (
              <button
                type="button"
                onClick={() => handleOAuth("facebook")}
                disabled={Boolean(oauthPending) || pending}
                className="btn-secondary w-full justify-center py-3 text-[13px]"
              >
                {oauthPending === "facebook" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Facebook className="h-4 w-4" />}
                Continuer avec Facebook
              </button>
            )}
            {providers.includes("github") && (
              <button
                type="button"
                onClick={() => handleOAuth("github")}
                disabled={Boolean(oauthPending) || pending}
                className="btn-secondary w-full justify-center py-3 text-[13px]"
              >
                {oauthPending === "github" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Github className="h-4 w-4" />}
                Continuer avec GitHub
              </button>
            )}
          </div>
          <div className="my-6 flex items-center gap-3">
            <span className="h-px flex-1 bg-white/[0.07]" />
            <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-white/25">ou par e-mail</span>
            <span className="h-px flex-1 bg-white/[0.07]" />
          </div>
        </>
      )}

      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        {isRegister && (
          <div>
            <label htmlFor="name" className="label">Nom complet</label>
            <div className="relative">
              <User className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-white/25" />
              <input
                id="name"
                name="name"
                type="text"
                autoComplete="name"
                required
                minLength={2}
                maxLength={60}
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="Aminata Koné"
                className="input pl-10"
              />
            </div>
          </div>
        )}

        <div>
          <label htmlFor="email" className="label">Adresse e-mail</label>
          <div className="relative">
            <Mail className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-white/25" />
            <input
              id="email"
              name="email"
              type="email"
              inputMode="email"
              autoComplete="email"
              required
              maxLength={180}
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="vous@exemple.ci"
              className="input pl-10"
            />
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between">
            <label htmlFor="password" className="label">Mot de passe</label>
            {!isRegister && <span className="mb-2 text-[10.5px] text-white/25">8 caractères minimum</span>}
          </div>
          <div className="relative">
            <Lock className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-white/25" />
            <input
              id="password"
              name="password"
              type={showPassword ? "text" : "password"}
              autoComplete={isRegister ? "new-password" : "current-password"}
              required
              minLength={8}
              maxLength={72}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="••••••••"
              className="input pl-10 pr-11"
            />
            <button
              type="button"
              aria-label={showPassword ? "Masquer le mot de passe" : "Afficher le mot de passe"}
              onClick={() => setShowPassword((value) => !value)}
              className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg p-1 text-white/30 transition hover:text-white/70"
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          {isRegister && (
            <p className="mt-2 text-[10.5px] leading-5 text-white/30">
              Au moins 8 caractères, une lettre et un chiffre.
            </p>
          )}
        </div>

        {error && (
          <div role="alert" className="flex items-start gap-2.5 rounded-xl border border-red-400/20 bg-red-400/[0.06] px-3.5 py-3 text-[12px] leading-5 text-red-200/90">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <button type="submit" disabled={pending || Boolean(oauthPending)} className="btn-primary w-full justify-center py-3 text-[13.5px]">
          {pending ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" /> {isRegister ? "Création du compte…" : "Connexion…"}
            </>
          ) : (
            <>
              {isRegister ? "Créer mon compte" : "Ouvrir mon studio"}
              <ArrowRight className="h-4 w-4" />
            </>
          )}
        </button>
      </form>

      {isRegister && (
        <p className="mt-4 text-center text-[10.5px] leading-5 text-white/25">
          En créant un compte, vous acceptez que vos données d'authentification soient stockées
          dans la base de votre instance.
        </p>
      )}

      <p className="mt-6 text-center text-[12.5px] text-white/40">
        {isRegister ? (
          <>
            Déjà un compte ?{" "}
            <Link href="/login" className="font-medium text-mint-300 hover:text-mint-100">
              Se connecter
            </Link>
          </>
        ) : (
          <>
            Pas encore de compte ?{" "}
            <Link href="/register" className="font-medium text-mint-300 hover:text-mint-100">
              Créer un compte
            </Link>
          </>
        )}
      </p>
    </div>
  );
}
