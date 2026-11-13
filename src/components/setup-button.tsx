"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function SetupButton({ label = "Conectar banco e Telegram" }: { label?: string }) {
  const router = useRouter();
  const [status, setStatus] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function run() {
    setBusy(true);
    setStatus(null);
    try {
      const res = await fetch("/api/setup", { method: "POST" });
      const data = (await res.json()) as { ok?: boolean; error?: string };
      if (data.ok) {
        setStatus("✓ Tabelas do Neon e webhook do Telegram configurados!");
        router.refresh();
      } else {
        setStatus(data.error ?? "Falha ao configurar.");
      }
    } catch {
      setStatus("Erro ao chamar /api/setup.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <button type="button" className="btn btn-ghost btn-sm" onClick={run} disabled={busy} style={{ width: "100%" }}>
        {busy ? "Configurando…" : label}
      </button>
      {status && (
        <div className="muted" style={{ fontSize: "0.76rem", marginTop: 6 }}>
          {status}
        </div>
      )}
    </div>
  );
}
