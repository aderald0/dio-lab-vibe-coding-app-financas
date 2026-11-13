import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { hasSession } from "@/lib/session";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "Entrar" };

export default async function LoginPage() {
  if (await hasSession()) redirect("/");
  return (
    <main style={{ minHeight: "100dvh", display: "grid", placeItems: "center", padding: 20 }}>
      <div className="card" style={{ width: "100%", maxWidth: 400, padding: 32, animation: "rise .45s var(--ease) both" }}>
        <div className="brand" style={{ padding: 0, marginBottom: 28 }}>
          <span className="brand-mark">F</span>
          <span className="brand-name">Fin</span>
        </div>
        <h1 className="page-title" style={{ fontSize: "1.9rem" }}>Bem-vindo de volta</h1>
        <p className="muted" style={{ margin: "8px 0 24px" }}>
          Seu agente financeiro pessoal. Entre para ver seus gastos, metas e conversar com o Fin.
        </p>
        <LoginForm />
      </div>
    </main>
  );
}
