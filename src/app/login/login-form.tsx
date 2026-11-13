"use client";

import { useActionState } from "react";
import { login } from "@/app/actions";

export function LoginForm() {
  const [error, action, pending] = useActionState(login, null);
  return (
    <form action={action} className="grid" style={{ gap: 14 }}>
      <div className="field">
        <label htmlFor="password">Senha</label>
        <input
          id="password"
          name="password"
          type="password"
          className="input"
          autoComplete="current-password"
          autoFocus
          required
        />
      </div>
      {error && <div className="alert danger" role="alert">{error}</div>}
      <button id="login-submit" className="btn btn-primary" disabled={pending} style={{ height: 44 }}>
        {pending ? "Entrando…" : "Entrar"}
      </button>
    </form>
  );
}
