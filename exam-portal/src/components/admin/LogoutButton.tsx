"use client";

import { signOut } from "next-auth/react";

export function LogoutButton() {
  return (
    <button
      type="button"
      onClick={() => signOut({ callbackUrl: "/admin/login" })}
      className="text-sm font-medium text-slate-500 hover:text-slate-900"
    >
      Sign out
    </button>
  );
}
