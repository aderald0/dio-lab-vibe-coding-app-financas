"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { IconSend, IconTelegram } from "@/components/icons";

interface Msg {
  id: number | string;
  role: "user" | "assistant";
  content: string;
  channel: "telegram" | "web";
}

const SUGGESTIONS = [
  "Gastei 42 no iFood e 18 de Uber",
  "Quanto gastei este mês por categoria?",
  "Me dê 3 dicas práticas para economizar este mês",
  "Quero juntar 3000 para viajar até dezembro",
  "Defina orçamento de R$ 500 para Alimentação",
];

function renderText(s: string) {
  return s.split("\n").map((line, i) => {
    const parts = line.split(/(\*\*.+?\*\*)/g).map((p, j) =>
      p.startsWith("**") && p.endsWith("**") ? <strong key={j}>{p.slice(2, -2)}</strong> : p,
    );
    return (
      <span key={i}>
        {parts}
        {i < s.split("\n").length - 1 && <br />}
      </span>
    );
  });
}

export default function ChatPage() {
  const router = useRouter();
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch("/api/chat")
      .then((r) => (r.ok ? r.json() : []))
      .then(setMessages)
      .catch(() => {});
  }, []);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, busy]);

  async function send(text: string) {
    const trimmed = text.trim();
    if (!trimmed || busy) return;
    setInput("");
    setBusy(true);
    setMessages((m) => [...m, { id: `u-${Date.now()}`, role: "user", content: trimmed, channel: "web" }]);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ message: trimmed }),
      });
      const data = (await res.json()) as { text?: string; error?: string; changed?: boolean };
      setMessages((m) => [
        ...m,
        {
          id: `a-${Date.now()}`,
          role: "assistant",
          content: data.text ?? data.error ?? "Erro ao falar com o agente.",
          channel: "web",
        },
      ]);
      if (data.changed) router.refresh();
    } catch {
      setMessages((m) => [
        ...m,
        { id: `e-${Date.now()}`, role: "assistant", content: "Falha de conexão com o servidor.", channel: "web" },
      ]);
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <header className="page-head">
        <div>
          <span className="eyebrow">Histórico unificado · Telegram + App</span>
          <h1 className="page-title">Conversar com o Fin</h1>
        </div>
      </header>

      <section
        className="card"
        style={{
          display: "flex",
          flexDirection: "column",
          height: "calc(100dvh - 190px)",
          minHeight: 460,
          padding: 0,
          overflow: "hidden",
        }}
      >
        <div style={{ flex: 1, overflowY: "auto", padding: "22px 22px 12px", display: "flex", flexDirection: "column", gap: 12 }}>
          {messages.length === 0 && !busy && (
            <div className="empty" style={{ margin: "auto" }}>
              <strong>Comece uma conversa com o Fin</strong>
              Registre gastos, crie metas ou peça uma análise do seu mês.
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8, justifyContent: "center", marginTop: 16 }}>
                {SUGGESTIONS.map((s) => (
                  <button key={s} type="button" className="btn btn-ghost btn-sm" onClick={() => send(s)}>
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((m) => {
            const isUser = m.role === "user";
            return (
              <div
                key={m.id}
                style={{
                  alignSelf: isUser ? "flex-end" : "flex-start",
                  maxWidth: "min(560px, 86%)",
                  padding: "11px 15px",
                  borderRadius: isUser ? "18px 18px 4px 18px" : "18px 18px 18px 4px",
                  background: isUser ? "var(--accent)" : "var(--surface-2)",
                  color: isUser ? "white" : "var(--ink)",
                  boxShadow: isUser ? "none" : "inset 0 0 0 1px var(--line)",
                  lineHeight: 1.48,
                }}
              >
                {m.channel === "telegram" && (
                  <div
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 4,
                      fontSize: "0.7rem",
                      opacity: 0.75,
                      marginBottom: 3,
                    }}
                  >
                    <IconTelegram width={11} height={11} /> via Telegram
                  </div>
                )}
                <div>{renderText(m.content)}</div>
              </div>
            );
          })}

          {busy && (
            <div
              style={{
                alignSelf: "flex-start",
                padding: "10px 15px",
                borderRadius: "18px 18px 18px 4px",
                background: "var(--surface-2)",
                color: "var(--ink-3)",
                fontSize: "0.88rem",
              }}
            >
              Fin está pensando…
            </div>
          )}
          <div ref={endRef} />
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            send(input);
          }}
          style={{
            display: "flex",
            gap: 10,
            padding: 14,
            borderTop: "1px solid var(--line)",
            background: "var(--surface)",
          }}
        >
          <input
            id="chat-input"
            className="input"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ex.: gastei 35 no iFood · quanto gastei este mês?"
            disabled={busy}
          />
          <button id="chat-send" className="btn btn-primary" disabled={busy || !input.trim()} aria-label="Enviar">
            <IconSend width={17} height={17} />
            Enviar
          </button>
        </form>
      </section>
    </>
  );
}
