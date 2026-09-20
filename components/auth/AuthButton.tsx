"use client";

import { signIn, signOut } from "next-auth/react";

export function SignInButton({ label }: { label: string }) {
  return (
    <button
      type="button"
      onClick={() => signIn()}
      className="rounded-full bg-forest-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-forest-700"
    >
      {label}
    </button>
  );
}

export function SignOutButton({ label }: { label: string }) {
  return (
    <button
      type="button"
      onClick={() => signOut()}
      className="rounded-full border border-forest-200 px-5 py-2.5 text-sm font-semibold text-charcoal hover:bg-forest-50"
    >
      {label}
    </button>
  );
}
