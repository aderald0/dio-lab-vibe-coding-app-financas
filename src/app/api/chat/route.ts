import { runAgent } from "@/lib/agent";
import { recentMessages } from "@/lib/finance";
import { hasSession } from "@/lib/session";

export const maxDuration = 60;

/** Histórico unificado (Telegram + app). */
export async function GET() {
  if (!(await hasSession())) return Response.json({ error: "unauthorized" }, { status: 401 });
  const rows = await recentMessages(60);
  return Response.json(
    rows.map((m) => ({ id: m.id, role: m.role, content: m.content, channel: m.channel, createdAt: m.createdAt })),
  );
}

/** Envia uma mensagem ao Agente Financeiro. */
export async function POST(req: Request) {
  if (!(await hasSession())) return Response.json({ error: "unauthorized" }, { status: 401 });
  const { message } = (await req.json()) as { message?: string };
  const text = (message ?? "").trim().slice(0, 2000);
  if (!text) return Response.json({ error: "Mensagem vazia" }, { status: 400 });

  try {
    const result = await runAgent({ channel: "web", content: text });
    const changed = result.events.length > 0;
    return Response.json({ text: result.text, changed });
  } catch (err) {
    console.error("[chat]", err);
    return Response.json({ error: "Não consegui falar com o agente agora. Tente de novo." }, { status: 500 });
  }
}
