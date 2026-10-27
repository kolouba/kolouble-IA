"use client";

import { useState } from "react";
import { signOut } from "next-auth/react";
import { Loader2, LogOut } from "lucide-react";

export function SignOutButton() {
  const [pending, setPending] = useState(false);

  return (
    <button
      type="button"
      onClick={async () => {
        setPending(true);
        try {
          await signOut({ callbackUrl: "/" });
        } finally {
          setPending(false);
        }
      }}
      disabled={pending}
      className="btn-ghost text-[12px] text-white/45"
      title="Se déconnecter"
    >
      {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <LogOut className="h-4 w-4" />}
      <span className="hidden sm:inline">Déconnexion</span>
    </button>
  );
}
