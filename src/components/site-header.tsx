import Link from "next/link";
import { ArrowRight, Sparkles } from "lucide-react";
import { Brand } from "@/components/brand";

const LINKS = [
  { href: "/templates", label: "Modèles" },
  { href: "/services", label: "Services" },
  { href: "/tarifs", label: "Tarifs" },
  { href: "/docs", label: "Docs" },
];

export function SiteHeader({ signedIn }: { signedIn: boolean }) {
  return (
    <header className="relative z-20">
      <div className="container-page flex h-20 items-center justify-between gap-4">
        <Brand />
        <nav className="hidden items-center gap-1 md:flex" aria-label="Navigation principale">
          {LINKS.map((link) => (
            <Link key={link.href} href={link.href} className="nav-link">
              {link.label}
            </Link>
          ))}
        </nav>
        <div className="flex items-center gap-2">
          {signedIn ? (
            <Link href="/dashboard" className="btn-primary">
              Mon studio <ArrowRight className="h-4 w-4" />
            </Link>
          ) : (
            <>
              <Link href="/login" className="hidden rounded-full px-4 py-2 text-sm text-white/65 transition hover:text-white sm:inline-flex">
                Se connecter
              </Link>
              <Link href="/register" className="btn-primary">
                Créer un compte <Sparkles className="h-4 w-4" />
              </Link>
            </>
          )}
        </div>
      </div>
      <nav className="container-page flex flex-wrap items-center gap-1 pb-3 md:hidden" aria-label="Navigation mobile">
        {LINKS.map((link) => (
          <Link key={link.href} href={link.href} className="nav-link text-[12px]">
            {link.label}
          </Link>
        ))}
      </nav>
    </header>
  );
}
