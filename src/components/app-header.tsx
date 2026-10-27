import Link from "next/link";
import { Settings2, Sparkles } from "lucide-react";
import { Brand } from "@/components/brand";
import { SignOutButton } from "@/components/sign-out-button";
import { cn } from "@/lib/cn";

function initials(name: string | null, email: string | null): string {
  const source = name?.trim() || email?.split("@")[0] || "K";
  return source
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("")
    .slice(0, 2) || "K";
}

export function AppHeader({
  name,
  email,
  active = "studio",
}: {
  name: string | null;
  email: string | null;
  active?: "studio" | "settings";
}) {
  return (
    <header className="sticky top-0 z-40 border-b border-white/[0.06] bg-ink-950/75 backdrop-blur-xl">
      <div className="container-page flex h-16 items-center justify-between gap-4">
        <div className="flex items-center gap-8">
          <Brand />
          <nav className="hidden items-center gap-1 sm:flex" aria-label="Navigation du studio">
            <Link
              href="/dashboard"
              className={cn(
                "rounded-full px-3.5 py-2 text-[12.5px] font-medium transition",
                active === "studio" ? "bg-white/[0.06] text-white" : "text-white/45 hover:text-white",
              )}
            >
              Studio
            </Link>
            <Link
              href="/settings"
              className={cn(
                "rounded-full px-3.5 py-2 text-[12.5px] font-medium transition",
                active === "settings" ? "bg-white/[0.06] text-white" : "text-white/45 hover:text-white",
              )}
            >
              Paramètres
            </Link>
          </nav>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          <Link href="/dashboard?new=1" className="btn-primary hidden px-4 py-2 text-[12.5px] sm:inline-flex">
            <Sparkles className="h-3.5 w-3.5" /> Nouveau projet
          </Link>
          <Link href="/settings" className="btn-ghost sm:hidden" aria-label="Paramètres">
            <Settings2 className="h-4 w-4" />
          </Link>
          <div className="hidden h-8 w-px bg-white/[0.07] sm:block" />
          <div className="flex items-center gap-2.5">
            <span className="flex h-8 w-8 items-center justify-center rounded-full border border-mint-400/20 bg-mint-400/10 text-[11px] font-semibold text-mint-300">
              {initials(name, email)}
            </span>
            <div className="hidden leading-tight md:block">
              <div className="max-w-[140px] truncate text-[12px] font-medium text-white/80">{name || "Mon compte"}</div>
              <div className="max-w-[140px] truncate text-[10px] text-white/30">{email}</div>
            </div>
          </div>
          <SignOutButton />
        </div>
      </div>
    </header>
  );
}
