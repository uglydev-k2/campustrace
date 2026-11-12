"use client";

import { LogOut } from "lucide-react";
import { signOut } from "next-auth/react";

export function SignOutButton({ className }: { className?: string }) {
  return (
    <button type="button" className={className} onClick={() => signOut({ callbackUrl: "/" })}>
      <LogOut aria-hidden className="size-4" />
      Sign out
    </button>
  );
}
