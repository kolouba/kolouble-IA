import Link from "next/link";
import { cn } from "@/lib/cn";

export function BrandMark({ className }: { className?: string }) {
  return (
    <span className={cn("relative inline-flex h-9 w-9 items-center justify-center", className)} aria-hidden="true">
      <svg viewBox="0 0 40 40" fill="none" className="h-9 w-9">
        <defs>
          <linearGradient id="kolouble-mark" x1="4" y1="4" x2="36" y2="36" gradientUnits="userSpaceOnUse">
            <stop stopColor="#3DDC97" />
            <stop offset="0.55" stopColor="#6FF0BA" />
            <stop offset="1" stopColor="#FFCC66" />
          </linearGradient>
        </defs>
        <rect x="1" y="1" width="38" height="38" rx="12" stroke="url(#kolouble-mark)" strokeOpacity="0.55" />
        <path
          d="M13 11v18M13 20.5l9-9M13 20.5l9.5 8.5"
          stroke="url(#kolouble-mark)"
          strokeWidth="2.6"
          strokeLinecap="round"
        />
        <circle cx="28.5" cy="13" r="2.2" fill="#FFCC66" />
      </svg>
    </span>
  );
}

export function Brand({ href = "/", compact = false }: { href?: string; compact?: boolean }) {
  return (
    <Link
      href={href}
      className="group inline-flex items-center gap-2.5 rounded-xl text-white transition hover:opacity-90"
      aria-label="Kôloublé IA — accueil"
    >
      <BrandMark className="transition duration-300 group-hover:rotate-3" />
      {!compact && (
        <span className="flex flex-col leading-none">
          <span className="font-display text-[17px] font-semibold tracking-tight">Kôloublé IA</span>
          <span className="mt-1 text-[9px] font-medium uppercase tracking-[0.28em] text-white/35">
            studio local
          </span>
        </span>
      )}
    </Link>
  );
}
