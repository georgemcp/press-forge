"use client";

import { useActionState } from "react";
import { LockKeyhole, LogIn } from "lucide-react";
import { loginAdmin, type AdminLoginState } from "@/app/admin/actions";

const initialState: AdminLoginState = {};

export function AdminLoginForm({ configured }: { configured: boolean }) {
  const [state, formAction, pending] = useActionState(loginAdmin, initialState);

  return (
    <form action={formAction} className="grid gap-4">
      <div>
        <label className="text-xs font-semibold uppercase text-muted" htmlFor="password">
          Admin password
        </label>
        <div className="mt-2 flex items-center gap-2 rounded-[8px] border border-border bg-surface px-3">
          <LockKeyhole aria-hidden className="h-4 w-4 text-brand" />
          <input
            autoComplete="current-password"
            className="h-12 min-w-0 flex-1 bg-transparent text-base text-surface-ink"
            disabled={!configured || pending}
            id="password"
            name="password"
            placeholder={configured ? "Enter admin password" : "Admin env is missing"}
            type="password"
          />
        </div>
      </div>

      {state.error ? <p className="rounded-[8px] border border-danger/30 bg-danger/10 px-3 py-2 text-sm font-semibold text-danger">{state.error}</p> : null}

      <button
        className="inline-flex h-11 items-center justify-center gap-2 rounded-[8px] bg-surface-ink px-4 text-sm font-semibold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-55"
        disabled={!configured || pending}
        type="submit"
      >
        <LogIn aria-hidden className="h-4 w-4" />
        {pending ? "Opening admin..." : "Open admin center"}
      </button>
    </form>
  );
}
